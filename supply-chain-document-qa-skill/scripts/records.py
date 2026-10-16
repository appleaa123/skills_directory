#!/usr/bin/env python3
"""
Shared record schema used by every ingestion adapter and the index.

Every adapter (scripts/adapters/*.py) normalizes its source format into this
one record shape, regardless of whether the source was a PDF page, an email,
a spreadsheet row, or a text chunk. This is the contract that makes adding a
new source format a self-contained change (see references/adapter-contract.md)
instead of one that ripples into indexing or querying.
"""
import hashlib
import json
from pathlib import Path
from typing import Optional

REQUIRED_FIELDS = ("doc_id", "source_path", "source_type", "title", "date", "text", "metadata")


def content_hash(*parts: str) -> str:
    """Deterministic short hash used to build stable doc_ids and detect unchanged content."""
    h = hashlib.sha256()
    for part in parts:
        h.update(str(part).encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()[:16]


def make_record(source_path: str, source_type: str, text: str, title: str = "", date: str = "",
                 metadata: Optional[dict] = None, doc_id: Optional[str] = None) -> dict:
    """
    Build one normalized record. `doc_id` defaults to a hash of (filename, text) --
    the filename, not the full source_path, so the same document keeps the same
    doc_id whether it's ingested from /home/alice/docs/po.pdf or a re-cloned copy
    at a different path. This is what makes re-ingesting an unchanged source
    idempotent and a changed source get a new id (the index treats doc_id as the
    upsert key) regardless of where the directory happens to live on disk.
    """
    metadata = metadata or {}
    if doc_id is None:
        doc_id = f"{source_type}:{content_hash(Path(source_path).name, text)}"
    return {
        "doc_id": doc_id,
        "source_path": str(source_path),
        "source_type": source_type,
        "title": title or "",
        "date": date or "",
        "text": text,
        "metadata": metadata,
    }


def validate_record(record: dict) -> None:
    """Raise ValueError if a record is missing required fields or has empty text."""
    missing = [f for f in REQUIRED_FIELDS if f not in record]
    if missing:
        raise ValueError(f"Record missing required fields {missing}: {record}")
    if not isinstance(record["text"], str) or not record["text"].strip():
        raise ValueError(f"Record {record.get('doc_id')} has empty or non-string text")
    if not isinstance(record["metadata"], dict):
        raise ValueError(f"Record {record.get('doc_id')} metadata must be a dict")


def metadata_to_json(metadata: dict) -> str:
    """JSON-serialize metadata for storage, coercing non-serializable values to strings."""
    return json.dumps(metadata, default=str, ensure_ascii=False)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list:
    """
    Split text into overlapping chunks. SupplyChain-AI's source repo used LangChain's
    RecursiveCharacterTextSplitter for the same purpose; this is a simplified fixed-size
    sliding window since separator-aware splitting matters less for lexical (FTS5) search
    than it does for embedding-based chunking.
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    step = max(chunk_size - overlap, 1)
    while start < len(text):
        chunk = text[start:start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += step
    return chunks
