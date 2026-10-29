import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const { OPS, ImageKind } = pdfjs;
const INVISIBLE_RENDER_MODE = 3;
const SUBSET_PREFIX = /^[A-Z]{6}\+/;

async function openPdf(bytes) {
  // pdf.js detaches the buffer it is given, so always pass a copy.
  return pdfjs.getDocument({
    data: bytes.slice(),
    disableFontFace: true,
    isEvalSupported: false,
    isOffscreenCanvasSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;
}

const hasEncryptDict = (bytes) => new TextDecoder('latin1').decode(bytes).includes('/Encrypt');

function fontNameOf(page, loadedName) {
  try {
    const font = page.commonObjs.get(loadedName);
    return (font?.name ?? '').replace(SUBSET_PREFIX, '') || null;
  } catch {
    return null;
  }
}

/** Text drawn while text render mode 3 (invisible) is active, plus image count. */
function scanOperators(opList) {
  let mode = 0;
  let imageCount = 0;
  const invisibleTexts = new Set();
  opList.fnArray.forEach((fn, i) => {
    const args = opList.argsArray[i];
    if (fn === OPS.setTextRenderingMode) mode = args[0];
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) imageCount++;
    else if ((fn === OPS.showText || fn === OPS.showSpacedText) && mode === INVISIBLE_RENDER_MODE) {
      const text = (args[0] ?? []).map((g) => g?.unicode ?? '').join('').trim();
      if (text) invisibleTexts.add(text);
    }
  });
  return { imageCount, invisibleTexts };
}

function toSpan(page, item) {
  const [a, b, , , e, f] = item.transform;
  return {
    text: item.str,
    x: e,
    y: f,
    w: item.width,
    h: item.height,
    font: fontNameOf(page, item.fontName),
    size: Math.round(Math.hypot(a, b) * 100) / 100,
  };
}

async function readPage(page) {
  const opList = await page.getOperatorList();
  const { imageCount, invisibleTexts } = scanOperators(opList);
  const content = await page.getTextContent();
  const all = content.items.filter((it) => it.str && it.str.trim()).map((it) => toSpan(page, it));
  const view = page.view;
  return {
    width: view[2] - view[0],
    height: view[3] - view[1],
    spans: all.filter((s) => !invisibleTexts.has(s.text.trim())),
    invisibleSpans: all.filter((s) => invisibleTexts.has(s.text.trim())),
    imageCount,
  };
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<{ok:true, encrypted:boolean, meta:object, pages:object[]} | {ok:false, reason:'password'|'corrupt'}>}
 */
export async function extractPdf(bytes) {
  let pdf;
  try {
    pdf = await openPdf(bytes);
  } catch (err) {
    return { ok: false, reason: err?.name === 'PasswordException' ? 'password' : 'corrupt' };
  }
  try {
    const { info } = await pdf.getMetadata();
    const meta = {};
    if (info?.Producer) meta.producer = String(info.Producer);
    if (info?.Creator) meta.creator = String(info.Creator);
    if (info?.CreationDate) meta.creationDate = String(info.CreationDate);
    if (info?.ModDate) meta.modDate = String(info.ModDate);
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) pages.push(await readPage(await pdf.getPage(n)));
    return { ok: true, encrypted: hasEncryptDict(bytes), meta, pages };
  } catch {
    return { ok: false, reason: 'corrupt' };
  } finally {
    await pdf.destroy();
  }
}

function toRgba(img) {
  const { width, height, data, kind } = img;
  const out = new Uint8ClampedArray(width * height * 4);
  if (kind === ImageKind.RGBA_32BPP) {
    out.set(data.subarray(0, out.length));
  } else if (kind === ImageKind.RGB_24BPP) {
    for (let i = 0, j = 0; i < width * height; i++, j += 3) out.set([data[j], data[j + 1], data[j + 2], 255], i * 4);
  } else { // GRAYSCALE_1BPP: packed bits, rows padded to bytes
    const rowBytes = (width + 7) >> 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
        out.set([v, v, v, 255], (y * width + x) * 4);
      }
    }
  }
  return { width, height, data: out };
}

function getObj(page, id) {
  return new Promise((resolve) => page.objs.get(id, resolve));
}

/** Decoded embedded images of one page, as RGBA (used to OCR image-only pages). */
export async function extractPdfImages(bytes, pageIndex) {
  const pdf = await openPdf(bytes);
  try {
    const page = await pdf.getPage(pageIndex + 1);
    const opList = await page.getOperatorList();
    const images = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] !== OPS.paintImageXObject) continue;
      const img = await getObj(page, opList.argsArray[i][0]);
      if (img?.data) images.push(toRgba(img));
    }
    return images;
  } finally {
    await pdf.destroy();
  }
}
