# maintenance-triage-skill

Assesses a tenant-reported maintenance issue's severity from a description
and/or photo, assigns a priority (URGENT/HIGH/MEDIUM/LOW), computes the SLA
response deadline, and checks breach status — no LLM API key, no database.
Extracts only the AI-reasoning layer of
[hislordshipprof/opsly](https://github.com/hislordshipprof/opsly), a full
production SaaS app; the database, REST API, auth, and UI are intentionally
not ported.

## Install

### Claude Code
```bash
cp -R ./maintenance-triage-skill ~/.claude/skills/maintenance-triage-skill
```

### GitHub Copilot CLI
```bash
cp -R ./maintenance-triage-skill ~/.copilot/skills/maintenance-triage-skill
```

### VS Code Copilot (project-level)
```bash
cp -R ./maintenance-triage-skill .github/skills/maintenance-triage-skill
```

### Cursor (project-level only)
```bash
cp -R ./maintenance-triage-skill .cursor/skills/maintenance-triage-skill
```

### Any other supported tool
Run `./install.sh` (auto-detects your platform) or `./install.sh --all` to
install everywhere detected.

## Usage

```
/maintenance-triage-skill Tenant reports: "I smell gas near the stove, it's been going on for an hour." [+ photo]

/maintenance-triage-skill Is work order #4521 (priority HIGH, created 2026-08-10T09:00:00+00:00, still open) past its SLA?
```

See `SKILL.md` for the full workflow and `references/` for the severity
schema, priority decision tree, and escalation/KPI templates.

## SLA math (deterministic, no LLM)

```bash
python3 scripts/sla.py --priority URGENT --created-at 2026-08-10T09:00:00+00:00 --now 2026-08-10T12:00:00+00:00 --status open
python3 scripts/sla.py --self-test   # run the built-in unit tests
```

## Evals

```bash
python3 scripts/run_evals.py --validate
python3 scripts/run_evals.py            # runs the sla.py command criteria
python3 scripts/run_evals.py --judge    # grades the llm-judge criteria
```

## What was ported vs. what changed from opsly

- **Ported as-is**: the SLA windows (URGENT=2h, HIGH=4h, MEDIUM=24h,
  LOW=72h) and the deadline/breach-check arithmetic
  (`scripts/sla.py`, from `sla.ts`), the priority decision tree
  (`triage.prompt.ts`), the 7-field damage assessment schema
  (`vision.service.ts`).
- **Reimplemented as reasoning templates**: the escalation summary format
  (`escalation.prompt.ts`) and KPI report format (`analytics.prompt.ts`),
  now filled in from data the user supplies inline instead of a database
  query.
- **Replaced**: opsly's Gemini Vision API call for damage assessment → the
  invoking agent's own vision/reasoning capability.
- **Not ported (deliberately out of scope)**: the NestJS backend, Prisma/
  Postgres database, REST API, React frontend, WebSocket real-time
  propagation, Gemini Live voice interface, and auth system. Those make
  opsly a full product, not a portable skill — this skill only carries the
  triage/escalation reasoning layer, per the explicit scoping decision made
  before this skill was built.
