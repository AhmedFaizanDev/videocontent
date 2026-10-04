/**
 * Generic, data-driven diagrams — the default way to illustrate ANY subject. Each takes
 * `data.items` (see src/art/catalog.ts for limits), exposes anchors i1…iN, and lights item
 * i when its callout is spoken: idle → active (orange) → done (teal). All text is HTML.
 */
import React from 'react';
import {Img, staticFile} from 'remotion';
import {fonts, ink} from '../theme';
import {ADVANCE, E, clamp01, estLines, mix, tw} from '../motion';
import {INK, Sh, T, circ, draw, rect, type ArtCtx, type ArtDef, type ArtFactory} from './kit';
import type {Item} from './catalog';
import {TONES} from './graph';

const lights = (c: ArtCtx, n: number) => {
  const beats = Array.from({length: n}, (_, i) => c.at(`i${i + 1}`));
  const active = beats.reduce<number>((a, b, i) => (b != null && c.f >= b ? i : a), -1);
  const lit = (i: number) => beats[i] != null && c.f >= beats[i]!;
  const pop = (i: number) => (lit(i) ? tw(c.f, beats[i]!, 14, E.settle) : 0);
  const fill = (i: number) => (i === active ? ink.orange : lit(i) ? ink.teal : ink.paperShade);
  const fillO = (i: number) => (i === active ? 0.95 : lit(i) ? 0.45 : 0.9);
  return {beats, active, lit, pop, fill, fillO};
};
const spread = (m: number, a: number, b: number) => (m === 1 ? [(a + b) / 2] : Array.from({length: m}, (_, i) => mix(a, b, i / (m - 1))));
const num = (i: number) => String(i + 1).padStart(2, '0');

/* ======================================================================== cycle */
const cycle: ArtFactory = (data) => {
  const items: Item[] = data.items;
  const n = items.length;
  const W = 1680;
  const H = 540;
  const [TOP, BOT, X0, X1] = [90, 380, 360, 1380];
  const m1 = Math.ceil(n / 2);
  const pos: [number, number][] = [...spread(m1, X0, X1).map((x) => [x, TOP] as [number, number]), ...spread(n - m1, X1, X0).map((x) => [x, BOT] as [number, number])];
  const track = `M${X0} ${TOP} L${X1} ${TOP} C ${X1 + 220} ${TOP} ${X1 + 220} ${BOT} ${X1} ${BOT} L${X0} ${BOT} C ${X0 - 220} ${BOT} ${X0 - 220} ${TOP} ${X0} ${TOP}`;
  // the loop as a polyline, so the token can travel it between stations
  const cub = (a: number, b: number, c2: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c2 + t ** 3 * d;
  const poly: [number, number][] = [];
  for (let k = 0; k <= 60; k++) poly.push([mix(X0, X1, k / 60), TOP]);
  for (let k = 1; k <= 40; k++) poly.push([cub(X1, X1 + 220, X1 + 220, X1, k / 40), cub(TOP, TOP, BOT, BOT, k / 40)]);
  for (let k = 1; k <= 60; k++) poly.push([mix(X1, X0, k / 60), BOT]);
  for (let k = 1; k < 40; k++) poly.push([cub(X0, X0 - 220, X0 - 220, X0, k / 40), cub(BOT, BOT, TOP, TOP, k / 40)]);
  const near = ([x, y]: [number, number]) => poly.reduce((best, p, k) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(poly[best][0] - x, poly[best][1] - y) ? k : best), 0);
  const startPt: [number, number] = [X0 - 165, (TOP + BOT) / 2];
  // the START tag hangs outside the loop, left of the arc, clear of station labels
  const tagC: [number, number] = [startPt[0] - 90, startPt[1]];
  const idx = pos.map(near);
  const startIdx = near(startPt);
  const along = (from: number, to: number, u: number) => {
    const span = (to - from + poly.length) % poly.length;
    return poly[Math.round(from + span * u) % poly.length];
  };
  const labelW = Math.min(360, m1 > 1 ? (X1 - X0) / (m1 - 1) - 36 : 520);
  const R = n <= 5 ? 64 : 56;

  const C: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    let tok: [number, number] | null = null;
    if (L.active >= 0) {
      const u = tw(c.f, L.beats[L.active]!, 16, E.inOut);
      const from = L.active === 0 ? (data.start ? startIdx : idx[0]) : idx[L.active - 1];
      tok = along(from, idx[L.active], u);
    }
    return (
      <g>
        <path d={track} fill="none" stroke={INK} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(c.f, 0, 40)} />
        <path d={track} fill="none" stroke={ink.orange} strokeWidth={14} strokeDasharray="2 30" opacity={0.5 * tw(c.f, 30, 20)} />
        {data.start ? <path d={`${rect(tagC[0] - 85, tagC[1] - 24, 170, 48, 6)} M${tagC[0] + 85} ${tagC[1]} L${startPt[0]} ${startPt[1]}`} fill={INK} stroke={INK} strokeWidth={4} opacity={tw(c.f, 20, 14)} /> : null}
        {tok ? (
          <g>
            <circle cx={tok[0]} cy={tok[1]} r={16} fill={INK} />
            <circle cx={tok[0]} cy={tok[1]} r={7} fill={ink.sun} />
          </g>
        ) : null}
        {pos.map(([x, y], i) => {
          const r = R * (1 + 0.14 * L.pop(i) * (i === L.active ? 1 : 0.4));
          return (
            <g key={i} opacity={tw(c.f, 10 + i * 3, 12)}>
              <circle cx={x} cy={y} r={r} fill={ink.paperLight} />
              <circle cx={x} cy={y} r={r} fill={L.fill(i)} opacity={L.fillO(i)} style={{mixBlendMode: 'multiply'}} />
              <circle cx={x} cy={y} r={r} fill="none" stroke={INK} strokeWidth={4} />
            </g>
          );
        })}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <>
        {data.start ? (
          <T x={tagC[0]} y={tagC[1]} size={30} family={fonts.mono} spacing="0.12em" color={ink.paperLight} o={tw(c.f, 20, 14)}>
            {String(data.start).toUpperCase()}
          </T>
        ) : null}
        {pos.map(([x, y], i) => {
          const o = tw(c.f, 10 + i * 3, 12);
          return (
            <React.Fragment key={i}>
              <T x={x} y={y} size={R * 0.8} family={fonts.body} color={i === L.active ? ink.paperLight : INK} o={o}>
                {num(i)}
              </T>
              <T x={x} y={y + R + 16} align="top" maxWidth={labelW} size={36} weight={600} color={i === L.active ? ink.orangeText : INK} o={o}>
                {items[i].label}
              </T>
            </React.Fragment>
          );
        })}
      </>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: Object.fromEntries(pos.map((p, i) => [`i${i + 1}`, p])), C, Html};
};

/* ======================================================================== flow */
const flow: ArtFactory = (data) => {
  const items: Item[] = data.items;
  const n = items.length;
  const W = 1680;
  const GAP = 96;
  const cw = (W - 40 - (n - 1) * GAP) / n;
  const label = Math.round(Math.max(34, Math.min(60, cw / 6.2)));
  const lines = Math.max(...items.map((it) => estLines(it.label, cw - 52, label, ADVANCE.serif)));
  const CH = Math.round(118 + lines * label * 1.08 + 34);
  const Y = 30;
  const H = CH + 70;
  const x = (i: number) => 20 + i * (cw + GAP);
  const C: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <g>
        {items.map((_, i) => {
          const on = i === L.active;
          const lift = on ? 8 * L.pop(i) : 0;
          return (
            <g key={i} transform={`translate(0 ${-lift})`} opacity={tw(c.f, 8 + i * 4, 12)}>
              <path d={rect(x(i) + 8, Y + 8, cw, CH, 6)} fill={ink.paperShade} opacity={0.8} style={{mixBlendMode: 'multiply'}} />
              <path d={rect(x(i), Y, cw, CH, 6)} fill={ink.paperLight} />
              <path d={rect(x(i), Y, cw, 16, 0)} fill={L.fill(i)} opacity={L.lit(i) ? 1 : 0.9} />
              <Sh d={rect(x(i), Y, cw, CH, 6)} p={draw(c.f, i, 24)} sw={on ? 5 : 3} stroke={on ? ink.orange : INK} />
            </g>
          );
        })}
        {items.slice(1).map((_, i) => {
          const x0 = x(i) + cw + 14;
          const x1 = x(i + 1) - 18;
          const y = Y + CH / 2;
          const p = L.beats[i + 1] != null ? tw(c.f, L.beats[i + 1]! - 8, 14, E.inOut) : 0;
          return (
            <g key={i} strokeLinecap="round" fill="none">
              <path d={`M${x0} ${y} L${x1} ${y}`} stroke={INK} strokeWidth={3} strokeDasharray="4 8" opacity={0.35 * tw(c.f, 20, 12)} />
              {p > 0 ? (
                <>
                  <path d={`M${x0} ${y} L${mix(x0, x1, p)} ${y}`} stroke={ink.orange} strokeWidth={6} />
                  {p > 0.95 ? <path d={`M${x1 - 16} ${y - 13} L${x1} ${y} L${x1 - 16} ${y + 13}`} stroke={ink.orange} strokeWidth={6} /> : null}
                  {/* the hand-off keeps moving: particles run the completed arrow */}
                  {p > 0.95
                    ? [0, 0.5].map((ph) => {
                        const u = (((c.f - L.beats[i + 1]!) / 30 + ph) % 1 + 1) % 1;
                        return <circle key={ph} cx={mix(x0, x1 - 18, u)} cy={y} r={6} fill={ink.paperLight} stroke={ink.orange} strokeWidth={3} opacity={Math.sin(Math.PI * u)} />;
                      })
                    : null}
                </>
              ) : null}
            </g>
          );
        })}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <>
        {items.map((it, i) => {
          const o = tw(c.f, 8 + i * 4, 12);
          const lift = i === L.active ? 8 * L.pop(i) : 0;
          return (
            <React.Fragment key={i}>
              <div style={{position: 'absolute', left: x(i) + 26, top: Y + 30 - lift, fontFamily: fonts.body, fontWeight: 700, fontSize: 72, lineHeight: 1, color: ink.orange, mixBlendMode: 'multiply', opacity: o}}>{num(i)}</div>
              <div style={{position: 'absolute', left: x(i) + 26, top: Y + 118 - lift, width: cw - 52, fontFamily: fonts.body, fontSize: label, lineHeight: 1.08, color: INK, opacity: o}}>{it.label}</div>
            </React.Fragment>
          );
        })}
      </>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: Object.fromEntries(items.map((_, i) => [`i${i + 1}`, [x(i) + cw / 2, Y + CH / 2]])), C, Html};
};

/* ======================================================================== timeline */
const timeline: ArtFactory = (data) => {
  const items: Item[] = data.items;
  const n = items.length;
  const W = 1680;
  const H = 420;
  const LY = 150;
  const xs = spread(n, 170, 1510);
  const gap = (1510 - 170) / (n - 1);
  const size = n <= 4 ? 40 : n === 5 ? 36 : n === 6 ? 32 : 30;
  const whenSize = Math.min(34, Math.floor((gap - 20) / (12 * 0.6)));
  const C: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    const reach = L.active >= 0 ? mix(L.active === 0 ? 60 : xs[L.active - 1], xs[L.active], tw(c.f, L.beats[L.active]!, 18, E.inOut)) : 60;
    return (
      <g>
        <path d={`M60 ${LY} L1620 ${LY}`} stroke={INK} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(c.f, 0, 36)} />
        <path d={`M1600 ${LY - 14} L1622 ${LY} L1600 ${LY + 14}`} stroke={INK} strokeWidth={5} fill="none" opacity={tw(c.f, 40, 10)} />
        {L.active >= 0 ? <path d={`M60 ${LY} L${reach} ${LY}`} stroke={ink.orange} strokeWidth={10} strokeLinecap="round" style={{mixBlendMode: 'multiply'}} /> : null}
        {xs.map((x, i) => {
          const r = 16 * (1 + 0.4 * L.pop(i) * (i === L.active ? 1 : 0.3));
          return (
            <g key={i} opacity={tw(c.f, 12 + i * 3, 12)}>
              <path d={`M${x} ${LY + 22} L${x} ${LY + 44}`} stroke={INK} strokeWidth={2} opacity={0.5} />
              <circle cx={x} cy={LY} r={r + 5} fill={ink.paperLight} />
              <circle cx={x} cy={LY} r={r} fill={i === L.active ? ink.orange : L.lit(i) ? ink.teal : ink.paperShade} stroke={INK} strokeWidth={3} />
            </g>
          );
        })}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <>
        {items.map((it, i) => {
          const o = tw(c.f, 12 + i * 3, 12);
          const on = i === L.active;
          return (
            <React.Fragment key={i}>
              <T x={xs[i]} y={LY - 34} align="bottom" size={whenSize} family={fonts.mono} weight={600} color={on ? ink.orangeText : ink.soft} o={o}>
                {it.when}
              </T>
              <T x={xs[i]} y={LY + 54} align="top" maxWidth={Math.min(380, gap - 24)} size={size} weight={600} color={on ? ink.orangeText : INK} o={o}>
                {it.label}
              </T>
            </React.Fragment>
          );
        })}
      </>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: Object.fromEntries(xs.map((x, i) => [`i${i + 1}`, [x, LY]])), C, Html};
};

/* ======================================================================== hub */
const hub: ArtFactory = (data) => {
  const items: Item[] = data.items;
  const n = items.length;
  const W = 1680;
  const SR = n <= 4 ? 114 : 104;
  const CR = 104;
  const RY = CR + SR + 28; // top/bottom satellites clear the centre disc
  const [CX, CY, RX] = [840, RY + SR + 6, 580];
  const H = 2 * CY;
  const pos = items.map((_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [CX + RX * Math.cos(a), CY + RY * Math.sin(a)] as [number, number];
  });
  const C: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <g>
        {pos.map(([x, y], i) => {
          const p = L.beats[i] != null ? tw(c.f, L.beats[i]! - 4, 14, E.inOut) : 0;
          return (
            <g key={i}>
              <path d={`M${CX} ${CY} L${x} ${y}`} stroke={INK} strokeWidth={3} strokeDasharray="5 9" opacity={0.3 * tw(c.f, 24, 12)} />
              {p > 0 ? <path d={`M${CX} ${CY} L${mix(CX, x, p)} ${mix(CY, y, p)}`} stroke={i === L.active ? ink.orange : INK} strokeWidth={5} strokeLinecap="round" /> : null}
              {p >= 1 && i === L.active
                ? (() => {
                    const u = (((c.f - L.beats[i]!) / 34) % 1 + 1) % 1;
                    return <circle cx={mix(CX, x, u)} cy={mix(CY, y, u)} r={8} fill={ink.orange} stroke={ink.paperLight} strokeWidth={3} opacity={Math.sin(Math.PI * u)} />;
                  })()
                : null}
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={CR} fill={INK} opacity={tw(c.f, 4, 16)} />
        <circle cx={CX} cy={CY} r={CR} fill={ink.blue} opacity={0.25 * tw(c.f, 4, 16)} style={{mixBlendMode: 'multiply'}} />
        {pos.map(([x, y], i) => {
          const r = SR * (1 + 0.12 * L.pop(i) * (i === L.active ? 1 : 0.3));
          return (
            <g key={i} opacity={tw(c.f, 14 + i * 3, 12)}>
              <circle cx={x} cy={y} r={r} fill={ink.paperLight} />
              <circle cx={x} cy={y} r={r} fill={L.fill(i)} opacity={L.fillO(i)} style={{mixBlendMode: 'multiply'}} />
              <path d={circ(x, y, r)} fill="none" stroke={INK} strokeWidth={4} />
            </g>
          );
        })}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <>
        <T x={CX} y={CY} size={36} family={fonts.body} maxWidth={CR * 1.7} color={ink.paperLight} o={tw(c.f, 10, 14)}>
          {data.center}
        </T>
        {pos.map(([x, y], i) => (
          <T key={i} x={x} y={y} size={n <= 4 ? 36 : 32} weight={600} maxWidth={SR * 1.78} color={i === L.active ? ink.paperLight : INK} o={tw(c.f, 14 + i * 3, 12)}>
            {items[i].label}
          </T>
        ))}
      </>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: Object.fromEntries(pos.map((p, i) => [`i${i + 1}`, p])), C, Html};
};

/* ======================================================================== stack */
const stack: ArtFactory = (data) => {
  const items: Item[] = data.items;
  const n = items.length;
  const W = Math.max(800, data.width ?? 1680); // a composition lays it out at its slot's width
  const G = 14;
  const [X0, X1] = [220, W - 220];
  // the label size that fits the longest label in its box (never under 34): long labels wrap and the boxes grow
  const longest = Math.max(...items.map((it) => it.label.length), 1);
  const size = Math.max(34, Math.min(50, (X1 - X0 - 68) / (longest * 0.56)));
  const lines = Math.ceil((longest * 0.56 * size) / (X1 - X0 - 68));
  const bh = Math.max(96, lines * size * 1.12 + 22);
  const H = Math.max(540, n * bh + (n - 1) * G + 30);
  const y0 = (H - (n * bh + (n - 1) * G)) / 2;
  const y = (i: number) => y0 + i * (bh + G);
  const C: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <g>
        {items.map((_, i) => (
          <g key={i} opacity={tw(c.f, 6 + i * 4, 12)}>
            <path d={rect(X0, y(i), X1 - X0, bh, 4)} fill={L.fill(i)} opacity={L.fillO(i)} style={{mixBlendMode: 'multiply'}} />
            <path d={rect(X0, y(i), X1 - X0, bh, 4)} fill={ink.paperLight} opacity={0.55} />
            <Sh d={rect(X0, y(i), X1 - X0, bh, 4)} p={draw(c.f, i, 22)} sw={i === L.active ? 5 : 3} stroke={i === L.active ? ink.orange : INK} />
            <circle cx={X0 - 60} cy={y(i) + bh / 2} r={Math.min(32, bh / 2 - 4)} fill={i === L.active ? ink.orange : ink.paperLight} stroke={INK} strokeWidth={3} />
          </g>
        ))}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <>
        {items.map((it, i) => (
          <React.Fragment key={i}>
            <T x={X0 - 60} y={y(i) + bh / 2} size={34} family={fonts.mono} weight={600} color={i === L.active ? ink.paperLight : INK} o={tw(c.f, 6 + i * 4, 12)}>
              {num(i)}
            </T>
            <div style={{position: 'absolute', left: X0 + 34, top: y(i), height: bh, width: X1 - X0 - 68, display: 'flex', alignItems: 'center', fontFamily: fonts.body, fontWeight: i === L.active ? 700 : 600, fontSize: size, lineHeight: 1.05, color: INK, opacity: tw(c.f, 6 + i * 4, 12)}}>
              {it.label}
            </div>
          </React.Fragment>
        ))}
      </>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: Object.fromEntries(items.map((_, i) => [`i${i + 1}`, [X1, y(i) + bh / 2]])), C, Html};
};

/* ======================================================================== image */
const image: ArtFactory = (data) => {
  const W = data.w ?? 1000;
  const H = data.h ?? 620;
  const C: React.FC<ArtCtx> = (c) => <path d={rect(0, 0, W, H)} fill="none" stroke={INK} strokeWidth={3} opacity={0.6 * tw(c.f, 16, 12)} />;
  const Html: React.FC<ArtCtx> = (c) => (
    <>
      <Img src={staticFile(data.src)} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'contain', opacity: tw(c.f, 4, 18)}} />
      <div style={{position: 'absolute', left: 10, bottom: 8, fontFamily: fonts.mono, fontSize: 14, color: ink.soft, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', opacity: clamp01(tw(c.f, 20, 12))}}>{data.credit}</div>
    </>
  );
  const anchors = Object.fromEntries(Object.entries(data.points ?? {}).map(([k, [fx, fy]]: any) => [k, [fx * W, fy * H]]));
  return {w: W, h: H, layout: 'side', anchors, C, Html} satisfies ArtDef;
};


/* ======================================================================== bars */
/** Quantities that grow as they're spoken, with count-up readouts and an optional reference line. */
const bars: ArtFactory = (data) => {
  const items: (Item & {value: number; display?: string; tone?: string})[] = data.items;
  const n = items.length;
  const W = Math.max(800, data.width ?? 1680); // a composition lays it out at its slot's width
  const H = 560;
  const [TOP, BASE] = [96, 400];
  const max = data.max ?? Math.max(...items.map((i) => i.value)) * 1.08;
  const bw = Math.min(200, (W - 240 - (n - 1) * 46) / n);
  const xs = spread(n, 120 + bw / 2, W - 120 - bw / 2);
  const hOf = (v: number) => (v / max) * (BASE - TOP);
  const unit = data.unit ? ` ${data.unit}` : '';
  const fillOf = (it: {tone?: string}) => (it.tone ? (TONES[it.tone] ?? TONES.ink).fill : ink.teal);
  const C: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <g>
        <path d={`M80 ${BASE} L${W - 80} ${BASE}`} stroke={INK} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(c.f, 0, 30)} />
        {data.ref ? <path d={`M80 ${BASE - hOf(data.ref.value)} L${W - 80} ${BASE - hOf(data.ref.value)}`} stroke={ink.red} strokeWidth={3} strokeDasharray="12 10" opacity={tw(c.f, 24, 14)} /> : null}
        {items.map((it, i) => {
          const g = L.beats[i] != null ? tw(c.f, L.beats[i]!, 30, E.out) : 0;
          const h = hOf(it.value) * g;
          const on = i === L.active;
          return (
            <g key={i}>
              <path d={rect(xs[i] - bw / 2, BASE - h, bw, h, 6)} fill={ink.paperLight} />
              <path d={rect(xs[i] - bw / 2, BASE - h, bw, h, 6)} fill={fillOf(it)} opacity={on ? 0.95 : 0.6} style={{mixBlendMode: 'multiply'}} />
              {h > 2 ? <path d={rect(xs[i] - bw / 2, BASE - h, bw, h, 6)} fill="none" stroke={on ? ink.orange : INK} strokeWidth={on ? 5 : 3} /> : null}
              <path d={`M${xs[i] - bw / 2 - 8} ${BASE} L${xs[i] + bw / 2 + 8} ${BASE}`} stroke={INK} strokeWidth={2} strokeDasharray="4 6" opacity={0.45 * tw(c.f, 10 + i * 3, 10)} />
            </g>
          );
        })}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const L = lights(c, n);
    return (
      <>
        {data.ref ? (
          // a legend in the top corner away from the taller end bar, so it never sits on a bar or its value
          <div style={{position: 'absolute', top: 8, ...(items[0].value >= items[n - 1].value ? {right: 80} : {left: 84}), display: 'flex', alignItems: 'center', gap: 10, fontFamily: fonts.label, fontWeight: 600, fontSize: 22, color: ink.red, opacity: tw(c.f, 30, 12)}}>
            <span style={{width: 34, borderTop: `3px dashed ${ink.red}`}} />
            {data.ref.label}
          </div>
        ) : null}
        {items.map((it, i) => {
          const g = L.beats[i] != null ? tw(c.f, L.beats[i]!, 30, E.out) : 0;
          const on = i === L.active;
          // a stated range/label shows as-is; a plain value counts up as the bar grows
          const shown = it.display ? it.display : `${Number.isInteger(it.value) ? Math.round(it.value * g) : (it.value * g).toFixed(1)}${unit}`;
          return (
            <React.Fragment key={i}>
              <T x={xs[i]} y={BASE - hOf(it.value) * g - 16} align="bottom" size={Math.min(46, Math.max(36, bw / 3.6))} family={fonts.mono} weight={600} color={on ? ink.orangeText : INK} o={clamp01(g * 3)}>
                {shown}
              </T>
              <T x={xs[i]} y={BASE + 18} align="top" maxWidth={bw + 40} size={Math.min(38, Math.max(34, bw / 5.2))} weight={600} color={on ? ink.orangeText : INK} o={tw(c.f, 10 + i * 3, 12)}>
                {it.label}
              </T>
            </React.Fragment>
          );
        })}
      </>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: Object.fromEntries(items.map((it, i) => [`i${i + 1}`, [xs[i], BASE - hOf(it.value)]])), C, Html};
};

/* ======================================================================== trace */
/**
 * A waveform drawn by a moving pen (an ECG, an action potential, a pressure or sound
 * wave): built from shape segments, drawn in step with the narration, labelled segments
 * lighting up as they're spoken; then a monitor blip keeps sweeping it.
 */
type Seg = {shape?: 'flat' | 'bump' | 'spike' | 'dip' | 'plateau' | 'rise' | 'fall'; w?: number; h?: number; label?: string; note?: string; say?: string[]};
const shapeY = (s: Seg, u: number) => {
  const h = s.h ?? (s.shape === 'spike' ? 1 : s.shape === 'dip' ? -0.2 : s.shape === 'plateau' ? 0.8 : s.shape === 'bump' ? 0.25 : s.shape === 'rise' || s.shape === 'fall' ? 0.5 : 0);
  switch (s.shape) {
    case 'bump':
      return h * Math.sin(Math.PI * u);
    case 'spike':
    case 'dip':
      return h * (u < 0.5 ? u / 0.5 : (1 - u) / 0.5);
    case 'plateau':
      return h * (u < 0.1 ? u / 0.1 : u < 0.72 ? 1 - 0.12 * ((u - 0.1) / 0.62) : 0.88 * (1 - (u - 0.72) / 0.28));
    case 'rise':
      return h * u;
    case 'fall':
      return h * (1 - u);
    default:
      return 0;
  }
};
const trace: ArtFactory = (data) => {
  const one: Seg[] = data.segments;
  const reps = Math.max(1, Math.min(4, data.repeat ?? 1));
  const segs: (Seg & {rep: number})[] = Array.from({length: reps}, (_, r) => one.map((s) => ({...s, rep: r}))).flat();
  const W = 1680;
  const H = 480;
  const [X0, X1, BASEY, AMP] = [60, 1620, 330, 230];
  const units = segs.reduce((a, s) => a + (s.w ?? 1), 0);
  const kx = (X1 - X0) / units;
  const starts: number[] = [];
  segs.reduce((a, s) => (starts.push(a), a + (s.w ?? 1)), 0);
  const pts: [number, number][] = [];
  segs.forEach((s, i) => {
    const n = Math.max(4, Math.round((s.w ?? 1) * 24));
    for (let j = i ? 1 : 0; j <= n; j++) pts.push([X0 + (starts[i] + ((s.w ?? 1) * j) / n) * kx, BASEY - shapeY(s, j / n) * AMP]);
  });
  const labelled = segs.map((s, i) => (s.label && s.rep === 0 ? i : -1)).filter((i) => i >= 0);
  const segX = (i: number) => [X0 + starts[i] * kx, X0 + (starts[i] + (segs[i].w ?? 1)) * kx];
  const peakY = (i: number) => Math.min(...pts.filter(([x]) => x >= segX(i)[0] && x <= segX(i)[1]).map(([, y]) => y));
  const yAt = (x: number) => {
    const j = pts.findIndex(([px]) => px >= x);
    if (j <= 0) return pts[0][1];
    const [a, b] = [pts[j - 1], pts[j]];
    return mix(a[1], b[1], (x - a[0]) / Math.max(1e-6, b[0] - a[0]));
  };
  // pen position: reaches the end of each labelled segment as it is spoken
  const penX = (c: ArtCtx) => {
    const beats = labelled.map((_, k) => c.at(`i${k + 1}`));
    const keys: [number, number][] = [[4, X0]];
    labelled.forEach((i, k) => beats[k] != null && keys.push([beats[k]! + 10, segX(i)[1]]));
    const lastT = keys[keys.length - 1][0];
    keys.push([lastT + 50, X1]);
    for (let k = 1; k < keys.length; k++) {
      const [t0, x0] = keys[k - 1];
      const [t1, x1] = keys[k];
      if (c.f <= t1) return mix(x0, x1, E.inOut(clamp01((c.f - t0) / Math.max(1, t1 - t0))));
    }
    return X1;
  };
  const C: React.FC<ArtCtx> = (c) => {
    const px = Math.max(X0, penX(c));
    const drawn = pts.filter(([x]) => x <= px);
    const d = drawn.length > 1 ? `M${drawn.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} L${px.toFixed(1)} ${yAt(px).toFixed(1)}` : '';
    const beats = labelled.map((_, k) => c.at(`i${k + 1}`));
    const active = beats.reduce<number>((a, b, k) => (b != null && c.f >= b ? k : a), -1);
    const done = px >= X1 - 1;
    const doneAt = done ? (beats.filter((b) => b != null).pop() ?? 0) + 60 : Infinity;
    const blip = done ? X0 + (((c.f - doneAt) * 9) % (X1 - X0 + 200)) : -1;
    return (
      <g>
        {data.grid !== false ? (
          <g opacity={0.45 * tw(c.f, 0, 20)}>
            {Array.from({length: Math.floor((X1 - X0) / 40) + 1}, (_, i) => (
              <path key={`v${i}`} d={`M${X0 + i * 40} 40 L${X0 + i * 40} ${H - 40}`} stroke={ink.pink} strokeWidth={i % 5 ? 1 : 2.2} />
            ))}
            {Array.from({length: Math.floor((H - 80) / 40) + 1}, (_, i) => (
              <path key={`h${i}`} d={`M${X0} ${40 + i * 40} L${X1} ${40 + i * 40}`} stroke={ink.pink} strokeWidth={i % 5 ? 1 : 2.2} />
            ))}
          </g>
        ) : null}
        {labelled.map((i, k) => {
          const b = beats[k];
          if (b == null || c.f < b) return null;
          const [x0, x1] = segX(i);
          const on = k === active;
          return <path key={i} d={rect(x0, 44, x1 - x0, H - 88, 6)} fill={on ? ink.orange : ink.sun} opacity={(on ? 0.2 : 0.12) * tw(c.f, b, 10)} style={{mixBlendMode: 'multiply'}} />;
        })}
        {d ? <path d={d} fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {!done ? (
          <g>
            <circle cx={px} cy={yAt(px)} r={14} fill={ink.orange} opacity={0.25} />
            <circle cx={px} cy={yAt(px)} r={7} fill={ink.orange} />
          </g>
        ) : blip >= X0 && blip <= X1 ? (
          <g>
            <circle cx={blip} cy={yAt(blip)} r={16} fill={ink.teal} opacity={0.25} />
            <circle cx={blip} cy={yAt(blip)} r={7} fill={ink.teal} />
          </g>
        ) : null}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const beats = labelled.map((_, k) => c.at(`i${k + 1}`));
    const active = beats.reduce<number>((a, b, k) => (b != null && c.f >= b ? k : a), -1);
    return (
      <>
        {labelled.map((i, k) => {
          const b = beats[k];
          if (b == null || c.f < b) return null;
          const [x0, x1] = segX(i);
          return (
            <T key={i} x={(x0 + x1) / 2} y={Math.min(peakY(i), BASEY) - 22} align="bottom" size={34} family={fonts.mono} weight={600} color={k === active ? ink.orangeText : INK} o={tw(c.f, b, 10)}>
              {segs[i].label}
            </T>
          );
        })}
      </>
    );
  };
  const anchors = Object.fromEntries(labelled.map((i, k) => [`i${k + 1}`, [(segX(i)[0] + segX(i)[1]) / 2, peakY(i)] as [number, number]]));
  return {w: W, h: H, layout: 'full', anchors, C, Html};
};

export const DIAGRAMS: Record<string, ArtFactory> = {cycle, flow, timeline, hub, stack, image, bars, trace};
