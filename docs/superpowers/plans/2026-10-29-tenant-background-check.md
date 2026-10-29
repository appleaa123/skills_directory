# Tenant Background Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local, privacy-preserving checker (double-click HTML + Node CLI, one shared JS engine) that flags doctored credit reports and cross-document inconsistencies, plus a portable skill/instruction pack that does public research and writes the screening report.

**Architecture:** Pure-JS engine in `src/engine/` operating on bytes and RGBA pixel buffers, so it runs unchanged in the browser and in Node. Front ends: `src/cli/` (Node) and `src/web/` (bundled into one `dist/checker.html`). The engine's only output to the outside world is an allowlisted, PII-free summary. Rules about genuine report styles live in `rulebook/styles.json`.

**Tech Stack:** Node ≥ 18 (ESM), `node:test`, pdfjs-dist (legacy build), jszip, tesseract.js, jpeg-js, pngjs; dev: esbuild, pdf-lib, @playwright/test.

**Spec:** `docs/superpowers/specs/2026-10-29-tenant-background-check-design.md`

## Global Constraints

- All code lives in `tenant_background_check_skill/`; follow sibling skill layout (`SKILL.md`, `AGENTS.md`, `README.md`, `install.sh`, `.claude-plugin/`, `references/`, `evals/`).
- Local-only data (spec §5) never appears in summary output: credit report contents, paystub contents, ID contents, salary, DOB, street addresses, SIN, scores, account numbers, file names.
- Allowed in summary: applicant name; city, province, country; employer name; job title; letterhead email domain and office address; landlord reference name, phone, address; flag codes/severities; match statuses; salary verdict (`below|within|above`).
- Severities exactly: `red`, `soft`, `unverifiable`, `ok`. Output never says "genuine" or "authentic".
- Every rule must yield zero `red` flags on every genuine corpus file before merge.
- Corpus (`CORPUS_DIR`, owner's: `<private samples folder>`) is never committed, never opened by the builder directly; corpus scripts print only content-hash IDs (first 6 hex of SHA-256), flag codes, and numbers that are not document values.
- Committed fixtures are synthetic only.
- Only maintainers edit `rulebook/styles.json`.
- Commit format: `<type>(<scope>): <subject>`, ≤ 50 chars, imperative, no trailing period. Scope `tbc`.

## Review Focus

1. **Password-protected / encrypted PDFs** (both TransUnion and old Equifax samples are encrypted with an empty user password) → must decrypt with empty password and check normally; if a real password is needed → `unverifiable`, never a crash. Test in Task 2.
2. **Zip with nested folders, macOS junk (`__MACOSX/`, `.DS_Store`), and duplicate files** → junk ignored, duplicates (same hash) reported once. Test in Task 1.
3. **Unparseable or truncated file** (corrupt PDF, renamed `.docx`, HEIC photo) → one `unverifiable` flag with code `UNREADABLE_FILE` for that doc; other docs still checked. Test in Task 10.
4. **Name variants across documents** (case, accents, middle name present/absent, "Last, First" order) → `match`, not `mismatch`. Test in Task 9.
5. **Flag messages leaking values** (a template that interpolates the score or address) → summary PII-injection test fails. Test in Task 10.

---

## File Structure

```
tenant_background_check_skill/
  package.json                 scripts: test, build, corpus
  rulebook/styles.json         genuine-style fingerprints (maintainer-only)
  src/engine/
    flags.js                   severities, makeFlag, flag code catalogue (message templates, no values)
    load.js                    loadPackage: unzip, junk filter, hash IDs, classify by magic bytes
    pdf/extract.js             extractPdf: metadata, spans (text, x, y, w, h, font, size), render modes
    pdf/revisions.js           analyzeRevisions: linearization, incremental saves, what each touches
    image/ocr.js               ocrImage: tesseract.js → spans (font: null)
    image/gauge-pixels.js      findGaugeInImage: bar, dividers, pointer from RGBA
    style.js                   fingerprint, identifyStyle
    checks/file-history.js
    checks/template.js         fonts per anchor, range labels, score label, date, postal per field
    checks/gauge.js            expectedPointerX + PDF and image gauge checks
    checks/text-layer.js       invisible and stacked text
    checks/image-font.js       per-char width ratio between anchor lines (soft)
    checks/identity.js         application ↔ documents verification
    checks/paystub.js
    checks/employment.js
    checks/salary.js
    application.js             Application schema + validation
    run.js                     runChecks orchestration
    summary.js                 buildSummary (allowlist) + renderSummaryText
  src/node/decode.js           jpeg-js / pngjs → RGBA
  src/cli/index.js             `tbc check | salary | learn`
  src/web/index.html, main.js  checker UI (form, drop zone, summary, salary box)
  build/build-html.js          esbuild → dist/checker.html (single file)
  dist/checker.html            built artifact, committed for non-technical users
  tests/unit/*.test.js
  tests/fixtures/make.js       synthetic PDF/image builders (pdf-lib, raw RGBA)
  tests/corpus/corpus.test.js  skipped unless CORPUS_DIR set
  tests/e2e/checker.spec.js    Playwright smoke on dist/checker.html
  SKILL.md, AGENTS.md, README.md, install.sh, .claude-plugin/{plugin,marketplace}.json
  references/{privacy-rules,public-research,report-template,reference-call-questions}.md
  settings/claude-code-permissions.json
  evals/tenant-background-check.eval.md
```

Shared types (JSDoc in `flags.js`, used everywhere):

```js
/** @typedef {'red'|'soft'|'unverifiable'|'ok'} Severity */
/** @typedef {{code:string, severity:Severity, docId:string|null, message:string}} Flag */
/** @typedef {{text:string, x:number, y:number, w:number, h:number, font:string|null, size:number}} Span */
/** @typedef {{id:string, kind:'pdf'|'image'|'other', bytes:Uint8Array, docType?:string}} Doc */
/** @typedef {{width:number, height:number, data:Uint8ClampedArray}} Rgba */   // RGBA, row-major
```

---

### Task 1: Scaffold, flags, package loader

**Files:**
- Create: `tenant_background_check_skill/package.json`, `src/engine/flags.js`, `src/engine/load.js`, `tests/unit/load.test.js`, `tests/unit/flags.test.js`, `.gitignore` (adds `node_modules/`, `.tbc-state.json`)

**Interfaces:**
- Produces: `makeFlag(code: string, docId: string|null): Flag` (severity and message come from catalogue `FLAG_CODES[code] = {severity, message}`; unknown code throws); `SEVERITIES`; `async loadPackage(entries: {name:string, bytes:Uint8Array}[]): Promise<Doc[]>`; `async contentId(bytes): Promise<string>` (6 hex, SHA-256 via `globalThis.crypto.subtle`).

- [ ] **Step 1: Write failing tests**

```js
test('makeFlag uses catalogue severity and message', () => {
  const f = makeFlag('UNREADABLE_FILE', 'ab12cd');
  assert.deepEqual(Object.keys(f).sort(), ['code','docId','message','severity']);
  assert.equal(f.severity, 'unverifiable');
});
test('makeFlag rejects unknown codes', () => assert.throws(() => makeFlag('NOPE', null)));
test('loadPackage expands zip, drops __MACOSX/.DS_Store, dedupes by hash', async () => {
  // zip built in-test with jszip: a.pdf, sub/b.jpg, __MACOSX/._a.pdf, .DS_Store, sub/a-copy.pdf (same bytes as a.pdf)
  const docs = await loadPackage([{ name: 'pkg.zip', bytes: zipBytes }]);
  assert.deepEqual(docs.map(d => d.kind).sort(), ['image','pdf']);
  assert.ok(docs.every(d => /^[0-9a-f]{6}$/.test(d.id)));
  assert.ok(docs.every(d => !('name' in d)));          // file names never kept
});
test('classify by magic bytes, not extension', async () => {
  const [d] = await loadPackage([{ name: 'x.jpg', bytes: pdfBytes }]);
  assert.equal(d.kind, 'pdf');
});
```

- [ ] **Step 2: Run `npm test` in `tenant_background_check_skill/` — expect FAIL (modules missing)**
- [ ] **Step 3: Implement.** `package.json`: `"type":"module"`, `"engines":{"node":">=18"}`, scripts `test: node --test tests/unit`, `corpus: node --test tests/corpus`, `build: node build/build-html.js`. Magic bytes: `%PDF` → pdf; `FFD8FF` / `89504E47` → image; else other. Initial catalogue entries: `UNREADABLE_FILE` (unverifiable). Later tasks add their codes to the catalogue.
- [ ] **Step 4: Run `npm test` — expect PASS**
- [ ] **Step 5: Commit** `feat(tbc): scaffold engine, flags and loader`

---

### Task 2: PDF extraction

**Files:**
- Create: `src/engine/pdf/extract.js`, `tests/fixtures/make.js`, `tests/unit/extract.test.js`

**Interfaces:**
- Consumes: `Doc` from Task 1.
- Produces: `async extractPdf(bytes): Promise<{ok:true, encrypted:boolean, meta:{producer?:string, creator?:string, creationDate?:string, modDate?:string}, pages:{width:number, height:number, spans:Span[], invisibleSpans:Span[], imageCount:number}[]} | {ok:false, reason:'password'|'corrupt'}>`; `async extractPdfImages(bytes, pageIndex): Promise<Rgba[]>` (decoded embedded images via `page.objs` after `getOperatorList()` — used to OCR image-only pages without a canvas dependency); fixture helpers `async makePdf(lines: {text, x, y, size, font?:'Helvetica'|'Courier'}[], opts?:{producer?, encrypt?:boolean}): Uint8Array`.

- [ ] **Step 1: Write failing tests**

```js
test('spans carry real base font name and position', async () => {
  const pdf = await makePdf([{ text: 'Equifax Canada Co.', x: 400, y: 760, size: 14 }]);
  const r = await extractPdf(pdf);
  const s = r.pages[0].spans.find(s => s.text.includes('Equifax'));
  assert.equal(s.font, 'Helvetica'); assert.equal(s.size, 14);
  assert.ok(Math.abs(s.x - 400) < 0.5);
});
test('metadata producer is read', async () => {
  const r = await extractPdf(await makePdf([], { producer: 'Skia/PDF m81' }));
  assert.equal(r.meta.producer, 'Skia/PDF m81');
});
test('empty-password encrypted PDF opens', async () => {   // Review Focus 1
  const r = await extractPdf(await makePdf([{ text: 'hi', x: 10, y: 10, size: 10 }], { encrypt: true }));
  assert.equal(r.ok, true); assert.equal(r.encrypted, true);
});
test('extractPdfImages returns RGBA of an embedded image', async () => {
  const [img] = await extractPdfImages(await makePdf([], { image: PNG_4x4_RED }), 0);
  assert.equal(img.width, 4); assert.equal(img.data[0], 255);
});
test('corrupt bytes → ok:false reason corrupt', async () => {
  assert.deepEqual(await extractPdf(new TextEncoder().encode('%PDF-1.4 garbage')), { ok: false, reason: 'corrupt' });
});
```

- [ ] **Step 2: Run `npm test` — expect FAIL**
- [ ] **Step 3: Implement** with `pdfjs-dist/legacy/build/pdf.mjs`. Real font name: call `page.getOperatorList()` first, then `page.commonObjs.get(item.fontName).name`, strip subset prefix `ABCDEF+`. Size = `hypot(transform[0], transform[1])`. Invisible text: spans drawn while text render mode is 3 (track `OPS.setTextRenderingMode` in the operator list). If pdf-lib can't encrypt, generate the encrypted fixture once with `qpdf --encrypt "" ""` and commit it under `tests/fixtures/encrypted.pdf` (synthetic content).
- [ ] **Step 4: Run `npm test` — expect PASS**
- [ ] **Step 5: Commit** `feat(tbc): extract PDF spans, fonts, metadata`

---

### Task 3: Revision analysis and file-history checks

**Files:**
- Create: `src/engine/pdf/revisions.js`, `src/engine/checks/file-history.js`, `tests/unit/file-history.test.js`

**Interfaces:**
- Produces: `analyzeRevisions(bytes): {linearized:boolean, revisions:{touchesPageContent:boolean, addsFonts:boolean, annotTypes:string[], signatureOnly:boolean}[]}` (revisions after the first real one); `checkFileHistory(doc, extracted, style|null): Flag[]`.
- New flag codes: `PRODUCER_UNEXPECTED` (red), `EDITING_TOOL_PRODUCER` (red), `LATER_REVISION_CHANGES_CONTENT` (red), `REPROCESSED_BY_OTHER_TOOL` (soft), `METADATA_STRIPPED` (soft: credit report PDF with no producer and no creator).

- [ ] **Step 1: Write failing tests** (byte fixtures built in-test by concatenating a base PDF with hand-written revision text)

```js
test('linearized file with two %%EOF is not an edit', () => {
  const r = analyzeRevisions(linearizedBytes);           // '/Linearized' within first 2048 bytes
  assert.equal(r.linearized, true); assert.equal(r.revisions.length, 0);
});
test('appended revision replacing /Contents and adding /Font → red', () => {
  const flags = checkFileHistory(doc(appendedContentRevision), extracted, null);
  assert.ok(flags.some(f => f.code === 'LATER_REVISION_CHANGES_CONTENT' && f.severity === 'red'));
});
test('appended revision with only /Sig + /AcroForm → no red', () => { /* signatureOnly */ });
test('producer "Adobe Photoshop" on credit report → red', () => { /* docType 'credit_report' */ });
test('Chrome producer + linearized → soft REPROCESSED_BY_OTHER_TOOL', () => {});
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement.** Editing-tool producer list: `Photoshop, Illustrator, Canva, iLovePDF, Smallpdf, Sejda, PDFescape, Foxit PhantomPDF, Microsoft Word, Acrobat Pro` → red only when `doc.docType === 'credit_report'`. `PRODUCER_UNEXPECTED` only when a style is identified and its `expectedProducers` regexes don't match.
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit** `feat(tbc): detect real PDF edits, skip linearized`

---

### Task 4: Rulebook, fingerprint, style identification

**Files:**
- Create: `rulebook/styles.json` (schema + empty `styles: []` for now), `src/engine/style.js`, `tests/unit/style.test.js`

**Interfaces:**
- Produces: `fingerprint(extracted): {producer, creator, pageCount, pageSize:[w,h], fonts:string[], anchors:{text:string, font:string, size:number}[]}` — anchors are only spans whose text matches a fixed `ANCHOR_PHRASES` list (labels, never values); `identifyStyle(fp, rulebook): Style|null`; `classifyDocType(text: string): 'credit_report'|'paystub'|'employment_letter'|'bank_statement'|'id'|'other'`.
- Style schema:

```json
{ "id": "equifax-consumer-disclosure",
  "match": { "producer": "^Skia/PDF", "creator": "^Chromium$", "pageSize": [595, 842], "requiredAnchors": ["Further to your request", "Equifax Canada Co."] },
  "expectedProducers": ["^Skia/PDF"],
  "anchorFonts": [ { "phrase": "Further to your request", "font": "FreeSans", "size": 14, "sameAs": "Equifax Canada Co." } ],
  "gauge": { "pointerGlyph": "▼", "bands": [[300,559],[560,659],[660,724],[725,759],[760,900]],
             "rangeLabels": ["300-559","560-659","660-724","725-759","760-900"],
             "pointerOffsetFromFirstRangeLabel": null, "tolerancePt": 2.0, "imageToleranceBarFraction": 0.015 },
  "postal": { "addressLabels": ["Current Address", "Previous Address", "Former Address"], "addressFormat": "spaced" },
  "dateFormat": "^\\d{4}/\\d{2}/\\d{2}$" }
```

- [ ] **Step 1: Write failing tests**

```js
test('fingerprint never contains non-anchor text', async () => {
  const fp = fingerprint(await extractPdf(await makePdf([
    { text: 'Further to your request', x: 50, y: 700, size: 14 },
    { text: 'JANE DOE 123 MAIN ST', x: 50, y: 680, size: 10 }])));
  assert.ok(!JSON.stringify(fp).includes('JANE'));
});
test('identifyStyle matches by producer, page size, anchors', () => {});
test('identifyStyle returns null for unknown layout', () => {});
test('classifyDocType', () => {
  assert.equal(classifyDocType('Equifax Credit Score ... Further to your request'), 'credit_report');
  assert.equal(classifyDocType('Gross Pay  Net Pay  YTD'), 'paystub');
});
```

- [ ] **Step 2: Run — FAIL.** **Step 3: Implement.** Keyword sets from spec probe (equifax, transunion, credit score / paystub: gross pay, net pay, ytd / employment: "to whom it may concern", "is employed" / bank: opening balance / id: driver's licence, passport). **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `feat(tbc): add rulebook schema and style matching`

---

### Task 5: Template checks

**Files:**
- Create: `src/engine/checks/template.js`, `tests/unit/template.test.js`

**Interfaces:**
- Consumes: `Style`, `extractPdf` result.
- Produces: `checkTemplate(doc, extracted, style, now?: Date): Flag[]`.
- New codes: `ANCHOR_FONT_MISMATCH` (red), `RANGE_LABELS_NONSTANDARD` (red), `SCORE_LABEL_MISMATCH` (red), `DATE_FORMAT_UNEXPECTED` (soft), `POSTAL_FORMAT_UNEXPECTED` (soft — only two genuine samples so far), `SCORE_AT_BAND_FLOOR` (soft), `REPORT_DATE_OLD` (soft: report date more than 30 days before the run date), `STYLE_UNKNOWN` (unverifiable).

- [ ] **Step 1: Write failing tests** — synthetic style `test-style` (Helvetica anchors) and PDFs:
  - anchor "Further to your request" in Courier while "Equifax Canada Co." in Helvetica → `ANCHOR_FONT_MISMATCH` red
  - same anchor in Helvetica 14 → no flags
  - two 3-digit score spans with different values → `SCORE_LABEL_MISMATCH`
  - range labels `300-559 … 760-900` with one changed to `725-760` → `RANGE_LABELS_NONSTANDARD`
  - address line `Current Address: 1 X ST, TORONTO, ON, M2M4G3` under `addressFormat: spaced` → soft
  - score 725 → `SCORE_AT_BAND_FLOOR` soft; 731 → none
  - report date 45 days before run date → `REPORT_DATE_OLD` soft; 10 days → none (inject run date as a parameter: `checkTemplate(doc, extracted, style, now = new Date())`)
  - `style === null` → exactly `[STYLE_UNKNOWN]`
- [ ] **Step 2: Run — FAIL. Step 3: Implement** (postal regex `[A-Z]\d[A-Z] ?\d[A-Z]\d`, evaluated only on spans on the same line as an `addressLabels` label). **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `feat(tbc): add template rule checks`

---

### Task 6: Gauge check (PDF)

**Files:**
- Create: `src/engine/checks/gauge.js`, `tests/unit/gauge.test.js`

**Interfaces:**
- Produces: `expectedPointerFraction(score:number, bands:number[][]): number` (0..5, in band widths); `checkGaugePdf(doc, extracted, style): Flag[]`; `checkGaugeImage(doc, gauge: GaugePixels, score:number, style): Flag[]` (Task 8 supplies `GaugePixels`).
- New codes: `GAUGE_POINTER_MISMATCH` (red), `GAUGE_NOT_FOUND` (unverifiable).

Model (spec §7.1, measured):

```
k     = index of band containing score
frac  = (score − band.low) / (band.high − band.low + 1)
bandW = (x(lastRangeLabel) − x(firstRangeLabel)) / 4
PDF:   expectedX = x(firstRangeLabel) + style.gauge.pointerOffsetFromFirstRangeLabel + (k + frac) × bandW
       compare to x(pointerGlyph span); fail if |Δ| > tolerancePt
Image: expectedX = barLeft + (k + frac) × (barRight − barLeft) / 5
       fail if |Δ| > imageToleranceBarFraction × (barRight − barLeft)
```

- [ ] **Step 1: Write failing tests**

```js
test('fraction at band floor', () => assert.equal(expectedPointerFraction(725, BANDS), 3));
test('fraction inside band', () => assert.ok(Math.abs(expectedPointerFraction(742, BANDS) - (3 + 17/35)) < 1e-9));
test('PDF pointer on model → no flag; 10pt off → red', () => { /* synthetic: range labels 70.3pt apart, pointer glyph '^' in test-style */ });
test('image: fake-like geometry (bar 362–1075, pointer 810, score 725) → red', () => {
  const flags = checkGaugeImage(doc, { barLeft: 362, barRight: 1075, pointerX: 810 }, 725, STYLE);
  assert.equal(flags[0].code, 'GAUGE_POINTER_MISMATCH');
});
test('image: pointer at 789 for 725 → no flag', () => {});
test('pointerOffsetFromFirstRangeLabel null → GAUGE_NOT_FOUND unverifiable, not red', () => {});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `feat(tbc): check gauge pointer against score`

---

### Task 7: Text-layer checks

**Files:**
- Create: `src/engine/checks/text-layer.js`, `tests/unit/text-layer.test.js`

**Interfaces:**
- Produces: `checkTextLayer(doc, extracted): Flag[]`.
- New codes: `INVISIBLE_TEXT` (red when the PDF also has visible text; skip when the page is image-only, since OCR'd scans legitimately carry invisible text), `STACKED_TEXT` (red: two spans with different text whose boxes overlap ≥ 50% of the smaller box).

- [ ] **Step 1: Failing tests:** stacked `725` over `655` at same x,y → red; render-mode-3 span on a page with visible text → red; render-mode-3 text on an image-only page → no flag; adjacent non-overlapping spans → no flag.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(tbc): flag invisible and stacked text`

---

### Task 8: Image path — decode, OCR, gauge pixels, typeface ratio

**Files:**
- Create: `src/node/decode.js`, `src/engine/image/ocr.js`, `src/engine/image/gauge-pixels.js`, `src/engine/checks/image-font.js`, `tests/unit/image.test.js`

**Interfaces:**
- Produces: `decodeImage(bytes): Rgba` (Node only); `async ocrImage(rgba): Promise<Span[]>` (word-level spans, `font: null`, `size` = box height); `findGaugeInImage(rgba): {barLeft, barRight, pointerX}|null`; `checkImageTypeface(doc, spans, style): Flag[]`.
- New code: `IMAGE_TYPEFACE_DIFFERS` (soft).
- Style addition: `anchorFonts[].charWidthRatioToSameAs: number` (expected per-character width of the anchor line ÷ that of the `sameAs` line; measured from genuine PDFs in Task 12), `imageRatioTolerance: 0.08`.

Gauge pixel algorithm (not determined by the signature):

```
1. bar row = longest horizontal run of saturated (S > 0.35), non-grey pixels spanning ≥ 40% of width
2. barLeft/barRight = ends of that run
3. pointerX = centroid x of dark pixels (luma < 60) in the strip [barTop − 30px, barTop − 2px]
   between barLeft and barRight (the ▼ sits just above the bar; the score text sits higher)
4. null if any step finds nothing
```

- [ ] **Step 1: Failing tests** — generate RGBA in-test: white canvas 1100×350, gradient bar y 143–178 from x 362 to 1075, black triangle centred at x 810 rows 120–138, black "text" block rows 95–112:
  - `findGaugeInImage` → barLeft 362 ± 2, barRight 1075 ± 2, pointerX 810 ± 2
  - blank image → null
  - `checkImageTypeface`: OCR-like spans where the anchor line's per-char width / sameAs line's = 1.00 × expected → none; 1.15 × → soft
  - `ocrImage` smoke on an image of rendered text "POOR FAIR GOOD" (fixture PNG committed, synthetic) returns ≥ 3 spans (mark `{ timeout: 60000 }`)
- [ ] **Step 2: FAIL. Step 3: Implement** (tesseract.js `createWorker('eng')`, reuse one worker per run). **Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(tbc): add OCR and image gauge detection`

---

### Task 9: Application input, identity, paystub, employment, salary

**Files:**
- Create: `src/engine/application.js`, `src/engine/checks/identity.js`, `src/engine/checks/paystub.js`, `src/engine/checks/employment.js`, `src/engine/checks/salary.js`, `tests/unit/people.test.js`

Decision (builder): instead of guessing fields out of free-form documents, the user enters the application's stated facts once (form in HTML, `application.json` in CLI); local code **verifies** them against each document. Extraction remains only for credit-report labelled fields and letterhead contacts.

**Interfaces:**
- Produces:
  - `validateApplication(obj): Application` — `{name:string, dob?:'YYYY-MM-DD', currentAddress?:string, city:string, province:string, country:string, employer:string, title:string, annualSalary?:number, reference?:{name, phone, address}}`; throws listing missing required fields (`name, city, province, country, employer, title`).
  - `verifyIdentity(app, docs: {id, docType, text}[]): {field:'name'|'dob'|'address'|'employer'|'title', docId:string, status:'match'|'mismatch'|'missing'}[]`
  - `normalizeName(s): string[]` (token set: lowercase, accents stripped, punctuation removed)
  - `checkPaystubs(stubs: {id, text}[]): Flag[]` — codes `PAYSTUB_DUPLICATE_EXCEPT_DATES` (red), `PAYSTUB_NET_EXCEEDS_GROSS` (red), `PAYSTUB_YTD_NOT_INCREASING` (red), `PAYSTUB_UNPARSEABLE` (unverifiable)
  - `checkEmploymentLetter(doc, extracted): {flags: Flag[], letterhead:{emailDomain?:string, officeAddress?:string}}` — `LETTER_WORD_PROCESSOR` (soft, producer Word/Google Docs/Skia-without-system), `LETTER_FREEMAIL` (soft)
  - `compareSalary(annualSalary:number, range:{low:number, high:number}): 'below'|'within'|'above'`
- Name match rule: every token of the shorter name appears in the longer (order-free) → `match`; DOB matched across formats `YYYY/MM/DD`, `YYYY-MM-DD`, `DD/MM/YYYY`, `Month D, YYYY`; address compared on civic number + postal code (space-insensitive).

- [ ] **Step 1: Failing tests**

```js
test('name variants match', () => {                                // Review Focus 4
  for (const v of ['DOE, JANE', 'Jane Q. Doe', 'jane doé'])
    assert.equal(verifyIdentity({ ...APP, name: 'Jane Doe' }, [{ id: 'a1', docType: 'credit_report', text: `Name: ${v}` }])[0].status, 'match');
});
test('different surname mismatches', () => {});
test('field absent from doc → missing', () => {});
test('validateApplication lists missing required fields', () => assert.throws(() => validateApplication({}), /name.*city.*employer/s));
test('two stubs identical except dates → red', () => {});
test('net > gross → red', () => {});
test('compareSalary', () => {
  assert.equal(compareSalary(60000, { low: 150000, high: 250000 }), 'below');
  assert.equal(compareSalary(180000, { low: 150000, high: 250000 }), 'within');
});
test('letterhead email domain extracted; gmail on letter → soft', () => {});
```

- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(tbc): verify identity, paystubs, employment`

---

### Task 10: Orchestration and PII-free summary

**Files:**
- Create: `src/engine/run.js`, `src/engine/summary.js`, `tests/unit/summary.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `async runChecks(entries, app, rulebook, env: {decodeImage(bytes): Promise<Rgba>}): Promise<RunState>` — `RunState = {docs:{id, kind, docType, styleId|null}[], flags:Flag[], identity:…[], letterhead:{…}, salaryVerdict:null}` (kept in memory / local state file; contains no document text).
  - `buildSummary(state, app): Summary` — **constructed field-by-field from the allowlist in Global Constraints**; never spreads `state` or `app`.
  - `renderSummaryText(summary): string` — plain text block for pasting into an AI, opens with the line `TENANT CHECK SUMMARY (no sensitive data) — v1`.
- Severity per doc rolls up: any red → doc red.
- Image docs and image-only PDF pages: `decodeImage` (Node) / browser decoder, or `extractPdfImages` → `ocrImage` → spans feed `classifyDocType`, `verifyIdentity`, `findGaugeInImage` + `checkGaugeImage`, `checkImageTypeface`. `runChecks` takes the decoder as a parameter: `runChecks(entries, app, rulebook, {decodeImage})` so the engine stays environment-free.

- [ ] **Step 1: Failing tests**

```js
test('summary never contains local-only values', async () => {          // Review Focus 5
  const PII = ['1985-03-14', '123 Secret St', '999-999-999', '87500', '742', 'M2M 4G3'];
  // synthetic package: credit report PDF containing all PII values, paystub with 87500, app with dob/address/salary
  const s = renderSummaryText(buildSummary(await runChecks(entries, app, RULEBOOK, { decodeImage }), app));
  for (const v of PII) assert.ok(!s.includes(v), `leaked ${v}`);
  assert.ok(s.includes('Jane Doe') && s.includes('Toronto'));
});
test('corrupt file yields UNREADABLE_FILE and others still checked', async () => {});   // Review Focus 3
test('summary never contains the words genuine/authentic', async () => {});
```

- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(tbc): orchestrate checks, build safe summary`

---

### Task 11: CLI

**Files:**
- Create: `src/cli/index.js` (bin `tbc`), `tests/unit/cli.test.js`

**Interfaces:**
- `tbc check <folder|zip> [--app <application.json>]` → prints `renderSummaryText` to stdout, writes `<folder>/.tbc-state.json` (RunState + nothing else). Default `--app` = `<folder>/application.json`. Exit 0 always on completed run; exit 2 on bad arguments / invalid application.
- `tbc salary <folder> --range <low>-<high>` → reads state + application locally, prints exactly `Salary vs typical range for "<title>" in <city>: below|within|above`.
- `tbc learn <file.pdf>` → prints the PII-free `fingerprint` JSON plus measured `charWidthRatioToSameAs` for anchors, for a maintainer to review.

- [ ] **Step 1: Failing tests** (spawn `node src/cli/index.js` on a temp folder of synthetic fixtures): `check` stdout starts with the summary header and contains no fixture PII; `salary --range 150000-250000` prints `below` for salary 60000; missing `--range` → exit 2; `learn` output contains no non-anchor text.
- [ ] **Step 2: FAIL. Step 3: Implement** (`node:util parseArgs`, no CLI framework). **Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(tbc): add check, salary and learn commands`

---

### Task 12: Calibrate rulebook on the corpus

**Files:**
- Modify: `rulebook/styles.json` (Equifax consumer disclosure, TransUnion consumer disclosure entries)
- Create: `tests/corpus/corpus.test.js`, `tests/corpus/calibrate.js`

Builder runs scripts on `CORPUS_DIR`; never opens files. All output: content-hash IDs + codes + non-document numbers only.

**Interfaces:**
- `calibrate.js`: for every corpus PDF identified as a style candidate, prints `id, styleCandidate, fingerprint`, and for gauge pages the implied `pointerOffsetFromFirstRangeLabel` (offset only — not score) and anchor char-width ratios; maintainer copies median values into `styles.json`.
- `corpus.test.js` (skipped if `!process.env.CORPUS_DIR`): loads every file outside `fake/` per top-level subfolder (applicant group) with an empty-but-valid synthetic application; asserts **zero red flags**; asserts the gauge fake (`fake/` image whose content ID is in `KNOWN_FAKES.gauge`) yields `GAUGE_POINTER_MISMATCH`, and the letter fake (`KNOWN_FAKES.dateLine`) yields `IMAGE_TYPEFACE_DIFFERS`. Failing output names only IDs and codes.

- [ ] **Step 1: Run `CORPUS_DIR=<private samples folder> node tests/corpus/calibrate.js`** from the skill folder (script lives outside the corpus) — record offsets; expect the two Equifax disclosures (`5ee339`, `af7068`) to agree within 0.6 pt.
- [ ] **Step 2: Fill `styles.json`** with measured values; TransUnion entry from `1f69b2` fingerprint (gauge omitted unless present).
- [ ] **Step 3: Write `corpus.test.js`; run `CORPUS_DIR=<private samples folder> npm run corpus`** — expect PASS. If a genuine file gets red: inspect the rule via PII-free probes, loosen or scope the rule, re-run; never weaken by deleting the assertion.
- [ ] **Step 4: Run `npm test`** — unit tests still PASS.
- [ ] **Step 5: Commit** `feat(tbc): calibrate rulebook on genuine samples` (rulebook + scripts only; nothing from corpus)

---

### Task 13: Double-click HTML checker

**Files:**
- Create: `src/web/index.html`, `src/web/main.js`, `build/build-html.js`, `dist/checker.html`, `tests/e2e/checker.spec.js`, `playwright.config.js`

**Interfaces:**
- Consumes: `runChecks`, `buildSummary`, `renderSummaryText`, `compareSalary`, bundled `rulebook/styles.json`.
- UI (single page): (1) application form (fields of `Application`); (2) drop zone / file picker (zip or files); (3) **Run check** → summary in a read-only textarea + **Copy summary** button; (4) salary box: "Paste the salary range your AI found" (`low`/`high`) → shows `below|within|above`. A banner states: "Files stay on this computer. Only the summary below is meant to be shared."
- Browser decode via `createImageBitmap` + `OffscreenCanvas` → `Rgba`. pdf.js worker and tesseract worker/core/lang may load from a pinned CDN (no applicant data sent); everything else inlined by esbuild into `dist/checker.html`.

- [ ] **Step 1: Write failing Playwright test:** open `file://…/dist/checker.html`, fill form, upload synthetic zip, click Run, expect summary textarea to contain `TENANT CHECK SUMMARY` and not contain fixture PII; enter range → shows `below`. Also assert via `page.on('request')` that no request body contains fixture bytes or PII (only GETs to the pinned CDN).
- [ ] **Step 2: `npm run build && npx playwright test` — FAIL. Step 3: Implement. Step 4: PASS.**
- [ ] **Step 5: Commit** `feat(tbc): add double-click HTML checker`

---

### Task 14: Skill / instruction pack and packaging

**Files:**
- Create: `SKILL.md`, `AGENTS.md`, `README.md`, `install.sh` (from sibling template, `SKILL_NAME="tenant-background-check"`), `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `references/privacy-rules.md`, `references/public-research.md`, `references/report-template.md`, `references/reference-call-questions.md`, `settings/claude-code-permissions.json`, `evals/tenant-background-check.eval.md`

Content requirements (from spec; wording is the builder's):
- `SKILL.md`: two entry modes — (a) user pastes a `TENANT CHECK SUMMARY`; (b) CLI agent runs `tbc check <folder>` itself. Hard rules: never open files in the applicant folder; only read the summary; state that name/employer/city/reference details go to the AI vendor and search engine. Research steps: LinkedIn/public profile (employer + title), employer existence (website, registry, maps), letterhead email domain + office address vs company website (**soft only**), CanLII LTB + web by name with city/province (a hit needs a decision URL + matching city/province or timeframe, else "possible same-name match, unverified"; always say most LTB orders are unpublished and nothing-found ≠ clean), salary range for title + city → hand back to `tbc salary` or the HTML salary box (never ask for the salary), reference checks (owns/manages address? phone tied to applicant?).
- `report-template.md`: sections Red flags / Soft flags / Could not verify / Questions to ask the applicant / Recommended next step (paid FrontLobby-or-equivalent check only if no red flags). Forbidden words: genuine, authentic, verified identity.
- `settings/claude-code-permissions.json`: `{"permissions":{"deny":["Read(<APPLICANT_ROOT>/**)"]}}` with README instructions to set the path.
- `evals/…eval.md`: 6 scenarios with expected behaviour — summary with gauge red; summary clean + same-name LTB hit without URL; user pastes a raw credit report into chat (agent declines to analyse contents and points to the checker); salary request (agent never asks for the salary number); unknown style (unverifiable, recommend paid check); reference phone equals applicant phone.

- [ ] **Step 1: Write `evals/…eval.md` first** (the failing spec for agent behaviour).
- [ ] **Step 2: Write SKILL.md + references; run the 6 eval scenarios manually against the skill in Claude Code; record pass/fail in the eval file.**
- [ ] **Step 3: `sh install.sh --dry-run`** (or the sibling script's validation mode) — expect exit 0.
- [ ] **Step 4: README** — two quick starts: "Non-technical: download `dist/checker.html`, double-click, then paste the summary into your AI with SKILL.md as instructions" and "Technical: install the skill, apply the permissions file, run `tbc check`".
- [ ] **Step 5: Commit** `feat(tbc): add skill pack, docs and evals`
