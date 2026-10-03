import React from 'react';
import {brand, fonts, ink, surface, tracking} from '../theme';
import {E, PACE, clamp01, hash, mix, tw, useSceneFrame} from '../motion';
import {isAbbr, lh} from '../lang';
import {paperShadow} from './stage';
import {useProject} from './brand';

/** Map any authored colour (specs carry v1 hexes like #7C6CFF / #FFB454) onto the Proof spot palette by hue. */
export const roleColor = (c?: string): string => {
  if (!c) return ink.orangeText;
  if (c === 'variable') return ink.sunText;
  if (c === 'constant') return ink.teal;
  if (c === 'accent') return ink.blue;
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return ink.orangeText;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.08) return ink.ink;
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  if (h < 18 || h >= 335) return ink.red;
  if (h < 70) return ink.orangeText;
  if (h < 150) return ink.green;
  if (h < 200) return ink.teal;
  return ink.blue;
};

const norm = (w: string) => w.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}'+/<>=*-]/gu, '');
const core = (w: string) => w.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');

/**
 * Which words of a text are key terms (project.json `terms`, multi-word phrases matched
 * in sequence, inflected endings allowed) or abbreviations — so every template gives
 * medical vocabulary the same emphasis without the spec marking it up.
 */
export const emphasisOf = (words: string[], terms: string[]): ('term' | 'abbr' | null)[] => {
  const out: ('term' | 'abbr' | null)[] = words.map((w) => (isAbbr(w) ? 'abbr' : null));
  const cw = words.map(core);
  for (const t of terms) {
    const tw_ = t.split(/\s+/).map(core).filter(Boolean);
    if (!tw_.length) continue;
    for (let i = 0; i + tw_.length <= cw.length; i++) {
      // a term's last word may carry an inflection (arteries/artery, रक्तचापाचे/रक्तचाप)
      const ok = tw_.every((x, k) => (k === tw_.length - 1 ? cw[i + k].startsWith(x.length > 4 ? x.slice(0, x.length - 1) : x) : cw[i + k] === x));
      if (ok) for (let k = 0; k < tw_.length; k++) out[i + k] = out[i + k] ?? 'term';
    }
  }
  return out;
};

/** Emphasis styles, for light grounds and for the brand-gradient / dark grounds. */
export const emphStyle = (kind: 'term' | 'abbr' | null, onDark = false): React.CSSProperties =>
  kind === 'abbr'
    ? {background: onDark ? 'rgba(255,255,255,0.2)' : brand.tintPurple, color: onDark ? '#fff' : brand.purpleText, fontWeight: 700, borderRadius: '0.22em', padding: '0 0.22em', margin: '0 0.02em', letterSpacing: '0.01em'}
    : kind === 'term'
      ? {color: onDark ? '#fff' : brand.magentaText, fontWeight: 700, textDecoration: onDark ? 'underline' : undefined, textDecorationThickness: onDark ? '0.06em' : undefined, textUnderlineOffset: onDark ? '0.14em' : undefined}
      : {};

/** Plain running text with the project's term/abbreviation emphasis applied. */
export const Rich: React.FC<{text: string; onDark?: boolean}> = ({text, onDark}) => {
  const {terms} = useProject();
  const words = text.split(/(\s+)/);
  const solid = words.filter((w, i) => i % 2 === 0);
  const em = emphasisOf(solid, terms);
  return (
    <>
      {words.map((w, i) => (i % 2 ? w : em[i / 2] ? <span key={i} style={emphStyle(em[i / 2], onDark)}>{w}</span> : w))}
    </>
  );
};

/**
 * Headline reveal: each word rises through its own mask. Highlighted words (spec
 * `highlight`, project terms, abbreviations) turn to the brand colour at full weight;
 * `marker` lays a soft brand-tint swipe behind them.
 */
export const MaskWords: React.FC<{
  text: string;
  at: number;
  size: number;
  width?: number;
  stagger?: number;
  dur?: number;
  italic?: boolean;
  family?: 'serif' | 'sans';
  color?: string;
  highlights?: Record<string, string>;
  marker?: boolean;
  lineHeight?: number;
  weight?: number;
  accentFrom?: number;
  accentColor?: string;
  style?: React.CSSProperties;
  /** set on dark/gradient grounds so emphasis stays legible */
  onDark?: boolean;
}> = ({text, at, size, width, stagger = 2.5, dur = 22, italic, family = 'serif', color = ink.ink, highlights = {}, marker = false, lineHeight = 1.06, weight, accentFrom, accentColor = ink.orangeText, style, onDark}) => {
  const f = useSceneFrame();
  const {terms} = useProject();
  weight ??= family === 'serif' ? (italic ? 500 : 600) : 400;
  lineHeight = lh(lineHeight);
  stagger *= PACE;
  dur *= PACE;
  const words = text.split(/\s+/).filter(Boolean);
  const hl: Record<string, string> = {};
  for (const [k, v] of Object.entries(highlights)) if (norm(k)) hl[norm(k)] = v;
  const em = emphasisOf(words, terms);
  return (
    <div
      style={{
        width,
        fontFamily: family === 'serif' ? fonts.heading : fonts.body,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: family === 'serif' ? tracking.display : '-0.005em',
        color,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const t0 = at + i * stagger;
        const p = tw(f, t0, dur, E.out);
        const hc = accentFrom !== undefined && i >= accentFrom ? accentColor : hl[norm(w)];
        const kind = hc ? null : em[i];
        const sweep = marker && (hc || kind === 'term') ? tw(f, t0 + 6, 10, E.inOut) : 0;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: 'inline-block',
                verticalAlign: 'top',
                backgroundImage: sweep > 0 ? `linear-gradient(transparent 58%, ${onDark ? 'rgba(255,255,255,0.22)' : 'rgba(216,20,140,0.14)'} 58%, ${onDark ? 'rgba(255,255,255,0.22)' : 'rgba(216,20,140,0.14)'} 92%, transparent 92%)` : undefined,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${sweep * 100}% 100%`,
              }}
            >
              <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.18em 0.1em 0.22em 0.04em', margin: '-0.18em -0.1em -0.22em -0.04em'}}>
                <span
                  style={{
                    display: 'inline-block',
                    transform: `translateY(${(1 - p) * 130}%)`,
                    ...(hc ? {color: hc, fontWeight: 700} : emphStyle(kind, onDark)),
                  }}
                >
                  {w}
                </span>
              </span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Clean arrival for a headline block: a soft rise, fade and a hair of scale (no ink plates). */
export const PressPrint: React.FC<{at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; offset?: number}> = ({
  at,
  dur = 20,
  children,
  style,
  offset = 18,
}) => {
  const f = useSceneFrame();
  dur *= PACE;
  const p = tw(f, at, dur, E.out);
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{opacity: clamp01(p * 1.4), transform: `translateY(${(1 - p) * offset}px)`}}>{children}</div>
    </div>
  );
};

/** A rule that draws itself. */
export const Rule: React.FC<{x: number; y: number; w?: number; h?: number; at: number; dur?: number; color?: string; origin?: 'left' | 'top'}> = ({
  x,
  y,
  w = 2,
  h = 2,
  at,
  dur = 24,
  color = ink.ink,
  origin = 'left',
}) => {
  const f = useSceneFrame();
  const p = tw(f, at, dur, E.inOut);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        background: color,
        transformOrigin: origin === 'top' ? 'top' : 'left',
        transform: origin === 'top' ? `scaleY(${p})` : `scaleX(${p})`,
      }}
    />
  );
};

/** Monospace label; optionally types itself on. */
export const Label: React.FC<{text: string; at?: number; color?: string; size?: number; type?: boolean; style?: React.CSSProperties}> = ({
  text,
  at = 0,
  color = ink.soft,
  size = 20,
  type = true,
  style,
}) => {
  const f = useSceneFrame();
  const p = tw(f, at, type ? 16 * PACE : 10, E.out);
  return (
    <div style={{fontFamily: fonts.label, fontWeight: 600, fontSize: size, letterSpacing: tracking.label, textTransform: 'uppercase', color, opacity: p, transform: `translateX(${(1 - p) * -14}px)`, whiteSpace: 'nowrap', ...style}}>
      {text}
    </div>
  );
};

/** Fade + short rise for supporting copy. */
export const Rise: React.FC<{at: number; dist?: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, dist = 18, dur = 18, children, style}) => {
  const f = useSceneFrame();
  const p = tw(f, at, dur * PACE, E.soft);
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * dist}px)`, ...style}}>{children}</div>;
};

/**
 * A card placed on the page: it rises in from just below with a soft fade and settles,
 * its shadow tightening as it lands. `from` biases the direction it arrives from (kept
 * small — cards glide, they are not thrown); `lift` raises the active card.
 */
export const Dealt: React.FC<{
  at: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  rot?: number;
  from?: {dx: number; dy: number; rot: number};
  lift?: number;
  dur?: number;
  bg?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at, x, y, w, h, rot = 0, from = {dx: 320, dy: 760, rot: 14}, lift = 0, dur = 24, bg = ink.paperLight, children, style}) => {
  const f = useSceneFrame();
  dur *= PACE;
  if (f < at - 1) return null;
  const p = tw(f, at, dur, E.out);
  const land = tw(f, at + dur * 0.3, dur * 0.7, E.soft);
  const air = (1 - land) * 0.8 + lift;
  // direction of arrival, normalised to a short glide
  const mag = Math.hypot(from.dx, from.dy) || 1;
  const gx = (from.dx / mag) * 70;
  const gy = (from.dy / mag) * 70;
  void rot;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: bg,
        borderRadius: surface.radius,
        border: surface.border,
        boxShadow: paperShadow(air),
        opacity: clamp01(p * 1.8),
        transform: `translate(${(1 - p) * gx}px, ${(1 - p) * gy - lift * 8}px) scale(${mix(0.965, 1, p) + lift * 0.012})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A status badge (Right / Wrong / Result…): a solid pill that pops in and settles. */
export const Stamp: React.FC<{at: number; text: string; color: string; rot?: number; size?: number; style?: React.CSSProperties}> = ({at, text, color, rot = -9, size = 54, style}) => {
  const f = useSceneFrame();
  if (f < at) return null;
  const p = tw(f, at, 14, E.settle);
  void rot;
  const fs = Math.round(size * 0.62);
  return (
    <div
      style={{
        position: 'absolute',
        transform: `scale(${mix(0.6, 1, p)})`,
        opacity: clamp01(p * 2.5),
        background: color,
        padding: `${fs * 0.34}px ${fs * 0.9}px`,
        borderRadius: 999,
        fontFamily: fonts.label,
        fontWeight: 700,
        fontSize: fs,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#fff',
        boxShadow: `0 10px 24px -10px ${color}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Hand-drawn stroke (pen / grease pencil) along an SVG path, drawn on over `dur` frames. */
export const PenStroke: React.FC<{d: string; at: number; dur?: number; color: string; width?: number; opacity?: number}> = ({d, at, dur = 12, color, width = 5, opacity = 0.9}) => {
  const f = useSceneFrame();
  const p = tw(f, at, dur, E.inOut);
  if (p <= 0) return null;
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} width={1920} height={1080}>
      <path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={opacity} />
    </svg>
  );
};

/** A loose hand-drawn loop around a box (grease-pencil mark on a contact sheet). */
export const loopPath = (x: number, y: number, w: number, h: number, seed: number) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2 + 20;
  const ry = h / 2 + 18;
  const pts: string[] = [];
  const N = 64;
  for (let i = 0; i <= N * 1.12; i++) {
    const a = (i / N) * Math.PI * 2 - 2.2;
    const k = 1 + 0.03 * Math.sin(3 * a + seed) + 0.02 * (hash(i + seed) - 0.5) + (i > N ? 0.05 : 0);
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
};

/** Small SVG check / cross drawn as strokes. */
export const Mark: React.FC<{kind: 'check' | 'cross'; size?: number; color: string; p?: number}> = ({kind, size = 22, color, p = 1}) => {
  const d = kind === 'check' ? 'M3 12.5 L9.5 19 L21 5' : 'M5 5 L19 19 M19 5 L5 19';
  const len = kind === 'check' ? 30 : 40;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth={2.8} strokeLinecap="square" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
    </svg>
  );
};
