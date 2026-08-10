#!/usr/bin/env python3
"""
Adapter registry: maps a file extension to the adapter module that knows how
to turn it into normalized records (see ../records.py for the schema).

Adding support for a new source format is exactly two changes:
  1. Write a new scripts/adapters/<name>_adapter.py with a `parse(path) -> list[dict]`
     function that returns records via records.make_record (see
     references/adapter-contract.md for the full contract).
  2. Add its extension(s) to EXTENSION_REGISTRY below.
No changes to index_store.py, ingest.py, or query.py are ever needed.
"""
from pathlib import Path

from . import email_adapter, pdf_adapter, tabular_adapter, text_adapter

EXTENSION_REGISTRY = {
    ".pdf": pdf_adapter,
    ".eml": email_adapter,
    ".csv": tabular_adapter,
    ".json": tabular_adapter,
    ".xlsx": tabular_adapter,
    ".txt": text_adapter,
    ".md": text_adapter,
}


def dispatch(path: Path) -> list:
    """Parse one file into normalized records using the adapter registered for its extension."""
    suffix = Path(path).suffix.lower()
    adapter = EXTENSION_REGISTRY.get(suffix)
    if adapter is None:
        supported = ", ".join(sorted(EXTENSION_REGISTRY))
        raise ValueError(
            f"No adapter registered for {suffix!r} ({path}). Supported extensions: {supported}. "
            "See references/adapter-contract.md to add a new one."
        )
    return adapter.parse(Path(path))


def supported_extensions() -> list:
    return sorted(EXTENSION_REGISTRY)
