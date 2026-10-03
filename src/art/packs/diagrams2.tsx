/**
 * Pack diagrams2: generic diagrams drawn as illustrations.
 *   chain  a horizontal chain of n rings (data.n 3–8, default 6), each joined to the next by an
 *          edge-on link (a flat pill threaded through both openings) — the classic chain. Each
 *          ring is one numbered step; the joining pills light when both their rings are lit.
 *          Pale lavender by default; a link lights to the brand gradient with a soft glow when its
 *          event fires. anchors/events: l1…l8 (light one link; beyond n → the last link),
 *          all (a left-to-right lighting wave, then one pulse of the whole chain). Text-free:
 *          labels are the lesson's (stage `label` on l1…ln).
 */
import React from 'react';
import {E, tw} from '../../motion';
import {type ArtCtx, type ArtFactory} from '../kit';

type P = [number, number];
const W = 330; // face-on link length
const H = 230; // face-on link height
const T = 42; // ring thickness
const L = 190; // edge-on link length: its ends stop just inside each ring wall, the hollows stay clear // edge-on link length
const EH = 56; // edge-on link thickness
const S = 225; // spacing between element centres (ring, pill, ring…)
const PAD = 90;
const UNLIT = {fill: '#EBDDF6', line: '#9C6FC4'};

/** Stadium centre-line path (a rounded-end loop) of width w, height h around (cx, cy). */
const stadium = (cx: number, cy: number, w: number, h: number) => {
  const r = h / 2;
  const x0 = cx - w / 2 + r;
  const x1 = cx + w / 2 - r;
  return `M${x0} ${cy - r} H${x1} A${r} ${r} 0 0 1 ${x1} ${cy + r} H${x0} A${r} ${r} 0 0 1 ${x0} ${cy - r} Z`;
};

const chain: ArtFactory = (data = {}) => {
  const n = Math.max(3, Math.min(8, Math.round(data.n ?? 6)));
  const m = 2 * n - 1; // elements: rings at even indices, pills between
  const w = (m - 1) * S + W + 2 * PAD;
  const h = H + T + 2 * PAD;
  const cy = h / 2;
  const cx = (i: number) => PAD + W / 2 + i * S;
  const face = (i: number) => i % 2 === 0;
  const anchors: Record<string, P> = {};
  for (let i = 1; i <= 8; i++) anchors[`l${i}`] = [cx(2 * (Math.min(i, n) - 1)), cy];
  anchors.all = [w / 2, cy - H / 2 - T - 30];
  // a link's band: face-on = the ring's centre line; edge-on = a straight pill (L long, EH thick)
  const band = (i: number) => (face(i) ? {d: stadium(cx(i), cy, W, H), sw: T} : {d: `M${cx(i) - (L - EH) / 2} ${cy} H${cx(i) + (L - EH) / 2}`, sw: EH});
  const shine = (i: number) => (face(i) ? {d: stadium(cx(i), cy - 5, W - 8, H - 10), sw: 5} : {d: `M${cx(i) - (L - EH) / 2} ${cy - EH / 4} H${cx(i) + (L - EH) / 2}`, sw: 8});
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const all = c.at('all');
    // how lit each link is: its own event (the last link also takes l(n+1)…l8), or the wave passing it
    const ownAt = (k: number) => (k === n - 1 ? Array.from({length: 9 - n}, (_, j) => n + j) : [k + 1]).map((j) => c.at(`l${j}`)).find((x) => x != null);
    const own = Array.from({length: n}, (_, k) => {
      const t = ownAt(k);
      return t != null ? tw(f, t, 14, E.out) : 0;
    });
    // each element's light: a ring its own event, a pill when both its rings are lit; or the wave passing
    const lit = Array.from({length: m}, (_, e) => {
      const a = face(e) ? own[e / 2] : Math.min(own[(e - 1) / 2], own[(e + 1) / 2]);
      const b = all != null ? tw(f, all + e * 4, 14, E.out) : 0;
      return Math.max(a, b);
    });
    const pulseAt = all != null ? all + m * 4 + 8 : null;
    const pulse = pulseAt != null ? Math.sin(Math.min(1, Math.max(0, (f - pulseAt) / 22)) * Math.PI) : 0;
    const link = (i: number) => {
      const {d, sw} = band(i);
      const s = shine(i);
      return (
        <g key={i} opacity={tw(f, 4 + i * 3, 16, E.out)}>
          <path d={d} fill="none" stroke={UNLIT.line} strokeWidth={sw + 8} strokeLinecap="round" />
          <path d={d} fill="none" stroke={UNLIT.fill} strokeWidth={sw} strokeLinecap="round" />
          {lit[i] > 0 ? (
            <g opacity={lit[i]}>
              <path d={d} fill="none" stroke="#5B1A7E" strokeWidth={sw + 8} strokeLinecap="round" />
              <path d={d} fill="none" stroke="url(#chain-grad)" strokeWidth={sw} strokeLinecap="round" />
            </g>
          ) : null}
          <path d={s.d} fill="none" stroke="#fff" strokeWidth={s.sw} strokeLinecap="round" opacity={0.35 + 0.15 * lit[i]} />
        </g>
      );
    };
    return (
      <g transform={`translate(${w / 2} ${cy}) scale(${1 + 0.05 * pulse}) translate(${-w / 2} ${-cy})`}>
        <defs>
          <linearGradient id="chain-grad" gradientUnits="userSpaceOnUse" x1={PAD} y1={0} x2={w - PAD} y2={0}>
            <stop offset="0" stopColor="#E0168A" />
            <stop offset="1" stopColor="#6E25A3" />
          </linearGradient>
          <filter id="chain-glow" filterUnits="userSpaceOnUse" x={-200} y={-200} width={w + 400} height={h + 400}>
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        {/* glow under lit links */}
        {lit.map((l, i) => (l > 0 ? <path key={`g${i}`} d={band(i).d} fill="none" stroke="url(#chain-grad)" strokeWidth={band(i).sw + 24} strokeLinecap="round" filter="url(#chain-glow)" opacity={0.7 * l * (1 + 0.4 * pulse)} /> : null))}
        {/* left-to-right draw order is the interlock: each link crosses over the previous one's end
            and under the next one's — one crossing per junction, so no clipping is needed */}
        {Array.from({length: m}, (_, i) => link(i))}
      </g>
    );
  };
  return {w, h, layout: 'full', anchors, C: C_};
};

export default {chain} as Record<string, ArtFactory>;
