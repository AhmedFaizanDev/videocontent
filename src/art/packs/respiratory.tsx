/**
 * Domain pack: breathing and gas exchange.
 *
 *   lungs     airway and lungs over the diaphragm, breathing. anchors: trachea bronchi lungs
 *             diaphragm alveoli · events: inhale (diaphragm contracts and flattens, lungs
 *             expand, air flows in) exhale (diaphragm relaxes and domes, air flows out)
 *   alveolus  one air sac wrapped by a capillary: red cells arrive blue and leave red.
 *             anchors: alveolus capillary wall rbc · events: oxygen (O₂ crosses into the
 *             blood) co2 (CO₂ crosses out into the air sac)
 */
import React from 'react';
import {fonts} from '../../theme';
import {E, clamp01, hash, mix, tw} from '../../motion';
import {draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';
import {Form, Ping} from './circulation';

type P = [number, number];
const C = {
  lung: '#F9A8B8',
  lungDark: '#C85A74',
  lungDeep: '#E27D95',
  airway: '#FBD5DC',
  airwayDark: '#C85A74',
  ring: '#F3B6C2',
  diaph: '#E8835F',
  diaphDark: '#B4532F',
  o2: '#0EA5E9',
  o2Dark: '#0369A1',
  co2: '#8B8FA8',
  co2Dark: '#4B4F66',
  blue: '#5B7CF0',
  red: '#E5484D',
  sac: '#FDE2E7',
  sacDark: '#D0607A',
  rib: '#E6E2EE',
};

/** O₂: two joined atoms. CO₂: carbon between two oxygens. */
const O2: React.FC<{x: number; y: number; o: number}> = ({x, y, o}) =>
  o <= 0.01 ? null : (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      <circle cx={-8} r={10} fill={C.o2} stroke={C.o2Dark} strokeWidth={2} />
      <circle cx={8} r={10} fill={C.o2} stroke={C.o2Dark} strokeWidth={2} />
    </g>
  );
const CO2: React.FC<{x: number; y: number; o: number}> = ({x, y, o}) =>
  o <= 0.01 ? null : (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      <circle cx={-15} r={8} fill={C.o2} stroke={C.o2Dark} strokeWidth={2} />
      <circle cx={15} r={8} fill={C.o2} stroke={C.o2Dark} strokeWidth={2} />
      <circle r={10} fill={C.co2} stroke={C.co2Dark} strokeWidth={2} />
    </g>
  );

/* ================================================================ lungs */
const LUNG_R = 'M455 250 C 400 220 330 190 280 220 C 225 255 205 360 200 450 C 196 520 220 575 290 572 C 360 569 420 560 462 545 C 480 470 478 340 455 250 Z';
const LUNG_L = 'M545 250 C 600 220 670 190 720 220 C 775 255 795 360 800 450 C 804 520 780 575 710 572 C 650 569 600 560 560 548 C 590 520 600 480 570 450 C 548 420 548 330 545 250 Z';

const lungs: ArtFactory = () => {
  const anchors: Record<string, P> = {trachea: [500, 120], bronchi: [455, 262], lungs: [300, 400], diaphragm: [500, 600], alveoli: [700, 480], inhale: [500, 40], exhale: [500, 40]};
  const PERIOD = 150;
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const inA = c.at('inhale');
    const exA = c.at('exhale');
    // breath: 0 = relaxed (end of exhale), 1 = full inhale
    let breath = 0.15 + 0.15 * Math.sin(f / 30); // quiet breathing before anything is named
    let dir = 0; // +1 air in, -1 air out
    if (inA != null && f >= inA && (exA == null || f < exA)) {
      breath = E.inOut(clamp01((f - inA) / 60));
      dir = f - inA < 70 ? 1 : 0;
    }
    if (exA != null && f >= exA) {
      const since = f - exA;
      if (since < 70) (breath = 1 - E.inOut(clamp01(since / 60))), (dir = -1);
      else {
        // then keep breathing: full cycles
        const u = ((since - 70) % PERIOD) / PERIOD;
        breath = u < 0.45 ? E.inOut(u / 0.45) : u < 0.5 ? 1 : u < 0.95 ? 1 - E.inOut((u - 0.5) / 0.45) : 0;
        dir = u < 0.45 ? 1 : u >= 0.5 && u < 0.95 ? -1 : 0;
      }
    }
    const sy = 1 + 0.07 * breath;
    const sx = 1 + 0.035 * breath;
    const apex = mix(582, 618, breath);
    const ctrl = 2 * apex - 652;
    const air = Array.from({length: 12}, (_, j) => {
      if (dir === 0) return null;
      const u = (((f * 0.018 + j / 12) % 1) + 1) % 1;
      const k = dir > 0 ? u : 1 - u;
      const side = j % 2 ? 1 : -1;
      const pts: P[] = [
        [500, 20],
        [500, 230],
        [500 + side * 70, 300],
        [500 + side * (150 + hash(j) * 60), 380 + hash(j * 5) * 120],
      ];
      const seg = Math.min(2, Math.floor(k * 3));
      const v = k * 3 - seg;
      const x = mix(pts[seg][0], pts[seg + 1][0], v);
      const y = mix(pts[seg][1], pts[seg + 1][1], v);
      const o = Math.min(1, u * 8, (1 - u) * 8);
      return dir > 0 ? <O2 key={j} x={x} y={y} o={o} /> : <CO2 key={j} x={x} y={y} o={o} />;
    });
    return (
      <g>
        {/* ribs, faint, behind */}
        {[230, 300, 370, 440, 510].map((y, k) => (
          <g key={k} stroke={C.rib} strokeWidth={14} fill="none" strokeLinecap="round" opacity={fillIn(f, 0)}>
            <path d={`M470 ${y - 30} C 380 ${y - 60} 220 ${y - 40} 170 ${y + 40}`} />
            <path d={`M530 ${y - 30} C 620 ${y - 60} 780 ${y - 40} 830 ${y + 40}`} />
          </g>
        ))}
        {/* lungs expand with the breath (downward and outward, as the diaphragm drops) */}
        <g transform={`translate(500 230) scale(${sx} ${sy}) translate(-500 -230)`}>
          <Form d={LUNG_R} fill={C.lung} stroke={C.lungDark} f={f} i={1} />
          <Form d={LUNG_L} fill={C.lung} stroke={C.lungDark} f={f} i={1} />
          <g stroke={C.lungDeep} strokeWidth={5} fill="none" strokeLinecap="round" opacity={fillIn(f, 2)}>
            <path d="M440 290 C 400 320 360 360 330 430 M 400 330 C 360 350 320 360 280 380 M 360 400 C 330 450 300 480 280 520 M 380 390 C 400 440 400 490 410 530" />
            <path d="M560 290 C 600 320 640 360 670 430 M 600 330 C 640 350 680 360 720 380 M 640 400 C 670 450 700 480 720 520 M 620 390 C 610 440 600 480 596 520" />
          </g>
          {/* alveoli: a grape-cluster close-up */}
          <g opacity={fillIn(f, 3)}>
            <circle cx={700} cy={480} r={46} fill="#fff" stroke={C.lungDark} strokeWidth={3} />
            {[
              [-14, -12],
              [12, -14],
              [-18, 12],
              [8, 10],
              [24, 0],
              [-2, -2],
            ].map(([dx, dy], k) => (
              <circle key={k} cx={700 + dx} cy={480 + dy} r={12} fill={C.sac} stroke={C.sacDark} strokeWidth={2} />
            ))}
          </g>
        </g>
        {/* airway: trachea with cartilage rings, then the two main bronchi */}
        <path d="M500 230 C 480 250 470 262 452 272 M 500 230 C 520 250 530 262 548 272" stroke={C.airwayDark} strokeWidth={36} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 0)} />
        <path d="M500 230 C 480 250 470 262 452 272 M 500 230 C 520 250 530 262 548 272" stroke={C.airway} strokeWidth={26} fill="none" strokeLinecap="round" opacity={fillIn(f, 0)} />
        <rect x={478} y={14} width={44} height={222} rx={16} fill={C.airway} stroke={C.airwayDark} strokeWidth={4} opacity={fillIn(f, 0)} />
        {Array.from({length: 7}, (_, k) => (
          <path key={k} d={`M481 ${40 + k * 28} Q 500 ${48 + k * 28} 519 ${40 + k * 28}`} stroke={C.ring} strokeWidth={7} fill="none" strokeLinecap="round" opacity={fillIn(f, 0)} />
        ))}
        {/* diaphragm */}
        <path d={`M150 652 Q 500 ${ctrl} 850 652`} stroke={C.diaph} strokeWidth={26} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 2)} />
        <path d={`M150 652 Q 500 ${ctrl} 850 652`} stroke={C.diaphDark} strokeWidth={3} fill="none" transform="translate(0 13)" opacity={fillIn(f, 2)} />
        {air}
        {/* movement arrows on the diaphragm while it works */}
        {dir !== 0 && (inA != null || exA != null) ? (
          <g fill={dir > 0 ? C.o2 : C.co2} opacity={0.9}>
            {[330, 500, 670].map((x) => (
              <path key={x} d={dir > 0 ? `M${x - 16} ${apex + 30} h32 l-16 26 z` : `M${x - 16} ${apex + 56} h32 l-16 -26 z`} />
            ))}
          </g>
        ) : null}
        <Ping x={500} y={40} r={34} f={f} at={inA} color={C.o2} />
        <Ping x={500} y={40} r={34} f={f} at={exA} color={C.co2} />
      </g>
    );
  };
  return {w: 1000, h: 690, layout: 'side', lean: 0.02, anchors, C: C_};
};

/* ================================================================ alveolus */
const SAC: [number, number, number][] = [
  [330, 230, 92],
  [455, 175, 92],
  [570, 240, 88],
  [520, 350, 96],
  [380, 350, 96],
];
const CAP = 'M40 470 C 200 470 250 540 420 540 C 590 540 640 470 960 470';

const alveolus: ArtFactory = () => {
  const anchors: Record<string, P> = {alveolus: [420, 230], capillary: [760, 490], wall: [420, 470], rbc: [200, 488], oxygen: [380, 360], co2: [470, 360]};
  const cap = (u: number): P => {
    // cubic segments of CAP, sampled
    const segs: [P, P, P, P][] = [
      [[40, 470], [200, 470], [250, 540], [420, 540]],
      [[420, 540], [590, 540], [640, 470], [960, 470]],
    ];
    const s = u < 0.5 ? segs[0] : segs[1];
    const t = u < 0.5 ? u * 2 : (u - 0.5) * 2;
    const b = (a: number, b_: number, c_: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b_ + 3 * (1 - t) * t * t * c_ + t ** 3 * d;
    return [b(s[0][0], s[1][0], s[2][0], s[3][0]), b(s[0][1], s[1][1], s[2][1], s[3][1])];
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const oA = c.at('oxygen');
    const cA = c.at('co2');
    const exchanging = oA != null || cA != null;
    const flowO = fillIn(f, 2);
    const cells = Array.from({length: 9}, (_, j) => {
      const u = (((f * 0.0035 + j / 9) % 1) + 1) % 1;
      const [x, y] = cap(u);
      // oxygenated once past the air sac (only after exchange is shown)
      const ox = exchanging ? clamp01((x - 330) / 180) : 0;
      const col = ox > 0.5 ? C.red : C.blue;
      return (
        <g key={j} opacity={flowO * Math.min(1, u * 10, (1 - u) * 10)} transform={`translate(${x} ${y})`}>
          <ellipse rx={22} ry={15} fill={col} opacity={0.35 + 0.65} />
          <ellipse rx={10} ry={6} fill="#fff" opacity={0.3} />
        </g>
      );
    });
    const mols = (kind: 'o2' | 'co2', start: number | null) =>
      start == null || f < start
        ? null
        : Array.from({length: 6}, (_, j) => {
            const u = (((f - start) * 0.012 + j / 6) % 1) * 1;
            const x0 = 300 + j * 42;
            const yA = 250 + hash(j * 3) * 80; // inside the sac
            const yB = 520; // in the capillary
            const [ya, yb] = kind === 'o2' ? [yA, yB] : [yB, yA];
            const y = mix(ya, yb, E.inOut(u));
            const x = x0 + Math.sin(u * Math.PI * 2 + j) * 10;
            const o = tw(f, start + j * 4, 10) * Math.min(1, u * 6, (1 - u) * 6);
            return kind === 'o2' ? <O2 key={j} x={x} y={y} o={o} /> : <CO2 key={j} x={x + 20} y={y} o={o} />;
          });
    return (
      <g>
        {/* bronchiole feeding the sac */}
        <path d="M40 40 C 160 60 220 110 290 170" stroke={C.airwayDark} strokeWidth={50} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 0)} />
        <path d="M40 40 C 160 60 220 110 290 170" stroke={C.airway} strokeWidth={40} fill="none" strokeLinecap="round" opacity={fillIn(f, 0)} />
        {/* the air sac and its neighbours */}
        <g opacity={draw(f, 1)}>
          {SAC.map(([x, y, r], k) => (
            <circle key={k} cx={x} cy={y} r={r} fill="none" stroke={C.sacDark} strokeWidth={10} />
          ))}
        </g>
        <g opacity={fillIn(f, 1)}>
          {SAC.map(([x, y, r], k) => (
            <circle key={k} cx={x} cy={y} r={r} fill={C.sac} />
          ))}
          {SAC.map(([x, y, r], k) => (
            <path key={k} d={`M${x - r * 0.55} ${y - r * 0.2} A ${r * 0.6} ${r * 0.6} 0 0 1 ${x - r * 0.05} ${y - r * 0.62}`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
          ))}
        </g>
        {/* capillary: deoxygenated in (blue) → oxygenated out (red) */}
        <defs>
          <linearGradient id="capgrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.3" stopColor={exchanging ? '#C7D2FE' : '#C7D2FE'} />
            <stop offset="0.62" stopColor={exchanging ? '#FECDD3' : '#C7D2FE'} />
          </linearGradient>
        </defs>
        <path d={CAP} stroke={exchanging ? '#8A9BE8' : '#8A9BE8'} strokeWidth={96} fill="none" strokeLinecap="round" opacity={fillIn(f, 2)} />
        <path d={CAP} stroke="url(#capgrad)" strokeWidth={84} fill="none" strokeLinecap="round" opacity={fillIn(f, 2)} />
        <path d={CAP} stroke={C.sacDark} strokeWidth={3} fill="none" strokeDasharray="2 10" opacity={0.4 * fillIn(f, 2)} transform="translate(0 -44)" />
        {cells}
        {mols('o2', oA)}
        {mols('co2', cA)}
        <O2 x={730} y={98} o={oA != null && f >= oA ? tw(f, oA + 6, 12) : 0} />
        <CO2 x={730} y={158} o={cA != null && f >= cA ? tw(f, cA + 6, 12) : 0} />
        <Ping x={anchors.wall[0]} y={anchors.wall[1]} r={34} f={f} at={c.at('wall')} />
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const row = (t: string, col: string, a: number | null, y: number) =>
      a == null || c.f < a ? null : (
        <div style={{position: 'absolute', left: 760, top: y, fontFamily: fonts.body, fontWeight: 700, fontSize: 34, color: col, opacity: tw(c.f, a + 6, 12)}}>
          {t}
          <span style={{fontSize: 22, position: 'relative', top: 8}}>2</span>
        </div>
      );
    return (
      <>
        {row('O', C.o2Dark, c.at('oxygen'), 70)}
        {row('CO', C.co2Dark, c.at('co2'), 130)}
      </>
    );
  };
  return {w: 1000, h: 600, layout: 'side', lean: 0.02, anchors, C: C_, Html};
};

export const RESPIRATORY: Record<string, ArtFactory> = {lungs, alveolus};
