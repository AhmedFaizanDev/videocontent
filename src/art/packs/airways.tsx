/**
 * Domain pack: airways (Clinical style: flat colour forms outlined in a darker shade of their
 * own hue, drawn on then filled). Generic, reusable for asthma, COPD or any obstructive-airway
 * lesson, and for showing inhaled medicine being taken.
 *
 *   bronchiole  a small airway in cross-section (looking down the tube): a smooth-muscle ring,
 *               a mucosal lining, an open lumen with air drifting through. anchors: muscle
 *               mucosa lumen mucus airflow · events: constrict (the muscle ring tightens, the
 *               whole airway squeezes inward, the lumen narrows) inflame (the lining swells,
 *               thickens, reddens) mucus (thick plugs appear on the lining, narrowing the lumen
 *               further) relieve (the muscle relaxes, the lumen reopens; inflame/mucus persist).
 *               Airflow visibly slows and thins as the lumen narrows.
 *   inhaler     a handheld metered-dose inhaler: a metal canister inserted from the top of an
 *               L-shaped plastic actuator, mouthpiece to the side. anchors: canister mouthpiece
 *               mist puff · event: puff (the canister is pressed down, a mist sprays from the
 *               mouthpiece, then fades). data {tone?: "blue" | "brown"} — reliever blue (default)
 *               or preventer brown/orange (UK convention).
 */
import React from 'react';
import {E, clamp01, hash, mix, tw} from '../../motion';
import {draw, fillIn, rect, type ArtCtx, type ArtFactory} from '../kit';
import {Form, Ping} from './circulation';

type P = [number, number];

/** Blend two #rrggbb colours. */
const mixColor = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(mix(v, pb[i], clamp01(t))).toString(16).padStart(2, '0')).join('')}`;
};

/** A filled ring (circle) whose outline draws on first, then the fill arrives. */
const Ring: React.FC<{cx: number; cy: number; r: number; fill: string; stroke: string; f: number; i: number; sw?: number; dur?: number}> = ({cx, cy, r, fill, stroke, f, i, sw = 5, dur = 30}) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={fill} opacity={fillIn(f, i, dur)} />
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={sw} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, i, dur)} />
  </g>
);

/* ================================================================ bronchiole */
const BK = {
  muscle: '#F0A0A8',
  muscleDark: '#B8535D',
  muscleTight: '#A73E63', // tightened muscle: deep rose/plum — a different hue from the mucosa's red, so the two causes read apart
  muscleTightDark: '#63213D',
  mucosa: '#FBC9D2',
  mucosaDark: '#D98CA0',
  mucosaSwollen: '#E5484D',
  mucosaSwollenDark: '#A3202E',
  lumen: '#F3FBFD',
  lumenStroke: '#CFE9EE',
  mucus: '#D7DB74',
  mucusDark: '#9C9B3A',
  air: '#5FD8D1',
  ok: '#22A55B',
  bad: '#E11D48',
};

const bronchiole: ArtFactory = () => {
  const CX = 450;
  const CY = 350;
  const R_MUSCLE_OUT = 300;
  const R_MUSCLE_IN = 230;
  const MUCOSA_T = 46;
  const R_LUMEN_BASE = R_MUSCLE_IN - MUCOSA_T; // 184: baseline fully-open lumen
  const anchors: Record<string, P> = {
    muscle: [450, 85],
    constrict: [637, 163],
    relieve: [637, 537],
    mucosa: [243, 350],
    inflame: [304, 496],
    mucus: [450, 514],
    lumen: [450, 350],
    airflow: [490, 310],
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const on = (a: string) => c.at(a) != null && f >= c.at(a)!;
    // muscle tension: constrict tightens it, relieve eases it back (inflame/mucus never reverse)
    let m = 0;
    if (on('constrict')) m = tw(f, c.at('constrict')!, 40, E.inOut);
    if (on('relieve') && (!on('constrict') || c.at('relieve')! >= c.at('constrict')!)) {
      m = mix(m, 0, tw(f, c.at('relieve')!, 40, E.inOut));
    }
    const inflameAmt = on('inflame') ? tw(f, c.at('inflame')!, 50, E.inOut) : 0;
    const mucusAmt = on('mucus') ? tw(f, c.at('mucus')!, 50, E.inOut) : 0;
    const amb = 1 + 0.012 * Math.sin(f / 40); // gentle ambient breathing pulse

    const RoutRaw = R_MUSCLE_OUT - 55 * m; // the whole airway squeezes inward, outer edge included
    const RmidRaw = mix(R_MUSCLE_IN, 140, m); // the muscle band thickens inward a lot, narrowing the lumen it encloses
    const mucosaThick = mix(MUCOSA_T, 86, inflameAmt); // the lining swells
    const RinRaw = RmidRaw - mucosaThick;
    const Rout = RoutRaw * amb;
    const Rmid = RmidRaw * amb;
    const Rin = RinRaw * amb;
    const mucusObstruct = mucusAmt * 42;
    const openRaw = Math.max(24, RinRaw - mucusObstruct);
    const flowFrac = clamp01(openRaw / R_LUMEN_BASE); // air flow slows/thins as the lumen narrows

    const muscleFill = mixColor(BK.muscle, BK.muscleTight, m);
    const muscleStroke = mixColor(BK.muscleDark, BK.muscleTightDark, m);
    const mucosaFill = mixColor(BK.mucosa, BK.mucosaSwollen, inflameAmt);
    const mucosaStroke = mixColor(BK.mucosaDark, BK.mucosaSwollenDark, inflameAmt);

    // a relief ring grows out through the wall and stays, so "relieved" always reads as its
    // own clear moment — visible even with nothing to undo yet (no constrict acted)
    const relieveAt = c.at('relieve');
    const reliefGrow = relieveAt != null ? tw(f, relieveAt, 25, E.out) : 0;
    const reliefR = mix(Rin * 0.6, Rout + 16, reliefGrow);
    const reliefO = reliefGrow * 0.45;

    const striations = Array.from({length: 40}, (_, k) => {
      const a = (k / 40) * Math.PI * 2;
      const x0 = CX + Math.cos(a) * (Rmid + 6);
      const y0 = CY + Math.sin(a) * (Rmid + 6);
      const x1 = CX + Math.cos(a + 0.04) * (Rout - 6);
      const y1 = CY + Math.sin(a + 0.04) * (Rout - 6);
      return <path key={k} d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#fff" strokeWidth={3} />;
    });

    const mucusAt = c.at('mucus') ?? 0;
    const mucusBlobs =
      mucusAmt > 0.001
        ? Array.from({length: 5}, (_, k) => {
            const ang = (k / 5) * Math.PI * 2 + hash(k + 7) * 0.5;
            const g = tw(f, mucusAt + k * 5, 40, E.out) * fillIn(f, 2);
            if (g <= 0.001) return null;
            const rBase = Rin - 4;
            const push = 30 * mucusAmt * g;
            const bx = CX + Math.cos(ang) * (rBase - push * 0.5);
            const by = CY + Math.sin(ang) * (rBase - push * 0.5);
            return <ellipse key={k} cx={bx} cy={by} rx={24 * g + 8} ry={18 * g + 6} transform={`rotate(${(ang * 180) / Math.PI + 90} ${bx} ${by})`} fill={BK.mucus} stroke={BK.mucusDark} strokeWidth={3} opacity={g} />;
          })
        : null;

    const air = Array.from({length: 14}, (_, j) => {
      const speed = mix(0.006, 0.02, mix(0.2, 1, flowFrac));
      const u = (((f * speed + j / 14 + hash(j) * 0.5) % 1) + 1) % 1;
      const ang = hash(j + 50) * Math.PI * 2;
      const rr = u * (Rin - 16);
      const x = CX + Math.cos(ang) * rr;
      const y = CY + Math.sin(ang) * rr;
      const sz = mix(4, 10, u) * mix(0.4, 1, flowFrac);
      const op = mix(0.15, 1, flowFrac) * Math.min(1, u * 6, (1 - u) * 3) * fillIn(f, 2);
      return <circle key={j} cx={x} cy={y} r={sz} fill={BK.air} opacity={op} />;
    });

    return (
      <g>
        <Ring cx={CX} cy={CY} r={Rout} fill={muscleFill} stroke={muscleStroke} f={f} i={0} sw={6} />
        <g opacity={0.3 * fillIn(f, 0)}>{striations}</g>
        <Ring cx={CX} cy={CY} r={Rmid} fill={mucosaFill} stroke={mucosaStroke} f={f} i={1} sw={5} />
        <Ring cx={CX} cy={CY} r={Rin} fill={BK.lumen} stroke={BK.lumenStroke} f={f} i={2} sw={4} />
        {mucusBlobs}
        {air}
        {reliefO > 0.005 ? <circle cx={CX} cy={CY} r={reliefR} fill="none" stroke={BK.ok} strokeWidth={10} opacity={reliefO} /> : null}
        <Ping x={anchors.constrict[0]} y={anchors.constrict[1]} r={42} f={f} at={c.at('constrict')} color={BK.bad} />
        <Ping x={anchors.inflame[0]} y={anchors.inflame[1]} r={42} f={f} at={c.at('inflame')} color={BK.bad} />
        <Ping x={anchors.mucus[0]} y={anchors.mucus[1]} r={42} f={f} at={c.at('mucus')} color={BK.mucusDark} />
        <Ping x={anchors.relieve[0]} y={anchors.relieve[1]} r={42} f={f} at={c.at('relieve')} color={BK.ok} />
      </g>
    );
  };
  return {w: 900, h: 700, layout: 'side', lean: 0.02, anchors, C: C_};
};

/* ================================================================ inhaler */
type Tone = 'blue' | 'brown';
const TONES: Record<Tone, {body: string; bodyDark: string}> = {
  blue: {body: '#3B5BDB', bodyDark: '#23398F'},
  brown: {body: '#B4622A', bodyDark: '#7A3F16'},
};
const IK = {
  steel: '#E7E5EE',
  steelDark: '#8E88A3',
  steelShine: '#FFFFFF',
  mouth: '#2B2440',
  mouthLight: '#4A4064',
  mist: '#DFF1FC',
  mistDark: '#A9DCF2',
};
// rounded, friendlier L-shaped actuator (mouthpiece left, canister channel right, corner
// radius 30 throughout); shifted well clear of the left edge so a full spray plume has room
const BODY_D = 'M550 190 H650 Q680 190 680 220 V440 Q680 470 650 470 H350 Q320 470 320 440 V420 Q320 390 350 390 H520 V220 Q520 190 550 190 Z';

// device+mist bounding box in the original drawing space is roughly x:[54,680] y:[67,504];
// DX/DY recentre it with a small margin so it fills the tight canvas below instead of sitting
// in a corner of a mostly-empty frame.
const DX = -14;
const DY = -37;
const MOUTH_X = 320;
const MOUTH_Y = 430;

const inhaler: ArtFactory = (data: {tone?: Tone} = {}) => {
  const T = TONES[data.tone === 'brown' ? 'brown' : 'blue'];
  const anchors: Record<string, P> = {
    canister: [600 + DX, 140 + DY],
    mouthpiece: [MOUTH_X + DX, MOUTH_Y + DY],
    mist: [180 + DX, MOUTH_Y + DY],
    puff: [600 + DX, 100 + DY],
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const puffAt = c.at('puff');
    const since_ = puffAt != null ? f - puffAt : -1;
    // one actuation only: a real puff happens once — press, spray, fade, then calm. No loop.
    const press = since_ >= 0 ? Math.sin(clamp01(since_ / 30) * Math.PI) : 0; // a quick push, springs right back
    const dy = press * 32; // a clearly-visible ~20-unit press, springing right back
    // each droplet is born at the mouthpiece opening (reach 0 at birth) and flies out to its own
    // distance — that spread of reach, not just a moving blob, is what reads as a cone, and
    // starting every droplet at reach 0 keeps the spray anchored at the opening with no gap
    const mist =
      since_ >= 0 && since_ < 80
        ? Array.from({length: 30}, (_, j) => {
            const born = hash(j) * 10; // the burst leaves in a tight beat: dense at the opening first
            const age = since_ - born;
            if (age < 0) return null;
            const grow = clamp01(age / 18); // reaches its own distance over ~20 frames
            const fade = clamp01((age - 18) / 55); // then drifts on and fades over ~60 more
            if (fade >= 1) return null;
            const target = mix(15, 230, hash(j + 20));
            const reach = E.out(grow) * target + Math.max(0, age - 18) * 0.7;
            const ang = Math.PI + (hash(j + 11) - 0.5) * 1.3; // a wide cone spraying left from the mouthpiece
            const x = MOUTH_X + Math.cos(ang) * reach;
            const y = MOUTH_Y + Math.sin(ang) * reach * 0.5;
            const sz = mix(8, 20, hash(j + 3)) * mix(0.5, 1, grow) * (1 - 0.3 * fade);
            const o = Math.sqrt(grow) * (1 - fade); // ramps up fast so droplets show right at the opening
            return <circle key={j} cx={x} cy={y} r={sz} fill={j % 3 === 0 ? IK.mistDark : IK.mist} opacity={o} />;
          })
        : null;
    return (
      <g transform={`translate(${DX} ${DY})`}>
        {/* the canister sits BEHIND the actuator's top, so a press visibly sinks it in */}
        <g transform={`translate(0 ${dy})`}>
          <Form d="M588 200 H612 V244 H588 Z" fill={IK.steelDark} stroke={IK.steelDark} f={f} i={1} sw={2} />
          <Form d={rect(560, 70, 80, 140, 18)} fill={IK.steel} stroke={IK.steelDark} f={f} i={1} sw={5} />
          <rect x={570} y={80} width={13} height={112} rx={6} fill={IK.steelShine} opacity={0.35 * fillIn(f, 1)} />
          {/* press arrow: a thumb's push, shown only while pressing */}
          <path d="M600 20 L600 52 M586 40 L600 54 L614 40" stroke={T.bodyDark} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={press} />
        </g>
        <Form d={BODY_D} fill={T.body} stroke={T.bodyDark} f={f} i={0} sw={6} />
        <ellipse cx={MOUTH_X} cy={MOUTH_Y} rx={15} ry={40} fill={IK.mouth} opacity={fillIn(f, 0)} />
        <ellipse cx={MOUTH_X + 4} cy={MOUTH_Y} rx={8} ry={32} fill={IK.mouthLight} opacity={0.5 * fillIn(f, 0)} />
        {mist}

      </g>
    );
  };
  return {w: 710, h: 500, layout: 'side', anchors, C: C_};
};

export default {bronchiole, inhaler} as Record<string, ArtFactory>;
