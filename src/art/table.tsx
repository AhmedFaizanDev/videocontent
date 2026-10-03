/**
 * `table` — a journal-style data table (booktabs rules: heavy top and bottom, a thin rule under
 * the header, hairlines between rows), built up and highlighted as the narration names things.
 *
 *   data: {columns: 2–6 strings, rows: 1–10 rows of cells (strings), align?: per column
 *          'left'|'center'|'right' (numbers default right), widths?: relative column widths,
 *          size?: cell font size in art px (default 34)}
 *
 * anchors / events (stage `act: "<layer>.r2"` etc.):
 *   r1…rN   that row builds in (if any row has an event, rows appear on their events; rows
 *           without one appear with `all`, else with the table) and becomes the current row
 *   c1…cM   that column is highlighted from then on (the latest column event wins)
 *   rIcJ    that cell is ringed (the latest cell event wins)
 *   all     every row not yet shown builds in, top to bottom
 * Text is HTML (Noto Sans; header bold). No colour beyond the highlight: data tables stay sober.
 */
import React from 'react';
import {fonts, ink} from '../theme';
import {E, estLines, tw} from '../motion';
import {INK, type ArtCtx, type ArtDef, type ArtFactory} from './kit';

type Align = 'left' | 'center' | 'right';
export type TableData = {width?: number; columns: string[]; rows: string[][]; align?: Align[]; widths?: number[]; size?: number; /** cells appear on their own rIcJ events (progressive reading) */ cells?: boolean; /** columns (0-based) whose numbers also get an inline bar */ bars?: number[]};

/** "10.5%" → {pre: '', n: 10.5, dec: 1, comma: false, post: '%'}; null when the cell isn't a single number. */
const numParts = (t: string) => {
  const m = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\s*%|\s*[a-zA-Zµ/°]{1,6})?$/.exec(t.trim());
  if (!m) return null;
  return {pre: m[1], n: parseFloat(m[2].replace(/,/g, '')), dec: (m[2].split('.')[1] ?? '').length, comma: m[2].includes(','), post: m[3] ?? ''};
};
/** A number counting up to its value as its row arrives (same format as written). */
const countUp = (t: string, p: number) => {
  const q = numParts(t);
  if (!q || p >= 1) return t;
  const v = q.n * p;
  const s = q.comma ? v.toLocaleString('en-US', {minimumFractionDigits: q.dec, maximumFractionDigits: q.dec}) : v.toFixed(q.dec);
  return `${q.pre}${s}${q.post}`;
};

const W0 = 1640; // table width; M of white margin round it so the rules never touch the art's box
const M = 20;
const PADX = 26;
const isNum = (s: string) => /^[\s≈~<>≥≤±+–-]*[\d.,]+(\s*[–-]\s*[\d.,]+)?\s*(%|[a-zA-Zµ/°]{0,6})?$/.test(s.trim());

const table: ArtFactory = (data: TableData) => {
  const cols = data.columns;
  const rows = data.rows;
  // a composition lays the table out at its slot's width, so cells keep their reading size
  const W = data.width ? Math.max(600, data.width - 2 * M) : W0;
  const fs = data.size ?? 40;
  const hfs = Math.round(fs * 0.86);
  // column widths: authored, else by content (longest cell, header counts a little less)
  // content widths; a header (bold, smaller) still needs its own length, and authored widths
  // never shrink a column below its longest single word
  const longestWord = (j: number) => Math.max(...[cols[j], ...rows.map((r) => r[j] ?? '')].flatMap((t) => t.split(/\s+/).map((w) => w.length)), 4);
  const want = cols.map((c, j) => Math.max(data.widths?.[j] ?? Math.max(c.length * 1.05, ...rows.map((r) => Math.min(48, (r[j] ?? '').length)), 4), 0));
  const minShare = cols.map((_, j) => longestWord(j) * 1.15);
  const tot0 = want.reduce((a, b) => a + b, 0);
  // authored widths are relative: express the longest-word floor in the same units, then scale
  const scale = data.widths ? tot0 / cols.map((c, j) => Math.max(c.length, ...rows.map((r) => Math.min(48, (r[j] ?? '').length)), 4)).reduce((a, b) => a + b, 0) : 1;
  const want2 = want.map((x, j) => Math.max(x, minShare[j] * scale));
  const tot = want2.reduce((a, b) => a + b, 0);
  const cw = want2.map((x) => (x / tot) * W);
  const cx0 = cw.map((_, j) => cw.slice(0, j).reduce((a, b) => a + b, 0));
  const align: Align[] = cols.map((_, j) => data.align?.[j] ?? (rows.length && rows.every((r) => isNum(r[j] ?? '')) ? 'right' : 'left'));
  const linesOf = (t: string, j: number, size: number) => estLines(t, cw[j] - 2 * PADX, size, 0.5);
  const headH = Math.max(...cols.map((c, j) => linesOf(c, j, hfs))) * hfs * 1.2 + 34;
  const rowH = rows.map((r) => Math.max(...cols.map((_, j) => linesOf(r[j] ?? '', j, fs))) * fs * 1.22 + 30);
  const rowY = rowH.map((_, i) => headH + rowH.slice(0, i).reduce((a, b) => a + b, 0));
  const H = headH + rowH.reduce((a, b) => a + b, 0) + 8;
  // inline bars: each bar column scaled to its own largest value
  const barMax = new Map((data.bars ?? []).map((j) => [j, Math.max(...rows.map((r) => numParts(r[j] ?? '')?.n ?? 0), 1e-9)]));

  const timing = (c: ArtCtx) => {
    const all = c.at('all');
    const own = rows.map((_, i) => c.at(`r${i + 1}`));
    const staged = all != null || own.some((t) => t != null);
    const shown = rows.map((_, i) => (own[i] != null ? own[i]! : all != null ? all + i * 5 : staged ? 0 : 6 + i * 4));
    const latest = (names: string[]) => names.map((n, k) => ({k, t: c.at(n)})).filter((x) => x.t != null && c.f >= x.t).sort((a, b) => b.t! - a.t!)[0] ?? null;
    const curRow = latest(rows.map((_, i) => `r${i + 1}`));
    const curCol = latest(cols.map((_, j) => `c${j + 1}`));
    const cells = rows.flatMap((_, i) => cols.map((__, j) => `r${i + 1}c${j + 1}`));
    const curCell = latest(cells);
    // progressive cells: a cell with its own event (rIcJ) appears when its words are spoken
    const cellAt = (i: number, j: number) => {
      const own = data.cells && j > 0 ? c.at(`r${i + 1}c${j + 1}`) : null;
      return own != null ? Math.max(own, shown[i]) : shown[i];
    };
    return {shown, cellAt, curRow, curCol, curCell: curCell ? {i: Math.floor(curCell.k / cols.length), j: curCell.k % cols.length, t: curCell.t!} : null};
  };

  const C: React.FC<ArtCtx> = (c) => {
    const S = timing(c);
    const lastShown = Math.max(0, ...S.shown.map((t, i) => (c.f >= t ? i + 1 : 0)));
    const bottomY = lastShown ? rowY[lastShown - 1] + rowH[lastShown - 1] : headH;
    const o = tw(c.f, 0, 12);
    return (
      <g transform={`translate(${M} ${M})`}>
        {/* header band */}
        <rect x={0} y={0} width={W * o} height={headH} fill="#EEF1F6" />
        {/* inline bars grow as each row arrives */}
        {rows.map((r, i) =>
          [...barMax.entries()].map(([j, max]) => {
            const v = numParts(r[j] ?? '')?.n;
            const p = tw(c.f, S.cellAt(i, j) + 4, 26, E.inOut);
            if (v == null || p <= 0) return null;
            const bw = (cw[j] - 2 * PADX) * (v / max) * p;
            const bh = Math.min(30, rowH[i] * 0.42);
            const x0 = align[j] === 'right' ? cx0[j] + cw[j] - PADX - bw : cx0[j] + PADX;
            return <rect key={`b${i}-${j}`} x={x0} y={rowY[i] + rowH[i] / 2 - bh / 2} width={bw} height={bh} rx={4} fill={S.curRow?.k === i ? ink.orange : ink.blue} opacity={0.22} />;
          }),
        )}
        {/* column highlight */}
        {S.curCol ? <rect x={cx0[S.curCol.k]} y={0} width={cw[S.curCol.k]} height={bottomY} fill={ink.blue} opacity={0.07 * tw(c.f, S.curCol.t!, 12)} /> : null}
        {/* current row: a tint band and an accent bar at its left edge */}
        {S.curRow ? (
          <g opacity={tw(c.f, S.curRow.t!, 12)}>
            {/* the row under discussion breathes while it is being talked about */}
            <rect x={0} y={rowY[S.curRow.k]} width={W} height={rowH[S.curRow.k]} fill={ink.orange} opacity={0.08 + 0.07 * (0.5 + 0.5 * Math.sin((c.f - S.curRow.t!) / 11))} />
            <rect x={0} y={rowY[S.curRow.k] + 6} width={6} height={rowH[S.curRow.k] - 12} fill={ink.orange} />
          </g>
        ) : null}
        {S.curCell ? <rect x={cx0[S.curCell.j] + 6} y={rowY[S.curCell.i] + 5} width={cw[S.curCell.j] - 12} height={rowH[S.curCell.i] - 10} rx={8} fill="none" stroke={ink.orange} strokeWidth={3.5} opacity={tw(c.f, S.curCell.t, 10)} /> : null}
        {/* booktabs rules */}
        <rect x={0} y={0} width={W * o} height={3.5} fill={INK} />
        <rect x={0} y={headH - 1} width={W * o} height={1.6} fill={INK} />
        {rows.map((_, i) => {
          const p = tw(c.f, S.shown[i], 14, E.out);
          return p > 0 && i < rows.length - 1 ? <rect key={i} x={0} y={rowY[i] + rowH[i] - 0.5} width={W * p} height={1} fill={INK} opacity={0.16} /> : null;
        })}
        <rect x={0} y={bottomY - 1} width={W * o} height={3.5} fill={INK} />
      </g>
    );
  };

  const cell = (t: string, j: number, top: number, h: number, size: number, weight: number, color: string, op: number, dy: number, key: string) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: cx0[j] + PADX,
        top: top + dy,
        width: cw[j] - 2 * PADX,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: align[j] === 'right' ? 'flex-end' : align[j] === 'center' ? 'center' : 'flex-start',
        textAlign: align[j],
        fontFamily: fonts.body,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.2,
        color,
        fontVariantNumeric: 'tabular-nums',
        opacity: op,
      }}
    >
      {t}
    </div>
  );

  const Html: React.FC<ArtCtx> = (c) => {
    const S = timing(c);
    const ho = tw(c.f, 2, 12);
    return (
      <div style={{position: 'absolute', left: M, top: M}}>
        {cols.map((t, j) => cell(t, j, 0, headH, hfs, 700, INK, ho, 0, `h${j}`))}
        {rows.map((r, i) => {
          const p = tw(c.f, S.shown[i], 14, E.out);
          if (p <= 0) return null;
          const cur = S.curRow?.k === i;
          return cols.map((_, j) => {
            const t0 = S.cellAt(i, j);
            const q = tw(c.f, t0, 14, E.out);
            if (q <= 0) return null;
            return cell(countUp(r[j] ?? '', tw(c.f, t0 + 4, 26, E.out)), j, rowY[i], rowH[i], fs, j === 0 || cur ? 600 : 400, j === 0 ? INK : ink.soft, q, (1 - q) * 10, `r${i}c${j}`);
          });
        })}
      </div>
    );
  };

  const anchors: Record<string, [number, number]> = {all: [M + W / 2, M + H / 2]};
  rows.forEach((_, i) => (anchors[`r${i + 1}`] = [M + W / 2, M + rowY[i] + rowH[i] / 2]));
  cols.forEach((_, j) => (anchors[`c${j + 1}`] = [M + cx0[j] + cw[j] / 2, M + headH / 2]));
  rows.forEach((_, i) => cols.forEach((__, j) => (anchors[`r${i + 1}c${j + 1}`] = [M + cx0[j] + cw[j] / 2, M + rowY[i] + rowH[i] / 2])));
  return {w: W + 2 * M, h: H + 2 * M, layout: 'full', anchors, C, Html} satisfies ArtDef;
};

export const TABLE: Record<string, ArtFactory> = {table};
