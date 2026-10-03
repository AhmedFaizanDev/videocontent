/**
 * The house illustration language (owner's reference, 2026-10-03): a medical textbook plate —
 * dark ink outlines, flat muted colour with one darker shade tone, fine ink hatching that
 * follows the form, cream highlights. Every anatomical part, diagram node, arrow and table rule
 * is drawn from these primitives, so new art gets the look for free and stays consistent.
 *
 *   Tube        a vessel/duct/airway along a chain of cubic segments: outline, shade band and
 *               ring hatching on its shadow side, a highlight, open cut ends
 *   ContourHatch  fine lines that follow a closed form's outline (a cut myocardium, a muscle)
 *   InkArrow    a hand-inked arrow along a path (flow, sequence), drawn on with progress
 * Geometry helpers: sample(), along(), offset polylines.
 */
import React from 'react';
import {clamp01} from '../motion';

export type P = [number, number];
export type Bez = [P, P, P, P];

/** Textbook palette: muted, printable, ink-friendly. */
export const PLATE = {
  ink: '#2A2232',
  paper: '#FBF8F3',
  muscle: '#E9A397', // cut myocardium / muscle surface
  muscleShade: '#D27F75',
  cavity: '#9C4A4E', // chamber interior
  cavityDeep: '#6E2E36',
  cream: '#F6EEDF', // valves, tendons, highlights
  artery: '#C8423D',
  arteryShade: '#9E2E2C',
  vein: '#5876AD',
  veinShade: '#3D5688',
  gold: '#E3A92B', // conduction / signal
  green: '#3E8E5A',
  slate: '#5A6275',
};

export const bez = (q: Bez, t: number): P => {
  const m = 1 - t;
  return [0, 1].map((i) => m * m * m * q[0][i] + 3 * m * m * t * q[1][i] + 3 * m * t * t * q[2][i] + t * t * t * q[3][i]) as P;
};
export const chainD = (segs: Bez[]) => `M${segs[0][0][0]} ${segs[0][0][1]}` + segs.map((q) => ` C${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]} ${q[3][0]} ${q[3][1]}`).join('');
/** Points every ~`step` units along a chain, each with its unit normal (left of travel). */
export const sample = (segs: Bez[], step = 8) => {
  const out: {p: P; n: P; t: number}[] = [];
  segs.forEach((q, k) => {
    let L = 0;
    let prev = q[0];
    for (let i = 1; i <= 20; i++) {
      const p = bez(q, i / 20);
      L += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p;
    }
    const n = Math.max(2, Math.round(L / step));
    for (let i = k ? 1 : 0; i <= n; i++) {
      const t = i / n;
      const a = bez(q, Math.max(0, t - 0.01));
      const b = bez(q, Math.min(1, t + 0.01));
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      out.push({p: bez(q, t), n: [-dy / l, dx / l], t: (k + t) / segs.length});
    }
  });
  return out;
};
/** The point a fraction u along a chain (equal weight per segment). */
export const along = (segs: Bez[], u: number): P => {
  const x = clamp01(u) * segs.length;
  const k = Math.min(segs.length - 1, Math.floor(x));
  return bez(segs[k], x - k);
};
const poly = (pts: P[]) => (pts.length ? `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}` : '');

/** A vessel drawn as a textbook plate draws it. `side` = which side the shadow falls (+1 / −1 of the normal). */
export const Tube: React.FC<{
  segs: Bez[];
  w: number;
  tone: 'artery' | 'vein' | 'muscle';
  side?: 1 | -1;
  cutStart?: boolean;
  cutEnd?: boolean;
  o?: number;
  swell?: number;
}> = ({segs, w: w0, tone, side = 1, cutStart, cutEnd, o = 1, swell = 0}) => {
  const w = w0 + swell;
  const [base, shade] = tone === 'artery' ? [PLATE.artery, PLATE.arteryShade] : tone === 'vein' ? [PLATE.vein, PLATE.veinShade] : [PLATE.muscle, PLATE.muscleShade];
  const d = chainD(segs);
  const pts = sample(segs, 6);
  const off = (k: number) => poly(pts.map(({p, n}) => [p[0] + n[0] * side * w * k, p[1] + n[1] * side * w * k] as P));
  const hatch = pts.filter((_, i) => i % 2 === 0 && i > 1 && i < pts.length - 2);
  const end = (at: 0 | 1) => {
    const s = at ? pts[pts.length - 1] : pts[0];
    const ang = (Math.atan2(s.n[1], s.n[0]) * 180) / Math.PI;
    return (
      <g transform={`translate(${s.p[0]} ${s.p[1]}) rotate(${ang})`}>
        <ellipse rx={w / 2 + 1.5} ry={w * 0.22 + 1.5} fill={PLATE.ink} />
        <ellipse rx={w / 2 - 2} ry={w * 0.22 - 1} fill={shade} />
        <ellipse rx={w / 2 - 7} ry={w * 0.16 - 2} fill={tone === 'artery' ? '#5E1B1C' : '#22345A'} transform={`translate(0 ${w * 0.03})`} />
      </g>
    );
  };
  return (
    <g opacity={o} fill="none">
      <path d={d} stroke={PLATE.ink} strokeWidth={w + 5} strokeLinecap="butt" strokeLinejoin="round" />
      <path d={d} stroke={base} strokeWidth={w} strokeLinecap="butt" strokeLinejoin="round" />
      <path d={off(0.3)} stroke={shade} strokeWidth={w * 0.38} strokeLinecap="butt" />
      {hatch.map(({p, n}, i) => (
        <path key={i} d={`M${p[0] + n[0] * side * w * 0.14} ${p[1] + n[1] * side * w * 0.14} L${p[0] + n[0] * side * w * 0.47} ${p[1] + n[1] * side * w * 0.47}`} stroke={PLATE.ink} strokeWidth={1.4} opacity={0.5} />
      ))}
      <path d={off(-0.27)} stroke={PLATE.cream} strokeWidth={Math.max(3, w * 0.07)} strokeLinecap="round" opacity={0.75} />
      {cutStart ? end(0) : null}
      {cutEnd ? end(1) : null}
    </g>
  );
};

/**
 * Fine ink lines that follow a form's outline, as an engraver shades a cut surface: scaled
 * copies of `d` about (cx, cy), clipped to `clipId` (the surface).
 */
export const ContourHatch: React.FC<{d: string; cx: number; cy: number; clipId: string; n?: number; step?: number; o?: number}> = ({d, cx, cy, clipId, n = 14, step = 0.03, o = 0.32}) => (
  <g clipPath={`url(#${clipId})`} opacity={o}>
    {Array.from({length: n}, (_, k) => (
      <path key={k} d={d} fill="none" stroke={PLATE.ink} strokeWidth={1.3} vectorEffect="non-scaling-stroke" transform={`translate(${cx} ${cy}) scale(${1 - (k + 1) * step}) translate(${-cx} ${-cy})`} />
    ))}
  </g>
);

/** An inked arrow along a chain: a tapered shaft drawn on with `p`, a solid head. */
export const InkArrow: React.FC<{segs: Bez[]; p: number; color: string; w?: number; o?: number}> = ({segs, p, color, w = 10, o = 1}) => {
  if (p <= 0) return null;
  const pts = sample(segs, 5);
  const k = Math.max(2, Math.round(pts.length * clamp01(p)));
  const sh = pts.slice(0, k);
  const tip = sh[sh.length - 1];
  const dir: P = [tip.n[1], -tip.n[0]];
  const head = (s: number): P => [tip.p[0] + dir[0] * s, tip.p[1] + dir[1] * s];
  const hw = w * 1.5;
  const base = head(-w * 2.2);
  const headD = `M${head(w * 0.6)[0]} ${head(w * 0.6)[1]} L${base[0] + tip.n[0] * hw} ${base[1] + tip.n[1] * hw} L${base[0] - tip.n[0] * hw} ${base[1] - tip.n[1] * hw} Z`;
  const shaft = poly(sh.slice(0, Math.max(2, sh.length - 3)).map((s) => s.p));
  return (
    <g opacity={o}>
      <path d={shaft} fill="none" stroke={PLATE.ink} strokeWidth={w + 4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={shaft} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <path d={headD} fill={color} stroke={PLATE.ink} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  );
};
