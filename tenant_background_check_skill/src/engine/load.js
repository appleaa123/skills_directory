import JSZip from 'jszip';

const JUNK = [/(^|\/)__MACOSX\//, /(^|\/)\.[^/]*$/];

/** First 6 hex chars of SHA-256 — stable, name-free document ID. */
export async function contentId(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 3).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function classify(bytes) {
  const b = bytes;
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image';
  return 'other';
}

const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

async function expand(entries) {
  const out = [];
  for (const { name, bytes } of entries) {
    if (JUNK.some((re) => re.test(name))) continue;
    const zip = isZip(bytes) ? await JSZip.loadAsync(bytes).catch(() => null) : null;
    // Office files (.docx/.xlsx) are zips too: keep them whole. Unreadable zips stay as one document.
    if (zip && !zip.file('[Content_Types].xml')) {
      const inner = await Promise.all(
        Object.values(zip.files).filter((f) => !f.dir)
          .map(async (f) => ({ name: f.name, bytes: await f.async('uint8array') })));
      out.push(...(await expand(inner)));
    } else {
      out.push(bytes);
    }
  }
  return out;
}

/**
 * Turn uploaded files (loose or zipped) into Docs. File names are dropped.
 * @param {{name:string, bytes:Uint8Array}[]} entries
 * @returns {Promise<import('./flags.js').Doc[]>}
 */
export async function loadPackage(entries) {
  const seen = new Set();
  const docs = [];
  for (const bytes of await expand(entries)) {
    const id = await contentId(bytes);
    if (seen.has(id)) continue;
    seen.add(id);
    docs.push({ id, kind: classify(bytes), bytes });
  }
  return docs;
}
