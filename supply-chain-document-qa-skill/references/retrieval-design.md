# Retrieval design — why no vector database

SupplyChain-AI (the source repo this skill distills) answers questions by embedding document chunks
with a local HuggingFace model, storing the vectors in Chroma, and retrieving by cosine similarity.
That stack — an embedding model, a vector database, the disk/memory to hold both — is exactly the
infrastructure budget most small and mid-size businesses don't have and don't need. This skill uses
SQLite's built-in FTS5 full-text index with BM25 ranking instead: lexical (keyword) search, not
semantic (embedding) search.

## Why lexical search is a reasonable substitute here

Supply-chain documents — POs, invoices, shipment manifests, supplier emails — are keyword-heavy:
PO numbers, supplier names, item names, and status words ("overdue", "delayed", "shipped") are
exact tokens a person would naturally type into a question. BM25 (the same ranking family Elasticsearch
and most production full-text search engines use) is a well-established, competitive baseline for
exactly this kind of retrieval, without an embedding model or ANN index in the loop.

## How it works

1. Every ingested chunk's `title` + `text` is tokenized (word boundaries, lowercased) and indexed
   in a SQLite FTS5 virtual table (`scripts/index_store.py`).
2. A question is tokenized the same way, common English function words (see `_QUERY_STOPWORDS`
   in `index_store.py`) are dropped, and the remaining terms are OR'd into an FTS5 `MATCH` query.
3. FTS5's built-in `bm25()` function ranks matches — **lower score is a better match** (SQLite's
   convention; `query.py`'s results are already sorted correctly, most relevant first).
4. Optional `--source-type` filtering narrows to one adapter's records (`pdf`, `email`, `tabular`,
   `text`) before ranking.

## Known limitation: short, generic queries

Because this is pure lexical matching (no semantic understanding), a short question dominated by
common words — e.g. "which one is overdue?" — can occasionally rank a short, keyword-dense but
less-relevant chunk above the actually-relevant one, especially in a small corpus. Distinctive
queries that include the specific terms you care about ("PO-1002 shipment status", "Acme Fasteners
overdue orders") retrieve reliably; vague ones don't. When in doubt, ask again with a more specific
term (a PO number, supplier name, or item name) rather than assuming the first answer is complete —
and check `coverage_report.py`'s output to confirm the relevant document was actually ingested.

## The zero-dependency guarantee: automatic fallback

Not every Python build has FTS5 compiled into its `sqlite3` module (rare, but possible on some
minimal/embedded builds). `IndexStore` tries to create the FTS5 table first; if that raises
`sqlite3.OperationalError`, it transparently falls back to a plain SQLite table plus a pure-Python
TF-IDF-style scorer (`_query_fallback` in `index_store.py`) — same ranking convention (lower score
is better), same interface, no crash, no manual configuration. This fallback is O(number of records)
per query in pure Python; documented ceiling is comfortably tens of thousands of records, not
millions — appropriate for a single business's document corpus, not an enterprise-scale archive.

The fallback is a reasonable substitute, not a guaranteed-identical one: for a near-tie between two
genuinely relevant records (verified during eval fixture testing — a case where FTS5's own bm25()
scores for the top two results differed by about 1e-6), FTS5 and the fallback scorer can pick a
different top-1 result, since they weight term frequency and document length slightly differently.
Both results remain relevant; only the tie-break order can differ. This has no effect when there's a
clear best match, which is the common case.

## If you later do have an embedding budget

Nothing here prevents adding a dense-retrieval adapter later (an `IndexStore`-compatible class with
its own `query()` method) if a business outgrows lexical search. That's out of scope for this skill
by design — the whole point is that most businesses shouldn't need to build that first.
