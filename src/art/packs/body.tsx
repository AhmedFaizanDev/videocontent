/**
 * Domain pack: the body and everyday things (Clinical style: flat colour forms outlined in a
 * darker shade of their own hue, drawn on then filled). Generic parts that many lessons
 * reuse as stage layers — people, where the organs are, what an artery wall does, a gauge,
 * and the objects of everyday advice. Text-free: every art works in every language.
 *
 *   person  a friendly standing figure (breathes, blinks). anchors: head face chest heart arm
 *           hand feet · events: wave (raises a hand) worry (brows + mouth) smile
 *   body    a body map: brain, heart, kidneys and the arterial tree in place, blood flowing.
 *           anchors: brain heart kidneys arteries arm leg head chest · events: brain heart
 *           kidneys (the organ is hurt: turns red and pulses) strain (arteries swell, the
 *           heart pounds) flow (blood visibly streams)
 *   vessel  an artery in cross-section: wall layers, lumen, red cells. anchors: wall lumen
 *           blood lining outer · events: push (force arrows press outward each beat) stretch
 *           (the wall stretches and recoils) stiff (the wall thickens and stiffens, the lumen
 *           narrows) tear (the inner lining is damaged; fatty patches build)
 *   gauge   a pressure dial, green → amber → red. anchors: dial needle low ok high · events:
 *           rise (the needle climbs into the red) ok (settles in the green) · data {start?: 0–1}
 *   icon    everyday objects. data {name: salt | vegetables | fruit | walk | cigarette |
 *           alcohol | calendar | scale | pill | water | sleep | stethoscope}. anchors: item ·
 *           events: act (the object does its thing: salt pours, the walker strides, smoke curls…)
 */
import React from 'react';
import {E, clamp01, hash, mix, tw} from '../../motion';
import {draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';
import {Form, Ping} from './circulation';

type P = [number, number];
const K = {
  skin: '#F4C7A5',
  skinDark: '#C98B63',
  hair: '#3B2A2A',
  shirt: '#2FA69A',
  shirtDark: '#1D7068',
  trousers: '#3B4A6B',
  trousersDark: '#232E47',
  ink: '#1C1530',
  red: '#E5484D',
  redDark: '#A3202E',
  redSoft: '#FDE2E4',
  pink: '#F7A8BE',
  pinkDark: '#C0587A',
  kidney: '#C9594F',
  kidneyDark: '#8E2F29',
  bodyFill: '#FCEEEA',
  bodyLine: '#D9A69C',
  lung: '#F9D2D8',
  ok: '#22A55B',
  warn: '#F59E0B',
  bad: '#E11D48',
  low: '#3B82F6',
  steel: '#E7E5EE',
  steelDark: '#8E88A3',
  fat: '#F5C451',
  fatDark: '#B8871B',
};
const on = (c: ArtCtx, a: string) => c.at(a) != null && c.f >= c.at(a)!;
const since = (c: ArtCtx, a: string) => (c.at(a) == null ? -1 : c.f - c.at(a)!);
const BEAT = 26; // frames per heartbeat (~70 bpm)

/** Points along a polyline at fraction u (0–1). */
const along = (pts: P[], u: number): P => {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = u * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const v = seg[i] ? Math.min(1, d / seg[i]) : 0;
      return [mix(pts[i][0], pts[i + 1][0], v), mix(pts[i][1], pts[i + 1][1], v)];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
};
const poly = (pts: P[]) => `M${pts.map((p) => p.join(' ')).join(' L')}`;
const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 34 * s} C ${cx - 70 * s} ${cy - 10 * s}, ${cx - 44 * s} ${cy - 66 * s}, ${cx} ${cy - 34 * s} C ${cx + 44 * s} ${cy - 66 * s}, ${cx + 70 * s} ${cy - 10 * s}, ${cx} ${cy + 34 * s} Z`;
/** A silhouette from several shapes: every outline first, every fill over them (no seams inside). */
const Silhouette: React.FC<{parts: string[]; fill: string; stroke: string; f: number; i: number; sw?: number}> = ({parts, fill, stroke, f, i, sw = 5}) => (
  <g>
    {parts.map((d, k) => (
      <path key={`s${k}`} d={d} fill="none" stroke={stroke} strokeWidth={sw * 2} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, i, 30)} />
    ))}
    {parts.map((d, k) => (
      <path key={`f${k}`} d={d} fill={fill} opacity={fillIn(f, i, 30)} />
    ))}
  </g>
);
const mirror = (d: string, W: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${W - Number(x)} ${y}`);

/* ================================================================ person */
const person: ArtFactory = (data = {}) => {
  const shirt = data.shirt ?? K.shirt;
  const shirtDark = data.shirtDark ?? K.shirtDark;
  // variety for groups of people: skin tone and hair colour from data
  const SK = {skin: data.skin ?? K.skin, skinDark: data.skinDark ?? K.skinDark, hair: data.hair ?? K.hair};
  const anchors: Record<string, P> = {head: [300, 150], face: [300, 200], chest: [300, 400], heart: [335, 380], arm: [170, 430], hand: [150, 600], feet: [300, 945], wave: [470, 160], worry: [300, 170], smile: [300, 228]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const breathe = 1 + 0.012 * Math.sin(f / 22);
    const blink = (f + 40) % 118 < 5 ? 0.15 : 1;
    const w = since(c, 'wave');
    const lift = w >= 0 ? tw(w, 0, 18, E.out) : 0;
    const waveA = -150 * lift + (w >= 0 ? 14 * Math.sin(w / 5) * lift : 0);
    const worry = on(c, 'worry') ? tw(f, c.at('worry')!, 16) : 0;
    const smile = on(c, 'smile') ? tw(f, c.at('smile')!, 16) : 0;
    // resting face: a gentle smile; `smile` opens it into a grin, `worry` turns it down
    const mouthCurve = mix(16, -10, worry);
    const legs = 'M196 590 H404 L398 930 H316 L300 700 L284 930 H202 Z';
    return (
      <g>
        <ellipse cx={300} cy={960} rx={190} ry={22} fill={K.ink} opacity={0.08 * fillIn(f, 0)} />
        <Form d={legs} fill={K.trousers} stroke={K.trousersDark} f={f} i={0} />
        <Form d="M196 936 Q200 916 244 918 Q292 920 292 944 Q292 962 244 962 Q200 962 196 936 Z" fill={K.ink} stroke={K.ink} f={f} i={1} sw={3} />
        <Form d="M404 936 Q400 916 356 918 Q308 920 308 944 Q308 962 356 962 Q400 962 404 936 Z" fill={K.ink} stroke={K.ink} f={f} i={1} sw={3} />
        {/* left arm (hangs) */}
        <path d="M200 330 C 170 380 160 470 156 590" stroke={SK.skinDark} strokeWidth={58} strokeLinecap="round" fill="none" opacity={fillIn(f, 2)} />
        <path d="M200 330 C 170 380 160 470 156 590" stroke={SK.skin} strokeWidth={48} strokeLinecap="round" fill="none" opacity={fillIn(f, 2)} />
        {/* right arm: waves from the shoulder */}
        <g transform={`rotate(${waveA} 402 330)`}>
          <path d="M400 330 C 430 380 440 470 444 590" stroke={SK.skinDark} strokeWidth={58} strokeLinecap="round" fill="none" opacity={fillIn(f, 2)} />
          <path d="M400 330 C 430 380 440 470 444 590" stroke={SK.skin} strokeWidth={48} strokeLinecap="round" fill="none" opacity={fillIn(f, 2)} />
        </g>
        {/* short sleeves over the tops of the arms */}
        <path d="M200 330 C 184 356 176 380 172 408" stroke={shirtDark} strokeWidth={66} strokeLinecap="round" fill="none" opacity={fillIn(f, 3)} />
        <path d="M200 330 C 184 356 176 380 172 408" stroke={shirt} strokeWidth={58} strokeLinecap="round" fill="none" opacity={fillIn(f, 3)} />
        <g transform={`rotate(${waveA} 402 330)`}>
          <path d="M400 330 C 416 356 424 380 428 408" stroke={shirtDark} strokeWidth={66} strokeLinecap="round" fill="none" opacity={fillIn(f, 3)} />
          <path d="M400 330 C 416 356 424 380 428 408" stroke={shirt} strokeWidth={58} strokeLinecap="round" fill="none" opacity={fillIn(f, 3)} />
        </g>
        {/* torso breathes */}
        <g transform={`translate(300 600) scale(1 ${breathe}) translate(-300 -600)`}>
          <Form d="M205 298 Q300 270 395 298 Q448 316 452 378 L440 612 H160 L148 378 Q152 316 205 298 Z" fill={shirt} stroke={shirtDark} f={f} i={3} />
          <path d="M262 290 Q300 330 338 290" stroke={shirtDark} strokeWidth={5} fill="none" opacity={fillIn(f, 3)} />
        </g>
        <Form d="M276 236 H324 V300 H276 Z" fill={SK.skin} stroke={SK.skinDark} f={f} i={4} sw={3} />
        {/* a clinician's stethoscope, draped round the neck */}
        {data.stethoscope ? (
          <g opacity={fillIn(f, 4)} fill="none" strokeLinecap="round">
            <path d="M262 292 Q250 360 272 420 Q284 452 300 452" stroke="#2A3550" strokeWidth={7} />
            <path d="M338 292 Q352 350 336 392" stroke="#2A3550" strokeWidth={7} />
            <circle cx={336} cy={402} r={13} fill="#C9CCD6" stroke="#5E6478" strokeWidth={5} />
          </g>
        ) : null}
        {/* head */}
        <Form d="M300 90 A 92 96 0 1 1 299.9 90 Z" fill={SK.skin} stroke={SK.skinDark} f={f} i={5} />
        <path d="M208 176 Q200 84 300 80 Q400 84 394 176 Q380 124 300 122 Q224 124 208 176 Z" fill={SK.hair} opacity={fillIn(f, 6)} />
        <g opacity={fillIn(f, 7)}>
          <ellipse cx={266} cy={190} rx={8} ry={8 * blink} fill={K.ink} />
          <ellipse cx={334} cy={190} rx={8} ry={8 * blink} fill={K.ink} />
          {/* worried: the inner ends of the brows lift */}
          <path d={`M252 ${164 + 4 * worry} L282 ${164 - 10 * worry}`} stroke={SK.hair} strokeWidth={6} strokeLinecap="round" opacity={0.4 + 0.6 * worry} />
          <path d={`M318 ${164 - 10 * worry} L348 ${164 + 4 * worry}`} stroke={SK.hair} strokeWidth={6} strokeLinecap="round" opacity={0.4 + 0.6 * worry} />
          <path d={`M270 228 Q300 ${228 + mouthCurve} 330 228`} stroke={K.ink} strokeWidth={6} strokeLinecap="round" fill="none" opacity={1 - smile} />
          {smile > 0 ? (
            <g opacity={smile}>
              <path d="M262 222 Q300 222 338 222 Q334 266 300 268 Q266 266 262 222 Z" fill="#8E2F3A" stroke={K.ink} strokeWidth={5} strokeLinejoin="round" />
              <path d="M268 224 H332 Q330 236 300 236 Q270 236 268 224 Z" fill="#fff" />
            </g>
          ) : null}
          <circle cx={244} cy={214} r={12} fill="#F28C8C" opacity={0.35} />
          <circle cx={356} cy={214} r={12} fill="#F28C8C" opacity={0.35} />
        </g>
        {/* hands */}
        <circle cx={156} cy={600} r={27} fill={SK.skin} stroke={SK.skinDark} strokeWidth={4} opacity={fillIn(f, 2)} />
        <g transform={`rotate(${waveA} 402 330)`}>
          <circle cx={444} cy={600} r={27} fill={SK.skin} stroke={SK.skinDark} strokeWidth={4} opacity={fillIn(f, 2)} />
        </g>
      </g>
    );
  };
  return {w: 600, h: 1000, layout: 'side', anchors, C: C_};
};

/* ================================================================ body map */
const BODY_W = 700;
const ROUTES: Record<string, P[]> = {
  head: [[362, 372], [356, 300], [352, 250], [348, 196]],
  armL: [[352, 300], [300, 300], [248, 318], [214, 430], [192, 560]],
  armR: [[352, 300], [404, 300], [452, 318], [486, 430], [508, 560]],
  trunk: [[366, 410], [352, 470], [350, 560], [350, 690]],
  legL: [[350, 690], [318, 760], [300, 900], [292, 1030]],
  legR: [[350, 690], [382, 760], [400, 900], [408, 1030]],
  kidL: [[350, 562], [306, 566]],
  kidR: [[350, 562], [394, 566]],
};
const body: ArtFactory = () => {
  const anchors: Record<string, P> = {brain: [350, 118], heart: [366, 392], kidneys: [350, 566], kidneyL: [300, 566], kidneyR: [400, 566], arteries: [350, 520], arm: [210, 450], leg: [305, 880], head: [350, 125], chest: [350, 400], strain: [350, 470], flow: [352, 300]};
  const torso = 'M235 250 Q350 226 465 250 Q490 262 488 300 L456 628 Q452 700 440 712 L260 712 Q248 700 244 628 L212 300 Q210 262 235 250 Z';
  const armL = 'M236 262 Q198 268 192 318 L166 590 Q164 628 188 630 Q210 632 214 598 L246 334 Z';
  const legL = 'M262 690 L260 1036 Q260 1064 298 1064 Q326 1064 324 1036 L350 724 Z';
  const parts = ['M350 42 A 84 88 0 1 1 349.9 42 Z', 'M322 200 H378 V256 H322 Z', torso, armL, mirror(armL, BODY_W), legL, mirror(legL, BODY_W)];
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const strain = on(c, 'strain') ? tw(f, c.at('strain')!, 30) : 0;
    const period = mix(BEAT, BEAT * 0.72, strain);
    const beat = Math.max(0, Math.sin(((f / period) % 1) * Math.PI * 2));
    const hurt = (a: string) => (on(c, a) ? tw(f, c.at(a)!, 24) : 0);
    const flowO = on(c, 'flow') || on(c, 'strain') ? 1 : 0.55;
    const art = draw(f, 3, 34);
    const organ = (a: string, base: string, bad = K.bad) => (hurt(a) ? mixColor(base, bad, hurt(a) * (0.55 + 0.25 * beat)) : base);
    return (
      <g>
        <Silhouette parts={parts} fill={K.bodyFill} stroke={K.bodyLine} f={f} i={0} />
        {/* lungs, faint, behind the heart */}
        <g opacity={0.8 * fillIn(f, 1)}>
          <path d="M340 300 C 300 300 268 340 262 420 C 258 470 290 486 330 470 Z" fill={K.lung} />
          <path d="M360 300 C 400 300 432 340 438 420 C 442 470 410 486 370 470 Z" fill={K.lung} />
        </g>
        {/* the arterial tree, drawn on, swelling under strain */}
        {Object.values(ROUTES).map((pts, k) => (
          <path key={k} d={poly(pts)} stroke={K.red} strokeWidth={mix(9, 13, strain) + strain * 2 * beat} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - art} />
        ))}
        {/* blood cells streaming out from the heart */}
        {Object.values(ROUTES).flatMap((pts, k) =>
          Array.from({length: 4}, (_, j) => {
            const u = (((f * mix(0.012, 0.02, strain) + j / 4 + hash(k) * 0.3) % 1) + 1) % 1;
            const [x, y] = along(pts, u);
            return <circle key={`${k}-${j}`} cx={x} cy={y} r={5.5} fill={K.redDark} opacity={art * flowO * clamp01(Math.min(u, 1 - u) * 6)} />;
          }),
        )}
        {/* brain */}
        <g opacity={fillIn(f, 2)}>
          <path d="M292 120 C 280 70 330 52 350 68 C 372 50 424 66 410 118 C 432 140 402 176 370 164 C 356 176 334 176 322 164 C 290 172 270 142 292 120 Z" fill={organ('brain', K.pink)} stroke={K.pinkDark} strokeWidth={4} />
          <path d="M350 72 C 344 100 356 130 348 162 M312 110 C 330 104 334 128 322 138 M384 104 C 368 106 372 130 388 136" stroke={K.pinkDark} strokeWidth={3} fill="none" opacity={0.7} />
        </g>
        {/* kidneys */}
        {[300, 400].map((x, k) => (
          <g key={x} opacity={fillIn(f, 2)} transform={`translate(${x} 566) scale(${k ? -1 : 1} 1)`}>
            <path d="M-8 -40 C -40 -44 -46 0 -36 26 C -26 50 6 46 8 24 C 0 14 0 -8 10 -18 C 12 -32 4 -38 -8 -40 Z" fill={organ('kidneys', K.kidney)} stroke={K.kidneyDark} strokeWidth={4} />
          </g>
        ))}
        {/* heart */}
        <g transform={`translate(366 392) scale(${1 + 0.07 * beat * (0.6 + strain)}) translate(-366 -392)`} opacity={fillIn(f, 2)}>
          <path d={heartPath(366, 392, 0.9)} fill={organ('heart', K.red, K.redDark)} stroke={K.redDark} strokeWidth={4} />
          <path d="M344 372 q 10 -12 24 -8" stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.6} />
        </g>
        <Ping x={350} y={118} r={70} f={f} at={c.at('brain')} color={K.bad} />
        <Ping x={366} y={392} r={52} f={f} at={c.at('heart')} color={K.bad} />
        <Ping x={350} y={566} r={78} f={f} at={c.at('kidneys')} color={K.bad} />
      </g>
    );
  };
  return {w: BODY_W, h: 1100, layout: 'side', anchors, C: C_};
};

/** Blend two #rrggbb colours. */
const mixColor = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(mix(v, pb[i], clamp01(t))).toString(16).padStart(2, '0')).join('')}`;
};

/* ================================================================ vessel (cross-section) */
const vessel: ArtFactory = () => {
  const CX = 500;
  const CY = 350;
  const anchors: Record<string, P> = {wall: [CX, CY - 245], lumen: [CX, CY], blood: [CX + 60, CY + 40], lining: [CX, CY + 200], outer: [CX + 290, CY], push: [CX + 150, CY - 150], stretch: [CX - 260, CY], stiff: [CX + 250, CY + 70], tear: [CX - 120, CY + 150]};
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const stiff = on(c, 'stiff') ? tw(f, c.at('stiff')!, 60, E.inOut) : 0;
    const beatU = ((f / BEAT) % 1 + 1) % 1;
    const beat = Math.pow(Math.max(0, Math.sin(beatU * Math.PI * 2)), 2);
    const elastic = on(c, 'stretch') || on(c, 'push') ? 1 : 0.35;
    const give = beat * 18 * elastic * (1 - 0.8 * stiff);
    const Rout = 290 + give;
    const Rmid = 262 + give;
    const Rin = mix(200, 138, stiff) + give * 0.9;
    const muscle = mixColor('#EF8790', '#B83B45', stiff);
    const tear = on(c, 'tear') ? tw(f, c.at('tear')!, 40) : 0;
    const ring = (r: number) => `M${CX - r} ${CY} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    const p = draw(f, 0, 32);
    const cells = Array.from({length: 11}, (_, j) => {
      const a = hash(j) * Math.PI * 2 + f * 0.01 * (j % 2 ? 1 : -1);
      const rr = (Rin - 40) * Math.sqrt(hash(j + 9));
      const x = CX + Math.cos(a) * rr;
      const y = CY + Math.sin(a) * rr;
      const s = 0.8 + 0.25 * Math.sin(f / 9 + j);
      return (
        <g key={j} transform={`translate(${x} ${y}) rotate(${hash(j + 3) * 180 + f * 0.6}) scale(${s})`} opacity={fillIn(f, 2)}>
          <ellipse rx={26} ry={17} fill={K.red} stroke={K.redDark} strokeWidth={3} />
          <ellipse rx={11} ry={6} fill="#FF9AA3" opacity={0.8} />
        </g>
      );
    });
    const arrows = on(c, 'push')
      ? Array.from({length: 8}, (_, k) => {
          const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
          const push = tw(f, c.at('push')! + k * 3, 14) * (0.55 + 0.45 * beat);
          const r0 = Rin * 0.45;
          const r1 = Rin - 16 + 10 * beat;
          const [x0, y0, x1, y1] = [CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * r1, CY + Math.sin(a) * r1];
          const h = 20;
          const ang = Math.atan2(y1 - y0, x1 - x0);
          return (
            <g key={k} stroke="#6E25A3" strokeWidth={9} strokeLinecap="round" fill="none" opacity={push}>
              <path d={`M${x0} ${y0} L${x1} ${y1}`} />
              <path d={`M${x1 - h * Math.cos(ang - 0.55)} ${y1 - h * Math.sin(ang - 0.55)} L${x1} ${y1} L${x1 - h * Math.cos(ang + 0.55)} ${y1 - h * Math.sin(ang + 0.55)}`} />
            </g>
          );
        })
      : null;
    const cracks = [0.6, 2.2, 3.9].map((a, k) => {
      const pts: P[] = Array.from({length: 5}, (_, q) => {
        const r = Rin + 4 + (q % 2 ? 14 : 0);
        const aa = a + (q - 2) * 0.07;
        return [CX + Math.cos(aa) * r, CY + Math.sin(aa) * r];
      });
      return <path key={k} d={poly(pts)} stroke={K.redDark} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tw(f, (c.at('tear') ?? 0) + k * 8, 18)} />;
    });
    const plaques = [1.4, 3.1, 5.0].map((a, k) => {
      const g = tw(f, (c.at('tear') ?? 0) + 30 + k * 12, 40, E.out);
      const x = CX + Math.cos(a) * (Rin - 8);
      const y = CY + Math.sin(a) * (Rin - 8);
      return <ellipse key={k} cx={x} cy={y} rx={34 * g} ry={20 * g} transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`} fill={K.fat} stroke={K.fatDark} strokeWidth={3} />;
    });
    return (
      <g>
        <path d={ring(Rout)} fill="#F9D0D3" stroke="#C0676A" strokeWidth={5} opacity={fillIn(f, 0)} />
        <path d={ring(Rout)} fill="none" stroke="#C0676A" strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
        <path d={ring(Rmid)} fill={muscle} opacity={fillIn(f, 1)} />
        {/* muscle striations */}
        {Array.from({length: 36}, (_, k) => {
          const a = (k / 36) * Math.PI * 2;
          return <path key={k} d={`M${CX + Math.cos(a) * (Rin + 10)} ${CY + Math.sin(a) * (Rin + 10)} L${CX + Math.cos(a + 0.05) * (Rmid - 10)} ${CY + Math.sin(a + 0.05) * (Rmid - 10)}`} stroke="#fff" strokeWidth={3} opacity={0.25 * fillIn(f, 1)} />;
        })}
        <path d={ring(Rin + 6)} fill="#FFE3E6" opacity={fillIn(f, 1)} />
        <path d={ring(Rin)} fill="#FFF3F4" stroke="#E8A0A6" strokeWidth={3} opacity={fillIn(f, 1)} />
        {cells}
        {tear ? plaques : null}
        {tear ? cracks : null}
        {arrows}
      </g>
    );
  };
  return {w: 1000, h: 700, layout: 'side', anchors, C: C_};
};

/* ================================================================ gauge */
const gauge: ArtFactory = (data = {}) => {
  const G = 300;
  const R = 230;
  // sweep: 0 → -210° (low, left) … 1 → 30° (high, right)
  const ang = (u: number) => ((-210 + 240 * u) * Math.PI) / 180;
  const pt = (u: number, r: number): P => [G + Math.cos(ang(u)) * r, G + Math.sin(ang(u)) * r];
  const anchors: Record<string, P> = {dial: [G, G], needle: pt(0.45, 120), low: pt(0.1, R - 30), ok: pt(0.35, R - 30), high: pt(0.88, R - 30), rise: pt(0.88, R - 30)};
  const arc = (u0: number, u1: number, r: number) => {
    const [a, b] = [pt(u0, r), pt(u1, r)];
    return `M${a[0]} ${a[1]} A ${r} ${r} 0 ${(u1 - u0) * 240 > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const start = data.start ?? 0.38;
    let u = start + 0.02 * Math.sin(f / 7);
    if (on(c, 'rise')) u = mix(u, 0.9 + 0.025 * Math.sin(f / 3), tw(f, c.at('rise')!, 70, E.inOut));
    if (on(c, 'ok') && (!on(c, 'rise') || c.at('ok')! > c.at('rise')!)) u = mix(u, 0.38 + 0.015 * Math.sin(f / 7), tw(f, c.at('ok')!, 40, E.inOut));
    const [nx, ny] = pt(u, R - 50);
    return (
      <g>
        <Form d={`M${G - R - 30} ${G} a${R + 30} ${R + 30} 0 1 0 ${2 * (R + 30)} 0 a${R + 30} ${R + 30} 0 1 0 ${-2 * (R + 30)} 0Z`} fill="#fff" stroke={K.steelDark} f={f} i={0} sw={8} />
        <g opacity={fillIn(f, 1)} strokeWidth={36} fill="none" strokeLinecap="butt">
          <path d={arc(0, 0.22, R - 30)} stroke={K.low} />
          <path d={arc(0.22, 0.55, R - 30)} stroke={K.ok} />
          <path d={arc(0.55, 0.72, R - 30)} stroke={K.warn} />
          <path d={arc(0.72, 1, R - 30)} stroke={K.bad} />
        </g>
        {Array.from({length: 13}, (_, k) => {
          const [a, b] = [pt(k / 12, R - 62), pt(k / 12, R - 80)];
          return <path key={k} d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} stroke={K.steelDark} strokeWidth={5} strokeLinecap="round" opacity={fillIn(f, 1)} />;
        })}
        <g opacity={fillIn(f, 2)}>
          <path d={`M${G} ${G} L${nx} ${ny}`} stroke={K.ink} strokeWidth={14} strokeLinecap="round" />
          <circle cx={G} cy={G} r={30} fill={K.ink} />
          <circle cx={G} cy={G} r={11} fill="#fff" />
        </g>
        <Ping x={anchors.high[0]} y={anchors.high[1]} r={46} f={f} at={c.at('rise') != null ? c.at('rise')! + 60 : null} color={K.bad} />
      </g>
    );
  };
  return {w: 600, h: 600, layout: 'side', anchors, C: C_};
};

/* ================================================================ icons */
type IconDraw = (f: number, act: number) => React.ReactNode; // act = frames since the icon's event, or -1
const ICONS: Record<string, IconDraw> = {
  salt: (f, act) => {
    const tilt = act >= 0 ? -38 * tw(act, 0, 16, E.out) : 0;
    const grains =
      act >= 0
        ? Array.from({length: 18}, (_, k) => {
            const t = ((act + k * 5) % 40) / 40;
            return <rect key={k} x={170 + (hash(k) - 0.5) * 60 + t * 20} y={170 + t * 260} width={9} height={9} fill="#fff" stroke={K.steelDark} strokeWidth={2} opacity={clamp01(1 - t) * tw(act, 10, 8)} />;
          })
        : null;
    return (
      <g>
        {grains}
        <g transform={`rotate(${tilt} 250 260)`}>
          <Form d="M190 150 Q190 110 250 110 Q310 110 310 150 L310 180 H190 Z" fill="#D5D3DC" stroke={K.steelDark} f={f} i={0} />
          <Form d="M196 180 H304 L336 420 Q338 452 300 452 H200 Q162 452 164 420 Z" fill="#BFE3FF" stroke="#5B8DB8" f={f} i={1} />
          <path d="M206 300 H294 L304 410 Q304 428 288 428 H212 Q196 428 196 410 Z" fill="#F4F4F6" opacity={fillIn(f, 2)} />
          {[220, 250, 280].map((x) => (
            <circle key={x} cx={x} cy={138} r={6} fill={K.steelDark} opacity={fillIn(f, 2)} />
          ))}
        </g>
      </g>
    );
  },
  vegetables: (f, act) => {
    const bob = (k: number) => (act >= 0 ? -10 * Math.max(0, Math.sin((act - k * 6) / 5)) * Math.exp(-Math.max(0, act - k * 6) / 30) : 0);
    return (
      <g>
        <g transform={`translate(0 ${bob(0)})`}>
          {/* broccoli */}
          <Form d="M150 300 L140 430 Q150 446 172 446 Q196 446 200 430 L186 300 Z" fill="#9BD174" stroke="#4E8A2E" f={f} i={0} />
          {[
            [120, 270, 48],
            [170, 240, 56],
            [222, 272, 48],
            [150, 310, 40],
            [200, 312, 40],
          ].map(([x, y, r], k) => (
            <circle key={k} cx={x} cy={y} r={r} fill="#3FA34D" stroke="#256B30" strokeWidth={5} opacity={fillIn(f, 1)} />
          ))}
        </g>
        <g transform={`translate(0 ${bob(1)})`}>
          {/* carrot */}
          <Form d="M300 210 Q350 200 360 240 L300 460 Q290 470 284 456 L270 250 Q272 214 300 210 Z" fill="#F7931E" stroke="#B35F08" f={f} i={2} />
          <path d="M318 206 Q300 150 280 140 M322 206 Q330 150 350 136 M320 206 Q318 160 322 130" stroke="#3FA34D" strokeWidth={10} strokeLinecap="round" fill="none" opacity={fillIn(f, 2)} />
        </g>
        <g transform={`translate(0 ${bob(2)})`}>
          {/* tomato */}
          <Form d="M400 300 A 72 66 0 1 1 399.9 300 Z" fill="#E5484D" stroke={K.redDark} f={f} i={3} />
          <path d="M378 304 L400 290 L422 304 M400 290 L400 270" stroke="#3FA34D" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={fillIn(f, 3)} />
          <ellipse cx={380} cy={340} rx={14} ry={9} fill="#fff" opacity={0.5 * fillIn(f, 3)} />
        </g>
      </g>
    );
  },
  fruit: (f, act) => (
    <g transform={`rotate(${act >= 0 ? 6 * Math.sin(act / 5) * Math.exp(-act / 40) : 0} 250 300)`}>
      <Form d="M250 190 C 190 150 110 190 120 290 C 130 400 200 440 250 420 C 300 440 370 400 380 290 C 390 190 310 150 250 190 Z" fill="#E5484D" stroke={K.redDark} f={f} i={0} />
      <path d="M250 190 Q246 150 262 120" stroke="#7A4A22" strokeWidth={10} strokeLinecap="round" fill="none" opacity={fillIn(f, 1)} />
      <Form d="M262 150 Q300 110 340 140 Q300 170 262 150 Z" fill="#3FA34D" stroke="#256B30" f={f} i={1} sw={3} />
      <ellipse cx={180} cy={260} rx={18} ry={30} fill="#fff" opacity={0.4 * fillIn(f, 1)} />
    </g>
  ),
  walk: (f, act) => {
    const t = (act >= 0 ? act : 0) / 7;
    const sw = act >= 0 ? Math.sin(t) : 0.25;
    const limb = (hip: P, a: number, len: number, col: string) => {
      const knee: P = [hip[0] + Math.sin(a) * len * 0.5, hip[1] + Math.cos(a) * len * 0.5];
      const foot: P = [knee[0] + Math.sin(a * 0.6 - 0.15) * len * 0.5, knee[1] + Math.cos(a * 0.6 - 0.15) * len * 0.5];
      return <path d={poly([hip, knee, foot])} stroke={col} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    };
    const bounce = act >= 0 ? -6 * Math.abs(Math.cos(t)) : 0;
    return (
      <g transform={`translate(0 ${bounce})`} opacity={fillIn(f, 0)}>
        <ellipse cx={250} cy={462} rx={120} ry={12} fill={K.ink} opacity={0.08} />
        {limb([250, 300], -0.5 * sw, 150, K.trousersDark)}
        {limb([250, 300], 0.5 * sw, 150, K.trousers)}
        {limb([250, 190], 0.6 * sw, 110, K.skinDark)}
        <path d="M250 180 L250 305" stroke={K.shirt} strokeWidth={62} strokeLinecap="round" />
        {limb([250, 190], -0.6 * sw, 110, K.skin)}
        <circle cx={256} cy={124} r={40} fill={K.skin} stroke={K.skinDark} strokeWidth={5} />
        <path d="M218 118 Q220 78 258 80 Q296 84 294 118 Q276 100 256 100 Q236 100 218 118 Z" fill={K.hair} />
      </g>
    );
  },
  cigarette: (f, act) => (
    <g>
      <Form d="M90 300 H360 V350 H90 Z" fill="#fff" stroke={K.steelDark} f={f} i={0} />
      <Form d="M360 300 H420 V350 H360 Z" fill="#E9A23B" stroke="#A86E17" f={f} i={1} />
      <path d="M90 300 H116 V350 H90 Z" fill="#F26B3A" opacity={fillIn(f, 1)} />
      {Array.from({length: 3}, (_, k) => {
        const t = (((act >= 0 ? act : f) + k * 22) % 66) / 66;
        return <path key={k} d={`M100 ${290 - t * 170} q -30 -30 0 -60 q 30 -30 0 -60`} stroke="#A7A2B8" strokeWidth={10} strokeLinecap="round" fill="none" opacity={(1 - t) * 0.7 * fillIn(f, 1)} />;
      })}
    </g>
  ),
  alcohol: (f) => (
    <g>
      <Form d="M170 120 H330 L310 300 Q300 340 250 340 Q200 340 190 300 Z" fill="#fff" stroke={K.steelDark} f={f} i={0} />
      <path d="M180 200 H320 L308 296 Q300 324 250 324 Q200 324 192 296 Z" fill="#B4234C" opacity={0.85 * fillIn(f, 1)} />
      <Form d="M240 340 H260 V440 H240 Z" fill="#fff" stroke={K.steelDark} f={f} i={1} sw={3} />
      <Form d="M180 440 H320 Q320 460 250 460 Q180 460 180 440 Z" fill="#fff" stroke={K.steelDark} f={f} i={2} sw={3} />
    </g>
  ),
  calendar: (f, act) => (
    <g>
      {[0, 1].map((k) => {
        const x = 70 + k * 200;
        const tick = tw(act, k * 18, 14, E.out);
        return (
          <g key={k} transform={`rotate(${k ? 5 : -5} ${x + 90} 280)`}>
            <Form d={`M${x} 160 H${x + 180} Q${x + 196} 160 ${x + 196} 176 V380 Q${x + 196} 396 ${x + 180} 396 H${x} Q${x - 16} 396 ${x - 16} 380 V176 Q${x - 16} 160 ${x} 160 Z`} fill="#fff" stroke={K.steelDark} f={f} i={k} />
            <path d={`M${x - 16} 176 Q${x - 16} 160 ${x} 160 H${x + 180} Q${x + 196} 160 ${x + 196} 176 V214 H${x - 16} Z`} fill="#D8148C" opacity={fillIn(f, k)} />
            {[0, 1, 2].map((r) =>
              [0, 1, 2, 3].map((q) => <rect key={`${r}${q}`} x={x + 6 + q * 42} y={236 + r * 46} width={28} height={28} rx={6} fill="#ECE9F2" opacity={fillIn(f, k)} />),
            )}
            {act >= 0 ? <path d={`M${x + 30} 300 L${x + 80} 350 L${x + 160} 240`} stroke={K.ok} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} /> : null}
          </g>
        );
      })}
    </g>
  ),
  scale: (f, act) => (
    <g>
      <Form d="M110 360 H390 Q410 360 410 380 V430 Q410 450 390 450 H110 Q90 450 90 430 V380 Q90 360 110 360 Z" fill="#fff" stroke={K.steelDark} f={f} i={0} />
      <Form d="M190 376 H310 V410 H190 Z" fill="#0F1B2D" stroke={K.ink} f={f} i={1} sw={3} />
      <path d={`M204 393 H${204 + 92 * tw(act, 0, 30)}`} stroke="#5EEAD4" strokeWidth={10} strokeLinecap="round" opacity={fillIn(f, 1)} />
    </g>
  ),
  pill: (f) => (
    <g>
      <g transform="rotate(-35 250 280)">
        <Form d="M160 240 H250 V330 H160 A 45 45 0 0 1 160 240 Z" fill="#fff" stroke={K.steelDark} f={f} i={0} />
        <Form d="M250 240 H340 A 45 45 0 0 1 340 330 H250 Z" fill="#D8148C" stroke="#8E0F5E" f={f} i={1} />
      </g>
    </g>
  ),
  water: (f, act) => (
    <g>
      <Form d="M170 130 H330 L310 440 Q308 460 288 460 H212 Q192 460 190 440 Z" fill="#fff" stroke={K.steelDark} f={f} i={0} />
      <path d={`M${178 + 4} ${mix(250, 220, act >= 0 ? 0.5 + 0.5 * Math.sin(act / 8) : 0)} Q250 240 322 250 L310 440 Q308 454 288 454 H212 Q194 454 192 440 Z`} fill="#7CC4F4" opacity={0.8 * fillIn(f, 1)} />
    </g>
  ),
  sleep: (f) => (
    <g>
      <Form d="M320 110 A 170 170 0 1 0 420 360 A 140 140 0 1 1 320 110 Z" fill="#6E25A3" stroke="#4A1570" f={f} i={0} />
    </g>
  ),
  stethoscope: (f) => (
    <g>
      <path d="M170 110 V230 Q170 330 250 330 Q330 330 330 230 V110" stroke={K.ink} strokeWidth={16} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 0)} />
      <path d="M250 330 V380 Q250 440 320 440 Q370 440 370 390" stroke={K.ink} strokeWidth={16} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 1)} />
      <Form d="M370 330 A 50 50 0 1 1 369.9 330 Z" fill={K.steel} stroke={K.steelDark} f={f} i={2} />
      <circle cx={370} cy={380} r={22} fill={K.steelDark} opacity={fillIn(f, 2)} />
    </g>
  ),
};
const icon: ArtFactory = (data = {}) => {
  const draw_ = ICONS[data.name] ?? ICONS.salt;
  const C_: React.FC<ArtCtx> = (c) => <g>{draw_(c.f, since(c, 'act'))}</g>;
  return {w: 500, h: 500, layout: 'side', anchors: {item: [250, 280], act: [250, 280]}, C: C_};
};
export const ICON_NAMES = Object.keys(ICONS);

export const BODY: Record<string, ArtFactory> = {person, body, vessel, gauge, icon};
