import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {brand, fonts, ink, safe, surface, tracking} from '../theme';
import {lh, ui} from '../lang';
import type {SceneTiming, VideoSpec, VideoTimings} from '../spec';
import {SCHEDULE, TX, type TxPlan} from '../schedule';
import {E, SPAN, SceneClock, camP, camV, clamp01, fitSize, ADVANCE, hash, mix, tw, useSceneFrame, useThumb} from '../motion';
import {Logo, episodeOf, useProject} from './brand';
import {ARTS, ArtView} from '../art';

/* ------------------------------------------------------------------ sound */

export type SfxName =
  | 'pan' | 'push' | 'cut' | 'wipe' | 'tick' | 'roll' | 'result' | 'strike' | 'title' | 'logo' | 'key1' | 'key2' | 'key3' | 'drop'
  | 'place' | 'deal' | 'stamp' | 'chip' | 'shove' | 'fan'
  // cinematic, synthesised in-house (scripts/synth-sfx.mts)
  | 'heartbeat' | 'beep' | 'flatline' | 'charge' | 'shock' | 'boom' | 'whoosh' | 'riser' | 'sting' | 'drone' | 'alarm' | 'thud';

/** One placed sound effect, on the enclosing scene's clock. Silent inside recap prints. */
export const Sfx: React.FC<{at: number; name: SfxName; volume?: number}> = ({at, name, volume = 0.5}) => {
  const clock = React.useContext(SceneClock);
  if (clock.thumb || clock.freeze !== undefined) return null;
  const from = Math.round(at + clock.offset);
  return from < 0 ? null : (
    <Sequence from={from} durationInFrames={300} layout="none" name={`sfx:${name}`}>
      <Html5Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};

/**
 * Music bed, ducked against the narration. Every VO window is known exactly, so the
 * duck is an envelope: it dips just before a line and releases slowly after it, lifting
 * the bed in the gaps and under the outro. The stem is pre-carved in the voice band.
 */
export const MusicBed: React.FC<{timings: VideoTimings}> = ({timings}) => {
  const {music} = useProject();
  const total = timings.totalDurationInFrames;
  const wins = timings.scenes.map((s) => [s.startFrame + s.leadFrames, s.startFrame + s.leadFrames + s.voDurationInFrames]);
  const lastVoEnd = wins[wins.length - 1][1];
  const GAP = 0.42;
  const UNDER = 0.15;
  const vol = (f: number) => {
    let duck = 0;
    for (const [s, e] of wins) {
      let d = 0;
      if (f >= s - 8 && f < s) d = (f - (s - 8)) / 8;
      else if (f >= s && f <= e) d = 1;
      else if (f > e && f < e + 24) d = 1 - E.soft((f - e) / 24);
      duck = Math.max(duck, d);
    }
    let v = mix(GAP, UNDER, duck);
    if (f > lastVoEnd) v = mix(v, 0.55, tw(f, lastVoEnd, 20, E.soft));
    v *= tw(f, 0, 20, E.soft);
    v *= 1 - tw(f, total - 60, 60, E.inOut);
    return v;
  };
  return music ? <Html5Audio src={staticFile(music)} loop volume={vol} /> : null;
};

/* ------------------------------------------------------------------ surfaces */

/**
 * Soft, violet-tinted elevation for a surface `lift` above the page (0 = resting,
 * 1 = held up). Lifting widens and softens the shadow and pushes it down.
 */
export const paperShadow = (lift: number) => {
  const l = Math.max(0, lift);
  const o = (a: number) => (a * (1 - 0.35 * clamp01(l))).toFixed(3);
  return [
    `0 ${1 + l * 2}px ${2 + l * 3}px rgba(28,21,48,${o(0.06)})`,
    `0 ${10 + l * 22}px ${30 + l * 40}px -12px rgba(60,30,90,${o(0.2)})`,
  ].join(', ');
};

/** A surface's fill (white card by default). */
export const paperStyle = (bg: string = ink.paperLight): React.CSSProperties => ({backgroundColor: bg});

/* ------------------------------------------------------------------ world */

export const worldCamera = (f: number, timings: VideoTimings, plans: TxPlan[]) => {
  let x = 0;
  let y = 0;
  let z = 1;
  for (let k = 1; k < timings.scenes.length; k++) {
    const B = timings.scenes[k].startFrame;
    const p = camP(f, B);
    const plan = plans[k];
    if (plan.kind === 'pan') z *= 1 - CRANE * Math.sin(Math.PI * p);
    if (plan.kind === 'pan') plan.axis === 'x' ? (x += p) : (y += p);
    else if (plan.kind === 'slide') x += 0.25 * p;
    else if (f >= B) x += 0.31;
  }
  return {x, y, z};
};

/**
 * The page: a clean off-white field with two very soft brand-colour glows that drift with
 * the camera (depth without texture), and nothing at the edges.
 */
export const World: React.FC<{timings: VideoTimings; plans: TxPlan[]}> = ({timings, plans}) => {
  const f = useCurrentFrame();
  const cam = worldCamera(f, timings, plans);
  const bx = (-cam.x * SPAN.x * 0.18 - f * 0.05) % 3840;
  const by = -cam.y * SPAN.y * 0.18;
  return (
    <AbsoluteFill style={{backgroundColor: ink.paper}}>
      <AbsoluteFill style={{background: `radial-gradient(900px 700px at ${1650 + Math.sin(bx / 900) * 120}px ${120 + by * 0.2}px, rgba(216,20,140,0.07), transparent 70%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(1000px 800px at ${220 + Math.cos(bx / 1100) * 120}px ${1020 + by * 0.2}px, rgba(122,36,161,0.07), transparent 70%)`}} />
    </AbsoluteFill>
  );
};

/** Persistent chrome: only the brand lockup, top-right (no borders, rules or edge marks). */
/**
 * The brand mark on every frame: top-right (default) or a subtle bottom-right watermark
 * (project brand.watermark). It steps aside for an outro's own logo reveal (`hideFrom`).
 */
export const FixedChrome: React.FC<{total: number; hideFrom?: number; showFrom?: number}> = ({hideFrom, showFrom}) => {
  const {brand} = useProject();
  const f = useCurrentFrame();
  const o = (hideFrom != null ? 1 - clamp01((f - hideFrom) / 12) : 1) * (showFrom != null ? clamp01((f - showFrom) / 18) : 1);
  if (o <= 0) return null;
  return brand.watermark === 'bottom-right' ? (
    <div style={{position: 'absolute', right: 52, bottom: 36, opacity: 0.9 * o}}>
      <Logo height={38} />
    </div>
  ) : (
    <div style={{position: 'absolute', top: 46, right: 64, opacity: o}}>
      <Logo height={40} />
    </div>
  );
};

/* ------------------------------------------------------------------ scene frame */

export type Cam = {x?: number; y?: number; s?: number; ox?: number; oy?: number};

/** How far the camera lifts off the desk mid-pan (crane move), as a scale dip. */
const CRANE = 0.07;

/** The chapter's "0" — an ink ring whose counter the camera flies through (portal). */
const PORTAL_C = {x: 960, y: 520};
const portalR = (f: number) => {
  const u = E.inOut(clamp01((f + TX.exit) / (TX.exit + TX.enter)));
  return 46 * Math.exp(Math.log(2600 / 46) * u);
};

const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;

/**
 * Wraps one scene: its transition in/out (sharing one camera curve with its neighbour),
 * an in-scene camera with ambient life, and its chrome (chapter slug, folio).
 */
export const SceneFrame: React.FC<{
  scene: SceneTiming;
  kicker: string;
  enter: TxPlan;
  exit: TxPlan | null;
  camera?: Cam;
  /** no chapter slug (cinematic openers, the outro) */
  bare?: boolean;
  children: React.ReactNode;
}> = ({scene, kicker, enter, exit, camera, bare, children}) => {
  const f = useSceneFrame();
  const thumb = useThumb();
  const D = scene.durationInFrames;
  let tx = 0;
  let ty = 0;
  let s = 1;
  let bx = 0;
  let by = 0;
  let dim = 0;
  let rot = 0;
  let flash = 0;
  let lift = 0;

  if (exit && !thumb) {
    const c = camP(f, D);
    const v = camV(f, D);
    if (exit.kind === 'pan') {
      // crane move: the camera lifts off the desk and rolls a touch as it travels
      const dip = Math.sin(Math.PI * c);
      s *= 1 - CRANE * dip;
      rot += (exit.axis === 'x' ? 0.8 : -0.5) * dip;
      if (exit.axis === 'x') (tx -= SPAN.x * c), (bx += v * SPAN.x * 0.16);
      else (ty -= SPAN.y * c), (by += v * SPAN.y * 0.16);
    } else if (exit.kind === 'portal') {
      s *= 1 + 0.18 * E.in(c);
    } else if (exit.kind === 'slide') {
      // the old page recedes under the new sheet
      tx -= 220 * c;
      s *= 1 - 0.035 * c;
      dim = 0.2 * c;
    }
  }
  let clip: string | undefined;
  let sheet = false;
  if (!thumb) {
    const c = camP(f, 0);
    const v = camV(f, 0);
    if (enter.kind === 'pan') {
      const dip = Math.sin(Math.PI * c);
      s *= 1 - CRANE * dip;
      rot += (enter.axis === 'x' ? 0.8 : -0.5) * dip;
      if (enter.axis === 'x') (tx += SPAN.x * (1 - c)), (bx += v * SPAN.x * 0.16);
      else (ty += SPAN.y * (1 - c)), (by += v * SPAN.y * 0.16);
    } else if (enter.kind === 'slide') {
      // a fresh sheet is laid down: it arrives lifted and angled, then settles flat
      tx += 1980 * (1 - c);
      rot += 3.2 * (1 - c) + Math.sin(Math.max(0, f - TX.enter) * 0.8) * 0.4 * Math.exp(-Math.max(0, f - TX.enter) / 4) * (f > TX.enter ? 1 : 0);
      lift = 1 - c;
      sheet = f < TX.enter + 12;
    } else if (enter.kind === 'portal' && f < TX.enter) {
      const R = portalR(f);
      clip = `ellipse(${(0.6 * R).toFixed(1)}px ${(1.1 * R).toFixed(1)}px at ${PORTAL_C.x}px ${PORTAL_C.y}px)`;
      s *= mix(1.25, 1, E.out(clamp01((f + TX.exit) / (TX.exit + TX.enter))));
    } else if (enter.kind === 'cut' && scene.index > 1) {
      // printer's thump: a flash of stock, a hard settle and a decaying shake
      s *= 1 + 0.05 * (1 - tw(f, 0, 14, E.out));
      if (f >= 0 && f < 16) (tx += Math.sin(f * 2.4) * 8 * Math.exp(-f / 4)), (ty += Math.cos(f * 2.9) * 4 * Math.exp(-f / 4));
      flash = f >= 0 ? 0.6 * (1 - tw(f, 0, 7, E.out)) : 0;
    } else if (enter.kind === 'flood' && scene.index > 1) {
      s *= 1 + 0.035 * (1 - tw(f, 0, 16, E.out));
    }
  }

  const fid = `mb-${scene.index}`;
  const directional = bx + by > 0.35;
  const cam = {x: 0, y: 0, s: 1, ox: 960, oy: 540, ...camera};
  // ambient life that never stops: a ±5 px vertical float and a ±0.6% scale breath, a quarter
  // cycle apart, so when one turns the other is at full speed. The picture is never still while
  // the narrator talks over a settled layout (QA fails a ≥3 s frozen picture) and the footprint
  // stays within a few px of the layout (margins safe). Calibrated on renders: no still ≥1.5 s.
  const amb = (f + scene.index * 37) / 38;
  cam.y += Math.sin(amb) * 5;
  cam.s *= 1 + 0.006 * Math.cos(amb);

  const number = String(scene.index).padStart(2, '0');
  const chromeOut = exit ? 1 - clamp01((f - (D - 8)) / 8) : 1;
  const kin = tw(f, 4, 16, E.out);
  const R = enter.kind === 'portal' && f < TX.enter && !thumb ? portalR(f) : 0;

  return (
    <AbsoluteFill>
      {directional ? (
        <svg style={{position: 'absolute', width: 0, height: 0}}>
          <filter id={fid} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{filter: directional ? `url(#${fid})` : undefined, transform: `translate(${tx}px, ${ty}px) scale(${s}) rotate(${rot.toFixed(3)}deg)`, clipPath: clip}}>
        {sheet ? (
          <AbsoluteFill
            style={{
              ...paperStyle(ink.paper),
              boxShadow: `-${30 + lift * 50}px 0 ${60 + lift * 80}px rgba(60,30,90,${(0.16 + lift * 0.08).toFixed(3)})`,
              opacity: f < TX.enter ? 1 : 1 - tw(f, TX.enter, 12),
            }}
          />
        ) : null}
        <AbsoluteFill style={{transformOrigin: `${cam.ox}px ${cam.oy}px`, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`}}>{children}</AbsoluteFill>
      </AbsoluteFill>
      {dim > 0 ? <AbsoluteFill style={{background: `rgba(40,24,64,${(dim * 0.6).toFixed(3)})`}} /> : null}
      {flash > 0.01 ? <AbsoluteFill style={{background: `rgba(255,255,255,${(flash * 0.7).toFixed(3)})`}} /> : null}

      {R > 0 ? (
        // one rotated layer: the ink ring (SVG) and its numeral (HTML — never SVG <text>, see art.tsx)
        <AbsoluteFill style={{transformOrigin: `${PORTAL_C.x}px ${PORTAL_C.y}px`, transform: `rotate(${(-14 * (1 - clamp01((f + TX.exit) / (TX.exit + TX.enter)))).toFixed(2)}deg)`}}>
          <svg style={{position: 'absolute', inset: 0, overflow: 'visible'}} width={1920} height={1080}>
            <defs>
              <linearGradient id={`pg-${scene.index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#E0168A" />
                <stop offset="1" stopColor="#6E25A3" />
              </linearGradient>
            </defs>
            <path fillRule="evenodd" fill={`url(#pg-${scene.index})`} opacity={clamp01((f + TX.exit) / 4)} d={`${ellipsePath(PORTAL_C.x, PORTAL_C.y, R, R * 1.32)} ${ellipsePath(PORTAL_C.x, PORTAL_C.y, R * 0.6, R * 1.1)}`} />
          </svg>
          <div style={{position: 'absolute', left: PORTAL_C.x + R * 1.18, top: PORTAL_C.y + R * 1.3 - R * 3.6 * 0.8, fontFamily: fonts.heading, fontWeight: 700, fontSize: R * 3.6, lineHeight: 1, color: brand.purple, whiteSpace: 'nowrap'}}>
            {number.slice(1)}
          </div>
        </AbsoluteFill>
      ) : null}

      {!thumb && !bare ? (
        <>
          <div style={{position: 'absolute', top: 50, left: 72, display: 'flex', alignItems: 'center', gap: 14, opacity: chromeOut * kin, transform: `translateX(${(1 - kin) * -16}px)`}}>
            <span style={{fontFamily: fonts.label, fontWeight: 700, fontSize: 17, color: '#fff', background: brand.gradient, padding: '6px 11px', borderRadius: 10, letterSpacing: '0.04em'}}>{number}</span>
            <span style={{fontFamily: fonts.label, fontWeight: 600, fontSize: 19, letterSpacing: tracking.label, textTransform: 'uppercase', color: ink.soft}}>{kicker}</span>
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ transitions (composition level) */

/**
 * Chapter wipe for a register change (knowledge check, common mistake): the brand
 * gradient (a warning red for mistakes) sweeps in as a circle from the lower left, the
 * chapter name rises out of it in white, then the next page opens from the same corner.
 */
export const InkFlood: React.FC<{B: number; tone: 'red' | 'orange'; label: string; index: number}> = ({B, tone, label, index}) => {
  const f = useCurrentFrame();
  const start = B - 14;
  if (f < start || f > B + 30) return null;
  const r = mix(0, 2400, tw(f, start, 14, E.in));
  const open = tw(f, B + 12, 18, E.inOut);
  const hole = mix(0, 2500, open);
  const grad = tone === 'red' ? 'linear-gradient(135deg, #F43F5E 0%, #BE123C 60%, #881337 100%)' : brand.gradient;
  const lab = tw(f, B - 6, 16, E.out);
  const mask = hole > 1 ? `radial-gradient(circle at 0px 1080px, transparent ${hole}px, #000 ${hole + 2}px)` : undefined;
  return (
    <AbsoluteFill data-audit="skip" style={{pointerEvents: 'none', WebkitMaskImage: mask, maskImage: mask}}>
      <AbsoluteFill style={{background: grad, clipPath: `circle(${r}px at 0px 1080px)`}} />
      <div style={{position: 'absolute', left: safe.left, top: 400, opacity: lab * (1 - open), transform: `translateY(${(1 - lab) * 30}px)`}}>
        <div style={{fontFamily: fonts.label, fontWeight: 600, fontSize: 26, letterSpacing: tracking.label, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)'}}>
          {ui('chapter')} {String(index).padStart(2, '0')}
        </div>
        <div style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 150, lineHeight: lh(1.05), letterSpacing: tracking.display, color: '#fff', marginTop: 12}}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ poster */

import {splitTopic} from '../sync';
export {splitTopic};

/**
 * The designed thumbnail (frames 0..SCHEDULE.poster-1): the brand lockup, the lesson's
 * title set large, and its first illustration on a white plate over a soft brand glow.
 */
export const Poster: React.FC<{spec: VideoSpec; minutes: number}> = ({spec, minutes}) => {
  const intro = spec.scenes.find((s) => s.type === 'intro');
  const topic = intro && intro.type === 'intro' ? intro.topic : spec.title;
  const [head, tail] = splitTopic(topic);
  const size = fitSize(topic, 960, 4, {max: 124, min: 64, advance: ADVANCE.serif});
  const project = useProject();
  const ep = episodeOf(spec);
  return (
    <AbsoluteFill style={{backgroundColor: ink.paper}}>
      <AbsoluteFill style={{background: 'radial-gradient(1100px 900px at 1500px 560px, rgba(216,20,140,0.16), transparent 65%), radial-gradient(900px 700px at 1750px 1000px, rgba(122,36,161,0.16), transparent 70%)'}} />
      <div style={{position: 'absolute', top: 70, left: safe.left}}>
        <Logo height={64} />
      </div>
      <div style={{position: 'absolute', left: safe.left, top: 250, width: 960}}>
        <div style={{display: 'inline-block', fontFamily: fonts.label, fontWeight: 700, fontSize: 24, letterSpacing: tracking.label, textTransform: 'uppercase', color: '#fff', background: brand.gradient, padding: '8px 18px', borderRadius: 999, marginBottom: 34}}>
          {project.brand.episodeLabel}
          {ep} · {spec.module}
        </div>
        <div style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: size, lineHeight: lh(1.04), letterSpacing: tracking.display, color: ink.ink}}>
          {head}
          {tail ? <span style={{color: brand.magentaText}}> {tail}</span> : null}
        </div>
        <div style={{width: 160, height: 8, borderRadius: 4, background: brand.gradient, marginTop: 40}} />
      </div>
      <PosterFigure spec={spec} />
      <div style={{position: 'absolute', left: safe.left, bottom: 80, fontFamily: fonts.label, fontWeight: 600, fontSize: 24, letterSpacing: tracking.label, textTransform: 'uppercase', color: ink.soft}}>
        {spec.topicGroup} · {minutes} {ui('min')}
      </div>
    </AbsoluteFill>
  );
};

/** The lesson's first illustration, fully drawn, on a white plate. */
const PosterFigure: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const fig = spec.scenes.find((s) => s.type === 'figure' && ARTS[s.art] && ARTS[s.art](s.data ?? {}).layout !== 'full');
  if (!fig || fig.type !== 'figure') return null;
  const art = ARTS[fig.art](fig.data ?? {});
  const W = 700;
  const k = (W - 60) / art.w;
  return (
    <div style={{position: 'absolute', right: 110, top: 540 - (art.h * k + 60) / 2, width: W, height: art.h * k + 60, background: '#fff', borderRadius: 28, border: surface.border, boxShadow: surface.shadowHi}}>
      {/* the art fully drawn in its base state: no narration events (flows, failures, counts) */}
      <ArtView art={art} k={k} ctx={{f: 400, at: () => null}} style={{left: 30, top: 30}} />
    </div>
  );
};

export const PosterLayer: React.FC<{spec: VideoSpec; minutes: number}> = ({spec, minutes}) => (
  <Sequence from={0} durationInFrames={SCHEDULE.poster} name="poster">
    <Poster spec={spec} minutes={minutes} />
  </Sequence>
);
