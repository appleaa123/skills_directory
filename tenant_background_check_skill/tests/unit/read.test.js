import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readDocuments, runChecksOn, runChecks } from '../../src/engine/run.js';
import { validateApplication } from '../../src/engine/application.js';
import { terminateOcr } from '../../src/engine/image/ocr.js';
import { decodeImage, toOcrInput, OCR_WORKER_OPTIONS } from '../../src/node/decode.js';
import { makePdf } from '../fixtures/make.js';

after(terminateOcr);
const ENV = { decodeImage, toOcrInput, workerOptions: OCR_WORKER_OPTIONS, now: new Date('2026-02-01T00:00:00Z') };
const RULEBOOK = { version: 1, styles: [] };

async function entries() {
  const stub = await makePdf([{ text: 'Earnings Statement  Pay date 2026-01-15', x: 50, y: 700, size: 10 }, { text: 'Net Pay $1,900.00 $3,800.00', x: 50, y: 680, size: 10 }]);
  return [{ name: 's.pdf', bytes: stub }, { name: 'bad.pdf', bytes: new TextEncoder().encode('%PDF-1.4 garbage') }];
}

test('readDocuments returns type and text per document, without running checks', async () => {
  const docs = await readDocuments(await entries(), ENV);
  assert.equal(docs.length, 2);
  const stub = docs.find((d) => d.docType === 'paystub');
  assert.match(stub.text, /Net Pay/);
  assert.equal(docs.find((d) => d.docType === 'unknown').error, 'unreadable');
  assert.ok(docs.every((d) => !('flags' in d)));
});

test('runChecksOn(read) gives the same result as runChecks(entries)', async () => {
  const app = validateApplication({ name: 'Jane Doe' });
  const viaRead = await runChecksOn(await readDocuments(await entries(), ENV), app, RULEBOOK, ENV.now);
  const direct = await runChecks(await entries(), app, RULEBOOK, ENV);
  assert.deepEqual(viaRead, direct);
});
