# AGENTS.md — tenant-background-check

## Purpose

Screens Canadian rental application packages. A local checker inspects the
applicant's private documents on the user's computer and outputs a
`TENANT CHECK SUMMARY` with no sensitive data; the agent does public research
from that summary and writes a screening report.

## Activation

Trigger when the user wants to screen a tenant, check a credit report for
tampering, verify an applicant's employment, check LTB history, or pastes a
`TENANT CHECK SUMMARY`.

## Usage

See `SKILL.md`. Summary: get the summary (`dist/checker.html` or
`tbc check <folder>`), research public facts per `references/public-research.md`,
write the report per `references/report-template.md`.

## Hard rules

- Never read applicant documents (credit reports, paystubs, ID, letters). Only the
  summary and public web sources.
- Never ask for salary, date of birth, street address, SIN or credit score.
- Never claim a document is genuine or authentic.

## Development

- `npm install` then `npm test` (unit), `npm run e2e` (browser), `npm run build`
  (rebuilds `dist/checker.html`).
- `CORPUS_DIR=<private folder> npm run corpus` runs acceptance on real samples.
  The corpus is never committed; corpus scripts print content IDs and flag codes only.
- Only maintainers edit `rulebook/styles.json`. Use `tbc learn <genuine.pdf>` to
  measure a new report style.
