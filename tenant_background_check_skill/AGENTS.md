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
- Only maintainers edit `rulebook/styles.json`. Use `tbc learn <genuine.pdf>` (or
  the checker page's "Help add a new report layout" section) to measure a new
  report style. Both print the same PII-free layout report: matched style, flag
  codes, fingerprint, range labels and measurements. A genuine report of a known
  style that shows red flag codes means the bureau changed its layout
  (`REPORT_DATE_OLD` alone just means the report is over 30 days old).
- Versions in `package.json`, `SKILL.md` and `.claude-plugin/plugin.json` must
  match; `npm run build` refuses otherwise. To publish, bump all three, commit
  and push, then `npm run release` (builds, refuses if the working tree is not
  clean, then creates GitHub release `tbc-v<version>` at the current commit with
  `checker.html` attached). The first line of the release notes is shown in the
  checker's update banner.
