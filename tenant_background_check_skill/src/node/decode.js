import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const MAX_JPEG_MEMORY_MB = 1024;

/** Encoded JPEG/PNG bytes → RGBA (Node only). */
export function decodeImage(bytes) {
  const buf = Buffer.from(bytes);
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
  }
  const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: MAX_JPEG_MEMORY_MB });
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}

/** RGBA → PNG buffer, the input format tesseract.js accepts in Node. */
export function toOcrInput(rgba) {
  const png = new PNG({ width: rgba.width, height: rgba.height });
  png.data = Buffer.from(rgba.data);
  return PNG.sync.write(png);
}

// Language data is downloaded once and cached outside the applicant folder.
export const OCR_WORKER_OPTIONS = Object.freeze({ cachePath: join(tmpdir(), 'tbc-tesseract') });
