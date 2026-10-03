/**
 * Pure scheduling shared by Remotion (Root/VideoComposition) and the Node scripts
 * (render → SRT). Built timings store the *measured* VO duration + word timeline per
 * scene; this module derives the frame layout (lead/tail breathing room around each
 * line of narration) and the transition plan, so both can change without re-voicing.
 * No remotion imports: Node runs this file directly via type stripping.
 */
import type {VideoTimings, Scene} from './spec';

export const SCHEDULE = {
  /** frames 0..poster-1 are the designed thumbnail card */
  poster: 3,
  firstLead: 40,
  lead: 26,
  tail: 44,
  hookTail: 36,
  /** knowledge check: the thinking pause after the question is read */
  checkTail: 170,
  lastTail: 170,
};

/** Transition windows straddling each scene boundary (frames). */
export const TX = {exit: 16, enter: 24};

/** A project's pacing: `breathe` scales the holds; `exactFrames` (from length.exact) overrides it to hit that total. */
export type Pace = {breathe: number; exactFrames?: number};
export const paceOf = (p: {pacing: {breathe: number}; length: {exact?: number}}, fps = 30): Pace => ({breathe: p.pacing.breathe, exactFrames: p.length.exact ? Math.round(p.length.exact * fps) : undefined});

/** Comfortable range for solved holds: tighter feels rushed, looser feels stalled (owner prefers unhurried, house 1.3). */
export const BREATHE_RANGE: [number, number] = [0.9, 2.1];
export const holdsRange = (p: {length: {holds?: [number, number]}}): [number, number] => p.length.holds ?? BREATHE_RANGE;

export const holds = (types: Scene['type'][]) =>
  types.map((type, i) =>
    // a brand ident is its own timing: no breathing room around it
    type === 'ident' ? [0, 0] : [i === 0 ? SCHEDULE.firstLead : SCHEDULE.lead, i === types.length - 1 ? SCHEDULE.lastTail : type === 'hook' ? SCHEDULE.hookTail : type === 'check' ? SCHEDULE.checkTail : SCHEDULE.tail],
  );

/** The `breathe` that makes the lesson exactly `frames` long around this narration. */
export const fitBreathe = (t: VideoTimings, frames: number) => {
  const vo = t.scenes.reduce((n, s) => n + s.voDurationInFrames, 0);
  const h = holds(t.scenes.map((s) => s.type)).reduce((n, [a, b]) => n + a + b, 0);
  return (frames - vo) / h;
};

/** Frame layout from measured VO; the pace scales the holds around each scene (project pacing), or fits them to an exact total. */
export function retime(t: VideoTimings, pace: number | Pace = 1): VideoTimings {
  const p: Pace = typeof pace === 'number' ? {breathe: pace} : pace;
  const breathe = p.exactFrames ? fitBreathe(t, p.exactFrames) : p.breathe;
  const b = (n: number) => Math.max(0, Math.round(n * breathe));
  const hs = holds(t.scenes.map((s) => s.type));
  let cursor = 0;
  const n = t.scenes.length;
  const scenes = t.scenes.map((s, i) => {
    const lead = b(hs[i][0]);
    let tail = b(hs[i][1]);
    // rounding lands on the exact total: the last hold takes the remainder
    if (p.exactFrames && i === n - 1) tail = Math.max(0, p.exactFrames - cursor - lead - s.voDurationInFrames);
    const durationInFrames = lead + s.voDurationInFrames + tail;
    const out = {...s, leadFrames: lead, tailFrames: tail, durationInFrames, startFrame: cursor};
    cursor += durationInFrames;
    return out;
  });
  return {...t, scenes, totalDurationInFrames: cursor};
}

export type TxKind = 'cut' | 'pan' | 'slide' | 'portal' | 'flood' | 'zoomout';
export type TxPlan = {kind: TxKind; axis: 'x' | 'y'; tone?: 'red' | 'orange'};

/** Transitions whose incoming/outgoing scenes overlap in time (both on screen). */
export const overlaps = (p?: TxPlan) => p?.kind === 'pan' || p?.kind === 'portal' || p?.kind === 'slide';

/**
 * How each scene is entered — kind carries meaning:
 *   pan     the camera travels across the desk ("this continues")
 *   slide   a fresh sheet is laid over the last one ("new page, same story")
 *   portal  the camera flies through the counter of the chapter's "0" ("we're going inside")
 *   flood   spot ink floods the frame with the chapter name ("stop — register change")
 *   zoomout the camera pulls back from the last scene to reveal the whole lesson (recap)
 *   cut     a hard cut ("wake up")
 */
export function planTransitions(types: Scene['type'][]): TxPlan[] {
  return types.map((type, i) => {
    const prev = types[i - 1];
    if (i === 0 || type === 'hook') return {kind: 'cut', axis: 'x'};
    if (type === 'recap') return {kind: 'zoomout', axis: 'x'};
    if (type === 'outro') return {kind: 'slide', axis: 'x'};
    if (type === 'ident' || prev === 'ident') return {kind: 'cut', axis: 'x'};
    if (type === 'mistake') return {kind: 'flood', axis: 'x', tone: 'red'};
    if (type === 'check') return {kind: 'flood', axis: 'x', tone: 'orange'};
    if (type === 'answer') return {kind: 'slide', axis: 'x'};
    if (type === 'figure') return prev === 'figure' ? {kind: 'slide', axis: 'x'} : {kind: 'portal', axis: 'x'};
    // stages are one continuous world journey: glide across the desk, dive in after text
    if (type === 'stage') return prev === 'stage' ? {kind: 'pan', axis: i % 2 ? 'x' : 'y'} : {kind: 'portal', axis: 'x'};
    if (type === 'pseudocode' || type === 'code') return {kind: 'portal', axis: 'x'};
    if (type === 'example') return prev === 'pseudocode' || prev === 'code' ? {kind: 'slide', axis: 'x'} : {kind: 'portal', axis: 'x'};
    if (type === 'steps') return prev === 'steps' ? {kind: 'pan', axis: 'y'} : {kind: 'slide', axis: 'x'};
    return {kind: 'pan', axis: 'x'};
  });
}
