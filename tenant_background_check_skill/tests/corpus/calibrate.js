// Maintainer calibration over the private corpus. Prints layout constants only.
import { extractPdf } from '../../src/engine/pdf/extract.js';
import { fingerprint, classifyDocType } from '../../src/engine/style.js';
import { measureCharWidthRatio, measureGaugeOffset } from '../../src/engine/measure.js';
import { corpusFiles } from './corpus-files.js';

const ROOT = process.env.CORPUS_DIR;
if (!ROOT) throw new Error('Set CORPUS_DIR');
const BANDS = [[300, 559], [560, 659], [660, 724], [725, 759], [760, 900]];
const scrub = (s) => (s ?? '').replace(/Licensed for:.*/i, 'Licensed for: <redacted>').slice(0, 60);

for (const f of await corpusFiles(ROOT)) {
  if (f.isFake || f.bytes[0] !== 0x25) continue;
  const ex = await extractPdf(f.bytes);
  if (!ex.ok) { console.log(f.id, 'unreadable', ex.reason); continue; }
  const text = ex.pages.flatMap((p) => p.spans.map((s) => s.text)).join('\n');
  if (classifyDocType(text) !== 'credit_report') continue;
  const fp = fingerprint(ex);
  const ratio = measureCharWidthRatio(ex, 'Further to your request', 'Equifax Canada Co.');
  const offset = measureGaugeOffset(ex, '▼', BANDS);
  console.log(JSON.stringify({
    id: f.id, group: f.group, pages: fp.pageCount, size: fp.pageSize, producer: scrub(fp.producer), creator: scrub(fp.creator),
    fonts: fp.fonts, anchors: fp.anchors.map((a) => `${a.text}@${a.font}/${a.size}`),
    charWidthRatio: ratio && +ratio.toFixed(4), gaugeOffset: offset && +offset.toFixed(2),
  }));
}
