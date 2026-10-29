import * as pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { readDocuments, runChecksOn } from '../engine/run.js';
import { extractApplication } from '../engine/extract-application.js';
import { buildSummary, renderSummaryText } from '../engine/summary.js';
import { validateApplication } from '../engine/application.js';
import { compareSalary } from '../engine/checks/salary.js';
import RULEBOOK from '../../rulebook/styles.json';

// Run pdf.js in this page: nothing is fetched and no file leaves the computer.
globalThis.pdfjsWorker = pdfWorker;

const $ = (id) => document.getElementById(id);
const TEXT_FIELDS = ['name', 'dob', 'currentAddress', 'city', 'province', 'country', 'employer', 'title'];
const REF_FIELDS = { refName: 'name', refPhone: 'phone', refAddress: 'address' };
const ALL_FIELDS = [...TEXT_FIELDS, 'annualSalary', ...Object.keys(REF_FIELDS)];
const TYPE_LABEL = { credit_report: 'credit report', paystub: 'paystub', employment_letter: 'employment letter', rental_application: 'rental application', id: 'ID', bank_statement: 'bank statement' };
const ENV = { decodeImage, toOcrInput, workerOptions: {} };

// In memory only: documents read from the last upload, where each auto-filled value came from, last result.
let read = null;
let sources = {};
let current = null;
let reading = Promise.resolve(); // pending upload read, so Run can wait for it

async function decodeImage(bytes) {
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { width: bitmap.width, height: bitmap.height, data };
}

function toOcrInput(rgba) {
  const canvas = document.createElement('canvas');
  canvas.width = rgba.width;
  canvas.height = rgba.height;
  canvas.getContext('2d').putImageData(new ImageData(rgba.data, rgba.width, rgba.height), 0, 0);
  return canvas;
}

const showError = (msg) => { $('error').textContent = msg; };
const render = () => { $('summary').value = renderSummaryText(buildSummary(current.state, current.app)); };
const markBlanks = () => ALL_FIELDS.forEach((id) => $(id).classList.toggle('blank', !$(id).value.trim()));

function showSource(id, docId) {
  const type = read?.find((r) => r.doc.id === docId)?.docType;
  $(`src-${id}`).textContent = docId ? `from ${TYPE_LABEL[type] ?? 'document'} ${docId}` : '';
}

/** Fill only empty fields, so anything the user typed is never overwritten. */
function prefill({ values, sources: found }) {
  const flat = { ...values, ...Object.fromEntries(Object.entries(REF_FIELDS).map(([id, k]) => [id, values.reference?.[k]])) };
  const refSource = found.reference;
  for (const id of ALL_FIELDS) {
    const value = flat[id];
    if (value === undefined || $(id).value.trim()) continue;
    $(id).value = String(value);
    const docId = id in REF_FIELDS ? refSource : found[id];
    if (docId) sources = { ...sources, [id]: docId };
    showSource(id, docId);
  }
  markBlanks();
}

async function onFiles() {
  showError('');
  const files = [...$('files').files];
  read = null;
  if (!files.length) return;
  $('reading').textContent = 'Reading files on this computer…';
  try {
    const entries = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    read = await readDocuments(entries, ENV);
    prefill(extractApplication(read));
    $('reading').textContent = `Read ${read.length} document(s). Check the details in step 2.`;
  } catch {
    $('reading').textContent = '';
    showError('Something went wrong while reading the files. Try again, or check them one at a time.');
  }
}

function readApplication() {
  const values = Object.fromEntries(TEXT_FIELDS.map((k) => [k, $(k).value.trim()]).filter(([, v]) => v));
  const salary = $('annualSalary').value.replace(/[$,\s]/g, '');
  const reference = Object.fromEntries(Object.entries(REF_FIELDS).map(([id, k]) => [k, $(id).value.trim()]));
  return validateApplication({ ...values, ...(salary && { annualSalary: Number(salary) }), reference });
}

async function onRun() {
  showError('');
  let app;
  try {
    app = readApplication();
  } catch (err) {
    showError(err.message);
    return;
  }
  $('run').disabled = true;
  $('run').textContent = 'Checking…';
  try {
    await reading;
    if (!read) return showError('Add the application files first.');
    const state = runChecksOn(read, app, RULEBOOK, new Date(), { sources });
    current = { state, app };
    render();
  } catch {
    showError('Something went wrong while checking the files. Try again, or check them one at a time.');
  } finally {
    $('run').disabled = false;
    $('run').textContent = 'Run check';
  }
}

function onSalary() {
  const num = (id) => Number($(id).value.replace(/[$,\s]/g, ''));
  if (!current) return showError('Run the check first.');
  if (!current.app.annualSalary) return showError('Enter the annual salary from the application, then run the check again.');
  const [low, high] = [num('low'), num('high')];
  if (!(low > 0 && high >= low)) return showError('Enter a valid salary range (low and high).');
  const verdict = compareSalary(current.app.annualSalary, { low, high });
  $('salaryResult').textContent = `Salary is ${verdict} the typical range for this title.`;
  current = { ...current, state: { ...current.state, salaryVerdict: verdict } };
  render();
}

// A value the user edits is theirs now, not the document's: stop treating it as auto-filled.
for (const id of ALL_FIELDS) {
  $(id).addEventListener('input', () => {
    const { [id]: _dropped, ...rest } = sources;
    sources = rest;
    showSource(id, null);
    markBlanks();
  });
}
$('files').addEventListener('change', () => { reading = onFiles(); });
$('run').addEventListener('click', onRun);
$('salary').addEventListener('click', onSalary);
$('copy').addEventListener('click', () => navigator.clipboard?.writeText($('summary').value));
markBlanks();
