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

export const HOUSE_LEXICON: Record<Lang, Record<string, string>> = {
  en: {
    // brand: chosen by the owner's ear from an audition of 8 respellings (2026-10-04,
    // `say.mts --variants`): "Med Skills" still sounded wrong in the Indian English voice
    MedSkills: 'Medd Skills',
    MedXL: 'Med X L',
  },
  hi: {MedSkills: 'मेड स्किल्स', 'मेडस्किल्स': 'मेड स्किल्स'},
  mr: {MedSkills: 'मेड स्किल्स', 'मेडस्किल्स': 'मेड स्किल्स'},
  kn: {MedSkills: 'ಮೆಡ್ ಸ್ಕಿಲ್ಸ್', 'ಮೆಡ್‌ಸ್ಕಿಲ್ಸ್': 'ಮೆಡ್ ಸ್ಕಿಲ್ಸ್', 'ಮೆಡ್ಸ್ಕಿಲ್ಸ್': 'ಮೆಡ್ ಸ್ಕಿಲ್ಸ್'},
};
