/**
 * Domain pack: resuscitation. Dark-monitor / bright-device parts for BLS and ICU lessons.
 *
 *   ecgmonitor  bedside monitor: navy screen, glowing green trace drawn by a moving pen (erased
 *               ahead), rate digits, beating heart. Default = sinus rhythm ~75/min.
 *               anchors: screen trace rate heart vf flatline shock rosc · events: vf flatline
 *               shock rosc (later events take precedence)
 *   aed         green AED with a bolt button, small screen and two pads on cables.
 *               anchors: device button screen pads charge shock · events: pads charge shock
 */
import React from 'react';
import {clamp01, mix, tw, hash} from '../../motion';
import {draw, fillIn, rect, type ArtCtx, type ArtFactory} from '../kit';
import {Form} from './circulation';
import {fonts} from '../../theme';
import {T} from '../kit';

type P = [number, number];
const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 34 * s} C ${cx - 70 * s} ${cy - 10 * s}, ${cx - 44 * s} ${cy - 66 * s}, ${cx} ${cy - 34 * s} C ${cx + 44 * s} ${cy - 66 * s}, ${cx + 70 * s} ${cy - 10 * s}, ${cx} ${cy + 34 * s} Z`;

/* ================================================================ ecgmonitor */
const EV = ['vf', 'flatline', 'shock', 'rosc'];
const BEAT_F = 24; // 75/min at 30 fps
const X0 = 70;
const WIDTH = 650;
const BASE = 290;
const SPEED = WIDTH / 150; // units per frame: a 5 s sweep
const GAP = 56;
const GREEN = '#3DFF8B';
const g = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

const RH = ['vf', 'flatline', 'rosc']; // rhythm states; shock is only a spike
const stateAt = (c: ArtCtx, t: number) => {
  let best: {k: string; a: number} | null = null;
  for (const k of RH) {
    const a = c.at(k);
    if (a != null && a <= t && (!best || a >= best.a)) best = {k, a};
  }
  return best;
};
/** trace height (up = positive, in trace units) at time t (scene frames) */
const sig = (c: ArtCtx, t: number) => {
  const sa = c.at('shock');
  if (sa != null && t >= sa && t < sa + 3) {
    const d = t - sa;
    return d < 1 ? 105 * d : 105 * (1 - (d - 1) / 2);
  }
  const s = stateAt(c, t);
  if (s?.k === 'vf') return 40 * (0.9 * Math.sin(0.85 * t) + 0.6 * Math.sin(1.9 * t + 1) + 0.4 * Math.sin(2.3 * t + 2.2)) * (0.75 + 0.25 * Math.sin(0.21 * t)) * clamp01((t - s.a) / 10 + 0.3) + 5 * (hash(Math.floor(t * 2)) - 0.5);
  if (s?.k === 'flatline') return 0;
  const ph = ((((t - (s ? s.a : 0)) / BEAT_F) % 1) + 1) % 1;
  return 10 * g(ph, 0.14, 0.055) - 10 * g(ph, 0.355, 0.016) + 85 * g(ph, 0.385, 0.022) - 18 * g(ph, 0.415, 0.018) + 25 * g(ph, 0.65, 0.075);
};
const SC = 2.3;
const TRACE_F0 = 24;

const ecgmonitor: ArtFactory = (data = {}) => {
  // data.rhythm: the rhythm already running when the picture opens (a scene continuing an arrest)
  const start = RH.includes(data.rhythm) ? data.rhythm : null;
  const withStart = (c: ArtCtx): ArtCtx => (start ? {...c, at: (k: string) => c.at(k) ?? (k === start ? -10000 : null)} : c);
  const anchors: Record<string, P> = {screen: [400, 90], trace: [130, BASE], rate: [862, 200], heart: [862, 456], vf: [520, 430], flatline: [220, 430], shock: [400, 150], rosc: [650, 190]};
  const C_: React.FC<ArtCtx> = (c0) => {
    const c = withStart(c0);
    const {f} = c;
    const tf = f - TRACE_F0;
    const cur = stateAt(c, f);
    const kind = cur?.k ?? 'nsr';
    const flat = kind === 'flatline' ? tw(f, cur!.a, 24) : 0;
    const roscT = kind === 'rosc' ? f - cur!.a : -1;
    const penX = X0 + ((Math.max(0, tf) * SPEED) % WIDTH);
    // trace samples: each x shows the signal as it was when the pen last passed
    const N = Math.round(WIDTH / 2);
    const pts: {x: number; y: number; a: number; age: number}[] = [];
    for (let i = 0; i <= N; i++) {
      const x = X0 + i * 2;
      const back = ((penX - x) % WIDTH + WIDTH) % WIDTH;
      const t = f - back / SPEED;
      const seen = tf - back / SPEED;
      const ahead = WIDTH - back;
      const vis = seen < 0 ? 0 : ahead < GAP ? 0 : ahead < GAP + 70 ? (ahead - GAP) / 70 : 1;
      pts.push({x, y: BASE - SC * sig(c, t), a: vis * (1 - 0.3 * (back / WIDTH)), age: back});
    }
    const chunks: React.ReactNode[] = [];
    for (let i = 0; i < N; i += 4) {
      const seg = pts.slice(i, Math.min(N, i + 4) + 1);
      let ok = true;
      for (let k = 1; k < seg.length; k++) if (seg[k].age > seg[k - 1].age + 1) ok = false;
      const a = Math.min(...seg.map((p) => p.a));
      if (!ok || a <= 0.02) continue;
      chunks.push(<path key={i} d={`M${seg.map((p) => `${p.x} ${p.y.toFixed(1)}`).join(' L')}`} opacity={a} />);
    }
    const penY = BASE - SC * sig(c, f);
    const pulse = kind === 'nsr' || kind === 'rosc' ? g(((((f - (kind === 'rosc' ? cur!.a : 0)) / BEAT_F) % 1) + 1) % 1, 0.42, 0.09) * (roscT >= 0 && roscT < 60 ? 1.6 : 1) : 0;
    const shockT = c.at('shock') != null ? f - c.at('shock')! : -1;
    const flash = shockT >= 0 && shockT < 8 ? 1 - shockT / 8 : 0;
    const roscGlow = roscT >= 0 && roscT < 40 ? Math.min(1, 1.4 * (1 - roscT / 40)) : 0;
    const roscBump = roscT >= 0 && roscT < 40 ? Math.sin((roscT / 40) * Math.PI * 3) ** 2 : 0;
    const vfGlow = kind === 'vf' ? tw(f, cur!.a, 12) * (0.55 + 0.35 * Math.sin(f * 0.45)) : 0;
    const jit = kind === 'vf' ? 3 * Math.sin(f * 1.7) : 0;
    const heartFill = kind === 'flatline' ? '#6B2B38' : kind === 'vf' ? '#B83A48' : '#E5484D';
    return (
      <g>
        <defs>
          <filter id="ecgmonitor-glow" filterUnits="userSpaceOnUse" x={0} y={0} width={1000} height={620}>
            <feGaussianBlur stdDeviation={7} />
          </filter>
        </defs>
        <Form d="M300 588 H700 Q716 588 716 604 V606 H284 V604 Q284 588 300 588 Z" fill="#2B3550" stroke="#141B2E" f={f} i={0} sw={4} />
        <Form d="M460 556 H540 V590 H460 Z" fill="#2B3550" stroke="#141B2E" f={f} i={0} sw={4} />
        <Form d={rect(20, 20, 960, 540, 34)} fill="#222B42" stroke="#121829" f={f} i={0} sw={5} />
        <Form d={rect(44, 48, 700, 484, 16)} fill="#06142B" stroke="#0F3A66" f={f} i={1} sw={4} />
        <Form d={rect(768, 48, 188, 312, 16)} fill="#06142B" stroke="#0F3A66" f={f} i={2} sw={4} />
        <Form d={rect(768, 380, 188, 152, 16)} fill="#06142B" stroke="#0F3A66" f={f} i={3} sw={4} />
        {/* graticule */}
        <g stroke="#1E6B46" strokeWidth={3} opacity={fillIn(f, 1) * 0.3 * (1 - 0.7 * flat)}>
          {[120, 220, 320, 420, 520, 620].map((x) => <path key={x} d={`M${x} 64 V516`} />)}
          {[110, 200, 290, 380, 470].map((y) => <path key={y} d={`M60 ${y} H728`} />)}
        </g>
        {/* trace: glow under, crisp line over */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={tw(f, TRACE_F0, 10)}>
          <g stroke={GREEN} strokeWidth={17} filter="url(#ecgmonitor-glow)" opacity={0.85}>{chunks}</g>
          <g stroke={GREEN} strokeWidth={7}>{chunks}</g>
          <circle cx={penX} cy={penY} r={13} fill="#D8FFE8" stroke="none" />
          <circle cx={penX} cy={penY} r={24} fill={GREEN} stroke="none" opacity={0.35} filter="url(#ecgmonitor-glow)" />
        </g>
        {/* red edge while fibrillating */}
        <path d={rect(50, 54, 688, 472, 12)} fill="none" stroke="#FF2D4A" strokeWidth={10} opacity={vfGlow} />
        {/* shock flash */}
        <path d={rect(50, 54, 688, 472, 12)} fill="none" stroke={GREEN} strokeWidth={16} opacity={roscGlow} />
        {/* heart icon */}
        <g transform={`translate(${jit} 0)`} opacity={fillIn(f, 3)}>
          <path d={heartPath(862, 456, 1 + 0.3 * pulse + 0.3 * roscBump)} fill={heartFill} stroke={kind === 'flatline' ? '#3A1820' : '#FFB3B8'} strokeWidth={5} strokeLinejoin="round" />
        </g>
      </g>
    );
  };
  const H_: React.FC<ArtCtx> = (c0) => {
    const c = withStart(c0);
    const cur = stateAt(c, c.f);
    const k = cur?.k ?? 'nsr';
    const txt = k === 'vf' ? '– –' : k === 'flatline' ? '0' : '75';
    const dim = k === 'flatline' ? 0.6 : 1;
    return <T x={862} y={205} size={k === 'vf' ? 100 : 124} family={fonts.body} weight={700} color={GREEN} o={tw(c.f, 30, 16) * dim}>{txt}</T>;
  };
  return {w: 1000, h: 620, layout: 'full', anchors, C: C_, Html: H_};
};

/* ================================================================ aed */
const bez = (p: P[], u: number): P => {
  const m = 1 - u;
  return [0, 1].map((i) => m * m * m * p[0][i] + 3 * m * m * u * p[1][i] + 3 * m * u * u * p[2][i] + u * u * u * p[3][i]) as P;
};
const PORT: P = [478, 250];
const FINAL: {c: P; rot: number}[] = [{c: [810, 150], rot: -10}, {c: [810, 420], rot: 10}];
const DOCK: {c: P; rot: number}[] = [{c: [400, 240], rot: 0}, {c: [400, 262], rot: 0}];
const AG = '#2BD36B';
const AGD = '#126E39';
const BX = 270;
const BY = 432;
const BOLT = `M${BX + 14} ${BY - 62} L${BX - 34} ${BY + 10} H${BX - 6} L${BX - 18} ${BY + 64} L${BX + 36} ${BY - 14} H${BX + 6} Z`;

const aed: ArtFactory = () => {
  const anchors: Record<string, P> = {device: [270, 352], button: [BX, BY], screen: [200, 215], pads: [FINAL[0].c[0], FINAL[0].c[1]], charge: [200, 300], shock: [BX, BY]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const aPads = c.at('pads');
    const aCh = c.at('charge');
    const aSh = c.at('shock');
    const out = aPads != null ? tw(f, aPads, 40) : aCh != null || aSh != null ? 1 : 0;
    const eo = out * out * (3 - 2 * out);
    const sh = aSh != null && f >= aSh ? f - aSh : -1;
    const cs = aCh != null && f >= aCh && sh < 0 ? f - aCh : -1;
    const D = 90;
    const chargeP = cs < 0 ? 0 : clamp01(cs / D);
    const phase = cs < 0 ? f * 0.03 : 2 * Math.PI * (0.06 * Math.min(cs, D) + (0.19 / (2 * D)) * Math.min(cs, D) ** 2 + (cs > D ? 0.25 * (cs - D) : 0));
    const pulse = cs < 0 ? 0.25 + 0.12 * Math.sin(phase) : 0.5 + 0.5 * Math.sin(phase);
    const pos = DOCK.map((d, k) => ({c: [mix(d.c[0], FINAL[k].c[0], eo), mix(d.c[1], FINAL[k].c[1], eo)] as P, rot: mix(d.rot, FINAL[k].rot, eo), s: mix(0.5, 1, eo)}));
    const cab = pos.map((p, k) => [[PORT[0], PORT[1] - 8 + 16 * k], [PORT[0] + 110, PORT[1] - 8 + 16 * k], [p.c[0] - 150 * eo - 20, p.c[1]], p.c] as P[]);
    const cabD = cab.map((q) => `M${q[0]} C${q[1]} ${q[2]} ${q[3]}`);
    const btnFlash = sh >= 0 && sh < 12 ? 1 - sh / 12 : 0;
    const blink = Math.sin(f * 0.12) > 0 ? 1 : 0.35;
    const HANDLE = 'M212 140 V104 Q212 78 238 78 H302 Q328 78 328 104 V140';
    return (
      <g>
        <defs>
          <filter id="aed-glow" filterUnits="userSpaceOnUse" x={0} y={0} width={1000} height={620}>
            <feGaussianBlur stdDeviation={12} />
          </filter>
        </defs>
        <path d={HANDLE} fill="none" stroke={AGD} strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 0, 30)} />
        <path d={HANDLE} fill="none" stroke="#6BE89A" strokeWidth={20} strokeLinecap="round" opacity={fillIn(f, 0, 30)} />
        {/* cables and pads slide out from behind the case */}
        <g fill="none" strokeLinecap="round" opacity={fillIn(f, 2)}>
          {cabD.map((d, k) => <path key={`o${k}`} d={d} stroke="#1F2A44" strokeWidth={20} />)}
          {cabD.map((d, k) => <path key={`i${k}`} d={d} stroke="#5B6B93" strokeWidth={10} />)}
        </g>
        {pos.map((p, k) => (
          <g key={k} transform={`translate(${p.c[0]} ${p.c[1]}) rotate(${p.rot}) skewY(${-7 * eo * (k ? -1 : 1)}) scale(${p.s})`} opacity={fillIn(f, 2)}>
            <path d={rect(-78, -96, 156, 192, 34)} fill="#FFFFFF" stroke="#8E88A3" strokeWidth={6} strokeLinejoin="round" />
            <circle cx={0} cy={6} r={42} fill="#B5B9C7" stroke="#6F7489" strokeWidth={6} />
            <circle cx={0} cy={6} r={20} fill="#D3D6E0" />
            <path d="M-34 -62 Q-34 -76 -18 -76 H18 Q34 -76 34 -62" stroke="#8E88A3" strokeWidth={6} strokeLinecap="round" fill="none" />
            <circle cx={0} cy={-56} r={0} />
            <path d="M-78 0 H-58" stroke="#8E88A3" strokeWidth={8} strokeLinecap="round" />
            {sh > 16 && sh < 46 ? <circle r={40 + (sh - 16) * 3.4} fill="none" stroke="#FFE27A" strokeWidth={9} opacity={1 - (sh - 16) / 30} /> : null}
            {sh > 16 && sh < 38 ? <circle r={90} fill="#FFF3B0" opacity={0.85 * (1 - (sh - 16) / 22)} filter="url(#aed-glow)" /> : null}
          </g>
        ))}
        {/* cable port */}
        <Form d={rect(460, 224, 40, 52, 12)} fill="#3A3F5C" stroke="#1B1F36" f={f} i={1} sw={4} />
        {/* case: shallow, rounded */}
        <Form d={rect(70, 130, 400, 390, 84)} fill={AG} stroke={AGD} f={f} i={1} sw={6} />
        <path d="M130 156 Q270 138 410 156" stroke="#8DF0B5" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.7 * fillIn(f, 1)} />
        {/* screen window: tall and narrow */}
        <Form d={rect(104, 172, 196, 164, 22)} fill="#082018" stroke="#0B4A2C" f={f} i={2} sw={5} />
        <path d="M124 222 H160 L172 198 L186 244 L200 210 L210 222 H280" stroke="#3DFF8B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={fillIn(f, 2) * (0.6 + 0.3 * Math.sin(f * 0.1))} />
        <rect x={122} y={286} width={160} height={30} rx={12} fill="#0E3D2A" opacity={fillIn(f, 2)} />
        {chargeP > 0 ? <rect x={122} y={286} width={Math.max(24, 160 * chargeP)} height={30} rx={12} fill={chargeP > 0.95 ? '#FFD23F' : '#F59E0B'} /> : null}
        <rect x={122} y={286} width={160} height={30} rx={12} fill="none" stroke="#2BD36B" strokeWidth={4} opacity={fillIn(f, 2)} />
        {/* pad compartment lid */}
        <Form d={rect(326, 172, 112, 164, 26)} fill="#6BE89A" stroke={AGD} f={f} i={2} sw={5} />
        <path d="M352 254 H412" stroke={AGD} strokeWidth={8} strokeLinecap="round" opacity={fillIn(f, 2)} />
        <circle cx={382} cy={200} r={10} fill="#0B3B26" stroke={AGD} strokeWidth={3} opacity={fillIn(f, 3)} />
        <circle cx={382} cy={200} r={6} fill={cs >= 0 ? '#F59E0B' : '#CFFFE0'} opacity={(cs >= 0 ? 1 : blink) * fillIn(f, 3)} />
        {/* shock button */}
        <circle cx={BX} cy={BY} r={96 + 18 * pulse} fill="#FFB020" opacity={(cs >= 0 ? 0.55 : 0.22) * pulse + (cs >= 0 ? 0.15 : 0)} filter="url(#aed-glow)" />
        <circle cx={BX} cy={BY} r={84} fill="#1F6E40" opacity={fillIn(f, 3)} />
        <Form d={`M${BX} ${BY - 70} A70 70 0 1 1 ${BX - 0.1} ${BY - 70} Z`} fill={cs >= 0 ? '#FFC93C' : '#FFB020'} stroke="#B45309" f={f} i={3} sw={6} />
        <circle cx={BX} cy={BY} r={54} fill="#FFE38A" opacity={(0.45 + 0.4 * pulse) * fillIn(f, 4)} />
        <path d={BOLT} fill="#D6202F" stroke="#7F1322" strokeWidth={5} strokeLinejoin="round" opacity={fillIn(f, 4)} />
        <circle cx={BX} cy={BY} r={76} fill="none" stroke="#FFF6CC" strokeWidth={6} opacity={(cs >= 0 ? pulse : 0) * 0.8} />
        {btnFlash > 0 ? (
          <g>
            <circle cx={BX} cy={BY} r={150} fill="#FFF1A8" opacity={0.9 * btnFlash} filter="url(#aed-glow)" />
            <circle cx={BX} cy={BY} r={84} fill="#FFFFFF" opacity={0.95 * btnFlash} />
          </g>
        ) : null}
        {/* energy pulses with trails along the cables */}
        {sh >= 0
          ? cab.map((q, k) =>
              [0, 1, 2, 3, 4, 5].map((j) => {
                const u = (sh - j * 1.6) / 20;
                if (u < 0 || u > 1) return null;
                const [x, y] = bez(q, u);
                return (
                  <g key={`${k}${j}`}>
                    <circle cx={x} cy={y} r={38 - j * 4} fill="#FFD23F" opacity={0.75} filter="url(#aed-glow)" />
                    <circle cx={x} cy={y} r={17 - j * 2} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={3} />
                  </g>
                );
              }),
            )
          : null}
      </g>
    );
  };
  return {w: 1000, h: 620, layout: 'side', anchors, C: C_};
};

export default {ecgmonitor, aed} as Record<string, ArtFactory>;
