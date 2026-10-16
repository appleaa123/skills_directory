# AGENTS.md — supply-chain-document-qa-skill

## Purpose

Answers questions over a business's own heterogeneous documents (PDF purchase orders/invoices, email
threads, and CSV/JSON/Excel exports from a database or data pipeline) using a zero-infrastructure
SQLite FTS5 (BM25) lexical index instead of a vector database and embedding model. Distilled from and
generalized beyond [VaishnaviThakre/SupplyChain-AI](https://github.com/VaishnaviThakre/SupplyChain-AI),
whose actual reusable pattern (ingest → retrieve → answer) is kept while its Chroma/HuggingFace/Groq
RAG stack is replaced with something that needs no server, API key, or vector database.

## Activation

Trigger this skill when the user asks to: search or answer questions over PDFs/emails/spreadsheets,
look up a purchase order or invoice status, search supplier email correspondence, query a database
export alongside other documents, or build lightweight document Q&A without RAG/vector-DB
infrastructure.

## Usage

See `SKILL.md` for the full workflow. Summary: `scripts/ingest.py --dir <docs> --db <index.db>`
walks a directory, dispatches each file to its adapter (`scripts/adapters/`: PDF, email, tabular
CSV/JSON/Excel, plain text) and upserts normalized records into a SQLite FTS5 index (or its automatic
pure-Python fallback). `scripts/query.py --db <index.db> --question "..."` retrieves the top-ranked
records by BM25 relevance. The agent reads those records and writes the final answer with citations
in-conversation -- no external LLM call. `scripts/coverage_report.py` audits what's actually indexed.
`scripts/run_pipeline.py` chains ingest+query into one deterministic, eval-checkable entry point.

## Key files

- `SKILL.md` — full instructions and the exact ingest → retrieve → answer workflow
- `references/adapter-contract.md` — record schema + how to add a new source format
- `references/retrieval-design.md` — why FTS5/BM25 instead of a vector DB, and the fallback scorer
- `references/sample-queries.md` — supply-chain example questions and retrieval-quality phrasing tips
- `scripts/records.py` — shared record schema and chunking helper
- `scripts/adapters/` — pdf_adapter.py, email_adapter.py, tabular_adapter.py, text_adapter.py
- `scripts/index_store.py` — the FTS5 index + pure-Python fallback scorer
- `scripts/ingest.py`, `scripts/query.py`, `scripts/coverage_report.py` — CLIs
- `scripts/run_pipeline.py` — deterministic end-to-end pipeline (also the eval entry point)

## Source

Distilled from https://github.com/VaishnaviThakre/SupplyChain-AI (MIT). See `LICENSE` for the
required attribution notice.
