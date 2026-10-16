#!/usr/bin/env python3
"""
Email adapter: parses .eml files (standard RFC 822 format, what Outlook,
Gmail, and most mail clients export to) using Python's stdlib `email` module
-- zero extra dependencies. Extracts subject, from/to, date, and the
text/plain body, and separates the top reply from quoted history so
retrieval isn't dominated by repeated quoted text in long threads.
"""
import sys
from email import policy
from email.parser import BytesParser
from email.utils import parsedate_to_datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from records import chunk_text, make_record

SOURCE_TYPE = "email"

# Common quote-reply markers that precede quoted history in a plain-text email body.
_QUOTE_MARKERS = ("\nOn ", "\n-----Original Message-----", "\nFrom: ", "\n> ")


def parse(path: Path) -> list:
    with open(path, "rb") as f:
        msg = BytesParser(policy=policy.default).parse(f)

    subject = msg.get("subject", "") or ""
    sender = msg.get("from", "") or ""
    to = msg.get("to", "") or ""
    date = ""
    try:
        if msg.get("date"):
            date = parsedate_to_datetime(msg.get("date")).date().isoformat()
    except (TypeError, ValueError):
        pass

    body = _extract_plain_body(msg)
    latest_reply, quoted_history = _split_quoted(body)

    metadata = {"from": sender, "to": to, "subject": subject}
    records = []

    header_and_reply = f"Subject: {subject}\nFrom: {sender}\nTo: {to}\n\n{latest_reply}".strip()
    for chunk_index, chunk in enumerate(chunk_text(header_and_reply)):
        records.append(make_record(
            source_path=str(path), source_type=SOURCE_TYPE, text=chunk,
            title=subject or path.stem, date=date,
            metadata={**metadata, "part": "latest_reply", "chunk_index": chunk_index},
        ))

    if quoted_history.strip():
        for chunk_index, chunk in enumerate(chunk_text(quoted_history)):
            records.append(make_record(
                source_path=str(path), source_type=SOURCE_TYPE, text=chunk,
                title=subject or path.stem, date=date,
                metadata={**metadata, "part": "quoted_history", "chunk_index": chunk_index},
            ))

    return records


def _extract_plain_body(msg) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.is_multipart():
                try:
                    return part.get_content()
                except Exception:
                    continue
        return ""
    try:
        return msg.get_content()
    except Exception:
        return ""


def _split_quoted(body: str):
    """Return (latest_reply, quoted_history) by cutting at the first quote marker found."""
    earliest_cut = len(body)
    for marker in _QUOTE_MARKERS:
        idx = body.find(marker)
        if idx != -1 and idx < earliest_cut:
            earliest_cut = idx
    return body[:earliest_cut].strip(), body[earliest_cut:].strip()
