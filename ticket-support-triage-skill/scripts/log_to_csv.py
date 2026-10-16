#!/usr/bin/env python3
"""Append a classified ticket record to a local CSV log. Optional — only used
if the user explicitly asks to log the ticket. No credentials required.

Usage:
    python3 log_to_csv.py --name Jordan --email jordan@example.com \\
        --message "..." --sentiment Negative --issue-type Billing \\
        --reply "..." [--csv-path tickets_log.csv]
"""

import argparse
import csv
import os
from datetime import datetime, timezone

FIELDNAMES = [
    "timestamp",
    "name",
    "email",
    "message",
    "sentiment",
    "issue_type",
    "draft_reply",
]

VALID_SENTIMENTS = {"Positive", "Negative", "Neutral"}
VALID_ISSUE_TYPES = {"Billing", "Technical", "Login", "General", "Other"}


def log_ticket(csv_path: str, record: dict) -> None:
    if record["sentiment"] not in VALID_SENTIMENTS:
        raise ValueError(f"Invalid sentiment: {record['sentiment']!r}")
    if record["issue_type"] not in VALID_ISSUE_TYPES:
        raise ValueError(f"Invalid issue_type: {record['issue_type']!r}")

    file_exists = os.path.isfile(csv_path)
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if not file_exists:
            writer.writeheader()
        writer.writerow(record)


def main() -> None:
    parser = argparse.ArgumentParser(description="Log a classified ticket to CSV")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--message", required=True)
    parser.add_argument("--sentiment", required=True, choices=sorted(VALID_SENTIMENTS))
    parser.add_argument("--issue-type", required=True, choices=sorted(VALID_ISSUE_TYPES), dest="issue_type")
    parser.add_argument("--reply", required=True, dest="draft_reply")
    parser.add_argument("--csv-path", default="tickets_log.csv")
    args = parser.parse_args()

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "name": args.name,
        "email": args.email,
        "message": args.message,
        "sentiment": args.sentiment,
        "issue_type": args.issue_type,
        "draft_reply": args.draft_reply,
    }
    log_ticket(args.csv_path, record)
    print(f"Logged ticket to {args.csv_path}")


if __name__ == "__main__":
    main()
