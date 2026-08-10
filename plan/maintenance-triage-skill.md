# Implementation Plan: maintenance-triage-skill

Source: AI-reasoning layer extracted from https://github.com/hislordshipprof/opsly (NOT the full SaaS app — no DB/API/UI/auth/voice is ported).

## Purpose
Given a tenant-reported maintenance issue (description + optional photo), assess severity, assign priority, compute the SLA deadline, and check breach status — using the host agent's own reasoning/vision, plus a small dependency-free script for the deterministic date math.

## Core workflow
1. **Damage/severity assessment** (ported from vision.service.ts's 7-field schema and prompt intent — "reasoning in the prompt, schema handles output format"): given description/photo, output:
   - `damageType` (e.g., water_leak, electrical_fault, mold, structural, cosmetic)
   - `severity` (LOW/MEDIUM/HIGH)
   - `confidence` (0.0-1.0)
   - `observations` (3-5 specific details)
   - `recommendedPriority` (LOW/MEDIUM/HIGH/URGENT)
   - `specialistRequired` (boolean)
   - `estimatedCategory` (plumbing/electrical/hvac/other)
2. **Priority decision tree** (ported verbatim from triage.prompt.ts):
   - URGENT: active water/gas/electrical danger, safety risk
   - HIGH: significant damage, no immediate danger
   - MEDIUM: moderate issue, no photo, or unclear severity (default when unclear)
   - LOW: cosmetic/minor convenience issue
3. **SLA computation** (ported verbatim from sla.ts): `scripts/sla.py` with
   - `SLA_HOURS = {"URGENT": 2, "HIGH": 4, "MEDIUM": 24, "LOW": 72}`
   - `compute_sla_deadline(created_at: datetime, priority: str) -> datetime`
   - `is_sla_breached(deadline: datetime | None, status: str) -> bool` — false if deadline is None or status is terminal (resolved/closed), true if now > deadline and status is still active.
4. **Optional escalation summary** (ported from escalation.prompt.ts): given a list of overdue work orders (order #, priority, property, created_at), format a report of order number, priority, hours overdue, property name.
5. **Optional KPI/analytics report** (ported from analytics.prompt.ts): given raw metrics supplied inline by the user (no DB), produce a benchmark-style summary (e.g., "first-time fix rate is X%, target 85%"), highlighting risk indicators (elevated overdue volume, depressed resolution rate).

## SKILL.md structure
- Frontmatter: name `maintenance-triage-skill`, description covering triggers ("triage maintenance request", "assess property damage severity", "compute SLA deadline", "work order priority", "escalation report", "maintenance KPI summary")
- Trigger section with example invocations
- Priority decision tree as an explicit table (matches triage.prompt.ts)
- Instructs agent to call `scripts/sla.py` for the deadline/breach math rather than reasoning about dates itself
- References the 7-field vision schema and escalation/KPI templates

## Eval criteria
- Binary check (`command`): `python3 scripts/sla.py --self-test` exits 0 (unit tests for compute_sla_deadline/is_sla_breached across all 4 priorities incl. boundary cases)
- Binary check: severity assessment output includes all 7 required fields
- Binary check: recommendedPriority matches the decision-tree rule for a description containing "active gas leak" → URGENT
- Golden cases: 4+ (gas leak → URGENT, cracked tile → LOW, no-photo vague leak → MEDIUM default, large water damage no danger → HIGH), plus one SLA-breach-check case
- 1 holdout/test-split case

## Overlap note vs real-estate-tenancy-assistant-skill
Keep separate: this skill is SLA/ops-focused (priority → deadline → breach, for a maintenance team's workflow); PropertyLoop's property-issue path is advisory (troubleshooting + referral for a tenant/landlord, no SLA concept). Descriptions worded to avoid double-triggering — this skill's keywords lean on "SLA", "work order", "priority", "escalation", "overdue".

## Architecture
Simple skill. Directory: `maintenance-triage-skill/` with SKILL.md, AGENTS.md, scripts/sla.py (with built-in self-test), references/ (severity schema, priority decision tree, escalation/KPI prompt templates), assets/ (sample reports), evals/, install.sh, README.md, .claude-plugin/.
