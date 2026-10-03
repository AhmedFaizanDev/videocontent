/**
 * Glyph coverage: every character a lesson puts on screen must be in a vendored house font
 * (src/fonts.gen.json), or it would render in whatever fallback font the rendering machine
 * happens to have — or as an empty box. Ranges come from the fonts' declared unicode subsets;
 * a face that declares no range isn't trusted for coverage (it stays a render fallback only).
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './paths.mts';
import {UI} from '../../src/lang.ts';

const faces: {unicodeRange: string}[] = JSON.parse(readFileSync(join(ROOT, 'src', 'fonts.gen.json'), 'utf8'));
const ranges: [number, number][] = faces
  .filter((f) => !/^U\+0-10FFFF$/i.test(f.unicodeRange))
  .flatMap((f) =>
    f.unicodeRange.split(',').map((r) => {
      const [a, b] = r.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(a, 16), parseInt(b ?? a, 16)] as [number, number];
    }),
  );
const covered = (cp: number) => cp < 0x20 || ranges.some(([a, b]) => cp >= a && cp <= b);

/** Keys whose values are identifiers, not text. */
const NOT_TEXT = new Set(['id', 'outputFilename', 'type', 'art', 'anchor', 'tone', 'shape', 'color', 'direction', 'from', 'to', 'group', 'show', 'flow', 'focus', 'token', 'cut', 'src', 'icon', 'say']);
function* texts(node: any, key = ''): Generator<string> {
  if (typeof node === 'string') {
    if (!NOT_TEXT.has(key)) yield node;
  } else if (Array.isArray(node)) for (const x of node) yield* texts(x, key);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (!NOT_TEXT.has(k)) yield* texts(v, k);
}

/** Characters of the spec (and the project's on-screen strings) with no house glyph. */
export function uncovered(spec: any, project: {name: string; series: string; lang: string; brand: {signoff: string; episodeLabel: string}}): string[] {
  const all = [...texts(spec), project.series, project.brand.signoff, project.brand.episodeLabel, ...Object.values(UI[project.lang as keyof typeof UI] ?? {})].join('');
  const bad = new Set<string>();
  for (const ch of all) if (!covered(ch.codePointAt(0)!)) bad.add(ch);
  return [...bad];
}
