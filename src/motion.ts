import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {TX} from './schedule';
import {cols, isIndic, lang, units} from './lang';

/**
 * Motion vocabulary v3. Easing is emotion: `out` (expo) = confident arrival,
 * `soft` = gentle settle, `inOut` = travel between positions, `in` = leave/accelerate.
 * Never one curve for everything.
 */
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  soft: Easing.bezier(0.33, 1, 0.68, 1),
  quart: Easing.bezier(0.25, 1, 0.5, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  // no overshoot anywhere: motion lands precisely (scientific house style, 2026-10-03)
  settle: Easing.bezier(0.2, 1, 0.4, 1),
  linear: (t: number) => t,
};

const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0→1 progress of a tween starting at `at` lasting `dur` frames. */
export const tw = (frame: number, at: number, dur: number, ease: (t: number) => number = E.out) =>
  // a tween that never starts (at = Infinity: an event that doesn't fire) stays at 0; one that
  // started forever ago (−Infinity) is done
  !Number.isFinite(at) ? (at < 0 ? 1 : 0) : dur <= 0 ? (frame >= at ? 1 : 0) : interpolate(frame, [at, at + dur], [0, 1], {...CL, easing: ease});

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Deterministic 0..1 hash (never Math.random in a render). */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Global pacing: every reveal, landing and stagger is multiplied by this. Raise it to slow
 * the house style down (narration rate lives in voiceover.mts, breathing room in schedule.ts).
 */
export const PACE = 1.3;

/** Pan spans: adjacent scenes sit this far apart on the sheet. */
export const SPAN = {x: 1640, y: 1040};

/**
 * Average advance per character as a fraction of font-size (layout without DOM
 * measurement), for the active script. Measured in Chrome (2026-10-03): Sora 800 ≈ 0.522,
 * Noto Sans 400 ≈ 0.476, 600 ≈ 0.495; Indic stacks (Anek / Noto, counted per code point incl. vowel signs)
 * ≈ 0.50–0.60. `serif` is the display face's key (historical name).
 */
export const ADVANCE = {
  get serif() {
    // Japanese is counted in columns (src/lang.ts cols): a kanji is two Latin advances
    return isIndic(lang()) && lang() !== 'ja' ? 0.62 : 0.53;
  },
  get sans() {
    return isIndic(lang()) && lang() !== 'ja' ? 0.6 : 0.5;
  },
  mono: 0.6,
};

/**
 * Choose a font size so `text` fits `maxLines` lines of `width` px. Word-wrap slack is
 * built in (lines rarely fill edge to edge), so this errs small, never overflowing.
 */
export const fitSize = (
  text: string,
  width: number,
  maxLines: number,
  opts: {max: number; min: number; advance: number},
) => {
  const len = Math.max(1, cols(text));
  const longestWord = Math.max(...units(text).map(cols), 1);
  const byArea = (width * maxLines * 0.86) / (len * opts.advance);
  const byWord = (width * 0.96) / (longestWord * opts.advance);
  return Math.round(Math.max(opts.min, Math.min(opts.max, byArea, byWord)));
};

/** Estimated rendered line count for wrapped text (same model as fitSize). */
export const estLines = (text: string, width: number, fontSize: number, advance: number) => {
  const perLine = Math.max(1, Math.floor(width / (fontSize * advance)));
  let lines = 1;
  let used = 0;
  let prevWide = false;
  for (const w of units(text)) {
    // wide characters sit flush against each other; Latin words take a space
    const wide = cols(w) > w.length;
    const need = (used && !(wide && prevWide) ? 1 : 0) + cols(w);
    if (used + need > perLine && used > 0) {
      lines++;
      used = cols(w);
    } else used += need;
    prevWide = wide;
  }
  return lines;
};

/**
 * One camera move per boundary B, shared by the world, the outgoing scene and the
 * incoming scene: cubic-in over TX.exit frames before B, cubic-out over TX.enter after,
 * with equal speed at B. `camP` is position 0→1, `camV` its per-frame speed.
 */
export const camP = (f: number, B: number) => {
  const a = TX.exit / (TX.exit + TX.enter);
  if (f <= B - TX.exit) return 0;
  if (f >= B + TX.enter) return 1;
  if (f < B) {
    const t = (f - (B - TX.exit)) / TX.exit;
    return a * t * t * t;
  }
  const t = (f - B) / TX.enter;
  return a + (1 - a) * (1 - Math.pow(1 - t, 3));
};
export const camV = (f: number, B: number) => {
  const a = TX.exit / (TX.exit + TX.enter);
  if (f <= B - TX.exit || f >= B + TX.enter) return 0;
  if (f < B) {
    const t = (f - (B - TX.exit)) / TX.exit;
    return (3 * a * t * t) / TX.exit;
  }
  const t = (f - B) / TX.enter;
  return (3 * (1 - a) * (1 - t) * (1 - t)) / TX.enter;
};

/**
 * Scenes overlap their neighbours during transitions (pre-roll/post-roll), so each
 * scene runs on its own clock: frame 0 is its cut point, negative frames are pre-roll.
 * `freeze` pins the clock (used to print settled scenes onto the recap contact sheet);
 * `thumb` marks such a print (no chrome, no sound).
 */
export type Clock = {offset: number; freeze?: number; thumb?: boolean};
export const SceneClock = React.createContext<Clock>({offset: 0});
export const useSceneFrame = () => {
  const c = React.useContext(SceneClock);
  const f = useCurrentFrame();
  return c.freeze ?? f - c.offset;
};
export const useThumb = () => !!React.useContext(SceneClock).thumb;
