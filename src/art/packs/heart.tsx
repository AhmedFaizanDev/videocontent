/**
 * Domain pack: the human heart (frontal section, viewer's left = patient's right).
 *
 * One living illustration that different scenes call out differently:
 *   anatomy     ra rv la lv septum apex svc ivc aorta trunk pv
 *   valves      tricuspid pulmonary mitral aortic chordae        (always animated with the beat)
 *   flow        flowRight flowLeft   (events: blood particles along the true route; vessel
 *               labels "from body / to lungs / from lungs / to body" appear)
 *   conduction  sa av his branches purkinje   (events: the electrical wave grows stage by
 *               stage as each is named, then loops every beat; the chambers contract on it)
 * data: {bpm?: 60, beat?: true}
 */
import React from 'react';
import {fonts, ink} from '../../theme';
import {E, clamp01, mix, tw} from '../../motion';
import {INK, Tube, draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';

type P = [number, number];
const BLUE = '#3953D9';
const RED = '#D7263D';

/* ---------------------------------------------------------------- geometry */
// Textbook frontal section: both outflow tracts rise to their valves at the base; the aorta
// arches over the left atrium; the pulmonary trunk splits beneath the arch.
const OUTER =
  'M240 210 C 175 250 165 400 240 480 C 310 565 460 645 600 658 C 705 662 805 565 825 430 C 840 330 822 240 775 195 C 735 160 660 165 620 190 L 610 195 C 590 200 500 205 480 205 C 420 180 340 175 300 185 C 275 190 255 198 240 210 Z';
const CAV = {
  ra: 'M250 225 C 212 262 212 355 262 392 C 305 420 385 412 408 378 C 428 340 420 262 390 228 C 360 200 285 202 250 225 Z',
  rv: 'M290 422 C 305 475 365 565 470 602 C 510 614 530 594 530 560 C 528 505 524 455 516 412 C 508 360 500 300 492 236 L 448 236 C 450 300 440 380 420 410 C 390 425 330 410 290 422 Z',
  la: 'M628 215 C 612 250 625 300 668 322 C 720 342 780 332 800 290 C 815 250 795 210 758 200 C 712 190 660 195 628 215 Z',
  lv: 'M578 380 C 568 440 575 525 604 590 C 620 620 644 620 666 592 C 714 528 742 442 734 384 C 728 352 704 346 672 350 C 640 353 620 345 612 330 L 606 254 L 566 254 L 572 330 C 574 350 580 362 578 380 Z',
};
const V = {
  svc: 'M300 10 C 302 80 304 140 306 214',
  ivc: 'M252 676 C 254 600 262 480 276 392',
  trunk: 'M470 238 C 470 200 470 160 470 128',
  rpa: 'M470 128 C 420 96 300 92 140 104',
  lpa: 'M470 128 C 540 100 690 100 940 126',
  aorta: 'M586 256 C 586 190 584 140 598 96 C 626 20 790 14 830 84',
  descending: 'M826 76 C 850 116 856 200 856 330',
  pv1: 'M975 236 C 900 238 850 240 806 244',
  pv2: 'M975 300 C 900 298 850 296 810 292',
  br1: 'M652 48 L 644 4',
  br2: 'M704 34 L 704 -6',
  br3: 'M756 36 L 766 -4',
};
const cub = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

/** A route through the heart as a polyline, sampled evenly by length. */
const route = (pts: P[]) => {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  return (u: number): P => {
    const d = clamp01(u) * total;
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const t = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    return [mix(pts[i - 1][0], pts[i][0], t), mix(pts[i - 1][1], pts[i][1], t)];
  };
};
const bezPts = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, n = 10): P[] =>
  Array.from({length: n + 1}, (_, i) => [cub(x0, x1, x2, x3, i / n), cub(y0, y1, y2, y3, i / n)] as P);
const ARCH = bezPts(598, 96, 626, 20, 790, 14, 830, 84);
const RIGHT_ROUTES = [
  // superior vena cava → RA → tricuspid → RV → up the outflow → pulmonary valve → trunk → right lung
  route([[300, 12], [304, 140], [312, 250], [318, 320], [356, 410], [400, 480], [455, 560], [505, 540], [505, 440], [492, 330], [470, 238], [470, 128], ...bezPts(470, 128, 420, 96, 300, 92, 140, 104)]),
  // inferior vena cava → RA → … → left lung
  route([[252, 676], [262, 520], [276, 392], [330, 360], [356, 410], [420, 500], [480, 590], [510, 500], [500, 380], [478, 238], [470, 128], ...bezPts(470, 128, 540, 100, 690, 100, 940, 126)]),
];
const LEFT_ROUTES = [
  // pulmonary veins → LA → mitral → LV → up the outflow → aortic valve → arch → body
  route([[975, 236], [806, 244], [712, 262], [700, 330], [696, 420], [650, 540], [620, 590], [596, 480], [586, 380], [586, 256], [592, 150], ...ARCH, [852, 150], [856, 320]]),
  route([[975, 300], [810, 292], [712, 280], [690, 340], [700, 430], [650, 560], [600, 520], [588, 400], [586, 256], [594, 110], ...ARCH, [856, 320]]),
];
const COND = {
  sa: [318, 222] as P,
  av: [424, 396] as P,
  his: route([[424, 396], [520, 418], [552, 428]]),
  rbb: route([[552, 428], [540, 520], [568, 612]]),
  lbb: route([[560, 430], [596, 520], [626, 612]]),
  pk: [route([[598, 642], [470, 614], [360, 545], [300, 465]]), route([[626, 642], [742, 582], [796, 470], [808, 380]])],
};
const ANCH: Record<string, P> = {
  ra: [318, 305], rv: [440, 510], la: [712, 265], lv: [668, 470], septum: [548, 500], apex: [604, 652],
  svc: [302, 70], ivc: [256, 640], aorta: [720, 30], trunk: [470, 170], pv: [900, 240],
  tricuspid: [356, 410], pulmonary: [470, 238], mitral: [696, 344], aortic: [586, 256], chordae: [395, 470],
  sa: COND.sa, av: COND.av, his: [500, 414], branches: [582, 540], purkinje: [470, 614],
  flowRight: [318, 305], flowLeft: [712, 265],
};

/* ---------------------------------------------------------------- the heart */
const heart: ArtFactory = (data = {}) => {
  const period = 30 * (60 / (data.bpm ?? 60)); // frames per beat
  const beating = data.beat !== false;
  const phase = (f: number) => (((f / period) % 1) + 1) % 1;
  // cardiac cycle: atrial systole 0–.12 · ventricular systole .15–.45 · diastole .45–1
  const atria = (φ: number) => (φ < 0.12 ? Math.sin((φ / 0.12) * Math.PI) : 0);
  const vents = (φ: number) => (φ >= 0.15 && φ < 0.45 ? Math.sin(((φ - 0.15) / 0.3) * Math.PI) : 0);
  const avOpen = (φ: number) => (φ >= 0.15 && φ < 0.45 ? 0 : φ < 0.5 ? (φ - 0.45) / 0.05 : 1);
  const slOpen = (φ: number) => (φ >= 0.17 && φ < 0.43 ? Math.min(1, (φ - 0.17) / 0.04, (0.43 - φ) / 0.04) : 0);

  const C: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const on = (a: string) => c.at(a) != null && f >= c.at(a)!;
    const φ = beating && f > 40 ? phase(f - 40) : 0.6;
    const cond = ['sa', 'av', 'his', 'branches', 'purkinje'];
    const reach = cond.reduce((r, a, i) => (on(a) ? i : r), -1);
    const showCond = cond.some((a) => c.at(a) != null);
    const aS = 1 - 0.028 * atria(φ);
    const vS = 1 - 0.035 * vents(φ);
    const tint = (col: string, o: number, d: string) => <path d={d} fill={col} opacity={o} style={{mixBlendMode: 'multiply'}} />;
    /** An AV valve: two leaflets hinged at the annulus, tethered by chordae to a papillary muscle. */
    const Valve: React.FC<{hx: [number, number]; y: number; len: number; open: number; col: string; pap: P; p: number}> = ({hx, y, len, open, col, pap, p}) => {
      const ang = mix(4, 70, open);
      const tips = hx.map((x, k) => {
        const a = ((k ? 180 - ang : ang) * Math.PI) / 180;
        return [x + Math.cos(a) * len, y + Math.sin(a) * len] as P;
      });
      return (
        <g opacity={p}>
          {tips.map(([tx, ty], k) => (
            <path key={`c${k}`} d={`M${tx} ${ty} L ${pap[0] + (k ? 6 : -6)} ${pap[1]}`} stroke={INK} strokeWidth={1.6} opacity={0.75} />
          ))}
          {tips.map(([tx, ty], k) => (
            <React.Fragment key={k}>
              <path d={`M${hx[k]} ${y} Q ${(hx[k] + tx) / 2 + (k ? 4 : -4)} ${(y + ty) / 2 + 6} ${tx} ${ty}`} stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none" />
              <path d={`M${hx[k]} ${y} Q ${(hx[k] + tx) / 2 + (k ? 4 : -4)} ${(y + ty) / 2 + 6} ${tx} ${ty}`} stroke={col} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            </React.Fragment>
          ))}
        </g>
      );
    };
    const cusp = (x0: number, x1: number, y: number, open: number, p: number) => {
      const mid = (x0 + x1) / 2;
      const w = (x1 - x0) / 2;
      const spread = mix(w, 6, open);
      return (
        <g opacity={p} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round">
          <path d={`M${x0} ${y} Q ${x0 + 4} ${y - 18} ${mid - (w - spread)} ${y - mix(24, 36, open)}`} />
          <path d={`M${x1} ${y} Q ${x1 - 4} ${y - 18} ${mid + (w - spread)} ${y - mix(24, 36, open)}`} />
        </g>
      );
    };
    const base = (i: number) => draw(f, i, 30);
    const flowR = c.at('flowRight');
    const flowL = c.at('flowLeft');
    const particles = (routes: ((u: number) => P)[], start: number, col: string) =>
      routes.flatMap((r, ri) =>
        Array.from({length: 11}, (_, j) => {
          // blood surges during systole, drifts in diastole
          const t = f - start;
          const drift = t / (period * 5) + (vents(φ) * 0.02);
          const u = ((drift + j / 11 + ri * 0.05) % 1 + 1) % 1;
          const [x, y] = r(u);
          return <circle key={`${ri}-${j}`} cx={x} cy={y} r={8} fill={col} stroke={ink.paperLight} strokeWidth={2.5} opacity={tw(f, start, 14) * Math.min(1, u * 12, (1 - u) * 12)} />;
        }),
      );
    // conduction wave within one beat, grown to the last-named stage
    const w = beating ? phase(f - 40) : 0.2;
    const glow = (x: number, y: number, r: number, o: number) => (o > 0.01 ? <circle cx={x} cy={y} r={r} fill={ink.sun} opacity={o} style={{mixBlendMode: 'multiply'}} /> : null);
    const dot = (p: P, o: number) => (o > 0.01 ? <circle cx={p[0]} cy={p[1]} r={10} fill={ink.sun} stroke={INK} strokeWidth={2.5} opacity={o} /> : null);

    return (
      <g>
        {/* behind the heart */}
        <Tube d={V.rpa} p={base(3)} w={44} core="#C9D1F4" />
        <Tube d={V.lpa} p={base(3)} w={44} core="#C9D1F4" />
        <Tube d={V.pv1} p={base(4)} w={38} core="#F2C2C8" />
        <Tube d={V.pv2} p={base(4)} w={38} core="#F2C2C8" />
        <Tube d={V.ivc} p={base(2)} w={62} core="#C9D1F4" />
        <Tube d={V.descending} p={base(4)} w={60} core="#F2C2C8" />
        {/* muscle: opaque, so nothing behind shows through */}
        <path d={OUTER} fill={ink.paperLight} opacity={fillIn(f, 0, 30)} />
        <path d={OUTER} fill="#E8B7AE" opacity={0.95 * fillIn(f, 0, 30)} style={{mixBlendMode: 'multiply'}} />
        <path d={OUTER} fill="none" stroke={INK} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - base(0)} />
        {/* chambers: atria, then ventricles, contract on the beat */}
        <g transform={`translate(360 300) scale(${aS}) translate(-360 -300)`}>
          <path d={CAV.ra} fill={ink.paperLight} opacity={fillIn(f, 1, 30)} />
          {tint(BLUE, 0.2 * fillIn(f, 1, 30), CAV.ra)}
          <path d={CAV.ra} fill="none" stroke={INK} strokeWidth={3.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - base(1)} />
        </g>
        <g transform={`translate(712 265) scale(${aS}) translate(-712 -265)`}>
          <path d={CAV.la} fill={ink.paperLight} opacity={fillIn(f, 1, 30)} />
          {tint(RED, 0.18 * fillIn(f, 1, 30), CAV.la)}
          <path d={CAV.la} fill="none" stroke={INK} strokeWidth={3.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - base(1)} />
        </g>
        <g transform={`translate(560 500) scale(${vS}) translate(-560 -500)`}>
          <path d={CAV.rv} fill={ink.paperLight} opacity={fillIn(f, 2, 30)} />
          {tint(BLUE, 0.2 * fillIn(f, 2, 30), CAV.rv)}
          <path d={CAV.rv} fill="none" stroke={INK} strokeWidth={3.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - base(2)} />
          <path d={CAV.lv} fill={ink.paperLight} opacity={fillIn(f, 2, 30)} />
          {tint(RED, 0.18 * fillIn(f, 2, 30), CAV.lv)}
          <path d={CAV.lv} fill="none" stroke={INK} strokeWidth={3.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - base(2)} />
          {/* papillary muscles */}
          <g opacity={tw(f, 40, 16)} fill="#E8B7AE" stroke={INK} strokeWidth={2.5}>
            <path d="M372 540 q 17 -36 34 0 z" />
            <path d="M676 522 q 16 -36 32 0 z" />
          </g>
        </g>
        {/* vessels in front */}
        <Tube d={V.svc} p={base(2)} w={62} core="#C9D1F4" />
        <Tube d={V.trunk} p={base(3)} w={56} core="#C9D1F4" />
        <Tube d={V.aorta} p={base(4)} w={64} core="#F2C2C8" />
        {[V.br1, V.br2, V.br3].map((d, i) => (
          <Tube key={i} d={d} p={base(5)} w={24} core="#F2C2C8" />
        ))}
        {/* valves: AV valves swing into the ventricles in diastole; semilunar cusps open in systole */}
        <Valve hx={[304, 408]} y={412} len={50} open={avOpen(φ)} col={BLUE} pap={[389, 506]} p={tw(f, 34, 12)} />
        <Valve hx={[650, 742]} y={344} len={46} open={avOpen(φ)} col={RED} pap={[692, 488]} p={tw(f, 34, 12)} />
        {cusp(448, 492, 240, slOpen(φ), tw(f, 36, 12))}
        {cusp(566, 606, 258, slOpen(φ), tw(f, 36, 12))}
        {/* blood */}
        {flowR != null && f >= flowR ? particles(RIGHT_ROUTES, flowR, BLUE) : null}
        {flowL != null && f >= flowL ? particles(LEFT_ROUTES, flowL, RED) : null}
        {/* conduction system */}
        {showCond ? (
          <g>
            <g stroke={ink.sunText} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.55 * tw(f, 20, 16)} strokeDasharray="2 7">
              <path d="M318 222 C 360 300 400 360 424 392" />
              <path d="M424 396 L 520 418 L 552 428 M552 428 L 540 520 L 568 612 M560 430 L 596 520 L 626 612" />
              <path d="M598 642 L 470 614 L 360 545 L 300 465 M626 642 L 742 582 L 796 470 L 808 380" />
            </g>
            <circle cx={COND.sa[0]} cy={COND.sa[1]} r={13} fill={ink.sun} stroke={INK} strokeWidth={3} opacity={tw(f, 20, 12)} />
            <circle cx={COND.av[0]} cy={COND.av[1]} r={11} fill={ink.sun} stroke={INK} strokeWidth={3} opacity={tw(f, 20, 12)} />
            {reach >= 0 ? glow(COND.sa[0], COND.sa[1], 20 + 40 * (w < 0.08 ? w / 0.08 : 1), w < 0.12 ? 0.8 : 0) : null}
            {reach >= 1 ? glow(380, 290, mix(40, 240, clamp01(w / 0.12)), w < 0.12 ? 0.35 * (1 - w / 0.12) : 0) : null}
            {reach >= 1 ? glow(COND.av[0], COND.av[1], 30, w >= 0.1 && w < 0.2 ? 0.8 : 0) : null}
            {reach >= 2 ? dot(COND.his(clamp01((w - 0.2) / 0.03)), w >= 0.2 && w < 0.23 ? 1 : 0) : null}
            {reach >= 3 ? dot(COND.rbb(clamp01((w - 0.23) / 0.06)), w >= 0.23 && w < 0.29 ? 1 : 0) : null}
            {reach >= 3 ? dot(COND.lbb(clamp01((w - 0.23) / 0.06)), w >= 0.23 && w < 0.29 ? 1 : 0) : null}
            {reach >= 4 ? COND.pk.map((r, k) => <React.Fragment key={k}>{dot(r(clamp01((w - 0.29) / 0.07)), w >= 0.29 && w < 0.36 ? 1 : 0)}</React.Fragment>) : null}
            {reach >= 4 ? glow(560, 520, mix(60, 260, clamp01((w - 0.3) / 0.12)), w >= 0.3 && w < 0.42 ? 0.28 * (1 - (w - 0.3) / 0.12) : 0) : null}
          </g>
        ) : null}
      </g>
    );
  };

  const Html: React.FC<ArtCtx> = (c) => {
    const flows = (a: string) => (c.at(a) != null && c.f >= c.at(a)! ? tw(c.f, c.at(a)! + 10, 14) : 0);
    const r = flows('flowRight');
    const l = flows('flowLeft');
    const tag = (x: number, y: number, text: string, col: string, o: number) =>
      o > 0 ? (
        <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', fontFamily: fonts.mono, fontSize: 22, fontWeight: 600, color: col, background: 'rgba(255,255,255,0.92)', padding: '2px 8px', whiteSpace: 'nowrap', opacity: o}}>{text}</div>
      ) : null;
    return (
      <>
        {tag(214, 30, 'from body ↓', BLUE, r)}
        {tag(168, 648, 'from body ↑', BLUE, r)}
        {tag(176, 70, '← to lungs', BLUE, r)}
        {tag(880, 160, 'to lungs →', BLUE, r)}
        {tag(912, 206, '← from lungs', RED, l)}
        {tag(866, 350, 'to body ↓', RED, l)}
      </>
    );
  };
  return {w: 1000, h: 680, layout: 'side', lean: 0.035, anchors: ANCH, C, Html};
};

export const HEART: Record<string, ArtFactory> = {heart};
export const HEART_ANCHORS = Object.keys(ANCH);
void E;
