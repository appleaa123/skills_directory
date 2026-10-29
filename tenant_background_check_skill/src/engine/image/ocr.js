import { createWorker } from 'tesseract.js';

let workerPromise = null;

function getWorker(options) {
  workerPromise ??= createWorker('eng', 1, options);
  return workerPromise;
}

/**
 * Word-level OCR, run locally. Coordinates are image pixels (y grows downward).
 * @param {import('../flags.js').Rgba} rgba
 * @param {{toOcrInput:(rgba)=>any, workerOptions?:object}} env  environment-specific image encoder
 * @returns {Promise<import('../flags.js').Span[]>}
 */
export async function ocrImage(rgba, env) {
  const worker = await getWorker(env.workerOptions ?? {});
  const { data } = await worker.recognize(env.toOcrInput(rgba));
  return (data.words ?? [])
    .filter((w) => w.text.trim())
    .map(({ text, bbox: { x0, y0, x1, y1 } }) => ({ text, x: x0, y: y0, w: x1 - x0, h: y1 - y0, font: null, size: y1 - y0 }));
}

export async function terminateOcr() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}
