/**
 * Shorthand scenes → stages. Authors (and generation agents) write the IDEA — a Mermaid chart,
 * a table's rows — plus the narration; the compiler builds the stage, its layer and every beat,
 * deriving each reveal's spoken word from the node/row text so the build follows the voice.
 * Few tokens per scene, no hand-placed coordinates, no beat bookkeeping. Pure (no remotion).
 *
 *   {"type": "flow", "kicker", "narration", "mermaid": "flowchart LR\n A[…] --> B{…}",
 *    "steps"?: [{"show": ["A"], "focus"?: "A", "say"?: ["word"]}],   // default: one node per step, in chart order
 *    "tour"?: true,                                                  // the camera travels node to node
 *    "notes"?: [{"say": ["word"], "note": "…"}], "title"?, "transition"?}
 *
 *   {"type": "table", "kicker", "narration", "columns": [...], "rows": [[...]...],
 *    "align"?, "widths"?, "size"?, "say"?: [["word"]...],          // per row; default: the row's distinctive words
 *    "highlight"?: [{"say": ["word"], "col"?: 2, "cell"?: [row, col]}],
 *    "notes"?: [{"say": [...], "note": "…"}], "title"?, "transition"?}
 *
 * Every derived `say` is a word the narration really speaks (validated as usual by src/sync.ts);
 * when a node's/row's words are never spoken, the compiler leaves the beat for validate to flag.
 */
import {parseMermaid, type GStep} from './art/mermaid.ts';
import {keywordsOf, normWord, wordMatches} from './sync.ts';
import {spoken} from './project.ts';
import {direct} from './director.ts';

type Note = {say: string[]; note: string};
const STOP = new Set(['with', 'from', 'that', 'this', 'into', 'than', 'then', 'when', 'what', 'your', 'their', 'there', 'about', 'after', 'before']);

/** The first candidate keyword the narration speaks at/after word index `from`: [keyword, index]. */
const firstSpoken = (words: string[], cands: string[], from: number): [string, number] | null => {
  for (let j = from; j < words.length; j++)
    for (const c of cands) if (words[j] === c || (c.length >= 5 && words[j].startsWith(c.slice(0, Math.max(5, c.length - 2))))) return [words[j], j];
  return null;
};

/** Order beats by where their word is spoken (the sync contract is in-order). */
const byPosition = <T extends {say?: string[]; _pos?: number}>(words: string[], beats: T[]): T[] => {
  // derived beats know exactly where their word is spoken (_pos); others take its first occurrence
  const pos = (b: T) => {
    if (b._pos != null) return b._pos;
    const w = (b.say ?? []).map(normWord);
    const j = words.findIndex((x) => w.includes(x));
    return j < 0 ? Infinity : j;
  };
  // positions are kept (merging element timelines needs them); compileSpec strips them at the end
  return [...beats].map((b) => ({...b, _pos: pos(b)})).sort((a, b) => a._pos - b._pos);
};

const derive = (words: string[], text: string, from: number): {say: string[]; at: number} | null => {
  const cands = keywordsOf(text, 4).filter((k) => !STOP.has(k));
  const hit = firstSpoken(words, cands, from);
  return hit ? {say: [hit[0]], at: hit[1]} : null;
};

/** Note beats in order; a note without a cue listens for a word of its own text, spoken after the previous note. */
const noteBeats = (words: string[], notes: {say?: string[]; note: string}[]) => {
  let cursor = 0;
  return notes.map((n) => {
    if (n.say?.length) {
      const j = words.findIndex((w, k) => k >= cursor && wordMatches(w, n.say!.map(normWord)));
      if (j >= 0) cursor = j + 1;
      return {say: n.say, note: n.note};
    }
    const d = derive(words, n.note, cursor);
    if (d) cursor = d.at + 1;
    return {say: d?.say ?? keywordsOf(n.note, 3), note: n.note, ...(d ? {_pos: d.at} : {})};
  });
};

function shorthand(s: any): any {
  if (s?.type === 'flow') {
    const g = parseMermaid(s.mermaid ?? '');
    // a long left-to-right chain is too small to read at once: the camera tours it by default
    if (s.tour === undefined && g.direction === 'LR' && g.nodes.length >= 5) s = {...s, tour: true};
    const words = spoken(s.narration ?? '').split(/\s+/).map(normWord).filter(Boolean);
    const label = new Map(g.nodes.map((n) => [n.id, n.label]));
    const shownSoFar = new Set<string>();
    const steps: (GStep & {say?: string[]})[] = (s.steps ?? g.nodes.map((n) => ({show: [n.id], focus: n.id}))).map((st: GStep & {say?: string[]}) => {
      // living connectors: particles start streaming along each edge into what is now explained
      const ids = st.show ?? (st.focus ? [st.focus] : []);
      const flow = (g.edges ?? []).filter((e) => ids.includes(e.to) && shownSoFar.has(e.from)).map((e) => `${e.from}>${e.to}`);
      ids.forEach((id) => shownSoFar.add(id));
      return s.living === false || st.flow ? st : {...st, ...(flow.length ? {flow} : {})};
    });
    let cursor = 0;
    const beats: any[] = steps.map((st, i) => {
      const ids = st.show ?? (st.focus ? [st.focus] : []);
      let say = st.say;
      if (!say) {
        const d = derive(words, ids.map((id) => label.get(id) ?? id).join(' '), cursor);
        if (d) {
          say = d.say;
          cursor = d.at + 1;
        } else say = keywordsOf(ids.map((id) => label.get(id) ?? id).join(' '), 4).slice(0, 2);
      } else {
        // an authored word: find where it is spoken after the previous step
        const w = say.map(normWord);
        const j = words.findIndex((x, k) => k >= cursor && wordMatches(x, w));
        if (j >= 0) cursor = j + 1;
      }
      const focus = st.focus ?? ids[0];
      return {say, _pos: cursor - 1, act: `chart.s${i + 1}`, ...(s.tour && focus ? {camera: {on: `chart.${focus}`, zoom: s.zoom ?? 1.7}} : {})};
    });
    // a tour ends by pulling back to the whole chart: on a later word if one is spoken, else the
    // last reveal itself pulls back (the final node lands in the overview)
    if (s.tour && beats.length) {
      const last = beats[beats.length - 1];
      if (s.overviewSay || last._pos < words.length - 2) beats.push({say: s.overviewSay ?? [words[words.length - 1]], _pos: words.length - 1, camera: 'overview'});
      else last.camera = 'overview';
    }
    const notes: Note[] = s.notes ?? [];
    return {
      type: 'stage',
      kicker: s.kicker,
      narration: s.narration,
      ...(s.transition ? {transition: s.transition} : {}),
      world: {w: 2400, h: 1300, layers: [{id: 'chart', art: 'graph', fit: true, at: [1200, 650], h: 1, data: {mermaid: s.mermaid, steps: steps.map(({say: _s, ...r}) => r), ...(s.size ? {size: s.size} : {})}}]},
      beats: byPosition(words, [...(s.title ? [{say: [words[0]], title: s.title}] : []), ...beats, ...noteBeats(words, notes), ...echo(words, beats, steps.flatMap((st, i) => (st.show ?? (st.focus ? [st.focus] : [])).map((id) => ({target: `chart.${id}`, text: label.get(id) ?? id, at: beats[i]?._pos ?? 0}))))]),
    };
  }
  if (s?.type === 'table') {
    const words = spoken(s.narration ?? '').split(/\s+/).map(normWord).filter(Boolean);
    let cursor = 0;
    const rows: string[][] = s.rows ?? [];
    const tour = s.tour ?? rows.length >= 4;
    const beats: any[] = rows.map((r, i) => {
      let say = s.say?.[i];
      if (!say) {
        // a row is announced by its first cell (the row's name); fall back to any of its words
        const d = derive(words, r[0], cursor) ?? derive(words, r.join(' '), cursor);
        if (d) {
          say = d.say;
          cursor = d.at + 1;
        } else say = keywordsOf(r.join(' '), 4).slice(0, 2);
      } else {
        const j = words.findIndex((w, k) => k >= cursor && wordMatches(w, say!.map(normWord)));
        if (j >= 0) cursor = j + 1;
      }
      return {say, _pos: cursor - 1, act: `tbl.r${i + 1}`, ...(tour ? {camera: {on: `tbl.r${i + 1}`, zoom: s.zoom ?? 1.3}} : {})};
    });
    // progressive reading: each later cell appears when its own words are spoken (numbers come
    // with their row and count up); the row's announcement covers its first cell
    const cellBeats: any[] = [];
    if (s.cells !== false)
      rows.forEach((r, i) => {
        let from = beats[i]._pos;
        const until = i + 1 < beats.length ? beats[i + 1]._pos : words.length;
        r.forEach((cellText, j) => {
          if (j === 0 || /^[\s\d.,%–:\-/·+~≈<>]+[a-zµ°/%]*$/i.test(cellText.trim())) return;
          const d = derive(words, cellText, from + 1);
          // a cell is read while its row is being talked about — never borrows a later row's words
          if (d && d.at > from && d.at < until) {
            cellBeats.push({say: d.say, _pos: d.at, act: `tbl.r${i + 1}c${j + 1}`});
            from = d.at;
          }
        });
      });
    const hl = (s.highlight ?? []).map((h: any) => ({say: h.say, act: h.cell ? `tbl.r${h.cell[0]}c${h.cell[1]}` : `tbl.c${h.col}`}));
    const notes: Note[] = s.notes ?? [];
    return {
      type: 'stage',
      kicker: s.kicker,
      narration: s.narration,
      ...(s.transition ? {transition: s.transition} : {}),
      world: {w: 2400, h: 1300, layers: [{id: 'tbl', art: 'table', fit: true, at: [1200, 650], h: 1, data: {columns: s.columns, rows, ...(s.cells !== false ? {cells: true} : {}), ...(s.align ? {align: s.align} : {}), ...(s.widths ? {widths: s.widths} : {}), ...(s.size ? {size: s.size} : {}), ...(s.bars ? {bars: s.bars} : {})}}]},
      beats: (() => {
        const echoes = echo(words, [...beats, ...cellBeats], rows.map((r, i) => ({target: `tbl.r${i + 1}`, text: r.join(' '), at: beats[i]._pos})));
        const all = byPosition(words, [...(s.title ? [{say: [words[0]], title: s.title}] : []), ...beats.map((b) => ({...b, _pos: b._pos})), ...cellBeats, ...hl, ...noteBeats(words, notes), ...echoes]);
        if (!tour) return all;
        // the tour ends on the whole table: on the last spoken word, or folded into the last reveal
        const lastPos = Math.max(...[...beats, ...cellBeats].map((b) => b._pos ?? -1));
        if (lastPos >= words.length - 2) {
          const last = [...all].reverse().find((b: any) => b.act);
          if (last) last.camera = 'overview';
          return all;
        }
        return [...all, {say: [words[words.length - 1]], camera: 'overview'}];
      })(),
    };
  }
  return s;
}

/**
 * Echo emphasis: when the narration mentions something already on screen again, that thing pulses —
 * so the picture keeps following the voice through long explanations instead of freezing.
 * Fills gaps longer than `gap` spoken words between visual events, at most one echo per `gap`.
 */
const echo = (words: string[], beats: any[], items: {target: string; text: string; at: number}[], gap = 14): any[] => {
  const marks = beats.map((b) => b._pos).filter((p) => p != null && p >= 0).sort((a, b) => a - b);
  // a word any beat listens for is never borrowed by an echo (sync matches in order)
  const taken = (j: number) => beats.some((b) => (b.say ?? []).some((w: string) => wordMatches(words[j], [normWord(w)])));
  const bounds = [-1, ...marks, words.length];
  const extra: any[] = [];
  for (let k = 1; k < bounds.length; k++) {
    let from = bounds[k - 1] + gap;
    while (from < bounds[k] - 4) {
      let hit: {j: number; target: string} | null = null;
      for (let j = from - 6; j < bounds[k] - 3 && !hit; j++)
        for (const it of items.filter(() => !taken(j)))
          if (it.at < j && keywordsOf(it.text, 5).filter((c) => !STOP.has(c)).some((c) => words[j] === c || words[j]?.startsWith(c.slice(0, Math.max(5, c.length - 2))))) {
            hit = {j, target: it.target};
            break;
          }
      if (!hit) break;
      extra.push({say: [words[hit.j]], _pos: hit.j, pulse: hit.target});
      from = hit.j + gap;
    }
  }
  return extra;
};

/**
 * Camera breaths: a long stretch with nothing new (> `gap` spoken characters, even after echoes) gets
 * one slow camera move — in on the shown item the words are about (else the lead element), and back
 * out on the next — so the picture follows the explanation. With several elements on screen it
 * pulses that item in place instead (a zoom would crop the others).
 */
const OPENING = 24; // spoken characters (≈ 1.7 s) before an opening still picture moves
const breathe = (words: string[], beats: any[], items: {target: string; text: string; at: number}[], lead?: string, gap = 64, inPlace = false): any[] => {
  // the gap is measured in spoken characters (≈ 4.5 s at the house pace): long clinical words take longer to say
  const cum = words.reduce((a, w) => [...a, a[a.length - 1] + w.length + 1], [0]);
  const len = (a: number, b: number) => cum[Math.max(0, b)] - cum[Math.max(0, a + 1)];
  const marks = () => [...beats, ...extra].map((b) => b._pos).filter((p) => p != null && p >= 0).sort((a, b) => a - b);
  const extra: any[] = [];
  const said = (j: number) => [...beats, ...extra].some((b) => (b.say ?? []).some((w: string) => wordMatches(words[j], [normWord(w)])));
  for (let guard = 0; guard < 20; guard++) {
    const m = [-1, ...marks(), words.length];
    // the opening is stricter: the viewer has already watched the transition into a still picture
    const k = m.findIndex((p, i) => i > 0 && len(m[i - 1], p) > (i === 1 ? OPENING : gap));
    if (k < 0) break;
    const [a, b] = [m[k - 1], m[k]];
    // a content word near the middle, not spoken earlier in the gap (cues are matched in order)
    let mid = a + 1;
    while (mid < b - 1 && len(a, mid) < Math.min((a < 0 ? OPENING : gap) * 0.8, len(a, b) / 2)) mid++;
    // alphabetic only: the voice reports numbers as it reads them ("2025" → "twenty twenty-five")
    const ok = (j: number) => j > a && j < b && /^[a-z]{4,}$/.test(words[j] ?? '') && !STOP.has(words[j]) && !said(j) && !words.slice(a + 1, j).includes(words[j]);
    const j = [0, 1, -1, 2, -2, 3, -3, 4, -4].map((d) => mid + d).find(ok);
    if (j === undefined) break;
    const near = new Set(words.slice(a + 1, b));
    const shown = items.filter((it) => it.at < j && it.target);
    const about = shown.find((it) => keywordsOf(it.text, 5).some((w) => near.has(w)));
    const zoomed = [...beats, ...extra].filter((x) => x._pos < j && x.camera).sort((x, y) => x._pos - y._pos).pop()?.camera;
    const target = about?.target ?? lead;
    // several elements share the frame: a zoom would push the others off it — emphasise in place
    if (inPlace) {
      extra.push({say: [words[j]], _pos: j, pulse: target ?? lead});
      continue;
    }
    extra.push({say: [words[j]], _pos: j, camera: zoomed && zoomed !== 'overview' ? 'overview' : target ? {on: target, zoom: 1.2} : 'overview'});
  }
  return extra;
};

/* ------------------------------------------------------------------ illustration recipes */
/** Fit-to-frame stage around one library art (imported or drawn). */
const artStage = (s: any, beats: any[]) => ({
  type: 'stage',
  ...(s.drift ? {drift: s.drift} : {}),
  kicker: s.kicker,
  narration: s.narration,
  ...(s.transition ? {transition: s.transition} : {}),
  ...(s.drawn ? {drawn: true} : {}),
  world: {w: 2400, h: 1300, layers: s.art ? [{id: 'art', art: s.art, fit: true, at: [1200, 650], h: 1, ...(s.data ? {data: s.data} : {})}] : []},
  beats,
});
const asList = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/**
 *   {"type": "opener", "kicker", "narration", "title", "art"?, "data"?, "act"?: ["conduction"]}
 *     the lesson's first scene: the title over the illustration, then the art acts
 *   {"type": "explain", "kicker", "narration", "art", "data"?,
 *    "points": [{"on"?: "aorta", "label"?: "Aorta", "act"?: "vf", "note"?: "…", "say"?: ["word"], "zoom"?: 1.5 | false}]}
 *     an illustration explained part by part: each point fires on its spoken word (derived from its
 *     label when `say` is omitted), labels its part, acts, and the camera visits it (zoom 1.4 by
 *     default when it has a label; `zoom: false` keeps the wide view); the last beat pulls back
 *   {"type": "summary", "kicker", "narration", "art"?, "data"?, "act"?: "rosc", "notes": [{"say", "note"}]}
 *     the take-aways in turn over the illustration
 */
function compileRecipe(s: any): any {
  const words = spoken(s.narration ?? '').split(/\s+/).map(normWord).filter(Boolean);
  if (s.type === 'opener') {
    const beats: any[] = [{say: [words[0]], _pos: 0, title: s.title}];
    if (s.act && s.art) {
      const at = Math.min(words.length - 1, Math.max(3, Math.floor(words.length * 0.35)));
      // the act beat also moves the camera: that clears the hero title and hands the screen to the moving art
      beats.push({say: [words[at]], _pos: at, act: asList(s.act).map((a: string) => `art.${a}`), camera: 'overview'});
    }
    // then the camera moves in on the subject while the opening sentence lands
    if (s.art && words.length > 20) {
      const k = Math.min(words.length - 2, Math.floor(words.length * 0.68));
      beats.push({say: [words[k]], _pos: k, camera: {on: 'art', zoom: 1.25}});
    }
    return artStage({...s, drawn: s.drawn ?? true}, byPosition(words, beats));
  }
  if (s.type === 'explain') {
    let cursor = 0;
    const pts: any[] = s.points ?? [];
    const beats: any[] = pts.map((p) => {
      let say = p.say;
      let pos = -1;
      if (!say) {
        const d = derive(words, [p.label, p.note, p.on].filter(Boolean).join(' '), cursor);
        if (d) {
          say = d.say;
          pos = d.at;
        }
      } else pos = words.findIndex((x, k) => k >= cursor && wordMatches(x, say.map(normWord)));
      if (pos >= 0) cursor = pos + 1;
      const zoom = p.zoom === false ? null : (p.zoom ?? (p.label && p.on ? 1.4 : null));
      return {
        say: say ?? [p.label ?? p.on ?? 'missing'],
        _pos: pos,
        ...(p.act ? {act: asList(p.act).map((a: string) => `art.${a}`)} : {}),
        ...(p.label && p.on ? {label: {on: `art.${p.on}`, text: p.label}} : {}),
        ...(p.note ? {note: p.note} : {}),
        ...(zoom && p.on ? {camera: {on: `art.${p.on}`, zoom}} : {}),
        ...(p.pulse && p.on ? {pulse: `art.${p.on}`} : {}),
      };
    });
    // the scene ends on the whole picture: the last zoomed point pulls back as it lands
    const zoomed = beats.filter((b) => b.camera);
    if (zoomed.length && beats[beats.length - 1].camera) beats[beats.length - 1].camera = 'overview';
    const echoes = echo(words, beats, pts.map((p, i) => ({target: p.on ? `art.${p.on}` : '', text: [p.label, p.note].filter(Boolean).join(' '), at: beats[i]._pos})).filter((x) => x.target));
    return artStage(s, byPosition(words, [...beats, ...echoes]));
  }
  if (s.type === 'summary') {
    const beats: any[] = noteBeats(words, s.notes ?? []);
    if (s.act && s.art) beats.unshift({say: [words[0]], _pos: 0, act: asList(s.act).map((a: string) => `art.${a}`)});
    return artStage(s, byPosition(words, beats));
  }
  return s;
}

/** The project's frame around every lesson: its logo intro first, its signoff outro last. */
export type Frame = {ident?: boolean; outro?: string | false; identSeconds?: number; /** apply the director (src/director.ts): on for every new project; off keeps delivered lessons byte-identical */ direct?: boolean};
const framed = (scenes: any[], frame?: Frame) => {
  if (!frame) return scenes;
  const out = [...scenes];
  if (frame.ident && out[0]?.type !== 'ident') out.unshift({type: 'ident', kicker: 'Intro', seconds: frame.identSeconds ?? 3.2});
  if (frame.outro && out[out.length - 1]?.type !== 'outro') out.push({type: 'outro', kicker: 'Outro', transition: 'slide', narration: frame.outro});
  return out;
};

/* ------------------------------------------------------------------ compositions */
/**
 * {"type": "scene", "kicker", "narration", "layout"?: "auto"|"halves"|"main",
 *  "elements": [{"id", "kind": "art"|"flow"|"table"|"stat"|"bars"|"timeline"|"cycle"|"hub"|"stack"|"trace", …its data}],
 *  "moves": [{"say"?, "reveal"?: id|[ids], "focus"?: "id.anchor", "zoom"?, "back"?: true,
 *             "label"?: {"on": "id.anchor", "text"}, "act"?: "id.event"|[…], "note"?, "pulse"?, "cross"?}]}
 * One frame composed of 1–3 elements (an illustration beside its statistic, a rhythm strip beside
 * the decision chart…), laid out automatically, each element building as its words are spoken,
 * plus the author's teaching moves. The director (src/director.ts) picks sides and continuity.
 */
const ITEM_KINDS = ['bars', 'timeline', 'cycle', 'hub', 'stack'];
const KIND_ART: Record<string, string> = {flow: 'graph', table: 'table', stat: 'stat', bars: 'bars', timeline: 'timeline', cycle: 'cycle', hub: 'hub', stack: 'stack', trace: 'trace'};
const retarget = (beats: any[], from: string, to: string) =>
  beats
    .filter((b) => !b.camera || b.act || b.note)
    .map(({camera: _c, ...b}) => {
      const fix = (t: any) => (typeof t === 'string' ? t.replace(new RegExp(`^${from}\\.`), `${to}.`) : t);
      return {...b, ...(b.act ? {act: Array.isArray(b.act) ? b.act.map(fix) : fix(b.act)} : {}), ...(b.pulse ? {pulse: fix(b.pulse)} : {})};
    });

/** Slots for 1–3 elements: the first element (or the illustration) is the lead. */
export const slotsFor = (kinds: string[], layout?: string, mirror?: boolean, dense: boolean[] = []): string[] => {
  const n = kinds.length;
  if (n <= 1) return ['full'];
  const [a, b] = mirror ? ['R', 'L'] : ['L', 'R'];
  const twoArts = kinds.filter((k) => k === 'art').length === 2;
  if (n === 2) {
    if (layout === 'halves' || twoArts) return [a, b];
    // the element that needs the room (a dense chart, table or item diagram) takes the main slot
    if (!!dense[0] !== !!dense[1]) return dense[1] ? [`S${b}`, `M${a}`] : [`M${a}`, `S${b}`];
    return layout === 'main' || kinds.includes('art') ? (kinds[0] === 'art' || layout === 'main' ? [`M${a}`, `S${b}`] : [`S${b}`, `M${a}`]) : [a, b];
  }
  return [`M${a}`, `S${b}T`, `S${b}B`];
};

function composition(s: any): any {
  const words = spoken(s.narration ?? '').split(/\s+/).map(normWord).filter(Boolean);
  const els: any[] = s.elements ?? [];
  // the lead (the illustration if there is one) goes first so it takes the main slot
  const ordered = [...els].sort((x, y) => (x.kind === 'art' ? 0 : 1) - (y.kind === 'art' ? 0 : 1));
  // dense: a table of 3+ columns or 4+ rows, a chart of 5+ nodes, any item diagram (laid out for a full
  // frame) — it needs the main slot to stay readable
  const dense = ordered.map((e) => (e.kind === 'table' && ((e.columns ?? []).length >= 3 || (e.rows ?? []).length >= 4)) || (e.kind === 'flow' && parseMermaid(e.mermaid ?? '').nodes.length >= 5) || ITEM_KINDS.includes(e.kind));
  const slots = slotsFor(ordered.map((e) => e.kind), s.layout, s.mirror, dense);
  const revealed = new Set((s.moves ?? []).flatMap((m: any) => asList(m.reveal)));
  // flow and table elements compile exactly as their full-screen scenes do (no tour: the composition owns the camera)
  const sub = new Map<string, any>();
  for (const e of ordered)
    if (e.kind === 'flow') sub.set(e.id, shorthand({type: 'flow', narration: s.narration, mermaid: e.mermaid, steps: e.steps, size: e.size, tour: false}));
    else if (e.kind === 'table') sub.set(e.id, shorthand({type: 'table', narration: s.narration, columns: e.columns, rows: e.rows, say: e.say, bars: e.bars, highlight: e.highlight, widths: e.widths, align: e.align, size: e.size, tour: false}));
  const layers = ordered.map((e, i) => {
    const {id, kind, art: artName, data: artData, say: _s, ...rest} = e;
    const data = kind === 'art' ? artData : sub.has(id) ? sub.get(id).world.layers[0].data : rest;
    return {id, art: kind === 'art' ? artName : KIND_ART[kind], fit: true, slot: slots[i], at: [1200, 500], h: 1, ...(data ? {data} : {}), ...(revealed.has(id) ? {hidden: true} : {})};
  });
  // each element builds itself as its own words are spoken
  const auto: any[] = [];
  const items: {target: string; text: string; at: number}[] = [];
  for (const e of ordered) {
    if (sub.has(e.id)) {
      const st = sub.get(e.id);
      const own = retarget(st.beats.filter((b: any) => b.act), e.kind === 'flow' ? 'chart' : 'tbl', e.id);
      auto.push(...own);
      // what can be echoed later: each node / row, from the moment it appears
      const label = new Map(parseMermaid(e.mermaid ?? '').nodes.map((n) => [n.id, n.label]));
      for (const b of own) {
        const m = /\.(s|r)(\d+)$/.exec(String(b.act));
        if (!m) continue;
        const k = +m[2] - 1;
        if (m[1] === 's') for (const id of st.world.layers[0].data.steps[k]?.show ?? []) items.push({target: `${e.id}.${id}`, text: label.get(id) ?? '', at: b._pos});
        else items.push({target: `${e.id}.r${k + 1}`, text: (e.rows?.[k] ?? []).join(' '), at: b._pos});
      }
    } else if (e.kind === 'stat') {
      const d = e.say ? {say: e.say, at: words.findIndex((w) => wordMatches(w, e.say.map(normWord)))} : derive(words, `${e.display ?? ''} ${e.label ?? ''}`, 0);
      if (d) auto.push({say: d.say, _pos: d.at, act: `${e.id}.count`});
      items.push({target: `${e.id}.figure`, text: `${e.label ?? ''}`, at: d?.at ?? 0});
    } else if (ITEM_KINDS.includes(e.kind) || e.kind === 'trace') {
      const list: any[] = e.kind === 'trace' ? (e.segments ?? []).filter((x: any) => x.label) : (e.items ?? []);
      let cur = 0;
      list.forEach((it, k) => {
        const d = it.say ? {say: it.say, at: words.findIndex((w, j) => j >= cur && wordMatches(w, it.say.map(normWord)))} : derive(words, `${it.label ?? ''} ${it.when ?? ''}`, cur);
        if (d && d.at >= 0) {
          auto.push({say: d.say, _pos: d.at, act: `${e.id}.i${k + 1}`});
          cur = d.at + 1;
        }
        items.push({target: `${e.id}.i${k + 1}`, text: it.label ?? '', at: d?.at ?? 0});
      });
    }
  }
  // the author's teaching moves
  let cursor = 0;
  const moves = (s.moves ?? []).map((m: any) => {
    let say = m.say;
    let pos = -1;
    if (say) pos = words.findIndex((x, k) => k >= cursor && wordMatches(x, say.map(normWord)));
    else {
      const d = derive(words, [m.label?.text, m.note].filter(Boolean).join(' '), cursor);
      if (d) [say, pos] = [d.say, d.at];
    }
    if (pos >= 0) cursor = pos + 1;
    if (m.label?.on) items.push({target: m.label.on, text: m.label.text, at: pos});
    return {
      say: say ?? ['missing'],
      _pos: pos,
      ...(m.reveal ? {show: asList(m.reveal)} : {}),
      ...(m.focus ? {camera: {on: m.focus, zoom: m.zoom ?? 1.5}} : m.back ? {camera: 'overview'} : {}),
      ...(m.label ? {label: m.label} : {}),
      ...(m.act ? {act: m.act} : {}),
      ...(m.note ? {note: m.note} : {}),
      ...(m.pulse ? {pulse: m.pulse} : {}),
      ...(m.cross ? {cross: m.cross} : {}),
    };
  });
  const all = byPosition(words, [...auto, ...moves]);
  const echoes = echo(words, all, items.filter((x) => x.text));
  const breaths = breathe(words, [...all, ...echoes], items.filter((x) => x.text), ordered[0]?.id, 64, ordered.length > 1);
  return {
    type: 'stage',
    kicker: s.kicker,
    narration: s.narration,
    ...(s.transition ? {transition: s.transition} : {}),
    ...(s.drift ? {drift: s.drift} : {}),
    // the stage view is ~2.4:1 (room above for notes, below for captions): a world of that shape fills it
    world: {w: 2400, h: 1000, layers},
    beats: byPosition(words, [...all, ...echoes, ...breaths]),
  };
}

/**
 * Beats cued by the same spoken word fire together: one beat (a row and its statistic both react to
 * "children"). Sync matches cues in order, so two beats on one word would leave the second unheard.
 */
const ONE = ['camera', 'note', 'title', 'flash', 'inset', 'cross', 'travel', 'dim'];
const LIST = ['act', 'pulse', 'show', 'hide', 'label', 'sfx'];
export const mergeSameWord = (beats: any[]): any[] => {
  const out: any[] = [];
  for (const b of beats) {
    const prev = out[out.length - 1];
    const clash = prev && ONE.some((k) => prev[k] !== undefined && b[k] !== undefined);
    if (prev && b._pos != null && b._pos >= 0 && prev._pos === b._pos && !clash) {
      const m: any = {...prev};
      for (const k of ONE) if (b[k] !== undefined) m[k] = b[k];
      for (const k of LIST) if (b[k] !== undefined) m[k] = [...(prev[k] === undefined ? [] : Array.isArray(prev[k]) ? prev[k] : [prev[k]]), ...(Array.isArray(b[k]) ? b[k] : [b[k]])];
      out[out.length - 1] = m;
    } else out.push(b);
  }
  return out;
};
const strip = (s: any) => (s?.beats ? {...s, beats: mergeSameWord(s.beats).map(({_pos, ...b}: any) => b)} : s);
/** One scene, any shorthand (flow/table/recipes/composition) → a stage. */
const RECIPES = new Set(['flow', 'table', 'opener', 'explain', 'summary']);
/** Recipe scenes breathe too: long still stretches get a camera move toward what is being said. */
const breathed = (st: any): any => {
  const layer = st.world?.layers?.[0]?.id;
  if (!layer) return st;
  const words = spoken(st.narration ?? '').split(/\s+/).map(normWord).filter(Boolean);
  const items = st.beats
    .map((b: any) => ({target: b.label ? (Array.isArray(b.label) ? b.label[0].on : b.label.on) : typeof b.act === 'string' && /\.(r\d+|[A-Z]\w*)$/.test(b.act) ? b.act : '', text: b.label ? [b.label].flat()[0].text : b.note ?? '', at: b._pos ?? -1}))
    .filter((x: any) => x.target && x.text);
  return {...st, beats: byPosition(words, [...st.beats, ...breathe(words, st.beats, items, layer)])};
};
export const compileScene = (s: any): any => strip(s?.type === 'scene' ? composition(s) : RECIPES.has(s?.type) ? breathed(compileRecipe(shorthand(s))) : compileRecipe(shorthand(s)));

/** A spec with every shorthand scene compiled (idempotent: compiled scenes pass through), framed by the project's intro/outro and directed (src/director.ts). */
export const compileSpec = <T extends {scenes: any[]}>(spec: T, frame?: Frame): T => ({...spec, scenes: (frame?.direct ? direct : (x: any[]) => x)(framed(spec.scenes, frame)).map(compileScene)});
