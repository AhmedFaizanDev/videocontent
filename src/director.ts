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
const TEACH = new Set(['scene', 'explain', 'flow', 'table', 'summary', 'opener', 'stage']);
const leadArt = (s: any): string | null => (s.type === 'scene' ? (s.elements ?? []).find((e: any) => e.kind === 'art')?.art ?? null : s.art ?? null);
const kindsOf = (s: any): string[] => (s.type === 'scene' ? (s.elements ?? []).map((e: any) => e.kind) : [s.type]);

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
    if (!out.transition && prev && s.type !== 'opener' && s.type !== 'stage' && prev.type !== 'stage') {
      if (s.type === 'summary') out.transition = 'zoomout';
      else if (art && art === prevArt) out.transition = kindsOf(s).length < kindsOf(prev).length ? 'portal' : 'pan';
      else if (kindsOf(prev).join() === kindsOf(s).join()) out.transition = 'slide';
    }
    if (out.drift === undefined) out.drift = k % 2 ? -1 : 1;
    k++;
    prev = s;
    return out;
  });
}

/** A teaching scene's visual fingerprint: its layout and element kinds (what a viewer perceives as "the same kind of screen"). */
export const fingerprint = (s: any): string | null => {
  if (!TEACH.has(s?.type) || s.type === 'opener' || s.type === 'summary') return null;
  if (s.type !== 'scene') return s.type === 'explain' ? 'full:art' : s.type === 'stage' ? 'stage' : `full:${s.type}`;
  const k = kindsOf(s);
  return `${k.length === 1 ? 'full' : k.length === 3 ? 'main+2' : k.includes('art') || s.layout === 'main' ? 'main+side' : 'halves'}:${[...k].sort().join('+')}`;
};

/**
 * The variety gate (rules.variety): a lesson must not read as one template repeated.
 * Problems: 3 identical fingerprints in a row; one fingerprint over 40 % of the teaching scenes;
 * fewer than 2 multi-element compositions in a lesson of 6+ teaching scenes.
 */
export function varietyProblems(scenes: any[]): string[] {
  const fp = scenes.map(fingerprint).filter((x): x is string => !!x);
  const out: string[] = [];
  for (let i = 2; i < fp.length; i++)
    if (fp[i] === fp[i - 1] && fp[i] === fp[i - 2]) out.push(`three "${fp[i]}" screens in a row (teaching scenes ${i - 1}–${i + 1}) — compose one differently (pair it with a stat, table or the illustration)`);
  const count = new Map<string, number>();
  fp.forEach((f) => count.set(f, (count.get(f) ?? 0) + 1));
  for (const [f, n] of count) if (fp.length >= 5 && n / fp.length > 0.4) out.push(`"${f}" is ${n} of ${fp.length} teaching scenes (max 40 %) — vary the composition`);
  const multi = scenes.filter((s) => s?.type === 'scene' && (s.elements ?? []).length > 1).length;
  if (fp.length >= 6 && multi < 2) out.push(`only ${multi} multi-element composition(s) in ${fp.length} teaching scenes (need ≥ 2) — put an illustration beside its numbers or its process`);
  return out;
}
