/**
 * House pronunciation lexicon: how the voice should SAY a word, per language. Captions and
 * the screen keep the word as written; only the speech text changes (scripts/lib/speak.mts).
 * Merged under every project's own `lexicon` (project.json wins). Keys match whole words,
 * case-insensitively, ignoring surrounding punctuation ("MedSkills’" matches "MedSkills").
 *
 * Add an entry the first time a word sounds wrong in ANY video — never fix it per lesson.
 * Audition a respelling first: node scripts/say.mts <project> "word or phrase"
 */
import type {Lang} from './lang.ts';
import {respellings} from './dictionary.ts';

/** Derived from the house dictionary (src/dictionary.ts) — add terms there, not here. */
export const HOUSE_LEXICON: Record<Lang, Record<string, string>> = {en: respellings('en'), hi: respellings('hi'), mr: respellings('mr'), kn: respellings('kn')};
