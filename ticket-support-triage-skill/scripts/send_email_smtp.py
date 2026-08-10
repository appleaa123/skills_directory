#!/usr/bin/env python3
"""Send a drafted support reply via SMTP. Optional — only used if the user
explicitly asks to send the email. Requires SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASSWORD environment variables.

Usage:
    python3 send_email_smtp.py --to customer@example.com --subject "Re: Your support ticket" --body-file reply.txt
"""

import argparse
import os
import smtplib
import sys
from email.mime.text import MIMEText


def send_email(to_addr: str, subject: str, body: str) -> None:
    host = os.environ.get("SMTP_HOST")
    port = os.environ.get("SMTP_PORT")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")

    missing = [
        name
        for name, val in [
            ("SMTP_HOST", host),
            ("SMTP_PORT", port),
            ("SMTP_USER", user),
            ("SMTP_PASSWORD", password),
        ]
        if not val
    ]
    if missing:
        print(
            f"Missing required environment variables: {', '.join(missing)}. "
            "Set them before sending email (see SKILL.md).",
            file=sys.stderr,
        )
        sys.exit(1)

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to_addr

    with smtplib.SMTP(host, int(port)) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(user, [to_addr], msg.as_string())

    print(f"Email sent to {to_addr}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a support reply via SMTP")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--subject", default="Re: Your support ticket")
    parser.add_argument("--body-file", required=True, help="Path to a file containing the reply body")
    args = parser.parse_args()

    with open(args.body_file, encoding="utf-8") as f:
        body = f.read()

    send_email(args.to, args.subject, body)


if __name__ == "__main__":
    main()
