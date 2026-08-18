# Format Setup and Persistence

Before any analysis begins, establish the report's *output format*. Never run
the analysis loop first and figure out formatting at the end — the format
governs what evidence to collect and how to structure the Answer step.

This is a pre-step in front of the
[Understand-Analyze-Code-Observe-Answer loop](action-loop-mental-model.md),
and a persistence step after it:

```
Format Setup → Understand-Analyze-Code-Observe-Answer loop → Report Generation
     ▲                                                              │
     └──────────────────── Persist format learning ◀────────────────┘
```

## Step 1: Check for a saved format first

Look for a per-project learned-format file at `./report-format.md` (relative
to the current working directory / project root) before asking the user
anything.

- **Found and looks current** → confirm briefly: "I see a saved report
  format from a previous run (`report-format.md`) — [one-line summary of
  it]. Still want this format, or should we change it?" Proceed on
  confirmation instead of re-running full elicitation.
- **Found but stale-looking** (references a data domain, sections, or
  conventions that clearly don't fit the current task) → say so and offer
  to re-elicit or update it, don't silently reuse it.
- **Not found** → go to Step 2.

## Step 2: Elicit or learn the format

Two ways to establish the format — offer both, use whichever the user
picks:

**A. Ask directly.** Use AskUserQuestion (plain-text question if
unavailable) covering: structure/sections wanted, tone (executive vs.
technical), target length, and output type (Markdown, PDF-renderable,
slide-style, etc.). Ask 2-3 things at a time, not a wall of questions.

**B. Learn from an example.** If the user has a past report to point to,
read it and infer:
- Section structure and ordering (what comes first, what's last)
- Heading style and depth
- How evidence/citations are presented (inline code refs? footnotes?
  appendix?)
- Tone and length conventions
- Any recurring boilerplate (title block, executive summary, disclaimers)

Present the inferred format back to the user for confirmation before
generating anything: "Here's the format I picked up from your example:
[bullet summary]. Match this?"

Either path ends in the same place: a confirmed format spec, in the
agent's own words, that can drive report generation and can be persisted.

## Step 3: Generate the report to match the format

Run the [action loop](action-loop-mental-model.md), then write the Answer
step's report using the confirmed structure/tone/length/output type — not a
generic default. See
[report-structure-and-success-criteria.md](report-structure-and-success-criteria.md)
for what must be true regardless of the specific format chosen.

## Step 4: Persist the format learning

After the report is generated (or the format confirmed, if generation
happens later), write or update `./report-format.md` in the project root
with the confirmed/learned format spec. Use this shape:

```markdown
# Report Format

Learned/confirmed: {{date}}
Source: {{"user-specified" | "learned from <path-to-example-report>"}}

## Structure
- {{Section 1 name}} — {{what goes here}}
- {{Section 2 name}} — {{what goes here}}
...

## Style
- Tone: {{executive / technical / narrative}}
- Length: {{target length or range}}
- Output type: {{Markdown / PDF-renderable / other}}
- Evidence presentation: {{how code/results are cited or embedded}}

## Notes
{{Any recurring boilerplate, naming conventions, or things this project's
reports always/never include.}}
```

- This file is a **reusable spec**, not a copy of the analysis report
  itself. Don't paste report content into it.
- If the user specified a different save location, use that instead of the
  default `./report-format.md` and remember to check that path first on
  future runs in this skill's instructions to the user.
- Overwrite (don't append) when updating an existing `report-format.md` —
  it should always reflect the current confirmed format, not a history of
  every format ever used.

## Gotchas

- **Don't skip Format Setup because "the user just wants a quick answer."**
  Even a quick single-question exploration benefits from knowing whether
  the user wants a paragraph or a full report — ask briefly rather than
  guessing and redoing work.
- **Don't re-ask the full elicitation questions when a valid
  `report-format.md` already exists.** That defeats the point of
  persistence and is annoying on repeat runs — confirm-and-reuse instead.
- **Don't treat "learn from an example" as license to skip confirmation.**
  Inferred formats can miss the point of an example (e.g., picking up
  incidental formatting instead of the intentional structure) — always
  show the inferred summary back before generating.
- **Don't write analysis content into `report-format.md`.** It's a spec
  for *how* to format, not a cache of *what* was reported — conflating the
  two makes the file stale the moment the data changes.
