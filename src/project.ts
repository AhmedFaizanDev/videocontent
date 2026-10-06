/**
 * Project = one body of source material turned into a series of lessons, e.g. a client
 * module or a curriculum section. Everything that differs between projects lives in
 * projects/<slug>/project.json; the visual language, motion, sound and scene grammar are
 * global. Pure (no remotion imports): read by Node scripts and passed to Remotion as props.
 */

/** Narration as spoken: [pause] markers are silence, not words. */
export const spoken = (narration: string) => narration.replace(/\[pause\]/gi, ' ').replace(/\s+/g, ' ').trim();

import {HOUSE_LEXICON} from './lexicon.ts';
// measured pace (scripts/voiceover.mts keeps it current): what the voice really does wins over configuration
import {PACE} from './pace.gen.ts';
import type {Lang} from './lang.ts';

/** Brand artwork under public/: the full lockup (icon + wordmark) and the icon alone, each with a white variant `<name>-white.png` for dark/gradient grounds. */
export type BrandArt = {lockup: string; icon: string; /** width ÷ height of the lockup artwork */ lockupAspect: number; iconAspect: number};

export type ProjectConfig = {
  slug: string;
  name: string;
  /** Series line on the poster and intro, e.g. "CSSD & Sterilization Practices". */
  series: string;
  /** Narration + on-screen language (src/lang.ts): 'en' | 'hi' | 'mr' | 'kn'. */
  lang: Lang;
  brand: {
    /** Brand artwork (default: MedSkills). */
    art: BrandArt;
    /** Brand name (publish kit, credits). */
    name: string;
    /** Outro line; a recap scene's own `signoff` overrides it. */
    signoff: string;
    /** Prefix for the episode mark ("EP.", "Lesson ", …). */
    episodeLabel: string;
    /** Where the brand mark sits on every frame: top-right (default) or a subtle bottom-right watermark. */
    watermark?: 'top-right' | 'bottom-right';
  };
  /** Edge neural voice. `wpm` = its speaking pace at this rate, pauses excluded (voiceover measures it). */
  voice: {name: string; rate: string; pitch: string; wpm: number};
  /**
   * Breathing room. `sentencePause`: extra silence after every sentence (s; 0 = one-pass
   * legacy voicing). `beat`: silence at each [pause] marker in narration. `breathe`:
   * multiplier on the holds before/after each scene's narration (src/schedule.ts).
   */
  pacing: {sentencePause: number; beat: number; breathe: number};
  /** Pronunciation fixes sent to the voice only, one token → one token: {"Purkinje": "Pur-kin-jee"}. */
  lexicon: Record<string, string>;
  /** project abbreviations → spoken full forms (merged over the house dictionary, src/dictionary.ts) */
  fullForms?: Record<string, string>;
  /**
   * Key terms of the subject, emphasised wherever they appear on screen (weight + brand
   * colour). Abbreviations (BP, WHO, HbA1c…) are emphasised automatically as chips; the
   * narration must speak their full form (preflight rejects letter-by-letter acronyms).
   */
  terms: string[];
  /** Music bed under public/ (ducked under narration); null for none. */
  music: string | null;
  /**
   * Target runtime per video; validate estimates it, voiceover measures it. `exact` (seconds)
   * makes every video exactly that long: the schedule solves the breathing room around the
   * measured narration (src/schedule.ts fitPace), and voiceover fails when the narration
   * can't fit at a comfortable pace.
   */
  length: {minutes: [number, number]; exact?: number; /** comfortable range of the solved holds (default 0.9–2.1; short films run tighter) */ holds?: [number, number]};
  rules: {
    first?: string;
    last?: string;
    /** Each group: at least one scene of these types (e.g. [["pseudocode","code"],["example"]]). */
    requireOneOf: string[][];
    /** a reveal whose word is never spoken: 'error' (default) or 'warn' (legacy projects) */
    sync: 'error' | 'warn';
    /** at least this many `figure` scenes per lesson (diagrams/illustrations carry the teaching) */
    minFigures: number;
    /** numbers stated but absent from source/: 'error' (default) · 'warn' · 'off' */
    grounding: 'error' | 'warn' | 'off';
    /** share of narration spoken over a picture (stage scenes, illustrated figures, check/answer visuals); 0 = off */
    minIllustrated: number;
    /** most words on screen at once outside captions, per scene; 0 = off */
    maxScreenWords: number;
    /** the variety gate (src/director.ts varietyProblems): lessons must not repeat one screen template */
    variety?: boolean;
    /** the taste gate (src/director.ts tasteProblems): the picture carries the words, illustrations perform */
    taste?: boolean;
    /** every spec needs its lesson plan, projects/<p>/plans/<id>.md (docs/PLAN_TEMPLATE.md) */
    requirePlan?: boolean;
    /** longest stretch (seconds of narration) with nothing new on screen; preflight error above it (default 22 legacy; bulk 7) */
    maxIdle?: number;
  };
  /** the frame every lesson gets automatically: the logo intro first, the signoff outro last (scripts then never write them) */
  frame?: {ident?: boolean; outro?: string | false; identSeconds?: number; outroLine?: string; direct?: boolean};
  /** 'intro' = 1–1.5 min course introductions (docs/INTRO_BRIEF.md) instead of lessons */
  kind?: 'lesson' | 'intro';
  /** Writing conventions: one spelling system per project. */
  style: {spelling?: 'en-GB' | 'en-US'};
  /** Output folder under output/ (default: the slug). */
  output: {dir: string};
};

export const PROJECT_DEFAULTS: Omit<ProjectConfig, 'slug' | 'name' | 'series'> = {
  lang: 'en',
  brand: {
    art: {lockup: 'brand/medskills-lockup.png', icon: 'brand/medskills-icon.png', lockupAspect: 3.677, iconAspect: 0.972},
    name: 'MedSkills',
    signoff: 'Keep learning with MedSkills.',
    episodeLabel: 'EP.',
  },
  // house voice: Indian English female, unhurried (owner's default, 2026-09-25)
  // natural lecturer pace (+10%); the measured value in src/pace.gen.ts (~128 wpm) is what estimates use
  voice: {name: 'en-IN-NeerjaNeural', rate: '+10%', pitch: '+0Hz', wpm: 147},
  pacing: {sentencePause: 0.15, beat: 0.45, breathe: 0.8},
  lexicon: {},
  terms: [],
  music: 'audio/music/bed.mp3',
  length: {minutes: [4.5, 7]},
  rules: {first: 'intro', last: 'recap', requireOneOf: [], sync: 'error', minFigures: 0, grounding: 'error', minIllustrated: 0, maxScreenWords: 0},
  style: {},
  output: {dir: ''},
};

/** House voice per language: Indian female neural voices (Edge), with their pace measured on real lessons (2026-09-26). */
export const HOUSE_VOICES: Record<Lang, {name: string; wpm: number}> = {
  // plain Neerja, slightly slowed: the Expressive variant read as dramatic (owner, 2026-10-01)
  en: {name: 'en-IN-NeerjaNeural', wpm: 147},
  hi: {name: 'hi-IN-SwaraNeural', wpm: 121},
  mr: {name: 'mr-IN-AarohiNeural', wpm: 96},
  kn: {name: 'kn-IN-SapnaNeural', wpm: 83},
};

/** A lesson's own `length` (spec.length) replaces the project's — e.g. a 60 s course intro and
 *  5–7 min modules in one project. Everything else is project-wide. */
export const forLesson = <C extends {length: ProjectConfig['length']}>(cfg: C, spec?: {length?: ProjectConfig['length']} | null): C =>
  spec?.length ? {...cfg, length: spec.length} : cfg;

export const withDefaults = (slug: string, raw: Partial<ProjectConfig>): ProjectConfig => ({
  ...PROJECT_DEFAULTS,
  ...raw,
  slug,
  lang: raw.lang ?? 'en',
  name: raw.name ?? slug,
  series: raw.series ?? raw.name ?? slug,
  brand: {...PROJECT_DEFAULTS.brand, ...raw.brand, art: {...PROJECT_DEFAULTS.brand.art, ...raw.brand?.art}},
  voice: ((v) => ({...v, wpm: PACE[`${v.name}|${v.rate}`]?.wpm ?? v.wpm}))({...PROJECT_DEFAULTS.voice, ...HOUSE_VOICES[raw.lang ?? 'en'], ...raw.voice}),
  pacing: {...PROJECT_DEFAULTS.pacing, ...raw.pacing},
  lexicon: {...HOUSE_LEXICON[raw.lang ?? 'en'], ...raw.lexicon},
  terms: raw.terms ?? [],
  length: {...PROJECT_DEFAULTS.length, ...raw.length},
  rules: {...PROJECT_DEFAULTS.rules, ...raw.rules},
  style: {...PROJECT_DEFAULTS.style, ...raw.style},
  output: {dir: raw.output?.dir || slug},
});
