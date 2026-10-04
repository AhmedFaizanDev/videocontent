/**
 * Pack reprocessing: flexible-endoscope reprocessing equipment (flat, colourful house idiom).
 *   leakTest              scope immersed in a basin, hand leak tester (bulb + gauge); event bubbles.
 *   endoscopeReprocessor  AER with lid open, scope coiled in the basin, channel connectors; event flush.
 *   dryingCabinet         glass-door cabinet, scopes hanging vertical, valves removed; event airflow.
 */
import React from 'react';
import {E, clamp01, mix, tw} from '../../motion';
import {type ArtCtx, type ArtFactory, base, draw, fillIn, circ, rect} from '../kit';

type P = [number, number];
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const STEEL = '#E7E5EE', STEEL_D = '#8E88A3';
const WATER = '#CFE8F7', WATER_D = '#5B9BC4';
const SCOPE = '#2B2B30', SCOPE_D = '#0B0B0D';
const TEAL = '#0E9F95', TEAL_D = '#0A6B65';

/** A flat form: own-hue outline draws on, the fill follows. */
const F: React.FC<{d: string; fill: string; stroke: string; f: number; i: number; sw?: number; fo?: number}> = ({d, fill, stroke, f, i, sw = 4, fo = 1}) => (
  <>
    <path d={d} fill={fill} opacity={fo * fillIn(f, i)} />
    <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, i)} />
  </>
);
/** A hose / insertion tube: dark casing, coloured core, drawn on along its length. */
const Hose: React.FC<{d: string; f: number; i: number; w: number; color: string; dark: string}> = ({d, f, i, w, color, dark}) => {
  const p = draw(f, i, 34);
  return (
    <>
      <path d={d} fill="none" stroke={dark} strokeWidth={w} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      <path d={d} fill="none" stroke={color} strokeWidth={w - 5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={Math.max(3, w / 6)} strokeLinecap="round" opacity={0.22} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </>
  );
};

/** Shared gradients (Servier-like soft shading). */
const Defs = () => (
  <defs>
    <linearGradient id="rp-grey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8E8E95" /><stop offset="0.45" stopColor="#5C5C63" /><stop offset="1" stopColor="#38383E" /></linearGradient>
    <linearGradient id="rp-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F7F6FA" /><stop offset="0.6" stopColor="#E3E0EA" /><stop offset="1" stopColor="#CFCBDA" /></linearGradient>
    <linearGradient id="rp-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#DDF0FA" /><stop offset="1" stopColor="#A9D3EC" /></linearGradient>
    <linearGradient id="rp-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2F2F4" /><stop offset="1" stopColor="#B9B9C0" /></linearGradient>
    <linearGradient id="rp-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F06A6E" /><stop offset="1" stopColor="#C8323C" /></linearGradient>
  </defs>
);
const GREY_D = '#2E2E33';
/** Endoscope control body (as the Servier scope): eyepiece cap, tapered grey grip, side
 *  instrument port, strain relief. Local: eyepiece at x≈-70, insertion tube leaves at (100,0),
 *  umbilical leaves underneath at (-30,24). */
const ScopeBody: React.FC<{x: number; y: number; rot?: number; s?: number; f: number; i: number; open?: boolean}> = ({x, y, rot = 0, s = 1, f, i, open}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <F f={f} i={i} d="M70 -11 L102 -5 V5 L70 11 Z" fill="#2B2B30" stroke={SCOPE_D} sw={3} />
    <F f={f} i={i} d="M18 -24 L26 -48 L38 -44 L32 -22 Z" fill="url(#rp-cap)" stroke="#6B6B73" sw={3} />
    <F f={f} i={i} d={rect(-72, -26, 24, 52, 5)} fill="url(#rp-cap)" stroke="#6B6B73" sw={3} />
    <F f={f} i={i} d="M-50 -28 C-20 -30 30 -28 66 -18 C72 -14 72 14 66 18 C30 26 -20 30 -50 28 C-54 10 -54 -10 -50 -28 Z" fill="url(#rp-grey)" stroke={GREY_D} sw={3} />
    <path d="M-38 -16 C-10 -19 20 -18 44 -13" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.45 * fillIn(f, i)} />
    {open ? (
      <>
        <circle cx={-14} cy={4} r={9} fill="#F6F5FA" stroke={GREY_D} strokeWidth={3} opacity={fillIn(f, i)} />
        <circle cx={14} cy={6} r={9} fill="#F6F5FA" stroke={GREY_D} strokeWidth={3} opacity={fillIn(f, i)} />
      </>
    ) : (
      <>
        <circle cx={-14} cy={4} r={9} fill="#9A9AA2" stroke={GREY_D} strokeWidth={3} opacity={fillIn(f, i)} />
        <circle cx={14} cy={6} r={9} fill="#9A9AA2" stroke={GREY_D} strokeWidth={3} opacity={fillIn(f, i)} />
      </>
    )}
  </g>
);
/** Grey light-guide connector at the end of the umbilical, with its metal prong. */
const Connector: React.FC<{x: number; y: number; rot?: number; s?: number; f: number; i: number}> = ({x, y, rot = 0, s = 1, f, i}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <F f={f} i={i} d={rect(30, -5, 50, 10, 4)} fill="url(#rp-cap)" stroke="#6B6B73" sw={3} />
    <F f={f} i={i} d="M-40 -20 C-10 -24 20 -22 30 -16 V16 C20 22 -10 24 -40 20 Z" fill="url(#rp-grey)" stroke={GREY_D} sw={3} />
    <path d="M-30 -11 H16" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.45 * fillIn(f, i)} />
  </g>
);

/* ------------------------------------------------------------------ leakTest (1000 × 620) */
const leakTest: ArtFactory = () => {
  const breach: P = [669, 395];
  const anchors: Record<string, P> = {
    basin: [930, 470], leakTester: [190, 450], gauge: [190, 200], controlBody: [490, 380], insertionTube: [885, 468], breach, bubbles: [669, 345],
  };
  const C: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const b = c.at('bubbles');
    const since = b != null ? f - b : -1;
    const leak = since >= 0 ? tw(f, b as number, 30, E.inOut) : 0;
    const press = tw(f, 20, 70, E.out) * (1 - 0.45 * (since >= 0 ? tw(f, b as number, 160, E.out) : 0));
    const ang = mix(-130, 60, press);
    const squeeze = 1 - 0.08 * Math.max(0, Math.sin(f / 9)) * (1 - tw(f, 90, 20));
    const wv = Math.sin(f / 20);
    return (
      <g>
        <Defs />
        <F f={f} i={0} d="M380 290 L960 290 L930 585 L410 585 Z" fill="url(#rp-steel)" stroke={STEEL_D} sw={5} />
        <F f={f} i={1} d={`M394 ${322 + wv * 2} Q670 ${314 - wv * 3} 948 ${322 + wv * 2} L930 572 L410 572 Z`} fill="url(#rp-water)" stroke={WATER_D} sw={3} />
        <path d="M430 345 Q600 336 760 342" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.6 * fillIn(f, 1)} />
        {/* umbilical out over the rim to the connector */}
        <Hose f={f} i={2} w={22} color={SCOPE} dark={SCOPE_D} d="M440 404 C415 410 400 360 396 300 C393 262 372 252 350 252" />
        {/* insertion tube with lighter bending section and tip */}
        <Hose f={f} i={3} w={18} color={SCOPE} dark={SCOPE_D} d="M570 380 C640 380 700 400 760 440 C840 490 905 520 885 468 C862 418 780 420 742 470 C712 510 680 536 640 538" />
        <Hose f={f} i={4} w={16} color="#5A5A62" dark={SCOPE_D} d="M642 538 C622 540 604 536 590 526" />
        <ScopeBody f={f} i={4} x={470} y={380} />
        <Connector f={f} i={5} x={340} y={252} rot={180} s={0.8} />
        <F f={f} i={6} d={rect(258, 243, 24, 18, 4)} fill="url(#rp-cap)" stroke="#6B6B73" sw={3} />
        <Hose f={f} i={6} w={12} color="#F5C451" dark="#B7862A" d="M260 252 C246 256 242 300 230 330" />
        {/* leak tester: pressure bulb + gauge */}
        <F f={f} i={7} d="M150 330 C120 380 120 520 190 540 C260 520 260 380 230 330 Z" fill="url(#rp-red)" stroke="#A3202E" sw={4} />
        <g transform={`translate(190 435) scale(${squeeze} 1) translate(-190 -435)`} opacity={0.45 * fillIn(f, 7)}>
          <path d="M165 380 C150 420 155 480 190 500" fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
        </g>
        <F f={f} i={8} d={rect(176, 280, 28, 54, 6)} fill="url(#rp-cap)" stroke={STEEL_D} sw={3} />
        <F f={f} i={8} d={circ(190, 200, 86)} fill="url(#rp-steel)" stroke={STEEL_D} sw={5} />
        <F f={f} i={9} d={circ(190, 200, 68)} fill="#FFFFFF" stroke={STEEL_D} sw={3} />
        <path d="M134 230 A62 62 0 1 1 246 230" fill="none" stroke="#22A55B" strokeWidth={9} opacity={fillIn(f, 9)} />
        <path d="M134 230 A62 62 0 0 1 128 196" fill="none" stroke="#F59E0B" strokeWidth={9} opacity={fillIn(f, 9)} />
        <g transform={`rotate(${ang} 190 200)`} opacity={fillIn(f, 10)}>
          <path d="M184 204 L190 142 L196 204 Z" fill="#A3202E" />
        </g>
        <circle cx={190} cy={200} r={9} fill={STEEL_D} opacity={fillIn(f, 10)} />
        <path d="M140 160 A62 62 0 0 1 200 136" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.7 * fillIn(f, 10)} />
        {/* breach: a torn slit in the sheath */}
        <g opacity={fillIn(f, 10)} transform={`rotate(18 ${breach[0]} ${breach[1]})`}>
          <ellipse cx={breach[0]} cy={breach[1]} rx={12} ry={6} fill="#E11D48" stroke="#9F1239" strokeWidth={3} />
          <path d={`M${breach[0] - 8} ${breach[1]} H${breach[0] + 8}`} stroke="#4C0519" strokeWidth={3} strokeLinecap="round" />
        </g>
        {leak > 0 ? <circle cx={breach[0]} cy={breach[1]} r={16 + 10 * ((since % 40) / 40)} fill="none" stroke="#E11D48" strokeWidth={3} opacity={leak * (1 - (since % 40) / 40)} /> : null}
        {/* bubbles */}
        {leak > 0
          ? Array.from({length: 24}, (_, k) => {
              const per = 80;
              const off = k * (per / 24);
              if (since < off) return null;
              const t = ((since - off) % per) / per;
              const y = mix(breach[1] - 12, 330, t);
              const x = breach[0] + Math.sin(t * 10 + k * 1.7) * (4 + 8 * t) + (hash(k) - 0.5) * 10 * t;
              const r = mix(7, 20, t) * (0.6 + hash(k + 9) * 0.8);
              return (
                <g key={k} opacity={leak * (t > 0.9 ? (1 - t) / 0.1 : 1)}>
                  <circle cx={x} cy={y} r={r} fill="#FFFFFF" fillOpacity={0.8} stroke={WATER_D} strokeWidth={3} />
                  <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="#FFFFFF" />
                </g>
              );
            })
          : null}
      </g>
    );
  };
  return {w: 1000, h: 620, layout: 'side', anchors, C};
};

/* ------------------------------------------------------------------ endoscopeReprocessor (1000 × 620) */
const endoscopeReprocessor: ArtFactory = () => {
  const anchors: Record<string, P> = {
    machine: [240, 480], lid: [500, 110], basin: [230, 345], scope: [430, 330], connectors: [730, 232], controlPanel: [650, 480], flush: [760, 318],
  };
  const PORTS: P[] = [[560, 246], [590, 246], [620, 246], [650, 276]];
  const LINES = [
    {d: 'M560 238 C580 200 740 200 800 262', c: '#2563EB', cd: '#1E3A8A'},
    {d: 'M590 238 C610 214 740 224 800 286', c: '#22A55B', cd: '#15703C'},
    {d: 'M620 238 C640 230 740 250 800 310', c: '#F5C451', cd: '#B7862A'},
    {d: 'M660 276 C700 290 760 320 800 334', c: '#E5484D', cd: '#A3202E'},
  ];
  const C: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const fl = c.at('flush');
    const since = fl != null ? f - fl : -1;
    const on = since >= 0 ? tw(f, fl as number, 30, E.inOut) : 0;
    const blink = 0.6 + 0.4 * Math.sin(f / 8);
    return (
      <g>
        <Defs />
        <F f={f} i={0} d="M190 200 L230 40 L770 40 L810 200 Z" fill="#DCEFF8" stroke={WATER_D} sw={5} fo={0.85} />
        <path d="M300 70 L270 180 M360 70 L340 130" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" opacity={0.8 * fillIn(f, 0)} />
        <F f={f} i={1} d={rect(160, 200, 680, 380, 18)} fill="url(#rp-steel)" stroke={STEEL_D} sw={5} />
        <path d="M180 220 H820" stroke="#FFFFFF" strokeWidth={6} opacity={0.8 * fillIn(f, 1)} />
        <F f={f} i={2} d={rect(200, 222, 600, 150, 14)} fill="url(#rp-water)" stroke={WATER_D} sw={4} />
        {[250, 750].map((x) => (
          <g key={x}>
            <F f={f} i={1} d={rect(x - 30, 190, 60, 20, 5)} fill="url(#rp-grey)" stroke={GREY_D} sw={3} />
            <circle cx={x} cy={200} r={5} fill="#D6D6DA" opacity={fillIn(f, 1)} />
          </g>
        ))}
        {/* fluid swirl in the basin */}
        {on > 0
          ? [0, 1, 2].map((k) => (
              <ellipse key={k} cx={420} cy={300} rx={150 + k * 40} ry={30 + k * 8} fill="none" stroke={TEAL} strokeWidth={6} strokeLinecap="round" strokeDasharray="40 50" strokeDashoffset={-(since * (3 + k))} opacity={on * 0.55} />
            ))
          : null}
        <rect x={204} y={226} width={592} height={142} rx={12} fill={TEAL} opacity={on * 0.18} />
        <Hose f={f} i={3} w={24} color={SCOPE} dark={SCOPE_D} d="M500 276 C420 350 260 352 228 306 C204 262 300 250 440 250 C600 250 660 280 620 320 C570 352 330 350 290 318 C268 300 320 284 420 286" />
        <Hose f={f} i={3} w={20} color="#5A5A62" dark={SCOPE_D} d="M420 286 C440 286 455 288 466 292" />
        <ScopeBody f={f} i={4} x={590} y={276} rot={180} s={0.85} />
        {PORTS.map(([x, y], k) => (
          <F key={k} f={f} i={5} d={rect(x - 9, y - 12, 18, 16, 4)} fill="url(#rp-cap)" stroke="#6B6B73" sw={3} />
        ))}
        <F f={f} i={5} d={rect(792, 250, 26, 96, 6)} fill="url(#rp-grey)" stroke={GREY_D} sw={3} />
        {LINES.map((l, k) => (
          <g key={k}>
            <Hose f={f} i={5 + k} w={14} color={l.c} dark={l.cd} d={l.d} />
            {on > 0 ? <path d={l.d} fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeDasharray="20 18" strokeDashoffset={since * 4} opacity={on} /> : null}
          </g>
        ))}
        {on > 0
          ? Array.from({length: 8}, (_, k) => {
              const t = (since / 30 + k / 8) % 1;
              return <circle key={'j' + k} cx={466 + t * 70} cy={292 + Math.sin(k * 2.1) * t * 22} r={mix(9, 4, t)} fill={TEAL} stroke={TEAL_D} strokeWidth={3} opacity={on * (1 - t)} />;
            })
          : null}
        {on > 0
          ? Array.from({length: 12}, (_, k) => {
              const t = (since / 60 + hash(k)) % 1;
              const x = 230 + hash(k + 3) * 540;
              return <circle key={k} cx={x + Math.sin(t * 8 + k) * 10} cy={362 - t * 120} r={mix(5, 12, t)} fill="#FFFFFF" stroke={WATER_D} strokeWidth={3} opacity={on * Math.sin(t * Math.PI)} />;
            })
          : null}
        <path d="M180 390 H820" stroke={STEEL_D} strokeWidth={4} opacity={fillIn(f, 1)} />
        <F f={f} i={8} d={rect(560, 400, 220, 130, 12)} fill="#374151" stroke="#111827" sw={4} />
        <F f={f} i={9} d={rect(580, 418, 120, 60, 6)} fill={on > 0 ? '#22A55B' : TEAL} stroke={TEAL_D} sw={3} />
        <rect x={590} y={430} width={mix(10, 100, on > 0 ? (since / 200) % 1 : 0.3)} height={12} rx={4} fill="#FFFFFF" opacity={0.85 * fillIn(f, 9)} />
        {[0, 1, 2].map((k) => (
          <circle key={k} cx={600 + k * 36} cy={504} r={11} fill={k === 0 ? '#22A55B' : '#9CA3AF'} stroke="#111827" strokeWidth={3} opacity={fillIn(f, 10) * (k === 0 ? blink : 1)} />
        ))}
        <circle cx={740} cy={450} r={16} fill="#F59E0B" stroke="#B45309" strokeWidth={3} opacity={fillIn(f, 10)} />
        <F f={f} i={10} d={rect(190, 580, 60, 18, 4)} fill={STEEL_D} stroke="#5E5873" />
        <F f={f} i={10} d={rect(750, 580, 60, 18, 4)} fill={STEEL_D} stroke="#5E5873" />
      </g>
    );
  };
  return {w: 1000, h: 620, layout: 'side', anchors, C};
};

/* ------------------------------------------------------------------ dryingCabinet (700 × 720) */
const dryingCabinet: ArtFactory = () => {
  const xs = [230, 355, 480];
  const anchors: Record<string, P> = {
    cabinet: [124, 400], door: [520, 470], scope: [355, 420], hanger: [350, 132], airflow: [400, 330], valves: [350, 628],
  };
  const C: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const af = c.at('airflow');
    const on = af != null && f >= af ? tw(f, af, 40, E.inOut) : 0;
    return (
      <g>
        <Defs />
        <F f={f} i={0} d={rect(110, 30, 480, 660, 20)} fill="url(#rp-steel)" stroke={STEEL_D} sw={5} />
        <F f={f} i={1} d={rect(140, 52, 420, 50, 10)} fill="url(#rp-cap)" stroke={STEEL_D} sw={3} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <path key={k} d={`M${180 + k * 64} 68 V88`} stroke={STEEL_D} strokeWidth={6} strokeLinecap="round" opacity={fillIn(f, 1)} />
        ))}
        <F f={f} i={2} d={rect(140, 110, 420, 560, 8)} fill="#F6F5FA" stroke={STEEL_D} sw={3} />
        <F f={f} i={3} d={rect(150, 122, 400, 18, 9)} fill="url(#rp-cap)" stroke={STEEL_D} sw={3} />
        {xs.map((x, k) => {
          const sway = Math.sin(f / 40 + k) * 1.2;
          return (
            <g key={k} transform={`rotate(${sway} ${x} 140)`}>
              <path d={`M${x} 138 V166`} stroke={STEEL_D} strokeWidth={6} opacity={fillIn(f, 3)} />
              <Hose f={f} i={4 + k} w={20} color={SCOPE} dark={SCOPE_D} d={`M${x - 14} 200 C${x - 44} 260 ${x - 40} 420 ${x - 40} 520`} />
              <Connector f={f} i={5 + k} x={x - 40} y={540} rot={90} s={0.5} />
              <Hose f={f} i={4 + k} w={16} color={SCOPE} dark={SCOPE_D} d={`M${x} 260 V545`} />
              <Hose f={f} i={5 + k} w={13} color="#5A5A62" dark={SCOPE_D} d={`M${x} 545 V580`} />
              <ScopeBody f={f} i={5 + k} x={x} y={205} rot={90} s={0.55} open />
            </g>
          );
        })}
        {/* removed valves, in a tray */}
        <F f={f} i={8} d="M220 606 H480 L468 648 H232 Z" fill="url(#rp-cap)" stroke={STEEL_D} sw={3} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <g key={k} opacity={fillIn(f, 9)} transform={`translate(${252 + k * 40} 622)`}>
            <rect x={-4} y={-2} width={8} height={18} rx={3} fill="#9A9AA2" stroke={GREY_D} strokeWidth={3} />
            <circle cx={0} cy={-6} r={11} fill={k % 2 ? '#2563EB' : '#E5484D'} stroke={k % 2 ? '#1E3A8A' : '#A3202E'} strokeWidth={3} />
            <circle cx={-3} cy={-9} r={3} fill="#FFFFFF" opacity={0.7} />
          </g>
        ))}
        {/* bottom outlet grille */}
        {[0, 1, 2, 3, 4].map((k) => (
          <path key={k} d={`M${250 + k * 50} 660 H${280 + k * 50}`} stroke={STEEL_D} strokeWidth={5} strokeLinecap="round" opacity={fillIn(f, 9)} />
        ))}
        {on > 0
          ? Array.from({length: 9}, (_, k) => {
              const t = ((f - (af as number)) / 110 + (Math.floor(k / 3) / 3) + (k % 3) * 0.11) % 1;
              const x = [272, 400, 524][k % 3];
              const y = mix(110, 600, t);
              return <path key={k} d={`M${x} ${y} v44 m-14 -14 l14 16 l14 -16`} fill="none" stroke={TEAL} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={on * Math.sin(t * Math.PI)} />;
            })
          : null}
        <F f={f} i={10} d={rect(130, 100, 440, 580, 10)} fill="#BFE3F5" stroke={WATER_D} sw={5} fo={0.25} />
        <path d="M180 650 L300 120 M230 650 L330 210" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" opacity={0.5 * fillIn(f, 10)} />
        <F f={f} i={11} d={rect(540, 340, 14, 110, 7)} fill="url(#rp-grey)" stroke={GREY_D} sw={3} />
      </g>
    );
  };
  return {w: 700, h: 720, layout: 'side', anchors, C};
};

export default {leakTest, endoscopeReprocessor, dryingCabinet} as Record<string, ArtFactory>;
