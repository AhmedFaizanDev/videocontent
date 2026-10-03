/**
 * Outro — the closing brand moment. A heartbeat line draws across a bright page and peaks;
 * from the peak the logo lockup is revealed (masked wipe, soft glow, a light sweep across it);
 * the line settles into an underline and the signoff rises. Sound: heartbeat → sting.
 */
import React from 'react';
import type {OutroScene as OutroSpec, SceneTiming} from '../spec';
import type {TxPlan} from '../schedule';
import {fonts, ink} from '../theme';
import {E, mix, tw, useSceneFrame} from '../motion';
import {SceneFrame, Sfx} from './stage';
import {Logo, useProject} from './brand';

const H = 150; // lockup height
const CY = 470;

export const OutroScene: React.FC<{scene: SceneTiming; spec: OutroSpec; enter: TxPlan; exit: TxPlan | null}> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const project = useProject();
  const W = H * project.brand.art.lockupAspect;
  const x0 = 960 - W / 2;
  // the heartbeat line: flat, one PQRST complex under the logo's centre, flat again
  const settle = tw(f, 40, 30, E.inOut); // the spike flattens into an underline once the logo lands
  const amp = 1 - settle;
  const pts: [number, number][] = [];
  for (let x = 0; x <= 1920; x += 8) {
    const d = x - 960;
    const y = CY + 150 + amp * (-(Math.abs(d) < 26 ? 150 * (1 - Math.abs(d) / 26) : 0) + (d > 26 && d < 60 ? 38 * Math.sin(((d - 26) / 34) * Math.PI) : 0) - (d > 90 && d < 170 ? 22 * Math.sin(((d - 90) / 80) * Math.PI) : 0));
    pts.push([x, y]);
  }
  const line = `M${pts.map((p) => p.join(' ')).join(' L')}`;
  const draw = tw(f, 4, 30, E.inOut);
  const lineO = 1 - 0.55 * settle;
  const reveal = tw(f, 30, 34, E.out);
  const glow = tw(f, 30, 20, E.out) * (1 - 0.6 * tw(f, 60, 40));
  const sweep = mix(-0.3, 1.3, tw(f, 64, 36, E.inOut));
  const lineY = mix(0, H / 2 + 44 - 150, settle);
  const tagO = tw(f, 70, 20, E.out);
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} bare>
      <div style={{position: 'absolute', inset: -80, background: 'radial-gradient(ellipse at 30% 30%, rgba(216,20,140,0.10), transparent 55%), radial-gradient(ellipse at 75% 70%, rgba(122,36,161,0.10), transparent 55%), #FBFAFD'}} />
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1920} height={1080}>
        <defs>
          <linearGradient id="outro-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#E0168A" stopOpacity={0} />
            <stop offset="0.35" stopColor="#E0168A" />
            <stop offset="0.65" stopColor="#6E25A3" />
            <stop offset="1" stopColor="#6E25A3" stopOpacity={0} />
          </linearGradient>
          <filter id="outro-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <g transform={`translate(0 ${lineY})`} opacity={lineO}>
          <path d={line} stroke="url(#outro-line)" strokeWidth={10} fill="none" filter="url(#outro-glow)" opacity={0.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <path d={line} stroke="url(#outro-line)" strokeWidth={4.5} fill="none" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: x0, top: CY - H / 2, width: W, height: H, filter: `drop-shadow(0 0 ${24 * glow}px rgba(216,20,140,${0.45 * glow}))`}}>
        <Logo height={H} reveal={reveal} />
        {/* a light sweep across the finished mark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(100deg, transparent ${sweep * 100 - 12}%, rgba(255,255,255,0.75) ${sweep * 100}%, transparent ${sweep * 100 + 12}%)`,
            mixBlendMode: 'screen',
            opacity: reveal >= 0.99 ? 1 : 0,
          }}
        />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: CY + H / 2 + 86, textAlign: 'center', fontFamily: fonts.heading, fontWeight: 600, fontSize: 38, color: ink.soft, opacity: tagO, transform: `translateY(${(1 - tagO) * 16}px)`}}>
        {spec.line ?? project.brand.signoff}
      </div>
      <Sfx at={2} name="heartbeat" volume={0.55} />
      <Sfx at={30} name="sting" volume={0.5} />
      <Sfx at={30} name="boom" volume={0.25} />
    </SceneFrame>
  );
};
