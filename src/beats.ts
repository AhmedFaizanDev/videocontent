import {spring, interpolate} from 'remotion';
import type {SceneTiming} from './spec';
import {matchPhrases, type RevealGroup} from './sync';

/**
 * Distributes `count` visual beats across a scene's measured voiceover so
 * reveals land *while* the narrator is talking, not before or after. The first
 * beat fires just after the VO starts; the last lands around 82% through, so the
 * final reveal has settled before the scene cuts.
 */
export const beatFrames = (scene: SceneTiming, count: number, opts?: {start?: number; end?: number}): number[] => {
  const start = opts?.start ?? 0.06;
  const end = opts?.end ?? 0.82;
  const voF = scene.voDurationInFrames;
  if (count <= 0) return [];
  if (count === 1) return [scene.leadFrames + Math.round(voF * start)];
  return Array.from({length: count}, (_, i) => {
    const f = start + (end - start) * (i / (count - 1));
    return scene.leadFrames + Math.round(voF * f);
  });
};

export {keywordsOf} from './sync';

/**
 * THE SYNC FIX. Instead of spreading N reveals evenly across the scene, anchor
 * each reveal to the moment its keyword is actually spoken (from the per-word
 * timeline). Falls back to even spacing for any beat whose keyword isn't found,
 * and keeps beats monotonic with a minimum gap. Result: a box/step/line appears
 * exactly as the narrator names it.
 *
 * @param phrases one entry per beat; each is a keyword or list of candidate keywords.
 */
export const anchorBeats = (
  scene: SceneTiming,
  phrases: (string | string[])[],
  fps: number,
  opts?: {start?: number; end?: number; minGapFrames?: number; startFrac?: number},
): number[] => {
  const start = opts?.start ?? 0.08;
  const end = opts?.end ?? 0.84;
  const minGap = opts?.minGapFrames ?? 8;
  // Ignore spoken words before this fraction of the VO when searching — stops a
  // common keyword (e.g. "variable") mentioned in the opening line from pulling a
  // reveal too early. Used by the intro's "what you'll learn" ticks.
  const floorSec = (opts?.startFrac ?? 0) * scene.voDurationInSeconds;
  const even = beatFrames(scene, phrases.length, {start, end});
  const words = scene.words ?? [];
  if (words.length === 0) return even;

  // first spoken word at/after the floor; then the shared matcher (src/sync.ts)
  let from = 0;
  while (from < words.length && words[from].start < floorSec) from++;
  const out = matchPhrases(words.map((w) => w.w), phrases, from).map((j, i) => (j >= 0 ? scene.leadFrames + Math.round(words[j].start * fps) : even[i]));

  // Enforce forward order + minimum spacing, clamp within the narration window.
  const maxF = scene.leadFrames + scene.voDurationInFrames;
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && out[i] < out[i - 1] + minGap) out[i] = out[i - 1] + minGap;
    if (out[i] > maxF) out[i] = maxF;
  }
  return out;
};

/** anchorBeats for one of a scene's reveal groups (src/sync.ts), honouring its search floor. */
export const anchorGroup = (scene: SceneTiming, g: RevealGroup, fps: number, opts?: {start?: number; end?: number; minGapFrames?: number}) =>
  anchorBeats(scene, g.phrases, fps, {...opts, startFrac: g.startFrac});

/** Anchor a single beat to the caption timestamp of a matching phrase, with a fractional fallback. */
export const phraseFrame = (scene: SceneTiming, re: RegExp, fallback: number, fps = 30): number => {
  const hit = scene.captions.find((c) => re.test(c.text));
  const sec = hit ? hit.start : scene.voDurationInSeconds * fallback;
  return scene.leadFrames + Math.round(sec * fps);
};

export const easeIn = (frame: number, fps: number, delay = 0, durationInFrames = 24) =>
  spring({frame: frame - delay, fps, config: {damping: 200}, durationInFrames});

// v2 motion: a restrained, confident settle (higher damping, less overshoot)
// instead of the v1 springy "SaaS" bounce. Only the curve shape changed here —
// every call site still fires at the exact frame anchorBeats/beatFrames gives it.
export const popIn = (frame: number, fps: number, delay = 0) =>
  spring({frame: frame - delay, fps, config: {damping: 22, mass: 0.8, stiffness: 118}});

export const sceneExit = (frame: number, durationInFrames: number, exitFrames = 15) =>
  interpolate(frame, [durationInFrames - exitFrames, durationInFrames - 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const shake = (frame: number, start: number, amplitude = 14) => {
  const t = frame - start;
  if (t < 0 || t > 24) return 0;
  return Math.sin(t * 1.4) * amplitude * Math.exp(-t / 8);
};
