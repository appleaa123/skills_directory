// Acceptance on the private corpus (never committed). Output names content IDs and flag codes only.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChecks, readDocuments, runChecksOn } from '../../src/engine/run.js';
import { extractApplication } from '../../src/engine/extract-application.js';
import { validateApplication } from '../../src/engine/application.js';
import { terminateOcr } from '../../src/engine/image/ocr.js';
import { decodeImage, toOcrInput, OCR_WORKER_OPTIONS } from '../../src/node/decode.js';
import { corpusFiles } from './corpus-files.js';

const ROOT = process.env.CORPUS_DIR;
const RULEBOOK = JSON.parse(readFileSync(new URL('../../rulebook/styles.json', import.meta.url), 'utf8'));
const ENV = { decodeImage, toOcrInput, workerOptions: OCR_WORKER_OPTIONS };
const APP = validateApplication({ name: 'Test Applicant', city: 'Toronto', province: 'ON', country: 'Canada', employer: 'Test Co', title: 'Tester' });
const KNOWN_FAKES = { gauge: 'ffbeba', dateLine: '806f51' };

after(terminateOcr);

test('genuine corpus files produce zero red flags', { skip: !ROOT, timeout: 900000 }, async () => {
  const files = (await corpusFiles(ROOT)).filter((f) => !f.isFake);
  const groups = Map.groupBy(files, (f) => f.group);
  const reds = [];
  for (const [group, members] of groups) {
    // Same flow as the realtor: auto-fill from the documents, then check.
    const read = await readDocuments(members.map((m) => ({ name: m.id, bytes: m.bytes })), ENV);
    const { values, sources } = extractApplication(read);
    const state = runChecksOn(read, validateApplication(values), RULEBOOK, new Date(), { sources });
    reds.push(...state.flags.filter((f) => f.severity === 'red').map((f) => `${group} ${f.docId} ${f.code}`));
    console.log(`${group} autofilled=[${Object.keys(values)}] identity=[${state.identity.map((r) => `${r.field}:${r.status}`)}]`);
    console.log(`${group}: ${state.docs.map((d) => `${d.id}/${d.docType}/${d.styleId ?? '-'}`).join(' ')} | ${state.flags.map((f) => `${f.docId}:${f.code}`).join(' ') || 'no flags'}`);
  }
  assert.deepEqual(reds, []);
});

test('known fakes are caught for the right reason', { skip: !ROOT, timeout: 300000 }, async () => {
  const fakes = (await corpusFiles(ROOT)).filter((f) => f.isFake);
  const codesFor = async (id) => {
    const f = fakes.find((x) => x.id === id);
    assert.ok(f, `fake ${id} not found`);
    const state = await runChecks([{ name: id, bytes: f.bytes }], APP, RULEBOOK, ENV);
    console.log(`${id}: ${state.docs.map((d) => `${d.docType}/${d.styleId ?? '-'}`).join(' ')} | ${state.flags.map((x) => `${x.code}:${x.severity}`).join(' ') || 'no flags'}`);
    return state.flags.map((x) => x.code);
  };
  assert.ok((await codesFor(KNOWN_FAKES.gauge)).includes('GAUGE_POINTER_MISMATCH'));
  assert.ok((await codesFor(KNOWN_FAKES.dateLine)).includes('IMAGE_TYPEFACE_DIFFERS'));
});
