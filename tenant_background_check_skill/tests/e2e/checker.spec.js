import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { makePdf } from '../fixtures/make.js';

const PAGE = new URL('../../dist/checker.html', import.meta.url).href;

async function syntheticZip() {
  const zip = new JSZip();
  zip.file('credit.pdf', await makePdf([
    { text: 'Equifax Credit Score 742', x: 50, y: 700, size: 12 },
    { text: 'Name: DOE, JANE  Date of Birth: 1985/03/14  SIN: 999-999-999', x: 50, y: 680, size: 10 }], { producer: 'Skia/PDF m81', creator: 'Chromium' }));
  const path = join(mkdtempSync(join(tmpdir(), 'tbc-e2e-')), 'package.zip');
  writeFileSync(path, await zip.generateAsync({ type: 'uint8array' }));
  return path;
}

test('checks a package locally and produces a PII-free summary', async ({ page }) => {
  const requests = [];
  // blob:/data: URLs are in-page memory (Safari reports them as requests); only real network URLs count.
  page.on('request', (r) => { if (!/^(file|blob|data):/.test(r.url())) requests.push(`${r.method()} ${r.url()}`); });
  await page.goto(PAGE);
  await expect(page.getByText('Files stay on this computer.')).toBeVisible();

  await page.getByLabel('Applicant name').fill('Jane Doe');
  await page.getByLabel('Date of birth').fill('1985-03-14');
  await page.getByLabel('City').fill('Toronto');
  await page.getByLabel('Province').fill('ON');
  await page.getByLabel('Employer').fill('Acme Widgets Inc.');
  await page.getByLabel('Job title').fill('Vice President');
  await page.getByLabel('Annual salary').fill('60000');
  await page.getByLabel('Application files').setInputFiles(await syntheticZip());
  await page.getByRole('button', { name: 'Run check' }).click();

  const summary = page.getByLabel('Summary to share');
  await expect(summary).toHaveValue(/TENANT CHECK SUMMARY/, { timeout: 60000 });
  const text = await summary.inputValue();
  for (const v of ['1985', '742', '999-999-999', '60000', 'credit.pdf']) expect(text).not.toContain(v);
  expect(text).toContain('Jane Doe');

  await page.getByLabel('Range low').fill('150000');
  await page.getByLabel('Range high').fill('250000');
  await page.getByRole('button', { name: 'Compare salary' }).click();
  await expect(page.getByTestId('salary-result')).toHaveText(/below/);
  await expect(summary).toHaveValue(/Salary vs typical range for this title: below/);

  expect(requests).toEqual([]);
});

test('running with no files asks for files, not for fields', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByText('All fields are optional')).toBeVisible();
  await page.getByRole('button', { name: 'Run check' }).click();
  await expect(page.getByRole('alert')).toContainText('Add the application files first');
});

test('uploading fills the form from the documents and shows where each value came from', async ({ page }) => {
  const zip = new JSZip();
  zip.file('credit.pdf', await makePdf([
    { text: 'Equifax Credit Report', x: 50, y: 760, size: 12 },
    { text: 'Name: DOE, JANE', x: 50, y: 700, size: 10 },
    { text: 'Date of Birth: 1985/03/14', x: 50, y: 686, size: 10 },
    { text: 'Current Address: 123 MAIN ST, TORONTO, ON, M2M 4G3', x: 50, y: 672, size: 10 }], { producer: 'Skia/PDF m81' }));
  zip.file('stub.pdf', await makePdf([
    { text: 'Earnings Statement  Employee name: Jane Doe', x: 50, y: 700, size: 10 },
    { text: 'Employer: Acme Widgets Inc.', x: 50, y: 686, size: 10 },
    { text: 'Job title: Analyst', x: 50, y: 672, size: 10 },
    { text: 'Net Pay $1,900.00 $3,800.00', x: 50, y: 658, size: 10 }]));
  const path = join(mkdtempSync(join(tmpdir(), 'tbc-e2e-')), 'auto.zip');
  writeFileSync(path, await zip.generateAsync({ type: 'uint8array' }));

  await page.goto(PAGE);
  await page.getByLabel('Application files').setInputFiles(path);
  await expect(page.getByLabel('Applicant name')).toHaveValue('Jane Doe', { timeout: 30000 });
  await expect(page.getByLabel('Date of birth')).toHaveValue('1985-03-14');
  await expect(page.getByLabel('City')).toHaveValue('Toronto');
  await expect(page.getByLabel('Employer')).toHaveValue('Acme Widgets Inc.');
  await expect(page.getByTestId('source-name')).toContainText('credit report');

  await page.getByRole('button', { name: 'Run check' }).click();
  const summary = page.getByLabel('Summary to share');
  await expect(summary).toHaveValue(/TENANT CHECK SUMMARY/, { timeout: 60000 });
  const text = await summary.inputValue();
  expect(text).toMatch(/name in [0-9a-f]{6}: match \(value from credit report [0-9a-f]{6}\)/);
  for (const v of ['1985', '123 MAIN', 'M2M']) expect(text).not.toContain(v);
});

test('screenshots are read on-device; only engine downloads (GET) leave the page', async ({ page }) => {
  const requests = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(r); });
  await page.goto(PAGE);
  for (const [label, v] of [['Applicant name', 'Jane Doe'], ['City', 'Toronto'], ['Province', 'ON'], ['Employer', 'Acme'], ['Job title', 'Analyst']]) await page.getByLabel(label).fill(v);
  await page.getByLabel('Application files').setInputFiles(new URL('../fixtures/ocr-text.png', import.meta.url).pathname);
  await page.getByRole('button', { name: 'Run check' }).click();
  await expect(page.getByLabel('Summary to share')).toHaveValue(/DOCUMENTS\n- [0-9a-f]{6} other/, { timeout: 90000 });
  expect(requests.every((r) => r.method() === 'GET' && !r.postData())).toBe(true);
});
