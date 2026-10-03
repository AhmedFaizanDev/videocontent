/**
 * Art kit: the contract every `figure` illustration implements, plus the drawing
 * primitives that give them the Proof idiom. Illustrations for `figure` scenes — drawn in the Proof risograph idiom: ink
 * linework that draws itself on, spot-colour fills printed slightly out of register
 * (multiply), and state changes keyed to the narration.
 *
 * Each art declares its own coordinate space (w × h), named anchors (where callout
 * leaders land) and a component. `at(anchor)` is the frame that anchor's callout is
 * spoken, or null when the spec doesn't call it out: "base" elements then show from the
 * start, "event" elements (a brush pass, bubbles, a flow) never happen.
 */
import React from 'react';
import {fonts, ink} from '../theme';
import {E, clamp01, tw} from '../motion';

export const INK = ink.ink;

export type ArtCtx = {f: number; at: (anchor: string) => number | null};
/**
 * `C` draws the picture (SVG). All TEXT goes in `Html`, positioned in the same art
 * coordinates. Never use SVG <text>: Chrome can lay it out against fallback-font metrics
 * and not re-lay it out when the web font arrives, so in long renders some frames show
 * shifted or clipped labels (stills look fine). scripts/lint-art.mts enforces this.
 */
export type ArtDef = {
  w: number;
  h: number;
  layout?: 'side' | 'full';
  anchors: Record<string, [number, number]>;
  C: React.FC<ArtCtx>;
  Html?: React.FC<ArtCtx>;
  /** camera push toward the active anchor (0.03 = 3%); side arts default to 0.03, full to 0 */
  lean?: number;
};
/** Builds an art from the figure's `data` (static illustrations ignore it). */
export type ArtFactory = (data: any) => ArtDef;

/** Text at art coordinates, centred on (x, y) by the browser's own layout. */
export const T: React.FC<{
  x: number;
  y: number;
  size: number;
  family?: string;
  weight?: number;
  color?: string;
  spacing?: string;
  o?: number;
  /** wrap within this width (centred lines); omit for one line */
  maxWidth?: number;
  /** (x, y) is the text's centre, its top-centre (wraps downward) or bottom-centre (wraps upward) */
  align?: 'center' | 'top' | 'bottom';
  children: React.ReactNode;
}> = ({x, y, size, family = fonts.body, weight = 400, color = INK, spacing, o = 1, maxWidth, align = 'center', children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: maxWidth,
      transform: align === 'center' ? 'translate(-50%, -50%)' : align === 'top' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      fontFamily: family,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1.12,
      letterSpacing: spacing,
      color,
      whiteSpace: maxWidth ? 'normal' : 'nowrap',
      textAlign: 'center',
      opacity: o,
    }}
  >
    {children}
  </div>
);

/** An art at scale k: the SVG picture with its HTML text layer registered over it. */
export const ArtView: React.FC<{art: ArtDef; ctx: ArtCtx; k: number; style?: React.CSSProperties}> = ({art, ctx, k, style}) => (
  <div style={{position: 'absolute', width: art.w * k, height: art.h * k, ...style}}>
    {/* an illustration never leaves its plate */}
    <svg width={art.w * k} height={art.h * k} viewBox={`0 0 ${art.w} ${art.h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'hidden'}}>
      <art.C {...ctx} />
    </svg>
    {art.Html ? (
      <div data-art-text style={{position: 'absolute', left: 0, top: 0, width: art.w, height: art.h, overflow: 'hidden', transform: `scale(${k})`, transformOrigin: '0 0'}}>
        <art.Html {...ctx} />
      </div>
    ) : null}
  </div>
);

/** When a base element appears: its callout, or from the start. */
export const base = (c: ArtCtx, a: string) => c.at(a) ?? 0;
/** Draw-on progress for the i-th part of an illustration. */
export const draw = (f: number, i: number, dur = 26) => tw(f, 6 + i * 5, dur, E.inOut);
/** Fill of the i-th part: fades in once its outline (draw(f, i, dur)) is mostly drawn, never before. */
export const fillIn = (f: number, i: number, dur = 26) => tw(f, 6 + i * 5 + Math.round(dur * 0.65), 16);

export const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
export const rect = (x: number, y: number, w: number, h: number, r = 0) =>
  r
    ? `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y}Z`
    : `M${x} ${y} H${x + w} V${y + h} H${x}Z`;

/** A shape: spot fill printed off-register, ink outline drawn on with `p`. */
export const Sh: React.FC<{d: string; fill?: string; p?: number; sw?: number; fo?: number; stroke?: string; dash?: string}> = ({d, fill, p = 1, sw = 4, fo = 0.9, stroke = INK, dash}) => (
  <>
    {fill ? <path d={d} fill={fill} opacity={fo * clamp01(p * 1.6 - 0.6)} style={{mixBlendMode: 'multiply'}} /> : null}
    {sw > 0 ? (
      dash ? (
        <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} opacity={clamp01(p * 2)} />
      ) : (
        <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      )
    ) : null}
  </>
);

/** A flexible tube (insertion tube / cord / hose): ink casing with a paper core. */
export const Tube: React.FC<{d: string; p: number; w?: number; core?: string}> = ({d, p, w = 24, core = ink.paperLight}) => (
  <>
    <path d={d} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    <path d={d} fill="none" stroke={core} strokeWidth={w - 9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  </>
);

/** Rod-shaped bacterium. */
export const Rod: React.FC<{x: number; y: number; rot: number; s?: number; o?: number; color?: string}> = ({x, y, rot, s = 1, o = 1, color = ink.teal}) =>
  o <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
      <rect x={-14} y={-6.5} width={28} height={13} rx={6.5} fill={color} style={{mixBlendMode: 'multiply'}} />
      <rect x={-14} y={-6.5} width={28} height={13} rx={6.5} fill="none" stroke={INK} strokeWidth={2} />
    </g>
  );

export const Drop: React.FC<{x: number; y: number; r: number; o?: number}> = ({x, y, r, o = 1}) =>
  o <= 0 ? null : (
    <g opacity={o}>
      <path d={`M${x} ${y - r * 1.5} Q${x + r} ${y - r * 0.2} ${x + r} ${y + r * 0.2} A${r} ${r} 0 1 1 ${x - r} ${y + r * 0.2} Q${x - r} ${y - r * 0.2} ${x} ${y - r * 1.5}Z`} fill={ink.blue} opacity={0.55} style={{mixBlendMode: 'multiply'}} />
      <path d={`M${x} ${y - r * 1.5} Q${x + r} ${y - r * 0.2} ${x + r} ${y + r * 0.2} A${r} ${r} 0 1 1 ${x - r} ${y + r * 0.2} Q${x - r} ${y - r * 0.2} ${x} ${y - r * 1.5}Z`} fill="none" stroke={INK} strokeWidth={2} />
    </g>
  );

export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; o?: number; color?: string; w?: number}> = ({x1, y1, x2, y2, o = 1, color = INK, w = 3}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 12;
  return (
    <g opacity={o} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none">
      <path d={`M${x1} ${y1} L${x2} ${y2}`} />
      <path d={`M${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} L${x2} ${y2} L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}`} />
    </g>
  );
};

