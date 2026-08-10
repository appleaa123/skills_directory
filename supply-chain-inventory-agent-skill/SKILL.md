---
name: supply-chain-inventory-agent-skill
description: >-
  Simulates multi-echelon supply chain inventory management (retailer,
  wholesaler, distributor, manufacturer, or any custom N-stage chain) using
  the InvAgent LLM multi-agent decision pattern: the assistant plays each
  stage's ordering-agent role every period, reasoning over lead time,
  inventory, backlog, upstream backlog, recent sales and demand to choose an
  order quantity, following the golden-rule heuristics that curb the bullwhip
  effect. Benchmarks the resulting episode against a deterministic fixed
  base-stock policy baseline and reports profit, inventory/backlog/order
  trajectories, and bullwhip amplification per stage. Use for supply chain
  simulation, inventory management research, order quantity decisions,
  backlog and lead-time planning, or comparing LLM-agent vs. classical
  ordering policies.
license: Apache-2.0
activation: /supply-chain-inventory-agent-skill
provenance:
  maintainer: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  source_references:
    - url: https://github.com/zefang-liu/InvAgent
      name: InvAgent (source workflow this skill distills; env.py, config.py, baseline.py, and the autogen.ipynb prompt template are ported under Apache-2.0 — see LICENSE)
    - url: https://arxiv.org/abs/2407.11384
      name: "InvAgent paper: Quan & Liu, 2024"
metadata:
  author: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  last_reviewed: 2026-08-10
  review_interval_days: 90
  dependencies:
    - url: https://github.com/zefang-liu/InvAgent
      name: InvAgent (source workflow this skill distills)
      type: reference
---
# /supply-chain-inventory-agent-skill — Multi-Agent Inventory Simulation

You are running a multi-echelon supply chain inventory simulation. Every
period, every stage (retailer, wholesaler, distributor, manufacturer, or a
custom chain) must decide an order quantity. You play each stage's role
yourself, in character, following the exact InvAgent prompting pattern in
`references/prompt-template.md` — there is no external LLM API call in this
skill; you are the agent.

## Trigger

User invokes `/supply-chain-inventory-agent-skill` followed by their request:

```
/supply-chain-inventory-agent-skill run the seasonal_demand scenario
/supply-chain-inventory-agent-skill simulate constant demand for a 3-stage chain
/supply-chain-inventory-agent-skill compare LLM ordering vs baseline on larger_demand
/supply-chain-inventory-agent-skill build a custom 4-stage chain with lead times 1,2,2,3 and run it
/supply-chain-inventory-agent-skill sweep all demand scenarios and compare bullwhip effect
```

## Setup

```bash
cd scripts && python3 -m pip install -r requirements.txt   # numpy only, usually already present
```

## Workflow: full episode simulation

### 1. Pick or build a scenario

Built-in scenarios (`two_agent`, `constant_demand`, `variable_demand`,
`larger_demand`, `seasonal_demand`, `normal_demand`) are documented in
`references/demand-scenarios.md`. If the user wants a custom chain, write a
config JSON matching that reference's schema and pass it via `--config`.

### 2. Start the episode

```bash
python3 scripts/supply_chain_env.py init --scenario seasonal_demand --out /tmp/episode.json --seed 42
```

(swap `--scenario NAME` for `--config path/to/custom.json`; pick any `--seed`
for reproducibility — re-running with the same seed replays the same demand).

### 3. For each period, for each stage in order (0, 1, ..., num_stages - 1):

a. Get that stage's current state:

```bash
python3 scripts/supply_chain_env.py state --state /tmp/episode.json --stage 0
```

b. **Play that stage's role and decide the order quantity yourself**, exactly
as described in `references/prompt-template.md`: adopt the stage's system
role, reason over the state response's fields (lead time, inventory, backlog,
upstream backlog, sales, deliveries, demand description, downstream order),
apply the golden-rule heuristics (open orders ≈ expected downstream orders +
backlog; account for lead time; don't over-order; spread orders to avoid the
bullwhip effect), and state your reasoning in 1-2 sentences ending in a
non-negative integer.

c. Record the decision:

```bash
python3 scripts/supply_chain_env.py record-action --state /tmp/episode.json --stage 0 --action 4
```

Stages must be processed **in order** within a period — stage `m`'s state
response includes `downstream_order` (stage `m - 1`'s order this period),
which only exists once stage `m - 1` has been recorded.

### 4. Once every stage has recorded an action for the period, step it:

```bash
python3 scripts/supply_chain_env.py step --state /tmp/episode.json
```

The response's `episode_done` field tells you whether to loop back to step 3
for the next period or move on to reporting.

### 5. Run the baseline comparison

The fixed base-stock policy is a deterministic, non-LLM comparison point from
the same paper. Run it once for the same scenario/seed:

```bash
python3 scripts/run_baseline.py --scenario seasonal_demand --seed 42 \
  --out /tmp/baseline_report.json --state-out /tmp/baseline_state.json
```

### 6. Build the final report

```bash
python3 scripts/report.py --state /tmp/episode.json --baseline-state /tmp/baseline_state.json \
  --label "llm_agents" --baseline-label "fixed_policy" --out /tmp/final_report.json
```

Present the report to the user: episode reward (total profit), per-stage
profit breakdown, inventory/backlog/order trajectories, the bullwhip ratio per
stage (order-quantity variance ÷ demand variance — values above 1 mean that
stage amplified demand variance into its own orders), and how the LLM-agent
run compared to the fixed-policy baseline. Note: for `constant_demand` (and
any scenario with zero demand variance), every `bullwhip_ratio_by_stage`
value is `null` by design (dividing by zero variance is undefined) — that is
expected, not a broken report.

## Multi-scenario sweep

To compare across demand patterns, repeat the full workflow (steps 2-6) once
per scenario with a fresh `--out`/`--state` per run, then compare the reports'
`episode_reward` and `bullwhip_ratio_by_stage` side by side.

## Notes

- Always process stages in ascending order within a period — the prompt
  template needs the previous stage's order.
- `record-action` rejects negative actions; if your reasoning implies "order
  nothing," record `0`, not a negative number.
- The engine has no external state beyond the `--state` JSON file — it is
  safe to interleave reads/writes across a long conversation.
- `run_baseline.py` is the skill's only fully deterministic pipeline (no live
  reasoning involved); the interactive per-stage loop above is not scripted
  as a pipeline on purpose — each stage's order is genuine reasoning, not
  something a deterministic script could produce (see
  `references/phase5-orchestration.md`'s "honest boundary" if curious why).

## Eval spec

This skill ships `evals/supply-chain-inventory-agent-skill.eval.md`. Its
`run` command exercises the deterministic baseline pipeline end to end
(`scripts/run_baseline.py`), which is what's checkable without live agent
reasoning; the interactive LLM-agent loop is validated manually per the
Trigger examples above.

```
python3 scripts/run_evals.py                    # score against golden baseline
python3 scripts/run_evals.py --rollout           # run the pipeline and score real output
python3 scripts/run_evals.py --rollout --promote # capture first-green baseline
```
