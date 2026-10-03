/**
 * Domain pack: hand hygiene and infection prevention.
 *
 *   moments   a patient's bed seen from above inside the dashed patient zone; the five
 *             moments for hand hygiene light up where they happen as they are named.
 *             anchors: zone patient m1 m2 m3 m4 m5  (1 before touching a patient ·
 *             2 before a clean/aseptic procedure · 3 after body-fluid exposure risk ·
 *             4 after touching a patient · 5 after touching the patient's surroundings)
 *   hand      a hand (palm view) carrying germs; each rubbing step clears its area.
 *             anchors: germs palms between thumbs tips missed clean
 *             (events: palms between thumbs tips clear their areas; missed pulses the
 *             areas most often missed; clean = all germs gone)
 * Numbers are the only text inside the art; the callout column carries the words.
 */
import React from 'react';
import {fonts} from '../../theme';
import {E, clamp01, hash, mix, tw} from '../../motion';
import {draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';
import {Form, Ping} from './circulation';

type P = [number, number];
const C = {
  zone: '#ECFDF5',
  zoneDark: '#10B981',
  bed: '#E2E8F0',
  bedDark: '#64748B',
  sheet: '#EFF6FF',
  blanket: '#93C5FD',
  blanketDark: '#3B6FD8',
  skin: '#F4C7A5',
  skinDark: '#C98B63',
  hair: '#4A3426',
  pillow: '#FFFFFF',
  table: '#FCD9A8',
  tableDark: '#C98A3E',
  bag: '#FDE68A',
  bagDark: '#CA8A04',
  germA: '#22C55E',
  germB: '#A855F7',
  foam: '#E0F2FE',
  hl: '#D8148C',
  m: ['#2563EB', '#0E9F95', '#E11D48', '#7A24A1', '#F59E0B'],
};

/** A small raised hand (hygiene action) icon. */
const HandIcon: React.FC<{x: number; y: number; s?: number; col: string; o: number}> = ({x, y, s = 1, col, o}) =>
  o <= 0.01 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path
        d="M-14 22 C -22 10 -22 -2 -20 -12 L -20 -26 Q -20 -32 -15 -32 Q -10 -32 -10 -26 L -10 -14 L -9 -34 Q -9 -40 -4 -40 Q 1 -40 1 -34 L 1 -14 L 2 -36 Q 2 -42 7 -42 Q 12 -42 12 -36 L 12 -12 L 14 -28 Q 14 -33 19 -33 Q 24 -33 24 -28 L 24 6 L 30 -4 Q 34 -9 38 -5 Q 41 -2 38 3 L 26 26 Q 20 36 6 36 L -4 36 Q -10 36 -14 22 Z"
        fill="#fff"
        stroke={col}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </g>
  );

/* ================================================================ moments */
const MOM: P[] = [
  [150, 300], // 1 before touching: approaching from outside the zone
  [400, 360], // 2 before aseptic procedure: at the cannula on the arm
  [760, 430], // 3 after body-fluid exposure risk: at the drainage bag
  [880, 250], // 4 after touching the patient: leaving the zone
  [720, 160], // 5 after touching surroundings: the bedside table
];

const moments: ArtFactory = () => {
  const anchors: Record<string, P> = {zone: [230, 110], patient: [500, 230], m1: MOM[0], m2: MOM[1], m3: MOM[2], m4: MOM[3], m5: MOM[4]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const at = (a: string) => c.at(a);
    const zoneOn = at('zone') != null && f >= at('zone')!;
    return (
      <g>
        {/* the patient zone */}
        <rect x={230} y={90} width={580} height={440} rx={40} fill={C.zone} opacity={fillIn(f, 0)} />
        <rect x={230} y={90} width={580} height={440} rx={40} fill="none" stroke={C.zoneDark} strokeWidth={zoneOn ? 6 : 4} strokeDasharray="18 14" opacity={draw(f, 0)} />
        {/* bedside table (surroundings) */}
        <Form d="M670 120 H 770 Q 780 120 780 130 V 200 Q 780 210 770 210 H 670 Q 660 210 660 200 V 130 Q 660 120 670 120 Z" fill={C.table} stroke={C.tableDark} f={f} i={1} />
        <circle cx={700} cy={150} r={14} fill="#fff" stroke={C.tableDark} strokeWidth={3} opacity={fillIn(f, 2)} />
        {/* bed */}
        <Form d="M320 130 H 640 Q 660 130 660 150 V 490 Q 660 510 640 510 H 320 Q 300 510 300 490 V 150 Q 300 130 320 130 Z" fill={C.bed} stroke={C.bedDark} f={f} i={1} />
        <rect x={318} y={148} width={324} height={344} rx={16} fill={C.sheet} opacity={fillIn(f, 2)} />
        <rect x={380} y={160} width={200} height={70} rx={30} fill={C.pillow} stroke="#CBD5E1" strokeWidth={3} opacity={fillIn(f, 2)} />
        {/* patient */}
        <g opacity={fillIn(f, 3)}>
          <circle cx={480} cy={205} r={40} fill={C.skin} stroke={C.skinDark} strokeWidth={3} />
          <path d="M442 196 C 446 166 510 160 520 196 C 504 182 460 182 442 196 Z" fill={C.hair} />
          <path d="M350 270 H 610 Q 626 270 626 286 V 470 Q 626 486 610 486 H 350 Q 334 486 334 470 V 286 Q 334 270 350 270 Z" fill={C.blanket} stroke={C.blanketDark} strokeWidth={3} />
          <path d="M334 300 H 626" stroke="#fff" strokeWidth={10} opacity={0.7} />
          {/* arms resting on the blanket */}
          <rect x={352} y={300} width={40} height={130} rx={20} fill={C.skin} stroke={C.skinDark} strokeWidth={3} />
          <rect x={568} y={300} width={40} height={130} rx={20} fill={C.skin} stroke={C.skinDark} strokeWidth={3} />
          {/* cannula dressing on the arm */}
          <rect x={358} y={350} width={28} height={22} rx={5} fill="#fff" stroke={C.m[1]} strokeWidth={3} />
        </g>
        {/* drainage bag hanging off the bed frame */}
        <path d="M620 440 C 660 470 690 470 720 440" stroke={C.bagDark} strokeWidth={4} fill="none" opacity={fillIn(f, 3)} />
        <Form d="M715 420 H 785 Q 795 420 795 430 V 495 Q 795 515 775 515 H 725 Q 705 515 705 495 V 430 Q 705 420 715 420 Z" fill={C.bag} stroke={C.bagDark} f={f} i={3} />
        {/* the five moments */}
        {MOM.map(([x, y], k) => {
          const a = at(`m${k + 1}`);
          if (a == null || f < a) return null;
          const p = tw(f, a, 16, E.settle);
          const glow = ((f - a) % 50) / 50;
          const col = C.m[k];
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={46 + 22 * glow} fill="none" stroke={col} strokeWidth={4} opacity={(1 - glow) * 0.7} />
              <circle cx={x} cy={y} r={40 * p} fill={col} stroke="#fff" strokeWidth={5} />
              <HandIcon x={x + 40} y={y - 40} s={0.9} col={col} o={tw(f, a + 8, 12)} />
              {/* 1: into the zone · 4: out of the zone */}
              {k === 0 ? <path d={`M${x + 50} ${y + 40} L ${x + 120} ${y + 40}`} stroke={col} strokeWidth={6} strokeLinecap="round" markerEnd="" opacity={tw(f, a + 12, 12)} /> : null}
              {k === 0 ? <path d={`M${x + 108} ${y + 28} L ${x + 124} ${y + 40} L ${x + 108} ${y + 52}`} stroke={col} strokeWidth={6} fill="none" strokeLinecap="round" opacity={tw(f, a + 12, 12)} /> : null}
              {k === 3 ? <path d={`M${x - 130} ${y + 50} L ${x - 50} ${y + 50} M ${x - 64} ${y + 38} L ${x - 48} ${y + 50} L ${x - 64} ${y + 62}`} stroke={col} strokeWidth={6} fill="none" strokeLinecap="round" opacity={tw(f, a + 12, 12)} /> : null}
            </g>
          );
        })}
        <Ping x={anchors.patient[0]} y={anchors.patient[1] + 60} r={80} f={f} at={at('patient')} />
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => (
    <>
      {MOM.map(([x, y], k) => {
        const a = c.at(`m${k + 1}`);
        return a == null || c.f < a ? null : (
          <div key={k} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${tw(c.f, a, 16, E.settle)})`, fontFamily: fonts.body, fontWeight: 800, fontSize: 40, color: '#fff'}}>
            {k + 1}
          </div>
        );
      })}
    </>
  );
  return {w: 1000, h: 600, layout: 'side', lean: 0.02, anchors, C: C_, Html};
};

/* ================================================================ hand */
type Region = 'palms' | 'between' | 'thumbs' | 'tips';
// palm view of a right hand: thumb on the viewer's left
const FINGERS = [
  {x: 392, top: 118, w: 58}, // index
  {x: 456, top: 86, w: 60}, // middle
  {x: 522, top: 108, w: 58}, // ring
  {x: 586, top: 168, w: 52}, // little
];
const PALM = 'M380 300 Q 380 272 410 272 H 612 Q 640 272 640 300 V 470 Q 640 540 560 548 H 460 Q 380 540 380 470 Z';
const WRIST = 'M420 520 H 590 V 640 H 420 Z';
const THUMB = {cx: 362, cy: 392, w: 64, h: 196, rot: -36};

const GERMS: {x: number; y: number; r: Region}[] = [
  ...[
    [450, 330],
    [520, 360],
    [590, 330],
    [470, 420],
    [560, 430],
    [510, 480],
    [430, 480],
    [600, 480],
  ].map(([x, y]) => ({x, y, r: 'palms' as Region})),
  ...[
    [452, 266],
    [518, 262],
    [583, 270],
    [452, 236],
    [583, 240],
  ].map(([x, y]) => ({x, y, r: 'between' as Region})),
  ...[
    [300, 300],
    [322, 340],
    [290, 260],
    [345, 395],
  ].map(([x, y]) => ({x, y, r: 'thumbs' as Region})),
  ...FINGERS.map((fg) => ({x: fg.x + fg.w / 2, y: fg.top + 30, r: 'tips' as Region})),
  {x: 268, y: 228, r: 'tips'},
];

const hand: ArtFactory = () => {
  const anchors: Record<string, P> = {germs: [520, 400], palms: [510, 410], between: [518, 262], thumbs: [318, 330], tips: [486, 110], missed: [292, 240], clean: [700, 160]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const at = (a: string) => c.at(a);
    const cleanAt = at('clean');
    const cleared = (r: Region) => {
      const a = at(r);
      const t = [a, cleanAt].filter((x): x is number => x != null).sort((x, y) => x - y)[0];
      return t == null ? 0 : tw(f, t + 18, 26);
    };
    const shapes = (fill: string, stroke: string | null, sw: number) => (
      <g fill={fill} stroke={stroke ?? 'none'} strokeWidth={sw} strokeLinejoin="round">
        <path d={WRIST} />
        <path d={PALM} />
        {FINGERS.map((fg, k) => (
          <rect key={k} x={fg.x} y={fg.top} width={fg.w} height={300 - fg.top + 30} rx={fg.w / 2} />
        ))}
        <rect x={THUMB.cx - THUMB.w / 2} y={THUMB.cy - THUMB.h / 2} width={THUMB.w} height={THUMB.h} rx={THUMB.w / 2} transform={`rotate(${THUMB.rot} ${THUMB.cx} ${THUMB.cy})`} />
      </g>
    );
    const p = draw(f, 0, 30);
    const fo = fillIn(f, 0, 30);
    // the active rubbing step: foam and a circular motion over its area
    const steps: {r: Region; x: number; y: number; rx: number}[] = [
      {r: 'palms', x: 510, y: 410, rx: 110},
      {r: 'between', x: 518, y: 258, rx: 90},
      {r: 'thumbs', x: 318, y: 330, rx: 70},
      {r: 'tips', x: 486, y: 140, rx: 110},
    ];
    const active = steps.filter((s) => at(s.r) != null && f >= at(s.r)! && f < at(s.r)! + 80);
    const missedAt = at('missed');
    return (
      <g>
        {/* one silhouette: outlines of every part first, then every fill over them */}
        <g opacity={p}>{shapes('none', C.skinDark, 10)}</g>
        <g opacity={fo}>{shapes(C.skin, null, 0)}</g>
        <g opacity={0.55 * fo} stroke={C.skinDark} strokeWidth={3} fill="none" strokeLinecap="round">
          <path d="M420 330 C 470 350 540 346 610 318" />
          <path d="M410 400 C 460 380 520 390 560 420" />
          <path d="M420 300 C 400 360 400 430 440 500" />
        </g>
        {/* commonly missed areas pulse */}
        {missedAt != null && f >= missedAt ? (
          <g fill="none" stroke={C.hl} strokeWidth={6} opacity={0.5 + 0.5 * Math.sin((f - missedAt) / 5)}>
            <ellipse cx={300} cy={290} rx={62} ry={90} transform="rotate(-38 300 290)" />
            {FINGERS.map((fg, k) => (
              <ellipse key={k} cx={fg.x + fg.w / 2} cy={fg.top + 34} rx={fg.w / 2 + 8} ry={44} />
            ))}
          </g>
        ) : null}
        {/* germs */}
        {GERMS.map((g, k) => {
          const gone = cleared(g.r);
          const o = tw(f, 30 + k * 2, 12) * (1 - gone);
          if (o <= 0.01) return null;
          const rot = (k * 47 + f * 0.6) % 360;
          const wob = 1 + 0.08 * Math.sin(f / 8 + k);
          return k % 3 ? (
            <g key={k} transform={`translate(${g.x} ${g.y}) rotate(${rot}) scale(${wob * (1 - 0.5 * gone)})`} opacity={o}>
              <rect x={-14} y={-7} width={28} height={14} rx={7} fill={C.germA} stroke="#15803D" strokeWidth={2.5} />
            </g>
          ) : (
            <g key={k} transform={`translate(${g.x} ${g.y}) scale(${wob * (1 - 0.5 * gone)})`} opacity={o}>
              <circle r={11} fill={C.germB} stroke="#7E22CE" strokeWidth={2.5} />
              {[0, 60, 120, 180, 240, 300].map((d) => (
                <path key={d} d={`M${Math.cos((d * Math.PI) / 180) * 11} ${Math.sin((d * Math.PI) / 180) * 11} L ${Math.cos((d * Math.PI) / 180) * 17} ${Math.sin((d * Math.PI) / 180) * 17}`} stroke="#7E22CE" strokeWidth={2.5} strokeLinecap="round" />
              ))}
            </g>
          );
        })}
        {/* rubbing: swirl + foam over the area being cleaned */}
        {active.map((s) => {
          const t = f - at(s.r)!;
          const fade = Math.min(1, t / 8, (80 - t) / 14);
          const a0 = t * 0.18;
          return (
            <g key={s.r} opacity={fade}>
              {Array.from({length: 10}, (_, j) => {
                const a = a0 + (j / 10) * Math.PI * 2;
                return <circle key={j} cx={s.x + Math.cos(a) * s.rx * (0.5 + 0.4 * hash(j))} cy={s.y + Math.sin(a) * s.rx * 0.45 * (0.5 + 0.4 * hash(j * 3))} r={8 + 8 * hash(j * 7)} fill={C.foam} stroke="#7DD3FC" strokeWidth={2} />;
              })}
              <path d={`M${s.x - s.rx} ${s.y} A ${s.rx} ${s.rx * 0.45} 0 1 1 ${s.x + s.rx * Math.cos(0.6)} ${s.y + s.rx * 0.45 * Math.sin(0.6)}`} stroke="#0EA5E9" strokeWidth={5} fill="none" strokeLinecap="round" transform={`rotate(${(a0 * 57) % 360} ${s.x} ${s.y})`} />
            </g>
          );
        })}
        {/* clean: sparkles */}
        {cleanAt != null && f >= cleanAt + 30
          ? [
              [680, 150],
              [260, 180],
              [700, 420],
              [300, 520],
            ].map(([x, y], k) => {
              const s = 0.6 + 0.4 * Math.sin((f - cleanAt) / 6 + k);
              return <path key={k} d={`M${x} ${y - 26 * s} L ${x + 7} ${y - 7} L ${x + 26 * s} ${y} L ${x + 7} ${y + 7} L ${x} ${y + 26 * s} L ${x - 7} ${y + 7} L ${x - 26 * s} ${y} L ${x - 7} ${y - 7} Z`} fill="#FBBF24" opacity={tw(f, cleanAt + 30 + k * 5, 10)} />;
            })
          : null}
      </g>
    );
  };
  return {w: 1000, h: 640, layout: 'side', lean: 0.02, anchors, C: C_};
};

export const INFECTION: Record<string, ArtFactory> = {moments, hand};
void mix;
void clamp01;
