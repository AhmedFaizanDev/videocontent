/**
 * Narration sync, the single source of truth: which spoken words fire which on-screen
 * reveals. The renderer (src/beats.ts + scene templates) and the validator both use this,
 * so `npm run validate` can prove — before any audio exists — that every reveal will find
 * its word. A reveal whose word is never spoken silently falls back to even spacing and
 * drifts off the narration; that is the bug class this module exists to prevent.
 * Every anchored item may carry `say: [...]` — the spoken word(s) that reveal it — when
 * its label's own words aren't what the narrator says.
 * Pure: no remotion imports.
 */
import type {Scene} from './spec';
import {spoken} from './project.ts';
import {calloutsFor} from './art/catalog.ts';
import {arr} from './stage.ts';

/** A word's comparable core, in any script (letters, combining vowel signs, digits). */
export const normWord = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');

/** Candidate keywords (≥ minLen chars) from a label/phrase. */
export const keywordsOf = (s: string, minLen = 4): string[] =>
  s
    .normalize('NFC')
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .map((x) => x.toLowerCase())
    .filter((x) => x.length >= minLen);

/** Does spoken word `w` (normalized) match any candidate? Substring matches need ≥4 chars. */
export const wordMatches = (w: string, cands: string[]) =>
  cands.some((c) => w === c || (c.length >= 4 && w.includes(c)) || (w.length >= 4 && c.includes(w)));

/**
 * For each phrase in order, the index of the first spoken word at/after the previous hit
 * (and ≥ `from`) that matches it; -1 when never spoken.
 */
export function matchPhrases(words: string[], phrases: (string | string[])[], from = 0): number[] {
  let cursor = from;
  return phrases.map((p) => {
    const cands = (Array.isArray(p) ? p : [p]).map(normWord).filter((c) => c.length >= 2);
    if (!cands.length) return -1;
    for (let j = cursor; j < words.length; j++)
      if (wordMatches(words[j], cands)) {
        cursor = j + 1;
        return j;
      }
    return -1;
  });
}

/** "Title: subtitle" → ["Title:", "subtitle"]. */
export const splitTopic = (topic: string): [string, string] => {
  const i = topic.indexOf(':');
  return i > 0 ? [topic.slice(0, i + 1), topic.slice(i + 1).trim()] : [topic, ''];
};

/** Pseudocode keywords (highlighted, and never used as a line's spoken anchor). */
export const KEYWORDS = new Set([
  'set', 'if', 'then', 'else', 'elseif', 'endif', 'for', 'each', 'in', 'to', 'from', 'step',
  'while', 'do', 'end', 'endfor', 'endwhile', 'repeat', 'until', 'print', 'output', 'display',
  'read', 'input', 'return', 'function', 'procedure', 'begin', 'call', 'break', 'continue',
  'and', 'or', 'not', 'mod', 'div', 'true', 'false', 'null', 'declare', 'as', 'swap', 'let',
  'class', 'new', 'this', 'self', 'extends', 'method',
]);
export const lineIdentifiers = (line: string): string[] =>
  (line.split(/\/\/|#/)[0].match(/[A-Za-z][A-Za-z0-9]{2,}/g) ?? []).map((t) => t.toLowerCase()).filter((t) => !KEYWORDS.has(t));

/**
 * A scene's word-anchored reveals, grouped as the template anchors them. `startFrac` = the
 * fraction of the narration to skip before searching (e.g. intro ticks wait for the
 * "by the end, you'll…" enumeration). `strict` groups must all be spoken (validator error);
 * others may fall back to even spacing by design (validator note).
 */
export type RevealGroup = {phrases: string[][]; labels: string[]; startFrac?: number; strict: boolean};

export function revealGroups(s: Scene): Record<string, RevealGroup> {
  const g = (labels: string[], phrases: string[][], strict = true, startFrac?: number): RevealGroup => ({labels, phrases, strict, startFrac});
  switch (s.type) {
    case 'intro': {
      const head = splitTopic(s.topic)[0];
      return {title: g([s.topic], [keywordsOf(head, 3)]), learn: g(s.learn, s.learn.map((l) => keywordsOf(l)), true, 0.4)};
    }
    case 'definition': {
      const chips = s.chips ?? [];
      return {chips: g(chips.map((c) => c.label), chips.map((c) => c.say ?? [c.label, ...keywordsOf(c.label, 3)]), false)};
    }
    case 'steps':
      return {steps: g(s.steps.map((x) => x.label), s.steps.map((x) => x.say ?? [...keywordsOf(x.label.split(/[—–-]/)[0]), ...keywordsOf(x.label)]))};
    case 'pseudocode':
      return {lines: g(s.lines, s.lines.map(lineIdentifiers), false)};
    case 'example': {
      const boxLabels = new Set(s.boxes.map((b) => b.label.toLowerCase()));
      return {
        trace: g(
          s.trace.map((r) => r.note),
          s.trace.map((r) => {
            if (r.say) return r.say;
            const distinctive = keywordsOf(r.note).filter((w) => !boxLabels.has(w));
            return distinctive.length ? distinctive : [...Object.keys(r.set ?? {}), ...(r.highlight ? [r.highlight] : [])];
          }),
        ),
      };
    }
    case 'compare':
      return {
        left: g(s.left.items.map((i) => i.label), s.left.items.map((i) => i.say ?? [...keywordsOf(i.label), s.left.keyword])),
        right: g(s.right.items.map((i) => i.label), s.right.items.map((i) => i.say ?? [...keywordsOf(i.label), s.right.keyword])),
      };
    case 'recap':
      return {bullets: g(s.bullets.map((b) => b.label), s.bullets.map((b) => b.say ?? keywordsOf(b.label.split('—')[0])))};
    case 'figure': {
      const callouts = calloutsFor(s.art, s.data, s.callouts);
      return {callouts: g(callouts.map((c) => c.label), callouts.map((c) => c.say ?? keywordsOf(c.label, 3)))};
    }
    case 'stage': {
      const beats = s.beats ?? [];
      const labels = (b: (typeof beats)[number]) => arr(b.label).map((l) => l.text);
      return {beats: g(beats.map((b, i) => labels(b)[0] ?? b.note ?? `beat ${i + 1}`), beats.map((b) => b.say ?? labels(b).flatMap((t) => keywordsOf(t))))};
    }
    case 'answer': {
      const points = (s.points ?? []).map((p) => (typeof p === 'string' ? {label: p} : p));
      return {points: g(points.map((p) => p.label), points.map((p) => p.say ?? keywordsOf(p.label)), true, 0.18)};
    }
    default:
      return {};
  }
}

/** Text-only sync audit of one scene: every reveal that would miss its word. */
export function syncProblems(s: Scene): {strict: boolean; msg: string}[] {
  const words = spoken(s.narration ?? "").split(/\s+/).map(normWord).filter(Boolean);
  const out: {strict: boolean; msg: string}[] = [];
  for (const [name, grp] of Object.entries(revealGroups(s))) {
    const hits = matchPhrases(words, grp.phrases, Math.floor((grp.startFrac ?? 0) * words.length));
    hits.forEach((h, i) => {
      if (h >= 0) return;
      const said = grp.phrases[i].length ? `none of [${grp.phrases[i].join(', ')}] is spoken` : 'nothing speakable to anchor to';
      const where = grp.startFrac ? ` after the first ${Math.round(grp.startFrac * 100)}% of the narration` : ' (in order)';
      out.push({strict: grp.strict, msg: `${name}[${i}] "${grp.labels[i]}" — ${said}${where}`});
    });
  }
  return out;
}

/**
 * Where each reveal lands in a timed word list (seconds from narration start), per group;
 * null where the word is never spoken. Used on synthetic timings (preflight) and on the
 * real TTS timeline (voiceover), so both check exactly what the renderer will do.
 */
export function revealTimes(s: Scene, words: {w: string; start: number}[], voSec: number): Record<string, {label: string; t: number | null; strict: boolean}[]> {
  const out: Record<string, {label: string; t: number | null; strict: boolean}[]> = {};
  for (const [name, grp] of Object.entries(revealGroups(s))) {
    let from = 0;
    const floor = (grp.startFrac ?? 0) * voSec;
    while (from < words.length && words[from].start < floor) from++;
    const hits = matchPhrases(words.map((w) => w.w), grp.phrases, from);
    out[name] = hits.map((h, i) => ({label: grp.labels[i], t: h >= 0 ? words[h].start : null, strict: grp.strict}));
  }
  return out;
}
