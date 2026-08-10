#!/usr/bin/env python3
"""
Deterministic entry-point: ingest a directory of documents and answer one
query against them, end to end, with no LLM call involved. This is the
skill's eval-checkable happy path -- retrieval quality (whether the right
document surfaces for a question) is exactly the mechanical part worth
pinning down; turning retrieved records into a final prose answer is left to
Claude, in-conversation (see SKILL.md) -- the same "honest boundary" the
InvAgent skill drew between its deterministic baseline pipeline and its
interactive per-stage reasoning loop.

A "case" is a directory containing:
  - the source documents to ingest (any adapter-supported extension)
  - _manifest.json: {"question": "...", "top_k": 5, "source_type": null}
_manifest.json itself is never ingested as a document.
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from adapters import EXTENSION_REGISTRY, dispatch
from index_store import IndexStore

MANIFEST_NAME = "_manifest.json"


def run_pipeline(case_dir: Path, out: Path, force_fallback: bool = False) -> Path:
    # Resolved so relative_to() below always works regardless of how case_dir was passed in.
    case_dir = Path(case_dir).resolve()
    manifest = json.loads((case_dir / MANIFEST_NAME).read_text())
    question = manifest["question"]
    top_k = manifest.get("top_k", 5)
    source_type = manifest.get("source_type")

    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "index.db"
        store = IndexStore(db_path, force_fallback=force_fallback)

        files_processed, errors = [], []
        for path in sorted(case_dir.rglob("*")):
            if not path.is_file() or path.name == MANIFEST_NAME:
                continue
            if path.suffix.lower() not in EXTENSION_REGISTRY:
                continue
            try:
                records = dispatch(path)
            except Exception as exc:
                errors.append({"file": str(path.relative_to(case_dir)), "error": str(exc)})
                continue
            store.upsert_many(records)
            files_processed.append(str(path.relative_to(case_dir)))

        results = store.query(question, top_k=top_k, source_type=source_type)
        total_records = store.count()
        fts5_available = store.fts5_available
        store.close()

    # Rewrite absolute source_path values to be relative to case_dir, so this output is
    # byte-identical regardless of where the skill checkout (and therefore case_dir) lives
    # on disk -- required for the eval runner's exact-diff regression comparison.
    # Scores are rounded for the same reason: floating-point BM25/TF-IDF output can differ
    # in its last bits across SQLite builds/platforms, which would fail an exact-diff compare
    # over an insignificant difference.
    for result in results:
        result["source_path"] = str(Path(result["source_path"]).relative_to(case_dir))
        result["score"] = round(result["score"], 10)

    output = {
        "ok": True,
        "case_id": case_dir.name,
        "question": question,
        "files_processed": files_processed,
        "errors": errors,
        "total_records_indexed": total_records,
        "fts5_available": fts5_available,
        "results": results,
    }
    Path(out).write_text(json.dumps(output, indent=2))
    return Path(out)


def main():
    ap = argparse.ArgumentParser(description="Deterministic ingest+query pipeline (eval entry point)")
    ap.add_argument("--input", required=True, help="Case directory: documents + _manifest.json")
    ap.add_argument("--output", required=True, help="Where to write the ranked-results JSON")
    ap.add_argument("--force-fallback", action="store_true",
                     help="Force the pure-Python fallback scorer even if FTS5 is available (for testing)")
    args = ap.parse_args()
    run_pipeline(Path(args.input), Path(args.output), force_fallback=args.force_fallback)
    print(f"Results written to {args.output}")


if __name__ == "__main__":
    main()
