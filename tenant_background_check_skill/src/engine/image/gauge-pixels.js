const MIN_SATURATION = 0.2;    // gradients blend through low-saturation mid-tones
const MIN_BAR_SHARE = 0.4;      // bar spans at least 40% of the image width
const DARK_LUMA = 60;
const STRIP_TOP = 30;           // pointer sits within 30px above the bar...
const STRIP_BOTTOM = 2;         // ...and at least 2px above it

function pixel(rgba, x, y) {
  const i = (y * rgba.width + x) * 4;
  return [rgba.data[i], rgba.data[i + 1], rgba.data[i + 2]];
}

function saturated([r, g, b]) {
  const max = Math.max(r, g, b);
  return max > 0 && (max - Math.min(r, g, b)) / max > MIN_SATURATION;
}

const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

function longestRun(rgba, y) {
  let best = { len: 0, start: 0 };
  let start = -1;
  for (let x = 0; x <= rgba.width; x++) {
    const on = x < rgba.width && saturated(pixel(rgba, x, y));
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      if (x - start > best.len) best = { len: x - start, start };
      start = -1;
    }
  }
  return best;
}

/**
 * Locate a horizontal coloured score bar and the dark pointer just above it.
 * @param {import('../flags.js').Rgba} rgba
 * @returns {{barLeft:number, barRight:number, pointerX:number}|null}
 */
export function findGaugeInImage(rgba) {
  let bar = { len: 0, start: 0, y: -1 };
  for (let y = 0; y < rgba.height; y++) {
    const run = longestRun(rgba, y);
    if (run.len > bar.len) bar = { ...run, y };
  }
  if (bar.len < MIN_BAR_SHARE * rgba.width) return null;
  const barLeft = bar.start;
  const barRight = bar.start + bar.len - 1;

  let barTop = bar.y;
  while (barTop > 0 && longestRun(rgba, barTop - 1).len >= bar.len / 2) barTop--;

  let sum = 0;
  let count = 0;
  for (let y = Math.max(0, barTop - STRIP_TOP); y <= barTop - STRIP_BOTTOM; y++) {
    for (let x = barLeft; x <= barRight; x++) {
      if (luma(pixel(rgba, x, y)) < DARK_LUMA) { sum += x; count++; }
    }
  }
  return count ? { barLeft, barRight, pointerX: sum / count } : null;
}
