---
name: supply-chain-document-qa-skill
description: >-
  Answers questions over a business's own heterogeneous supply-chain
  documents -- PDF purchase orders and invoices, email threads with
  suppliers, and CSV/JSON/Excel exports from an internal database or
  data pipeline -- without requiring a vector database, embedding model,
  or LLM API key. Ingests any mix of these formats into a zero-infrastructure
  SQLite full-text (FTS5/BM25) index via an extensible adapter registry,
  retrieves the most relevant records for a question (with optional
  source-type filtering), and lets the assistant answer with citations
  in-conversation. Use for supply chain document search, PO/invoice status
  lookup, supplier email search, order/shipment data Q&A, or any "answer
  questions over my PDFs/emails/spreadsheets" need where standing up RAG
  infrastructure isn't worth it.
license: MIT
activation: /supply-chain-document-qa-skill
provenance:
  maintainer: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  source_references:
    - url: https://github.com/VaishnaviThakre/SupplyChain-AI
      name: SupplyChain-AI (source workflow this skill distills and generalizes away from its Chroma/HuggingFace/Groq RAG stack; see LICENSE)
metadata:
  author: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  last_reviewed: 2026-08-10
  review_interval_days: 90
  dependencies:
    - url: https://github.com/VaishnaviThakre/SupplyChain-AI
      name: SupplyChain-AI (source workflow this skill distills)
      type: reference
---
# /supply-chain-document-qa-skill — Zero-Infrastructure Document Q&A

You are answering questions over a business's own documents: PDFs, emails, and spreadsheet/database
exports. There is no vector database and no external LLM call in this skill — ingestion and retrieval
are fully mechanical (SQLite FTS5 lexical search), and you answer the question yourself, in-conversation,
using the retrieved records as your evidence.

## Trigger

User invokes `/supply-chain-document-qa-skill` followed by their request:

```
/supply-chain-document-qa-skill ingest ./supplier-docs and tell me which POs are overdue
/supply-chain-document-qa-skill what's the status of PO-1002?
/supply-chain-document-qa-skill only check emails from the last 30 days for a response from Acme
/supply-chain-document-qa-skill add these new invoices to the index, then re-check open backlogs
/supply-chain-document-qa-skill show me what's actually been indexed so far
```

## Setup

```bash
python3 -m pip install -r requirements.txt   # pypdf, openpyxl (both pure Python)
```

## Workflow

### 1. Ingest the user's documents

```bash
python3 scripts/ingest.py --dir /path/to/documents --db /path/to/index.db
```

Point `--dir` at whatever folder holds the user's mixed documents — PDFs, `.eml` files, CSV/JSON/`.xlsx`
exports (including anything a database export or MCP-connected pipeline already dumped to a file),
and `.txt`/`.md` notes. Unsupported file types are skipped and listed in the response, not fatal.
Re-running `ingest.py` on the same directory is safe and incremental — unchanged files report
`"unchanged"`, edited ones report `"updated"` (see the response's `record_totals`).

If the user mentions a new source format not in `references/adapter-contract.md`'s supported list
(currently PDF, `.eml`, CSV/JSON/`.xlsx`, `.txt`/`.md`), that reference explains how to add a new
adapter — it's a self-contained addition, not a rewrite.

### 2. Retrieve relevant records for the question

```bash
python3 scripts/query.py --db /path/to/index.db --question "<the user's question>" --top-k 5
```

Add `--source-type email` (or `pdf`, `tabular`, `text`) when the user scopes the question to one
kind of source ("only check emails..."). See `references/sample-queries.md` for phrasing that
retrieves well versus poorly — this is lexical (BM25) search, not semantic search, so distinctive
terms (PO numbers, supplier names, item names) retrieve far more reliably than vague pronouns.

### 3. Answer using ONLY the retrieved records, with citations

Read `query.py`'s JSON output. Write the answer citing which source file(s) it came from (use each
result's `source_path` and `title`). If the retrieved records don't actually answer the question,
say so explicitly rather than guessing — don't let the model fill gaps with assumptions the documents
don't support. If nothing relevant came back, suggest a more specific query term or run the coverage
report (step 4) to check whether the right document was ever ingested.

### 4. Audit what's actually indexed (use when results look wrong or incomplete)

```bash
python3 scripts/coverage_report.py --db /path/to/index.db
```

Lists every ingested file by source type with record counts and date ranges — use this to catch a
silently-skipped or failed-to-parse file before trusting a "no results" or thin answer.

## Notes

- The index lives in one SQLite file (`--db`). Reuse the same path across a conversation so
  incremental ingestion (step 1) and every subsequent query see the same corpus.
- FTS5 is used automatically when available; `index_store.py` falls back to a pure-Python scorer
  otherwise, with the exact same interface and ranking convention (lower score = more relevant) --
  see `references/retrieval-design.md`. You never need to choose between them manually.
- Never invent a citation. Every claim in the answer must trace to a `source_path` actually returned
  by `query.py` for that question.

## Eval spec

This skill ships `evals/supply-chain-document-qa-skill.eval.md`. Its `run` command exercises the
fully deterministic ingest→index→query pipeline (`scripts/run_pipeline.py`) on synthetic golden
fixtures — the retrieval-quality check that matters most is exactly the part with no LLM call
involved. Final answer synthesis (step 3 above) is intentionally left as prose, not scored here.

```
python3 scripts/run_evals.py                    # score against golden baseline
python3 scripts/run_evals.py --rollout           # run the pipeline and score real output
python3 scripts/run_evals.py --rollout --promote # capture first-green baseline
```
