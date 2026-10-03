/**
 * Pack cardio: cardiology plates in the house textbook ink style (src/art/ink.tsx).
 *   heartSection  the heart in frontal section, as a textbook plate draws it: the cut
 *                 myocardium (contour-hatched, the left ventricular wall thicker than the right),
 *                 the four chambers opened, the tricuspid and mitral valves with chordae
 *                 tendineae and papillary muscles, the interventricular septum, superior and
 *                 inferior venae cavae, the aortic arch with its three branches, the pulmonary
 *                 trunk and arteries, the pulmonary veins. Beats gently by default (atria, then
 *                 ventricles; the atrioventricular valves close in systole).
 *                 events: flowRight / flowLeft (inked arrows trace deoxygenated blood through the
 *                 right heart to the lungs / oxygenated blood through the left heart to the
 *                 aorta), conduction (an impulse runs from the sinoatrial node to the
 *                 atrioventricular node, the bundle of His and its branches), ra rv la lv
 *                 (that chamber is picked out), vf (fibrillation: the ventricles quiver, no
 *                 coordinated contraction, no flow), stop (motionless), compress (squeezed at
 *                 ~110/min; flow pushed out), rosc (the beat returns). data {state?, still?}.
 */
import React from 'react';
import {E, clamp01, mix, tw} from '../../motion';
import {type ArtCtx, type ArtFactory} from '../kit';
import {ContourHatch, InkArrow, PLATE, Tube, along, type Bez, type P} from '../ink';

/* ------------------------------------------------------------------ geometry (1000 × 1100) */
const OUTER =
  'M205 430 C150 500 135 620 170 720 C205 820 330 930 520 1010 C610 1048 690 1060 735 1040 C800 1000 855 880 872 740 C885 620 862 510 812 450 C760 410 690 400 630 412 C560 425 470 425 400 410 C320 395 250 400 205 430 Z';
const RA = 'M224 480 C198 540 200 616 232 676 C262 708 326 708 356 688 C368 630 366 548 348 498 C318 470 262 464 224 480 Z';
const RV = 'M286 762 C346 722 470 702 548 714 C574 800 578 900 562 962 C522 986 458 976 398 942 C338 902 298 852 286 806 C282 790 282 774 286 762 Z';
const LA = 'M590 470 C650 440 760 446 802 500 C822 560 792 622 732 642 C680 654 612 642 587 602 C566 560 566 502 590 470 Z';
const LV = 'M622 676 C672 662 742 662 782 680 C800 770 790 880 732 984 C714 1006 692 1006 680 990 C642 920 618 800 622 676 Z';
// the valve orifices: the open passage from each atrium into its ventricle
const TRI_ORIFICE = 'M246 676 C280 700 330 702 356 686 L360 752 C330 742 296 744 270 760 Z';
const MIT_ORIFICE = 'M604 616 C650 638 720 640 772 620 L776 690 C720 676 650 676 602 684 Z';
const CHAMBER: Record<'ra' | 'rv' | 'la' | 'lv', {d: string; c: P}> = {ra: {d: RA, c: [288, 590]}, rv: {d: RV, c: [440, 840]}, la: {d: LA, c: [692, 548]}, lv: {d: LV, c: [702, 830]}};

const SVC: Bez[] = [[[270, 480], [270, 350], [270, 200], [268, 70]]];
const IVC: Bez[] = [[[262, 1088], [263, 1020], [264, 950], [266, 880]]];
const AORTA: Bez[] = [
  [[450, 480], [448, 390], [452, 300], [470, 240]],
  [[470, 240], [500, 150], [620, 118], [690, 168]],
  [[690, 168], [728, 196], [744, 258], [742, 330]],
];
const BRANCHES: Bez[][] = [
  [[[505, 168], [498, 120], [484, 72], [472, 24]]],
  [[[577, 134], [579, 95], [581, 55], [583, 14]]],
  [[[641, 140], [655, 100], [668, 62], [682, 24]]],
];
const PT: Bez[] = [[[515, 486], [532, 404], [588, 346], [660, 318]]];
const LPA: Bez[] = [[[656, 320], [730, 290], [800, 282], [884, 285]]];
const RPA: Bez[] = [[[420, 380], [300, 372], [180, 368], [62, 370]]];
const RPV: Bez[] = [[[300, 520], [220, 515], [140, 512], [62, 512]]];
const LPV: Bez[][] = [[[[760, 500], [820, 495], [870, 492], [934, 490]]], [[[760, 584], [820, 584], [870, 586], [934, 588]]]];

// valve leaflets hang from the annulus; tips move between open (diastole) and closed (systole)
const TRI = {a: [[256, 712], [364, 702]] as P[], open: [[298, 800], [352, 808]] as P[], shut: [[306, 748], [326, 746]] as P[], pap: [[372, 880], [480, 892]] as P[], papBase: [[356, 932], [498, 950]] as P[]};
const MIT = {a: [[620, 650], [774, 652]] as P[], open: [[668, 744], [736, 748]] as P[], shut: [[692, 690], [710, 690]] as P[], pap: [[672, 834], [744, 840]] as P[], papBase: [[652, 904], [764, 908]] as P[]};
const TRABECULAE = ['M400 940 C440 952 490 958 530 954', 'M330 880 C346 900 364 914 384 924', 'M650 940 C668 958 688 968 708 972', 'M640 900 C660 930 684 948 716 956'];

// conduction system: sinoatrial node → atrioventricular node → bundle of His → branches
const CONDUCT: Bez[] = [
  [[300, 470], [330, 560], [400, 640], [456, 706]],
  [[456, 706], [490, 728], [530, 742], [556, 770]],
  [[556, 770], [570, 840], [590, 920], [640, 990]],
];
const RBB: Bez[] = [[[556, 770], [540, 840], [510, 900], [470, 940]]];

// blood flow routes
const FLOW_R: Bez[][] = [
  [[[270, 120], [270, 260], [272, 400], [282, 560]]], // superior vena cava → right atrium
  [[[264, 1060], [266, 960], [270, 840], [270, 700]]], // inferior vena cava → right atrium
  [[[300, 640], [330, 720], [380, 800], [430, 860]]], // right atrium → right ventricle (through the tricuspid)
  [[[470, 880], [500, 760], [512, 600], [540, 400]]], // right ventricle → pulmonary trunk
  [[[620, 340], [700, 300], [790, 284], [880, 285]]], // → left pulmonary artery, to the lungs
];
const FLOW_L: Bez[][] = [
  [[[934, 490], [880, 494], [830, 505], [760, 530]]], // pulmonary veins → left atrium
  [[[690, 590], [700, 680], [700, 780], [690, 900]]], // left atrium → left ventricle (through the mitral)
  [[[660, 930], [600, 760], [500, 560], [455, 420]]], // left ventricle → aorta
  [[[455, 400], [470, 260], [560, 150], [680, 168]]], // up the aorta, over the arch
];

const STATES = ['vf', 'stop', 'compress', 'rosc'] as const;
const BEAT = 25;
const PUSH = 16.4;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const leaflet = (a: P, tip: P, k: number, side: 1 | -1): string => {
  // a tongue from its annulus point to the free edge, bulging toward the cavity
  const b: P = [a[0] + side * 26, a[1] + 2];
  const mid: P = [(a[0] + tip[0]) / 2 - side * 14 * k, (a[1] + tip[1]) / 2];
  return `M${a[0]} ${a[1]} Q${mid[0]} ${mid[1]} ${tip[0]} ${tip[1]} Q${mid[0] + side * 26} ${mid[1] + 6} ${b[0]} ${b[1]} Z`;
};
const papillary = (base: P, tip: P) => `M${base[0] - 26} ${base[1]} C${base[0] - 18} ${base[1] - 30} ${tip[0] - 9} ${tip[1] + 18} ${tip[0]} ${tip[1]} C${tip[0] + 9} ${tip[1] + 18} ${base[0] + 18} ${base[1] - 30} ${base[0] + 26} ${base[1]} Z`;

const heartSection: ArtFactory = (data = {}) => {
  const start = (STATES as readonly string[]).includes(data.state) ? data.state : null;
  const anchors: Record<string, P> = {
    svc: [270, 250], ivc: [264, 1010], aorta: [560, 150], pt: [606, 380], lpa: [820, 286], rpa: [130, 369], pv: [884, 540],
    ra: [288, 590], rv: [440, 840], la: [692, 548], lv: [702, 830], septum: [592, 800], tricuspid: [316, 760], mitral: [692, 700], apex: [728, 1040], sa: [300, 470], av: [456, 706], wall: [830, 780],
    flowRight: [400, 760], flowLeft: [700, 700], conduction: [520, 760], vf: [560, 800], stop: [560, 800], compress: [560, 760], rosc: [560, 800],
  };
  const C: React.FC<ArtCtx> = (c0) => {
    const c: ArtCtx = start ? {...c0, at: (k: string) => c0.at(k) ?? (k === start ? -10000 : null)} : c0;
    const {f} = c;
    // the latest state event wins
    let state: {k: string; a: number} | null = null;
    for (const k of STATES) {
      const a = c.at(k);
      if (a != null && a <= f && (!state || a >= state.a)) state = {k, a};
    }
    const kind = state?.k ?? 'nsr';
    const since = state ? f - state.a : f;
    let atria = 0;
    let vent = 0;
    let jx = 0;
    let jy = 0;
    let quiver = 0;
    let output = 1;
    if (data.still) output = 1;
    else if (kind === 'nsr' || kind === 'rosc') {
      const ph = (((f / BEAT) % 1) + 1) % 1;
      atria = Math.sin(clamp01(ph / 0.15) * Math.PI);
      vent = Math.sin(clamp01((ph - 0.18) / 0.32) * Math.PI) * (kind === 'rosc' ? clamp01(since / 20) : 1);
    } else if (kind === 'vf') {
      quiver = clamp01(since / 10);
      jx = quiver * 3 * (hash(f) - 0.5) * 2;
      jy = quiver * 2.4 * (hash(f + 91) - 0.5) * 2;
      vent = quiver * 0.15 * hash(f * 3 + 7);
      output = 0;
    } else if (kind === 'stop') output = 0;
    else if (kind === 'compress') {
      const ph = ((since / PUSH) % 1 + 1) % 1;
      vent = (0.5 - 0.5 * Math.cos(2 * Math.PI * ph)) * clamp01(since / 8) * 1.2;
      output = 0.8;
    }
    const dusky = kind === 'vf' || kind === 'stop' ? clamp01(since / 30) : kind === 'rosc' ? 1 - clamp01(since / 60) : 0;
    const o = (i: number) => tw(f, 4 + i * 4, 16, E.out);
    // cavities shrink in systole: the walls thicken (that is what contraction looks like in section)
    const cav = (key: 'ra' | 'rv' | 'la' | 'lv') => {
      const s = key === 'ra' || key === 'la' ? 1 - 0.06 * atria : 1 - 0.1 * vent;
      const {c: cc} = CHAMBER[key];
      return `translate(${cc[0]} ${cc[1]}) scale(${s}) translate(${-cc[0]} ${-cc[1]})`;
    };
    const shut = clamp01(vent * 1.8); // AV valves close as the ventricles contract
    const pick = (key: string) => {
      const a = c.at(key);
      return a != null && f >= a ? tw(f, a, 14, E.out) : 0;
    };
    const flowR = c.at('flowRight');
    const flowL = c.at('flowLeft');
    const cond = c.at('conduction');
    const valve = (V: typeof TRI, key: string) => {
      const tips = V.open.map((t, i) => [mix(t[0], V.shut[i][0], shut), mix(t[1], V.shut[i][1], shut)] as P);
      return (
        <g key={key}>
          {V.pap.map((tp, i) => (
            <path key={`p${i}`} d={papillary(V.papBase[i], tp)} fill={PLATE.muscle} stroke={PLATE.ink} strokeWidth={2.5} />
          ))}
          {/* chordae tendineae: fine cords from the leaflet edges to the papillary muscles */}
          {tips.map((t, i) =>
            [-12, 0, 12].map((dx, j) => <path key={`c${i}${j}`} d={`M${t[0] + dx * 0.6} ${t[1]} L${V.pap[i][0] + dx * 0.4} ${V.pap[i][1]}`} stroke={PLATE.cream} strokeWidth={2.4} opacity={0.95} />),
          )}
          {tips.map((t, i) =>
            [-12, 0, 12].map((dx, j) => <path key={`k${i}${j}`} d={`M${t[0] + dx * 0.6} ${t[1]} L${V.pap[i][0] + dx * 0.4} ${V.pap[i][1]}`} stroke={PLATE.ink} strokeWidth={0.8} opacity={0.5} />),
          )}
          {V.a.map((a, i) => (
            <path key={`l${i}`} d={leaflet(a, tips[i], 1 - shut, i ? -1 : 1)} fill={PLATE.cream} stroke={PLATE.ink} strokeWidth={2.4} strokeLinejoin="round" />
          ))}
        </g>
      );
    };
    return (
      <g>
        <defs>
          <clipPath id="hs-wall">
            <path d={`${OUTER} ${RA} ${RV} ${LA} ${LV}`} clipRule="evenodd" />
          </clipPath>
          {(['ra', 'rv', 'la', 'lv'] as const).map((k) => (
            <clipPath key={k} id={`hs-${k}`}>
              <path d={CHAMBER[k].d} />
            </clipPath>
          ))}
        </defs>
        {/* behind the heart: pulmonary vessels, inferior vena cava, descending aorta */}
        <g opacity={o(0)}>
          <Tube segs={RPA} w={58} tone="vein" side={-1} cutEnd />
          <Tube segs={RPV} w={50} tone="artery" side={-1} cutEnd />
          {LPV.map((s, i) => (
            <Tube key={i} segs={s} w={48} tone="artery" side={1} cutEnd />
          ))}
          <Tube segs={IVC} w={92} tone="vein" side={1} cutStart />
        </g>
        <g opacity={o(1)}>
          {BRANCHES.map((s, i) => (
            <Tube key={i} segs={s} w={i ? 40 : 46} tone="artery" side={1} cutEnd swell={vent * 1.5} />
          ))}
          <Tube segs={AORTA} w={118} tone="artery" side={1} swell={vent * 4} />
          <Tube segs={SVC} w={92} tone="vein" side={-1} cutEnd />
        </g>
        {/* the heart in section */}
        <g transform={`translate(${jx} ${jy})`} opacity={o(2)}>
          <path d={OUTER} fill={PLATE.muscle} />
          <ContourHatch d={OUTER} cx={540} cy={720} clipId="hs-wall" n={16} step={0.022} o={0.3} />
          {/* the cut surface darkens toward its lower right edge, as the plate is lit from the upper left */}
          <g clipPath="url(#hs-wall)">
            <path d={OUTER} fill="none" stroke={PLATE.muscleShade} strokeWidth={70} opacity={0.55} transform="translate(-14 -10)" />
          </g>
          {/* chambers: the open cavities, darker toward their walls */}
          {(['ra', 'rv', 'la', 'lv'] as const).map((k) => (
            <g key={k} transform={cav(k)}>
              <path d={CHAMBER[k].d} fill={PLATE.cavity} />
              <g clipPath={`url(#hs-${k})`}>
                <path d={CHAMBER[k].d} fill="none" stroke={PLATE.cavityDeep} strokeWidth={34} opacity={0.6} />
                <path d={CHAMBER[k].d} fill="#203058" opacity={0.28 * dusky} />
                <path d={CHAMBER[k].d} fill={PLATE.gold} opacity={0.35 * pick(k)} />
              </g>
              <path d={CHAMBER[k].d} fill="none" stroke={pick(k) > 0 ? PLATE.gold : PLATE.ink} strokeWidth={pick(k) > 0 ? 5 : 2.6} />
            </g>
          ))}
          <path d={TRI_ORIFICE} fill={PLATE.cavity} />
          <path d={MIT_ORIFICE} fill={PLATE.cavity} />
          {TRABECULAE.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={PLATE.cavityDeep} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
          ))}
          {valve(TRI, 'tri')}
          {valve(MIT, 'mit')}
          <path d={OUTER} fill="#203058" opacity={0.18 * dusky} clipPath="url(#hs-wall)" />
          <path d={OUTER} fill="none" stroke={PLATE.ink} strokeWidth={3.4} />
          {/* fibrillation: the wall shivers in fine, chaotic ripples */}
          {quiver > 0
            ? [0, 1, 2, 3, 4].map((k) => {
                let d = '';
                for (let x = 300; x <= 860; x += 18) d += `${x === 300 ? 'M' : 'L'}${x} ${760 + k * 50 + 8 * quiver * Math.sin(x / 22 + f * 1.4 + k * 1.9)}`;
                return <path key={k} d={d} fill="none" stroke={PLATE.ink} strokeWidth={1.6} opacity={0.4 * quiver} clipPath="url(#hs-wall)" />;
              })
            : null}
        </g>
        {/* pulmonary trunk and left pulmonary artery: in front, leaving the right ventricle */}
        <g opacity={o(3)}>
          <Tube segs={LPA} w={70} tone="vein" side={1} cutEnd swell={vent * 2} />
          <Tube segs={PT} w={100} tone="vein" side={1} swell={vent * 3} />
        </g>
        {/* conduction: the impulse from the sinoatrial node through the atrioventricular node and down the septum */}
        {cond != null && f >= cond ? (
          <g>
            {[CONDUCT, RBB].map((segs, i) => (
              <path key={i} d={segs.map((q, k) => `${k ? '' : `M${q[0][0]} ${q[0][1]}`} C${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]} ${q[3][0]} ${q[3][1]}`).join(' ')} fill="none" stroke={PLATE.gold} strokeWidth={6} strokeLinecap="round" opacity={0.85 * tw(f, cond, 20)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tw(f, cond, 40, E.inOut)} />
            ))}
            {[0, 1].map((k) => {
              const u = (((f - cond) / 50 + k * 0.5) % 1 + 1) % 1;
              const [x, y] = along(CONDUCT, u);
              return <circle key={k} cx={x} cy={y} r={11} fill="#FFF3C4" stroke={PLATE.ink} strokeWidth={2.5} opacity={tw(f, cond + 30, 10)} />;
            })}
            <circle cx={300} cy={470} r={14} fill={PLATE.gold} stroke={PLATE.ink} strokeWidth={2.5} opacity={tw(f, cond, 12)} />
            <circle cx={456} cy={706} r={12} fill={PLATE.gold} stroke={PLATE.ink} strokeWidth={2.5} opacity={tw(f, cond + 10, 12)} />
          </g>
        ) : null}
        {/* blood flow: inked arrows trace each circuit and stay; they fade when output stops */}
        {flowR != null
          ? FLOW_R.map((s, i) => <InkArrow key={`r${i}`} segs={s} p={tw(f, flowR + i * 14, 26, E.inOut)} color={PLATE.vein} w={11} o={0.5 + 0.5 * output} />)
          : null}
        {flowL != null
          ? FLOW_L.map((s, i) => <InkArrow key={`l${i}`} segs={s} p={tw(f, flowL + i * 14, 26, E.inOut)} color={PLATE.artery} w={11} o={0.5 + 0.5 * output} />)
          : null}
      </g>
    );
  };
  return {w: 1000, h: 1100, layout: 'side', anchors, C};
};

export default {heartSection} as Record<string, ArtFactory>;
