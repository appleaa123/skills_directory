#!/usr/bin/env python3
"""
PDF adapter: extracts text per page via pypdf (pure Python, no OCR/ML deps),
chunking each page's text. Covers purchase orders, invoices, shipment
manifests, and contracts -- the PDF documents a supply-chain team typically
has on hand.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pypdf import PdfReader

from records import chunk_text, make_record

SOURCE_TYPE = "pdf"


def parse(path: Path) -> list:
    reader = PdfReader(str(path))
    title = path.stem
    date = ""
    try:
        raw_date = reader.metadata.get("/CreationDate", "") if reader.metadata else ""
        date = _parse_pdf_date(raw_date)
    except Exception:
        pass

    records = []
    for page_num, page in enumerate(reader.pages, start=1):
        page_text = (page.extract_text() or "").strip()
        if not page_text:
            continue
        for chunk_index, chunk in enumerate(chunk_text(page_text)):
            records.append(make_record(
                source_path=str(path),
                source_type=SOURCE_TYPE,
                text=chunk,
                title=title,
                date=date,
                metadata={"page": page_num, "chunk_index": chunk_index, "num_pages": len(reader.pages)},
            ))
    return records


def _parse_pdf_date(raw: str) -> str:
    """PDF dates look like D:20240115120000+00'00'; return just the YYYY-MM-DD part if parseable."""
    if not raw or not raw.startswith("D:"):
        return ""
    digits = raw[2:10]
    if len(digits) == 8 and digits.isdigit():
        return f"{digits[0:4]}-{digits[4:6]}-{digits[6:8]}"
    return ""
