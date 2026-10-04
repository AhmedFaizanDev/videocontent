/**
 * Pack scope-detail: close-ups of flexible endoscope anatomy for reprocessing lessons.
 * Shaded to match the imported Servier endoscope (soft gradients + highlight streaks on black
 * plastic, grey plastic and steel; thin same-hue outlines).
 *   channelCutaway   insertion-tube segment: cross-section face (sheath, suction/biopsy, air and
 *                    water channels, light guides, image bundle, angulation wires) + a longitudinal
 *                    cut of the suction channel. events: biofilm (a microbial mat grows on the
 *                    wall), brush (a twisted-wire brush travels through and scrubs it off).
 *   duodenoscopeTip  side-viewing distal tip seen onto its working face: light guide windows,
 *                    flush objective lens, and the elevator recess with the channel outlet and the
 *                    elevator lever, all side by side on that face. event: raise (the lever lifts).
 */
import React from 'react';
import {E, hash, mix, tw} from '../../motion';
import {circ, draw, fillIn, rect, type ArtCtx, type ArtFactory} from '../kit';
import {Ping} from './circulation';

type P = [number, number];
type Mat = {hi: string; mid: string; lo: string; s: string};
const BLACK: Mat = {hi: '#7A7886', mid: '#3E3C48', lo: '#1F1E26', s: '#16151C'};
const GREY: Mat = {hi: '#D9D7E0', mid: '#A9A6B6', lo: '#7D7A8C', s: '#5E5B6E'};
const STEEL: Mat = {hi: '#FFFFFF', mid: '#E2E1E8', lo: '#B4B2C0', s: '#8E88A3'};
const PINK: Mat = {hi: '#FFF3F6', mid: '#F7C9D6', lo: '#E59AB1', s: '#C0587A'};
const SUCTION_S = '#C0587A';
const AIR = {f: '#DCEBFF', s: '#2563EB'};
const WATER = {f: '#D3F1EE', s: '#0E9F95'};
const LIGHT = {f: '#FCE7A6', s: '#C9971F'};
const BIO = {f: '#8DB85A', hi: '#B5D67E', s: '#4F7A26', dot: '#3D6519'};
const BRASS = {f: '#E8C266', s: '#9C7418'};

/** Gradient defs for a material, vertical (cylinder lit from above). */
const Grad: React.FC<{id: string; m: Mat; dir?: 'v' | 'r'}> = ({id, m, dir = 'v'}) =>
  dir === 'r' ? (
    <radialGradient id={id} cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stopColor={m.hi} />
      <stop offset="0.55" stopColor={m.mid} />
      <stop offset="1" stopColor={m.lo} />
    </radialGradient>
  ) : (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={m.mid} />
      <stop offset="0.28" stopColor={m.hi} />
      <stop offset="0.55" stopColor={m.mid} />
      <stop offset="1" stopColor={m.lo} />
    </linearGradient>
  );

/** Shaded form: thin same-hue outline draws on, gradient fill follows. */
const S: React.FC<{d: string; fill: string; stroke: string; f: number; i: number; sw?: number}> = ({d, fill, stroke, f, i, sw = 2.5}) => (
  <g>
    <path d={d} fill={fill} opacity={fillIn(f, i)} />
    <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, i)} />
  </g>
);
/** Soft highlight streak (the Servier glint). */
const Glint: React.FC<{d: string; f: number; at?: number; w?: number}> = ({d, f, at = 60, w = 7}) => (
  <path d={d} stroke="#FFFFFF" strokeWidth={w} strokeLinecap="round" fill="none" opacity={0.55 * tw(f, at, 20)} />
);

/* ================================================================ channelCutaway (1000 × 620) */
const channelCutaway: ArtFactory = () => {
  const CX = 220, CY = 310, R = 180;
  const SUC: P = [190, 250];
  const AIRC: P = [320, 300];
  const WAT: P = [215, 410];
  const X0 = 470, X1 = 960; // longitudinal channel
  const LT = 236, LB = 384; // lumen top / bottom
  const WALL = 24;
  const anchors: Record<string, P> = {
    sheath: [CX + R * 0.7, CY - R * 0.7], suctionChannel: SUC, airChannel: AIRC, waterChannel: WAT,
    channelWall: [800, LT - WALL / 2], biofilm: [700, LB - 12], brush: [560, 310], brushHead: [520, 310],
  };
  const C: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const bA = c.at('biofilm');
    const grow = bA != null && f >= bA ? tw(f, bA, 50, E.inOut) : 0;
    const brA = c.at('brush');
    const travel = brA != null && f >= brA ? tw(f, brA, 120, E.inOut) : 0;
    const hx = mix(430, 900, travel); // brush head centre
    const scrub = brA != null && f >= brA && travel < 1 ? Math.sin(f * 0.9) * 4 : 0;
    const th = 24 * grow;
    // biofilm: a lumpy mat on both walls, removed where the brush has passed
    const film = (top: boolean) => {
      const y0 = top ? LT : LB;
      const s = top ? 1 : -1;
      let d = `M${X0 + 10} ${y0}`;
      for (let x = X0 + 10; x <= X1; x += 14) {
        const h = th * (0.65 + 0.5 * hash(x + (top ? 0 : 7)));
        d += ` Q${x + 7} ${y0 + s * (h + 6 * grow)} ${x + 14} ${y0 + s * h * 0.8}`;
      }
      return d + ` L${X1} ${y0} Z`;
    };
    const cleared = travel > 0 ? hx + 34 : X0;
    // twisted wire: two strands crossing along the core
    const twist = (x0: number, x1: number, ph: number) => {
      let d = `M${x0} ${310 + 5 * Math.sin(ph)}`;
      for (let x = x0 + 6; x <= x1; x += 6) d += ` L${x} ${310 + 5 * Math.sin((x - x0) / 9 + ph)}`;
      return d;
    };
    return (
      <g>
        <defs>
          <Grad id="sd-black" m={BLACK} dir="r" />
          <Grad id="sd-blackv" m={BLACK} />
          <Grad id="sd-grey" m={GREY} dir="r" />
          <Grad id="sd-steel" m={STEEL} dir="r" />
          <Grad id="sd-pinkv" m={PINK} />
          <Grad id="sd-pink" m={PINK} dir="r" />
          <clipPath id="sd-film"><rect x={cleared} y={LT - 2} width={X1 - cleared + 2} height={LB - LT + 4} /></clipPath>
          <clipPath id="sd-lumen"><rect x={X0} y={LT} width={X1 - X0} height={LB - LT} /></clipPath>
        </defs>
        {/* projection guides from the face to the cut */}
        <path d={`M${SUC[0]} ${SUC[1] - 62} L${X0} ${LT - WALL - 30} M${SUC[0]} ${SUC[1] + 62} L${X0} ${LB + WALL + 30}`} stroke={STEEL.s} strokeWidth={4} strokeDasharray="12 9" opacity={0.9 * tw(f, 40, 20)} />
        {/* cross-section face */}
        <S d={circ(CX, CY, R)} fill="url(#sd-black)" stroke={BLACK.s} f={f} i={0} sw={3} />
        <S d={circ(CX, CY, R - 22)} fill="url(#sd-grey)" stroke={GREY.s} f={f} i={1} />
        {[[110, 340], [140, 395]].map(([x, y], i) => <S key={`l${i}`} d={circ(x, y, 24)} fill={LIGHT.f} stroke={LIGHT.s} f={f} i={2} />)}
        {[0, 90, 180, 270].map((a, i) => {
          const r = R - 40, t = ((a + 45) * Math.PI) / 180;
          return <S key={`w${i}`} d={circ(CX + r * Math.cos(t), CY + r * Math.sin(t), 13)} fill="url(#sd-steel)" stroke={GREY.s} sw={3} f={f} i={3} />;
        })}
        <S d={circ(SUC[0], SUC[1], 62)} fill="url(#sd-pink)" stroke={SUCTION_S} f={f} i={3} sw={4} />
        <S d={circ(AIRC[0], AIRC[1], 22)} fill={AIR.f} stroke={AIR.s} f={f} i={4} sw={3.5} />
        <S d={circ(WAT[0], WAT[1], 22)} fill={WATER.f} stroke={WATER.s} f={f} i={4} sw={3.5} />
        <Glint d={`M${CX - 120} ${CY - 90} A150 150 0 0 1 ${CX - 40} ${CY - 152}`} f={f} w={8} />
        {/* biofilm also seen as a ring inside the suction channel */}
        {grow > 0 && <circle cx={SUC[0]} cy={SUC[1]} r={62 - 3 - 10 * grow} fill="none" stroke={BIO.f} strokeWidth={20 * grow} opacity={travel > 0.95 ? 1 - tw(f, (brA ?? 0) + 120, 20) : 1} />}
        {/* longitudinal cut: sheath strips, channel walls, lumen */}
        <S d={rect(X0, LT - WALL - 30, X1 - X0, 30, 4)} fill="url(#sd-blackv)" stroke={BLACK.s} f={f} i={5} />
        <S d={rect(X0, LB + WALL, X1 - X0, 30, 4)} fill="url(#sd-blackv)" stroke={BLACK.s} f={f} i={5} />
        <Glint d={`M${X0 + 20} ${LT - WALL - 20} L${X1 - 20} ${LT - WALL - 20}`} f={f} w={4} />
        <Glint d={`M${X0 + 20} ${LB + WALL + 10} L${X1 - 20} ${LB + WALL + 10}`} f={f} w={4} />
        <S d={rect(X0, LT, X1 - X0, LB - LT)} fill="#FFF7F9" stroke={SUCTION_S} f={f} i={6} sw={2} />
        <S d={rect(X0, LT - WALL, X1 - X0, WALL)} fill="url(#sd-pinkv)" stroke={SUCTION_S} f={f} i={6} />
        <S d={rect(X0, LB, X1 - X0, WALL)} fill="url(#sd-pinkv)" stroke={SUCTION_S} f={f} i={6} />
        {grow > 0 && (
          <g clipPath="url(#sd-film)">
            {[true, false].map((t) => <path key={String(t)} d={film(t)} fill={BIO.f} stroke={BIO.s} strokeWidth={2.5} strokeLinejoin="round" />)}
            {/* mat texture: embedded cells (rods and cocci) in the matrix */}
            {Array.from({length: 60}, (_, i) => {
              const top = i % 2 === 0;
              const x = X0 + 18 + (i >> 1) * 16 + 6 * hash(i);
              const d = th * (0.2 + 0.5 * hash(i + 40));
              const y = top ? LT + d : LB - d;
              return i % 3 === 0 ? (
                <circle key={i} cx={x} cy={y} r={3.2 * grow} fill={BIO.dot} opacity={0.75} />
              ) : (
                <rect key={i} x={x - 5} y={y - 2} width={10 * grow} height={4} rx={2} fill={i % 3 === 1 ? BIO.dot : BIO.hi} opacity={0.8} transform={`rotate(${(hash(i + 9) - 0.5) * 70} ${x} ${y})`} />
              );
            })}
          </g>
        )}
        {/* loosened debris behind the brush */}
        {travel > 0 && grow > 0 && Array.from({length: 10}, (_, i) => {
          const x = hx - 56 - i * 30 - 10 * hash(i);
          if (x < X0 + 10) return null;
          return <circle key={i} cx={x} cy={310 + (hash(i + 3) - 0.5) * 110} r={5} fill={BIO.f} stroke={BIO.s} strokeWidth={2} opacity={0.8 * (1 - tw(f, (brA ?? 0) + 40 + i * 8, 60))} />;
        })}
        {/* brush: twisted-wire shaft enters from the left; head of radial bristles fills the lumen */}
        <g clipPath="url(#sd-lumen)" opacity={brA != null && f >= brA ? tw(f, brA, 15) : 0}>
          <path d={twist(X0 - 10, hx - 40, 0)} stroke={STEEL.s} strokeWidth={4} fill="none" />
          <path d={twist(X0 - 10, hx - 40, Math.PI)} stroke={STEEL.lo} strokeWidth={4} fill="none" />
          <g transform={`translate(${hx + scrub} 0)`}>
            {Array.from({length: 15}, (_, i) => {
              const x = -42 + i * 6;
              const tilt = (hash(i + 2) - 0.5) * 10;
              return (
                <g key={i}>
                  <path d={`M${x} 310 L${x + tilt - 4} ${LT + 4}`} stroke={BRASS.f} strokeWidth={3} strokeLinecap="round" />
                  <path d={`M${x} 310 L${x - tilt - 4} ${LB - 4}`} stroke={BRASS.f} strokeWidth={3} strokeLinecap="round" />
                </g>
              );
            })}
            <path d={`M-46 ${LT + 5} L42 ${LT + 5} M-46 ${LB - 5} L42 ${LB - 5}`} stroke={BRASS.s} strokeWidth={3} opacity={0.5} />
            <path d={twist(-50, 50, 0)} stroke={STEEL.s} strokeWidth={5} fill="none" />
            <path d={twist(-50, 50, Math.PI)} stroke={STEEL.lo} strokeWidth={5} fill="none" />
            <circle cx={50} cy={310} r={6} fill={STEEL.mid} stroke={STEEL.s} strokeWidth={2} />
          </g>
        </g>
        <Ping x={hx} y={310} r={70} f={f} at={brA} color={BRASS.s} />
        <Ping x={700} y={LB - 12} r={40} f={f} at={bA} color={BIO.s} />
      </g>
    );
  };
  return {w: 1000, h: 620, layout: 'side', anchors, C};
};

/* ================================================================ duodenoscopeTip (1000 × 620) */
// Viewed looking onto the working (side) face, slightly from distal-above: the cylinder's
// face is the broad band, its far edge visible as a thin rim. Lever lifts toward the viewer
// (drawn as rising above the face, foreshortened, with its shadow left in the recess).
const duodenoscopeTip: ArtFactory = () => {
  const T0 = 120, B0 = 500; // cylinder silhouette top / bottom
  const RX = 940; // distal end
  const REC = {x: 640, y: 250, w: 240, h: 120}; // elevator recess opening
  const OUT: P = [672, 310]; // channel outlet (proximal end of the recess)
  const PIV: P = [850, 310]; // elevator pivot (distal end)
  const anchors: Record<string, P> = {
    distalTip: [910, 440], lens: [520, 250], channelOutlet: [660, 336], elevator: [750, 310], elevatorRecess: [740, REC.y + 108], raise: [810, 225],
  };
  const C: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const rA = c.at('raise');
    const up = rA != null && f >= rA ? tw(f, rA, 40, E.inOut) : 0;
    // lever: from pivot toward the outlet; raising swings its free end up (toward the viewer)
    const L = 140;
    const tip: P = [PIV[0] - L * mix(1, 0.62, up), PIV[1] - mix(0, 110, up)];
    const hw = 20; // half width across the recess
    const lever = `M${PIV[0]} ${PIV[1] - hw} L${tip[0] + 10} ${tip[1] - hw * 0.9} C${tip[0] - 8} ${tip[1] - hw * 0.9} ${tip[0] - 8} ${tip[1] + hw * 0.9} ${tip[0] + 10} ${tip[1] + hw * 0.9} L${PIV[0]} ${PIV[1] + hw} Z`;
    const groove = `M${PIV[0] - 14} ${PIV[1]} L${tip[0] + 18} ${tip[1]}`;
    const thick = up * 16; // the lever's edge shows as it lifts
    const body = `M40 ${T0} L${RX - 150} ${T0} C${RX - 40} ${T0} ${RX} ${T0 + 80} ${RX} ${(T0 + B0) / 2} C${RX} ${B0 - 80} ${RX - 40} ${B0} ${RX - 150} ${B0} L40 ${B0} Z`;
    return (
      <g>
        <defs>
          <Grad id="dt-black" m={BLACK} />
          <Grad id="dt-steel" m={STEEL} />
          <radialGradient id="dt-lens" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#6E9BEF" />
            <stop offset="0.6" stopColor="#1E3F8F" />
            <stop offset="1" stopColor="#0C1E4A" />
          </radialGradient>
          <linearGradient id="dt-recess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1F1D29" />
            <stop offset="1" stopColor="#4A4660" />
          </linearGradient>
          <linearGradient id="dt-lever" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9DDB8" />
            <stop offset="0.5" stopColor="#C9AE6A" />
            <stop offset="1" stopColor="#8F7535" />
          </linearGradient>
        </defs>
        {/* distal cap (steel-grey plastic) with the bending section's black sheath behind */}
        <S d={body} fill="url(#dt-steel)" stroke={STEEL.s} f={f} i={0} sw={3} />
        <S d={rect(40, T0, 380, B0 - T0, 6)} fill="url(#dt-black)" stroke={BLACK.s} f={f} i={1} sw={3} />
        {[110, 180, 250, 320, 390].map((x, i) => (
          <path key={i} d={`M${x} ${T0 + 4} C${x - 10} ${T0 + 120} ${x - 10} ${B0 - 120} ${x} ${B0 - 4}`} stroke={BLACK.s} strokeWidth={1.5} fill="none" opacity={tw(f, 30 + i * 3, 12)} />
        ))}
        <Glint d={`M60 ${T0 + 60} L400 ${T0 + 60}`} f={f} w={10} />
        <Glint d={`M440 ${T0 + 60} L${RX - 160} ${T0 + 60}`} f={f} w={8} />
        <S d={rect(420, T0, 16, B0 - T0, 3)} fill={GREY.mid} stroke={GREY.s} f={f} i={2} />
        {/* working face: light guide windows flank the flush objective lens */}
        <S d={rect(490, 168, 60, 34, 12)} fill={LIGHT.f} stroke={LIGHT.s} f={f} i={3} />
        <S d={rect(490, 418, 60, 34, 12)} fill={LIGHT.f} stroke={LIGHT.s} f={f} i={3} />
        <S d={circ(520, 310, 66)} fill={GREY.mid} stroke={GREY.s} f={f} i={3} />
        <S d={circ(520, 310, 50)} fill="url(#dt-lens)" stroke="#0C1E4A" f={f} i={4} />
        <path d="M494 286 C502 272 516 266 530 266" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.7 * tw(f, 60, 15)} />
        {/* elevator recess, with the accessory channel outlet at its proximal end */}
        <S d={rect(REC.x, REC.y, REC.w, REC.h, 28)} fill="url(#dt-recess)" stroke="#2C2840" f={f} i={5} sw={3} />
        <S d={`M${OUT[0] - 22} ${OUT[1]} a18 30 0 1 0 36 0 a18 30 0 1 0 -36 0Z`} fill="#120F18" stroke={PINK.s} f={f} i={6} sw={4} />
        {/* the lever: shadow left on the recess floor, edge thickness, top face with its guide groove */}
        <path d={`M${PIV[0]} ${PIV[1] - hw} L${PIV[0] - L + 10} ${PIV[1] - hw} L${PIV[0] - L + 10} ${PIV[1] + hw} L${PIV[0]} ${PIV[1] + hw} Z`} fill="#000000" opacity={0.35 * up} />
        <path d={`M${PIV[0]} ${PIV[1] - hw - 6} L${PIV[0] - L + 4} ${PIV[1] - hw - 6} L${PIV[0] - L + 4} ${PIV[1] + hw + 6} L${PIV[0]} ${PIV[1] + hw + 6} Z`} fill="#0B0A10" opacity={fillIn(f, 6)} />
        <g opacity={fillIn(f, 7)}>
          <path d={lever} transform={`translate(0 ${thick})`} fill="#7A6430" stroke="#5A4718" strokeWidth={2.5} />
          <path d={lever} fill="url(#dt-lever)" stroke="#5A4718" strokeWidth={2.5} strokeLinejoin="round" />
          <path d={groove} stroke="#5A4718" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
        </g>
        <S d={circ(PIV[0], PIV[1], 13)} fill="url(#dt-steel)" stroke={STEEL.s} f={f} i={8} />
        <circle cx={PIV[0]} cy={PIV[1]} r={5} fill={STEEL.s} opacity={fillIn(f, 8)} />
        <Ping x={780} y={280} r={70} f={f} at={rA} color={BRASS.s} />
      </g>
    );
  };
  return {w: 1000, h: 620, layout: 'side', anchors, C};
};

export default {channelCutaway, duodenoscopeTip} as Record<string, ArtFactory>;
