# Skill Evals

Skill: agentic-data-analyst-skill
Lane: Public Polished

## Positive Triggers

- Prompt: "Analyze this sales_2025.csv and tell me what's driving the Q4
  revenue drop."
  Expected: Enters Full Analysis mode — runs Format Setup (checks for
  `./report-format.md`, elicits or offers to learn format since none
  exists), then the Understand-Analyze-Code-Observe-Answer loop, then a
  structured report with cited evidence, then persists `report-format.md`.

- Prompt: "Dig into this JSON export and give me a report on user churn
  patterns."
  Expected: Same as above; probes the JSON's shape before assuming
  structure (semi-structured data path).

- Prompt: "Can you run a full data science task on this dataset end to
  end?"
  Expected: Full Analysis mode triggers on "data science task end to end"
  language even without the word "report."

- Prompt: "I want an autonomous analysis of these three CSVs — how do they
  relate and what does that tell us?"
  Expected: Full Analysis mode; treats resolving relationships between the
  three sources as an explicit Analyze step, not an implicit join buried in
  one code block.

- Prompt: "Investigate why our churn.txt log shows a spike in March."
  Expected: Triggers on unstructured-data investigation, not just
  spreadsheet-shaped data.

## Non-Triggers

- Prompt: "What's the syntax for a pandas groupby?"
  Expected: Answered directly as a coding question — does not invoke the
  full Format Setup / action-loop / report workflow for a syntax lookup.

- Prompt: "Can you reformat this Markdown report I wrote to have better
  headings?"
  Expected: Treated as a plain editing task, not an analysis task — no
  action loop, no `report-format.md` persistence (there's no analysis
  being performed, just document editing).

- Prompt: "Write unit tests for this data-loading function."
  Expected: Normal test-writing task; skill does not activate.

## Representative Tasks

- Prompt: "Analyze `orders.csv` and explain the drop in repeat purchases
  last quarter. No preference on format."
  Expected: Format Setup checks for `report-format.md` (none found), asks
  a brief format question or offers a sensible default, confirms, then
  runs the loop and produces the default Context/Methodology/Analysis/
  Conclusions report. `report-format.md` is written afterward.
  Success signals:
  - Every claim in the Conclusions section references a specific executed
    step.
  - The original question ("why did repeat purchases drop") is explicitly
    answered before caveats.
  - `report-format.md` exists after the run and does not contain analysis
    content, only the format spec.

- Prompt: "Here's a report I wrote last quarter (`q3_report.md`) — analyze
  `q4_data.csv` and give me the same kind of report."
  Expected: Format Setup reads `q3_report.md`, infers structure/tone/
  length, presents the inferred format back for confirmation, then
  generates the Q4 report matching it.
  Success signals:
  - Inferred format summary is shown before any analysis code runs.
  - Generated report's section structure matches the example.
  - `report-format.md` records the learned format, not a copy of
    `q3_report.md`'s content.

- Prompt: (second run in the same project, after `report-format.md`
  already exists) "Analyze `q1_2026.csv` the same way as before."
  Expected: Format Setup finds `report-format.md`, briefly confirms it
  still applies, and skips full re-elicitation.
  Success signals:
  - No repeated wall of format questions.
  - Report matches the previously persisted format.

- Prompt: "Here's a screenshot of last year's report (`report_example.png`)
  — use this as the template and analyze `this_year.csv`."
  Expected: Format Setup treats the image as a valid template, infers
  section structure/tone/length only (not exact visual design), presents
  the inferred format back explicitly noting visual design was not
  replicated, then generates the report.
  Success signals:
  - Inferred format summary explicitly notes it skipped color/font/layout
    inference.
  - `report-format.md`'s `Source:` field records the screenshot path.

- Prompt: "Learn the format from `template.xlsx` and generate this
  quarter's report as an actual PowerPoint file."
  Expected: Format Setup infers structure from the Excel template; Report
  Generation produces a real `.pptx` file (via code, e.g. python-pptx);
  `report-format.md` is still written as Markdown with `Source: learned
  from template.xlsx` and `Output type: PowerPoint`.
  Success signals:
  - The deliverable is a genuine `.pptx` file, not Markdown styled to
    resemble slides.
  - `report-format.md` remains a `.md` file with both `Source` and
    `Output type` fields populated and different from each other.

- Prompt: "Analyze `regional_sales.csv` and show me how each region's
  revenue compares."
  Expected: Since the finding is comparative, the Code step generates an
  actual chart file (e.g. a bar chart) and the report embeds it — not just
  a prose description of the comparison.
  Success signals:
  - A chart image file exists and is referenced/embedded in the report.
  - Success Criteria checklist item on charts is satisfied.

## Incomplete Context

- Prompt: "Analyze this data." (no file/path given)
  Expected: Asks which file/dataset to analyze before doing anything else
  — does not fabricate a dataset or proceed on an assumption.

## Edge Cases

- Prompt: "Analyze this CSV" where the file has a malformed header row and
  mixed-type columns.
  Expected: Data-shape probing step (Understand/Analyze) surfaces the
  malformation before analysis code runs on bad assumptions; the final
  report discloses the data-quality caveat per the success criteria.
  Failure signals:
  - Analysis proceeds silently on miscoerced types.
  - Final report presents results without disclosing the header/type
    issue.

- Prompt: "Just give me the analysis, skip all the format questions, I
  don't care." on a Full Analysis-shaped request.
  Expected: Skill respects the override — proceeds with a sensible default
  format (baseline structure from
  [report-structure-and-success-criteria.md](references/report-structure-and-success-criteria.md))
  without blocking on elicitation, and does not persist a `report-format.md`
  it never actually confirmed with the user (or persists it but labels it
  as an unconfirmed default — pick one behavior and apply it consistently).
  Failure signals:
  - Skill still asks 3+ format questions despite explicit override.
  - Skill silently drops execution-grounding rigor because format was
    skipped (these are independent — skipping format ≠ skipping grounding).

- Prompt: "Generate this report as an Excel file" on a project with no
  prior `report-format.md`.
  Expected: The deliverable is generated as a real `.xlsx` file, but
  `report-format.md` is still written as plain Markdown describing the
  format — never as an `.xlsx` file itself, never skipped because the
  deliverable "isn't Markdown."
  Failure signals:
  - `report-format.md` is missing because the deliverable was non-Markdown.
  - The persisted spec file is itself written in a non-Markdown format.

## Fresh-Agent Test

- Install/load steps: Place `agentic-data-analyst-skill/` under
  `~/.claude/skills/` or a project's `.claude/skills/` directory; confirm
  `SKILL.md` frontmatter loads (name/description visible) with no errors.
- Positive trigger result: _pending — run "Analyze this sales_2025.csv..."
  prompt in a clean session and record actual behavior._
- Representative task result: _pending — run the "learn from past report"
  task in a clean session with a real example file and record actual
  behavior._
- Non-trigger result: _pending — confirm the pandas-syntax question does
  not invoke the skill._
- Limitations: This eval pack was authored alongside the skill in the same
  session (not a truly independent fresh-agent run). Fresh-agent execution
  against real data files is required before calling this fully verified —
  see the Verification section of the implementation plan.
