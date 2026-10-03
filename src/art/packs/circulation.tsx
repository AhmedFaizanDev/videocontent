/**
 * Domain pack: circulation and blood pressure (Clinical style: colourful flat forms with
 * a darker outline of their own hue that draws on, then fills).
 *
 *   artery     a cut-open artery: blood flows, each heartbeat sends a pressure wave that
 *              stretches the wall; a gauge on the right follows the pressure.
 *              anchors: heart wall blood gauge · events: systole diastole (the gauge marks
 *              the peak / the floor as they are named)
 *   bpmonitor  an upper arm in a cuff, tubing to a digital monitor that counts up to the
 *              reading. anchors: cuff artery monitor sys dia unit · data {sys: 120, dia: 80,
 *              sysLabel?: "SYS", diaLabel?: "DIA", unit?: "mmHg"}
 *   bpscale    a colour scale from low to high with the reading bands; a pin moves to each
 *              band as it is named. anchors: low ideal raised high · data {marks?: ["90/60",
 *              "120/80", "140/90"]}
 * Text inside the art is numbers/units only (and data-overridable), so it works in every
 * language; the callout column carries the words.
 */
import React from 'react';
import {fonts, ink} from '../../theme';
import {E, clamp01, mix, tw} from '../../motion';
import {draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';
import {ui} from '../../lang';

type P = [number, number];
const C = {
  red: '#E5484D',
  redDark: '#A3202E',
  redLight: '#FFE1E3',
  lumen: '#FFF1F2',
  cell: '#E23B4E',
  cellHi: '#FF8A95',
  skin: '#F4C7A5',
  skinDark: '#C98B63',
  cuff: '#3B5BDB',
  cuffDark: '#23398F',
  screen: '#0F1B2D',
  lcd: '#5EEAD4',
  metal: '#E7E5EE',
  metalDark: '#8E88A3',
  ok: '#22A55B',
  warn: '#F59E0B',
  bad: '#E11D48',
  low: '#3B82F6',
};

/** A filled form whose outline (its own darker hue) draws on first, then the fill arrives. */
export const Form: React.FC<{d: string; fill: string; stroke: string; f: number; i: number; sw?: number; dur?: number; o?: number}> = ({d, fill, stroke, f, i, sw = 4, dur = 26, o = 1}) => (
  <g opacity={o}>
    <path d={d} fill={fill} opacity={fillIn(f, i, dur)} />
    <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, i, dur)} />
  </g>
);

/** Soft pulsing highlight ring for the part being named. */
export const Ping: React.FC<{x: number; y: number; r: number; f: number; at: number | null; color?: string}> = ({x, y, r, f, at, color = '#D8148C'}) => {
  if (at == null || f < at) return null;
  const k = ((f - at) % 45) / 45;
  return <circle cx={x} cy={y} r={r * (0.7 + 0.6 * k)} fill="none" stroke={color} strokeWidth={4} opacity={(1 - k) * tw(f, at, 8)} />;
};

const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 34 * s} C ${cx - 70 * s} ${cy - 10 * s}, ${cx - 44 * s} ${cy - 66 * s}, ${cx} ${cy - 34 * s} C ${cx + 44 * s} ${cy - 66 * s}, ${cx + 70 * s} ${cy - 10 * s}, ${cx} ${cy + 34 * s} Z`;

/* ================================================================ artery */
const artery: ArtFactory = (data = {}) => {
  const period = 30 * (60 / (data.bpm ?? 72));
  const X0 = 190;
  const X1 = 760;
  const MID = 330;
  const R = 92;
  const WALL = 30;
  const anchors: Record<string, P> = {heart: [110, 330], wall: [470, MID - R - WALL / 2], blood: [420, MID + 30], systole: [600, MID - R - 20], diastole: [330, MID + R + 20], gauge: [880, 250]};
  // pressure at time t and position x: a travelling pulse leaving the heart each beat
  const wave = (f: number, x: number) => {
    const u = ((((f - 30) / period) % 1) + 1) % 1; // beat phase
    const front = X0 - 120 + u * (X1 - X0 + 360);
    const d = (x - front) / 90;
    return Math.exp(-d * d);
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const on = (a: string) => c.at(a) != null && f >= c.at(a)!;
    const beating = f > 30;
    const edge = (sign: 1 | -1) => {
      const pts: string[] = [];
      for (let x = X0; x <= X1; x += 10) {
        const r = R + (beating ? 16 * wave(f, x) : 0);
        pts.push(`${x} ${MID + sign * r}`);
      }
      return `M${pts.join(' L')}`;
    };
    const lumen = `${edge(-1)} L ${edge(1).slice(1).split(' L').reverse().join(' L')} Z`;
    const probe = beating ? wave(f, 700) : 0;
    const beatPhase = ((((f - 30) / period) % 1) + 1) % 1;
    const heartS = 1 + (beating ? 0.08 * Math.max(0, Math.sin(beatPhase * Math.PI * 2)) : 0);
    const p = draw(f, 0, 30);
    const flowO = fillIn(f, 1, 26);
    // blood cells drift downstream and surge with the pulse
    const cells = Array.from({length: 16}, (_, j) => {
      const base = (j * 97) % 560;
      const x = X0 + ((base + f * 3.2 + (beating ? 40 * wave(f, X0 + base) : 0)) % (X1 - X0));
      const y = MID + Math.sin(j * 1.7) * 52;
      const rot = (j * 37) % 180;
      return (
        <g key={j} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={flowO * clamp01(Math.min(x - X0, X1 - x) / 30)}>
          <ellipse rx={20} ry={13} fill={C.cell} />
          <ellipse rx={9} ry={5} fill={C.cellHi} opacity={0.7} />
        </g>
      );
    });
    const needle = mix(-130, 20, beating ? 0.25 + 0.75 * probe : 0.1);
    const gx = 880;
    const gy = 250;
    const GR = 86;
    const tick = (deg: number, col: string, w = 5, len = 18) => {
      const a = (deg * Math.PI) / 180;
      return <path d={`M${gx + Math.cos(a) * (GR - len)} ${gy + Math.sin(a) * (GR - len)} L${gx + Math.cos(a) * (GR - 4)} ${gy + Math.sin(a) * (GR - 4)}`} stroke={col} strokeWidth={w} strokeLinecap="round" />;
    };
    const arc = (a0: number, a1: number, col: string) => {
      const r = GR - 10;
      const p0 = [gx + Math.cos((a0 * Math.PI) / 180) * r, gy + Math.sin((a0 * Math.PI) / 180) * r];
      const p1 = [gx + Math.cos((a1 * Math.PI) / 180) * r, gy + Math.sin((a1 * Math.PI) / 180) * r];
      return <path d={`M${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`} stroke={col} strokeWidth={12} fill="none" strokeLinecap="round" />;
    };
    return (
      <g>
        {/* heart, pushing blood into the artery */}
        <g transform={`translate(110 330) scale(${heartS}) translate(-110 -330)`}>
          <Form d={heartPath(110, 330, 1.25)} fill={C.red} stroke={C.redDark} f={f} i={0} />
          <path d="M84 300 q 12 -16 30 -10" stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.6 * fillIn(f, 0)} />
        </g>
        <path d={`M150 ${MID} L${X0} ${MID}`} stroke={C.redDark} strokeWidth={4} opacity={p} />
        {/* the artery: lumen, then the elastic wall on both sides */}
        <path d={lumen} fill={C.lumen} opacity={fillIn(f, 1)} />
        {cells}
        <g opacity={p}>
          <path d={edge(-1)} stroke={C.red} strokeWidth={WALL} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
          <path d={edge(1)} stroke={C.red} strokeWidth={WALL} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
          <path d={edge(-1)} stroke={C.redDark} strokeWidth={3} fill="none" transform={`translate(0 ${-WALL / 2})`} />
          <path d={edge(1)} stroke={C.redDark} strokeWidth={3} fill="none" transform={`translate(0 ${WALL / 2})`} />
          <path d={edge(-1)} stroke="#FFB3B9" strokeWidth={4} fill="none" transform={`translate(0 ${WALL / 2 - 3})`} />
          <path d={edge(1)} stroke="#FFB3B9" strokeWidth={4} fill="none" transform={`translate(0 ${-WALL / 2 + 3})`} />
        </g>
        {/* the pressure wave, made visible when systole is named */}
        {on('systole') ? (
          <g opacity={tw(f, c.at('systole')!, 12)}>
            {[-1, 1].map((sg) => {
              const u = ((((f - 30) / period) % 1) + 1) % 1;
              const front = X0 - 120 + u * (X1 - X0 + 360);
              return front > X0 && front < X1 ? (
                <path key={sg} d={`M${front - 40} ${MID + sg * (R + 38)} Q ${front} ${MID + sg * (R + 58)} ${front + 40} ${MID + sg * (R + 38)}`} stroke="#D8148C" strokeWidth={5} fill="none" strokeLinecap="round" />
              ) : null;
            })}
          </g>
        ) : null}
        {/* gauge */}
        <g opacity={fillIn(f, 3)}>
          <circle cx={gx} cy={gy} r={GR + 14} fill={C.metal} stroke={C.metalDark} strokeWidth={4} />
          <circle cx={gx} cy={gy} r={GR} fill="#fff" />
          {arc(-200, -115, C.low)}
          {arc(-110, -40, C.ok)}
          {arc(-35, 10, C.warn)}
          {arc(15, 25, C.bad)}
          {[-190, -150, -110, -70, -30, 10].map((d) => (
            <React.Fragment key={d}>{tick(d, C.metalDark, 3, 12)}</React.Fragment>
          ))}
          {on('systole') ? tick(mix(-130, 20, 1), '#D8148C', 7, 30) : null}
          {on('diastole') ? tick(mix(-130, 20, 0.25), C.low, 7, 30) : null}
          <g transform={`rotate(${needle} ${gx} ${gy})`}>
            <path d={`M${gx - 12} ${gy} L${gx + GR - 18} ${gy}`} stroke={ink.ink} strokeWidth={6} strokeLinecap="round" />
          </g>
          <circle cx={gx} cy={gy} r={11} fill={ink.ink} />
          <path d={`M${gx} ${gy + GR + 14} L${gx} ${MID + R + 40} L${X1 - 60} ${MID + R + 40} L${X1 - 60} ${MID + R + WALL / 2}`} stroke={C.metalDark} strokeWidth={6} fill="none" strokeLinejoin="round" />
        </g>
        <Ping x={anchors.systole[0]} y={anchors.systole[1]} r={40} f={f} at={c.at('systole')} />
        <Ping x={anchors.diastole[0]} y={anchors.diastole[1]} r={40} f={f} at={c.at('diastole')} color={C.low} />
      </g>
    );
  };
  return {w: 1000, h: 620, layout: 'side', lean: 0.02, anchors, C: C_};
};

/* ================================================================ bpmonitor */
const bpmonitor: ArtFactory = (data = {}) => {
  const sys = data.sys ?? 120;
  const dia = data.dia ?? 80;
  const anchors: Record<string, P> = {cuff: [300, 330], artery: [300, 420], monitor: [930, 300], sys: [700, 176], dia: [700, 392], unit: [660, 312]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const on = (a: string) => c.at(a) != null && f >= c.at(a)!;
    const inflate = on('cuff') ? 1 + 0.06 * Math.sin(clamp01((f - c.at('cuff')!) / 50) * Math.PI) : 1;
    const arteryO = on('artery') ? tw(f, c.at('artery')!, 14) : 0;
    const pulse = on('artery') ? 0.5 + 0.5 * Math.sin((f - c.at('artery')!) / 4.5) : 0;
    return (
      <g>
        {/* upper arm, shoulder at left, elbow at right */}
        <Form d="M40 250 C 120 230 360 236 520 262 C 560 270 580 300 578 340 C 576 384 552 410 510 414 C 360 424 150 430 40 420 Z" fill={C.skin} stroke={C.skinDark} f={f} i={0} />
        <path d="M520 300 C 548 312 556 350 540 380" stroke={C.skinDark} strokeWidth={3} fill="none" opacity={0.6 * fillIn(f, 0)} />
        {/* brachial artery, seen through the skin when named */}
        <path d="M40 380 C 180 372 330 372 560 360" stroke={C.red} strokeWidth={10 + 3 * pulse} fill="none" strokeLinecap="round" opacity={arteryO} />
        {/* cuff */}
        <g transform={`translate(300 330) scale(1 ${inflate}) translate(-300 -330)`}>
          <Form d="M180 226 C 250 216 360 218 430 228 L 438 438 C 360 446 250 446 172 440 Z" fill={C.cuff} stroke={C.cuffDark} f={f} i={1} />
          <path d="M196 262 L 420 264 M 194 404 L 424 404" stroke="#fff" strokeWidth={4} strokeDasharray="10 10" opacity={0.5 * fillIn(f, 1)} />
        </g>
        {/* tubing */}
        <path d="M306 226 C 310 120 470 96 610 150" stroke={C.metalDark} strokeWidth={8} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 2)} />
        {/* monitor */}
        <Form d="M600 80 H 920 Q 950 80 950 110 V 480 Q 950 510 920 510 H 600 Q 570 510 570 480 V 110 Q 570 80 600 80 Z" fill={C.metal} stroke={C.metalDark} f={f} i={2} />
        <rect x={604} y={116} width={312} height={352} rx={16} fill={C.screen} opacity={fillIn(f, 3)} />
        <rect x={620} y={342} width={280} height={2} fill={C.lcd} opacity={0.25 * fillIn(f, 3)} />
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const count = (a: string, to: number) => (c.at(a) != null && f >= c.at(a)! ? Math.round(to * E.out(clamp01((f - c.at(a)!) / 40))) : null);
    const s = count('sys', sys);
    const d = count('dia', dia);
    const o = fillIn(f, 3);
    const num = (v: number | null, y: number) => (
      <div style={{position: 'absolute', right: 1000 - 890, top: y, fontFamily: fonts.body, fontWeight: 700, fontSize: 104, lineHeight: 1, color: C.lcd, opacity: o, fontVariantNumeric: 'tabular-nums'}}>{v == null ? '– –' : v}</div>
    );
    const lab = (t: string, y: number) => <div style={{position: 'absolute', left: 632, top: y, fontFamily: fonts.label, fontWeight: 700, fontSize: 26, letterSpacing: '0.08em', color: 'rgba(94,234,212,0.75)', opacity: o}}>{t}</div>;
    return (
      <>
        {lab(data.sysLabel ?? ui('sys'), 140)}
        {num(s, 176)}
        {lab(data.diaLabel ?? ui('dia'), 356)}
        {num(d, 350)}
        <div style={{position: 'absolute', left: 632, top: 296, fontFamily: fonts.label, fontWeight: 600, fontSize: 22, color: 'rgba(94,234,212,0.6)', opacity: o * (c.at('unit') != null && f >= c.at('unit')! ? 1 : 0.35)}}>{data.unit ?? 'mmHg'}</div>
      </>
    );
  };
  return {w: 1000, h: 560, layout: 'side', lean: 0.025, anchors, C: C_, Html};
};

/* ================================================================ bpscale */
const bpscale: ArtFactory = (data = {}) => {
  const marks: string[] = data.marks ?? ['90/60', '120/80', '140/90'];
  const Y = 300;
  const X0 = 80;
  const X1 = 920;
  const bands = [
    {a: 'low', x0: X0, x1: 250, col: C.low},
    {a: 'ideal', x0: 250, x1: 530, col: C.ok},
    {a: 'raised', x0: 530, x1: 700, col: C.warn},
    {a: 'high', x0: 700, x1: X1, col: C.bad},
  ];
  const anchors: Record<string, P> = Object.fromEntries(bands.map((b) => [b.a, [(b.x0 + b.x1) / 2, Y] as P]));
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const named = bands.map((b) => c.at(b.a)).map((t) => (t != null && f >= t ? t : null));
    const cur = named.reduce((k: number, t, i) => (t != null ? i : k), -1);
    let px = X0 - 40;
    bands.forEach((b, i) => {
      const t = named[i];
      if (t != null) px = mix(px, (b.x0 + b.x1) / 2, tw(f, t, 22, E.inOut));
    });
    return (
      <g>
        {bands.map((b, i) => {
          const g = draw(f, i, 20);
          const lit = i === cur;
          return (
            <g key={b.a}>
              <rect x={b.x0 + 3} y={Y - 34} width={(b.x1 - b.x0 - 6) * g} height={68} rx={16} fill={b.col} opacity={lit ? 1 : cur >= 0 ? 0.4 : 0.85} />
              {lit ? <rect x={b.x0 - 3} y={Y - 40} width={b.x1 - b.x0 + 6} height={80} rx={20} fill="none" stroke={b.col} strokeWidth={4} opacity={0.5} /> : null}
            </g>
          );
        })}
        {[250, 530, 700].map((x, i) => (
          <path key={i} d={`M${x} ${Y + 44} L${x} ${Y + 70}`} stroke={ink.faint} strokeWidth={3} opacity={draw(f, 4)} />
        ))}
        {/* the pin */}
        {cur >= 0 ? (
          <g transform={`translate(${px} ${Y - 110})`}>
            <path d="M0 64 C -30 30 -34 10 -34 -4 A 34 34 0 1 1 34 -4 C 34 10 30 30 0 64 Z" fill={bands[cur].col} stroke="#fff" strokeWidth={4} />
            <circle r={13} cy={-4} fill="#fff" />
          </g>
        ) : null}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => (
    <>
      {[250, 530, 700].map((x, i) =>
        marks[i] ? (
          <div key={i} style={{position: 'absolute', left: x, top: Y + 78, transform: 'translateX(-50%)', fontFamily: fonts.body, fontWeight: 700, fontSize: 34, color: ink.ink, opacity: draw(c.f, 4), whiteSpace: 'nowrap'}}>
            {marks[i]}
          </div>
        ) : null,
      )}
    </>
  );
  return {w: 1000, h: 480, layout: 'side', lean: 0.02, anchors, C: C_, Html};
};

export const CIRCULATION: Record<string, ArtFactory> = {artery, bpmonitor, bpscale};
