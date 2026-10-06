/**
 * One-off: converts the black-on-white brand logo into a white-on-transparent
 * PNG (public/logo-white.png) so it sits cleanly on the dark video theme.
 * Run with: node scripts/prep-logo.mts
 */
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Jimp} from 'jimp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const img = await Jimp.read(join(ROOT, 'public', 'logo.png'));

img.scan(0, 0, img.bitmap.width, img.bitmap.height, (_x, _y, idx) => {
  const d = img.bitmap.data;
  const lum = (d[idx] + d[idx + 1] + d[idx + 2]) / 3;
  // dark ink -> opaque white; white paper -> transparent; edges stay soft
  d[idx + 3] = Math.round((255 - lum) * (d[idx + 3] / 255));
  d[idx] = 255;
  d[idx + 1] = 255;
  d[idx + 2] = 255;
});

await img.write(join(ROOT, 'public', 'logo-white.png') as `${string}.${string}`);
console.log('Wrote public/logo-white.png');
