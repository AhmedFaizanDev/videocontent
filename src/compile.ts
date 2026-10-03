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
  return [...beats].sort((a, b) => pos(a) - pos(b)).map(({_pos, ...b}) => b as T);
};

const derive = (words: string[], text: string, from: number): {say: string[]; at: number} | null => {
  const cands = keywordsOf(text, 4).filter((k) => !STOP.has(k));
  const hit = firstSpoken(words, cands, from);
  return hit ? {say: [hit[0]], at: hit[1]} : null;
};

export function compileScene(s: any): any {
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
      beats: byPosition(words, [...(s.title ? [{say: [words[0]], title: s.title}] : []), ...beats, ...notes.map((n) => ({say: n.say, note: n.note})), ...echo(words, beats, steps.flatMap((st, i) => (st.show ?? (st.focus ? [st.focus] : [])).map((id) => ({target: `chart.${id}`, text: label.get(id) ?? id, at: beats[i]?._pos ?? 0}))))]),
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
        const all = byPosition(words, [...(s.title ? [{say: [words[0]], title: s.title}] : []), ...beats.map((b) => ({...b, _pos: b._pos})), ...cellBeats, ...hl, ...notes.map((n) => ({say: n.say, note: n.note})), ...echoes]);
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

/* ------------------------------------------------------------------ illustration recipes */
/** Fit-to-frame stage around one library art (imported or drawn). */
const artStage = (s: any, beats: any[]) => ({
  type: 'stage',
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
    const beats: any[] = (s.notes ?? []).map((n: any) => ({say: n.say, note: n.note}));
    if (s.act && s.art) beats.unshift({say: [words[0]], _pos: 0, act: asList(s.act).map((a: string) => `art.${a}`)});
    return artStage(s, byPosition(words, beats));
  }
  return s;
}

/** The project's frame around every lesson: its logo intro first, its signoff outro last. */
export type Frame = {ident?: boolean; outro?: string | false; identSeconds?: number};
const framed = (scenes: any[], frame?: Frame) => {
  if (!frame) return scenes;
  const out = [...scenes];
  if (frame.ident && out[0]?.type !== 'ident') out.unshift({type: 'ident', kicker: 'Intro', seconds: frame.identSeconds ?? 3.2});
  if (frame.outro && out[out.length - 1]?.type !== 'outro') out.push({type: 'outro', kicker: 'Outro', transition: 'slide', narration: frame.outro});
  return out;
};

/** A spec with every shorthand scene compiled (idempotent: compiled scenes pass through), framed by the project's intro/outro. */
export const compileSpec = <T extends {scenes: any[]}>(spec: T, frame?: Frame): T => ({...spec, scenes: framed(spec.scenes, frame).map((x) => compileRecipe(compileScene(x)))});
