#!/usr/bin/env python3
"""
Text adapter: ingests plain text / Markdown files (policies, SOPs, notes,
supplier correspondence pasted as .txt) by chunking them directly. No
external dependencies -- this is the fallback adapter for anything that's
already readable as text.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from records import chunk_text, make_record

SOURCE_TYPE = "text"


def parse(path: Path) -> list:
    text = path.read_text(encoding="utf-8", errors="replace")
    title = path.stem
    records = []
    for chunk_index, chunk in enumerate(chunk_text(text)):
        records.append(make_record(
            source_path=str(path), source_type=SOURCE_TYPE, text=chunk,
            title=title, date="",
            metadata={"chunk_index": chunk_index},
        ))
    return records
