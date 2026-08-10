# AGENTS.md — maintenance-triage-skill

## Purpose

Assesses a tenant-reported maintenance issue's severity from a description
and/or photo, assigns a priority (URGENT/HIGH/MEDIUM/LOW), computes the SLA
response deadline, and checks breach status. Also formats escalation
summaries and KPI/analytics reports from user-supplied metrics. Extracted
from the AI-reasoning layer of [hislordshipprof/opsly](https://github.com/hislordshipprof/opsly)
— NOT a port of the full application, which is a production SaaS (NestJS +
Prisma/Postgres + React + WebSockets + Gemini Live voice + auth). This skill
keeps only the triage/escalation/SLA prompt logic and the deterministic SLA
date math, dropping the database, REST API, and UI entirely.

## Activation

Trigger this skill when the user asks to: triage a maintenance request,
assess property damage severity for a work order, compute an SLA deadline,
check if a work order is overdue/breached its SLA, or build a
maintenance-ops escalation or KPI summary.

## Usage

See `SKILL.md` for the full workflow. Summary: assess severity per
`references/severity-schema.md`, assign priority per
`references/priority-decision-tree.md`, then call `scripts/sla.py` for the
deadline/breach math (never compute dates by reasoning). Optional
escalation and KPI report formats are in
`references/escalation-kpi-templates.md`.

## Key files

- `SKILL.md` — full instructions and the assess → prioritize → SLA-check workflow
- `references/severity-schema.md` — 7-field damage assessment schema + worked example
- `references/priority-decision-tree.md` — URGENT/HIGH/MEDIUM/LOW decision rules + SLA windows
- `references/escalation-kpi-templates.md` — escalation summary and KPI report formats
- `scripts/sla.py` — deterministic SLA deadline/breach math, with `--self-test`

## Overlap note

This skill is SLA/ops-focused. For advisory troubleshooting aimed at a
tenant/landlord with no SLA concept, use `real-estate-tenancy-assistant-skill`.

## Source

Extracted from the AI-reasoning layer of https://github.com/hislordshipprof/opsly
(no declared license on the source repo; no source code copied for the
prompt/reasoning logic — `scripts/sla.py`'s date-math functions are a direct
reimplementation of the algorithm described in `sla.ts`, which is a short,
non-copyrightable arithmetic routine. See `LICENSE`).
