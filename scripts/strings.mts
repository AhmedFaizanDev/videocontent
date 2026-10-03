/**
 * Translate a finished lesson instead of authoring it again: the structure, art, anchors and
 * pacing decisions carry over; only the words change (a fraction of the tokens).
 *
 *   node scripts/strings.mts extract <project> <id> [--to <project>]   → JSON {path: text} on stdout (+ the target's word budget on stderr)
 *   node scripts/strings.mts apply <project> <id> <strings.json> --to <project>/<id> [--filename F.mp4]
 *
 * Extracted: every spoken/on-screen string (narration first in each scene, then labels,
 * notes, `say` words…). Not extracted: ids, anchors, art names, tones, graph wiring, numbers.
 * Translate the values (keep the keys), make each `say` word one that the translated
 * narration literally speaks, then apply and run preflight on the target project.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {loadProject, readSpecRaw, specPath} from './lib/paths.mts';

const FIXED = new Set(['id', 'outputFilename', 'episode', 'type', 'art', 'anchor', 'tone', 'shape', 'color', 'direction', 'from', 'to', 'group', 'show', 'flow', 'focus', 'token', 'cut', 'src', 'credit', 'marks', 'icon']);

type Strings = Record<string, string>;

function extract(node: any, path: string[], out: Strings) {
  if (typeof node === 'string') {
    if (node.trim()) out[path.join('.')] = node;
    return;
  }
  if (Array.isArray(node)) return node.forEach((x, i) => extract(x, [...path, String(i)], out));
  if (!node || typeof node !== 'object') return;
  const keys = Object.keys(node);
  // narration first, so the words each `say` must match are read before the labels
  for (const k of ['narration', ...keys.filter((k) => k !== 'narration')]) {
    if (!(k in node) || FIXED.has(k)) continue;
    // definition highlight is {word: colour}: the words are text, the colours are not
    if (k === 'highlight' && !Array.isArray(node[k]) && typeof node[k] === 'object') {
      Object.keys(node[k]).forEach((w, i) => (out[[...path, 'highlight{}', String(i)].join('.')] = w));
      continue;
    }
    extract(node[k], [...path, k], out);
  }
}

function apply(spec: any, strings: Strings) {
  const highlights = new Map<string, string[]>();
  for (const [p, text] of Object.entries(strings)) {
    const parts = p.split('.');
    const hi = parts.indexOf('highlight{}');
    if (hi >= 0) {
      const key = parts.slice(0, hi).join('.');
      highlights.set(key, [...(highlights.get(key) ?? []), text]);
      continue;
    }
    let o = spec;
    for (const k of parts.slice(0, -1)) {
      if (o[k] === undefined) throw new Error(`unknown path ${p}`);
      o = o[k];
    }
    if (typeof o[parts[parts.length - 1]] !== 'string') throw new Error(`not a text field: ${p}`);
    o[parts[parts.length - 1]] = text;
  }
  for (const [key, words] of highlights) {
    let o = spec;
    for (const k of key.split('.')) o = o[k];
    const colours = Object.values(o.highlight);
    o.highlight = Object.fromEntries(words.map((w, i) => [w, colours[i] ?? 'accent']));
  }
  return spec;
}

const [cmd, project, id, file] = process.argv.slice(2);
if (cmd === 'extract' && project && id) {
  const out: Strings = {};
  extract(readSpecRaw(project, id), [], out);
  console.log(JSON.stringify(out, null, 1));
  // the length budget, up front: translations run long, and a trim pass costs a whole extra round
  const to = process.argv.includes('--to') ? process.argv[process.argv.indexOf('--to') + 1].split('/')[0] : null;
  const words = Object.entries(out).filter(([k]) => k.endsWith('.narration')).reduce((n, [, v]) => n + v.split(/\s+/).filter((w) => w && w !== '[pause]').length, 0);
  if (to) {
    const cfg = loadProject(to);
    const [lo, hi] = cfg.length.minutes;
    console.error(`source narration: ${words} words · ${to} (${cfg.lang}, ~${cfg.voice.wpm} wpm, ${lo}–${hi} min) → write ≤ ~${Math.round(((lo + hi) / 2 - 1) * cfg.voice.wpm)} words: condense while translating, keep every scene and fact`);
  }
} else if (cmd === 'apply' && project && id && file) {
  const flag = (k: string) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : undefined);
  const to = flag('to');
  if (!to || !to.includes('/')) (console.error('--to <project>/<id> required'), process.exit(1));
  const [tp, tid] = to.split('/');
  const spec = apply(readSpecRaw(project, id), JSON.parse(readFileSync(file, 'utf8')));
  spec.id = tid;
  spec.outputFilename = flag('filename') ?? `${tp}_${tid}.mp4`.replace(/[^A-Za-z0-9_.-]/g, '_');
  const dst = specPath(tp, tid);
  if (!existsSync(dirname(dst))) mkdirSync(dirname(dst), {recursive: true});
  writeFileSync(dst, JSON.stringify(spec, null, 2) + '\n');
  console.log(`wrote ${dst.replace(process.cwd() + '/', '')} — now: node scripts/preflight.mts ${tp} ${tid} --no-render`);
} else {
  console.error('usage: strings.mts extract <project> <id> | apply <project> <id> <strings.json> --to <project>/<id> [--filename F.mp4]');
  process.exit(1);
}
