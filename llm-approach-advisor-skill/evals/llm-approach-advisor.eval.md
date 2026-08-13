# Eval spec: llm-approach-advisor-skill

This is the skill's loss function: what "the recommendation worked" means,
checked automatically. The `run` command exercises the deterministic scorer
(`scripts/approach_matrix.py`) that underpins every recommendation report —
it's the part of the skill that can be graded by command; the narrative report
quality is graded by the pinned judge reading the same JSON's reasons.

## Criteria

1. **valid-json** (`command`) — the produced output is valid JSON.
2. **six-approaches-ranked** (`command`) — all six approach families are
   present in `ranked_approaches`.
3. **top-pick-has-reasons** (`command`) — the top-ranked approach has at least
   one stated reason (never an unjustified pick).
4. **safety-note-present** (`command`) — a non-empty `safety_note` is always
   included, since safety is a mandatory cross-cutting check per
   `references/safety-and-alignment.md`.
5. **recommendation-soundness** (`llm-judge`) — the top-ranked approach and its
   stated reasons form a sound, well-justified recommendation consistent with
   `references/decision-framework.md`'s tradeoffs (not just present, but
   *correct given the input constraints*).

## Golden cases

- **case-1** — new skill, 300 labeled examples, static knowledge, single GPU →
  expects fine-tuning to win over prompting/RAG (has a promoted baseline).
- **case-2** — a deployed model states a wrong fact that must be fixed this
  week, no labeled data, rare/few-fact update → expects RAG or knowledge
  editing to win over retraining (pending first green; holdout).
- **case-3** — a support bot over product docs updated weekly, API-only budget
  → expects RAG to win (has a promoted baseline).
- **case-4** — a public chatbot produces unsafe outputs under adversarial
  prompts → expects the safety flag to fire and the report to name a hardening
  path, not a silent prompting-only answer (pending first green; holdout).

## Spec

```json
{
  "skill": "llm-approach-advisor-skill",
  "run": "python3 scripts/approach_matrix.py --input {input} --json > {output}",
  "criteria": [
    {"id": "valid-json", "text": "Output is valid JSON", "type": "command", "cmd": "python3 -c \"import json,sys; json.load(open(sys.argv[1]))\" {output}"},
    {"id": "six-approaches-ranked", "text": "All six approach families are ranked", "type": "command", "cmd": "python3 -c \"import json,sys; d=json.load(open(sys.argv[1])); assert len(d['ranked_approaches'])==6\" {output}"},
    {"id": "top-pick-has-reasons", "text": "Top-ranked approach has at least one stated reason", "type": "command", "cmd": "python3 -c \"import json,sys; d=json.load(open(sys.argv[1])); assert len(d['ranked_approaches'][0]['reasons'])>0\" {output}"},
    {"id": "safety-note-present", "text": "A non-empty safety_note is always included", "type": "command", "cmd": "python3 -c \"import json,sys; d=json.load(open(sys.argv[1])); assert len(d['safety_note'])>0\" {output}"},
    {"id": "recommendation-soundness", "text": "The top pick and its reasons form a sound, correctly-justified recommendation given the input constraints", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-1", "input": "golden/case-1/input.json", "expected": "golden/case-1/expected.json", "split": "val"},
    {"id": "case-2", "input": "golden/case-2/input.json", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-3", "input": "golden/case-3/input.json", "expected": "golden/case-3/expected.json", "split": "val"},
    {"id": "case-4", "input": "golden/case-4/input.json", "expected": null, "split": "test", "expected_status": "pending-first-green"}
  ],
  "judge": {
    "model": "claude-haiku-4-5-20251001",
    "temperature": 0,
    "canary": "canary/bad_output.json"
  }
}
```
