# Sample supply-chain questions

Once a corpus is ingested, these are representative questions this skill is designed to answer well
(assuming the underlying documents exist in the ingested corpus):

- "Which purchase orders from Acme Fasteners are overdue?"
- "What's the status of PO-1002?"
- "Summarize the email thread about the BrightSteel Co shipment delay."
- "List all orders placed in June 2026 with quantity over 1000 units."
- "Which suppliers have open backlogs according to our order export?"
- "What does our escalation policy say about a PO that's 20 days overdue?" (tests cross-source
  retrieval: a policy document plus live order data)
- "Only check emails from the last 30 days — has Acme responded about the M8 Bolts delay?"
  (`--source-type email` filter)

## Phrasing that retrieves well vs. poorly

Per `references/retrieval-design.md`, this is lexical (keyword) search, not semantic search:

- **Good**: include a PO number, supplier name, item name, or status word — the actual terms likely
  to appear in the source document. "Acme Fasteners M8 Bolts shipment delay" retrieves precisely.
- **Weaker**: very short, pronoun-heavy questions ("which one is late?") with no distinctive term to
  anchor the search. Add a specific noun (supplier, item, PO number) if the first answer seems off,
  or run `coverage_report.py` to confirm the document you expect is actually indexed.
