#!/usr/bin/env python3
"""Deterministic SLA deadline and breach-check math for maintenance-triage-skill.

Ported directly from opsly's backend/src/common/utils/sla.ts (computeSlaDeadline,
isSlaBreached, SLA_HOURS constants) -- this part of the source project is pure
date arithmetic with no LLM involvement, so it is reimplemented as-is rather
than left to agent reasoning.

Usage as a library:
    from sla import compute_sla_deadline, is_sla_breached, SLA_HOURS

Usage as a CLI:
    python3 sla.py --priority URGENT --created-at 2026-08-10T09:00:00+00:00
    python3 sla.py --priority HIGH --created-at 2026-08-10T09:00:00+00:00 --now 2026-08-10T14:00:00+00:00 --status open
    python3 sla.py --self-test
"""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone

SLA_HOURS = {
    "URGENT": 2,
    "HIGH": 4,
    "MEDIUM": 24,
    "LOW": 72,
}

TERMINAL_STATUSES = {"resolved", "closed", "completed", "cancelled"}


def compute_sla_deadline(created_at: datetime, priority: str) -> datetime:
    """Deadline = created_at + priority-specific hours. Raises ValueError for an unknown priority."""
    if priority not in SLA_HOURS:
        raise ValueError(f"Unknown priority: {priority!r}. Must be one of {sorted(SLA_HOURS)}")
    return created_at + timedelta(hours=SLA_HOURS[priority])


def is_sla_breached(deadline: datetime | None, status: str, now: datetime | None = None) -> bool:
    """True when now > deadline and status is not a terminal (resolved/closed) state.

    A None deadline can never be breached (mirrors the source's null-deadline guard).
    """
    if deadline is None:
        return False
    if status.lower() in TERMINAL_STATUSES:
        return False
    now = now or datetime.now(timezone.utc)
    return now > deadline


def _self_test() -> None:
    base = datetime(2026, 8, 10, 9, 0, 0, tzinfo=timezone.utc)

    # SLA_HOURS mapping matches the source thresholds exactly
    assert SLA_HOURS == {"URGENT": 2, "HIGH": 4, "MEDIUM": 24, "LOW": 72}

    # compute_sla_deadline adds the right number of hours per priority
    assert compute_sla_deadline(base, "URGENT") == base + timedelta(hours=2)
    assert compute_sla_deadline(base, "HIGH") == base + timedelta(hours=4)
    assert compute_sla_deadline(base, "MEDIUM") == base + timedelta(hours=24)
    assert compute_sla_deadline(base, "LOW") == base + timedelta(hours=72)

    # unknown priority raises
    try:
        compute_sla_deadline(base, "BOGUS")
        raise AssertionError("expected ValueError for unknown priority")
    except ValueError:
        pass

    # breach detection: exactly at the deadline is NOT breached (strictly after)
    deadline = compute_sla_deadline(base, "URGENT")
    assert is_sla_breached(deadline, "open", now=deadline) is False
    assert is_sla_breached(deadline, "open", now=deadline + timedelta(seconds=1)) is True
    assert is_sla_breached(deadline, "open", now=deadline - timedelta(hours=1)) is False

    # terminal status is never breached, even past deadline
    assert is_sla_breached(deadline, "resolved", now=deadline + timedelta(hours=10)) is False
    assert is_sla_breached(deadline, "closed", now=deadline + timedelta(hours=10)) is False

    # None deadline is never breached
    assert is_sla_breached(None, "open", now=base) is False

    print("All self-tests passed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="SLA deadline/breach computation")
    parser.add_argument("--self-test", action="store_true", help="Run built-in unit tests and exit")
    parser.add_argument("--priority", choices=sorted(SLA_HOURS))
    parser.add_argument("--created-at", help="ISO 8601 timestamp, e.g. 2026-08-10T09:00:00+00:00")
    parser.add_argument("--now", help="ISO 8601 timestamp to check breach against (default: current time)")
    parser.add_argument("--status", default="open", help="Work order status (default: open)")
    args = parser.parse_args()

    if args.self_test:
        _self_test()
        return

    if not args.priority or not args.created_at:
        parser.error("--priority and --created-at are required unless --self-test is given")

    created_at = datetime.fromisoformat(args.created_at)
    deadline = compute_sla_deadline(created_at, args.priority)
    now = datetime.fromisoformat(args.now) if args.now else datetime.now(timezone.utc)
    breached = is_sla_breached(deadline, args.status, now=now)

    print(json.dumps({
        "priority": args.priority,
        "created_at": created_at.isoformat(),
        "sla_hours": SLA_HOURS[args.priority],
        "deadline": deadline.isoformat(),
        "checked_at": now.isoformat(),
        "status": args.status,
        "breached": breached,
    }, indent=2))


if __name__ == "__main__":
    sys.exit(main())
