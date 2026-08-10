#!/usr/bin/env python3
"""
Fixed base-stock ordering policy.

Ported from zefang-liu/InvAgent's src/baseline.py (Apache-2.0)
FixedPolicy.get_fixed_inventory_action, with the RLlib/Ray policy wrapper
removed: this is pure arithmetic, so it needs no observation/action-space
machinery to run. Used as the non-LLM comparison point InvAgent's paper
benchmarks its LLM agents against.
"""
import argparse
import json
from pathlib import Path

import numpy as np


def fixed_inventory_action(parsed_state: dict, policy_name: str = "sale") -> int:
    """
    Compute the base-stock order quantity for one stage's parsed state.

    :param parsed_state: a dict as returned by supply_chain_env.py's
        InventoryManagementEnv.parse_state (prod_capacity, inventory, backlog,
        upstream_backlog, sales, deliveries, lead_time)
    :param policy_name: "sale" targets a base-stock level of
        mean(recent sales) * lead_time + backlog (the policy InvAgent's paper
        evaluates against); "production" targets the stage's full production
        capacity.
    :return: order quantity, clamped to [0, prod_capacity]
    """
    if policy_name == "production":
        desired_inventory = int(parsed_state["prod_capacity"])
    elif policy_name == "sale":
        sales = parsed_state["sales"]
        mean_sales = float(np.mean(sales)) if sales else 0.0
        desired_inventory = mean_sales * parsed_state["lead_time"] + parsed_state["backlog"]
    else:
        raise KeyError(f"Unknown policy name: {policy_name}")

    in_pipeline = parsed_state["inventory"] + parsed_state["upstream_backlog"] + sum(parsed_state["deliveries"])
    action = desired_inventory - in_pipeline
    return int(min(max(0, action), parsed_state["prod_capacity"]))


def main():
    ap = argparse.ArgumentParser(description="Compute the fixed base-stock order for a stage state")
    ap.add_argument("--state", required=True, help="Episode state JSON path (from supply_chain_env.py)")
    ap.add_argument("--stage", type=int, required=True)
    ap.add_argument("--policy", choices=["sale", "production"], default="sale")
    args = ap.parse_args()

    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from supply_chain_env import InventoryManagementEnv

    data = json.loads(Path(args.state).read_text())
    env = InventoryManagementEnv.from_dict(data)
    parsed_state = env.parse_state(args.stage)
    action = fixed_inventory_action(parsed_state, policy_name=args.policy)
    print(json.dumps({"ok": True, "stage": args.stage, "policy": args.policy, "action": action}, indent=2))


if __name__ == "__main__":
    main()
