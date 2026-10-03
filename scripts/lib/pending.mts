/**
 * Pronunciation candidates not yet heard (the dictionary's `pending` queue):
 * assets/pronunciation/pending.json = {lang: {word: {projects: [...], first: ISO date}}}.
 * Preflight appends every word its pronunciation watch flags; `say.mts <p> --pending` turns the
 * queue into one audition file; heard terms are promoted into src/dictionary.ts and dropped here.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {ROOT} from './paths.mts';
import {DICTIONARY} from '../../src/dictionary.ts';

export const PENDING = join(ROOT, 'assets', 'pronunciation', 'pending.json');
type Q = Record<string, Record<string, {projects: string[]; first: string}>>;
export const readPending = (): Q => (existsSync(PENDING) ? JSON.parse(readFileSync(PENDING, 'utf8')) : {});

export function addPending(lang: string, words: string[], project: string) {
  const q = readPending();
  const known = new Set(Object.keys((DICTIONARY as any)[lang] ?? {}).map((k) => k.toLowerCase()));
  const L = (q[lang] ??= {});
  let changed = false;
  for (const w of words) {
    if (known.has(w.toLowerCase())) continue;
    const e = (L[w] ??= ((changed = true), {projects: [], first: new Date().toISOString().slice(0, 10)}));
    if (!e.projects.includes(project)) {
      e.projects.push(project);
      changed = true;
    }
  }
  if (!changed) return;
  mkdirSync(dirname(PENDING), {recursive: true});
  writeFileSync(PENDING, JSON.stringify(q, null, 2) + '\n');
}
