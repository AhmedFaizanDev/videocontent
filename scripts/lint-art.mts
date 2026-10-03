/**
 * Guards against render-only text bugs: SVG <text> is laid out by Chrome once, sometimes
 * against fallback-font metrics, and not re-laid out when the web font loads — so in long
 * renders some frames show shifted/clipped labels while stills look perfect. All text in
 * src/ must be HTML (art text goes in an ArtDef's `Html` layer). Run by `npm run validate`.
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(f)) files.push(p);
  }
};
walk(join(ROOT, 'src'));
const bad = files.flatMap((p) =>
  readFileSync(p, 'utf8')
    .split('\n')
    .flatMap((l, i) => (!/^\s*(\*|\/\/|\/\*)/.test(l) && /<(text|tspan|textPath)(\s|>|$)/.test(l) ? [`${p.replace(ROOT + '/', '')}:${i + 1}`] : [])),
);
if (bad.length) {
  console.log(`❌ SVG text found (use HTML text — see src/templates/art.tsx):\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
console.log('✅ no SVG text in src/');
