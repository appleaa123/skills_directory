# offer-design eval spec

This skill is conversational — it reads a business situation and walks the operator through
market check → differentiation → pricing → value levers → guarantee → naming. There is no
deterministic `run` command, so `--rollout` reports "rollout unavailable" and exits 0 (not a
failure). Golden cases are graded by producing an answer and scoring it manually / with the
pinned judge.

## What is checked

**Command criteria** (deterministic, run every time via `scripts/check_skill.py`):
frontmatter is valid and names no source; the description is a clean capability + trigger
statement; SKILL.md has its required sections; every play is referenced and present with no
orphans; every play follows the `When to use it / The method / Steps / … / Related plays`
template; the supporting files are populated (not stubs); all internal and cross-skill play
links resolve; and the three copyright regression gates stay clean — zero source identifiers,
zero coined labels, zero book-structure markers anywhere in the skill. These lock in the
properties the skill was built to have.

**`llm-judge` criteria** (quality of a produced answer to a golden case): whether the answer
routes to the right plays for the situation and applies the skill's actual mechanics (the
perceived-value ratio, the market > offer > persuasion ordering, add-value-don't-discount), not
a generic version — and whether it gives concrete, ordered, do-this-week actions rather than a
list of considerations.

## Golden cases

- **case-commodity** — a firm undercut by identical-looking competitors; expects
  break-comparability + premium-pricing, not "sharpen your messaging".
- **case-repricing** — fully-booked coach afraid to raise prices; expects an outcome-anchored
  number and an add-value-on-increase move.
- **case-low-conversion** — traffic fine, conversion poor; expects a perceived-value diagnosis
  and risk reversal.
- **case-new-offer** — building a productized offer from scratch; expects the 5-step build from
  the buyer's obstacle list.
- **case-stalled-deals** *(holdout, `split: test`)* — deals that never decide; expects
  scarcity/urgency + a guarantee.

## Using this spec

- `python3 scripts/run_evals.py --validate` — check the spec is well-formed.
- `python3 scripts/run_evals.py` — run the command criteria (structure + copyright gates).
- To exercise a golden case: run the skill on `evals/golden/<case>/input.md`, save the answer,
  then `python3 scripts/run_evals.py --output <answer> --case <case>` (and grade the two
  `llm-judge` criteria against it). Promote a good answer to `evals/golden/<case>/expected.md`
  once you're happy with it, to arm a regression baseline.

```json
{
  "skill": "offer-design",
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
    {"id": "routes-and-mechanic", "text": "For the golden case, the answer routes to the right plays and applies the skill's actual mechanics (perceived-value ratio; market > offer > persuasion; add value rather than discount), not a generic version", "type": "llm-judge"},
    {"id": "concrete-and-sequenced", "text": "The answer gives specific, ordered actions the operator could take this week — a real plan — not a list of considerations or platitudes", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-commodity", "input": "golden/case-commodity/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-repricing", "input": "golden/case-repricing/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-low-conversion", "input": "golden/case-low-conversion/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-new-offer", "input": "golden/case-new-offer/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-stalled-deals", "input": "golden/case-stalled-deals/input.md", "expected": null, "split": "test", "expected_status": "pending-first-green"}
  ],
  "judge": {
    "model": "claude-haiku-4-5-20251001",
    "temperature": 0,
    "canary": "canary/bad_output.json"
  }
}
```
