# The Understand-Analyze-Code-Observe-Answer Loop

A mental model for autonomous data-science pipelines run end-to-end. The
value here is the *loop shape* — apply it to any tool-calling agent.

## The Loop

```
 ┌─────────────┐
 │  Understand │  restate the question + what's known about the data so far
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │   Analyze   │  decide the next investigative step, and why
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │    Code     │  write + execute the smallest step that tests that decision
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │   Observe   │  read the ACTUAL execution output, not the expected one
 └──────┬──────┘
        ▼
   contradicts plan? ──yes──▶ back to Understand/Analyze
        │
        no
        ▼
 ┌─────────────┐
 │   Answer    │  synthesize into the report, citing the executed steps
 └─────────────┘  that support each claim
```

Reasoning steps (Understand/Analyze/Answer) and execution steps (Code) are
kept as distinct, separately-inspectable units — never merge them into one
undifferentiated block of "thinking out loud plus code." This is what makes
the trace auditable: a reviewer (or the agent itself, retrospectively) can
check each Code step's output against the Analyze step that preceded it.

## Core Principles

1. **Reasoning and execution are one interleaved loop.** Never plan the
   entire analysis up front and then execute it blind — each Code result
   reshapes the next Understand/Analyze step.
2. **Every claim must be execution-grounded.** A conclusion in the final
   report is only valid if a specific, cited Code step produced the
   evidence for it.
3. **Separate narrative reasoning from executable action.** Distinct
   "thinking" output vs. "doing" output keeps the trace auditable and lets
   each be checked independently.
4. **Data-shape-agnostic exploration.** The same loop applies whether the
   source is structured (CSV/DB), semi-structured (JSON/XML), or
   unstructured (text/Markdown) — probe before assuming a shape.
5. **Runtime feedback drives the next move.** Errors, empty results, or
   unexpected schemas are signals to re-analyze, not obstacles to route
   around silently.
6. **The deliverable is a report, not a chat answer.** Final output is a
   structured document that stands alone as evidence — see
   [report-structure-and-success-criteria.md](report-structure-and-success-criteria.md).

## Decision Heuristics

- If the data's shape/schema is unknown → probe it first (head/schema/
  sample) before writing analysis code. Don't assume from a filename or a
  stated size.
- If code execution errors or returns something unexpected → treat that as
  new information and loop back to Understand/Analyze. Don't retry the
  same code unchanged, and don't silently swallow the error into the final
  answer.
- If a Code step succeeds → that does not mean the task is done. Check
  whether the result actually answers the original question before moving
  to Answer.
- If multiple data sources are involved → resolve relationships between
  them (joins/keys/formats) as an explicit Analyze step, not implicitly
  inside one large Code block.

## Gotchas

- **Don't narrate a conclusion without having executed the code that
  grounds it** — the single biggest failure mode is confident, ungrounded
  prose dressed up as analysis. If you can't point to the Code step and
  its output that produced a claim, don't include the claim.
- **Don't treat "the code ran without error" as "the task is complete."**
  A successful execution can still fail to answer the actual question —
  always compare the Observe output against the original Understand
  framing before answering.
- **Don't collapse the whole analysis into one giant Code block.** Losing
  the interleaved reasoning trace makes errors unrecoverable (you can't
  tell which part failed) and the report unauditable.
- **Don't skip data-shape probing on "obviously simple" inputs** (e.g., a
  clean-looking CSV). Malformed headers, mixed types, encoding issues, and
  unexpected nulls are common and cheap to catch early, expensive to catch
  after the analysis is built on top of a bad assumption.
