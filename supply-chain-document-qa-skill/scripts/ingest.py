#!/usr/bin/env python3
"""
Walk a directory, dispatch every file to its registered adapter (see
adapters/__init__.py), and upsert the resulting records into the index.
A file with an unsupported extension or one that fails to parse is skipped
and reported, not fatal -- one bad PDF shouldn't block ingesting the other
forty files in the directory (fail forward).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from adapters import EXTENSION_REGISTRY, dispatch
from index_store import IndexStore


def ingest_directory(directory: Path, db_path: Path, force_fallback: bool = False) -> dict:
    store = IndexStore(db_path, force_fallback=force_fallback)
    files_processed, files_skipped, errors = [], [], []
    totals = {"inserted": 0, "updated": 0, "unchanged": 0}

    for path in sorted(Path(directory).rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in EXTENSION_REGISTRY:
            files_skipped.append(str(path))
            continue
        try:
            records = dispatch(path)
        except Exception as exc:
            errors.append({"file": str(path), "error": str(exc)})
            continue
        if not records:
            errors.append({"file": str(path), "error": "adapter produced no records (empty or unparseable content)"})
            continue
        counts = store.upsert_many(records)
        for key in totals:
            totals[key] += counts[key]
        files_processed.append(str(path))

    result = {
        "ok": True,
        "fts5_available": store.fts5_available,
        "db_path": str(db_path),
        "files_processed": files_processed,
        "files_skipped": files_skipped,
        "errors": errors,
        "record_totals": totals,
        "total_records_in_index": store.count(),
    }
    store.close()
    return result


def main():
    ap = argparse.ArgumentParser(description="Ingest a directory of documents into the index")
    ap.add_argument("--dir", required=True, help="Directory to ingest (recursive)")
    ap.add_argument("--db", required=True, help="SQLite index database path (created if missing)")
    ap.add_argument("--force-fallback", action="store_true",
                     help="Force the pure-Python fallback scorer even if FTS5 is available (for testing)")
    args = ap.parse_args()

    result = ingest_directory(Path(args.dir), Path(args.db), force_fallback=args.force_fallback)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
