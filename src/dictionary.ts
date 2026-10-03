/**
 * The house pronunciation dictionary — reusable across every project and language.
 * One entry per term; the pipeline derives everything from it:
 *   say    how the voice should say it (a respelling) → the house lexicon (src/lexicon.ts)
 *   full   an abbreviation's spoken full form → the narration fixer (scripts/lib/fix.mts) and the
 *          writer brief; the abbreviation itself stays on screen
 *   spell  the approved spelling of a variant (house spelling is British) → the fixer
 * cat: brand · medical · abbreviation · proper · tts (a known voice failure) · spelling
 * status: approved (heard and right) · respelled (a respelling heard and right) · pending (not yet
 * heard; preflight's pronunciation watch appends candidates to assets/pronunciation/pending.json,
 * `node scripts/say.mts <p> --pending` makes the audition sheet, then promote them here).
 *
 * Add a term the first time it sounds wrong in ANY video — never fix it per lesson.
 */
import type {Lang} from './lang.ts';

export type Term = {say?: string; full?: string; spell?: string; cat: 'brand' | 'medical' | 'abbreviation' | 'proper' | 'tts' | 'spelling'; status: 'approved' | 'respelled' | 'pending'; note?: string};

export const DICTIONARY: Record<Lang, Record<string, Term>> = {
  en: {
    // brand: chosen by the owner's ear from an audition of 8 respellings (2026-10-04, `say.mts --variants`)
    MedSkills: {say: 'Medd Skills', cat: 'brand', status: 'respelled', note: 'owner audition 2026-10-04, option 4'},
    MedXL: {say: 'Med X L', cat: 'brand', status: 'respelled'},
    // anatomy the Indian English voice misreads (heard in human-heart, 2026-09)
    chordae: {say: 'kor-dee', cat: 'medical', status: 'respelled'},
    tendineae: {say: 'ten-din-ee-ee', cat: 'medical', status: 'respelled'},
    venae: {say: 'vee-nee', cat: 'medical', status: 'respelled'},
    cavae: {say: 'kay-vee', cat: 'medical', status: 'respelled'},
    // abbreviations: the narration speaks the full form, the screen shows the abbreviation
    CPR: {full: 'cardiopulmonary resuscitation', cat: 'abbreviation', status: 'approved'},
    AED: {full: 'automated external defibrillator', cat: 'abbreviation', status: 'approved'},
    BLS: {full: 'basic life support', cat: 'abbreviation', status: 'approved'},
    ACLS: {full: 'advanced cardiovascular life support', cat: 'abbreviation', status: 'approved'},
    VF: {full: 'ventricular fibrillation', cat: 'abbreviation', status: 'approved'},
    VT: {full: 'ventricular tachycardia', cat: 'abbreviation', status: 'approved'},
    PEA: {full: 'pulseless electrical activity', cat: 'abbreviation', status: 'approved'},
    ROSC: {full: 'return of spontaneous circulation', cat: 'abbreviation', status: 'approved'},
    EMS: {full: 'emergency medical services', cat: 'abbreviation', status: 'approved'},
    ECG: {full: 'electrocardiogram', cat: 'abbreviation', status: 'approved'},
    CSSD: {full: 'central sterile services department', cat: 'abbreviation', status: 'approved'},
    PPE: {full: 'personal protective equipment', cat: 'abbreviation', status: 'approved'},
    ICU: {full: 'intensive care unit', cat: 'abbreviation', status: 'approved'},
    IV: {full: 'intravenous', cat: 'abbreviation', status: 'approved'},
    IO: {full: 'intraosseous', cat: 'abbreviation', status: 'approved'},
    SA: {full: 'sinoatrial', cat: 'abbreviation', status: 'approved', note: 'SA node'},
    AV: {full: 'atrioventricular', cat: 'abbreviation', status: 'approved', note: 'AV node'},
    BP: {full: 'blood pressure', cat: 'abbreviation', status: 'approved'},
    HR: {full: 'heart rate', cat: 'abbreviation', status: 'approved'},
    WHO: {full: 'World Health Organization', cat: 'abbreviation', status: 'approved'},
    AHA: {full: 'American Heart Association', cat: 'abbreviation', status: 'approved'},
    mmHg: {full: 'millimetres of mercury', cat: 'abbreviation', status: 'approved'},
    // approved spellings (house spelling is British)
    hemoglobin: {spell: 'haemoglobin', cat: 'spelling', status: 'approved'},
    anesthesia: {spell: 'anaesthesia', cat: 'spelling', status: 'approved'},
    edema: {spell: 'oedema', cat: 'spelling', status: 'approved'},
    ischemia: {spell: 'ischaemia', cat: 'spelling', status: 'approved'},
    pediatric: {spell: 'paediatric', cat: 'spelling', status: 'approved'},
    sterilization: {spell: 'sterilisation', cat: 'spelling', status: 'approved'},
    favorable: {spell: 'favourable', cat: 'spelling', status: 'approved'},
    color: {spell: 'colour', cat: 'spelling', status: 'approved'},
    liter: {spell: 'litre', cat: 'spelling', status: 'approved'},
    milliliter: {spell: 'millilitre', cat: 'spelling', status: 'approved'},
  },
  hi: {
    MedSkills: {say: 'मेड स्किल्स', cat: 'brand', status: 'respelled'},
    'मेडस्किल्स': {say: 'मेड स्किल्स', cat: 'brand', status: 'respelled'},
  },
  mr: {
    MedSkills: {say: 'मेड स्किल्स', cat: 'brand', status: 'respelled'},
    'मेडस्किल्स': {say: 'मेड स्किल्स', cat: 'brand', status: 'respelled'},
  },
  kn: {
    MedSkills: {say: 'ಮೆಡ್ ಸ್ಕಿಲ್ಸ್', cat: 'brand', status: 'respelled'},
    'ಮೆಡ್‌ಸ್ಕಿಲ್ಸ್': {say: 'ಮೆಡ್ ಸ್ಕಿಲ್ಸ್', cat: 'brand', status: 'respelled'},
    'ಮೆಡ್ಸ್ಕಿಲ್ಸ್': {say: 'ಮೆಡ್ ಸ್ಕಿಲ್ಸ್', cat: 'brand', status: 'respelled'},
  },
};

const pick = (lang: Lang, f: (t: Term) => string | undefined) =>
  Object.fromEntries(Object.entries(DICTIONARY[lang] ?? {}).flatMap(([k, t]) => (t.status !== 'pending' && f(t) ? [[k, f(t)!]] : [])));
/** Voice respellings (→ the lexicon). */
export const respellings = (lang: Lang): Record<string, string> => pick(lang, (t) => t.say);
/** Abbreviation → spoken full form. */
export const fullForms = (lang: Lang): Record<string, string> => pick(lang, (t) => t.full);
/** Variant → approved spelling. */
export const spellings = (lang: Lang): Record<string, string> => pick(lang, (t) => t.spell);
