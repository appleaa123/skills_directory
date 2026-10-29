import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { loadPackage, contentId } from '../../src/engine/load.js';

const enc = (s) => new TextEncoder().encode(s);
const PDF = enc('%PDF-1.4\n%fake pdf body A\n%%EOF\n');
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

async function zipOf(files) {
  const zip = new JSZip();
  for (const [name, bytes] of Object.entries(files)) zip.file(name, bytes);
  return zip.generateAsync({ type: 'uint8array' });
}

test('loadPackage expands zip, drops __MACOSX/.DS_Store, dedupes by hash', async () => {
  const zipBytes = await zipOf({
    'a.pdf': PDF,
    'sub/b.jpg': JPG,
    '__MACOSX/._a.pdf': enc('junk'),
    '.DS_Store': enc('junk'),
    'sub/a-copy.pdf': PDF,
  });
  const docs = await loadPackage([{ name: 'pkg.zip', bytes: zipBytes }]);
  assert.deepEqual(docs.map((d) => d.kind).sort(), ['image', 'pdf']);
  assert.ok(docs.every((d) => /^[0-9a-f]{6}$/.test(d.id)));
  assert.ok(docs.every((d) => !('name' in d)), 'file names must never be kept');
});

test('classify by magic bytes, not extension', async () => {
  const [d] = await loadPackage([{ name: 'x.jpg', bytes: PDF }]);
  assert.equal(d.kind, 'pdf');
});

test('unknown bytes classified as other', async () => {
  const [d] = await loadPackage([{ name: 'x.docx', bytes: enc('PK-not-a-zip-really') }]);
  assert.equal(d.kind, 'other');
});

test('contentId is first 6 hex of sha256', async () => {
  assert.equal(await contentId(enc('abc')), 'ba7816');
});
