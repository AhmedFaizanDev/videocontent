/**
 * Pack cpr: chest compressions (side view) and a countdown timer ring. Text-free except the
 * timer digits (Html layer).
 *   cpr    patient lying flat, rescuer kneeling on the far side, shoulders over locked arms,
 *          interlocked hands on the centre of the chest. anchors: hands chest sternum heart
 *          compress stop · events: compress (rhythmic push and full recoil, ~110/min, arrow +
 *          heart pulse) stop (hands lift clear, a pulse check at the heart)
 *   timer  stopwatch ring counting down from 3:00. anchors: ring digits start stop · events:
 *          start (real-time countdown, teal → amber → red) stop (freezes, turns green)
 */
import React from 'react';
import {E, clamp01, mix, tw} from '../../motion';
import {draw, fillIn, T, type ArtCtx, type ArtFactory} from '../kit';
import {Form} from './circulation';

type P = [number, number];
const K = {
  skin: '#F4C7A5', skinDark: '#C98B63', hair: '#3B2A2A',
  shirt: '#7CB8E8', shirtDark: '#3E7CB1', trousers: '#3B4A6B', trousersDark: '#232E47',
  sleeve: '#F08A3C', sleeveDark: '#B45A16', red: '#E5484D', redDark: '#A3202E',
  steel: '#E7E5EE', steelDark: '#8E88A3', ok: '#22A55B', okDark: '#15703C', warn: '#F59E0B', bad: '#E11D48',
  teal: '#0E9F95', tealDark: '#0A6E67', ink: '#1C1530',
};
const PERIOD = 16;
const DEPTH = 38;

/* ================================================================ cpr */
/*
 * Side view, patient supine (head left). The rescuer kneels on the far side: head and torso
 * above the patient, shoulders straight over the hands, arms locked, heel of the interlocked
 * hands on the lower sternum. A compression is the rescuer's whole upper body driving down,
 * the chest squashing, then full recoil (hands never leave the chest).
 */
const SC = {scrub: '#8E3FC0', scrubDark: '#5B2280', rSkin: '#D9A07A', rSkinDark: '#9E6A45'};
const cpr: ArtFactory = () => {
  const HX = 470; // hands / sternum x
  const CHEST = 392; // chest surface at rest (under the hands)
  const anchors: Record<string, P> = {hands: [HX + 2, CHEST - 26], chest: [360, 420], sternum: [HX, CHEST + 6], heart: [HX + 10, 452], compress: [HX + 130, CHEST - 110], stop: [HX - 40, CHEST - 40]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const cs = c.at('compress');
    const st = c.at('stop');
    let d = 0;
    let push = 0;
    let lift = 0;
    if (cs != null && f >= cs) {
      const amp = tw(f, cs, 8) * (st != null && f >= st ? 1 - tw(f, st, 12) : 1);
      const u = (((f - cs) % PERIOD) / PERIOD + 0.44) % 1; // first push peaks ~7 frames after the cue
      push = (0.5 - 0.5 * Math.cos(2 * Math.PI * u)) * amp;
      d = DEPTH * push;
    }
    if (st != null && f >= st) lift = 14 * tw(f, st + 6, 14, E.out);
    // the chest squashes under the hands; the rest of the torso follows less
    const top = (x: number) => CHEST + d * Math.exp(-(((x - HX) / 150) ** 2)) + (x < 300 ? (300 - x) * 0.5 : 0) + (x > 640 ? (x - 640) * 0.35 : 0);
    const pts: string[] = [];
    for (let x = 250; x <= 700; x += 10) pts.push(`${x} ${top(x).toFixed(1)}`);
    const torso = `M232 500 L232 ${(top(250) + 20).toFixed(1)} L${pts.join(' L')} Q722 ${(top(700) + 26).toFixed(1)} 722 470 L722 500 Z`;
    const ry = d - lift; // the rescuer's upper body travels with the chest
    return (
      <g>
        {/* floor mat */}
        <Form d="M40 500 H960 V530 Q960 544 946 544 H54 Q40 544 40 530 Z" fill={K.steel} stroke={K.steelDark} f={f} i={0} sw={5} />
        {/* rescuer kneeling behind the patient, facing us: scrubs torso and head (upper body only) */}
        <g transform={`translate(0 ${ry})`}>
          <Form d={`M${HX - 92} 236 Q ${HX - 96} 192 ${HX - 56} 186 L ${HX + 56} 186 Q ${HX + 96} 192 ${HX + 92} 236 L ${HX + 84} 440 L ${HX - 84} 440 Z`} fill={SC.scrub} stroke={SC.scrubDark} f={f} i={1} sw={5} />
          <path d={`M${HX - 26} 190 L ${HX} 226 L ${HX + 26} 190`} stroke={SC.scrubDark} strokeWidth={5} fill="none" strokeLinejoin="round" opacity={fillIn(f, 1)} />
          <Form d={`M${HX - 18} 168 H${HX + 18} V194 H${HX - 18} Z`} fill={SC.rSkin} stroke={SC.rSkinDark} f={f} i={2} sw={4} />
          {/* head, looking down at the hands */}
          <Form d={`M${HX} 64 a50 54 0 1 1 -0.1 0 Z`} fill={SC.rSkin} stroke={SC.rSkinDark} f={f} i={2} sw={5} />
          <path d={`M${HX - 50} 112 Q ${HX - 54} 58 ${HX} 56 Q ${HX + 54} 58 ${HX + 50} 112 Q ${HX + 40} 84 ${HX} 86 Q ${HX - 40} 84 ${HX - 50} 112 Z`} fill={K.hair} opacity={fillIn(f, 2)} />
          <g opacity={fillIn(f, 2)} stroke={K.ink} strokeWidth={5} fill="none" strokeLinecap="round">
            <path d={`M${HX - 26} 128 q 9 6 18 0`} />
            <path d={`M${HX + 8} 128 q 9 6 18 0`} />
            <path d={`M${HX - 10} 150 q 10 5 20 0`} stroke={SC.rSkinDark} />
          </g>
        </g>
        {/* patient: legs, torso (shirt), neck, head face-up */}
        <Form d="M700 432 Q712 418 760 420 L912 428 Q946 432 946 464 Q946 498 912 498 L700 500 Z" fill={K.trousers} stroke={K.trousersDark} f={f} i={3} sw={5} />
        <Form d={torso} fill={K.shirt} stroke={K.shirtDark} f={f} i={3} sw={5} />
        <path d={`M300 ${(top(300) + 34).toFixed(1)} Q 420 ${(top(420) + 46).toFixed(1)} 540 ${(top(540) + 40).toFixed(1)}`} stroke={K.shirtDark} strokeWidth={4} fill="none" opacity={0.5 * fillIn(f, 3)} />
        <Form d="M196 468 L240 452 L240 500 L196 500 Z" fill={K.skin} stroke={K.skinDark} f={f} i={4} sw={5} />
        <Form d="M92 500 a70 66 0 0 1 140 0 Z" fill={K.skin} stroke={K.skinDark} f={f} i={4} sw={5} />
        <Form d="M150 436 Q158 410 174 434" fill={K.skin} stroke={K.skinDark} f={f} i={4} sw={5} />
        <g opacity={fillIn(f, 4)}>
          <path d="M92 500 a70 66 0 0 1 36 -58 Q108 466 114 500 Z" fill={K.hair} />
          <path d="M132 458 q10 8 22 0" fill="none" stroke={K.skinDark} strokeWidth={5} strokeLinecap="round" />
          <path d="M186 470 q7 5 14 0" fill="none" stroke={K.skinDark} strokeWidth={5} strokeLinecap="round" />
        </g>
        {/* the heart being squeezed: appears and glows with every push (clipped to the chest) */}
        <defs>
          <clipPath id="cpr-chest">
            <path d={torso} />
          </clipPath>
        </defs>
        <g clipPath="url(#cpr-chest)" opacity={push}>
          <path
            d={`M${HX + 10} 476 C${HX - 18} 454 ${HX - 20} 426 ${HX} 426 Q${HX + 10} 426 ${HX + 10} 438 Q${HX + 10} 426 ${HX + 20} 426 C${HX + 40} 426 ${HX + 38} 454 ${HX + 10} 476Z`}
            fill={K.red}
            stroke={K.redDark}
            strokeWidth={4}
            strokeLinejoin="round"
            transform={`translate(${HX + 10} 450) scale(${0.9 + 0.3 * push}) translate(${-HX - 10} -450)`}
          />
        </g>
        {/* locked arms (far arm darker, behind) and interlocked hands on the sternum */}
        <g transform={`translate(0 ${ry})`}>
          {/* both arms straight from the shoulders, converging on the hands */}
          {[-1, 1].map((side) => (
            <g key={side} opacity={fillIn(f, 3)}>
              <path d={`M${HX + side * 62} 214 L${HX + side * 26} ${CHEST - 34}`} stroke={SC.rSkinDark} strokeWidth={44} strokeLinecap="round" />
              <path d={`M${HX + side * 62} 214 L${HX + side * 26} ${CHEST - 34}`} stroke={SC.rSkin} strokeWidth={36} strokeLinecap="round" />
              <path d={`M${HX + side * 66} 206 L${HX + side * 58} 250`} stroke={SC.scrubDark} strokeWidth={54} strokeLinecap="round" />
              <path d={`M${HX + side * 66} 206 L${HX + side * 58} 250`} stroke={SC.scrub} strokeWidth={46} strokeLinecap="round" />
            </g>
          ))}
          <Form
            d={`M${HX - 62} ${CHEST} Q${HX - 66} ${CHEST - 54} ${HX - 20} ${CHEST - 58} H${HX + 26} Q${HX + 70} ${CHEST - 54} ${HX + 66} ${CHEST} Q${HX + 64} ${CHEST + 6} ${HX + 52} ${CHEST + 6} H${HX - 50} Q${HX - 62} ${CHEST + 6} ${HX - 62} ${CHEST} Z`}
            fill={SC.rSkin}
            stroke={SC.rSkinDark}
            f={f}
            i={4}
            sw={5}
          />
          <g opacity={fillIn(f, 4)} stroke={SC.rSkinDark} strokeWidth={4} strokeLinecap="round" fill="none">
            {/* interlocked fingers: knuckle ridges of the top hand */}
            {[-36, -18, 0, 18, 36].map((dx) => (
              <path key={dx} d={`M${HX + dx} ${CHEST - 50} q 8 -8 16 0`} />
            ))}
            <path d={`M${HX - 44} ${CHEST - 28} H${HX + 48}`} />
            <path d={`M${HX - 40} ${CHEST - 12} H${HX + 44}`} />
          </g>
        </g>
        {/* push cue: a bold arrow beside the shoulders, in time with each compression */}
        {push > 0.05 ? (
          <g opacity={clamp01(push * 1.6)} transform={`translate(0 ${d * 0.6})`}>
            <path d={`M${HX + 130} ${CHEST - 150} V${CHEST - 86}`} stroke={K.bad} strokeWidth={20} strokeLinecap="round" />
            <path d={`M${HX + 94} ${CHEST - 96} L${HX + 130} ${CHEST - 44} L${HX + 166} ${CHEST - 96}Z`} fill={K.bad} stroke={K.bad} strokeWidth={10} strokeLinejoin="round" />
          </g>
        ) : null}
        {/* stop: hands lift clear, a green pulse check at the heart */}
        {st != null && f >= st ? <circle cx={HX + 10} cy={452} r={30 + 50 * (((f - st) % 40) / 40)} fill="none" stroke={K.ok} strokeWidth={6} opacity={(1 - ((f - st) % 40) / 40) * tw(f, st, 10)} /> : null}
      </g>
    );
  };
  return {w: 1000, h: 580, layout: 'side', anchors, C: C_};
};

/* ================================================================ timer */
const hex = (h: string): P3 => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as P3;
type P3 = [number, number, number];
const lerp = (a: string, b: string, t: number) => `rgb(${hex(a).map((v, i) => Math.round(mix(v, hex(b)[i], clamp01(t)))).join(',')})`;

const timer: ArtFactory = (data = {}) => {
  const TOTAL = data.secs ?? 180;
  const CX = 300, CY = 330, R = 215;
  const anchors: Record<string, P> = {ring: [CX + R, CY], digits: [CX, CY + 70], start: [CX, CY - R], stop: [CX + 152, CY + 152]};
  const circle = `M${CX} ${CY - R} A${R} ${R} 0 1 1 ${CX} ${CY + R} A${R} ${R} 0 1 1 ${CX} ${CY - R}`;
  const state = (c: ArtCtx) => {
    const s = c.at('start');
    const st = c.at('stop');
    const end = st != null && (s == null || st >= s) ? st : c.f;
    const el = s != null && c.f >= s ? Math.min(TOTAL, Math.max(0, end - s) / 30) : 0;
    return {el, left: Math.ceil(TOTAL - el - 1e-9), u: 1 - el / TOTAL, stopped: st != null && c.f >= st};
  };
  const col = (c: ArtCtx) => {
    const {u} = state(c);
    return u > 0.75 ? K.teal : u > 0.4 ? lerp(K.teal, K.warn, (0.75 - u) / 0.35) : lerp(K.warn, K.bad, (0.4 - u) / 0.3);
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const {u, stopped} = state(c);
    let stroke = col(c);
    if (stopped) stroke = K.ok;
    const p = draw(f, 1, 40);
    const a = -Math.PI / 2 - 2 * Math.PI * (1 - u);
    const hx = CX + Math.cos(a) * R, hy = CY + Math.sin(a) * R;
    const run = c.at('start') != null && f >= c.at('start')! && !stopped && u > 0;
    const pulse = run ? Math.exp(-(((f - c.at('start')!) % 30) / 8)) : 0;
    return (
      <g>
        <Form d="M270 70 H330 V100 H270 Z" fill={K.steel} stroke={K.steelDark} f={f} i={0} sw={5} />
        <Form d="M240 40 H360 Q372 40 372 52 V60 Q372 70 360 70 H240 Q228 70 228 60 V52 Q228 40 240 40Z" fill={K.steel} stroke={K.steelDark} f={f} i={0} sw={5} />
        <Form d={`M${CX} ${CY - R - 34} a${R + 34} ${R + 34} 0 1 1 0 ${2 * (R + 34)} a${R + 34} ${R + 34} 0 1 1 0 ${-2 * (R + 34)}`} fill="#fff" stroke={K.steelDark} f={f} i={1} sw={6} />
        <path d={circle} fill="none" stroke={K.steel} strokeWidth={38} opacity={fillIn(f, 2)} />
        <g opacity={fillIn(f, 2)}>
          {Array.from({length: 12}, (_, k) => {
            const t = (k / 12) * Math.PI * 2;
            return <path key={k} d={`M${CX + Math.sin(t) * (R - 46)} ${CY - Math.cos(t) * (R - 46)} L${CX + Math.sin(t) * (R - 58)} ${CY - Math.cos(t) * (R - 58)}`} stroke={K.steelDark} strokeWidth={6} strokeLinecap="round" />;
          })}
        </g>
        <path d={circle} fill="none" stroke={stroke} strokeWidth={38} strokeLinecap="round" pathLength={1} strokeDasharray={`${Math.max(0.001, u * p)} 2`} />
        {run || stopped ? <circle cx={hx} cy={hy} r={12 + pulse * 8} fill="#fff" stroke={stroke} strokeWidth={6} /> : null}
      </g>
    );
  };
  const H_: React.FC<ArtCtx> = (c) => {
    const {left} = state(c);
    const col_ = state(c).stopped ? K.okDark : left <= 30 && c.at('start') != null && c.f >= c.at('start')! ? K.bad : K.ink;
    return (
      <T x={CX} y={CY} size={92} weight={700} color={col_} o={fillIn(c.f, 3)}>
        {`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}
      </T>
    );
  };
  return {w: 600, h: 600, layout: 'side', anchors, C: C_, Html: H_};
};

export default {cpr, timer} as Record<string, ArtFactory>;
