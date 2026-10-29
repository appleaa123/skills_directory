---
name: tenant-background-check
description: >-
  First-line screening of a Canadian rental application package without
  exposing the applicant's private documents. A local checker (double-click
  checker.html, or the `tbc` command) inspects credit reports, paystubs, ID
  and employment letters on the user's own computer and outputs a
  "TENANT CHECK SUMMARY" with no sensitive data. This skill reads that
  summary, does public web research (employer, LinkedIn, CanLII/LTB
  decisions, salary range for the title, landlord reference), and writes a
  screening report with red flags, soft flags, what could not be verified,
  and questions to ask. Use when a landlord or realtor wants to screen a
  tenant, check a credit report for tampering, verify employment, or check
  LTB history. Triggers on "screen this tenant", "is this credit report
  fake", "TENANT CHECK SUMMARY", "check this rental application",
  "background check on applicant".
license: MIT
activation: /tenant-background-check
metadata:
  version: 1.0.0
  created: 2026-10-29
---
# /tenant-background-check: Rental Application Screening

## Purpose

Decide whether a rental application deserves more of the user's time, using
only the checker's summary and public sources. Output red flags, soft flags
and open questions. Never certify that a document or identity is real.

## Hard rules (privacy, set by the owner)

1. **Never open, read, summarise or analyse applicant documents**: no credit
   reports, paystubs, ID images, employment letters or bank statements. They are
   checked only by the local checker. If a user pastes or attaches one,
   decline and point them to the checker (see "Getting a summary").
2. Work only from the `TENANT CHECK SUMMARY` and public web sources.
3. Never ask for the applicant's salary, date of birth, street address, SIN or
   credit score.
4. Tell the user once: *the applicant's name, employer, city and the landlord
   reference details go to the AI provider and to the search engine.*

Full rules: `references/privacy-rules.md`.

## Getting a summary

- **Non-technical users:** open `dist/checker.html` (double-click; works offline
  for PDFs) and drop in the files or the zip. The page reads them on the
  computer and fills in the applicant's details itself; the user checks them,
  presses **Run check**, then copies the summary into this chat.
- **Command-line agents:** run `tbc check <applicant-folder>` and read **only**
  its output. If the folder has no `application.json`, the tool creates one
  from the documents, locally. Tell the user to review and correct that file
  in their own editor, then run the check again. Never open
  `application.json` or any file in the applicant folder yourself, and never
  ask for date of birth, address or salary in chat.

Every detail is optional. A blank field means fewer cross-checks, not a
problem with the applicant; say so when the summary shows "not provided".

## Workflow

1. **Read the summary.** Group the checker's flags by severity. Explain each in
   plain words (the summary's messages are already plain; keep them).
   **If there is any red flag, stop here:** write the report with the red flags,
   the questions to ask and "stop" as the next step, and offer (don't run) the
   remaining research. Saving the user's time on a doctored application is the point.
2. **Public research** following `references/public-research.md`:
   employment (profile + employer existence + letterhead comparison, soft only),
   salary range for title + city, CanLII/LTB and web by name + city/province,
   landlord reference.
3. **Salary:** give the range you found with its source, then ask the user to
   compare it locally (HTML salary box, or `tbc salary <folder> --range <low>-<high>`).
   Treat the result as a soft flag at most.
4. **Write the report** using `references/report-template.md`.

## Judgement rules

- Checker `red` flags → **Red flags**. Checker `soft` → **Soft flags**.
  `unverifiable` → **Could not verify**.
- Cross-document `mismatch` (application vs a document): name or date of birth
  on the **credit report** is a red flag; on any other document it is soft
  (OCR noise on ID photos, a spouse's paystub). Employer/title/address mismatches
  are soft (people move and change jobs). `missing` is never a flag.
- A tribunal or court hit is a red flag **only** with a decision link and a
  matching city/province or timeframe; otherwise "possible same-name match,
  unverified" under Soft flags.
- Always say: most LTB orders are unpublished; nothing found ≠ clean.
- Letterhead and salary findings are never red.
- Recommend the paid screening check (FrontLobby or equivalent) **only if there
  are no red flags**. With a red flag, recommend stopping or asking for a
  document sent directly from its source (e.g. a fresh report from the bureau).
- Never write "genuine", "authentic" or "verified identity".

## Example

Input: summary with `[RED] 3fa2c1 GAUGE_POINTER_MISMATCH` and `[SOFT] 3fa2c1 SCORE_AT_BAND_FLOOR`.

Output (abridged):

```
## Red flags
- Credit report 3fa2c1: the score gauge pointer doesn't sit where the printed score
  should place it, a sign the score number was edited (checker: GAUGE_POINTER_MISMATCH).

## Soft flags
- The score sits exactly at the bottom of a rating band, a value forgers often pick.

## Could not verify
- Nothing else in the report's layout could be measured.

## Questions to ask the applicant
1. Can you have Equifax send a current report directly, or share it live on a video call?

## Recommended next step
Stop here until a credit report arrives from a source the applicant can't edit.
Don't pay for the screening check yet.
```
