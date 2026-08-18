# Report Structure and Success Criteria

The exact format is user-specified or learned (see
[format-setup-and-persistence.md](format-setup-and-persistence.md)), but
regardless of the specific format chosen, a report produced by this skill
must satisfy the following.

## Baseline Structure (default when nothing more specific is requested)

If the user has no preference and no example, default to:

1. **Context** — the question asked, the data sources involved, and any
   constraints or assumptions stated up front.
2. **Methodology** — what analytical steps were taken and why, in the
   order they happened (mirrors the Understand/Analyze steps from the
   action loop).
3. **Analysis** — the findings, each one tied to the executed step that
   produced it.
4. **Conclusions** — evidence-based answer to the original question,
   including any caveats or limitations the analysis surfaced.

This structure applies regardless of the deliverable's output file type —
a `.pptx` report still needs these as its slide sections, an `.xlsx`
report needs them as labeled sheets/blocks, an HTML report needs them as
page sections.

## Charts

When a finding is comparative, trend/time-series, or distributional,
generate an actual supporting chart as part of the Code step — don't just
describe in prose what a chart would show. Save the chart as a file and
embed/reference it in the report using whatever mechanism the deliverable's
output type supports:

- Markdown → save the image file, embed with `![caption](path/to/chart.png)`
- HTML → embed the image inline (or as an inline SVG)
- PowerPoint (`.pptx`) → insert the chart image on the relevant slide
- Excel (`.xlsx`) → insert as a native chart object or embedded image next
  to the relevant data

The chart is Observe-stage evidence like any Code output — it must be
generated from the actual data, not mocked up or approximated.

## Success Criteria

A finished report is correct when:

- [ ] Every claim traces to a specific executed Code step — no
  unsupported assertions.
- [ ] The original question (from the Understand step) is explicitly
  answered, not just discussed around.
- [ ] Contradictory or surprising Observe results are addressed, not
  quietly dropped.
- [ ] The report matches the confirmed/learned output format (structure,
  tone, length, output type) from Format Setup.
- [ ] Data-shape caveats (missing values, type coercions, sampling) are
  disclosed if they affect the conclusions.
- [ ] The report is reproducible in principle — another analyst could
  follow the methodology section and get the same result.
- [ ] Comparative/trend findings that would be clearer as a chart include
  an actual generated chart, not just a prose description of what a chart
  would show.
- [ ] If a format template was used, every number/stat/conclusion in the
  final report was independently recomputed from the current dataset —
  none were carried over from the template's own content (see
  [format-setup-and-persistence.md](format-setup-and-persistence.md)).

## Gotchas

- **Don't produce a final report structured as a chat answer.** Even a
  short report needs explicit sections so the reasoning is independently
  checkable — a wall of prose hides which parts are grounded and which
  aren't.
- **Don't bury the answer.** If the user asked a specific question, the
  Conclusions section should state the answer plainly before any nuance
  or caveats — don't make the reader hunt for it.
- **Don't present a partial analysis as complete.** If time, data
  quality, or scope constraints limited the analysis, say so explicitly
  in Conclusions rather than presenting a narrower result as the full
  answer.
- **Don't describe a chart in words instead of generating one.** "As
  shown in the trend, revenue increased..." without an actual generated
  chart is the visual-evidence equivalent of narrating an ungrounded
  conclusion — if a finding is comparative/trend/distributional, render
  it.
