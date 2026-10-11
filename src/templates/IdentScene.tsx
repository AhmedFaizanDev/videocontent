/**
 * Ident — the MedSkills opening sting (silent scene, ~3.2 s). One unbroken transformation on
 * deep navy: a glowing point traces a heartbeat line; its spike keeps drawing into the shield
 * outline; the white mark blooms inside the traced shield, slides left as the wordmark wipes
 * in beside it; then the camera pushes through the mark into the film (hard cut follows).
 * Sound: beep on the spike, soft sting on the bloom, whoosh on the push-through.
 */
import React from 'react';
import type {IdentScene as IdentSpec, SceneTiming} from '../spec';
import type {TxPlan} from '../schedule';
import {E, clamp01, mix, tw, useSceneFrame} from '../motion';
import {SceneFrame, Sfx} from './stage';
import {Logo, useProject} from './brand';

const CX = 960;
const CY = 520;
const ICON = 170; // icon height
const LOCK = 150; // lockup height

/** Along a polyline at fraction u, with its total length. */
const measure = (pts: [number, number][]) => {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const at = (u: number): [number, number] => {
    let d = clamp01(u) * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i]) return [mix(pts[i][0], pts[i + 1][0], seg[i] ? d / seg[i] : 0), mix(pts[i][1], pts[i + 1][1], seg[i] ? d / seg[i] : 0)];
      d -= seg[i];
    }
    return pts[pts.length - 1];
  };
  return {at, total};
};

export const IdentScene: React.FC<{scene: SceneTiming; spec: IdentSpec; enter: TxPlan; exit: TxPlan | null}> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const project = useProject();
  const D = scene.durationInFrames;
  // phase clock, scaled to the scene's length (designed at 96 frames)
  const k = D / 96;
  const T = (x: number) => x * k;

  // 1) heartbeat line from the left edge to the centre, a spike at the centre
  const line: [number, number][] = [[-40, CY + 60], [CX - 180, CY + 60], [CX - 150, CY + 44], [CX - 120, CY + 60], [CX - 40, CY + 60], [CX - 20, CY + 90], [CX, CY - 150]];
  // 2) from the spike's top the pen traces a circle around the mark, clockwise (the spike ends on it)
  const shield: [number, number][] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    shield.push([CX + Math.sin(a) * 120, CY - 30 - Math.cos(a) * 120]);
  }
  const L = measure(line);
  const S = measure(shield);
  const pLine = tw(f, T(2), T(26), E.inOut);
  const pShield = tw(f, T(26), T(24), E.inOut);
  const pen = pShield > 0 && pShield < 1 ? S.at(pShield) : pLine < 1 ? L.at(pLine) : null;
  const drawn = (pts: [number, number][], m: ReturnType<typeof measure>, p: number) => {
    const out: string[] = [];
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i && acc + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > p * m.total) {
        const e = m.at(p);
        out.push(`${e[0].toFixed(1)} ${e[1].toFixed(1)}`);
        break;
      }
      if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      out.push(`${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`);
    }
    return out.length > 1 ? `M${out.join(' L')}` : '';
  };
  const lineFade = 1 - tw(f, T(34), T(14), E.inOut);
  const shieldFade = 1 - tw(f, T(52), T(14), E.inOut);
  // 3) the white mark blooms inside the traced shield, then slides left for the wordmark
  const bloom = tw(f, T(46), T(14), E.out);
  const blur = (1 - bloom) * 14;
  const lockW = LOCK * project.brand.art.lockupAspect;
  const iconLeft = CX - lockW / 2 + (LOCK * project.brand.art.iconAspect) / 2; // where the lockup's own icon sits
  const slide = tw(f, T(60), T(14), E.inOut);
  const iconX = mix(CX, iconLeft, slide);
  const iconH = mix(ICON, LOCK, slide);
  const handoff = tw(f, T(72), T(4), E.linear); // the lockup takes over exactly where the icon landed
  const wipe = tw(f, T(66), T(16), E.out);
  // 4) push-through into the film
  const push = tw(f, T(84), T(12), E.in);
  const scale = 1 + 2.4 * push;
  const fade = 1 - push;
  const ring = f >= T(46) ? ((f - T(46)) % 40) / 40 : -1;
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} bare>
      <div style={{position: 'absolute', inset: -80, background: 'radial-gradient(ellipse at 50% 46%, #FFFFFF 0%, #F7F8FA 55%, #ECEEF3 100%)'}} />
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${iconX}px ${CY - 30}px`, transform: `scale(${scale})`, opacity: fade}}>
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1920} height={1080}>
          <defs>
            <linearGradient id="ident-g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#FF4FB5" />
              <stop offset="1" stopColor="#9B5CFF" />
            </linearGradient>
            <filter id="ident-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <g opacity={lineFade}>
            <path d={drawn(line, L, pLine)} stroke="url(#ident-g)" strokeWidth={12} fill="none" filter="url(#ident-glow)" opacity={0.7} />
            <path d={drawn(line, L, pLine)} stroke="url(#ident-g)" strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <g opacity={shieldFade}>
            <path d={drawn(shield, S, pShield)} stroke="url(#ident-g)" strokeWidth={12} fill="none" filter="url(#ident-glow)" opacity={0.7} />
            <path d={drawn(shield, S, pShield)} stroke="url(#ident-g)" strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {pen ? (
            <g>
              <circle cx={pen[0]} cy={pen[1]} r={16} fill="#FF7AC8" opacity={0.5} filter="url(#ident-glow)" />
              <circle cx={pen[0]} cy={pen[1]} r={7} fill="#D8148C" />
            </g>
          ) : null}
          {ring >= 0 && f < T(84) ? <circle cx={iconX} cy={CY - 30} r={100 + 160 * ring} fill="none" stroke="#FF4FB5" strokeWidth={3} opacity={(1 - ring) * 0.5 * bloom} /> : null}
        </svg>
        {/* the mark: standalone icon until the lockup takes over at the same place */}
        <div style={{position: 'absolute', left: iconX - (iconH * project.brand.art.iconAspect) / 2, top: CY - 30 - iconH / 2, opacity: bloom * (1 - handoff), filter: `blur(${blur.toFixed(1)}px) drop-shadow(0 6px ${14 * bloom}px rgba(122,36,161,0.25))`, transform: `scale(${mix(0.82, 1, bloom)})`}}>
          <Logo height={iconH} variant="icon" />
        </div>
        <div style={{position: 'absolute', left: CX - lockW / 2, top: CY - 30 - LOCK / 2, opacity: handoff, filter: 'drop-shadow(0 6px 14px rgba(122,36,161,0.2))'}}>
          <Logo height={LOCK} reveal={mix(0.27, 1, wipe)} />
        </div>
      </div>
      <Sfx at={T(26)} name="beep" volume={0.45} />
      <Sfx at={T(46)} name="sting" volume={0.45} />
      <Sfx at={T(80)} name="whoosh" volume={0.5} />
    </SceneFrame>
  );
};
