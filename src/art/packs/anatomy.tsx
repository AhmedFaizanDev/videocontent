/**
 * Pack anatomy: authentic anatomical drawings (house standard v2 — a heart looks like a heart).
 *   heartAnterior  the heart in anterior view, as in an anatomy atlas: right atrium and auricle,
 *                  right ventricle forming most of the front, left ventricle forming the left
 *                  border and apex, left auricle, ascending aorta and arch with its three branches,
 *                  pulmonary trunk and left pulmonary artery, superior and inferior venae cavae,
 *                  epicardial fat in the grooves with the right coronary artery, the anterior
 *                  interventricular (LAD) artery and great cardiac vein. Shaded as tissue.
 *                  Beats in sinus rhythm by default (atria then ventricles), with oxygenated
 *                  blood leaving through the aorta and deoxygenated blood through the pulmonary
 *                  trunk. Events (the latest wins): vf (fibrillation: the ventricles quiver
 *                  without contracting, the surface ripples, output stops), stop (motionless,
 *                  dusky: no output), compress (chest compressions squeeze it at ~110/min and
 *                  push blood out with each one), rosc (sinus beat and output return).
 */
import React from 'react';
import {E, clamp01, tw} from '../../motion';
import {type ArtCtx, type ArtFactory} from '../kit';

type P = [number, number];
type Bez = [P, P, P, P];
const bez = (q: Bez, t: number): P => {
  const m = 1 - t;
  return [0, 1].map((i) => m * m * m * q[0][i] + 3 * m * m * t * q[1][i] + 3 * m * t * t * q[2][i] + t * t * t * q[3][i]) as P;
};
/** a point a fraction u along a chain of cubic segments (equal weight per segment) */
const along = (segs: Bez[], u: number): P => {
  const x = clamp01(u) * segs.length;
  const k = Math.min(segs.length - 1, Math.floor(x));
  return bez(segs[k], x - k);
};
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ------------------------------------------------------------------ geometry (1000 × 1100) */
const VENT = 'M430 505 C480 490 520 486 548 480 C556 466 566 458 600 456 C632 456 650 464 660 476 C690 470 715 472 735 480 C800 520 838 600 838 700 C838 820 812 920 782 975 C768 1000 735 1003 705 988 C600 935 470 860 360 790 C330 770 318 740 330 700 C360 620 390 545 430 505 Z';
const RA = 'M335 395 C270 400 225 470 222 560 C220 640 245 715 305 770 C330 790 360 795 372 780 C345 720 352 640 380 575 C400 530 420 505 440 495 C425 440 390 400 335 395 Z';
const R_AUR = 'M350 430 C390 404 450 404 498 430 C514 440 520 452 512 462 L500 458 L494 470 L482 464 L476 478 L462 472 L456 488 L442 482 L436 498 L420 494 C400 500 380 494 368 480 C352 466 340 446 350 430 Z';
const L_AUR = 'M716 462 C738 440 776 444 790 466 C798 482 788 498 774 494 C766 508 746 510 734 498 C722 488 712 476 716 462 Z';
const AORTA_ASC: Bez = [[470, 520], [468, 420], [462, 320], [480, 250]];
const AORTA_ARCH: Bez = [[480, 250], [500, 175], [600, 150], [670, 185]];
const AORTA_DESC: Bez = [[670, 185], [690, 196], [700, 210], [704, 226]];
// one continuous arch; it sweeps back and its descending limb disappears under the left pulmonary artery
const AORTA = `M470 520 C468 420 462 320 480 250 C500 175 600 150 670 185 C696 198 708 240 711 318`;
const LIGAMENT = 'M632 238 C638 262 644 290 652 318';

const BRANCH_ENDS: [P, P][] = [[[488, 50], [-0.3, -1]], [[580, 40], [0.02, -1]], [[668, 45], [0.3, -1]]];

const BRANCHES = ['M520 196 C512 150 500 110 488 50', 'M575 173 C577 130 579 90 580 40', 'M630 176 C645 135 655 95 668 45'];
const SVC = 'M338 160 L338 432';
const IVC = 'M318 740 L324 905';
const PA_TRUNK: Bez = [[590, 545], [600, 470], [610, 400], [630, 345]];
const PA_LEFT: Bez = [[630, 345], [680, 320], [760, 305], [850, 300]];
const PA = 'M590 545 C600 470 610 400 630 345';
const LPA = 'M630 345 C680 320 760 305 850 300';
const RPA = 'M612 362 C560 346 500 340 380 352';
const LAD = 'M640 470 C652 610 682 800 716 984';
const GCV = 'M655 470 C668 610 698 800 731 978';
const DIAG = 'M660 640 C706 668 760 704 812 752';
const RCA = 'M448 500 C408 556 374 640 370 724 C368 766 384 798 420 824 C450 844 480 856 510 868';
const MARG = 'M371 706 C430 734 500 772 556 818';
const FIBRES = ['M450 600 C560 560 690 545 834 580', 'M396 700 C520 640 650 612 836 642', 'M380 760 C520 700 680 690 834 742', 'M470 860 C580 800 700 790 812 832', 'M560 930 C640 880 720 870 790 905'];
const RIPPLES = [0, 1, 2, 3, 4, 5].map((k) => 520 + k * 70);

const ART = {red: '#B8463E', redDark: '#762824', redHi: '#E59588', blue: '#5677B8', blueDark: '#2D4778', blueHi: '#9DB2DD', fat: '#E6C67E', fatDark: '#B8963F'};

/** A vessel as a shaded cylinder: dark casing, body colour, a highlight along one side. */
const Vessel: React.FC<{d: string; w: number; tone: 'red' | 'blue'; o?: number; swell?: number; cut?: {at: P; dir: P}}> = ({d, w, tone, o = 1, swell = 0, cut}) => {
  const c = tone === 'red' ? [ART.redDark, ART.red, ART.redHi] : [ART.blueDark, ART.blue, ART.blueHi];
  const W = w + swell;
  // a cut end, as an atlas draws a vessel's free end: the open lumen seen as an ellipse
  const ang = cut ? (Math.atan2(cut.dir[1], cut.dir[0]) * 180) / Math.PI : 0;
  return (
    <g opacity={o} fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <path d={d} stroke={c[0]} strokeWidth={W + 6} />
      <path d={d} stroke={c[1]} strokeWidth={W} />
      <path d={d} stroke={c[0]} strokeWidth={W * 0.3} transform={`translate(${W * 0.24} ${W * 0.04})`} opacity={0.32} />
      <path d={d} stroke={c[2]} strokeWidth={W * 0.22} transform={`translate(${-W * 0.2} ${-W * 0.06})`} opacity={0.55} />
      {cut ? (
        <g transform={`translate(${cut.at[0]} ${cut.at[1]}) rotate(${ang + 90})`}>
          <ellipse rx={(W + 6) / 2} ry={(W + 6) * 0.2} fill={c[0]} />
          <ellipse rx={W / 2 - 3} ry={W * 0.2 - 4} fill={tone === 'red' ? '#5A1C1A' : '#1F3158'} />
          <ellipse rx={W / 2 - 3} ry={W * 0.2 - 4} fill="none" stroke={c[2]} strokeWidth={2} opacity={0.6} />
        </g>
      ) : null}
    </g>
  );
};

const RH = ['vf', 'stop', 'compress', 'rosc'] as const;
const stateAt = (c: ArtCtx) => {
  let best: {k: (typeof RH)[number]; a: number} | null = null;
  for (const k of RH) {
    const a = c.at(k);
    if (a != null && a <= c.f && (!best || a >= best.a)) best = {k, a};
  }
  return best;
};

const BEAT = 25; // frames per beat ≈ 72/min
const PUSH = 16.4; // frames per compression ≈ 110/min
/** systole shape over one cycle: atria at 0–0.15, ventricles at 0.18–0.5 */
const cycle = (ph: number) => ({atria: Math.sin(clamp01(ph / 0.15) * Math.PI), vent: Math.sin(clamp01((ph - 0.18) / 0.32) * Math.PI)});

const heartAnterior: ArtFactory = (data = {}) => {
  // data.state: the state already running when the picture opens (a scene continuing an arrest)
  const start = (RH as readonly string[]).includes(data.state) ? data.state : null;
  const anchors: Record<string, P> = {
    aorta: [560, 182], pulmonary: [612, 400], svc: [338, 250], ivc: [322, 860], ra: [282, 590], rv: [540, 700], lv: [800, 780], la: [762, 480],
    apex: [752, 978], rca: [372, 660], lad: [690, 800], vf: [600, 720], stop: [600, 720], compress: [600, 640], rosc: [600, 720],
  };
  const C: React.FC<ArtCtx> = (c0) => {
    const c: ArtCtx = start ? {...c0, at: (k: string) => c0.at(k) ?? (k === start ? -10000 : null)} : c0;
    const {f} = c;
    const s = stateAt(c);
    const kind = s?.k ?? 'nsr';
    const since = s ? f - s.a : f;
    // motion
    let atria = 0;
    let vent = 0;
    let squash = 0;
    let jx = 0;
    let jy = 0;
    let quiver = 0;
    let output = 0;
    if (kind === 'nsr' || kind === 'rosc') {
      const cy = cycle((((f / BEAT) % 1) + 1) % 1);
      atria = cy.atria;
      vent = cy.vent * (kind === 'rosc' ? clamp01(since / 20) : 1);
      output = kind === 'rosc' ? clamp01(since / 20) : 1;
    } else if (kind === 'vf') {
      quiver = clamp01(since / 10);
      jx = quiver * 4 * (hash(f) - 0.5) * 2;
      jy = quiver * 3 * (hash(f + 91) - 0.5) * 2;
      vent = quiver * 0.12 * hash(f * 3 + 7);
    } else if (kind === 'compress') {
      const ph = ((since / PUSH) % 1 + 1) % 1;
      squash = (0.5 - 0.5 * Math.cos(2 * Math.PI * ph)) * clamp01(since / 8);
      output = 0.75;
    }
    const dusky = kind === 'vf' || kind === 'stop' ? clamp01(since / 30) : kind === 'compress' ? 0.6 : kind === 'rosc' ? 1 - clamp01(since / 60) : 0;
    const sx = 1 - 0.045 * vent - 0.06 * squash;
    const sy = 1 - 0.065 * vent - 0.08 * squash;
    const vT = `translate(${jx} ${jy}) translate(590 520) scale(${sx} ${sy}) translate(-590 -520)`;
    const aT = `translate(${jx * 0.5} ${jy * 0.5}) translate(330 580) scale(${1 - 0.05 * atria} ${1 - 0.04 * atria}) translate(-330 -580)`;
    const swell = 4 * vent + 3 * squash;
    // build-in
    const o = (i: number) => tw(f, 4 + i * 4, 16, E.out);
    // blood flow: oxygenated out of the aorta, deoxygenated into the right heart and out of the pulmonary trunk
    const flowO = output * tw(f, 30, 14);
    const pace = kind === 'compress' ? 1 / PUSH : 1 / BEAT;
    const dots = (segs: Bez[], n: number, col: string, key: string, phase = 0) =>
      flowO > 0
        ? Array.from({length: n}, (_, j) => {
            const u = ((f * pace * 0.55 + j / n + phase) % 1 + 1) % 1;
            const [x, y] = along(segs, u);
            const [x2, y2] = along(segs, Math.min(1, u + 0.01));
            const a = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
            // a chevron pointing downstream: the direction of flow, as an atlas marks it
            return <path key={`${key}${j}`} d="M-10 -12 L6 0 L-10 12" transform={`translate(${x} ${y}) rotate(${a})`} fill="none" stroke={col} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" opacity={flowO * (u < 0.08 ? u / 0.08 : u > 0.92 ? (1 - u) / 0.08 : 1) * 0.92} />;
          })
        : null;
    const ripple = (y: number, k: number) => {
      const amp = 11 * quiver * (0.6 + 0.4 * Math.sin(f * 0.7 + k));
      let d = '';
      for (let x = 340; x <= 840; x += 20) d += `${x === 340 ? 'M' : 'L'}${x} ${y + amp * Math.sin(x / 26 + f * 1.3 + k * 1.7)}`;
      return <path key={k} d={d} fill="none" stroke="#F6BDB0" strokeWidth={3} opacity={0.55 * quiver} />;
    };
    return (
      <g>
        <defs>
          {/* in art units, so the conus and the ventricles share one continuous shading */}
          <radialGradient id="ha-vent" gradientUnits="userSpaceOnUse" cx={540} cy={610} r={470}>
            <stop offset="0" stopColor="#D98472" />
            <stop offset="0.5" stopColor="#B9564B" />
            <stop offset="1" stopColor="#7E2F2E" />
          </radialGradient>
          <radialGradient id="ha-ra" cx="0.38" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#DC8E8E" />
            <stop offset="1" stopColor="#A2505B" />
          </radialGradient>
          <radialGradient id="ha-aur" cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#DE9590" />
            <stop offset="1" stopColor="#A5525A" />
          </radialGradient>
          <clipPath id="ha-vclip">
            <path d={VENT} />
          </clipPath>
          <filter id="ha-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {/* behind the heart: descending aorta, right pulmonary artery, inferior vena cava */}
        <g opacity={o(0)}>

          <Vessel d={RPA} w={56} tone="blue" />
          <Vessel d={IVC} w={84} tone="blue" cut={{at: [324, 905], dir: [0.04, 1]}} />
        </g>
        {/* great vessels */}
        <g opacity={o(1)}>
          {BRANCHES.map((d, i) => (
            <Vessel key={i} d={d} w={34} tone="red" swell={swell * 0.3} cut={{at: BRANCH_ENDS[i][0], dir: BRANCH_ENDS[i][1]}} />
          ))}
          <Vessel d={AORTA} w={84} tone="red" swell={swell} />
          {/* ligamentum arteriosum: arch underside to the left pulmonary artery */}
          <path d={LIGAMENT} fill="none" stroke="#B89890" strokeWidth={9} strokeLinecap="round" />
          <path d={LIGAMENT} fill="none" stroke="#DCC3BC" strokeWidth={4} strokeLinecap="round" />
          <Vessel d={SVC} w={84} tone="blue" cut={{at: [338, 160], dir: [0, -1]}} />
        </g>
        {/* pulmonary trunk (in front of the aortic root; it leaves the right ventricle's conus, which overlaps its base) and left pulmonary artery */}
        <g opacity={o(4)} transform={`translate(${jx * 0.4} ${jy * 0.4})`}>
          <Vessel d={LPA} w={64} tone="blue" swell={swell * 0.6} cut={{at: [850, 300], dir: [1, -0.05]}} />
          <Vessel d={PA} w={92} tone="blue" swell={swell} />
          {/* the pulmonary sinus: the trunk swells just above its valve */}
          <Vessel d="M598 492 C601 478 604 468 606 458" w={104} tone="blue" swell={swell} />
        </g>
        {/* right atrium */}
        <g transform={aT} opacity={o(2)}>
          <path d={RA} fill="url(#ha-ra)" stroke="#5E2433" strokeWidth={3} />
          <path d={RA} fill="#2A3A66" opacity={0.22 * dusky} />
        </g>
        {/* ventricles */}
        <g transform={vT} opacity={o(3)}>
          <path d={VENT} fill="url(#ha-vent)" />
          <g clipPath="url(#ha-vclip)">
            {/* inner rim shadow and the sheen of the epicardium */}
            <path d={VENT} fill="none" stroke="#5A1F22" strokeWidth={46} opacity={0.32} filter="url(#ha-soft)" />
            <ellipse cx={520} cy={610} rx={130} ry={70} transform="rotate(-18 520 610)" fill="#fff" opacity={0.13} filter="url(#ha-soft)" />
            {FIBRES.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#F2A493" strokeWidth={2} opacity={0.2} />
            ))}
            {/* the left ventricle (beyond the interventricular groove) a shade deeper than the right */}
            <path d="M640 470 C652 610 682 800 716 984 L900 1010 L900 400 Z" fill="#6E2228" opacity={0.16} />
            {RIPPLES.map(ripple)}
            <path d={VENT} fill="#2A3A66" opacity={0.26 * dusky} />
          </g>
          <path d={VENT} fill="none" stroke="#5A1F22" strokeWidth={3} />
          {/* grooves: epicardial fat carrying the coronary vessels */}
          <g fill="none" strokeLinecap="round" opacity={o(5)}>
            <path d={LAD} stroke={ART.fat} strokeWidth={26} opacity={0.85} />
            <path d={LAD} stroke={ART.fatDark} strokeWidth={26} opacity={0.18} transform="translate(3 3)" />
            <path d={GCV} stroke={ART.blue} strokeWidth={6} />
            <path d={LAD} stroke={ART.redDark} strokeWidth={9} />
            <path d={LAD} stroke="#C9473F" strokeWidth={6} />
            <path d={DIAG} stroke="#C9473F" strokeWidth={4.5} />
            <path d={MARG} stroke="#C9473F" strokeWidth={4.5} />
          </g>
        </g>
        {/* right coronary artery in the right atrioventricular groove */}
        <g fill="none" strokeLinecap="round" opacity={o(5)} transform={`translate(${jx * 0.7} ${jy * 0.7})`}>
          <path d={RCA} stroke={ART.fat} strokeWidth={26} opacity={0.85} />
          <path d={RCA} stroke={ART.redDark} strokeWidth={9} />
          <path d={RCA} stroke="#C9473F" strokeWidth={6} />
        </g>
        {/* auricles */}
        <g opacity={o(4)}>
          <g transform={aT}>
            <path d={R_AUR} fill="url(#ha-aur)" stroke="#5E2433" strokeWidth={3} />
          </g>
          <g transform={`translate(${jx * 0.5} ${jy * 0.5})`}>
            <path d={L_AUR} fill="url(#ha-aur)" stroke="#5E2433" strokeWidth={3} />
          </g>
        </g>
        {/* blood leaving the heart */}
        <g>
          {dots([AORTA_ASC, AORTA_ARCH], 6, '#FFF3F0', 'ao')}
          {dots([PA_TRUNK, PA_LEFT], 6, '#F2F6FF', 'pa', 0.3)}
          {dots([[[338, 170], [338, 250], [338, 340], [338, 420]]], 4, '#F2F6FF', 'svc', 0.6)}
          {dots([[[324, 900], [323, 860], [321, 820], [319, 770]]], 2, '#F2F6FF', 'ivc', 0.2)}
        </g>
      </g>
    );
  };
  return {w: 1000, h: 1100, layout: 'side', anchors, C};
};

export default {heartAnterior} as Record<string, ArtFactory>;
