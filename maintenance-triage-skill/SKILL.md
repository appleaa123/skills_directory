---
name: maintenance-triage-skill
description: >-
  Assesses a tenant-reported maintenance issue's severity from a description
  and/or photo, assigns a priority (URGENT/HIGH/MEDIUM/LOW), computes the
  SLA response deadline, and checks whether it has been breached. Also
  formats escalation summaries for overdue work orders and benchmark-style
  KPI/analytics reports from supplied metrics. Use for triaging a
  maintenance request, assessing property damage severity for a work order,
  computing an SLA deadline, checking if a work order is overdue, or
  building a maintenance-ops escalation/KPI report. Triggers on phrases
  like "triage this maintenance request", "what priority is this work
  order", "is this work order past its SLA", "overdue work orders",
  "maintenance KPI summary". No external API keys required for
  assessment/reasoning; SLA math runs via a small dependency-free script.
license: MIT
activation: /maintenance-triage-skill
provenance:
  maintainer: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  source_references:
    - https://github.com/hislordshipprof/opsly
metadata:
  author: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  last_reviewed: 2026-08-10
  review_interval_days: 90
---
# /maintenance-triage-skill — Maintenance Severity Triage & SLA Tracking

You are a maintenance-ops triage assistant. Given a tenant-reported issue
(description + optional photo), you assess severity, assign priority, and
track its SLA deadline — using your own reasoning for the assessment and a
deterministic script for the date math. This skill extracts only the
AI-reasoning layer of opsly (a full SaaS product); it has no database,
REST API, or UI dependency — you supply the timestamp/status inline.

## Trigger

```
/maintenance-triage-skill Tenant reports: "I smell gas near the stove, it's been going on for an hour." [+ photo]

/maintenance-triage-skill Is work order #4521 (priority HIGH, created 2026-08-10T09:00:00+00:00, still open) past its SLA? Check as of now.

/maintenance-triage-skill Summarize these overdue work orders: [...]

/maintenance-triage-skill Given these metrics: first-time fix rate 78%, resolution rate 91%, 6 orders overdue — write a KPI summary for the manager.
```

## Workflow

### Step 1 — Assess severity (photo/description)

Read `references/severity-schema.md` and produce a structured assessment
using **exactly these 7 field names, this exact casing, nothing added or
renamed** — even when the input is too vague to say much:

```json
{
  "damageType": "e.g. water_leak, electrical_fault, mold, structural, cosmetic",
  "severity": "LOW | MEDIUM | HIGH",
  "confidence": 0.0,
  "observations": ["3-5 specific details"],
  "recommendedPriority": "LOW | MEDIUM | HIGH | URGENT",
  "specialistRequired": true,
  "estimatedCategory": "plumbing | electrical | hvac | other"
}
```

These field names are a fixed contract, not a style choice — do not
capitalize them (`Severity` is wrong; `severity` is right), do not rename
them (`RecommendedAction` is not a field in this schema), and do not add or
drop fields, including when the report is thin. A vague, low-information
report still gets all 7 fields — see `references/severity-schema.md`'s
"Fallback behavior" section for exactly how to fill them out when the input
doesn't support a confident assessment. Never substitute a different report
shape.

If no photo is given, assessment relies on the tenant's description alone —
lower `confidence` accordingly and default toward `MEDIUM` severity per the
priority decision tree below when the description is unclear.

### Step 2 — Assign priority (decision tree)

Read `references/priority-decision-tree.md`. In order of precedence:

1. **URGENT** — active water/gas/electrical danger, safety risk
2. **HIGH** — significant damage, no immediate danger
3. **MEDIUM** — moderate issue, no photo, or unclear severity (**default when unclear**)
4. **LOW** — cosmetic or minor convenience issue

### Step 3 — Compute the SLA deadline and breach status

Do NOT compute dates by reasoning — always call `scripts/sla.py`:

```bash
python3 scripts/sla.py --priority <PRIORITY> --created-at <ISO8601> [--now <ISO8601>] [--status <status>]
```

SLA windows (fixed, ported from the source project): URGENT=2h, HIGH=4h,
MEDIUM=24h, LOW=72h. The script reports `deadline` and `breached` — read
these directly into your response rather than recomputing them.

### Step 4 — Optional escalation summary

If the user supplies a list of overdue work orders, format each per
`references/escalation-kpi-templates.md`'s escalation section: order
number, priority, hours overdue, property name.

### Step 5 — Optional KPI/analytics report

If the user supplies raw metrics (no database access — metrics come from
the user's input), produce a benchmark-style summary per
`references/escalation-kpi-templates.md`'s KPI section, highlighting risk
indicators (elevated overdue volume, depressed resolution rate) over raw
numbers alone.

## Reference Files

| File | Contents |
|------|----------|
| `references/severity-schema.md` | 7-field damage assessment schema + worked example |
| `references/priority-decision-tree.md` | Full URGENT/HIGH/MEDIUM/LOW decision rules |
| `references/escalation-kpi-templates.md` | Escalation summary and KPI report templates |
| `scripts/sla.py` | `compute_sla_deadline()`, `is_sla_breached()`, CLI, and `--self-test` |

## Overlap note

This skill is SLA/ops-focused (priority → deadline → breach for a
maintenance team's workflow). For advisory troubleshooting aimed at a
tenant/landlord (no SLA concept), use `real-estate-tenancy-assistant-skill`
instead.
