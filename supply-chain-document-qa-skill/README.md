# supply-chain-document-qa-skill

Answers questions over a business's own heterogeneous documents — PDF purchase orders and invoices,
email threads with suppliers, and CSV/JSON/Excel exports from an internal database or data pipeline —
without a vector database, embedding model, or LLM API key. Distilled from and generalized beyond
[VaishnaviThakre/SupplyChain-AI](https://github.com/VaishnaviThakre/SupplyChain-AI) (MIT): the
ingest → retrieve → answer pattern is kept, its Chroma + HuggingFace-embeddings + Groq RAG stack is
replaced with a zero-infrastructure SQLite FTS5 (BM25) lexical index and in-conversation answering.

## Install

### Claude Code
```bash
cp -R ./supply-chain-document-qa-skill ~/.claude/skills/supply-chain-document-qa-skill
```

### GitHub Copilot CLI
```bash
cp -R ./supply-chain-document-qa-skill ~/.copilot/skills/supply-chain-document-qa-skill
```

### VS Code Copilot (project-level)
```bash
cp -R ./supply-chain-document-qa-skill .github/skills/supply-chain-document-qa-skill
```

### Cursor (project-level only)
```bash
cp -R ./supply-chain-document-qa-skill .cursor/skills/supply-chain-document-qa-skill
```

### Gemini CLI
```bash
cp -R ./supply-chain-document-qa-skill ~/.gemini/skills/supply-chain-document-qa-skill
```

### Any other supported tool
Run `./install.sh` (auto-detects your platform) or `./install.sh --all` to install everywhere
detected. `./install.sh --help` lists every `--platform` option and its native path.

## Usage

```
/supply-chain-document-qa-skill ingest ./supplier-docs and tell me which POs are overdue
/supply-chain-document-qa-skill what's the status of PO-1002?
/supply-chain-document-qa-skill only check emails from the last 30 days for a response from Acme
```

See `SKILL.md` for the full workflow and `references/` for the adapter contract, retrieval design,
and example queries.

## Dependencies

```bash
python3 -m pip install -r requirements.txt   # pypdf, openpyxl -- both pure Python, no vector DB
```

## Supported source formats out of the box

PDF (`.pdf`), email (`.eml`), tabular exports (`.csv`, `.json`, `.xlsx`), and plain text /
Markdown (`.txt`, `.md`). Adding a new format is a self-contained change — see
`references/adapter-contract.md`.

## Evals

```bash
python3 scripts/run_evals.py --validate                 # confirm the spec is well-formed
python3 scripts/run_evals.py --rollout                   # run the deterministic pipeline and score it
python3 scripts/run_evals.py --rollout --include-holdout # also score the held-out test case
python3 scripts/run_evals.py --rollout --promote         # capture the first-green baseline
```

## What was ported vs. what changed from SupplyChain-AI

- **Ported**: the ingest → retrieve → answer pattern; the chunking strategy (a simplified version of
  the source repo's `RecursiveCharacterTextSplitter` use).
- **Generalized**: source ingestion goes from `.txt`-only to an extensible adapter registry (PDF,
  email, tabular, text) — see `references/adapter-contract.md`.
- **Replaced**: Chroma + HuggingFace embeddings + Groq LLM API → SQLite FTS5 lexical search (BM25)
  with an automatic pure-Python fallback, and in-conversation answering by the assistant running this
  skill — no vector database, no embedding model, no external LLM API key. See
  `references/retrieval-design.md` for why lexical search is a reasonable substitute for this domain.
- **Not ported**: the Flask server, `/chat`/`/upload`/`/clear-chat` HTTP routes, and
  `ConversationBufferMemory` — none of that infrastructure is needed inside an agent skill, where the
  conversation itself carries turn-to-turn state.
