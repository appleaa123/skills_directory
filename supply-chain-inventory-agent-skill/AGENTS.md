# AGENTS.md — supply-chain-inventory-agent-skill

## Purpose

Runs a multi-echelon supply chain inventory management simulation using the
InvAgent LLM multi-agent pattern (Quan & Liu, 2024): the agent plays every
stage's ordering-decision role each period, following a fixed prompt template
and heuristic ordering rules that curb the bullwhip effect, then benchmarks
the result against a deterministic fixed base-stock policy.

## Activation

Trigger this skill when the user asks to: simulate a supply chain, manage
multi-stage inventory, decide order quantities under lead time/backlog
constraints, compare LLM-driven vs. classical inventory policies, or analyze
bullwhip-effect amplification across a supply chain.

## Usage

See `SKILL.md` for the full workflow. Summary: `scripts/supply_chain_env.py`
is a stateful CLI (`init` / `state` / `record-action` / `step` / `dump`)
backed by a JSON episode file. For each period, for each stage in order, the
agent fetches that stage's state, reasons about the order quantity itself
(per `references/prompt-template.md`, InvAgent's exact prompt and heuristics
— no external LLM call is made), and records it. Once every stage has
recorded an action, the period is stepped. `scripts/run_baseline.py` runs the
same scenario with a deterministic fixed-policy baseline for comparison, and
`scripts/report.py` builds the final profit/trajectory/bullwhip report.

## Key files

- `SKILL.md` — full instructions and the exact per-period workflow
- `references/prompt-template.md` — the ported per-stage decision prompt and golden-rule heuristics
- `references/demand-scenarios.md` — the 6 built-in demand scenarios and the custom config schema
- `scripts/supply_chain_env.py` — the simulation engine (ported from InvAgent's `env.py`/`config.py`)
- `scripts/baseline_policy.py` — the fixed base-stock policy (ported from InvAgent's `baseline.py`)
- `scripts/run_baseline.py` — deterministic end-to-end baseline pipeline (also the eval entry-point)
- `scripts/report.py` — builds the final comparison report

## Source

Distilled from https://github.com/zefang-liu/InvAgent (Apache-2.0). See that
repo's paper (arXiv:2407.11384) for the research this skill operationalizes.
