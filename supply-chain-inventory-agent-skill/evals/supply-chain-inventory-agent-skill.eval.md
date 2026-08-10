# Eval spec — supply-chain-inventory-agent-skill

This skill has two workflows: a **deterministic baseline pipeline**
(`scripts/run_baseline.py`) and an **interactive LLM-agent simulation** (the
per-stage reasoning loop in `SKILL.md`). Only the deterministic pipeline is
automatically checkable — the interactive loop requires live agent judgment
per period/stage and is validated manually via the Trigger examples in
`SKILL.md`.

## Criteria

1. **valid-report-json** (`command`) — the report file is valid JSON.
2. **episode-completes** (`command`) — the report shows all periods of the
   scenario were simulated (`periods_completed == num_periods`).
3. **reward-is-finite-and-reproducible** (`command`) — `episode_reward` is
   present and numeric (deterministic given a fixed seed and config, so a
   byte-identical repeat run is expected — checked by the runner's baseline
   diff, not by this command alone).
4. **bullwhip-metric-present** (`command`) — every stage in the config has a
   `bullwhip_ratio_by_stage` entry (confirms the report didn't silently drop
   a stage).

The interactive LLM-agent loop's own correctness (non-negative integer
actions, 1-2 sentences of reasoning per `references/prompt-template.md`'s
response format) has no `run`-produced output to grade automatically here —
it is checked manually per `SKILL.md`'s Trigger examples, not by this spec.

## Golden cases

Seeded directly from the built-in demand scenarios in
`references/demand-scenarios.md` (`scripts/supply_chain_env.py`'s
`DEMAND_SCENARIOS`), run through the deterministic baseline pipeline with
`--seed 0`:

- `case-1` — `constant_demand` (4-stage chain, constant demand 4/period). `split: val`.
- `case-2` — `seasonal_demand` (4-stage chain, demand steps up after round 4). `split: val`.
- `case-3` — `normal_demand` (4-stage chain, varied lead times/costs, normal demand). `split: test` (holdout).

```json
{
  "skill": "supply-chain-inventory-agent-skill",
  "run": "python3 scripts/run_baseline.py --config {input} --seed 0 --out {output}",
  "criteria": [
    {"id": "valid-report-json", "text": "Report output is valid JSON", "type": "command", "cmd": "python3 -c \"import json,sys; json.load(open('{output}'))\""},
    {"id": "episode-completes", "text": "All periods of the scenario were simulated", "type": "command", "cmd": "python3 -c \"import json; d=json.load(open('{output}'))['baseline']; assert d['periods_completed'] == d['num_periods']\""},
    {"id": "reward-is-finite-and-reproducible", "text": "episode_reward is present and numeric", "type": "command", "cmd": "python3 -c \"import json; v=json.load(open('{output}'))['baseline']['episode_reward']; assert isinstance(v, int)\""},
    {"id": "bullwhip-metric-present", "text": "Every stage has a bullwhip_ratio_by_stage entry", "type": "command", "cmd": "python3 -c \"import json; d=json.load(open('{output}'))['baseline']; assert set(d['bullwhip_ratio_by_stage']) == set(d['profit_by_stage'])\""}
  ],
  "golden": [
    {"id": "case-1", "input": "golden/case-1/input.json", "expected": "golden/case-1/expected.json", "split": "val"},
    {"id": "case-2", "input": "golden/case-2/input.json", "expected": "golden/case-2/expected.json", "split": "val"},
    {"id": "case-3", "input": "golden/case-3/input.json", "expected": "golden/case-3/expected.json", "split": "test"}
  ]
}
```
