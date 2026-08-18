---
name: agentic-data-analyst-skill
description: >-
  Runs autonomous, execution-grounded data analysis: explores structured
  (CSV/Excel/DB), semi-structured (JSON/XML), or unstructured (text/Markdown)
  data via an interleaved understand-analyze-code-observe loop, then produces
  an evidence-cited report in a format the user specifies or that is learned
  from a past report example. Use when the user asks to analyze a dataset or
  file, explore data, investigate a data question, "dig into this CSV/data",
  build a data report, run a data science task end-to-end, or wants an
  autonomous/agentic data analysis rather than a single quick query.
license: MIT
metadata:
  version: 1.0.0
  created: 2026-08-18
  last_reviewed: 2026-08-18
  review_interval_days: 180
---

# Agentic Data Analyst

An autonomous, execution-grounded workflow for data-science pipelines run
end-to-end without human intervention. The core insight this skill
captures: **reasoning and execution are one interleaved loop, and every
claim in the final report must trace back to something actually
executed.**

## Quick Start

**Full analysis with a report:**
> "Analyze `sales_2025.csv` and tell me what's driving the Q4 drop."

**Quick single-question exploration (lighter format, same grounding rules):**
> "How many rows in this file have null customer_id?"

Both paths use the same execution-grounded loop; they differ only in how
much Format Setup and report structure is warranted (see Modes below).

---

## Core Principles

1. **Reasoning and execution are one interleaved loop** — never plan the
   whole analysis up front and execute it blind. See
   [action-loop-mental-model.md](references/action-loop-mental-model.md).
2. **Every claim must be execution-grounded** — a conclusion is only valid
   if a specific executed step produced the evidence for it.
3. **Establish the output format before analyzing, not after** — format
   shapes what evidence to collect. See
   [format-setup-and-persistence.md](references/format-setup-and-persistence.md).
4. **The deliverable is a report, not a chat answer** for anything beyond a
   single quick fact — see
   [report-structure-and-success-criteria.md](references/report-structure-and-success-criteria.md).
5. **Runtime feedback drives the next move** — treat errors, empty results,
   or unexpected schemas as signals to re-analyze, never as noise to route
   around silently.

---

## Modes

| Signal | Mode | What changes |
|---|---|---|
| Dataset/file + open-ended question ("analyze", "investigate", "what's driving X") | **Full Analysis** | Full Format Setup (check/elicit/learn), full report structure |
| Single narrow factual question ("how many rows have X", "what's the max of Y") | **Quick Explore** | Skip full Format Setup elicitation; still ground the answer in executed code and briefly state it, but no multi-section report required unless asked |
| Ambiguous | Ask: "Do you want a full analysis report, or just a quick answer to this one question?" | — |

Even in Quick Explore mode, never skip execution-grounding (Principle 2) —
only the reporting overhead is optional, not the rigor.

---

## Workflow

### Step 1: Format Setup (Full Analysis mode; brief check even in Quick Explore)

Read [format-setup-and-persistence.md](references/format-setup-and-persistence.md)
and follow it exactly:
1. Check for `./report-format.md` in the project first.
2. If missing/stale, elicit format requirements directly and/or offer to
   learn from a past report example the user points to.
3. Confirm the (found, elicited, or learned) format with the user before
   analyzing.

**Wait gate:** proceed to Step 2 only once the format is confirmed (or the
user explicitly says to skip formatting for a quick answer).

### Step 2: Run the Action Loop

Read [action-loop-mental-model.md](references/action-loop-mental-model.md)
and run the Understand → Analyze → Code → Observe → Answer loop:
- Probe the data's shape before assuming it.
- Treat every execution result (success or failure) as information that
  may send you back to Understand/Analyze.
- Don't collapse multiple investigative steps into one code block — keep
  reasoning and execution steps distinct and separately inspectable.

### Step 3: Generate the Report

Read [report-structure-and-success-criteria.md](references/report-structure-and-success-criteria.md).
Write the Answer step's output to match the confirmed format from Step 1,
citing the specific executed steps behind each claim. Run through the
Success Criteria checklist before presenting it as done.

### Step 4: Persist the Format Learning

Per [format-setup-and-persistence.md](references/format-setup-and-persistence.md)
Step 4, write or update `./report-format.md` with the confirmed/learned
format spec (structure, style, notes) — not a copy of the report content.
Skip this only if the user explicitly declined a full analysis (pure Quick
Explore with no format discussion at all).

---

## Gotchas

- **Don't narrate a conclusion without having executed the code that
  grounds it.** The most common failure: confident prose dressed up as
  analysis with no traceable execution behind it.
- **Don't treat "the code ran without error" as "the task is complete."**
  Check whether the result actually answers the original question.
- **Don't skip Format Setup because the user "just wants a quick answer."**
  Ask briefly which mode they want rather than guessing and redoing work.
- **Don't re-run full format elicitation when `report-format.md` already
  exists and still fits.** Confirm-and-reuse instead — that's the entire
  point of persisting it.
- **Don't write report content into `report-format.md`.** It's a reusable
  format spec, not a cache of past analysis output.
- **Don't collapse the whole analysis into one giant code block.** Losing
  the interleaved reasoning trace makes errors unrecoverable and the
  report unauditable.
- **Don't skip data-shape probing on "obviously simple" inputs.** Malformed
  headers, mixed types, and encoding issues are common and cheap to catch
  early.

Full gotcha lists with rationale live in each reference file linked above —
load them when the relevant step is active, not all at once.

---

## Reference Index

| File | Contents | Load When |
|---|---|---|
| [action-loop-mental-model.md](references/action-loop-mental-model.md) | The Understand-Analyze-Code-Observe-Answer loop, decision heuristics, gotchas | Step 2 (always, for any non-trivial analysis) |
| [format-setup-and-persistence.md](references/format-setup-and-persistence.md) | How to check/elicit/learn output format and persist it to `report-format.md` | Step 1 and Step 4 |
| [report-structure-and-success-criteria.md](references/report-structure-and-success-criteria.md) | Default report structure and the checklist a finished report must pass | Step 3 |
