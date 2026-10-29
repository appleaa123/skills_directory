# Tenant Background Check — Design

Status: draft for review · 2026-10-29 · Home: `tenant_background_check_skill/`

## 1. Intent

Landlords' realtors in Canada (Ontario first) spend hours manually screening
rental application packages: credit reports, ID, employment letters, paystubs,
references, and tribunal history. The most error-prone part is spotting
**doctored credit reports** — e.g. a score number edited while the gauge
pointer stays where the real score was, or a retyped date line in a
different font.

This tool is a **first line of defence**: it screens a package before a human
spends time on it, catches the forgeries a careful realtor would catch, and
cross-references the documents against each other and against public
information. If it flags an application as doctored, the realtor can stop
there. If it passes, the realtor still does the paid final check (FrontLobby
or equivalent) — the tool reduces how often he pays, it does not replace it.

Primary user: the owner's realtor (non-technical, uses a web or desktop AI
chat app — ChatGPT, Claude, Cowork, or similar). Secondary users: other
realtors, some technical, who use CLI agents (Claude Code, Codex CLI).

## 2. Goals

- Detect doctored credit reports (PDF and screenshot) using rules **measured
  on genuine samples**, not assumed.
- Cross-check identity (name, DOB, address) across credit report, ID,
  paystub, and employment letter.
- Check employment plausibility: employer exists, title is consistent with
  public profiles, salary is plausible for the title and city.
- Search free public records (CanLII LTB decisions, news, public profiles).
- Produce a report a realtor can act on: red flags, soft flags,
  what could not be verified, and questions to ask the applicant.
- Work for both non-technical (browser + any AI) and technical (CLI agent)
  users from one shared engine.

## 3. Non-goals

- Proving a document is genuine. Output is "flags found / no flags found",
  never "authentic".
- Verifying government ID authenticity (not possible for private citizens).
- Replacing paid screening services or pulling credit with tenant consent.
- Making the rent/no-rent decision.

## 4. Anti-goals (failure even if it "works")

- **Applicant PII leaving the realtor's machine** beyond the public fields
  listed in §5. This is the hardest constraint in the design.
- False red flags on honest applicants (e.g. flagging any re-saved PDF).
  Every rule must pass on all genuine samples before it ships.
- Treating a same-name search hit as the applicant's record.
- AI-invented court cases presented as findings (every hit needs a URL).
- Any applicant data, file name, or PII committed to the repo.

## 5. Privacy model (decided by the owner)

Hybrid: sensitive documents are processed **only by local code**; only
publicly searchable facts go to an AI or search engine.

| Data | Where it may go |
|---|---|
| Credit report (all of it: SIN, score, accounts, addresses, DOB) | Local only |
| Paystubs (all of it) | Local only |
| ID photos (all of it) | Local only |
| Employment letter salary and other content | Local only |
| Applicant name, employer name, job title | AI + web search allowed |
| Applicant's current city, province, country (never street address) | AI + web search allowed |
| Employer email domain and office address from the letterhead | AI + web search allowed (compared to the company website only) |
| Landlord reference's name, phone, address (from the application) | AI + web search allowed |
| Public profiles, company sites, CanLII/LTB, news | AI + web search allowed |
| Cross-document matching results | AI sees only `match / mismatch / missing` |
| Salary vs title | AI finds the **range** (title + city only); local code compares and returns `below / within / above` |

The owner accepts that name + employer reach the AI vendor and search engine;
the skill states this to the user. Bank statements and graduation/reference
letters (seen in samples) are treated as **local only** by default
(builder's call, consistent with the table).

Local-only is enforced **by construction** (the private engine is a separate
program whose output schema contains no sensitive fields), not by trusting an
AI to follow instructions.

## 6. Architecture

```
applicant files (zip/folder)
        │
        ▼
┌──────────────────────────────┐   PII-free summary (JSON + readable text):
│ Private engine (JavaScript)  │──▶ flags, match/mismatch results,
│ runs on the user's machine   │    name / employer / title only
└──────────────────────────────┘
   ▲ used by two front ends              │
   │                                     ▼
 (A) checker.html  (B) Node CLI   ┌──────────────────────────┐
   double-click,     for CLI      │ Skill / instruction pack │
   drag-drop zip     agents       │ public research + report │
                                  └──────────────────────────┘
```

- **One engine, written once in JavaScript** (owner's realtor flow and CLI
  flow must agree; two implementations would drift). Browser build for (A),
  same modules run under Node for (B).
- **(A) Non-technical flow:** open `checker.html` locally (Chrome / Safari /
  Edge, Mac or Windows, no install) → drop the zip → copy the summary → paste
  into any AI with the instruction pack → AI does public research and writes
  the report. For the salary check, the AI reports the range it found and the
  user pastes it into a field on `checker.html`, which shows
  `below / within / above` locally.
- **(B) Technical flow:** a skill folder following this repo's conventions
  (`SKILL.md`, `AGENTS.md`, `README.md`, `install.sh`, `.claude-plugin/`,
  `scripts/`, `evals/`). The agent runs the CLI on the applicant folder, reads
  only the summary, does the public research, passes the salary range back to
  the CLI, and writes the report. Ships a recommended Claude Code permission
  rule denying `Read` on the applicant folder; other agents get it as a
  written instruction.
- **Instruction pack** = the same `SKILL.md` content, usable as a Claude
  skill, a ChatGPT custom GPT/project instruction, or pasted text.
- **Rulebook** = a data file of genuine-template fingerprints (§8). Contains
  formats only, never applicant data.

Dependencies (builder may adjust, keep minimal): pdf.js (text spans with
font + position, metadata, rendering), tesseract.js (local OCR for
screenshots / image-only PDFs, English language data bundled or loaded once;
no applicant data leaves the machine), JSZip. CLI: Node ≥ 18.

## 7. Checks

Severity levels: **Red** (strong evidence of tampering or contradiction),
**Soft** (unusual, ask about it), **Unverifiable** (cannot check — say so),
**OK**.

### 7.1 Credit report (local)

1. **Identify report style** from fingerprints: producer/creator, fonts,
   page size, page count, anchor phrases. Unknown style → `Unverifiable:
   layout not in rulebook`, file-history checks still run.
2. **Template rules** (per style, from rulebook):
   - Fonts per field. Measured: in the Equifax consumer disclosure, the
     "Further to your request … as of [date]" line uses the same font and
     size as the "Equifax Canada Co." header (FreeSans 14pt). A different
     font on a field line → Red.
   - **Score gauge**: locate band dividers/range labels, the pointer, and the
     score. Measured: bands are drawn at **equal width** regardless of score
     range (300–559, 560–659, 660–724, 725–759, 760–900). Expected pointer
     x = bar start + (band index + (score − band low)/(band size)) × band
     width. Two genuine reports agree within 0.6 pt under this model (a
     linear 300–900 model misses by 40 pt). Known fake is off by ~15% of a
     band (~10 pt). Tolerance to be set from genuine samples (start: 2 pt
     for PDFs, 1.5% of bar width for images). Exceeds tolerance → Red.
   - Score label above the pointer equals the score in the summary → else Red.
   - Range labels match the standard set → else Red.
   - Postal code format **per field** (spaced vs unspaced) as observed in
     genuine samples. Note: genuine samples use the spaced format in
     Current/Previous address fields, contradicting the realtor's
     "unspaced only" rule; rule is per-field and comes from samples.
   - Date formats (Equifax uses CCYY/MM/DD).
3. **File history** (PDF):
   - Producer/creator unexpected for the style (e.g. Word, Photoshop,
     Canva, iLovePDF on a bureau report) → Red.
   - Incremental saves: **exclude linearized ("fast web view") PDFs**, whose
     two `%%EOF` markers are not edits. Real later revisions that change page
     content, add fonts, or add FreeText/stamp annotations → Red; later
     revisions with only metadata/signature → OK.
   - Re-processed by a second program (e.g. Chrome-produced file that is
     linearized, ModDate ≫ CreationDate) → Soft, low weight.
   - Hidden text layer differs from visible text (seen in a public sample
     where earlier values remained under the visible page) → Red.
   - Report date old relative to application date → Soft.
4. **Screenshots / image-only PDFs** (most fakes arrive this way; both known
   fakes are JPG screenshots). v1 scope (builder's call, settled after
   review):
   - **Gauge on images: required.** Canvas pixel analysis, no extra
     dependency: find the coloured bar, the grey divider lines, the black
     pointer triangle; OCR the score and range labels. Fake #1 was measured
     this way by eye (dividers ~142 px apart, pointer ~21 px past the
     725 divider). Calibrate by rendering the genuine PDFs to images at
     several resolutions.
   - **Font mismatch on images: Soft only.** OCR does not identify fonts.
     v1 compares each known anchor line's rendered width/height ratio and
     stroke metrics against the same text rendered in the expected font
     (e.g. FreeSans); a large deviation is Soft ("line set in a different
     typeface — check manually"), never Red.
   - Range labels and date formats via OCR: as for PDFs.
   - Report states image checks are weaker than PDF checks.
5. **Weak heuristics** (Soft only): score exactly at a band floor (725, 760),
   stripped metadata on a "downloaded" PDF.

### 7.2 Identity cross-check (local)

Name (with normalization: case, accents, middle names, AKA), DOB, and
current/previous addresses compared across credit report, ID (OCR), paystub,
employment letter, and the application form if present. Output only
`match / mismatch / missing` per field pair.

### 7.3 Employment (local + public)

- Local: employer name and title extracted from letter and paystubs; they
  must agree. Paystub sequence checks: pay periods consecutive, YTD totals
  increase consistently, net < gross, duplicate stubs with only dates
  changed → Red; payroll-system fingerprint consistent across stubs.
- Local: letter authored in a word processor (Word, Google Docs) rather than
  an HR/payroll system → Soft (common for small employers).
- Public (AI): employer exists (website, registry, Google Maps), applicant's
  LinkedIn/public profile shows the same employer and title.
- Letterhead contacts (owner's rule): compare **only the email domain and
  office address** on the letter against the **company's own website**.
  Mismatch or not found → **Soft only**, never Red — many companies don't
  publish office addresses and use several email domains. A free-mail
  address (gmail, outlook) on a letter from a large employer → Soft.
- Salary vs title: AI searches range for title + city; local compare.
  Mismatch is **Soft** ("ask about it"), never Red — titles vary widely by
  company size and industry.

### 7.4 Tribunal and court history (public)

- Search CanLII (Ontario LTB decisions) and the web by name.
- A hit counts only with a **link to the actual decision** and at least one
  matching detail (city/province, timeframe; street address matching is
  done locally if the decision lists one). Otherwise: "possible same-name
  match, unverified".
- Report always states that most LTB orders are unpublished; "nothing found"
  ≠ clean; FrontLobby/equivalent remains the paid final step.

### 7.5 Landlord references (public + guidance)

Owner allowed the reference's details to go to AI + search. Specific checks
are the builder's call:

- Check the reference's name/phone/address against public info: does the
  reference plausibly own or manage that address; is the phone number the
  applicant's own or tied to an unrelated person/business.
- Give the realtor a short list of call questions designed to catch a friend
  posing as a landlord.

### 7.6 ID (local)

OCR name/DOB and compare to credit report (7.2). The report states plainly
that ID authenticity cannot be verified.

## 8. Rulebook and learning

- `rulebook/` holds one entry per known report style: identifying
  fingerprint, field font rules, gauge model + tolerance, postal format per
  field, expected producers.
- **"Learn template" command**: given a genuine file, extract its
  fingerprint (formats only) and propose a rulebook entry for review.
- **Only maintainers change the rulebook** (builder's call): a learned fake
  would otherwise be trusted as genuine, and a non-technical user cannot
  review an entry. The rulebook ships as fixed data built into
  `checker.html` and the CLI. Users who meet an unknown style run "learn
  template" and send the PII-free fingerprint to the maintainer; the
  maintainer validates it against other samples before merging.
- Initial styles from samples: Equifax consumer disclosure (21 pp, FreeSans,
  A4, server-generated), TransUnion consumer disclosure
  (`ConsumerDisclosureService`, encrypted), Equifax pages printed from a
  browser (varies by device — style rules weaker, file-history rules apply).

## 9. Testing

- Local test corpus at a path given by env var (owner's:
  `<private samples folder>`, 40 genuine files + 2 fakes in
  `fake/`). **Never committed.** Files referenced by content-hash IDs only;
  the owner holds a private ID → filename map inside the corpus folder.
- **Builder access:** the builder (Claude in this repo) may run scripts over
  the corpus directly, as long as script output is PII-free by
  construction. The builder never opens corpus files itself. The two fakes
  are the only exception: the owner redacted them and permitted viewing.
- Corpus is **partly grouped by applicant** (per-tenant subfolders exist;
  the owner confirmed at least one pair of credit reports from the same
  applicant). Cross-document checks are tested on these real groups for
  false Reds, plus synthetic packages for forgery cases.
- Acceptance: every genuine sample produces **zero Red flags**; fake #1
  (screenshot) is Red for gauge offset; fake #2 (screenshot) is at least
  Soft for the date-line typeface (Red is possible only on PDFs).
- Synthetic forgeries generated locally from genuine samples (score text
  changed, pointer moved, date retyped in another font, Word re-save,
  incremental edit) for regression tests.
- Committed tests use synthetic, PII-free fixtures only.
- All test and probe output must be PII-free (no text, names, numbers, file
  names); scripts read untrusted files, run Python helpers with `-I`.

## 10. Evidence gathered so far (PII-free)

| Finding | Source |
|---|---|
| Gauge uses equal-width bands; genuine pointer error 0.6 pt; fake ≈ 10 pt | 2 genuine Equifax disclosures + fake #1 |
| Date line font must match header (FreeSans 14) | same genuine pair + fake #2 |
| Spaced postal codes in address fields of genuine Equifax/TransUnion reports | 3 genuine reports |
| Linearized PDFs falsely look like incremental edits | graduation letter + Equifax print |
| Public US TransUnion guide carries stale values in hidden text layer | cameonetwork.org guide |
| 11 of 40 sample files are image-only → local OCR is core | fingerprint scan |
| Public Equifax/TransUnion guides describe lender (business) reports, not consumer downloads | both guides |

## 11. Left to the builder

- Exact module layout, pdf.js/tesseract.js versions, how the HTML bundles
  dependencies (inline vs CDN — no applicant data may be sent either way).
- Summary JSON schema (must exclude all local-only fields by construction).
- Tolerances, tuned on the genuine corpus.
- Report template wording.
- Whether references (7.5) need more than guidance in v1.
