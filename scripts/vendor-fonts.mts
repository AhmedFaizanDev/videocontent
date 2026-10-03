/**
 * Vendor the house fonts into the repo (run once, and again only when the font set changes):
 *
 *   node scripts/vendor-fonts.mts
 *
 * Downloads every face of FAMILIES (all their unicode subsets) from Google Fonts into
 * public/fonts/ and writes src/fonts.gen.json (family, weight, unicode-range, file). The
 * renderer loads fonts only from these files (src/fonts.ts) — so a render is identical on
 * any machine, needs no network, and never falls back to whatever system fonts a server has.
 * preflight checks every on-screen character against these ranges.
 */
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

/** family → weights. Scripts: Latin/Greek/Cyrillic/Vietnamese, Devanagari, Kannada, symbols, math. */
export const FAMILIES: Record<string, number[]> = {
  // headings: Sora Heavy only (src/fonts.ts maps every requested weight to it); Indic: Anek at its heaviest
  Sora: [800],
  'Anek Devanagari': [700],
  'Anek Kannada': [700],
  'Noto Sans Devanagari': [400, 500, 600, 700],
  'Noto Sans Kannada': [400, 500, 600, 700],
  'IBM Plex Mono': [400, 500, 600],
  // all other text: Noto Sans (+ its Indic siblings above)
  'Noto Sans': [400, 500, 600, 700],
  'Noto Sans Symbols 2': [400],
  'Noto Sans Math': [400],
};
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const url = `https://fonts.googleapis.com/css2?${Object.entries(FAMILIES)
  .map(([f, w]) => `family=${f.replace(/ /g, '+')}${w.length > 1 || w[0] !== 400 ? `:wght@${w.join(';')}` : ''}`)
  .join('&')}&display=block`;
const css = await (await fetch(url, {headers: {'User-Agent': UA}})).text();
// some faces carry a /* subset */ comment, some don't
const faces = [...css.matchAll(/(?:\/\* ([\w-]+) \*\/\s*)?@font-face \{([^}]*)\}/g)].map(([, subset, body], i) => ({
  subset: subset ?? `part${i}`,
  family: /font-family: '([^']+)'/.exec(body)![1],
  weight: Number(/font-weight: (\d+)/.exec(body)![1]),
  src: /src: url\(([^)]+)\)/.exec(body)![1],
  // a face without unicode-range covers its whole cmap
  unicodeRange: (/unicode-range: ([^;]+);/.exec(body)?.[1] ?? "U+0-10FFFF").trim(),
}));
if (!faces.length) throw new Error('no faces parsed — check the Google Fonts response');

const dir = join(ROOT, 'public', 'fonts');
rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});
const manifest = [];
let bytes = 0;
for (const f of faces) {
  const file = `fonts/${f.family.replace(/\s+/g, '')}-${f.weight}-${f.subset}.woff2`;
  const buf = Buffer.from(await (await fetch(f.src)).arrayBuffer());
  writeFileSync(join(ROOT, 'public', file), buf);
  bytes += buf.length;
  manifest.push({family: f.family, weight: f.weight, unicodeRange: f.unicodeRange, file});
}
writeFileSync(join(ROOT, 'src', 'fonts.gen.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`${manifest.length} faces, ${(bytes / 1e6).toFixed(1)} MB → public/fonts/, manifest src/fonts.gen.json`);
