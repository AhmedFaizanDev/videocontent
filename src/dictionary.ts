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
    // course master 2026 (MedSkills, 69 courses): standard full forms, owner delegated (2026-10-06)
    NABH: {full: 'National Accreditation Board for Hospitals and Healthcare Providers', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    NABL: {full: 'National Accreditation Board for Testing and Calibration Laboratories', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    ISO: {full: 'International Organization for Standardization', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    OT: {full: 'operation theatre', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    BMW: {full: 'bio-medical waste', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    MLT: {full: 'medical laboratory technology', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    DMLT: {full: 'Diploma in Medical Laboratory Technology', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    DPDP: {full: 'Digital Personal Data Protection', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    POSH: {full: 'Prevention of Sexual Harassment', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    'PC-PNDT': {full: 'Pre-Conception and Pre-Natal Diagnostic Techniques', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    PNDT: {full: 'Pre-Natal Diagnostic Techniques', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    AERB: {full: 'Atomic Energy Regulatory Board', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    SBAR: {full: 'Situation, Background, Assessment, Recommendation', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    NICU: {full: 'neonatal intensive care unit', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    MLC: {full: 'medico-legal case', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    EQAS: {full: 'external quality assessment scheme', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    ANM: {full: 'auxiliary nurse midwife', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    SOP: {full: 'standard operating procedure', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    ICD: {full: 'International Classification of Diseases', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    CAPA: {full: 'corrective and preventive action', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    SSI: {full: 'surgical site infection', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    NQAS: {full: 'National Quality Assurance Standards', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    HDU: {full: 'high dependency unit', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    FMS: {full: 'facility management and safety', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    TLD: {full: 'thermoluminescent dosimeter', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    PT: {full: 'proficiency testing', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    POCT: {full: 'point-of-care testing', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    PHC: {full: 'primary health centre', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    NOC: {full: 'no objection certificate', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    LASA: {full: 'look-alike, sound-alike', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    KPI: {full: 'key performance indicator', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    IT: {full: 'information technology', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    IQC: {full: 'internal quality control', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    IPC: {full: 'infection prevention and control', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    HIC: {full: 'hospital infection control', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    HAI: {full: 'healthcare-associated infection', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    EMR: {full: 'electronic medical record', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    HIS: {full: 'hospital information system', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    BSc: {full: 'Bachelor of Science', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    RSO: {full: 'radiological safety officer', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    RACE: {full: 'Rescue, Alarm, Contain, Extinguish', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    QMS: {full: 'quality management system', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    PRO: {full: 'public relations officer', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    PMNDP: {full: 'Pradhan Mantri National Dialysis Programme', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    MTP: {full: 'medical termination of pregnancy', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    IPSG: {full: 'International Patient Safety Goals', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    GNM: {full: 'General Nursing and Midwifery', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    EMT: {full: 'emergency medical technician', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    ED: {full: 'emergency department', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    ASHA: {full: 'Accredited Social Health Activist', cat: 'abbreviation', status: 'approved', note: 'course master 2026'},
    QR: {say: 'Q R', cat: 'proper', status: 'respelled', note: 'QR code: said as letters'},
    ST: {say: 'S T', cat: 'medical', status: 'respelled', note: 'ST segment (ECG): said as letters'},
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
