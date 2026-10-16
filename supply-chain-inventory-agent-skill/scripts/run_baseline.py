#!/usr/bin/env python3
"""
Deterministic entry-point: run a full episode with the fixed base-stock
policy (no LLM involved) end to end and write its report.

This is the skill's one non-interactive pipeline -- init env -> compute each
stage's action with baseline_policy -> step -> repeat -> report -- wired in
code so it can serve as a reproducible golden case for evals/run_evals.py and
as the comparison baseline the LLM-agent simulation is benchmarked against
(see report.py --baseline-state). The interactive LLM-agent simulation itself
is NOT expressed as a pipeline here: each stage's order in that mode is a live
reasoning step the assistant performs per references/prompt-template.md, which
cannot be precomputed by a script (see references/phase5-orchestration.md's
"honest boundary" -- this is exactly that case).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from baseline_policy import fixed_inventory_action
from report import build_report
from supply_chain_env import DEMAND_SCENARIOS, InventoryManagementEnv


def run_baseline(scenario: str = None, config_path: str = None, seed: int = 0, policy: str = "sale") -> dict:
    if scenario:
        cfg = dict(DEMAND_SCENARIOS[scenario])
    else:
        cfg = json.loads(Path(config_path).read_text())

    env = InventoryManagementEnv(
        num_stages=cfg["num_stages"], num_periods=cfg["num_periods"],
        init_inventories=cfg["init_inventories"], lead_times=cfg["lead_times"],
        demand=cfg["demand"], prod_capacities=cfg["prod_capacities"],
        sale_prices=cfg["sale_prices"], order_costs=cfg["order_costs"],
        backlog_costs=cfg["backlog_costs"], holding_costs=cfg["holding_costs"],
        stage_names=cfg["stage_names"], seed=seed,
    )
    env._demand_spec = cfg["demand"]
    env._seed = seed
    env._demand_description = cfg["demand_description"]

    for _ in range(env.num_periods):
        action_dict = {}
        for stage in range(env.num_stages):
            parsed_state = env.parse_state(stage)
            action_dict[f"stage_{stage}"] = fixed_inventory_action(parsed_state, policy_name=policy)
        env.step(action_dict)

    return env.to_dict()


def run_pipeline(scenario: str, out: Path, config_path: str = None, seed: int = 0, policy: str = "sale",
                  state_out: Path = None) -> Path:
    state = run_baseline(scenario=scenario, config_path=config_path, seed=seed, policy=policy)
    if state_out:
        state_out.write_text(json.dumps(state, indent=2))
    report = {"baseline": build_report(state)}
    out.write_text(json.dumps(report, indent=2))
    return out


def main():
    ap = argparse.ArgumentParser(description="Run a full episode with the fixed base-stock policy")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--scenario", choices=sorted(DEMAND_SCENARIOS))
    group.add_argument("--config", help="Path to a custom config JSON")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--policy", choices=["sale", "production"], default="sale")
    ap.add_argument("--out", required=True, help="Report JSON output path")
    ap.add_argument("--state-out", help="Optional: also write the full episode state JSON here")
    args = ap.parse_args()

    state_out = Path(args.state_out) if args.state_out else None
    run_pipeline(
        scenario=args.scenario, out=Path(args.out), config_path=args.config,
        seed=args.seed, policy=args.policy, state_out=state_out,
    )
    print(f"Report written to {args.out}")


if __name__ == "__main__":
    main()
