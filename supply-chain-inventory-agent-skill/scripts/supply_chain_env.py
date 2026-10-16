#!/usr/bin/env python3
"""
Multi-echelon inventory management simulation engine.

Ported from zefang-liu/InvAgent's src/env.py + src/config.py (Apache-2.0), with
the gymnasium.spaces / ray.rllib.MultiAgentEnv machinery removed: this skill has
no RL action/observation spaces to satisfy, only the state-transition and
profit arithmetic InvAgent's paper defines. State is persisted to a JSON file
so the calling agent can request one stage's state, reason about it out of
process (an LLM decision, not something this script can compute), record the
resulting action, and repeat across stages and periods.

Sequence of events each period (unchanged from InvAgent):
  1. Check deliveries: incoming shipments that have cleared their lead time arrive.
  2. Check orders and demand: each stage places a replenishment order; the
     retailer (stage 0) also faces customer demand.
  3. Deliver: each stage ships as much as its inventory and production
     capacity allow; anything short is backlogged.
  4. Compute profit: sales revenue minus order cost, backlog penalty, and
     holding cost.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

DEMAND_SCENARIOS = {
    "two_agent": {
        "num_stages": 2,
        "num_periods": 2,
        "init_inventories": [4, 4],
        "lead_times": [1, 2],
        "demand": {"type": "constant", "value": 4},
        "prod_capacities": [10, 10],
        "sale_prices": [0, 0],
        "order_costs": [0, 0],
        "backlog_costs": [1, 1],
        "holding_costs": [1, 1],
        "stage_names": ["retailer", "supplier"],
        "demand_description": "The expected demand at the retailer (stage 1) is a constant 4 units for all 2 rounds.",
    },
    "constant_demand": {
        "num_stages": 4,
        "num_periods": 12,
        "init_inventories": [12, 12, 12, 12],
        "lead_times": [2, 2, 2, 2],
        "demand": {"type": "constant", "value": 4},
        "prod_capacities": [20, 20, 20, 20],
        "sale_prices": [0, 0, 0, 0],
        "order_costs": [0, 0, 0, 0],
        "backlog_costs": [1, 1, 1, 1],
        "holding_costs": [1, 1, 1, 1],
        "stage_names": ["retailer", "wholesaler", "distributor", "manufacturer"],
        "demand_description": "The expected demand at the retailer (stage 1) is a constant 4 units for all 12 rounds.",
    },
    "variable_demand": {
        "num_stages": 4,
        "num_periods": 12,
        "init_inventories": [12, 12, 12, 12],
        "lead_times": [2, 2, 2, 2],
        "demand": {"type": "uniform_int", "low": 0, "high": 4},
        "prod_capacities": [20, 20, 20, 20],
        "sale_prices": [0, 0, 0, 0],
        "order_costs": [0, 0, 0, 0],
        "backlog_costs": [1, 1, 1, 1],
        "holding_costs": [1, 1, 1, 1],
        "stage_names": ["retailer", "wholesaler", "distributor", "manufacturer"],
        "demand_description": "The expected demand at the retailer (stage 1) is a discrete uniform distribution "
                               "U{0, 4} for all 12 rounds.",
    },
    "larger_demand": {
        "num_stages": 4,
        "num_periods": 12,
        "init_inventories": [12, 12, 12, 12],
        "lead_times": [2, 2, 2, 2],
        "demand": {"type": "uniform_int", "low": 0, "high": 8},
        "prod_capacities": [20, 20, 20, 20],
        "sale_prices": [5, 5, 5, 5],
        "order_costs": [5, 5, 5, 5],
        "backlog_costs": [1, 1, 1, 1],
        "holding_costs": [1, 1, 1, 1],
        "stage_names": ["retailer", "wholesaler", "distributor", "manufacturer"],
        "demand_description": "The expected demand at the retailer (stage 1) is a discrete uniform distribution "
                               "U{0, 8} for all 12 rounds.",
    },
    "seasonal_demand": {
        "num_stages": 4,
        "num_periods": 12,
        "init_inventories": [12, 12, 12, 12],
        "lead_times": [2, 2, 2, 2],
        "demand": {"type": "seasonal_uniform_int", "early_low": 0, "early_high": 4, "late_low": 5, "late_high": 8,
                   "switch_period": 4},
        "prod_capacities": [20, 20, 20, 20],
        "sale_prices": [5, 5, 5, 5],
        "order_costs": [5, 5, 5, 5],
        "backlog_costs": [1, 1, 1, 1],
        "holding_costs": [1, 1, 1, 1],
        "stage_names": ["retailer", "wholesaler", "distributor", "manufacturer"],
        "demand_description": "The expected demand at the retailer (stage 1) is a discrete uniform distribution "
                               "U{0, 4} for the first 4 rounds, and a discrete uniform distribution U{5, 8} for the "
                               "last 8 rounds.",
    },
    "normal_demand": {
        "num_stages": 4,
        "num_periods": 12,
        "init_inventories": [12, 14, 16, 18],
        "lead_times": [1, 2, 3, 4],
        "demand": {"type": "normal", "mean": 4, "std": 2},
        "prod_capacities": [20, 22, 24, 26],
        "sale_prices": [9, 8, 7, 6],
        "order_costs": [8, 7, 6, 5],
        "backlog_costs": [1, 1, 1, 1],
        "holding_costs": [1, 1, 1, 1],
        "stage_names": ["retailer", "wholesaler", "distributor", "manufacturer"],
        "demand_description": "The expected demand at the retailer (stage 1) is a normal distribution N(4, 2^2), "
                               "truncated at 0, for all 12 rounds.",
    },
}


def make_demand_fn(demand_spec: dict, base_seed: int):
    """
    Build a period -> demand callable from a JSON-serializable demand spec.

    The engine is reconstructed from JSON on every CLI invocation (it has no
    long-lived process), so a demand_fn closing over one shared Generator would
    replay the same draw each time step() ran demand_fn(t) for a fresh t. Each
    call instead seeds its own Generator from (base_seed, t), so period t's
    demand is a pure, reproducible function of t regardless of how many times
    the engine has been rebuilt.
    """
    kind = demand_spec["type"]
    if kind == "constant":
        value = demand_spec["value"]
        return lambda t: value

    def rng_for(t):
        return np.random.default_rng([base_seed, t])

    if kind == "uniform_int":
        low, high = demand_spec["low"], demand_spec["high"]
        return lambda t: int(rng_for(t).integers(low, high + 1))
    if kind == "seasonal_uniform_int":
        switch = demand_spec["switch_period"]
        early = (demand_spec["early_low"], demand_spec["early_high"])
        late = (demand_spec["late_low"], demand_spec["late_high"])
        return lambda t: int(rng_for(t).integers(early[0], early[1] + 1)) if t <= switch \
            else int(rng_for(t).integers(late[0], late[1] + 1))
    if kind == "normal":
        mean, std = demand_spec["mean"], demand_spec["std"]
        return lambda t: max(0, int(rng_for(t).normal(mean, std)))
    raise ValueError(f"Unknown demand type: {kind}")


class InventoryManagementEnv:
    """Multi-period, multi-echelon inventory simulation (see module docstring)."""

    def __init__(self, num_stages, num_periods, init_inventories, lead_times, demand,
                 prod_capacities, sale_prices, order_costs, backlog_costs, holding_costs,
                 stage_names, seed: int = 0):
        assert num_stages >= 2, "The number of stages should be at least 2."
        assert num_periods >= 1, "The number of periods should be at least 1."
        for name, values in (
            ("init_inventories", init_inventories), ("lead_times", lead_times),
            ("prod_capacities", prod_capacities), ("sale_prices", sale_prices),
            ("order_costs", order_costs), ("backlog_costs", backlog_costs),
            ("holding_costs", holding_costs), ("stage_names", stage_names),
        ):
            assert len(values) == num_stages, f"{name} must have num_stages ({num_stages}) entries."
        assert min(init_inventories) >= 0, "Initial inventories must be non-negative."
        assert min(lead_times) >= 0, "Lead times must be non-negative."
        assert min(prod_capacities) > 0, "Production capacities must be positive."

        self.num_stages = num_stages
        self.num_periods = num_periods
        self.stage_names = list(stage_names)
        self.init_inventories = np.array(init_inventories, dtype=int)
        self.lead_times = np.array(lead_times, dtype=int)
        self.max_lead_time = int(np.max(self.lead_times))
        self.demand_fn = make_demand_fn(demand, seed)
        self.prod_capacities = np.array(prod_capacities, dtype=int)
        self.sale_prices = np.array(sale_prices, dtype=int)
        self.order_costs = np.array(order_costs, dtype=int)
        self.backlog_costs = np.array(backlog_costs, dtype=int)
        self.holding_costs = np.array(holding_costs, dtype=int)

        self.period = 0
        self.inventories = np.zeros((num_stages, num_periods + 1), dtype=int)
        self.orders = np.zeros((num_stages, num_periods + 1), dtype=int)
        self.arriving_orders = np.zeros((num_stages, num_periods + 1), dtype=int)
        self.sales = np.zeros((num_stages, num_periods + 1), dtype=int)
        self.backlogs = np.zeros((num_stages, num_periods + 1), dtype=int)
        self.demands = np.zeros(num_periods + 1, dtype=int)
        self.profits = np.zeros((num_stages, num_periods + 1), dtype=int)
        self.total_profits = np.zeros(num_periods + 1, dtype=int)
        self.inventories[:, 0] = self.init_inventories
        self.state_dict = {}
        self.pending_actions = {}
        self.update_state()

    def update_state(self):
        """s_{m,t} = [c_m, p_m, r_m, k_m, h_m, L_m, I_{m,t-1}, B_{m,t-1}, B_{m+1,t-1}, S..., 0..., R...]"""
        t = self.period
        lt_max = self.max_lead_time
        states = np.zeros((self.num_stages, 9 + 2 * lt_max), dtype=int)
        states[:, :8] = np.stack([
            self.prod_capacities, self.sale_prices, self.order_costs, self.backlog_costs, self.holding_costs,
            self.lead_times, self.inventories[:, t], self.backlogs[:, t]], axis=-1)
        states[:-1, 8] = self.backlogs[1:, t]

        if t >= lt_max:
            states[:, (-2 * lt_max):-lt_max] = self.sales[:, (t - lt_max + 1):(t + 1)]
        elif t > 0:
            states[:, (-lt_max - t):-lt_max] = self.sales[:, 1:(t + 1)]

        for m in range(self.num_stages):
            lt = self.lead_times[m]
            if lt == 0:
                continue
            if t >= lt:
                states[m, -lt:] = self.arriving_orders[m, (t - lt + 1):(t + 1)]
            elif t > 0:
                states[m, -t:] = self.arriving_orders[m, 1:(t + 1)]

        self.state_dict = {f"stage_{m}": states[m] for m in range(self.num_stages)}

    def parse_state(self, stage: int) -> dict:
        state = self.state_dict[f"stage_{stage}"]
        lt_max = self.max_lead_time
        lead_time = int(state[5])
        deliveries = state[-lt_max:].tolist() if lt_max > 0 else []
        return {
            "stage": stage,
            "stage_name": self.stage_names[stage],
            "prod_capacity": int(state[0]),
            "sale_price": int(state[1]),
            "order_cost": int(state[2]),
            "backlog_cost": int(state[3]),
            "holding_cost": int(state[4]),
            "lead_time": lead_time,
            "inventory": int(state[6]),
            "backlog": int(state[7]),
            "upstream_backlog": int(state[8]),
            "sales": state[(-2 * lt_max):(-lt_max)].tolist() if lt_max > 0 else [],
            "deliveries": deliveries[-lead_time:] if lead_time > 0 else [],
        }

    def step(self, action_dict: dict):
        """Advance one full period given every stage's order quantity."""
        assert all(f"stage_{m}" in action_dict for m in range(self.num_stages)), \
            "Order quantities for all stages are required."
        assert all(action_dict[f"stage_{m}"] >= 0 for m in range(self.num_stages)), \
            "Order quantities must be non-negative integers."

        self.period += 1
        t = self.period
        M = self.num_stages
        current_inventories = self.inventories[:, t - 1].copy()
        self.orders[:, t] = np.array([action_dict[f"stage_{m}"] for m in range(M)])
        self.demands[t] = int(self.demand_fn(t))

        for m in range(M):
            lt = self.lead_times[m]
            if t >= lt:
                current_inventories[m] += self.arriving_orders[m, t - lt]

        self.arriving_orders[:-1, t] = np.minimum(
            np.minimum(self.backlogs[1:, t - 1] + self.orders[:-1, t], current_inventories[1:]),
            self.prod_capacities[1:])
        self.arriving_orders[M - 1, t] = self.orders[M - 1, t]

        self.sales[1:, t] = self.arriving_orders[:-1, t]
        self.sales[0, t] = min(
            min(self.backlogs[0, t - 1] + self.demands[t], current_inventories[0]),
            self.prod_capacities[0])

        self.backlogs[1:, t] = self.backlogs[1:, t - 1] + self.orders[:-1, t] - self.sales[1:, t]
        self.backlogs[0, t] = self.backlogs[0, t - 1] + self.demands[t] - self.sales[0, t]

        self.inventories[:, t] = current_inventories - self.sales[:, t]

        self.profits[:, t] = self.sale_prices * self.sales[:, t] - self.order_costs * self.arriving_orders[:, t] \
            - self.backlog_costs * self.backlogs[:, t] - self.holding_costs * self.inventories[:, t]
        self.total_profits[t] = int(np.sum(self.profits[:, t]))

        self.update_state()
        return self.period >= self.num_periods

    def to_dict(self) -> dict:
        return {
            "num_stages": self.num_stages,
            "num_periods": self.num_periods,
            "stage_names": self.stage_names,
            "lead_times": self.lead_times.tolist(),
            "prod_capacities": self.prod_capacities.tolist(),
            "sale_prices": self.sale_prices.tolist(),
            "order_costs": self.order_costs.tolist(),
            "backlog_costs": self.backlog_costs.tolist(),
            "holding_costs": self.holding_costs.tolist(),
            "period": self.period,
            "inventories": self.inventories.tolist(),
            "orders": self.orders.tolist(),
            "arriving_orders": self.arriving_orders.tolist(),
            "sales": self.sales.tolist(),
            "backlogs": self.backlogs.tolist(),
            "demands": self.demands.tolist(),
            "profits": self.profits.tolist(),
            "total_profits": self.total_profits.tolist(),
            "pending_actions": self.pending_actions,
            "demand": self._demand_spec,
            "seed": self._seed,
            "demand_description": self._demand_description,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "InventoryManagementEnv":
        env = cls(
            num_stages=data["num_stages"], num_periods=data["num_periods"],
            init_inventories=[row[0] for row in data["inventories"]],
            lead_times=data["lead_times"], demand=data["demand"],
            prod_capacities=data["prod_capacities"], sale_prices=data["sale_prices"],
            order_costs=data["order_costs"], backlog_costs=data["backlog_costs"],
            holding_costs=data["holding_costs"], stage_names=data["stage_names"], seed=data["seed"],
        )
        env.period = data["period"]
        env.inventories = np.array(data["inventories"], dtype=int)
        env.orders = np.array(data["orders"], dtype=int)
        env.arriving_orders = np.array(data["arriving_orders"], dtype=int)
        env.sales = np.array(data["sales"], dtype=int)
        env.backlogs = np.array(data["backlogs"], dtype=int)
        env.demands = np.array(data["demands"], dtype=int)
        env.profits = np.array(data["profits"], dtype=int)
        env.total_profits = np.array(data["total_profits"], dtype=int)
        env.pending_actions = data["pending_actions"]
        env._demand_spec = data["demand"]
        env._seed = data["seed"]
        env._demand_description = data["demand_description"]
        env.update_state()
        return env


def _load(state_path: Path) -> InventoryManagementEnv:
    data = json.loads(state_path.read_text())
    return InventoryManagementEnv.from_dict(data)


def _save(env: InventoryManagementEnv, state_path: Path):
    state_path.write_text(json.dumps(env.to_dict(), indent=2))


def cmd_init(args):
    if args.scenario:
        cfg = dict(DEMAND_SCENARIOS[args.scenario])
    else:
        cfg = json.loads(Path(args.config).read_text())
    env = InventoryManagementEnv(
        num_stages=cfg["num_stages"], num_periods=cfg["num_periods"],
        init_inventories=cfg["init_inventories"], lead_times=cfg["lead_times"],
        demand=cfg["demand"], prod_capacities=cfg["prod_capacities"],
        sale_prices=cfg["sale_prices"], order_costs=cfg["order_costs"],
        backlog_costs=cfg["backlog_costs"], holding_costs=cfg["holding_costs"],
        stage_names=cfg["stage_names"], seed=args.seed,
    )
    env._demand_spec = cfg["demand"]
    env._seed = args.seed
    env._demand_description = cfg["demand_description"]
    _save(env, Path(args.out))
    print(json.dumps({
        "ok": True, "num_stages": env.num_stages, "num_periods": env.num_periods,
        "stage_names": env.stage_names, "demand_description": env._demand_description,
    }, indent=2))


def cmd_state(args):
    env = _load(Path(args.state))
    if env.period >= env.num_periods:
        print(json.dumps({"ok": False, "error": "episode already finished"}, indent=2))
        sys.exit(1)
    stage_state = env.parse_state(args.stage)
    downstream_order = env.pending_actions.get(str(args.stage - 1)) if args.stage != 0 else None
    print(json.dumps({
        "ok": True, "period": env.period + 1, "num_periods": env.num_periods,
        "stage": args.stage, "num_stages": env.num_stages,
        "demand_description": env._demand_description,
        "downstream_order": downstream_order,
        "state": stage_state,
    }, indent=2))


def cmd_record_action(args):
    env = _load(Path(args.state))
    parsed_state = env.parse_state(args.stage)
    if args.action < 0:
        print(json.dumps({"ok": False, "error": "action must be non-negative"}, indent=2))
        sys.exit(1)
    env.pending_actions[str(args.stage)] = args.action
    _save(env, Path(args.state))
    print(json.dumps({
        "ok": True, "stage": args.stage, "recorded_action": args.action,
        "stages_recorded": sorted(int(k) for k in env.pending_actions),
        "stages_remaining": [m for m in range(env.num_stages) if str(m) not in env.pending_actions],
        "max_production": parsed_state["prod_capacity"],
    }, indent=2))


def cmd_step(args):
    env = _load(Path(args.state))
    if env.period >= env.num_periods:
        print(json.dumps({"ok": False, "error": "episode already finished"}, indent=2))
        sys.exit(1)
    missing = [m for m in range(env.num_stages) if str(m) not in env.pending_actions]
    if missing:
        print(json.dumps({"ok": False, "error": f"missing actions for stages {missing}"}, indent=2))
        sys.exit(1)
    action_dict = {f"stage_{m}": env.pending_actions[str(m)] for m in range(env.num_stages)}
    done = env.step(action_dict)
    t = env.period
    env.pending_actions = {}
    _save(env, Path(args.state))
    print(json.dumps({
        "ok": True, "period_completed": t, "num_periods": env.num_periods, "episode_done": done,
        "demand_this_period": int(env.demands[t]),
        "profits_by_stage": {env.stage_names[m]: int(env.profits[m, t]) for m in range(env.num_stages)},
        "total_profit_this_period": int(env.total_profits[t]),
    }, indent=2))


def cmd_dump(args):
    env = _load(Path(args.state))
    print(json.dumps(env.to_dict(), indent=2))


def build_parser():
    p = argparse.ArgumentParser(description="Multi-echelon inventory simulation engine")
    sub = p.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="Start a new episode")
    p_init.add_argument("--out", required=True, help="Path to write the episode state JSON")
    group = p_init.add_mutually_exclusive_group(required=True)
    group.add_argument("--scenario", choices=sorted(DEMAND_SCENARIOS), help="Built-in demand scenario")
    group.add_argument("--config", help="Path to a custom config JSON (see references/demand-scenarios.md)")
    p_init.add_argument("--seed", type=int, default=0)
    p_init.set_defaults(func=cmd_init)

    p_state = sub.add_parser("state", help="Get the current period's state for one stage")
    p_state.add_argument("--state", required=True)
    p_state.add_argument("--stage", type=int, required=True)
    p_state.set_defaults(func=cmd_state)

    p_record = sub.add_parser("record-action", help="Record a stage's order quantity for the current period")
    p_record.add_argument("--state", required=True)
    p_record.add_argument("--stage", type=int, required=True)
    p_record.add_argument("--action", type=int, required=True)
    p_record.set_defaults(func=cmd_record_action)

    p_step = sub.add_parser("step", help="Advance the period once every stage has recorded an action")
    p_step.add_argument("--state", required=True)
    p_step.set_defaults(func=cmd_step)

    p_dump = sub.add_parser("dump", help="Dump the full episode trajectory")
    p_dump.add_argument("--state", required=True)
    p_dump.set_defaults(func=cmd_dump)

    return p


def main():
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
