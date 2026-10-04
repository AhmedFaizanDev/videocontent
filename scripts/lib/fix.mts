/**
 * Deterministic fixers — repair the known failure classes without a model call (zero tokens),
 * before any repair prompt is spent. Each returns what it changed, for the metrics and the log.
 *
 *   abbreviation  an abbreviation in the narration → its spoken full form from the house
 *                 dictionary (src/dictionary.ts) or project.json `fullForms`; `say` words that
 *                 named it follow (the screen keeps the abbreviation)
 *   spelling      a variant → the approved spelling (narration and on-screen text)
 *   ratio         "30:2" in the narration → "30 to 2"
 *   say           a phrase cue is split into words; a cue none of whose words the scene speaks
 *                 is dropped, so the compiler derives the cue from the item's own text instead
 */
import {fullForms, spellings} from '../../src/dictionary.ts';
import {normWord, wordMatches} from '../../src/sync.ts';
import {spoken} from '../../src/project.ts';
import type {Lang} from '../../src/lang.ts';

export type Fix = {kind: 'abbreviation' | 'spelling' | 'ratio' | 'say'; scene: number; what: string};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const caseLike = (src: string, to: string) => (/^[A-Z]/.test(src) ? to[0].toUpperCase() + to.slice(1) : to);

export function fixSpec(spec: any, lang: Lang = 'en', extraFull: Record<string, string> = {}): {spec: any; fixes: Fix[]} {
  const out = JSON.parse(JSON.stringify(spec));
  const fixes: Fix[] = [];
  const full = {...fullForms(lang), ...extraFull};
  const spell = spellings(lang);
  (out.scenes ?? []).forEach((s: any, i: number) => {
    if (typeof s?.narration !== 'string') return;
    // abbreviations (case-sensitive: "WHO" is an abbreviation, "who" is not; plurals follow)
    for (const [ab, f] of Object.entries(full)) {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${esc(ab)}(s?)(?=$|[^\\p{L}\\p{N}])`, 'gu');
      if (!re.test(s.narration)) continue;
      s.narration = s.narration.replace(re, (_m: string, pre: string, pl: string) => `${pre}${f}${pl}`);
      fixes.push({kind: 'abbreviation', scene: i, what: `${ab} → ${f}`});
      // a cue that listened for the abbreviation now listens for the full form's first word
      walkSay(s, (say) => say.map((w) => (w.toLowerCase() === ab.toLowerCase() ? f.split(' ')[0] : w)));
    }
    // ratios
    if (/\b\d+:\d+\b/.test(s.narration)) {
      s.narration = s.narration.replace(/\b(\d+):(\d+)\b/g, (_m: string, a: string, b: string) => {
        fixes.push({kind: 'ratio', scene: i, what: `${a}:${b} → ${a} to ${b}`});
        return `${a} to ${b}`;
      });
    }
  });
  // approved spellings: narration and every on-screen string (never ids, arts or anchors)
  const SKIP = new Set(['id', 'art', 'on', 'focus', 'act', 'pulse', 'reveal', 'type', 'kind', 'outputFilename', 'slot', 'layout']);
  const respell = (t: string, i: number) => {
    let r = t;
    for (const [v, ok] of Object.entries(spell)) {
      const re = new RegExp(`\\b${esc(v)}\\b`, 'gi');
      if (re.test(r)) {
        r = r.replace(re, (m) => caseLike(m, ok));
        fixes.push({kind: 'spelling', scene: i, what: `${v} → ${ok}`});
      }
    }
    return r;
  };
  const walk = (x: any, i: number, key = ''): any => (typeof x === 'string' ? (SKIP.has(key) ? x : respell(x, i)) : Array.isArray(x) ? x.map((y) => walk(y, i, key)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v, i, k)])) : x);
  out.scenes = (out.scenes ?? []).map((s: any, i: number) => walk(s, i));
  // cues the narration never speaks: let the compiler derive them from the label
  out.scenes.forEach((s: any, i: number) => {
    if (typeof s?.narration !== 'string') return;
    const words = spoken(s.narration).split(/\s+/).map(normWord).filter(Boolean);
    const heard = (say: string[]) => say.some((w) => words.some((x) => wordMatches(x, [normWord(w)])));
    walkSay(s, (say0) => {
      // a phrase in one cue ("four separate") can never match a single spoken word: split it
      // …and a cue is matched as spoken ("10.5%" is heard as "10.5 percent")
      const say = say0.flatMap((w) => spoken(w.trim()).split(/\s+/).filter((x) => normWord(x)));
      if (say.join(' ') !== say0.join(' ')) fixes.push({kind: 'say', scene: i, what: `normalised cue "${say0.join(' | ')}"`});
      if (heard(say)) return say;
      fixes.push({kind: 'say', scene: i, what: `dropped unspoken cue "${say.join(' ')}"`});
      return null;
    });
  });
  return {spec: out, fixes: dedupe(fixes)};
}

/** Every `say` cue in a scene (points, notes, moves, elements, flow steps, table rows). */
function walkSay(s: any, f: (say: string[]) => string[] | null) {
  const one = (o: any) => {
    if (o && Array.isArray(o.say) && o.say.every((w: any) => typeof w === 'string')) {
      const r = f(o.say);
      if (r) o.say = r;
      else delete o.say;
    }
  };
  for (const k of ['points', 'notes', 'moves', 'elements', 'steps']) (s[k] ?? []).forEach(one);
  for (const e of s.elements ?? []) (e.items ?? []).forEach(one);
  // a table's say is positional (one cue per row): an unspoken one becomes null (derived)
  for (const t of [s, ...(s.elements ?? [])])
    if (Array.isArray(t.say) && t.say.some((x: any) => Array.isArray(x))) t.say = t.say.map((x: any) => (Array.isArray(x) ? f(x) : x));
}
const dedupe = (fs: Fix[]) => [...new Map(fs.map((x) => [`${x.kind}|${x.scene}|${x.what}`, x])).values()];
