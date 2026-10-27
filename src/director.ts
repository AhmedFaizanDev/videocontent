/**
 * The director: the authored decisions a human editor makes across a lesson, applied to the
 * scene list before compiling — so no two adjacent scenes feel stamped from one template.
 *
 *  - mirror with continuity: a composition whose illustration was on the left in the previous
 *    scene keeps it there (same subject, same place); otherwise the lead alternates sides
 *  - transitions by relation: same illustration → pan (the camera travels on), a scene that
 *    goes deeper into the previous one's subject → portal, the summary → zoomout, a new
 *    subject → slide
 *  - drift: the slow camera breath alternates direction scene to scene
 * The author always wins: an explicit `transition`, `mirror` or `drift` is kept.
 */
import {PLAYS, isArtPlay} from './playbooks.ts';
import {wordCount} from './lang.ts';

const TEACH = new Set(['scene', 'explain', 'flow', 'table', 'summary', 'opener', 'stage', 'play']);
/** what a play looks like on screen: its illustration, or its data kind */
const playKind = (s: any) => {
  const p = PLAYS[s.play];
  return !p ? 'play' : isArtPlay(p) ? 'explain' : p.kind;
};
const leadArt = (s: any): string | null => (s.type === 'scene' ? (s.elements ?? []).find((e: any) => e.kind === 'art')?.art ?? null : s.type === 'play' ? ((p) => (p && isArtPlay(p) ? p.art : null))(PLAYS[s.play]) : s.art ?? null);
const kindsOf = (s: any): string[] => (s.type === 'scene' ? (s.elements ?? []).map((e: any) => e.kind) : [s.type === 'play' ? playKind(s) : s.type]);

export function direct(scenes: any[]): any[] {
  let prev: any = null;
  let side = false; // false: lead on the left
  let k = 0;
  return scenes.map((s) => {
    if (!TEACH.has(s?.type)) {
      prev = null;
      return s;
    }
    const out = {...s};
    const art = leadArt(s);
    const prevArt = prev ? leadArt(prev) : null;
    if (s.type === 'scene' && (s.elements ?? []).length > 1 && out.mirror === undefined) {
      // continuity: the same illustration stays where the eye left it; a new subject swaps sides
      if (!(art && art === prevArt)) side = !side;
      out.mirror = side;
    }
    // transitions and camera drift stay the reference engine's own (src/schedule.ts planTransitions,
    // stage drift): overriding them was never validated against the reference lessons (audit 2026-10-04)
    k++;
    prev = s;
    return out;
  });
}

/** A teaching scene's visual fingerprint: its layout and element kinds (what a viewer perceives as "the same kind of screen"). */
export const fingerprint = (s: any): string | null => {
  if (!TEACH.has(s?.type) || s.type === 'opener' || s.type === 'summary') return null;
  if (s.type !== 'scene') {
    // what the viewer sees: an illustration scene is identified by what the picture DOES (its playbook,
    // or the parts it explains) — the same heart failing, then being compressed, are different screens
    if (s.type === 'play') return `play:${s.play}`;
    if (s.type === 'explain') return `art:${s.art}:${(s.points ?? []).map((p: any) => p.on ?? p.act ?? '').join(',')}`;
    return s.type === 'stage' ? 'stage' : `full:${s.type}`;
  }
  const k = kindsOf(s);
  return `${k.length === 1 ? 'full' : k.length === 3 ? 'main+2' : k.includes('art') || s.layout === 'main' ? 'main+side' : 'halves'}:${[...k].sort().join('+')}`;
};

/**
 * The variety gate (rules.variety): a lesson must not read as one template repeated.
 * Problems: 3 identical fingerprints in a row; one fingerprint over 40 % of the teaching scenes.
 * Calibrated on the reference lesson (ms-bls-29 M01), which must pass: compositions are a tool,
 * not a quota — an earlier "≥ 2 compositions" rule pushed writers away from the reference's
 * one-illustration story and was removed (2026-10-04).
 */
export function varietyProblems(scenes: any[]): string[] {
  const fp = scenes.map(fingerprint).filter((x): x is string => !!x);
  const out: string[] = [];
  for (let i = 2; i < fp.length; i++)
    if (fp[i] === fp[i - 1] && fp[i] === fp[i - 2]) out.push(`three "${fp[i]}" screens in a row (teaching scenes ${i - 1}–${i + 1}) — compose one differently (pair it with a stat, table or the illustration)`);
  const count = new Map<string, number>();
  fp.forEach((f) => count.set(f, (count.get(f) ?? 0) + 1));
  for (const [f, n] of count) if (fp.length >= 5 && n / fp.length > 0.4) out.push(`"${f}" is ${n} of ${fp.length} teaching scenes (max 40 %) — vary the composition`);
  return out;
}

/**
 * The taste gate (rules.taste) — what made the reference lesson better than text-with-voiceover,
 * as checks on the compiled lesson:
 *   - the picture carries the words: at most one text bar (note) per 55 narration words
 *     (the reference: 11 in 654 words; a lesson that explains in notes reads as a slide deck)
 *   - an illustration on screen performs: every illustration scene has ≥ 2 picture actions
 *     (a label on the drawing, a state, a region, a layer picked out) — never a static backdrop
 */
const DATA_ARTS = new Set(['graph', 'table', 'stat', 'bars', 'timeline', 'cycle', 'hub', 'stack', 'trace', 'flow']);
export function tasteProblems(scenes: any[]): string[] {
  const out: string[] = [];
  const words = scenes.reduce((n, s) => n + (typeof s?.narration === 'string' && s.type !== 'outro' ? wordCount(s.narration) : 0), 0);
  const notes = scenes.reduce((n, s) => n + (s?.beats ?? []).filter((b: any) => b.note).length, 0);
  const allowed = Math.max(3, Math.floor(words / 55));
  if (notes > allowed) out.push(`${notes} text bars for ${words} words (max ${allowed}) — let the picture carry it: labels on the illustration, the chart's own nodes and cells, not notes`);
  // illustration-led: a lesson of only charts and tables is the "text with voiceover" the client rejected
  const teaching = scenes.filter((s) => s?.type === 'stage' && s.world?.layers?.length);
  const illustrated = teaching.filter((s) => s.world.layers.some((l: any) => !DATA_ARTS.has(l.art)));
  if (teaching.length >= 4 && illustrated.length / teaching.length < 0.4)
    out.push(`only ${illustrated.length} of ${teaching.length} teaching scenes are on an illustration (min 40 %) — teach the mechanism, structure or device on its picture (an illustration playbook), not in another chart or table`);
  // the bookends rest on the picture: the opener carries the title, the closing recap its take-aways
  const firstTeach = scenes.map((s) => s?.type).indexOf('stage');
  const lastTeach = scenes.map((s) => s?.type).lastIndexOf('stage');
  scenes.forEach((s, i) => {
    const ill = (s?.world?.layers ?? []).filter((l: any) => !DATA_ARTS.has(l.art)).map((l: any) => l.id);
    if (!ill.length || s.bare || s.mood === 'dark') return;
    const onIll = (x: any) => ill.includes(String(typeof x === 'string' ? x : x?.on ?? '').split('.')[0]);
    // each state change, region and label on the drawing counts; the closing recap may rest on one
    const actions = (s.beats ?? []).reduce((n: number, b: any) => n + [b.act ?? []].flat().filter(onIll).length + [b.label ?? []].flat().filter(onIll).length, 0);
    if (actions < (i === firstTeach || i === lastTeach ? 0 : 2)) out.push(`scene[${i}]: the illustration only sits there (${actions} picture action) — label its parts, change its state, or use a playbook (play)`);
  });
  return out;
}
