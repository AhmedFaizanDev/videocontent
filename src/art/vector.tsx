/**
 * Imported vector art (scripts/ingest-art.mts) → animated library art, from its manifest alone.
 * The drawing stays the illustrator's; the motion is ours, by layer:
 *   motion.cardiac   the cardiac state machine — beats in sinus rhythm (each `beat` entry
 *                    scales its layer about a pivot, atria then ventricles), events vf (quiver,
 *                    no output), stop (still, dusky), compress (~110/min squeeze), rosc (returns);
 *                    data {state} opens in a state
 *   motion.dusky     layers that go dusky (desaturated, darker) when there is no output
 *   motion.highlight layer ids that are also events: acting one picks that layer out (glow)
 *   flows            chevrons that run along cubic paths while there is output (blood, air, flow)
 *   signals          [{event, path}] — acting the event sends an impulse along the path (a conduction
 *                    pathway, a nerve signal): a glowing pulse that repeats, the path faintly traced
 *   regions          [{event, points}] — acting the event picks that region out (a chamber, a lobe):
 *                    a translucent gold wash and outline that breathes; anchor = its centroid
 *   anchors          label/camera points, in source-SVG units
 * Everything is scaled so the art is 1000 units tall.
 */
import React from 'react';
import {E, clamp01, tw} from '../motion';
import {type ArtCtx, type ArtFactory} from './kit';
import {PLATE, along, type Bez, type P} from './ink';

export type VectorAsset = {key: string; vb: number[]; defs: string; layers: {id: string; markup: string}[]};
export type VectorManifest = {
  key: string;
  doc: string;
  credit?: string;
  licence?: string;
  layers: {id: string; parts: (number | string)[]}[];
  motion?: {cardiac?: boolean; beat?: {layer: string; pivot: P; amp: [number, number]; phase: 'atria' | 'ventricles'}[]; dusky?: string[]; highlight?: string[]};
  anchors: Record<string, P>;
  flows?: {path: P[]; tone: 'artery' | 'vein' | 'air'; n?: number}[];
  signals?: {event: string; path: P[]}[];
  regions?: {event: string; points: P[]}[];
};

const STATES = ['vf', 'stop', 'compress', 'rosc'] as const;
const BEAT = 25; // ≈72/min
const PUSH = 16.4; // ≈110/min
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const toBez = (pts: P[]): Bez[] => {
  const out: Bez[] = [];
  for (let i = 0; i + 3 < pts.length; i += 3) out.push([pts[i], pts[i + 1], pts[i + 2], pts[i + 3]]);
  return out;
};

/** The events a manifest exposes (also its catalogue entry). */
export const vectorEvents = (m: VectorManifest) => [...(m.motion?.cardiac ? STATES : []), ...(m.motion?.highlight ?? []), ...(m.signals ?? []).map((x) => x.event), ...(m.regions ?? []).map((x) => x.event)];

export const vectorArt = (asset: VectorAsset, man: VectorManifest): ArtFactory => (data: any = {}) => {
  const [vx, vy, vw, vh] = asset.vb;
  const k = 1000 / vh;
  const W = vw * k;
  const start = (STATES as readonly string[]).includes(data?.state) ? data.state : null;
  const anchors: Record<string, P> = {};
  for (const [n, p] of Object.entries(man.anchors)) anchors[n] = [(p[0] - vx) * k, (p[1] - vy) * k];
  const centre: P = [W / 2, 500];
  for (const r of man.regions ?? []) anchors[r.event] ??= [((r.points.reduce((a, p) => a + p[0], 0) / r.points.length) - vx) * k, ((r.points.reduce((a, p) => a + p[1], 0) / r.points.length) - vy) * k];
  for (const e of vectorEvents(man)) anchors[e] ??= centre;
  const signals = (man.signals ?? []).map((x) => ({...x, segs: toBez(x.path), d: `M${x.path[0][0]} ${x.path[0][1]}` + toBez(x.path).map((q) => ` C${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]} ${q[3][0]} ${q[3][1]}`).join('')}));
  const flows = (man.flows ?? []).map((f) => ({...f, segs: toBez(f.path)}));
  const C: React.FC<ArtCtx> = (c0) => {
    const c: ArtCtx = start ? {...c0, at: (n: string) => c0.at(n) ?? (n === start ? -10000 : null)} : c0;
    const {f} = c;
    let kind = 'nsr';
    let since = f;
    if (man.motion?.cardiac) {
      let best: {k: string; a: number} | null = null;
      for (const s of STATES) {
        const a = c.at(s);
        if (a != null && a <= f && (!best || a >= best.a)) best = {k: s, a};
      }
      if (best) {
        kind = best.k;
        since = f - best.a;
      }
    }
    // phase amplitudes per kind
    let atria = 0;
    let vent = 0;
    let squash = 0;
    let jx = 0;
    let jy = 0;
    let output = 1;
    if (kind === 'nsr' || kind === 'rosc') {
      const ph = (((f / BEAT) % 1) + 1) % 1;
      atria = Math.sin(clamp01(ph / 0.15) * Math.PI);
      vent = Math.sin(clamp01((ph - 0.18) / 0.32) * Math.PI) * (kind === 'rosc' ? clamp01(since / 20) : 1);
      output = kind === 'rosc' ? clamp01(since / 20) : 1;
    } else if (kind === 'vf') {
      const q = clamp01(since / 10);
      jx = q * 2.2 * (hash(f) - 0.5) * 2;
      jy = q * 1.6 * (hash(f + 91) - 0.5) * 2;
      vent = q * 0.12 * hash(f * 3 + 7);
      output = 0;
    } else if (kind === 'stop') output = 0;
    else if (kind === 'compress') {
      const ph = ((since / PUSH) % 1 + 1) % 1;
      squash = (0.5 - 0.5 * Math.cos(2 * Math.PI * ph)) * clamp01(since / 8);
      output = 0.8;
    }
    const dusky = kind === 'vf' || kind === 'stop' ? clamp01(since / 30) : kind === 'compress' ? 0.5 : kind === 'rosc' ? 1 - clamp01(since / 60) : 0;
    const beatOf = new Map((man.motion?.beat ?? []).map((b) => [b.layer, b]));
    const transform = (id: string) => {
      const b = beatOf.get(id);
      if (!b) return undefined;
      const a = b.phase === 'atria' ? atria : vent;
      const sx = 1 - b.amp[0] * a - (b.phase === 'ventricles' ? 0.05 * squash : 0);
      const sy = 1 - b.amp[1] * a - (b.phase === 'ventricles' ? 0.07 * squash : 0);
      const j = b.phase === 'ventricles' ? 1 : 0.5;
      return `translate(${jx * j} ${jy * j}) translate(${b.pivot[0]} ${b.pivot[1]}) scale(${sx} ${sy}) translate(${-b.pivot[0]} ${-b.pivot[1]})`;
    };
    const filter = (id: string) => {
      const parts: string[] = [];
      if ((man.motion?.dusky ?? []).includes(id) && dusky > 0) parts.push(`saturate(${1 - 0.55 * dusky}) brightness(${1 - 0.22 * dusky}) hue-rotate(${-12 * dusky}deg)`);
      const hl = (man.motion?.highlight ?? []).includes(id) ? c.at(id) : null;
      if (hl != null && f >= hl) parts.push(`drop-shadow(0 0 ${6 * tw(f, hl, 12)}px ${PLATE.gold}) brightness(${1 + 0.08 * tw(f, hl, 12)})`);
      return parts.length ? parts.join(' ') : undefined;
    };
    const o = tw(f, 2, 18, E.out);
    const flowO = output * tw(f, 30, 14);
    return (
      <g opacity={o} transform={`scale(${k}) translate(${-vx} ${-vy})`}>
        <g dangerouslySetInnerHTML={{__html: asset.defs}} />
        {asset.layers.map((l) => (
          <g key={l.id} transform={transform(l.id)} style={{filter: filter(l.id)}} dangerouslySetInnerHTML={{__html: l.markup}} />
        ))}
        {/* regions named by the narration: a breathing gold wash */}
        {(man.regions ?? []).map((r) => {
          const a = c.at(r.event);
          if (a == null || f < a) return null;
          const p = tw(f, a, 14, E.out) * (0.75 + 0.25 * Math.sin((f - a) / 9));
          const d = `M${r.points.map((q) => q.join(' ')).join(' L')} Z`;
          return (
            <g key={r.event} opacity={p}>
              <path d={d} fill={PLATE.gold} opacity={0.28} />
              <path d={d} fill="none" stroke={PLATE.gold} strokeWidth={2.2} strokeLinejoin="round" strokeDasharray="5 3" />
            </g>
          );
        })}
        {/* impulses along their pathways */}
        {signals.map((sg) => {
          const a = c.at(sg.event);
          if (a == null || f < a) return null;
          const traced = tw(f, a, 30, E.inOut);
          return (
            <g key={sg.event}>
              <path d={sg.d} fill="none" stroke={PLATE.gold} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - traced} />
              {[0, 1].map((j) => {
                const u = (((f - a) / 34 + j * 0.5) % 1 + 1) % 1;
                const [x, y] = along(sg.segs, u);
                return (
                  <g key={j} opacity={tw(f, a + 6, 10)}>
                    <circle cx={x} cy={y} r={9} fill={PLATE.gold} opacity={0.35} />
                    <circle cx={x} cy={y} r={4} fill="#FFF6D6" stroke={PLATE.gold} strokeWidth={1.4} />
                  </g>
                );
              })}
            </g>
          );
        })}
        {flowO > 0
          ? flows.map((fl, i) =>
              Array.from({length: fl.n ?? 3}, (_, j) => {
                const n = fl.n ?? 3;
                const u = (((f / (kind === 'compress' ? PUSH : BEAT)) * 0.45 + j / n + i * 0.17) % 1 + 1) % 1;
                const [x, y] = along(fl.segs, u);
                const [x2, y2] = along(fl.segs, Math.min(1, u + 0.02));
                const a = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
                const col = fl.tone === 'artery' ? '#FFF1EE' : '#EEF3FF';
                return <path key={`${i}-${j}`} d="M-4 -5 L2.5 0 L-4 5" transform={`translate(${x} ${y}) rotate(${a})`} fill="none" stroke={col} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" opacity={flowO * 0.95 * (u < 0.1 ? u / 0.1 : u > 0.9 ? (1 - u) / 0.1 : 1)} />;
              }),
            )
          : null}
      </g>
    );
  };
  return {w: W, h: 1000, layout: 'side', anchors, C};
};
