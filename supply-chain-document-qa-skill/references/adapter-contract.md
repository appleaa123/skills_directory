# Adapter contract — adding a new source format

The skill ships four adapters: `pdf_adapter.py`, `email_adapter.py`,
`tabular_adapter.py` (CSV/JSON/Excel), and `text_adapter.py`. Business data is
messy in practice — Slack exports, Word documents, a vendor's proprietary
report format, a new database export shape — so the ingestion layer is built
as a registry of adapters against one fixed contract, not four hardcoded
special cases. Adding support for a new format never touches
`index_store.py`, `ingest.py`, `query.py`, or `run_pipeline.py`.

## The record schema

Every adapter's `parse(path)` function returns a `list[dict]`, where each
dict has exactly these fields (`scripts/records.py`):

| Field | Type | Meaning |
|---|---|---|
| `doc_id` | str | Unique, stable id. Re-ingesting the same content with the same `doc_id` is an upsert, not a duplicate. |
| `source_path` | str | Path to the original file. |
| `source_type` | str | A short tag for this adapter, e.g. `"pdf"`, `"email"`, `"tabular"`, `"text"`. Used for `--source-type` filtering. |
| `title` | str | Human-readable label (filename, email subject, "orders.csv row 12"). |
| `date` | str | ISO-ish date string if one exists in the source, else `""`. Best-effort — never block ingestion on a missing/unparseable date. |
| `text` | str | The actual searchable content. Must be non-empty. |
| `metadata` | dict | Anything else worth keeping (page number, row values, email headers). Stored but not searched. |

Use `records.make_record(...)` to build one — it fills in a sensible default
`doc_id` (a hash of `source_path` + `text`) if you don't supply one, and
`records.chunk_text(text)` to split long text into overlapping ~1000-character
chunks before making one record per chunk (see `pdf_adapter.py`,
`email_adapter.py`, `text_adapter.py` for the pattern).

## Steps to add a new adapter

1. Write `scripts/adapters/<name>_adapter.py` with:
   ```python
   import sys
   from pathlib import Path
   sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
   from records import make_record  # + chunk_text if the source has long free text

   SOURCE_TYPE = "<name>"

   def parse(path: Path) -> list:
       ...
       return [make_record(source_path=str(path), source_type=SOURCE_TYPE, text=..., ...)]
   ```
2. Register its extension(s) in `scripts/adapters/__init__.py`'s `EXTENSION_REGISTRY` dict.
3. That's it. `ingest.py`, `run_pipeline.py`, and every other consumer discover it automatically
   through `adapters.dispatch(path)`.

## Design rules for a new adapter

- **Fail forward per file, not per corpus.** If one file in a batch can't be parsed, `ingest.py`
  catches the exception, records it in `errors`, and keeps going. Your adapter doesn't need its own
  try/except around the whole directory — just let genuine parse failures raise.
- **Never return a record with empty `text`.** `records.validate_record` rejects it, and
  `ingest.py` reports it as an error ("adapter produced no records") rather than silently indexing
  nothing.
- **Chunk anything long.** FTS5/BM25 ranking works best on paragraph-to-page-sized chunks, not
  whole multi-page documents as one record — a very long single record dilutes term frequency.
- **`doc_id` stability decides upsert vs. duplicate behavior.** If the adapter's natural key is
  content-independent (e.g. "row 12 of orders.csv", which might get edited in place), pass an
  explicit `doc_id` like `tabular_adapter.py` does (`f"tabular:{filename}:{row_index}"`) so an
  edited row updates the existing record instead of leaving a stale duplicate behind.

## Where "database" data enters this skill

This skill never holds database credentials or opens a live connection — that happens in whatever
system already has access (your own data pipeline, an MCP-connected tool, a manual export). Once
that data lands as a file — CSV, JSON, or `.xlsx` — `tabular_adapter.py` ingests it exactly like any
other tabular export. If your pipeline produces a different shape (e.g. nested JSON, a fixed-width
export), that's a new adapter following the steps above, not a change to how this skill talks to a
database.
