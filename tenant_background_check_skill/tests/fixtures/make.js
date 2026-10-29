// Synthetic, PII-free fixture builders. Never put real applicant data here.
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PNG } from 'pngjs';

const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
const FONTS = { Helvetica: StandardFonts.Helvetica, Courier: StandardFonts.Courier };

/** Solid-colour PNG bytes. */
export function makePng(width, height, [r, g, b]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set([r, g, b, 255], i * 4);
  return new Uint8Array(PNG.sync.write(png));
}

export const PNG_4x4_RED = makePng(4, 4, [255, 0, 0]);

/**
 * @param {{text:string, x:number, y:number, size:number, font?:'Helvetica'|'Courier'}[]} lines
 * @param {{producer?:string, creator?:string, image?:Uint8Array, pageSize?:[number, number]}} opts
 */
export async function makePdf(lines, opts = {}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage(opts.pageSize ?? [612, 792]);
  const cache = {};
  for (const l of lines) {
    const name = l.font ?? 'Helvetica';
    cache[name] ??= await doc.embedFont(FONTS[name]);
    page.drawText(l.text, { x: l.x, y: l.y, size: l.size, font: cache[name] });
  }
  if (opts.image) {
    const img = await doc.embedPng(opts.image);
    page.drawImage(img, { x: 10, y: 10, width: 40, height: 40 });
  }
  // Fixed dates keep content-hash IDs stable between runs (a random ID could contain a planted value).
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  doc.setProducer(opts.producer ?? 'pdf-lib');
  if (opts.creator) doc.setCreator(opts.creator);
  return doc.save({ useObjectStreams: false });
}
