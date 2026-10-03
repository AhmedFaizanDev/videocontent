/**
 * Languages: one per project (project.json `lang`). Owns everything that differs by
 * language on screen — the template's fixed words (UI), and the script's typographic
 * metrics (line height, glyph advance) — so templates never hard-code English.
 * Pure (no remotion imports).
 *
 * The renderer renders one project per bundle, so the active language is set once per
 * render (VideoComposition → setLang) and read by the layout helpers below.
 */

export type Lang = 'en' | 'hi' | 'mr' | 'kn';
export const LANGS: Lang[] = ['en', 'hi', 'mr', 'kn'];

/** Indic scripts: Devanagari (hi, mr) and Kannada (kn). */
export const isIndic = (l: Lang) => l !== 'en';

let current: Lang = 'en';
export const setLang = (l: Lang | undefined) => void (current = l ?? 'en');
export const lang = () => current;

/**
 * Line height for the active script. Devanagari/Kannada carry vowel signs above and
 * below the letter body, so tight Latin display leading (0.98) would make lines collide.
 */
export const lh = (x: number) => (isIndic(current) ? Math.max(x * 1.2, x + 0.24) : x);

/** Letters of any script, digits and combining marks — what a "word" is made of. */
export const WORD_CHARS = /[\p{L}\p{M}\p{N}]/u;
export const NON_WORD = /[^\p{L}\p{M}\p{N}]+/gu;

/** The template's own words, per language. */
export const UI: Record<Lang, Record<string, string>> = {
  en: {
    inThisLesson: 'In this lesson', definition: 'Definition', knowledgeCheck: 'Knowledge check', pauseThink: 'Pause and think.',
    answerSoon: 'Answer in a moment', commonMistake: 'Common mistake', wrong: 'Wrong', fixed: 'Right', result: 'Result', vs: 'vs',
    answer: 'Answer', tip: 'Tip', note: 'Note', fig: 'Fig.', chapter: 'Chapter', q: 'Q.', lines: 'lines', takeaway: 'Takeaway',
    line: 'Line', min: 'min', sys: 'SYS', dia: 'DIA', trace: 'Trace', pseudocode: 'Pseudocode', code: 'Code', error: 'Error', step: 'Step', keyTakeaway: 'Key takeaway',
  },
  hi: {
    inThisLesson: 'इस पाठ में', definition: 'परिभाषा', knowledgeCheck: 'ज्ञान की जाँच', pauseThink: 'रुकिए और सोचिए।',
    answerSoon: 'उत्तर थोड़ी देर में', commonMistake: 'आम गलती', wrong: 'गलत', fixed: 'सही', result: 'परिणाम', vs: 'बनाम',
    answer: 'उत्तर', tip: 'सुझाव', note: 'ध्यान दें', fig: 'चित्र', chapter: 'अध्याय', q: 'प्रश्न', lines: 'पंक्तियाँ', takeaway: 'मुख्य बात',
    line: 'पंक्ति', min: 'मिनट', sys: 'सिस्टोलिक', dia: 'डायस्टोलिक', trace: 'क्रम', pseudocode: 'स्यूडोकोड', code: 'कोड', error: 'त्रुटि', step: 'चरण', keyTakeaway: 'मुख्य बात',
  },
  mr: {
    inThisLesson: 'या पाठात', definition: 'व्याख्या', knowledgeCheck: 'ज्ञान तपासणी', pauseThink: 'थांबा आणि विचार करा.',
    answerSoon: 'उत्तर थोड्याच वेळात', commonMistake: 'सामान्य चूक', wrong: 'चूक', fixed: 'बरोबर', result: 'निकाल', vs: 'विरुद्ध',
    answer: 'उत्तर', tip: 'टीप', note: 'लक्षात ठेवा', fig: 'आकृती', chapter: 'प्रकरण', q: 'प्रश्न', lines: 'ओळी', takeaway: 'मुख्य मुद्दा',
    line: 'ओळ', min: 'मिनिटे', sys: 'सिस्टोलिक', dia: 'डायस्टोलिक', trace: 'क्रम', pseudocode: 'स्यूडोकोड', code: 'कोड', error: 'त्रुटी', step: 'पायरी', keyTakeaway: 'मुख्य मुद्दा',
  },
  kn: {
    inThisLesson: 'ಈ ಪಾಠದಲ್ಲಿ', definition: 'ವ್ಯಾಖ್ಯಾನ', knowledgeCheck: 'ಜ್ಞಾನ ಪರೀಕ್ಷೆ', pauseThink: 'ನಿಲ್ಲಿಸಿ, ಯೋಚಿಸಿ.',
    answerSoon: 'ಉತ್ತರ ಸ್ವಲ್ಪ ಹೊತ್ತಿನಲ್ಲಿ', commonMistake: 'ಸಾಮಾನ್ಯ ತಪ್ಪು', wrong: 'ತಪ್ಪು', fixed: 'ಸರಿ', result: 'ಫಲಿತಾಂಶ', vs: 'ವಿರುದ್ಧ',
    answer: 'ಉತ್ತರ', tip: 'ಸಲಹೆ', note: 'ಗಮನಿಸಿ', fig: 'ಚಿತ್ರ', chapter: 'ಅಧ್ಯಾಯ', q: 'ಪ್ರಶ್ನೆ', lines: 'ಸಾಲುಗಳು', takeaway: 'ಮುಖ್ಯ ಅಂಶ',
    line: 'ಸಾಲು', min: 'ನಿಮಿಷ', sys: 'ಸಿಸ್ಟೊಲಿಕ್', dia: 'ಡಯಾಸ್ಟೊಲಿಕ್', trace: 'ಕ್ರಮ', pseudocode: 'ಸ್ಯೂಡೋಕೋಡ್', code: 'ಕೋಡ್', error: 'ದೋಷ', step: 'ಹಂತ', keyTakeaway: 'ಮುಖ್ಯ ಅಂಶ',
  },
};
export const ui = (k: string) => UI[current][k] ?? UI.en[k] ?? k;

/** Sentence-ending punctuation of any of our scripts (Devanagari danda included). */
export const SENTENCE_END = /[.!?…।॥][\"')\]”’]*$/;

/** An abbreviation or formula: BP, WHO, HbA1c, CO₂, O2, mmHg (not plain words or numbers). */
export const isAbbr = (w: string) => {
  const c = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}₀-₉]+$/gu, '');
  if (c.length < 2 || c.length > 8 || !/^[A-Za-z0-9₀-₉]+$/.test(c) || /^\d+$/.test(c)) return false;
  const caps = (c.match(/[A-Z]/g) ?? []).length;
  return caps >= 2 || (caps >= 1 && /[0-9₀-₉]/.test(c)) || c === 'mmHg';
};
