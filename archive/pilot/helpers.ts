import {interpolate, spring} from 'remotion';
import manifest from './data/timings.json';

export type Caption = {text: string; start: number; end: number};
export type SceneTiming = (typeof manifest.scenes)[number];
export const timings = manifest;
export const FPS = manifest.fps;

/**
 * Finds the moment (in frames, relative to scene start) at which the narrator
 * says something matching `re`, by searching the caption timestamps that came
 * back from ElevenLabs. Falls back to a fraction of the VO duration so a
 * re-generated voiceover can never crash the comp.
 */
export const anchorFrame = (scene: SceneTiming, re: RegExp, fallbackFraction: number): number => {
  const hit = scene.captions.find((c) => re.test(c.text));
  const seconds = hit ? hit.start : scene.voDurationInSeconds * fallbackFraction;
  return scene.leadFrames + Math.round(seconds * FPS);
};

/** Smooth, non-bouncy entrance (0 → 1). */
export const easeIn = (frame: number, fps: number, delay = 0, durationInFrames = 24) =>
  spring({frame: frame - delay, fps, config: {damping: 200}, durationInFrames});

/** Playful, springy pop (0 → 1, overshoots). */
export const popIn = (frame: number, fps: number, delay = 0) =>
  spring({frame: frame - delay, fps, config: {damping: 11, mass: 0.7, stiffness: 130}});

/** 1 → 0 fade+lift used to exit a scene's content before the cut. */
export const sceneExit = (frame: number, durationInFrames: number, exitFrames = 14) =>
  interpolate(frame, [durationInFrames - exitFrames, durationInFrames - 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Decaying horizontal shake, kicked off at `start`. */
export const shake = (frame: number, start: number, amplitude = 14) => {
  const t = frame - start;
  if (t < 0 || t > 24) return 0;
  return Math.sin(t * 1.4) * amplitude * Math.exp(-t / 8);
};
