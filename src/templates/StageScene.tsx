/**
 * The stage scene: one illustrated world, a camera that travels through it, and beats —
 * each fired by its spoken words — that show, animate and label the parts being explained
 * (model and maths: src/stage.ts). Labels sit on the picture at a constant, readable size;
 * everything else is drawn art, so the picture carries the explanation.
 */
import React from 'react';
import {useVideoConfig} from 'remotion';
import {brand, fonts, ink, surface} from '../theme';
import {lh as lhS} from '../lang';
import type {SceneTiming, StageScene as StageSpec} from '../spec';
import {ARTS, ArtView, type ArtDef} from '../art';
import {TONES} from '../art/graph';
import {overlaps, type TxPlan} from '../schedule';
import {anchorGroup} from '../beats';
import {revealGroups} from '../sync';
import {ADVANCE, E, clamp01, fitSize, mix, tw, useSceneFrame} from '../motion';
import {MaskWords, Rich} from './primitives';
import {AuditCtx} from './audit';
import {SceneFrame, Sfx, type SfxName} from './stage';
import {LEG, slotBox, fitCam, arr, camAt, driftAt, camFor, layerBox, overviewCam, placeLabel, resolve, toScreen, viewFor, type ArtInfo, type Box, type Cam, type Layer, type StageSpec as Model, type Target, type View} from '../stage';

const HOLD = 45;
const EDGE_FADE = 'linear-gradient(to right, transparent 0px, transparent 100px, black 190px, black 1730px, transparent 1820px, transparent 1920px)';
/** tw that treats "never" (Infinity) as not yet — lifetimes often end at no later beat. */
const twx = (f: number, at: number, dur: number, ease?: (t: number) => number) => (Number.isFinite(at) ? tw(f, at, dur, ease) : 0);
const LABEL_SIZE = 30;
const LABEL_H = 54;
const labelW = (t: string) => Math.round(t.length * LABEL_SIZE * ADVANCE.serif * 1.02 + 40);
const tone = (t?: string) => (t && TONES[t] ? TONES[t].fill : brand.magenta);

type Built = {
  arts: Map<string, ArtDef>;
  info: (l: Layer) => ArtInfo | null;
  where: (t: Target) => {pt: [number, number]; box?: Box} | null;
  start: Cam;
  keys: {f: number; cam: Cam}[];
};

/** `fit` layers take the world's centre at the largest size that leaves a margin (charts, tables). */
const SIZED = new Set(['graph', 'table', 'stat']);
export const fitWorld = (m: Model): Model => {
  if (!m.world.layers.some((l) => l.fit)) return m;
  const W = m.world;
  return {
    ...m,
    world: {
      ...W,
      layers: W.layers.map((l) => {
        if (!l.fit) return l;
        if (!l.slot || l.slot === 'full') {
          const a = ARTS[l.art](l.data ?? {});
          return {...l, at: [W.w / 2, W.h / 2] as [number, number], h: Math.min(W.h * 0.9, (W.w * 0.94 * a.h) / a.w)};
        }
        // a composition element: text-bearing arts (charts, tables, figures) are laid out at the
        // slot's own width, then take the largest size that fits the slot, centred in it
        const b = slotBox(l.slot, W);
        const data = l.data && typeof l.data === 'object' && !Array.isArray(l.data) && SIZED.has(l.art) ? {...l.data, width: Math.round(b.w * 0.92)} : l.data;
        const a = ARTS[l.art](data ?? {});
        const h = Math.min(b.h * 0.92, (b.w * 0.92 * a.h) / a.w);
        return {...l, ...(data ? {data} : {}), at: [b.x + b.w / 2, b.y + b.h / 2] as [number, number], h};
      }),
    },
  };
};

/** Everything about a stage that doesn't change per frame: arts, target lookup, camera keys. */
export const buildStage = (m: Model, view: View, beats: number[]): Built => {
  const arts = new Map<string, ArtDef>();
  for (const l of m.world.layers) arts.set(l.id, ARTS[l.art](l.data ?? {}));
  const info = (l: Layer): ArtInfo | null => {
    const a = arts.get(l.id);
    return a ? {w: a.w, h: a.h, anchors: a.anchors} : null;
  };
  const where = (t: Target) => resolve(m.world, t, info);
  // the overview frames whatever is on stage at that beat
  const visible = new Set(m.world.layers.filter((l) => !l.hidden).map((l) => l.id));
  // a composition's slots already carry the page margins: its overview is the whole world, never a
  // shrunken union (which would also jump when a revealed element joins)
  const composed = m.world.layers.some((l) => l.slot && l.slot !== 'full');
  const overview = () => (composed ? fitCam(m.world, view) : overviewCam(m.world, view, m.world.layers.filter((l) => visible.has(l.id)).map((l) => layerBox(l, info(l)!))));
  const fit = overview();
  const start = m.open ? camFor(m.world, view, {on: m.open}, fit, where) : fit;
  const keys: {f: number; cam: Cam}[] = [];
  let prev = start;
  m.beats.forEach((b, i) => {
    for (const id of arr(b.show)) visible.add(id);
    for (const id of arr(b.hide)) visible.delete(id);
    if (!b.camera) return;
    prev = camFor(m.world, view, b.camera, prev, where, overview());
    keys.push({f: beats[i], cam: prev});
  });
  return {arts, info, where, start, keys};
};

/** The first frame each "layer.anchor" is acted on (art events), per layer. */
const actFrames = (m: Model, beats: number[]) => {
  const out = new Map<string, number>();
  m.beats.forEach((b, i) => {
    for (const t of arr(b.act)) if (!out.has(t)) out.set(t, beats[i]);
  });
  return out;
};

/** Draws a stage world at frame f (used by the stage scene; `beats` are its beat frames). */
export const StageView: React.FC<{m: Model; beats: number[]; view: View; f: number; s0: number}> = ({m: m0, beats, view, f, s0}) => {
  const m = React.useMemo(() => fitWorld(m0), [m0]);
  const B = React.useMemo(() => buildStage(m, view, beats), [m, view, beats]);
  // audit stills: layers must not cover each other (a part hidden behind another teaches nothing)
  const audit = React.useContext(AuditCtx);
  React.useMemo(() => {
    if (!audit) return;
    const boxes = m.world.layers.map((l) => ({id: l.id, b: layerBox(l, B.info(l)!)}));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, c] = [boxes[i].b, boxes[j].b];
        const ov = Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
        if (ov > 0.12 * Math.min(a.w * a.h, c.w * c.h)) console.log(`[audit] ${JSON.stringify({kind: 'overlap', text: boxes[i].id, other: boxes[j].id})}`);
      }
  }, [audit, m, B]);
  const acts = React.useMemo(() => actFrames(m, beats), [m, beats]);
  const cam0 = camAt(f, B.start, B.keys);
  // the slow push between moves (stage.ts driftAt): the picture is never frozen while the voice runs
  const cam = {...cam0, s: cam0.s * driftAt(f, B.keys, m.drift ?? 1)};
  const scr = (p: [number, number]) => toScreen(cam, p, view);
  const fired = (i: number) => f >= beats[i];

  // layer lifetimes
  const shownAt = new Map<string, number>();
  const hiddenAt = new Map<string, number>();
  m.beats.forEach((b, i) => {
    for (const id of arr(b.show)) if (!shownAt.has(id)) shownAt.set(id, beats[i]);
    for (const id of arr(b.hide)) if (!hiddenAt.has(id)) hiddenAt.set(id, beats[i]);
  });
  // focus: the latest `dim` wins (false clears it)
  let dimSet: Set<string> | null = null;
  let dimAt = 0;
  m.beats.forEach((b, i) => {
    if (b.dim === undefined || !fired(i)) return;
    dimSet = b.dim === false ? null : new Set(arr(b.dim).map((t) => t.split('.')[0]));
    dimAt = beats[i];
  });

  const SHOWN_DRAWN = 90; // frames of art clock a shown layer skips: every draw-on in the kit is done by then
  const layers = m.world.layers.map((l) => {
    const art = B.arts.get(l.id)!;
    const box = layerBox(l, {w: art.w, h: art.h, anchors: art.anchors});
    const enter = l.hidden ? shownAt.get(l.id) ?? Infinity : s0;
    if (f < enter - 2) return null;
    const out = hiddenAt.get(l.id);
    const o = tw(f, enter, 16, E.out) * (out != null ? 1 - twx(f, out, 16, E.inOut) : 1);
    if (o <= 0.001) return null;
    const dimmed = dimSet ? ((dimSet as Set<string>).has(l.id) ? 1 : mix(1, 0.28, tw(f, dimAt, 20, E.inOut))) : 1;
    const [x, y] = scr([box.x, box.y]);
    const k = (box.h * cam.s) / art.h;
    const rise = l.hidden ? (1 - tw(f, enter, 22, E.out)) * 26 : 0;
    // a layer revealed mid-scene (or any layer of a `drawn` stage) arrives already drawn; only the
    // opening picture draws itself on — a redraw from scratch leaves e.g. a person headless for seconds
    const t0 = enter + 4 - (l.hidden || m.drawn ? SHOWN_DRAWN : 0);
    const local = f - t0;
    const at = (a: string) => {
      const fr = acts.get(`${l.id}.${a}`);
      return fr == null ? null : fr - t0;
    };
    return <ArtView key={l.id} art={art} k={k} ctx={{f: local, at}} style={{left: x, top: y + rise, opacity: o * dimmed}} />;
  });

  // what a beat puts on the picture (labels, a cross, a loupe) lasts until the camera next moves
  const nextMove = (i: number) => {
    for (let j = i + 1; j < m.beats.length; j++) if (m.beats[j].camera) return beats[j];
    return Infinity;
  };
  // a flow or a cross leaves with the layer it points at
  const goneAt = (targets: Target[]) => Math.min(...targets.map((t) => hiddenAt.get(t.split('.')[0]) ?? Infinity));
  // loupes sit still beside their target (placed at the camera pose they open under)
  const R = 200;
  const loupes = React.useMemo(
    () =>
      m.beats.map((b, i) => {
        if (!b.inset) return null;
        const r = B.where(b.inset.of);
        if (!r) return null;
        const pt = toScreen(camAt(beats[i] + LEG.dur, B.start, B.keys), r.pt, view);
        let until = nextMove(i);
        for (let j = i + 1; j < m.beats.length; j++) if (m.beats[j].inset) until = Math.min(until, beats[j]);
        return {i, box: placeLabel(pt, 2 * R, 2 * R, [], view, 90), until};
      }),
    [m, beats, B, view],
  );

  // labels: pinned to their target, placed once (at the camera pose they are spoken under) clear of the others and of loupes
  type Lab = {i: number; on: Target; text: string; from: number; until: number; dx: number; dy: number; w: number};
  const labels = React.useMemo(() => {
    const out: Lab[] = [];
    m.beats.forEach((b, i) => {
      for (const l of arr(b.label)) {
        const r = B.where(l.on);
        if (!r) continue;
        const land = camAt(beats[i] + LEG.dur, B.start, B.keys);
        const pt = toScreen(land, r.pt, view);
        const w = labelW(l.text);
        const taken: Box[] = [
          ...out
            .filter((o) => o.until > beats[i])
            .map((o) => {
              const p = toScreen(land, B.where(o.on)!.pt, view);
              return {x: p[0] + o.dx, y: p[1] + o.dy, w: o.w, h: LABEL_H};
            }),
          ...loupes.filter((q) => q && q.i <= i && q.until > beats[i]).map((q) => q!.box),
          // keep clear of the points the other labels of this shot pin to (shown or still to come),
          // so a label never sits on its neighbour's part — a row of parts gets labels above/below
          ...m.beats.flatMap((bj, j) =>
            nextMove(j) === nextMove(i)
              ? arr(bj.label)
                  .filter((o) => o.on !== l.on && B.where(o.on))
                  .map((o) => {
                    const p = toScreen(land, B.where(o.on)!.pt, view);
                    return {x: p[0] - 45, y: p[1] - 45, w: 90, h: 90};
                  })
              : [],
          ),
        ];
        const box = placeLabel(pt, w, LABEL_H, taken, view);
        // a label waits for its camera move to land, so it never floats mid-flight
        out.push({i, on: l.on, text: l.text, from: beats[i] + (b.camera ? LEG.dur - LEG.before - 4 : 0), until: Math.min(nextMove(i), goneAt([l.on])), dx: box.x - pt[0], dy: box.y - pt[1], w});
      }
    });
    return out;
  }, [m, beats, B, view]);
  const latest = labels.reduce((n, l) => (f >= l.from ? Math.max(n, l.i) : n), -1);

  const svg: React.ReactNode[] = [];
  const html: React.ReactNode[] = [];
  const sfx: React.ReactNode[] = [];

  labels.forEach((l, n) => {
    if (f < l.from) return;
    const p = scr(B.where(l.on)!.pt);
    const inView = p[0] > view.x - 20 && p[0] < view.x + view.w + 20 && p[1] > view.y - 20 && p[1] < view.y + view.h + 20;
    const o = tw(f, l.from + 6, 12, E.out) * (1 - twx(f, l.until, 14, E.inOut)) * (inView ? 1 : 0);
    if (o <= 0.01) return;
    const on = l.i === latest;
    const bx = p[0] + l.dx;
    const by = p[1] + l.dy;
    // the leader runs to the nearest point of the label's box
    const ex = Math.max(bx, Math.min(bx + l.w, p[0]));
    const ey = Math.max(by, Math.min(by + LABEL_H, p[1]));
    const lp = tw(f, l.from, 12, E.inOut);
    svg.push(
      <g key={`l${n}`} opacity={o}>
        <path d={`M${p[0]} ${p[1]} L${mix(p[0], ex, lp)} ${mix(p[1], ey, lp)}`} stroke={on ? brand.magenta : ink.soft} strokeWidth={on ? 3.5 : 2.5} strokeLinecap="round" />
        <circle cx={p[0]} cy={p[1]} r={9 * tw(f, l.from, 10, E.settle)} fill={on ? brand.magenta : ink.ink} stroke="#fff" strokeWidth={3.5} />
      </g>,
    );
    html.push(
      <div
        key={`t${n}`}
        style={{
          position: 'absolute',
          left: bx,
          top: by,
          height: LABEL_H,
          width: l.w,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          border: on ? `2.5px solid ${brand.magenta}` : surface.border,
          borderRadius: 14,
          boxShadow: surface.shadow,
          fontFamily: fonts.heading,
          fontWeight: on ? 700 : 600,
          fontSize: LABEL_SIZE,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: on ? brand.purpleText : ink.soft,
          opacity: o,
          transform: `scale(${mix(0.86, 1, tw(f, l.from + 6, 14, E.settle))})`,
        }}
      >
        <span>
          <Rich text={l.text} />
        </span>
      </div>,
    );
    sfx.push(<Sfx key={`s${n}`} at={l.from + 6} name="tick" volume={0.18} />);
  });

  m.beats.forEach((b, i) => {
    const bf = beats[i];
    if (f < bf) return;
    // pulse: three soft rings on the part being named
    arr(b.pulse).forEach((t, k) => {
      const r = B.where(t);
      if (!r) return;
      const p = scr(r.pt);
      const rad = r.box ? Math.min(r.box.w, r.box.h) * cam.s * 0.42 : 46;
      for (let q = 0; q < 3; q++) {
        const u = (f - bf - q * 16) / 40;
        if (u < 0 || u > 1) continue;
        svg.push(<circle key={`p${i}-${k}-${q}`} cx={p[0]} cy={p[1]} r={rad * (0.75 + 0.5 * u)} fill="none" stroke={brand.magenta} strokeWidth={5} opacity={(1 - u) * 0.8} />);
      }
    });
    // travel: particles moving along a path through the targets (a stream keeps flowing)
    if (b.travel) {
      const pts = b.travel.along.map((t) => B.where(t)?.pt).filter(Boolean).map((pt) => scr(pt!));
      if (pts.length >= 2) {
        const seg = pts.slice(1).map((q, j) => Math.hypot(q[0] - pts[j][0], q[1] - pts[j][1]));
        const total = seg.reduce((a, c) => a + c, 0);
        const at = (u: number): [number, number] => {
          let d = u * total;
          for (let j = 0; j < seg.length; j++) {
            if (d <= seg[j] || j === seg.length - 1) {
              const v = seg[j] ? Math.min(1, d / seg[j]) : 0;
              return [mix(pts[j][0], pts[j + 1][0], v), mix(pts[j][1], pts[j + 1][1], v)];
            }
            d -= seg[j];
          }
          return pts[pts.length - 1];
        };
        const col = tone(b.travel.tone);
        const lp = tw(f, bf, 20, E.inOut) * (1 - twx(f, goneAt(b.travel.along), 14, E.inOut));
        if (lp <= 0.01) return;
        svg.push(<path key={`tp${i}`} d={`M${pts.map((p) => p.join(' ')).join(' L')}`} stroke={col} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" fill="none" opacity={0.55 * lp} />);
        const dur = Math.max(40, total / 9);
        const n = b.travel.stream ? 9 : 1;
        for (let q = 0; q < n; q++) {
          let u = (f - bf - q * (dur / n)) / dur;
          if (u < 0) continue;
          if (b.travel.stream || b.travel.loop) u %= 1;
          else if (u > 1) u = 1;
          const [x, y] = at(E.inOut(u));
          const fade = (b.travel.stream || b.travel.loop ? clamp01(Math.min(u, 1 - u) * 8) : 1) * lp;
          svg.push(<circle key={`tk${i}-${q}`} cx={x} cy={y} r={b.travel.stream ? 11 : 16} fill={col} stroke="#fff" strokeWidth={4} opacity={fade} />);
        }
      }
    }
    // cross: a red X struck over the wrong thing
    if (b.cross) {
      const r = B.where(b.cross);
      if (r) {
        const [x, y] = scr(r.pt);
        const h = r.box ? Math.min(r.box.w, r.box.h) * cam.s * 0.36 : 70;
        const p1 = tw(f, bf, 10, E.inOut);
        const p2 = tw(f, bf + 8, 10, E.inOut);
        const xo = 1 - twx(f, Math.min(nextMove(i), goneAt([b.cross])), 14, E.inOut);
        svg.push(
          <g key={`x${i}`} stroke="#E11D48" strokeWidth={16} strokeLinecap="round" fill="none" opacity={xo}>
            <path d={`M${x - h} ${y - h} L${x + h} ${y + h}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p1} />
            <path d={`M${x + h} ${y - h} L${x - h} ${y + h}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p2} />
          </g>,
        );
        sfx.push(<Sfx key={`xs${i}`} at={bf} name="stamp" volume={0.25} />);
      }
    }
  });

  // sound cues on beats (repeatable: a heartbeat, a monitor beep)
  m.beats.forEach((b, i) => {
    arr(b.sfx).forEach((c, k) => {
      const cue = typeof c === 'string' ? {name: c} : c;
      const n = Math.max(1, cue.count ?? 1);
      for (let q = 0; q < n; q++) sfx.push(<Sfx key={`c${i}-${k}-${q}`} at={beats[i] + q * (cue.every ?? 30)} name={cue.name as SfxName} volume={cue.volume ?? 0.5} />);
    });
  });

  // inset: a magnifier loupe showing the micro view beside its target, until the next overview
  const insets: React.ReactNode[] = [];
  m.beats.forEach((b, i) => {
    const q = loupes[i];
    if (!b.inset || !q || f < beats[i]) return;
    const o = tw(f, beats[i], 18, E.out) * (1 - twx(f, q.until, 14, E.inOut));
    if (o <= 0.01) return;
    const p = scr(B.where(b.inset.of)!.pt);
    const box = q.box;
    const cx = box.x + R;
    const cy = box.y + R;
    const art = ARTS[b.inset.art](b.inset.data ?? {});
    // the loupe magnifies: the art's centre fills it
    const k = Math.min((2 * R) / art.w, (2 * R) / art.h) * (b.inset.zoom ?? 1.7);
    const local = f - beats[i] - 6;
    const acts2 = new Map((b.inset.act ?? []).map((a, q) => [a, 24 + q * 30]));
    const d = Math.hypot(cx - p[0], cy - p[1]);
    const s = mix(0.4, 1, tw(f, beats[i], 22, E.settle));
    insets.push(
      <React.Fragment key={`in${i}`}>
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o}} width={1920} height={1080}>
          <path d={`M${p[0]} ${p[1]} L${cx - ((cx - p[0]) / d) * R} ${cy - ((cy - p[1]) / d) * R}`} stroke={brand.magenta} strokeWidth={4} strokeDasharray="3 10" strokeLinecap="round" />
          <circle cx={p[0]} cy={p[1]} r={16} fill="none" stroke={brand.magenta} strokeWidth={4} />
        </svg>
        <div style={{position: 'absolute', left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, borderRadius: '50%', overflow: 'hidden', background: '#fff', boxShadow: `0 0 0 8px #fff, 0 0 0 12px ${brand.magenta}, ${surface.shadow}`, opacity: o, transform: `scale(${s})`}}>
          <ArtView art={art} k={k} ctx={{f: local, at: (a) => (acts2.has(a) ? acts2.get(a)! : null)}} style={{left: R - (art.w * k) / 2, top: R - (art.h * k) / 2}} />
        </div>
        <Sfx at={beats[i]} name="push" volume={0.25} />
      </React.Fragment>,
    );
  });

  return (
    <>
      {/* the world runs past the frame as the camera travels, fading softly into the page at
          the sides — never a hard crop, and the side margins stay clear (review/qa gate) */}
      <div style={{position: 'absolute', inset: 0, maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE}}>
        {layers}
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} width={1920} height={1080}>
          {svg}
        </svg>
      </div>
      {insets}
      {html}
      {sfx}
    </>
  );
};

/** The current note (the latest beat's `note`), as a line under the title. */
const Note: React.FC<{m: Model; beats: number[]; f: number; y: number; size: number}> = ({m, beats, f, y, size}) => {
  let cur = -1;
  m.beats.forEach((b, i) => {
    if (b.note !== undefined && f >= beats[i]) cur = i;
  });
  if (cur < 0 || !m.beats[cur].note) return null;
  const text = m.beats[cur].note!;
  const p = tw(f, beats[cur], 16, E.out);
  const fs = fitSize(text, 1500, 1, {max: size, min: 28, advance: ADVANCE.serif});
  return (
    <div key={cur} style={{position: 'absolute', left: 120, top: y, maxWidth: 1560, fontFamily: fonts.heading, fontWeight: 600, fontSize: fs, lineHeight: lhS(1.15), color: ink.ink, opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>
      <span style={{display: 'inline-block', background: 'rgba(255,255,255,0.94)', borderLeft: `6px solid ${brand.magenta}`, borderRadius: 12, padding: '8px 20px 10px 18px', boxShadow: surface.shadow}}>
        <Rich text={text} />
      </span>
    </div>
  );
};

export const StageScene: React.FC<{scene: SceneTiming; spec: StageSpec; enter: TxPlan; exit: TxPlan | null}> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const s0 = overlaps(enter) ? -10 : 2;
  const beats = React.useMemo(
    () => anchorGroup(scene, revealGroups(spec).beats, fps, {start: 0.05, end: 0.9, minGapFrames: 18}).map((b) => Math.min(b, scene.durationInFrames - HOLD)),
    [scene, spec, fps],
  );
  const view = React.useMemo(() => viewFor(!!spec.title), [spec.title]);
  const dark = spec.mood === 'dark';
  // the latest hero title, until the next title or camera move
  let hero = -1;
  spec.beats.forEach((b, i) => {
    if (f >= beats[i] && b.title !== undefined) hero = i;
  });
  let heroUntil = Infinity;
  if (hero >= 0) for (let j = hero + 1; j < spec.beats.length; j++) if (spec.beats[j].title !== undefined || spec.beats[j].camera) (heroUntil = Math.min(heroUntil, beats[j]));
  const heroO = hero >= 0 ? 1 - (Number.isFinite(heroUntil) ? tw(f, heroUntil, 14, E.inOut) : 0) : 0;
  const flashes = spec.beats.map((b, i) => (b.flash ? beats[i] : null)).filter((x): x is number => x != null);
  const flash = flashes.reduce((m, at) => Math.max(m, f >= at ? 1 - tw(f, at, 18, E.out) : 0), 0);
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} bare={spec.bare}>
      {dark ? <div style={{position: 'absolute', inset: -80, background: 'radial-gradient(ellipse at 50% 45%, #16213F 0%, #0B1022 55%, #05070F 100%)'}} /> : null}
      <StageView m={spec} beats={beats} view={view} f={f} s0={s0} />
      {hero >= 0 && heroO > 0.01 ? (
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: heroO, background: dark ? 'radial-gradient(ellipse at 50% 50%, rgba(5,7,15,0.8), rgba(5,7,15,0.45) 60%, transparent 85%)' : 'radial-gradient(ellipse at 50% 50%, rgba(250,249,252,0.93), rgba(250,249,252,0.7) 55%, transparent 85%)'}}>
          <div key={hero} style={{width: 1500, textAlign: 'center'}}>
            <MaskWords text={spec.beats[hero].title!} at={beats[hero]} size={fitSize(spec.beats[hero].title!, 1500, 2, {max: 104, min: 60, advance: ADVANCE.serif})} width={1500} stagger={2.2} color={dark ? '#FFFFFF' : undefined} />
          </div>
        </div>
      ) : null}
      {flash > 0.01 ? <div style={{position: 'absolute', inset: -80, background: '#F4FBFF', opacity: flash}} /> : null}
      {spec.title ? (
        <div style={{position: 'absolute', left: 120, top: 104}}>
          <MaskWords text={spec.title} at={s0} size={fitSize(spec.title, 1680, 1, {max: 58, min: 40, advance: ADVANCE.serif})} width={1680} stagger={2} />
        </div>
      ) : null}
      <Note m={spec} beats={beats} f={f} y={spec.title ? 186 : 104} size={spec.title ? 34 : 42} />
    </SceneFrame>
  );
};
