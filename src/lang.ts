/**
 * Languages: one per project (project.json `lang`). Owns everything that differs by
 * language on screen — the template's fixed words (UI), and the script's typographic
 * metrics (line height, glyph advance) — so templates never hard-code English.
 * Pure (no remotion imports).
 *
 * The renderer renders one project per bundle, so the active language is set once per
 * render (VideoComposition → setLang) and read by the layout helpers below.
 */

export type Lang = 'en' | 'hi' | 'mr' | 'kn' | 'ja';
export const LANGS: Lang[] = ['en', 'hi', 'mr', 'kn', 'ja'];

/** Non-Latin scripts: Devanagari (hi, mr), Kannada (kn), Japanese (ja) — taller leading, no tracking, wider glyphs. */
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
  ja: {
    inThisLesson: 'このレッスンで学ぶこと', definition: '定義', knowledgeCheck: '理解度チェック', pauseThink: '少し考えてみましょう。',
    answerSoon: 'まもなく解答', commonMistake: 'よくある間違い', wrong: '誤り', fixed: '正しい', result: '結果', vs: '対',
    answer: '解答', tip: 'ヒント', note: '注意', fig: '図', chapter: '章', q: '問', lines: '行', takeaway: 'ポイント',
    line: '行', min: '分', sys: '収縮期', dia: '拡張期', trace: '手順', pseudocode: '疑似コード', code: 'コード', error: 'エラー', step: 'ステップ', keyTakeaway: '重要ポイント',
  },
};
export const ui = (k: string) => UI[current][k] ?? UI.en[k] ?? k;

/** Sentence-ending punctuation of any of our scripts (Devanagari danda, Japanese 。！？ included). */
export const SENTENCE_END = /[.!?…।॥。！？][\"')\]”’」』]*$/;

/**
 * Japanese is written without spaces and breaks between any two characters; each glyph is
 * full-width (about two Latin letters). Layout estimates count text in Latin-letter columns.
 */
export const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u30FF\uFF00-\uFFEF]/u;
export const cols = (s: string) => [...s].reduce((n, c) => n + (WIDE.test(c) ? 2 : 1), 0);
/** Speaking time in Latin-letter units: a Japanese character takes ≈ 2.5 letters' time (pilot voicing: 4.8 vs 12 characters/s). */
export const speechLen = (s: string) => [...s].reduce((n, c) => n + (WIDE.test(c) ? 2.5 : 1), 0);
/** Content length in English-word equivalents: Japanese runs ≈ 5.7 columns per English word (measured on the pilot translations). */
export const wordCount = (s: string) => (WIDE.test(s) ? Math.round(cols(s.replace(/\s+/g, '')) / 5.7) : s.trim() ? s.trim().split(/\s+/).length : 0);
/** Line-break units: Latin words, or single wide characters. */
export const units = (s: string) => s.match(new RegExp(`${WIDE.source}|[^\\s${WIDE.source.slice(1, -1)}]+`, 'gu')) ?? [];

/** An abbreviation or formula: BP, WHO, HbA1c, CO₂, O2, mmHg (not plain words or numbers). */
export const isAbbr = (w: string) => {
  const c = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}₀-₉]+$/gu, '');
  if (c.length < 2 || c.length > 8 || !/^[A-Za-z0-9₀-₉]+$/.test(c) || /^\d+$/.test(c)) return false;
  const caps = (c.match(/[A-Z]/g) ?? []).length;
  return caps >= 2 || (caps >= 1 && /[0-9₀-₉]/.test(c)) || c === 'mmHg';
};
