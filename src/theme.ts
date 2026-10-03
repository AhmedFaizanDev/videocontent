import {STACKS} from './fonts';

/**
 * Typography, "Clinical" system (v5). One family per role, across every script we voice:
 *   heading  Sora Heavy (800, the only weight vendored) → Anek Devanagari / Anek Kannada Bold
 *   body     Noto Sans → Noto Sans Devanagari / Noto Sans Kannada — ALL non-heading text:
 *            labels, captions, notes, table cells, chart values, chips (owner's standard 2026-10-03)
 *   mono     IBM Plex Mono (code only)
 * then Noto Sans / Symbols 2 / Math for anything else. Stacks fall through per glyph, so a
 * Hindi label with Latin digits sets each character in the right face. All faces are vendored
 * (src/fonts.ts) — never loaded from the network. Never italic: emphasis is weight + colour.
 */
export const fonts = {
  heading: STACKS.display,
  /** kept for older call sites: the same face (emphasis is weight + colour, never italic) */
  headingItalic: STACKS.display,
  body: STACKS.body,
  label: STACKS.body,
  mono: STACKS.mono,
};

/**
 * Layout tokens (1920×1080). Content lives inside the safe box; the band below
 * `safe.bottom` is reserved for captions; chrome sits in the outer margin.
 */
export const safe = {left: 120, right: 1800, top: 150, bottom: 872, width: 1680};

export const tracking = {display: '-0.02em', title: '-0.01em', label: '0.12em'};

export type NamedColor = 'variable' | 'constant' | 'accent';

/**
 * Colour. A clean off-white foundation (a whisper of the brand's violet, never grey-cold),
 * white surfaces, deep aubergine ink, the MedSkills gradient as the signature, and a
 * clinical spectrum that carries meaning (arterial red, venous blue, oxygen teal,
 * glucose amber, healthy green). Keys keep their historical names so every template and
 * art recolours from here. *Text = passes 4.5:1 on white.
 */
export const brand = {
  magenta: '#D8148C',
  purple: '#7A24A1',
  magentaText: '#B00D72',
  purpleText: '#6A1F8E',
  gradient: 'linear-gradient(135deg, #E0168A 0%, #A51C98 52%, #6E25A3 100%)',
  gradientV: 'linear-gradient(180deg, #D8148C 0%, #7A24A1 100%)',
  tint: '#FBEAF4',
  tintPurple: '#F1E9F8',
};

export const ink = {
  // journal-figure palette (2026-10-03): cool neutral page, slate ink, muted scientific hues
  paper: '#F7F8FA', // the page
  paperLight: '#FFFFFF', // cards, plates
  paperShade: '#E8EBF0', // wells, tracks
  desk: '#F0F2F5',
  ink: '#1A2030', // text + outlines
  soft: '#475066',
  faint: '#7A8296',
  orange: brand.magenta, // the signature accent
  orangeText: brand.magentaText,
  blue: '#2F5FA7', // venous / deoxygenated
  teal: '#1F8A82', // oxygen, air
  sun: '#D39A1E', // glucose, energy
  sunText: '#7A4E08',
  red: '#C0373F', // arterial / oxygenated, danger
  green: '#2E8B57', // healthy, correct
  pink: brand.purple,
};

/** Hairline + soft elevation for surfaces on the page. */
export const surface = {
  border: '1px solid rgba(28,21,48,0.08)',
  radius: 22,
  shadow: '0 1px 2px rgba(28,21,48,0.06), 0 10px 30px -12px rgba(60,30,90,0.18)',
  shadowHi: '0 2px 6px rgba(28,21,48,0.08), 0 24px 50px -18px rgba(60,30,90,0.30)',
};

/** Spot fill + legible text colour for the three authored roles. */
export const spot = (c?: NamedColor) =>
  c === 'variable'
    ? {fill: ink.sun, text: '#B45309'}
    : c === 'constant'
      ? {fill: ink.teal, text: '#0B6F68'}
      : {fill: ink.blue, text: ink.blue};

export const inkSyntax = {
  keyword: ink.blue,
  value: '#0B6F68',
  string: ink.green,
  comment: ink.faint,
  constant: ink.orangeText,
  op: ink.soft,
  text: ink.ink,
};
