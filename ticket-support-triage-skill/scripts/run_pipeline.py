#!/usr/bin/env python3
"""Optional-delivery orchestrator for ticket-support-triage-skill.

The core classify -> draft workflow (SKILL.md Steps 1-3) is pure agent
reasoning and has no script to run. This orchestrator only wires the two
OPTIONAL delivery steps (Step 4) together for the case where a user asks to
both log and send a ticket in one command, so they aren't sequenced by hand.

Usage:
    python3 run_pipeline.py --name Jordan --email jordan@example.com \\
        --message "..." --sentiment Negative --issue-type Billing \\
        --reply reply.txt [--csv-path tickets_log.csv] [--send]
"""

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Optional log+send pipeline")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--message", required=True)
    parser.add_argument("--sentiment", required=True, choices=["Positive", "Negative", "Neutral"])
    parser.add_argument("--issue-type", required=True, dest="issue_type",
                         choices=["Billing", "Technical", "Login", "General", "Other"])
    parser.add_argument("--reply", required=True, help="Path to a file containing the draft reply")
    parser.add_argument("--csv-path", default="tickets_log.csv")
    parser.add_argument("--send", action="store_true", help="Also send the reply via SMTP")
    args = parser.parse_args()

    reply_text = Path(args.reply).read_text(encoding="utf-8")

    log_cmd = [
        sys.executable, str(SCRIPTS_DIR / "log_to_csv.py"),
        "--name", args.name, "--email", args.email, "--message", args.message,
        "--sentiment", args.sentiment, "--issue-type", args.issue_type,
        "--reply", reply_text, "--csv-path", args.csv_path,
    ]
    subprocess.run(log_cmd, check=True)

    if args.send:
        send_cmd = [
            sys.executable, str(SCRIPTS_DIR / "send_email_smtp.py"),
            "--to", args.email, "--body-file", args.reply,
        ]
        subprocess.run(send_cmd, check=True)


if __name__ == "__main__":
    main()
