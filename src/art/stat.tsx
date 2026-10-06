/**
 * `stat` — a number made visible: a large figure that counts up as it is spoken, with an icon
 * array that fills in proportion ("nine in ten", "41 %", "1 in 4 patients").
 *
 *   data: {value: number, of?: number (10 → a row of 10 people, 100 → a 10×10 grid of dots),
 *          display?: string (how the figure reads, e.g. "41%", "9 in 10"; default value[/of]),
 *          label?: string ≤ 48 (what it counts), tone?: red|blue|teal|green|ink, unit?: "people"|"dots"}
 * events: count (the figure counts up, the icons fill one by one). anchors: figure, array, count.
 * Without a `count` event the figure and array settle on their own as the scene opens.
 */
import React from 'react';
import {fonts, ink} from '../theme';
import {E, tw} from '../motion';
import {INK, type ArtCtx, type ArtDef, type ArtFactory} from './kit';

export type StatData = {/** layout width in art px (a composition sets it from its slot) */ width?: number; value: number; of?: number; display?: string; label?: string; tone?: string; unit?: 'people' | 'dots'};
const TONE: Record<string, string> = {red: ink.red, blue: ink.blue, teal: ink.teal, green: ink.green, ink: INK, orange: ink.orange};

const person = (x: number, y: number, s: number) =>
  `M${x} ${y - s * 0.62} m${-s * 0.17} 0 a${s * 0.17} ${s * 0.17} 0 1 0 ${s * 0.34} 0 a${s * 0.17} ${s * 0.17} 0 1 0 ${-s * 0.34} 0 ` +
  `M${x - s * 0.27} ${y + s * 0.5} V${y - s * 0.08} Q${x - s * 0.27} ${y - s * 0.34} ${x} ${y - s * 0.36} Q${x + s * 0.27} ${y - s * 0.34} ${x + s * 0.27} ${y - s * 0.08} V${y + s * 0.5} Z`;

const stat: ArtFactory = (d: StatData) => {
  const of = d.of && d.of > 0 ? d.of : null;
  const people = of != null && (d.unit === 'people' || (d.unit !== 'dots' && of <= 20));
  const col = TONE[d.tone ?? 'red'] ?? ink.red;
  const W = Math.max(640, d.width ?? 1500);
  const figH = 340;
  const cols = of == null ? 0 : people ? Math.min(of, 10) : 10;
  const rows = of == null ? 0 : Math.ceil(of / cols);
  const cell = of == null ? 0 : people ? Math.min(130, (W - 120) / cols) : Math.min(60, (W - 160) / cols, 900 / rows);
  const arrW = cols * cell;
  const arrH = rows * cell * (people ? 1.35 : 1);
  const H = figH + (of ? arrH + 80 : 0) + 60;
  const filled = Math.round(of == null ? 0 : Math.min(of, d.value <= of ? d.value : (d.value / 100) * of));
  const display = d.display ?? (of ? `${d.value} in ${of}` : `${d.value}`);
  const num = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(display);
  const timing = (c: ArtCtx) => c.at('count') ?? 8;

  const C: React.FC<ArtCtx> = (c) => {
    const t0 = timing(c);
    const ax = (W - arrW) / 2;
    const ay = figH + 60;
    return (
      <g>
        {of
          ? Array.from({length: of}, (_, i) => {
              const r = Math.floor(i / cols);
              const k = i % cols;
              const x = ax + k * cell + cell / 2;
              const y = ay + r * cell * (people ? 1.35 : 1) + cell / 2;
              // icons fill one by one through the count, then hold
              const on = i < filled ? tw(c.f, t0 + 6 + (i / Math.max(1, filled)) * 36, 8, E.out) : 0;
              const appear = tw(c.f, 4 + (i / of) * 18, 10);
              return people ? (
                <g key={i} opacity={appear}>
                  <path d={person(x, y, cell * 0.9)} fill={ink.paperShade} />
                  <path d={person(x, y, cell * 0.9)} fill={col} opacity={on} />
                </g>
              ) : (
                <g key={i} opacity={appear}>
                  <circle cx={x} cy={y} r={cell * 0.36} fill={ink.paperShade} />
                  <circle cx={x} cy={y} r={cell * 0.36 * (0.6 + 0.4 * on)} fill={col} opacity={on} />
                </g>
              );
            })
          : null}
      </g>
    );
  };
  const Html: React.FC<ArtCtx> = (c) => {
    const t0 = timing(c);
    const p = tw(c.f, t0, 34, E.out);
    const o = tw(c.f, Math.max(2, t0 - 6), 10);
    let shown = display;
    if (num && p < 1) {
      const v = parseFloat(num[2].replace(/,/g, '')) * p;
      const dec = (num[2].split('.')[1] ?? '').length;
      shown = `${num[1]}${num[2].includes(',') ? v.toLocaleString('en-US', {maximumFractionDigits: dec, minimumFractionDigits: dec}) : v.toFixed(dec)}${num[3]}`;
    }
    return (
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: figH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: o}}>
        {/* one line, sized to the width: a long display ("16 hours") never wraps out of its box */}
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: Math.min(190, (W * 0.92) / (display.length * 0.6)), lineHeight: 1, whiteSpace: 'nowrap', color: col, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em'}}>{shown}</div>
        {d.label ? <div style={{fontFamily: fonts.body, fontWeight: 600, fontSize: 44, color: ink.soft, marginTop: 14, textAlign: 'center', maxWidth: W - 100}}>{d.label}</div> : null}
      </div>
    );
  };
  return {w: W, h: H, layout: 'full', anchors: {figure: [W / 2, figH / 2], array: [W / 2, figH + 60 + arrH / 2], count: [W / 2, figH / 2]}, C, Html} satisfies ArtDef;
};

export const STAT: Record<string, ArtFactory> = {stat};
