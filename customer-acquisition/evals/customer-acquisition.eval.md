# customer-acquisition eval spec

This skill is conversational — it reads a lead-flow situation and routes to the four outreach
channels, lead magnets, channel scaling, force multipliers, and a daily plan. No deterministic
`run` command, so `--rollout` reports "rollout unavailable" and exits 0 (not a failure). Golden
cases are graded by producing an answer and scoring it manually / with the pinned judge.

## What is checked

**Command criteria** (deterministic, via `scripts/check_skill.py`): valid frontmatter naming no
source; a clean description; required SKILL.md sections; every play referenced and present, no
orphans; every play on the `When to use it / The method / Steps / … / Related plays` template;
populated supporting files; all play links resolve; and the three copyright regression gates
stay clean.

**`llm-judge` criteria** (quality of a produced answer): whether the answer applies the skill's
actual mechanics — engaged prospects vs. raw contacts, the warm/cold × one-to-one/one-to-many
channel model, the volume-then-optimize-then-new-surface scaling order, force multipliers, and a
concrete daily action commitment — rather than generic "build your presence / network / be
consistent" advice; and whether it gives a routine the operator could start tomorrow with a way
to tell if it's working.

## Golden cases

- **case-no-leads** — new solo service, zero pipeline, needs leads in weeks; expects warm
  outreach first with a specific daily action count.
- **case-plateau** — one channel stalled, no funnel tracking, assumes market is tapped; expects
  volume → fix the drop-off → new surface, and the market-size illusion.
- **case-cold-traffic** — expensive offer, ads bounce to a booking page; expects a lead magnet
  between the ad and the call.
- **case-scaling** — founder maxed on prospecting, has hiring budget; expects force multipliers
  (referrals first, then hiring / agencies / partners).
- **case-daily-routine** *(holdout, `split: test`)* — no prospecting discipline; expects a
  concrete daily plan and a leading metric.

## Using this spec

- `python3 scripts/run_evals.py --validate` — check the spec is well-formed.
- `python3 scripts/run_evals.py` — run the command criteria.
- To exercise a golden case: run the skill on `evals/golden/<case>/input.md`, save the answer,
  then `python3 scripts/run_evals.py --output <answer> --case <case>` and grade the two
  `llm-judge` criteria. Promote a good answer to `evals/golden/<case>/expected.md` to arm a
  baseline.

```json
{
  "skill": "customer-acquisition",
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
    {"id": "routes-and-mechanic", "text": "For the golden case, the answer applies engaged-prospects-not-contacts, the warm/cold x 1:1/1:many channel model, volume then optimize then new-surface, force multipliers, and a daily action commitment — not generic 'build your presence / network / be consistent' advice", "type": "llm-judge"},
    {"id": "concrete-and-sequenced", "text": "The answer gives a routine the operator could start tomorrow, with a leading metric to tell whether it's working", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-no-leads", "input": "golden/case-no-leads/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-plateau", "input": "golden/case-plateau/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-cold-traffic", "input": "golden/case-cold-traffic/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-scaling", "input": "golden/case-scaling/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-daily-routine", "input": "golden/case-daily-routine/input.md", "expected": null, "split": "test", "expected_status": "pending-first-green"}
  ],
  "judge": {
    "model": "claude-haiku-4-5-20251001",
    "temperature": 0,
    "canary": "canary/bad_output.json"
  }
}
```
