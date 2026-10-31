import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, pickUpdate, RELEASES_URL } from '../../src/web/update.js';

const REPO = 'https://github.com/appleaa123/skills_directory/releases';
const release = (tag, extra = {}) => ({
  tag_name: tag, draft: false, prerelease: false, name: `Checker ${tag}`, body: '',
  html_url: `${REPO}/tag/${tag}`, assets: [], ...extra,
});

test('version comparison is numeric, not alphabetical', () => {
  assert.equal(isNewer('1.10.0', '1.9.0'), true);
  assert.equal(isNewer('1.1.0', '1.1.0'), false);
  assert.equal(isNewer('1.0.9', '1.1.0'), false);
  assert.equal(isNewer('2.0.0', '1.99.99'), true);
});

test('only checker releases count; other skills in the repo are ignored', () => {
  const out = pickUpdate([release('other-skill-v9.0.0'), release('tbc-v1.2.0')], '1.1.0');
  assert.equal(out.version, '1.2.0');
});

test('drafts, pre-releases and malformed tags are ignored', () => {
  const list = [release('tbc-v3.0.0', { draft: true }), release('tbc-v2.0.0', { prerelease: true }), release('tbc-vbeta')];
  assert.equal(pickUpdate(list, '1.0.0'), null);
});

test('same or older version gives no update', () => {
  assert.equal(pickUpdate([release('tbc-v1.1.0'), release('tbc-v1.0.0')], '1.1.0'), null);
});

test('picks the highest newer release regardless of list order', () => {
  const out = pickUpdate([release('tbc-v1.2.0'), release('tbc-v1.3.0'), release('tbc-v1.2.5')], '1.1.0');
  assert.equal(out.version, '1.3.0');
});

test('download link prefers the attached checker.html, else the release page', () => {
  const asset = { name: 'checker.html', browser_download_url: `${REPO}/download/tbc-v1.2.0/checker.html` };
  assert.equal(pickUpdate([release('tbc-v1.2.0', { assets: [asset] })], '1.1.0').url, asset.browser_download_url);
  assert.equal(pickUpdate([release('tbc-v1.2.0')], '1.1.0').url, `${REPO}/tag/tbc-v1.2.0`);
});

test('note is the first non-blank line of the release notes, kept short', () => {
  const out = pickUpdate([release('tbc-v1.2.0', { body: '\n\nAdds the new TransUnion layout.\nMore details here.' })], '1.1.0');
  assert.equal(out.note, 'Adds the new TransUnion layout.');
  const long = pickUpdate([release('tbc-v1.2.0', { body: 'x'.repeat(500) })], '1.1.0');
  assert.ok(long.note.length <= 200);
});

test('unexpected responses give no update instead of throwing', () => {
  for (const bad of [null, {}, 'oops', [null, 42, { tag_name: 7 }]]) assert.equal(pickUpdate(bad, '1.0.0'), null);
});

test('the check URL is a fixed GitHub API address asking only for a page size', () => {
  assert.match(RELEASES_URL, /^https:\/\/api\.github\.com\/repos\/[^/?]+\/[^/?]+\/releases\?per_page=100$/);
});

test('a release whose links leave this repo\'s releases is ignored', () => {
  for (const html_url of ['https://evil.example/checker.html', 'https://github.com/someone-else/repo/releases/tag/tbc-v1.2.0']) {
    assert.equal(pickUpdate([release('tbc-v1.2.0', { html_url })], '1.1.0'), null, html_url);
  }
  const evilAsset = release('tbc-v1.2.0', { assets: [{ name: 'checker.html', browser_download_url: 'javascript:alert(1)' }] });
  assert.equal(pickUpdate([evilAsset], '1.1.0').url, `${REPO}/tag/tbc-v1.2.0`);
});
