# Eval spec — supply-chain-document-qa-skill

This skill's ingest→index→query path is fully deterministic (no LLM call), so it's checkable
end-to-end via `scripts/run_pipeline.py`. Only the final answer-writing step (turning retrieved
records into cited prose, per `SKILL.md` step 3) is left as live agent judgment and isn't scored
here — same boundary the InvAgent skill drew between its deterministic baseline pipeline and its
interactive reasoning loop.

Each golden case is a directory (`golden/<case>/input/`) containing synthetic documents across
multiple formats plus a `_manifest.json` (`{"question": ..., "top_k": ..., "source_type": ...}`)
that `run_pipeline.py` reads to know what to ask. None of the fixture data is real business data.

## Criteria

Each criterion's `cmd` only ever reads `{output}` — never a second golden-directory file by a
hand-built relative path, since command criteria run with the caller's inherited working directory,
not a guaranteed skill-root cwd (only the `run` command itself is guaranteed to execute from the
skill root). Retrieval-quality correctness (did the right document actually rank where expected) is
instead covered by `run_evals.py`'s built-in baseline diff, which compares each case's produced
output against its promoted `evals/golden/<case>/expected.json` automatically during `--rollout` —
no need to reimplement that comparison here.

1. **valid-output-json** (`command`) — the pipeline's output file is valid JSON.
2. **no-ingestion-errors** (`command`) — every file in the case's input directory (other than
   `_manifest.json`) was successfully parsed by its adapter (`errors` is empty).
3. **results-non-empty** (`command`) — at least one ranked result was returned for the question.
4. **source-path-portable** (`command`) — every result's `source_path` is a relative path (no leading
   `/`), confirming output stays portable across machines/checkouts (this was a real bug caught
   while building these eval fixtures — see the fix in `scripts/run_pipeline.py`).

## Golden cases

- `case-1` (`split: val`) — a 4-format corpus (CSV order export, `.eml` thread, Markdown policy, PDF
  purchase order) all about the same PO. Query: "Acme Fasteners M8 Bolts shipment delay". Expects the
  matching order-export row to rank first.
- `case-2` (`split: val`) — same corpus, but exercises `--source-type tabular` filtering. Query:
  "BrightSteel Steel Coil order status". Expects only tabular results, with the matching row first.
- `case-3` (`split: test`, holdout) — a different corpus exercising the JSON tabular adapter (not
  covered by cases 1-2) plus an email. Query: "SH-502 Aluminum Sheets customs hold Northgate".
  Expects the matching shipment row to rank first.

```json
{
  "skill": "supply-chain-document-qa-skill",
  "run": "python3 scripts/run_pipeline.py --input {input} --output {output}",
  "criteria": [
    {"id": "valid-output-json", "text": "Pipeline output is valid JSON", "type": "command", "cmd": "python3 -c \"import json; json.load(open('{output}'))\""},
    {"id": "no-ingestion-errors", "text": "Every input file parsed without error", "type": "command", "cmd": "python3 -c \"import json; d=json.load(open('{output}')); assert d['errors'] == [], d['errors']\""},
    {"id": "results-non-empty", "text": "At least one ranked result was returned", "type": "command", "cmd": "python3 -c \"import json; d=json.load(open('{output}')); assert len(d['results']) > 0\""},
    {"id": "source-path-portable", "text": "Every result's source_path is relative, not absolute", "type": "command", "cmd": "python3 -c \"import json; d=json.load(open('{output}')); assert all(not r['source_path'].startswith('/') for r in d['results'])\""}
  ],
  "golden": [
    {"id": "case-1", "input": "golden/case-1/input", "expected": "golden/case-1/expected.json", "split": "val"},
    {"id": "case-2", "input": "golden/case-2/input", "expected": "golden/case-2/expected.json", "split": "val"},
    {"id": "case-3", "input": "golden/case-3/input", "expected": "golden/case-3/expected.json", "split": "test"}
  ]
}
```
