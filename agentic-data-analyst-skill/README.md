# Agentic Data Analyst

```
npx skills add owner/agentic-data-analyst-skill
```
*(placeholder — update with the real `owner/repo` if this skill is published)*

## What it does

Runs autonomous, execution-grounded data analysis. Instead of writing one
big analysis script and hoping it's right, this skill interleaves reasoning
and code execution in a tight loop — Understand → Analyze → Code → Observe →
Answer — so every claim in the final report traces back to something it
actually ran. It also handles the "what should this report even look like"
question up front: it checks for a saved format from a previous run,
elicits your preferences, or learns the format from a past report you
supply, then persists that format for next time.

## Who it's for

Anyone using Claude Code to explore a dataset, answer a data question, or
produce a written data-analysis report — structured (CSV/Excel/DB),
semi-structured (JSON/XML), or unstructured (text/Markdown) sources.

## Usage examples

> "Analyze `sales_2025.csv` and tell me what's driving the Q4 drop."

> "Here's a report I wrote last quarter (`q3_report.md`) — analyze
> `q4_data.csv` and give me the same kind of report."

> "How many rows in this file have a null customer_id?" *(quick mode — same
> grounding rules, lighter reporting)*

The skill auto-triggers on data-analysis language; no explicit invocation
needed. It also works if called directly as `/agentic-data-analyst-skill`.

## What's inside

```
agentic-data-analyst-skill/
├── SKILL.md                                    # Entry point: modes, workflow, gotchas
├── evals.md                                    # Trigger/task/edge-case eval pack
├── README.md                                   # This file
└── references/
    ├── action-loop-mental-model.md             # The core loop + heuristics + gotchas
    ├── format-setup-and-persistence.md         # Check/elicit/learn output format, persist it
    └── report-structure-and-success-criteria.md# Default report shape + quality checklist
```

## Compatibility

Built for Claude Code. Degrades gracefully on other agents (Cursor, Codex,
Kimi CLI, etc.) — format questions fall back to plain text where
AskUserQuestion isn't available.

## License

MIT
