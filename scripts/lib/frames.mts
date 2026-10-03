/**
 * Pixel checks shared by review (pre-render) and qa (post-render).
 *   overflow   — ink where no content may ever be: side margins and beside the caption tape.
 *   blockDelta — worst 40×40 block difference between two frames (MP4 vs still).
 */
import {Jimp} from 'jimp';
import {revealTimes} from '../../src/sync.ts';
import {TX} from '../../src/schedule.ts';

const ZONES: [string, number[]][] = [
  ['left margin', [26, 110, 94, 872]],
  ['right margin', [1826, 110, 1894, 872]],
  ['caption band L', [100, 892, 260, 1010]],
  ['caption band R', [1660, 892, 1740, 1010]],
];
/** Deliberate full-bleed design per scene type (hook's ink-roller band, intro's giant numeral, recap's takeaway band). */
const ALLOWED: Record<string, string[]> = {hook: ['left margin', 'right margin'], intro: ['right margin'], recap: ['left margin', 'right margin'], 'stage-dark': ZONES.map(([n]) => n), ident: ZONES.map(([n]) => n)}; // full-bleed brand motion: no caption, no chrome
const LUMA = 110;
const MIN_PIXELS = 40;

/** The zone rules a scene is judged by: a dark-mood stage is full-bleed by design (its page is dark), so its margins are exempt. */
export const gateKind = (scene: any): string => (scene?.type === 'stage' && scene?.mood === 'dark' ? 'stage-dark' : scene?.type ?? '');

export async function overflow(file: string, sceneType: string): Promise<string[]> {
  const {data, width} = (await Jimp.read(file)).bitmap;
  const out: string[] = [];
  for (const [name, [x0, y0, x1, y1]] of ZONES) {
    if (ALLOWED[sceneType]?.includes(name)) continue;
    let hits = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] < LUMA) hits++;
      }
    if (hits >= MIN_PIXELS) out.push(`${hits}px ink in ${name}`);
  }
  return out;
}

/** Mean |Δ| (0–255) of the worst 40×40 block. Codec noise + mid-animation motion < ~30. */
export const DELTA_LIMIT = 35;
export async function blockDelta(a: string, b: string) {
  const [A, B] = [(await Jimp.read(a)).bitmap.data, (await Jimp.read(b)).bitmap.data];
  const BLOCK = 40;
  let worst = 0;
  for (let by = 0; by + BLOCK <= 1080; by += BLOCK)
    for (let bx = 0; bx + BLOCK <= 1920; bx += BLOCK) {
      let sum = 0;
      for (let y = by; y < by + BLOCK; y += 2)
        for (let x = bx; x < bx + BLOCK; x += 2) {
          const i = (y * 1920 + x) * 4;
          sum += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
        }
      worst = Math.max(worst, sum / ((BLOCK / 2) ** 2 * 3));
    }
  return worst;
}

/**
 * A frame where the scene has settled: after its last word-anchored reveal has landed
 * (≈1.3 s), and no earlier than 92% of the narration (55% for the recap, which later
 * clears to the outro). Layout gates check this frame, never a card in mid-flight.
 */
export function settledFrame(st: any, sc: any, fps = 30): number {
  const groups = revealTimes(sc, st.words ?? [], st.voDurationInSeconds);
  const last = Math.max(0, ...Object.values(groups).flat().map((r) => r.t ?? 0));
  const want = Math.max(Math.round(st.voDurationInFrames * (sc.type === 'recap' ? 0.55 : 0.92)), Math.round(last * fps) + 40);
  // never inside the exit transition (short films have short tails: a late sample caught mid-camera-move)
  return Math.min(st.startFrame + st.leadFrames + want, st.startFrame + st.durationInFrames - TX.exit - 2);
}
