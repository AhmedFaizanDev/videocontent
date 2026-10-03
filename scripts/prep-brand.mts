/**
 * Client logo files arrive as gradient artwork on solid black. This keys the black out
 * (alpha from brightness against each row's true colour, colour un-premultiplied), crops
 * to the artwork and writes colour + white variants for light and dark backgrounds.
 *
 *   node scripts/prep-brand.mts <in.png> <out-basename>   → public/brand/<out>.png, <out>-white.png
 */
import {Jimp} from 'jimp';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

const [src, name] = process.argv.slice(2);
if (!src || !name) (console.error('usage: node scripts/prep-brand.mts <in.png> <out-basename>'), process.exit(1));
const im = await Jimp.read(src);
const {width: w, height: h, data} = im.bitmap;
const maxc = (i: number) => Math.max(data[i], data[i + 1], data[i + 2]);
// each row's true (fully opaque) brightness: a high percentile of its lit pixels
const rowT: number[] = [];
for (let y = 0; y < h; y++) {
  const v: number[] = [];
  for (let x = 0; x < w; x++) {
    const m = maxc((y * w + x) * 4);
    if (m > 90) v.push(m);
  }
  v.sort((a, b) => a - b);
  rowT.push(v.length > 6 ? v[Math.floor(v.length * 0.9)] : 0);
}
// rows too thin to measure borrow the nearest measured row
for (let y = 0; y < h; y++) if (!rowT[y]) for (let d = 1; d < h; d++) if (rowT[y - d] || rowT[y + d]) { rowT[y] = rowT[y - d] || rowT[y + d]; break; }
// smooth: the source gradient is continuous, per-row noise would print as stripes
const smooth = rowT.map((_, y) => {
  let n = 0, t = 0;
  for (let d = -12; d <= 12; d++) if (rowT[y + d]) (t += rowT[y + d]), n++;
  return t / n;
});
let x0 = w, y0 = h, x1 = 0, y1 = 0;
const out = new Jimp({width: w, height: h, color: 0x00000000});
const white = new Jimp({width: w, height: h, color: 0x00000000});
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const m = maxc(i);
    const a = m < 14 ? 0 : Math.min(1, (m - 8) / Math.max(40, smooth[y] - 8));
    if (a <= 0) continue;
    for (let c = 0; c < 3; c++) out.bitmap.data[i + c] = Math.min(255, Math.round(data[i + c] / Math.max(a, 0.05)));
    out.bitmap.data[i + 3] = Math.round(a * 255);
    white.bitmap.data.fill(255, i, i + 3);
    white.bitmap.data[i + 3] = Math.round(a * 255);
    if (a > 0.3) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
  }
const pad = 4;
const crop = {x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), w: Math.min(w, x1 + pad) - Math.max(0, x0 - pad), h: Math.min(h, y1 + pad) - Math.max(0, y0 - pad)};
for (const [img, suffix] of [[out, ''], [white, '-white']] as const) {
  img.crop(crop);
  await img.write(join(ROOT, 'public', 'brand', `${name}${suffix}.png`) as `${string}.png`);
}
console.log(`${name}: ${crop.w}×${crop.h} (aspect ${(crop.w / crop.h).toFixed(3)})`);
