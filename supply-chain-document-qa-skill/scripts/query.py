#!/usr/bin/env python3
"""
Query the index for the records most relevant to a question. Returns ranked
JSON -- the caller (Claude, in-conversation, per SKILL.md) reads this output
and synthesizes the final answer with citations. This script does the
mechanical retrieval only; it makes no LLM call.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from index_store import IndexStore


def run_query(db_path: Path, question: str, top_k: int = 5, source_type: str = None,
              force_fallback: bool = False) -> dict:
    store = IndexStore(db_path, force_fallback=force_fallback)
    results = store.query(question, top_k=top_k, source_type=source_type)
    response = {
        "ok": True,
        "question": question,
        "source_type_filter": source_type,
        "fts5_available": store.fts5_available,
        "num_results": len(results),
        "results": results,
    }
    store.close()
    return response


def main():
    ap = argparse.ArgumentParser(description="Query the document index")
    ap.add_argument("--db", required=True, help="SQLite index database path")
    ap.add_argument("--question", required=True, help="Natural-language question")
    ap.add_argument("--top-k", type=int, default=5)
    ap.add_argument("--source-type", default=None,
                     help="Restrict to one source type: pdf, email, tabular, or text")
    ap.add_argument("--force-fallback", action="store_true",
                     help="Force the pure-Python fallback scorer even if FTS5 is available (for testing)")
    args = ap.parse_args()

    if not Path(args.db).exists():
        print(json.dumps({"ok": False, "error": f"index not found at {args.db}; run ingest.py first"}, indent=2))
        sys.exit(1)

    response = run_query(Path(args.db), args.question, top_k=args.top_k, source_type=args.source_type,
                          force_fallback=args.force_fallback)
    print(json.dumps(response, indent=2))


if __name__ == "__main__":
    main()
