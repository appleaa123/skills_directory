# Escalation & KPI Report Templates

Adapted from opsly's `escalation.prompt.ts` and `analytics.prompt.ts`. Both
operate on data the user supplies inline — this skill has no database
access.

## Escalation summary

For each overdue work order the user supplies (order number, priority,
property name, created_at, current status), report:

- Order number
- Priority level
- Duration past deadline (use `scripts/sla.py` to compute the deadline,
  then state how far past it the order now is)
- Property name

**Worked example**:

Input: order #4521, priority HIGH, property "Maple Court Unit 3B", created
2026-08-10T09:00:00+00:00, status open, checked at 2026-08-10T15:30:00+00:00.

```bash
python3 scripts/sla.py --priority HIGH --created-at 2026-08-10T09:00:00+00:00 --now 2026-08-10T15:30:00+00:00 --status open
```
→ deadline 2026-08-10T13:00:00+00:00, breached: true

Report: "Order #4521 (HIGH priority, Maple Court Unit 3B) is 2h30m past its
4-hour SLA deadline and still open."

Managers can manually escalate any work order with a reason — if the user
asks to trigger an escalation, acknowledge the escalation reason and note
it should be logged against the order number, but do not fabricate a
ticketing-system confirmation since this skill has no backend to write to.

## KPI / analytics report

Given raw metrics supplied by the user, produce a benchmark-style summary:

- State each metric with a comparison against its target/benchmark when
  the user provides one (e.g. "first-time fix rate is 78%, target is 85%").
- Lead with risk indicators: elevated overdue volume, depressed resolution
  rate, or any metric trending the wrong direction — these matter more to a
  time-constrained manager than a full metrics dump.
- Keep the report tight — a manager should be able to read it in under a
  minute.

**Worked example**:

Input metrics: first-time fix rate 78% (target 85%), resolution rate 91%,
6 orders currently overdue, avg response time 3.2h.

Report:
```
Risk flag: 6 orders currently overdue and first-time fix rate is running
7 points below target (78% vs. 85%) — worth a closer look at whether
technicians are being dispatched with the right parts/information up
front.

Resolution rate is healthy at 91%, and average response time (3.2h) is
within typical SLA windows for HIGH-priority work.
```
