/**
 * Generates the tileable paper stock used by the "Proof" design system:
 * public/textures/paper.png — warm uncoated stock with fibres and faint mottling.
 * Deterministic (seeded periodic value noise), so every machine produces the same file.
 *
 *   node scripts/prep-textures.mts
 */
import {Jimp} from 'jimp';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

const N = 1024;
const hash = (x: number, y: number, s: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
/** Periodic value noise: lattice wraps every `period` cells, so the tile is seamless. */
const vnoise = (x: number, y: number, px: number, seed: number, py = px) => {
  const period = px;
  const fx = (x / N) * px;
  const fy = (y / N) * py;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const g = (i: number, j: number) => hash(((i % period) + period) % period, ((j % py) + py) % py, seed);
  const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
  const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
};

const base = [238, 231, 217]; // #EEE7D9
const img = new Jimp({width: N, height: N, color: 0xeee7d9ff});
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const mottle = vnoise(x, y, 4, 1) * 0.6 + vnoise(x, y, 8, 2) * 0.4; // cloudy stock
    const fibreA = vnoise(x, y, 12, 3, 160); // long, thin fibres (anisotropic periods)
    const fibreB = vnoise(x, y, 140, 4, 10);
    const tooth = hash(x, y, 9); // fine grain
    const d = (mottle - 0.5) * 8 + (Math.pow(fibreA, 8) + Math.pow(fibreB, 8)) * -6 + (tooth - 0.5) * 6;
    const i = (y * N + x) * 4;
    img.bitmap.data[i] = Math.max(0, Math.min(255, base[0] + d));
    img.bitmap.data[i + 1] = Math.max(0, Math.min(255, base[1] + d));
    img.bitmap.data[i + 2] = Math.max(0, Math.min(255, base[2] + d * 1.1));
    img.bitmap.data[i + 3] = 255;
  }
await img.write(join(ROOT, 'public', 'textures', 'paper.png') as `${string}.${string}`);

console.log('Wrote public/textures/paper.png');
