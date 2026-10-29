#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { parseArgs } from 'node:util';
import { readDocuments, runChecksOn } from '../engine/run.js';
import { extractApplication } from '../engine/extract-application.js';
import { buildSummary, renderSummaryText } from '../engine/summary.js';
import { validateApplication } from '../engine/application.js';
import { compareSalary } from '../engine/checks/salary.js';
import { extractPdf } from '../engine/pdf/extract.js';
import { fingerprint } from '../engine/style.js';
import { measureCharWidthRatio, measureGaugeOffset } from '../engine/measure.js';
import { terminateOcr } from '../engine/image/ocr.js';
import { decodeImage, toOcrInput, OCR_WORKER_OPTIONS } from '../node/decode.js';

const EXIT_OK = 0;
const EXIT_USAGE = 2;
const STATE_FILE = '.tbc-state.json';
const APP_FILE = 'application.json';
const RULEBOOK = JSON.parse(readFileSync(new URL('../../rulebook/styles.json', import.meta.url), 'utf8'));
const DEFAULT_GLYPH = '▼';
const DEFAULT_BANDS = [[300, 559], [560, 659], [660, 724], [725, 759], [760, 900]];
const LEARN_PAIRS = [['Further to your request', 'Equifax Canada Co.']];
const USAGE = `Usage:
  tbc check <folder|zip> [--app application.json]
  tbc salary <folder> --range <low>-<high>
  tbc learn <file.pdf>`;

class UsageError extends Error {}

function listFiles(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).filter((n) => !n.startsWith('.') && n !== APP_FILE)
    .flatMap((n) => listFiles(join(path, n)));
}

const folderOf = (path) => (statSync(path).isFile() ? dirname(path) : path);

function readAppFile(path) {
  if (!existsSync(path)) throw new UsageError(`Application file not found: ${basename(path)}`);
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return { app: validateApplication(raw), sources: raw._sources ?? {} };
  } catch (err) {
    // Validation messages name fields, never their values.
    throw new UsageError(err instanceof SyntaxError ? 'application.json is not valid JSON' : err.message);
  }
}

const loadApp = (path) => readAppFile(path).app;

async function check(target, appPath) {
  const path = appPath ?? join(folderOf(target), APP_FILE);
  const entries = listFiles(target).map((p) => ({ name: basename(p), bytes: new Uint8Array(readFileSync(p)) }));
  const env = { decodeImage, toOcrInput, workerOptions: OCR_WORKER_OPTIONS };
  try {
    const read = await readDocuments(entries, env);
    if (!existsSync(path)) {
      const { values, sources } = extractApplication(read);
      writeFileSync(path, JSON.stringify({ ...values, _sources: sources }, null, 2));
      process.stderr.write(`Created ${APP_FILE} from the documents (${Object.keys(values).length} fields). Review and correct it, then run again if needed. All fields are optional.\n`);
    }
    const { app, sources } = readAppFile(path);
    const state = runChecksOn(read, app, RULEBOOK, new Date(), { sources });
    writeFileSync(join(folderOf(target), STATE_FILE), JSON.stringify(state, null, 2));
    process.stdout.write(`${renderSummaryText(buildSummary(state, app))}\n`);
  } finally {
    await terminateOcr();
  }
}

function salary(folder, range, appPath) {
  const m = /^(\d+)-(\d+)$/.exec(range ?? '');
  if (!m) throw new UsageError('--range must look like 150000-250000');
  const app = loadApp(appPath ?? join(folder, APP_FILE));
  if (!app.annualSalary) throw new UsageError('annualSalary is not set in application.json');
  const verdict = compareSalary(app.annualSalary, { low: +m[1], high: +m[2] });
  const statePath = join(folder, STATE_FILE);
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    writeFileSync(statePath, JSON.stringify({ ...state, salaryVerdict: verdict }, null, 2));
  }
  process.stdout.write(`Salary vs typical range for "${app.title}" in ${app.city}: ${verdict}\n`);
}

async function learn(file) {
  const extracted = await extractPdf(new Uint8Array(readFileSync(file)));
  if (!extracted.ok) throw new UsageError(`Could not read PDF (${extracted.reason})`);
  const charWidthRatios = Object.fromEntries(LEARN_PAIRS.map(([a, b]) => [`${a}|${b}`, measureCharWidthRatio(extracted, a, b)]));
  const out = {
    fingerprint: fingerprint(extracted),
    charWidthRatios,
    pointerOffsetFromFirstRangeLabel: measureGaugeOffset(extracted, DEFAULT_GLYPH, DEFAULT_BANDS),
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

async function main(argv) {
  const { positionals, values } = parseArgs({
    args: argv, allowPositionals: true,
    options: { app: { type: 'string' }, range: { type: 'string' } },
  });
  const [command, target] = positionals;
  if (!target) throw new UsageError(USAGE);
  if (command === 'check') return check(target, values.app);
  if (command === 'salary') return salary(target, values.range, values.app);
  if (command === 'learn') return learn(target);
  throw new UsageError(USAGE);
}

main(process.argv.slice(2)).then(
  () => process.exit(EXIT_OK),
  (err) => {
    process.stderr.write(`${err instanceof UsageError ? err.message : 'Unexpected error while checking files.'}\n`);
    process.exit(err instanceof UsageError ? EXIT_USAGE : 1);
  },
);
