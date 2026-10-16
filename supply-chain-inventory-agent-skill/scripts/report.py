#!/usr/bin/env python3
"""
Build the final report for a completed (or in-progress) inventory episode:
per-stage profit breakdown, inventory/backlog/order time series, episode
reward, and a bullwhip-effect metric (order-quantity variance amplification
relative to customer demand variance, the paper's stated concern about
naive over-ordering). Optionally diffs an LLM-agent run against a
baseline-policy run of the same scenario.
"""
import argparse
import json
from pathlib import Path

import numpy as np


def bullwhip_ratios(data: dict) -> dict:
    """
    variance(orders placed by stage m) / variance(customer demand), for each
    stage, over the completed periods. > 1 means stage m amplifies demand
    variance into its own order variance -- the bullwhip effect.
    """
    period = data["period"]
    if period < 2:
        return {}
    demands = np.array(data["demands"][1:period + 1], dtype=float)
    demand_var = float(np.var(demands))
    orders = np.array(data["orders"], dtype=float)[:, 1:period + 1]
    ratios = {}
    for m, name in enumerate(data["stage_names"]):
        order_var = float(np.var(orders[m]))
        ratios[name] = None if demand_var == 0 else round(order_var / demand_var, 3)
    return ratios


def build_report(data: dict) -> dict:
    period = data["period"]
    stage_names = data["stage_names"]
    profits = np.array(data["profits"], dtype=int)[:, 1:period + 1]
    total_profits = np.array(data["total_profits"], dtype=int)[1:period + 1]

    return {
        "periods_completed": period,
        "num_periods": data["num_periods"],
        "episode_reward": int(total_profits.sum()),
        "profit_by_stage": {name: int(profits[m].sum()) for m, name in enumerate(stage_names)},
        "mean_profit_per_period": round(float(total_profits.mean()), 2) if period else 0.0,
        "std_profit_per_period": round(float(total_profits.std()), 2) if period else 0.0,
        "inventory_trajectory": {
            name: data["inventories"][m][:period + 1] for m, name in enumerate(stage_names)
        },
        "backlog_trajectory": {
            name: data["backlogs"][m][:period + 1] for m, name in enumerate(stage_names)
        },
        "order_trajectory": {
            name: data["orders"][m][1:period + 1] for m, name in enumerate(stage_names)
        },
        "demand_trajectory": data["demands"][1:period + 1],
        "bullwhip_ratio_by_stage": bullwhip_ratios(data),
    }


def main():
    ap = argparse.ArgumentParser(description="Build a report from a completed episode state")
    ap.add_argument("--state", required=True, help="Episode state JSON path (from supply_chain_env.py)")
    ap.add_argument("--baseline-state", help="A second episode state JSON to compare against (e.g. from run_baseline.py)")
    ap.add_argument("--label", default="agent", help="Label for the primary run in the comparison output")
    ap.add_argument("--baseline-label", default="baseline", help="Label for the baseline run")
    ap.add_argument("--out", help="Write the report JSON here instead of just printing")
    args = ap.parse_args()

    data = json.loads(Path(args.state).read_text())
    report = {args.label: build_report(data)}

    if args.baseline_state:
        baseline_data = json.loads(Path(args.baseline_state).read_text())
        report[args.baseline_label] = build_report(baseline_data)
        report["comparison"] = {
            "episode_reward_delta": report[args.label]["episode_reward"] - report[args.baseline_label]["episode_reward"],
            "note": f"positive delta means {args.label} outperformed {args.baseline_label} in total profit",
        }

    output = json.dumps(report, indent=2)
    if args.out:
        Path(args.out).write_text(output)
    print(output)


if __name__ == "__main__":
    main()
