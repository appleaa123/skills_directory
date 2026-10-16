# Eval spec — maintenance-triage-skill

The severity assessment and priority assignment are agent reasoning
(`llm-judge` criteria). The SLA deadline/breach math is fully deterministic
and is checked with `command` criteria run directly against `scripts/sla.py`
-- no agent involved for those.

## Criteria

1. **sla-self-test-passes** (`command`) — `scripts/sla.py`'s built-in unit
   tests (deadline math for all 4 priorities, boundary breach conditions,
   terminal-status and None-deadline guards) all pass.
2. **urgent-deadline-is-2h** (`command`) — the CLI reports a 2-hour deadline
   for URGENT priority.
3. **low-priority-not-breached-at-1h** (`command`) — a LOW-priority order
   created 1 hour ago (72h SLA) is correctly reported as not breached.
4. **severity-output-has-7-fields** (`llm-judge`) — the severity assessment
   includes all 7 required fields (`damageType`, `severity`, `confidence`,
   `observations`, `recommendedPriority`, `specialistRequired`,
   `estimatedCategory`).
5. **active-danger-forces-urgent** (`llm-judge`) — a description containing
   an active gas/water/electrical hazard is assigned `recommendedPriority:
   URGENT` regardless of the underlying `severity` field.
6. **unclear-defaults-to-medium** (`llm-judge`) — a vague, no-photo
   description with no clear severity signal defaults to `MEDIUM` priority
   rather than guessing LOW or HIGH.

## Golden cases

- `case-1` (`split: val`) — active gas leak near stove → URGENT.
- `case-2` (`split: val`) — small paint chip in hallway → LOW.
- `case-3` (`split: val`) — vague "something's off with the AC", no photo → MEDIUM (default).
- `case-4` (`split: test`, holdout) — large dry water stain on ceiling, no active leak → HIGH.

```json
{
  "skill": "maintenance-triage-skill",
  "criteria": [
    {"id": "sla-self-test-passes", "text": "sla.py's built-in unit tests all pass", "type": "command", "cmd": "python3 scripts/sla.py --self-test"},
    {"id": "urgent-deadline-is-2h", "text": "URGENT priority yields a 2-hour SLA deadline", "type": "command", "cmd": "python3 -c \"import json,subprocess; out=json.loads(subprocess.run(['python3','scripts/sla.py','--priority','URGENT','--created-at','2026-08-10T09:00:00+00:00','--now','2026-08-10T09:30:00+00:00'],capture_output=True,text=True).stdout); assert out['sla_hours']==2 and out['deadline']=='2026-08-10T11:00:00+00:00'\""},
    {"id": "low-priority-not-breached-at-1h", "text": "LOW priority order 1h old is not breached", "type": "command", "cmd": "python3 -c \"import json,subprocess; out=json.loads(subprocess.run(['python3','scripts/sla.py','--priority','LOW','--created-at','2026-08-10T09:00:00+00:00','--now','2026-08-10T10:00:00+00:00','--status','open'],capture_output=True,text=True).stdout); assert out['breached'] is False\""},
    {"id": "severity-output-has-7-fields", "text": "Severity assessment includes all 7 required fields", "type": "llm-judge"},
    {"id": "active-danger-forces-urgent", "text": "Active gas/water/electrical hazard forces recommendedPriority to URGENT", "type": "llm-judge"},
    {"id": "unclear-defaults-to-medium", "text": "A vague no-photo description defaults to MEDIUM priority, not a guess", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-1", "input": "golden/case-1/input.md", "expected": "golden/case-1/expected.json", "split": "val"},
    {"id": "case-2", "input": "golden/case-2/input.md", "expected": "golden/case-2/expected.json", "split": "val"},
    {"id": "case-3", "input": "golden/case-3/input.md", "expected": "golden/case-3/expected.json", "split": "val"},
    {"id": "case-4", "input": "golden/case-4/input.md", "expected": "golden/case-4/expected.json", "split": "test"}
  ],
  "judge": {
    "model": "claude-sonnet-5",
    "temperature": 0,
    "canary": "golden/canary/expected.json"
  }
}
```
