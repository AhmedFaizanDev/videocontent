/**
 * Text audit (preflight / review stills only, `audit` prop): measures the real layout in the
 * browser once fonts are loaded and reports
 *   overflow   a text block whose content is wider than its box (a long word in a narrow
 *              label — common with Indic scripts)
 *   collision  visible text from two different blocks overlapping (a title growing into the
 *              line above it, a crowded column)
 * Each finding is logged as `[audit] {...}` (read by scripts/lib/remotion.mts) and outlined in
 * magenta on the still. Elements marked data-audit="skip" (decoration, thumbnails) are ignored.
 */
import React from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';

type Hit = {kind: 'overflow' | 'collision'; text: string; other?: string; r: {x: number; y: number; w: number; h: number}};

const visibleOpacity = (el: Element) => {
  let o = 1;
  for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity || 1);
  return o;
};
const block = (el: Element) => {
  let e: Element | null = el;
  while (e && getComputedStyle(e).display.startsWith('inline')) e = e.parentElement;
  return e;
};
const label = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 40);

function measure(root: Element): Hit[] {
  const hits: Hit[] = [];
  const texts: {el: Element; blk: Element | null; r: DOMRect; t: string}[] = [];
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el instanceof SVGElement || el.closest('[data-audit="skip"]')) continue;
    const nodes = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent!.trim());
    if (!nodes.length || visibleOpacity(el) < 0.3) continue;
    const t = nodes.map((n) => n.textContent).join(' ');
    // overflow: the text's own glyphs reach past the content box of the block it lives in
    // (measured on the text, so decorative children like a strike-through line don't count)
    const blk = block(el);
    if (blk) {
      const bs = getComputedStyle(blk);
      if (bs.overflow !== 'hidden' && bs.whiteSpace !== 'nowrap' || (bs.width !== 'auto' && bs.overflow !== 'hidden')) {
        const br = blk.getBoundingClientRect();
        const left = br.left + parseFloat(bs.paddingLeft) + parseFloat(bs.borderLeftWidth);
        const right = br.right - parseFloat(bs.paddingRight) - parseFloat(bs.borderRightWidth);
        for (const n of nodes) {
          const range = document.createRange();
          range.selectNodeContents(n);
          const r = range.getBoundingClientRect();
          if (right - left > 20 && (r.right > right + 6 || r.left < left - 6)) {
            hits.push({kind: 'overflow', text: label(t), r: {x: r.x, y: r.y, w: r.width, h: r.height}});
            break;
          }
        }
      }
    }
    for (const n of nodes) {
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width < 2 || r.height < 2) continue;
        // only text you can actually see: nothing opaque painted over its middle
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
        texts.push({el, blk: block(el), r, t: label(n.textContent!)});
      }
    }
  }
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (a.blk === b.blk || a.blk?.contains(b.blk!) || b.blk?.contains(a.blk!)) continue;
      // a glyph box includes empty ascender/descender room: compare the inner core of each line
      const core = (r: DOMRect) => ({l: r.left, r: r.right, t: r.top + 0.22 * r.height, b: r.bottom - 0.22 * r.height});
      const A = core(a.r);
      const B = core(b.r);
      const w = Math.min(A.r, B.r) - Math.max(A.l, B.l);
      const h = Math.min(A.b, B.b) - Math.max(A.t, B.t);
      if (w > 8 && h > 4)
        hits.push({kind: 'collision', text: a.t, other: b.t, r: {x: Math.max(a.r.left, b.r.left), y: Math.max(a.r.top, b.r.top), w, h}});
    }
  return hits;
}

/** True in preflight/review audit stills: templates may report layout findings of their own. */
export const AuditCtx = React.createContext(false);

export const TextAudit: React.FC = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [handle] = React.useState(() => delayRender('text audit'));
  const [hits, setHits] = React.useState<Hit[] | null>(null);
  React.useEffect(() => {
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        const root = ref.current?.parentElement;
        const found = root ? measure(root) : [];
        for (const h of found) console.log(`[audit] ${JSON.stringify(h)}`);
        setHits(found);
      }),
    );
  }, []);
  React.useEffect(() => {
    if (hits) continueRender(handle);
  }, [hits, handle]);
  return (
    <AbsoluteFill ref={ref} data-audit="skip" style={{pointerEvents: 'none'}}>
      {(hits ?? []).map((h, i) => (
        <div key={i} style={{position: 'absolute', left: h.r.x - 3, top: h.r.y - 3, width: h.r.w + 6, height: h.r.h + 6, border: '3px solid #FF00FF'}} />
      ))}
    </AbsoluteFill>
  );
};
