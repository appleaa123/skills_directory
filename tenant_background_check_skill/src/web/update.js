// Update check: reads the public list of checker releases. Nothing about the user or their files is sent.
export const RELEASES_URL = 'https://api.github.com/repos/appleaa123/skills_directory/releases?per_page=100';
const TAG = /^tbc-v(\d+)\.(\d+)\.(\d+)$/;
const ASSET_NAME = 'checker.html';
const MAX_NOTE_LENGTH = 200;

const RELEASE_PAGES = 'https://github.com/appleaa123/skills_directory/releases/';

const parts = (v) => v.split('.').map(Number);
const onGithub = (url) => typeof url === 'string' && url.startsWith(RELEASE_PAGES);

/** True when version a is strictly newer than b (both "x.y.z"). */
export function isNewer(a, b) {
  const [pa, pb] = [parts(a), parts(b)];
  const i = pa.findIndex((n, k) => n !== pb[k]);
  return i !== -1 && pa[i] > pb[i];
}

const versionOf = (r) => {
  const m = typeof r?.tag_name === 'string' && TAG.exec(r.tag_name);
  return m ? m.slice(1).join('.') : null;
};

const firstLine = (body) => (typeof body === 'string' ? body.split('\n').map((l) => l.trim()).find(Boolean) ?? '' : '')
  .slice(0, MAX_NOTE_LENGTH);

/**
 * Newest published checker release above `current`, or null.
 * @returns {{version:string, url:string, note:string} | null}
 */
export function pickUpdate(releases, current) {
  if (!Array.isArray(releases)) return null;
  const newest = releases
    .filter((r) => r && !r.draft && !r.prerelease && versionOf(r) && isNewer(versionOf(r), current))
    .reduce((best, r) => (!best || isNewer(versionOf(r), versionOf(best)) ? r : best), null);
  if (!newest) return null;
  const asset = (newest.assets ?? []).find((a) => a?.name === ASSET_NAME && onGithub(a.browser_download_url));
  const url = asset?.browser_download_url ?? (onGithub(newest.html_url) ? newest.html_url : null);
  return url ? { version: versionOf(newest), url, note: firstLine(newest.body) } : null;
}
