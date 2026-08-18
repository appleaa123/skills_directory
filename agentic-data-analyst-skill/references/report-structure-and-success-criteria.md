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
