#!/usr/bin/env python3
"""
Audit what's actually in the index: per-file record counts and date ranges,
grouped by source type. Run this before trusting an answer, so a gap (a file
that failed to ingest, or was never added) is visible instead of silently
producing an incomplete answer.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from index_store import IndexStore


def build_coverage_report(db_path: Path, force_fallback: bool = False) -> dict:
    store = IndexStore(db_path, force_fallback=force_fallback)
    per_file = store.coverage()
    by_source_type = {}
    for entry in per_file:
        st = entry["source_type"]
        by_source_type.setdefault(st, {"num_files": 0, "num_records": 0})
        by_source_type[st]["num_files"] += 1
        by_source_type[st]["num_records"] += entry["num_records"]

    report = {
        "ok": True,
        "db_path": str(db_path),
        "fts5_available": store.fts5_available,
        "total_records": store.count(),
        "total_files": len(per_file),
        "by_source_type": by_source_type,
        "files": per_file,
    }
    store.close()
    return report


def main():
    ap = argparse.ArgumentParser(description="Report what's indexed, by source file and type")
    ap.add_argument("--db", required=True, help="SQLite index database path")
    ap.add_argument("--force-fallback", action="store_true")
    args = ap.parse_args()

    if not Path(args.db).exists():
        print(json.dumps({"ok": False, "error": f"index not found at {args.db}; run ingest.py first"}, indent=2))
        sys.exit(1)

    print(json.dumps(build_coverage_report(Path(args.db), force_fallback=args.force_fallback), indent=2))


if __name__ == "__main__":
    main()
