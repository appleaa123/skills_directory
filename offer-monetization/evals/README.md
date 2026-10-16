# Evaluating `offer-monetization`

This skill ships its own loss function in `offer-monetization.eval.md`: deterministic structural
checks plus quality checks and seeded business scenarios. The runner is
`../scripts/run_evals.py` (shared, unmodified across the repo's skills).

## Commands (run from the skill root, i.e. one level up)

```bash
cd offer-monetization

# 1. Is the eval spec well-formed?
python3 scripts/run_evals.py --validate

# 2. Run the deterministic checks (structure, template, links, copyright gates).
#    Exits non-zero if any fail.
python3 scripts/run_evals.py

# 3. Run one structural check on its own:
python3 scripts/check_skill.py no-coined-labels        # or: all

# 4. Exercise a golden scenario (quality check):
#    - open evals/golden/<case>/input.md
#    - answer it once WITH this skill loaded and once WITHOUT (baseline)
#    - judge both against the two llm-judge criteria in the spec
#      (routes-and-mechanic, concrete-and-sequenced)
#    - when an answer is good, save it as evals/golden/<case>/expected.md
#      to arm a regression baseline for that case
python3 scripts/run_evals.py --output <your-answer-file> --case <case-id>
```

## What each layer tells you

| Layer | Question it answers | How |
|---|---|---|
| `--validate` | Is the spec itself correct? | shape check |
| command criteria | Did the skill's structure / hygiene regress? | `check_skill.py` |
| copyright gates | Did any source identifier, coined label, or book-structure marker creep back in? | `no-*` checks |
| `llm-judge` criteria | Does the skill actually produce better business guidance than no skill? | graded manually or by the pinned judge, per golden case |
| golden `expected.md` | Has a known-good answer drifted? | promote once, then diff |

## Notes

- This skill is conversational, so the spec has no `run` command; `--rollout`
  prints "rollout unavailable" and exits 0 — that is expected, not a failure.
- All golden cases start `pending-first-green` (no baseline). Promote answers you
  are happy with to turn them into regression baselines.
- `evals/canary/bad_output.json` is a deliberately generic answer the quality
  criteria must reject — a sanity check on the judge.
