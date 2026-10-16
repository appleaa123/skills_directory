# offer-monetization eval spec

This skill is conversational — it reads a cash-flow situation and sequences offers
(attraction → upsell → downsell → continuity) so each customer funds the next. No deterministic
`run` command, so `--rollout` reports "rollout unavailable" and exits 0 (not a failure). Golden
cases are graded by producing an answer and scoring it manually / with the pinned judge.

## What is checked

**Command criteria** (deterministic, via `scripts/check_skill.py`): valid frontmatter naming no
source; a clean description; required SKILL.md sections; every play referenced and present, no
orphans; every play on the `When to use it / The method / Steps / … / Related plays` template;
populated supporting files; all play links resolve; and the three copyright regression gates
stay clean.

**`llm-judge` criteria** (quality of a produced answer): whether the answer applies the skill's
actual mechanics — the ~30-day payback target, customer-funded acquisition, the four offer
roles, the staged build order, and specific named offer structures — rather than generic "focus
on retention / raise prices / watch LTV:CAC" advice; and whether it gives a concrete, ordered
sequence the operator could start building this week.

## Golden cases

- **case-cash-crunch** — SaaS where only a fraction of lifetime value lands in 30 days; expects
  a paid onboarding / prepay move that flips 30-day cash positive.
- **case-one-product** — one course, flat revenue, nothing after or below it; expects an upsell
  first, then a downsell, then continuity, in that order.
- **case-cant-afford** — losing half of "too expensive" prospects; expects payment-terms and
  reduced-scope downsells, not a price cut.
- **case-add-recurring** — one-off project shop wanting predictable revenue; expects a specific
  continuity structure and how to pitch it.
- **case-assemble** *(holdout, `split: test`)* — build the whole sequence from zero; expects the
  full model and the stage-by-stage build order.

## Using this spec

- `python3 scripts/run_evals.py --validate` — check the spec is well-formed.
- `python3 scripts/run_evals.py` — run the command criteria.
- To exercise a golden case: run the skill on `evals/golden/<case>/input.md`, save the answer,
  then `python3 scripts/run_evals.py --output <answer> --case <case>` and grade the two
  `llm-judge` criteria. Promote a good answer to `evals/golden/<case>/expected.md` to arm a
  baseline.

```json
{
  "skill": "offer-monetization",
  "criteria": [
    {"id": "frontmatter-valid", "text": "SKILL.md frontmatter defines only name + description and name matches the directory", "type": "command", "cmd": "python3 scripts/check_skill.py frontmatter"},
    {"id": "description-clean", "text": "The description is a clean capability + trigger statement with no source identifiers, coined labels, or 'knowledge base' framing", "type": "command", "cmd": "python3 scripts/check_skill.py description-clean"},
    {"id": "skill-sections", "text": "SKILL.md contains all required sections (When to use / core model / problem index / topic index / supporting files / scope)", "type": "command", "cmd": "python3 scripts/check_skill.py skill-sections"},
    {"id": "plays-present", "text": "Every play referenced from SKILL.md exists and every play on disk is referenced (no orphans)", "type": "command", "cmd": "python3 scripts/check_skill.py plays-present"},
    {"id": "play-template", "text": "Every play follows the section template (When to use it / The method / Steps / Related plays)", "type": "command", "cmd": "python3 scripts/check_skill.py play-template"},
    {"id": "supporting-files", "text": "glossary.md, patterns.md, cheatsheet.md are present, populated, and above the stub floor", "type": "command", "cmd": "python3 scripts/check_skill.py supporting-files"},
    {"id": "links-resolve", "text": "All play links resolve — explicit paths, cross-skill references, and bare backticked slugs", "type": "command", "cmd": "python3 scripts/check_skill.py links-resolve"},
    {"id": "no-source-identifiers", "text": "No source identifiers (author, brands, book titles) anywhere in the skill", "type": "command", "cmd": "python3 scripts/check_skill.py no-source-identifiers"},
    {"id": "no-coined-labels", "text": "No distinctive coined labels anywhere in the skill", "type": "command", "cmd": "python3 scripts/check_skill.py no-coined-labels"},
    {"id": "no-book-structure", "text": "No book-structure markers (Chapter N, Volume, 'the author', etc.) anywhere in the skill", "type": "command", "cmd": "python3 scripts/check_skill.py no-book-structure"},
    {"id": "routes-and-mechanic", "text": "For the golden case, the answer applies the 30-day payback target, customer-funded acquisition, the four offer roles, the staged build order, and specific named offer structures — not generic 'retention / raise prices / watch LTV:CAC' advice", "type": "llm-judge"},
    {"id": "concrete-and-sequenced", "text": "The answer gives a concrete, ordered offer sequence the operator could start building this week, not a list of considerations", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-cash-crunch", "input": "golden/case-cash-crunch/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-one-product", "input": "golden/case-one-product/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-cant-afford", "input": "golden/case-cant-afford/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-add-recurring", "input": "golden/case-add-recurring/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-assemble", "input": "golden/case-assemble/input.md", "expected": null, "split": "test", "expected_status": "pending-first-green"}
  ],
  "judge": {
    "model": "claude-haiku-4-5-20251001",
    "temperature": 0,
    "canary": "canary/bad_output.json"
  }
}
```
