import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { makePdf, PNG_4x4_RED } from '../fixtures/make.js';
import { RELEASES_URL } from '../../src/web/update.js';

const PAGE = new URL('../../dist/checker.html', import.meta.url).href;
const { version: VERSION } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

// No test talks to GitHub: the release list is answered here (no releases unless a test says otherwise).
const answerReleases = (page, releases) => page.route(RELEASES_URL, (route) => route.fulfill({
  status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(releases),
}));
test.beforeEach(({ page }) => answerReleases(page, []));

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
  page.on('request', (r) => { if (!/^(file|blob|data):/.test(r.url())) requests.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`.trim()); });
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
  expect(text).toContain(`Checker version: ${VERSION}`);

  // The update check is the only request, with no body and no query string.
  expect(requests).toEqual([`GET ${RELEASES_URL}`]);
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

const release = (version, note) => ({
  tag_name: `tbc-v${version}`, draft: false, prerelease: false, body: note,
  html_url: `https://github.com/appleaa123/skills_directory/releases/tag/tbc-v${version}`,
  assets: [{ name: 'checker.html', browser_download_url: `https://github.com/appleaa123/skills_directory/releases/download/tbc-v${version}/checker.html` }],
});

test('a newer checker release shows a download banner that can be dismissed', async ({ page }) => {
  await page.unroute(RELEASES_URL);
  await answerReleases(page, [release('99.0.0', 'Adds the new TransUnion layout.\nDetails.'), { tag_name: 'other-skill-v100.0.0', assets: [] }]);
  await page.goto(PAGE);
  const banner = page.getByRole('status').filter({ hasText: 'newer checker' });
  await expect(banner).toContainText('v99.0.0');
  await expect(banner).toContainText('Adds the new TransUnion layout.');
  await expect(banner.getByRole('link', { name: 'Download' }))
    .toHaveAttribute('href', 'https://github.com/appleaa123/skills_directory/releases/download/tbc-v99.0.0/checker.html');
  await banner.getByRole('button', { name: 'Not now' }).click();
  await expect(banner).toBeHidden();
});

test('no banner when the latest release is this version', async ({ page }) => {
  await page.unroute(RELEASES_URL);
  await answerReleases(page, [release(VERSION, 'Current.')]);
  const answered = page.waitForResponse(RELEASES_URL);
  await page.goto(PAGE);
  await answered;
  await page.waitForTimeout(500); // let the page handle the response before asserting nothing appeared
  await expect(page.getByRole('status').filter({ hasText: 'newer checker' })).toBeHidden();
});

test('offline: no banner and the checker still works', async ({ page }) => {
  await page.unroute(RELEASES_URL);
  await page.route(RELEASES_URL, (route) => route.abort('internetdisconnected'));
  await page.goto(PAGE);
  await expect(page.getByRole('status').filter({ hasText: 'newer checker' })).toBeHidden();
  await page.getByRole('button', { name: 'Run check' }).click();
  await expect(page.getByRole('alert')).toContainText('Add the application files first');
});

test('layout report from your own PDF has no personal data', async ({ page }) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tbc-e2e-')), 'my-report.pdf');
  writeFileSync(path, await makePdf([
    { text: 'TransUnion', x: 50, y: 760, size: 14 },
    { text: 'Personal Information', x: 50, y: 700, size: 12 },
    { text: 'JANE DOE  1985/03/14  123 SECRET ST', x: 50, y: 680, size: 10 }],
  { producer: 'iText 5.5.13 (Licensed for: Jane Doe Holdings)', creator: 'ConsumerDisclosureService' }));

  await page.goto(PAGE);
  await page.getByText('Help add a new report layout').click();
  await page.getByLabel('Your own credit report (PDF)').setInputFiles(path);
  await page.getByRole('button', { name: 'Make layout report' }).click();
  await expect(page.getByRole('alert')).toContainText('your own report');

  await page.getByLabel('This is my own report').check();
  await page.getByRole('button', { name: 'Make layout report' }).click();
  const report = page.getByLabel('Layout report to send');
  await expect(report).toHaveValue(/TENANT CHECKER LAYOUT REPORT/, { timeout: 30000 });
  const text = await report.inputValue();
  expect(text).toContain('transunion-consumer-disclosure');
  expect(text).toContain(`Checker version: ${VERSION}`);
  for (const v of ['JANE', '1985', 'SECRET', 'Holdings', 'my-report']) expect(text).not.toContain(v);
});

test('layout report refuses screenshots: PDF only', async ({ page }) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tbc-e2e-')), 'shot.png');
  writeFileSync(path, PNG_4x4_RED);
  await page.goto(PAGE);
  await page.getByText('Help add a new report layout').click();
  await page.getByLabel('This is my own report').check();
  await page.getByLabel('Your own credit report (PDF)').setInputFiles(path);
  await page.getByRole('button', { name: 'Make layout report' }).click();
  await expect(page.getByRole('alert')).toContainText('PDF');
  await expect(page.getByLabel('Layout report to send')).toHaveValue('');
});

test('layout report refuses a PDF that is not a credit report', async ({ page }) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tbc-e2e-')), 'stub.pdf');
  writeFileSync(path, await makePdf([{ text: 'Earnings Statement  Net Pay $1,900.00', x: 50, y: 700, size: 10 }]));
  await page.goto(PAGE);
  await page.getByText('Help add a new report layout').click();
  await page.getByLabel('This is my own report').check();
  await page.getByLabel('Your own credit report (PDF)').setInputFiles(path);
  await page.getByRole('button', { name: 'Make layout report' }).click();
  await expect(page.getByRole('alert')).toContainText('does not look like a credit report');
  await expect(page.getByLabel('Layout report to send')).toHaveValue('');
});
