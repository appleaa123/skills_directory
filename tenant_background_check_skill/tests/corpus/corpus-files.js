// Walk the private corpus. Yields content IDs and bytes only; file names never leave this module.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { contentId } from '../../src/engine/load.js';

const PRIVATE_MAP = '_file_ids_PRIVATE.txt';

function walk(dir) {
  return readdirSync(dir).filter((n) => !n.startsWith('.') && n !== PRIVATE_MAP)
    .flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

/** @returns {Promise<{id:string, group:string, isFake:boolean, bytes:Uint8Array}[]>} group = top-level subfolder (applicant) */
export async function corpusFiles(root) {
  return Promise.all(walk(root).map(async (p) => {
    const parts = relative(root, p).split(sep);
    const bytes = new Uint8Array(readFileSync(p));
    return { id: await contentId(bytes), group: parts.length > 1 ? `g${parts[0].length}-${await contentId(new TextEncoder().encode(parts[0]))}` : 'root', isFake: parts[0] === 'fake', bytes };
  }));
}
