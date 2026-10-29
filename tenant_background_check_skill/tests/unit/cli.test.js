import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makePdf } from '../fixtures/make.js';

const CLI = new URL('../../src/cli/index.js', import.meta.url).pathname;
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
let dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tbc-cli-'));
  writeFileSync(join(dir, 'credit.pdf'), await makePdf([
    { text: 'Equifax Credit Score 742', x: 50, y: 700, size: 12 },
    { text: 'Name: DOE, JANE  Date of Birth: 1985/03/14', x: 50, y: 680, size: 10 }], { producer: 'Skia/PDF m81', creator: 'Chromium' }));
  writeFileSync(join(dir, 'application.json'), JSON.stringify({
    name: 'Jane Doe', dob: '1985-03-14', city: 'Toronto', province: 'ON', country: 'Canada',
    employer: 'Acme Widgets Inc.', title: 'Vice President', annualSalary: 60000 }));
});

test('check prints the summary without local-only values and writes local state', () => {
  const r = run('check', dir);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.startsWith('TENANT CHECK SUMMARY'));
  for (const v of ['1985', '742', '60000', 'credit.pdf']) assert.ok(!r.stdout.includes(v), `leaked ${v}`);
  assert.ok(existsSync(join(dir, '.tbc-state.json')));
  assert.ok(!readFileSync(join(dir, '.tbc-state.json'), 'utf8').includes('1985/03/14'));
});

test('salary prints the verdict line only', () => {
  const r = run('salary', dir, '--range', '150000-250000');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'Salary vs typical range for "Vice President" in Toronto: below');
  assert.ok(!r.stdout.includes('60000'));
});

test('salary without --range exits 2', () => {
  assert.equal(run('salary', dir).status, 2);
});

test('invalid application exits 2 without echoing values', () => {
  const bad = mkdtempSync(join(tmpdir(), 'tbc-bad-'));
  writeFileSync(join(bad, 'application.json'), JSON.stringify({ name: 'Jane Doe', dob: 'xx' }));
  const r = run('check', bad);
  assert.equal(r.status, 2);
  assert.ok(!r.stderr.includes('Jane Doe'));
});

test('check without application.json creates it from the documents, locally', async () => {
  const auto = mkdtempSync(join(tmpdir(), 'tbc-auto-'));
  writeFileSync(join(auto, 'credit.pdf'), await makePdf([
    { text: 'Equifax Credit Report', x: 50, y: 760, size: 12 },
    { text: 'Name: DOE, JANE', x: 50, y: 700, size: 10 },
    { text: 'Date of Birth: 1985/03/14', x: 50, y: 686, size: 10 }]));
  const r = run('check', auto);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Created application\.json/);
  assert.ok(!r.stderr.includes('Jane') && !r.stdout.includes('1985'));
  const app = JSON.parse(readFileSync(join(auto, 'application.json'), 'utf8'));
  assert.equal(app.name, 'Jane Doe');
  assert.equal(app.dob, '1985-03-14');
  assert.ok(/^[0-9a-f]{6}$/.test(app._sources.name));
});

test('learn prints a fingerprint with no non-anchor text', async () => {
  const f = join(dir, 'learn.pdf');
  writeFileSync(f, await makePdf([
    { text: 'Equifax Canada Co.', x: 400, y: 760, size: 14 },
    { text: 'Further to your request, a copy of your personal credit file as of 2026/01/02 follows:', x: 50, y: 700, size: 14 },
    { text: 'JANE DOE', x: 50, y: 680, size: 10 }]));
  const r = run('learn', f);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(!r.stdout.includes('JANE') && !r.stdout.includes('2026/01/02'));
  assert.ok(out.fingerprint.anchors.length >= 2);
  assert.equal(typeof out.charWidthRatios['Further to your request|Equifax Canada Co.'], 'number');
});
