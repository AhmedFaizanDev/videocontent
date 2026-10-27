/**
 * `graph` — the general diagram engine: any system, process, cycle, hierarchy or causal
 * chain, declared as nodes + edges and animated by a narrated storyboard.
 *
 *   data: {
 *     direction?: 'LR' | 'TB',
 *     nodes:  [{id, label, shape?: 'box'|'circle'|'pill', tone?, group?}],
 *     edges:  [{from, to, label?, tone?, dashed?}],          // edge id = "from>to"
 *     groups?: [{id, label}],
 *     steps:  [{say?, show?: [ids], flow?: [edge ids], focus?: id, token?: [node ids], loop?, cut?: [edge ids], note?, label?}]
 *   }
 *
 * Or write the chart in Mermaid flowchart syntax — the house's preferred way to declare a
 * process, an algorithm or a decision tree — and keep `steps` for the narrated build:
 *
 *   data: {mermaid: "flowchart TD\n A([Unresponsive]) --> B{Breathing normally?}\n B -->|No| C[Start CPR]:::red", steps: [...]}
 *
 *   shapes: A[box]  A(rounded)  A([stadium])  A((circle))  A{decision}  A{{decision}}
 *   edges:  -->  ---  -.-> (dashed)  ==>  with labels -->|Yes| or -- Yes -->;  chains A --> B --> C
 *   tones:  A[text]:::red   or   class A,B teal     (ink blue red teal green sun orange pink)
 *
 * Layout is automatic (layered, cycle-aware: back edges route around the diagram). Each
 * step fires when its words are spoken: listed nodes/edges build in (anything never listed
 * is there from the start; an edge appears with its later endpoint), `flow` edges start
 * carrying particles, a `token` travels the path (looping if `loop`), and `focus` gets the
 * spotlight while the rest racks back. `cut` blocks an edge (a failure, an inhibition, an
 * occlusion): its flow stops, a red cross lands on it and what it fed greys out.
 */
import React from 'react';
import {fonts, ink} from '../theme';
import {E, clamp01, estLines, mix, tw} from '../motion';
import {cols, units} from '../lang';
import {INK, T, rect, type ArtCtx, type ArtDef, type ArtFactory} from './kit';

export const TONES: Record<string, {fill: string; text: string}> = {
  ink: {fill: ink.paperShade, text: INK},
  blue: {fill: ink.blue, text: ink.blue},
  red: {fill: ink.red, text: ink.red},
  teal: {fill: ink.teal, text: ink.teal},
  green: {fill: ink.green, text: ink.green},
  sun: {fill: ink.sun, text: ink.sunText},
  orange: {fill: ink.orange, text: ink.orangeText},
  pink: {fill: ink.pink, text: ink.red},
};
const tone = (t?: string) => TONES[t ?? 'ink'] ?? TONES.ink;

import {graphData, type GData, type GEdge, type GNode, type GStep} from './mermaid.ts';
export {parseMermaid, graphData, type GData, type GEdge, type GNode, type GStep} from './mermaid.ts';

const eid = (e: GEdge) => `${e.from}>${e.to}`;
type P = [number, number];
type Box = {x: number; y: number; w: number; h: number};
const cubic = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
const bez = (q: [P, P, P, P], t: number): P => [cubic(q[0][0], q[1][0], q[2][0], q[3][0], t), cubic(q[0][1], q[1][1], q[2][1], q[3][1], t)];
const bezLen = (q: [P, P, P, P]) => {
  let L = 0;
  let prev = q[0];
  for (let i = 1; i <= 24; i++) {
    const p = bez(q, i / 24);
    L += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return L;
};

/** Layered layout: DFS back-edge removal → longest-path layers → barycenter ordering. */
function layout(d: GData) {
  const nodes = d.nodes;
  const edges = d.edges ?? [];
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const out = nodes.map(() => [] as number[]);
  edges.forEach((e, k) => out[idx.get(e.from)!].push(k));
  // back edges: those closing a cycle in declaration-order DFS
  const back = new Set<number>();
  const state = nodes.map(() => 0);
  const dfs = (u: number) => {
    state[u] = 1;
    for (const k of out[u]) {
      const v = idx.get(edges[k].to)!;
      if (state[v] === 1) back.add(k);
      else if (state[v] === 0) dfs(v);
    }
    state[u] = 2;
  };
  nodes.forEach((_, i) => state[i] === 0 && dfs(i));
  const fwd = edges.map((e, k) => ({k, a: idx.get(e.from)!, b: idx.get(e.to)!})).filter((e) => !back.has(e.k) && e.a !== e.b);
  const layer = nodes.map(() => 0);
  for (let pass = 0; pass < nodes.length; pass++) for (const e of fwd) layer[e.b] = Math.max(layer[e.b], layer[e.a] + 1);
  const L = Math.max(...layer) + 1;
  const layers: number[][] = Array.from({length: L}, () => []);
  nodes.forEach((_, i) => layers[layer[i]].push(i));
  // barycenter sweeps (keep groups together via a small tie-break on group index)
  const gi = (i: number) => (d.groups ?? []).findIndex((g) => g.id === nodes[i].group);
  const pos = nodes.map(() => 0);
  const place = () => layers.forEach((ls) => ls.forEach((n, j) => (pos[n] = j)));
  place();
  for (let sweep = 0; sweep < 6; sweep++) {
    const down = sweep % 2 === 0;
    for (let li = down ? 1 : L - 2; down ? li < L : li >= 0; li += down ? 1 : -1) {
      const bc = (n: number) => {
        const nb = fwd.filter((e) => (down ? e.b === n : e.a === n)).map((e) => pos[down ? e.a : e.b]);
        return nb.length ? nb.reduce((a, b) => a + b, 0) / nb.length : pos[n];
      };
      layers[li].sort((a, b) => bc(a) - bc(b) || gi(a) - gi(b));
      layers[li].forEach((n, j) => (pos[n] = j));
    }
  }
  return {layer, layers, L, back};
}

const graph: ArtFactory = (raw: GData) => {
  const data = graphData(raw);
  const nodes = data.nodes;
  const edges = data.edges ?? [];
  const steps = data.steps ?? [];
  const TB = data.direction === 'TB';
  const {layer: layerOf, layers, L: depth, back} = layout(data);
  // a long left-to-right chain (one node per layer, 5+ nodes) wraps into rows that read left to
  // right, so the whole chain is legible at once — never a camera tour over a strip of tiny boxes
  const rows = !TB && depth >= 5 && layers.every((l) => l.length === 1) && !back.size ? Math.ceil(depth / 4) : 1;
  const L = Math.ceil(depth / rows); // columns per row
  const cellOf = (l: number) => ({row: Math.floor(l / L), col: l % L});
  // a composition lays the chart out at its slot's width, so nodes keep their reading size
  const W = Math.max(700, (raw as any).width ?? 1680);
  const maxRow = Math.max(...layers.map((l) => l.length));
  // sizes: main axis = layers, cross axis = nodes within a layer
  // layers leave room for their edge labels (mono ≈ 11.4 px/char at 19 px) — labels never sit on a node
  const longestLabel = Math.max(0, ...edges.filter((e) => !TB).map((e) => cols(e.label ?? '')));
  const gapMain = Math.max(92, Math.min(300, longestLabel * 17 + 50)); // edge labels are ≈0.72·fs (≈30 px) bold
  const gapCross = 34;
  const span = W - 120;
  // few layers → wider boxes: fewer wrapped lines, a shorter diagram, so it is scaled down less on its plate
  const nodeW = TB ? Math.min(maxRow <= 3 ? 380 : 320, (span - (maxRow - 1) * gapCross) / maxRow) : Math.max(170, Math.min(L <= 3 ? 420 : 320, (span - (L - 1) * gapMain) / L));
  // never wider than the box: the longest single word must fit on one line (Noto Sans ≈ 0.56 em/char at 500)
  const longestWord = Math.max(...nodes.map((n) => Math.max(...units(n.label).map(cols))), 1);
  const fs = Math.min(Math.max(28, Math.min(44, nodeW / 7.5)), (nodeW - 44) / (longestWord * 0.56));
  const boxH = (n: GNode) => 58 + estLines(n.label, nodeW - 40, fs, 0.5) * fs * 1.14;
  const rowBox = Math.max(...nodes.filter((n) => n.shape !== 'circle').map(boxH), 0);
  // circles sit in the row like the boxes do: a little taller, never a balloon
  const hOf = (n: GNode) => (n.shape === 'circle' ? Math.min(nodeW, Math.max(120, rowBox + 30, boxH(n) + 20)) : boxH(n));
  const backRoom = back.size ? 120 : 0;
  const box: Box[] = nodes.map(() => ({x: 0, y: 0, w: nodeW, h: 0}));
  let H: number;
  if (rows > 1) {
    const colX = Array.from({length: L}, (_, l) => mix(60 + nodeW / 2, W - 60 - nodeW / 2, l / (L - 1)));
    const ROW_GAP = 110;
    H = rows * rowBox + (rows - 1) * ROW_GAP + 80;
    layers.forEach(([n], l) => {
      const {row, col} = cellOf(l);
      box[n] = {x: colX[col], y: 40 + row * (rowBox + ROW_GAP) + rowBox / 2, w: nodeW, h: hOf(nodes[n])};
    });
  } else if (!TB) {
    const colX = L === 1 ? [W / 2] : Array.from({length: L}, (_, l) => mix(60 + nodeW / 2, W - 60 - nodeW / 2, l / (L - 1)));
    const stackH = Math.max(...layers.map((ls) => ls.reduce((a, n) => a + hOf(nodes[n]), 0) + (ls.length - 1) * gapCross));
    H = Math.max(300, stackH + 80 + backRoom);
    layers.forEach((ls, l) => {
      const tot = ls.reduce((a, n) => a + hOf(nodes[n]), 0) + (ls.length - 1) * gapCross;
      let y = (H - backRoom - tot) / 2;
      for (const n of ls) {
        const h = hOf(nodes[n]);
        box[n] = {x: colX[l], y: y + h / 2, w: nodes[n].shape === 'circle' ? h : nodeW, h};
        y += h + gapCross;
      }
    });
  } else {
    // rows take their own height and a tight gap, so deep trees stay large on screen
    const rowHs = layers.map((ls) => Math.max(...ls.map((n) => hOf(nodes[n]))));
    // a labelled edge (Yes / No) needs room to sit on its line clear of both boxes
    const GAP_TB = edges.some((e) => e.label) ? 104 : 58;
    H = Math.max(300, rowHs.reduce((a, h) => a + h, 0) + (L - 1) * GAP_TB + 70);
    const rowY = rowHs.map((h, l) => 35 + rowHs.slice(0, l).reduce((a, x) => a + x + GAP_TB, 0) + h / 2);
    layers.forEach((ls, l) => {
      const y = rowY[l];
      const xs = ls.length === 1 ? [W / 2] : ls.map((_, j) => mix(W / 2 - ((ls.length - 1) * (nodeW + gapCross)) / 2, W / 2 + ((ls.length - 1) * (nodeW + gapCross)) / 2, j / (ls.length - 1)));
      ls.forEach((n, j) => {
        const h = hOf(nodes[n]);
        box[n] = {x: xs[j], y, w: nodes[n].shape === 'circle' ? h : nodeW, h};
      });
    });
  }
  const at = new Map(nodes.map((n, i) => [n.id, i]));
  const B = (id: string) => box[at.get(id)!];
  const maxY = Math.max(...box.map((b) => b.y + b.h / 2));
  const maxX = Math.max(...box.map((b) => b.x + b.w / 2));
  // edge curves
  const curve = (e: GEdge, k: number): [P, P, P, P] => {
    const a = B(e.from);
    const b = B(e.to);
    if (back.has(k)) {
      if (!TB) {
        const Y = maxY + 70;
        return [[a.x, a.y + a.h / 2], [a.x, Y], [b.x, Y], [b.x, b.y + b.h / 2 + 6]];
      }
      const X = Math.min(W - 20, maxX + 90);
      return [[a.x + a.w / 2, a.y], [X, a.y], [X, b.y], [b.x + b.w / 2 + 6, b.y]];
    }
    if (rows > 1 && b.y > a.y + 1) {
      // the turn to the next row: down from the row's last box, across, into the next row's first
      const p0: P = [a.x, a.y + a.h / 2];
      const p3: P = [b.x, b.y - b.h / 2 - 6];
      const midY = (p0[1] + p3[1]) / 2;
      return [p0, [a.x, midY + 40], [b.x, midY - 40], p3];
    }
    if (!TB) {
      const p0: P = [a.x + a.w / 2, a.y];
      const p3: P = [b.x - b.w / 2 - 6, b.y];
      const dx = (p3[0] - p0[0]) * 0.5;
      return [p0, [p0[0] + dx, p0[1]], [p3[0] - dx, p3[1]], p3];
    }
    const p0: P = [a.x, a.y + a.h / 2];
    const p3: P = [b.x, b.y - b.h / 2 - 6];
    const dy = (p3[1] - p0[1]) * 0.5;
    return [p0, [p0[0], p0[1] + dy], [p3[0], p3[1] - dy], p3];
  };
  const Q = edges.map(curve);
  const len = Q.map(bezLen);
  const ek = new Map(edges.map((e, k) => [eid(e), k]));

  // storyboard timing, from the step beats
  const beatsOf = (c: ArtCtx) => steps.map((_, i) => c.at(`s${i + 1}`));
  const shownAt = (c: ArtCtx) => {
    const beats = beatsOf(c);
    const nodeAt = nodes.map((n, ni) => {
      const hits = steps.flatMap((s, i) => ((s.show ?? []).includes(n.id) || s.focus === n.id) && beats[i] != null ? [beats[i]!] : []);
      const listed = steps.some((s) => (s.show ?? []).includes(n.id));
      // never listed: there from the start, drawing on layer by layer
      return hits.length ? Math.min(...hits) : listed ? Infinity : 6 + 7 * layerOf[ni];
    });
    const edgeAt = edges.map((e, k) => {
      const hits = steps.flatMap((s, i) => ((s.show ?? []).includes(eid(e)) || (s.flow ?? []).includes(eid(e))) && beats[i] != null ? [beats[i]!] : []);
      if (hits.length) return Math.min(...hits);
      return Math.max(nodeAt[at.get(e.from)!], nodeAt[at.get(e.to)!]) + 8;
    });
    const active = beats.reduce<number>((a, b, i) => (b != null && c.f >= b ? i : a), -1);
    const cutAt = edges.map((e) => {
      const hits = steps.flatMap((s, i) => ((s.cut ?? []).includes(eid(e)) && beats[i] != null ? [beats[i]!] : []));
      return hits.length ? Math.min(...hits) : Infinity;
    });
    return {beats, nodeAt, edgeAt, active, cutAt};
  };
  const lastBeat = (c: ArtCtx) => Math.max(0, ...beatsOf(c).map((b) => b ?? 0));
  const focusOf = (c: ArtCtx, S: ReturnType<typeof shownAt>) => {
    const s = S.active >= 0 ? steps[S.active] : null;
    if (!s || c.f > lastBeat(c) + 110) return null; // the storyboard settles: everything back in focus
    return {focus: s.focus ?? null, set: new Set([...(s.show ?? []), ...(s.focus ? [s.focus] : [])])};
  };

  const C: React.FC<ArtCtx> = (c) => {
    const S = shownAt(c);
    const F = focusOf(c, S);
    // the path being explained stays bright; everything else recedes
    const dimNode = (id: string) => (F && F.focus && !F.set.has(id) ? 0.3 : 1);
    const uid = React.useId().replace(/[^\w]/g, '');
    const active = F?.focus ?? null;
    const focusAt = S.active >= 0 ? S.beats[S.active] ?? 0 : 0;
    return (
      <g>
        <defs>
          {nodes.map((n, i) => {
            const b = box[i];
            const wipe = tw(c.f, S.nodeAt[i], 18, E.inOut);
            return (
              <clipPath key={i} id={`g${uid}n${i}`}>
                <rect x={b.x - b.w / 2 - 12} y={b.y - b.h / 2 - 12} width={(b.w + 30) * wipe} height={b.h + 30} />
              </clipPath>
            );
          })}
        </defs>
        {/* groups */}
        {(data.groups ?? []).map((g) => {
          const members = nodes.map((n, i) => (n.group === g.id ? i : -1)).filter((i) => i >= 0);
          if (!members.length) return null;
          const t0 = Math.min(...members.map((i) => S.nodeAt[i]));
          const x0 = Math.min(...members.map((i) => box[i].x - box[i].w / 2)) - 26;
          const x1 = Math.max(...members.map((i) => box[i].x + box[i].w / 2)) + 26;
          const y0 = Math.min(...members.map((i) => box[i].y - box[i].h / 2)) - 40;
          const y1 = Math.max(...members.map((i) => box[i].y + box[i].h / 2)) + 22;
          return <path key={g.id} d={rect(x0, y0, x1 - x0, y1 - y0, 18)} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="10 8" opacity={0.5 * tw(c.f, t0, 16)} />;
        })}
        {/* edges */}
        {edges.map((e, k) => {
          const p = tw(c.f, S.edgeAt[k], 20, E.inOut);
          if (p <= 0) return null;
          const q = Q[k];
          const d = `M${q[0][0]} ${q[0][1]} C ${q[1][0]} ${q[1][1]}, ${q[2][0]} ${q[2][1]}, ${q[3][0]} ${q[3][1]}`;
          const col = e.tone ? tone(e.tone).fill : INK;
          const tip = bez(q, 1);
          const pre = bez(q, 0.97);
          const ang = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]);
          const fl = S.beats.map((b, i) => (b != null && (steps[i].flow ?? []).includes(eid(e)) ? b : null)).filter((b): b is number => b != null);
          // particles wait until their edge has drawn in
          const flowFrom = fl.length ? Math.max(Math.min(...fl), S.edgeAt[k] + 18) : null;
          const o = F && F.focus && !(F.set.has(eid(e)) || F.set.has(e.from) || F.set.has(e.to)) ? 0.25 : 1;
          // the edge leading into what is being explained is drawn in the accent
          const hot = active != null && e.to === active;
          const ew = hot ? 4.5 : 2.5;
          const ecol = hot ? ink.orange : col;
          const spark = p > 0 && p < 1 ? bez(q, p) : null;
          const cut = c.f >= S.cutAt[k];
          const cutP = cut ? tw(c.f, S.cutAt[k], 12, E.settle) : 0;
          const mid = bez(q, 0.5);
          return (
            <g key={k} opacity={o}>
              {e.dashed ? (
                <path d={d} fill="none" stroke={ecol} strokeWidth={ew} strokeLinecap="round" strokeDasharray="9 8" opacity={p} />
              ) : (
                <path d={d} fill="none" stroke={ecol} strokeWidth={ew} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
              )}
              {/* the spark that draws the connection */}
              {spark ? (
                <g>
                  <circle cx={spark[0]} cy={spark[1]} r={22} fill={ink.orange} opacity={0.18} />
                  <circle cx={spark[0]} cy={spark[1]} r={8} fill="#fff" stroke={ink.orange} strokeWidth={4} />
                </g>
              ) : null}
              {p > 0.9 ? <path d={`M${tip[0] - 17 * Math.cos(ang - 0.38)} ${tip[1] - 17 * Math.sin(ang - 0.38)} L${tip[0]} ${tip[1]} L${tip[0] - 17 * Math.cos(ang + 0.38)} ${tip[1] - 17 * Math.sin(ang + 0.38)} Z`} fill={ecol} stroke={ecol} strokeWidth={1.5} strokeLinejoin="round" /> : null}
              {cut ? (
                <g transform={`translate(${mid[0]} ${mid[1]}) scale(${cutP})`}>
                  <circle r={22} fill={ink.paperLight} stroke={ink.red} strokeWidth={4} />
                  <path d="M-10 -10 L10 10 M10 -10 L-10 10" stroke={ink.red} strokeWidth={5} strokeLinecap="round" />
                </g>
              ) : null}
              {flowFrom != null && c.f >= flowFrom && !cut
                ? Array.from({length: Math.max(2, Math.round(len[k] / 110))}, (_, j) => {
                    const nDots = Math.max(2, Math.round(len[k] / 110));
                    const period = Math.max(30, len[k] / 5);
                    const u = (((c.f - flowFrom) / period + j / nDots) % 1 + 1) % 1;
                    const [x, y] = bez(q, u);
                    return <circle key={j} cx={x} cy={y} r={7} fill={e.tone ? tone(e.tone).fill : ink.orange} stroke={ink.paperLight} strokeWidth={2} opacity={tw(c.f, flowFrom, 10) * (u < 0.06 ? u / 0.06 : u > 0.94 ? (1 - u) / 0.06 : 1)} />;
                  })
                : null}
            </g>
          );
        })}
        {/* nodes */}
        {nodes.map((n, i) => {
          const t0 = S.nodeAt[i];
          const o = tw(c.f, t0, 8, E.out);
          const b = box[i];
          // not yet explained: not drawn (empty dashed placeholders read as a broken render)
          if (o <= 0) return null;
          const focus = F?.focus === n.id;
          const ripple = focus ? tw(c.f, focusAt, 26, E.out) : 1;
          const pop = 1; // precise: focus is marked by colour and stroke, never by a bounce
          const starved = edges.some((e, k) => e.to === n.id && c.f >= S.cutAt[k] + 10);
          const tn = starved ? TONES.ink : tone(n.tone);
          const shape = n.shape ?? 'box';
          const r = shape === 'pill' ? b.h / 2 : 8;
          // a decision is a hexagon (a diamond can't hold a clinical question at a readable size)
          const k = Math.min(34, b.h / 2);
          const d =
            shape === 'circle'
              ? `M${b.x - b.h / 2} ${b.y} a${b.h / 2} ${b.h / 2} 0 1 0 ${b.h} 0 a${b.h / 2} ${b.h / 2} 0 1 0 ${-b.h} 0Z`
              : shape === 'decision'
                ? `M${b.x - b.w / 2} ${b.y} L${b.x - b.w / 2 + k} ${b.y - b.h / 2} H${b.x + b.w / 2 - k} L${b.x + b.w / 2} ${b.y} L${b.x + b.w / 2 - k} ${b.y + b.h / 2} H${b.x - b.w / 2 + k} Z`
                : rect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, r);
          return (
            <g key={n.id} opacity={o * dimNode(n.id)} transform={`translate(${b.x} ${b.y}) scale(${pop}) translate(${-b.x} ${-b.y})`}>
              {/* a ring spreads once from the step being explained */}
              {focus ? <path d={d} fill="none" stroke={ink.orange} strokeWidth={10} opacity={0.12 + 0.12 * Math.sin((c.f - focusAt) / 10)} /> : null}
              {focus && ripple < 1 ? <path d={d} fill="none" stroke={ink.orange} strokeWidth={3} opacity={0.6 * (1 - ripple)} transform={`translate(${b.x} ${b.y}) scale(${1 + 0.22 * ripple}) translate(${-b.x} ${-b.y})`} /> : null}
              <g clipPath={`url(#g${uid}n${i})`}>
              {/* a soft print shadow lifts the card off the page */}
              <path d={d} fill={INK} opacity={0.1} transform="translate(6 8)" />
              <path d={d} fill={ink.paperLight} />
              <path d={d} fill={tn.fill} opacity={n.tone && !starved ? 0.16 : shape === 'decision' ? 0.55 : 0.35} style={{mixBlendMode: 'multiply'}} />
              {starved ? <path d={d} fill="none" stroke={ink.red} strokeWidth={3} strokeDasharray="8 7" transform="scale(1.06)" style={{transformOrigin: `${b.x}px ${b.y}px`}} opacity={tw(c.f, Math.min(...edges.map((e, k) => (e.to === n.id ? S.cutAt[k] : Infinity))) + 10, 14)} /> : null}
              <path d={d} fill="none" stroke={focus ? ink.orange : n.tone ? tn.fill : INK} strokeWidth={focus ? 4.5 : 2.5} />
              </g>
            </g>
          );
        })}
        {/* the travelling token */}
        {steps.map((s, i) => {
          const b0 = S.beats[i];
          if (!s.token || s.token.length < 2 || b0 == null || c.f < b0) return null;
          const hops = s.token.slice(1).map((to, h) => {
            const from = s.token![h];
            const k = ek.get(`${from}>${to}`) ?? ek.get(`${to}>${from}`);
            return {k: k!, rev: !ek.has(`${from}>${to}`)};
          });
          const HOP = 26;
          const cycle = hops.length * HOP + (s.loop ? 14 : 0);
          let t = c.f - b0;
          if (s.loop) t %= cycle;
          const h = Math.min(hops.length - 1, Math.floor(t / HOP));
          const u = clamp01((t - h * HOP) / HOP);
          const hop = hops[h];
          if (hop.k === undefined) return null;
          const [x, y] = bez(Q[hop.k], hop.rev ? 1 - E.inOut(u) : E.inOut(u));
          const col = tone(edges[hop.k].tone ?? nodes[at.get(s.token[h])!].tone ?? 'orange').fill;
          const endHere = !s.loop && t >= hops.length * HOP;
          return (
            <g key={`tok${i}`} opacity={tw(c.f, b0, 8)}>
              <circle cx={x} cy={y} r={22} fill={col} opacity={0.18} />
              <circle cx={x} cy={y} r={12} fill={col} stroke={INK} strokeWidth={3} opacity={endHere ? 0.5 : 1} />
            </g>
          );
        })}
      </g>
    );
  };

  const Html: React.FC<ArtCtx> = (c) => {
    const S = shownAt(c);
    const F = focusOf(c, S);
    return (
      <>
        {(data.groups ?? []).map((g) => {
          const members = nodes.map((n, i) => (n.group === g.id ? i : -1)).filter((i) => i >= 0);
          if (!members.length) return null;
          const t0 = Math.min(...members.map((i) => S.nodeAt[i]));
          const x0 = Math.min(...members.map((i) => box[i].x - box[i].w / 2)) - 26;
          const y0 = Math.min(...members.map((i) => box[i].y - box[i].h / 2)) - 40;
          return (
            <div key={g.id} style={{position: 'absolute', left: x0 + 16, top: y0 + 6, fontFamily: fonts.body, fontWeight: 700, fontSize: 20, letterSpacing: '0.12em', color: ink.soft, opacity: tw(c.f, t0, 16), textTransform: 'uppercase'}}>
              {g.label}
            </div>
          );
        })}
        {edges.map((e, k) =>
          e.label ? (
            <div key={k} style={{position: 'absolute', left: bez(Q[k], 0.5)[0], top: bez(Q[k], 0.5)[1], transform: 'translate(-50%, -50%)', fontFamily: fonts.body, fontWeight: 700, fontSize: Math.round(fs * 0.9), color: e.tone ? tone(e.tone).text : ink.soft, background: 'rgba(255,255,255,0.95)', padding: '2px 10px', whiteSpace: 'nowrap', opacity: tw(c.f, S.edgeAt[k] + 10, 12) * (F && F.focus && !(F.set.has(e.from) || F.set.has(e.to)) ? 0.45 : 1)}}>
              {e.label}
            </div>
          ) : null,
        )}
        {nodes.map((n, i) => {
          const o = tw(c.f, S.nodeAt[i], 8, E.out);
          if (o <= 0) return null;
          const b = box[i];
          const focus = F?.focus === n.id;
          const dim = F && F.focus && !F.set.has(n.id) ? 0.35 : 1;
          const wipe = tw(c.f, S.nodeAt[i] + 4, 18, E.inOut);
          const x1 = b.x - b.w / 2 - 10 + (b.w + 30) * wipe;
          return (
            <div key={n.id} style={{position: 'absolute', inset: 0, clipPath: `polygon(0 0, ${x1}px 0, ${x1}px 100%, 0 100%)`}}>
            <T x={b.x} y={b.y} size={fs} maxWidth={b.w - (n.shape === 'decision' ? 70 : 30)} weight={n.shape === 'decision' ? 600 : 500} color={focus ? ink.orangeText : INK} o={o * dim}>
              {n.label}
            </T>
            </div>
          );
        })}
      </>
    );
  };

  const anchors: Record<string, [number, number]> = Object.fromEntries(nodes.map((n, i) => [n.id, [box[i].x, box[i].y] as [number, number]]));
  steps.forEach((s, i) => {
    const ids = s.focus ? [s.focus] : (s.show ?? []).filter((id) => at.has(id));
    const pts = ids.length ? ids.map((id) => [B(id).x, B(id).y]) : [[W / 2, H / 2]];
    anchors[`s${i + 1}`] = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
  });
  return {w: W, h: H, layout: 'full', lean: 0.05, anchors, C, Html} satisfies ArtDef;
};

export const GRAPH: Record<string, ArtFactory> = {graph};
