/**
 * What every art is and accepts — pure data, shared by the renderer (src/art/index.ts) and
 * the validator, so a figure's data and anchor names are checked before anything renders.
 *
 * Two families:
 *   diagrams — generic, data-driven (`data.items`); work for any subject. Anchors are
 *              i1…iN, and callouts are derived from the items unless the spec gives them.
 *   packs    — hand-drawn domain illustrations with fixed anchors (src/art/packs/*).
 */

import {GENERATED} from './catalog.gen.ts';
import {graphData} from './mermaid.ts';
import {VECTOR_MANIFESTS} from './vector/manifests.gen.ts';

export type Item = {label: string; note?: string; say?: string[]; when?: string};
export const TONE_NAMES = ['ink', 'blue', 'red', 'teal', 'green', 'sun', 'orange', 'pink'];
export type Callout = {anchor: string; label: string; text?: string; say?: string[]};

type Entry = {
  layout: 'side' | 'full';
  /** one line for the authoring guide */
  doc: string;
  anchors: (data: any) => string[];
  /** human-readable problems with `data` (empty = fine) */
  check: (data: any) => string[];
  /** callouts when the spec omits them */
  callouts?: (data: any) => Callout[];
  /** anchors that are EVENTS (something happens when acted), not places; the art gate proves each changes the picture */
  events?: string[];
};

/**
 * A generated pack's catalogue entry (src/art/packs/<pack>.catalog.ts, default export
 * {name: PartMeta}): plain data so art-authoring agents can add parts without touching this file.
 */
export type PartMeta = {layout?: 'side' | 'full'; doc: string; anchors: string[]; events?: string[]; data?: Record<string, string>};

const itemsCheck =
  (min: number, max: number, maxLabel: number, extra?: (data: any) => string[]) =>
  (data: any): string[] => {
    const items = data?.items;
    if (!Array.isArray(items)) return [`data.items must be an array of {label, note?, say?}`];
    const out: string[] = [];
    if (items.length < min || items.length > max) out.push(`needs ${min}–${max} items (has ${items.length})`);
    items.forEach((it: any, i: number) => {
      if (typeof it?.label !== 'string' || !it.label.trim()) out.push(`items[${i}].label missing`);
      else if (it.label.length > maxLabel) out.push(`items[${i}].label "${it.label}" is ${it.label.length} chars (max ${maxLabel})`);
      if (it.note !== undefined && (typeof it.note !== 'string' || it.note.length > 70)) out.push(`items[${i}].note must be a string ≤ 70 chars`);
    });
    return [...out, ...(extra?.(data) ?? [])];
  };
const itemAnchors = (data: any) => (Array.isArray(data?.items) ? data.items.map((_: unknown, i: number) => `i${i + 1}`) : []);
const itemCallouts = (data: any): Callout[] => (data?.items ?? []).map((it: Item, i: number) => ({anchor: `i${i + 1}`, label: it.label, text: it.note, say: it.say}));
const fixed = (names: string[]) => ({anchors: () => names, check: () => []});

export const CATALOG: Record<string, Entry> = {
  /* ---------------------------------------------------------------- generic diagrams */
  cycle: {
    layout: 'full',
    doc: 'Stages on a closed loop (a process that repeats). data: {items: 3–8 {label ≤26, note?}, start?: "PATIENT"}',
    anchors: itemAnchors,
    check: itemsCheck(3, 8, 26, (d) => (d.start !== undefined && (typeof d.start !== 'string' || d.start.length > 12) ? ['start must be a short tag (≤12 chars)'] : [])),
    callouts: itemCallouts,
  },
  flow: {
    layout: 'full',
    doc: 'A linear pipeline, left to right. data: {items: 2–6 {label ≤28, note?}}',
    anchors: itemAnchors,
    check: itemsCheck(2, 6, 28),
    callouts: itemCallouts,
  },
  timeline: {
    layout: 'full',
    doc: 'Events in time order. data: {items: 3–7 {when ≤12 (e.g. "1928", "Day 3"), label ≤30, note?}}',
    anchors: itemAnchors,
    check: itemsCheck(3, 7, 30, (d) => (d.items ?? []).flatMap((it: any, i: number) => (typeof it?.when === 'string' && it.when.length <= 12 ? [] : [`items[${i}].when must be a string ≤ 12 chars`]))),
    callouts: itemCallouts,
  },
  hub: {
    layout: 'full',
    doc: 'One central idea with 3–6 related parts. data: {center ≤22, items: 3–6 {label ≤22, note?}}',
    anchors: itemAnchors,
    check: itemsCheck(3, 6, 22, (d) => (typeof d?.center === 'string' && d.center.length <= 22 ? [] : ['center must be a string ≤ 22 chars'])),
    callouts: itemCallouts,
  },
  stack: {
    layout: 'full',
    doc: 'Layers, top to bottom (levels, strata, a protocol stack). data: {items: 2–6 {label ≤30, note?}}',
    anchors: itemAnchors,
    check: itemsCheck(2, 6, 30),
    callouts: itemCallouts,
  },
  image: {
    layout: 'side',
    doc: 'A photo/diagram file under public/ with labelled points. data: {src, credit, points: {name: [x 0–1, y 0–1]}}; callouts required (anchor = point name)',
    anchors: (d) => Object.keys(d?.points ?? {}),
    check: (d) => {
      const out: string[] = [];
      if (typeof d?.src !== 'string') out.push('data.src (path under public/) required');
      if (typeof d?.credit !== 'string' || !d.credit.trim()) out.push('data.credit required (source + licence — only use images you may publish)');
      for (const [k, v] of Object.entries(d?.points ?? {})) if (!Array.isArray(v) || v.length !== 2 || v.some((n: any) => typeof n !== 'number' || n < 0 || n > 1)) out.push(`points.${k} must be [x, y] fractions 0–1`);
      if (!Object.keys(d?.points ?? {}).length) out.push('data.points needs at least one point');
      return out;
    },
  },

  bars: {
    layout: 'full',
    doc: 'Quantities compared, growing as spoken with count-up values. data: {unit?, max?, ref?: {value, label}, items: 2–8 {label ≤24, value: number, display?, tone?, note?, say?}}',
    anchors: itemAnchors,
    check: itemsCheck(2, 8, 24, (d) => [
      ...(d.items ?? []).flatMap((it: any, i: number) => (typeof it?.value === 'number' && it.value >= 0 ? [] : [`items[${i}].value must be a number ≥ 0`])),
      ...(d.items ?? []).flatMap((it: any, i: number) => (it?.tone === undefined || TONE_NAMES.includes(it.tone) ? [] : [`items[${i}].tone must be one of ${TONE_NAMES.join(', ')}`])),
      ...(d.unit !== undefined && (typeof d.unit !== 'string' || d.unit.length > 8) ? ['unit must be ≤ 8 chars'] : []),
    ]),
    callouts: itemCallouts,
  },
  trace: {
    layout: 'full',
    doc: 'A waveform drawn by a moving pen (ECG, action potential, pressure/sound wave). data: {grid?, repeat? 1–4, segments: 2–24 {shape: flat|bump|spike|dip|plateau|rise|fall, w?, h? (−1…1.2), label? ≤10, note?, say?}}; labelled segments light up as spoken',
    anchors: (d) => (d?.segments ?? []).filter((s: any) => s?.label).map((_: unknown, i: number) => `i${i + 1}`),
    check: (d) => {
      const segs: any[] = Array.isArray(d?.segments) ? d.segments : [];
      const out: string[] = [];
      if (segs.length < 2 || segs.length > 24) out.push(`needs 2–24 segments (has ${segs.length})`);
      if (!segs.some((s) => s?.label)) out.push('label at least one segment (labels are what the narration reveals)');
      segs.forEach((s, i) => {
        if (s?.shape !== undefined && !['flat', 'bump', 'spike', 'dip', 'plateau', 'rise', 'fall'].includes(s.shape)) out.push(`segments[${i}].shape unknown`);
        if (s?.label !== undefined && (typeof s.label !== 'string' || s.label.length > 10)) out.push(`segments[${i}].label ≤ 10 chars`);
        if (s?.h !== undefined && (typeof s.h !== 'number' || s.h < -1 || s.h > 1.2)) out.push(`segments[${i}].h must be −1…1.2`);
      });
      return out;
    },
    callouts: (d) => (d?.segments ?? []).filter((s: any) => s?.label).map((s: any, i: number) => ({anchor: `i${i + 1}`, label: s.label, text: s.note, say: s.say})),
  },
  stat: {
    layout: 'full',
    doc: 'A NUMBER MADE VISIBLE: a large figure that counts up as spoken, with an icon array filling in proportion (people for ≤20, a 10×10 dot grid for 100). data: {value, of? (10|100…), display? ("9 in 10", "41%"), label? ≤48, tone? red|blue|teal|green|ink, unit? people|dots} · anchors: figure array · event: count',
    anchors: () => ['figure', 'array', 'count'],
    check: (d) => {
      const out: string[] = [];
      if (typeof d?.value !== 'number' || d.value < 0) out.push('value must be a number ≥ 0');
      if (d?.of !== undefined && (!Number.isInteger(d.of) || d.of < 2 || d.of > 100)) out.push('of must be an integer 2–100');
      if (d?.label !== undefined && (typeof d.label !== 'string' || d.label.length > 48)) out.push('label ≤ 48 chars');
      if (d?.display !== undefined && (typeof d.display !== 'string' || d.display.length > 12)) out.push('display ≤ 12 chars');
      return out;
    },
    events: ['count'],
  },
  table: {
    layout: 'full',
    doc: 'TABLES: a journal-style data table (booktabs rules), rows building in and highlighted as narrated — prefer it for any comparison, classification, list of values or parameters. data: {columns: 2–6 (≤40 chars), rows: 1–10 rows of cells (≤60 chars), align?: per column left|center|right (numeric columns default right), widths?: relative column widths, size?: font px (default 40), bars?: [column indexes] (numbers there get an inline bar; all numbers count up as their row arrives)} · anchors/events: r1…rN (row builds in + becomes current) c1…cM (column highlight) rIcJ (ring a cell) all (remaining rows build in)',
    anchors: (d) => {
      const rows: any[] = Array.isArray(d?.rows) ? d.rows : [];
      const cols: any[] = Array.isArray(d?.columns) ? d.columns : [];
      return ['all', ...rows.map((_, i) => `r${i + 1}`), ...cols.map((_, j) => `c${j + 1}`), ...rows.flatMap((_, i) => cols.map((__, j) => `r${i + 1}c${j + 1}`))];
    },
    check: (d) => {
      const out: string[] = [];
      const cols: any[] = Array.isArray(d?.columns) ? d.columns : [];
      const rows: any[] = Array.isArray(d?.rows) ? d.rows : [];
      if (cols.length < 2 || cols.length > 6) out.push(`needs 2–6 columns (has ${cols.length})`);
      if (rows.length < 1 || rows.length > 10) out.push(`needs 1–10 rows (has ${rows.length})`);
      // the corner header may be empty (row labels in the first column)
      cols.forEach((c, j) => (typeof c !== 'string' || (!c.trim() && j > 0) || c.length > 40) && out.push(`columns[${j}] must be a string ≤40 chars${j ? ', not empty' : ''}`));
      rows.forEach((r, i) => {
        if (!Array.isArray(r) || r.length !== cols.length) return void out.push(`rows[${i}] must have ${cols.length} cells`);
        r.forEach((c, j) => (typeof c !== 'string' || c.length > 60) && out.push(`rows[${i}][${j}] must be a string ≤60 chars`));
      });
      if (d?.align !== undefined && (!Array.isArray(d.align) || d.align.length !== cols.length || d.align.some((a: any) => !['left', 'center', 'right'].includes(a)))) out.push('align must list left|center|right per column');
      if (d?.bars !== undefined && (!Array.isArray(d.bars) || d.bars.some((j: any) => !Number.isInteger(j) || j < 0 || j >= cols.length))) out.push('bars must list column indexes (0-based)');
      if (d?.widths !== undefined && (!Array.isArray(d.widths) || d.widths.length !== cols.length || d.widths.some((w: any) => typeof w !== 'number' || w <= 0))) out.push('widths must list a positive number per column');
      return out;
    },
  },
  graph: {
    layout: 'full',
    doc: 'FLOWCHARTS and any system/process/algorithm/decision tree as nodes + edges, built up step by step as narrated (flows, travelling token, focus). Prefer writing the chart as Mermaid: data: {mermaid: "flowchart TD\\n A([Start]) --> B{Question?}\\n B -->|Yes| C[Action]:::red", steps}. Or explicitly: {direction?: LR|TB, nodes: 2–16 {id, label ≤40, shape?: box|circle|pill|decision, tone?, group?}, edges?: ≤24 {from, to, label?, tone?, dashed?}, groups?: [{id, label}]}. steps: 1–14 {say?, show?, flow?, focus?, token?, loop?, cut?, note?} (fired by stage act "<layer>.s1"…; anchors = node ids, s1…)',
    anchors: (d0) => {
      let d: any;
      try {
        d = graphData(d0);
      } catch {
        return [];
      }
      return [...(d?.nodes ?? []).map((n: any) => n.id), ...(d?.steps ?? []).map((_: unknown, i: number) => `s${i + 1}`)];
    },
    check: (d0) => {
      const out: string[] = [];
      let d: any;
      try {
        d = graphData(d0);
      } catch (e) {
        return [(e as Error).message];
      }
      const nodes: any[] = Array.isArray(d?.nodes) ? d.nodes : [];
      const edges: any[] = Array.isArray(d?.edges) ? d.edges : [];
      const steps: any[] = Array.isArray(d?.steps) ? d.steps : [];
      if (nodes.length < 2 || nodes.length > 16) out.push(`needs 2–16 nodes (has ${nodes.length})`);
      if (edges.length > 24) out.push(`max 24 edges (has ${edges.length})`);
      if (steps.length < 1 || steps.length > 14) out.push(`needs 1–14 steps (has ${steps.length})`);
      if (d?.direction !== undefined && !['LR', 'TB'].includes(d.direction)) out.push('direction must be LR or TB');
      const ids = new Set<string>();
      nodes.forEach((n, i) => {
        if (typeof n?.id !== 'string' || !/^[\w-]+$/.test(n.id)) out.push(`nodes[${i}].id must be a word`);
        else if (ids.has(n.id)) out.push(`duplicate node id "${n.id}"`);
        else ids.add(n.id);
        if (typeof n?.label !== 'string' || !n.label) out.push(`nodes[${i}].label missing`);
        else if (n.label.length > 40) out.push(`nodes[${i}].label is ${n.label.length} chars (max 40)`);
        if (n.shape !== undefined && !['box', 'circle', 'pill', 'decision'].includes(n.shape)) out.push(`nodes[${i}].shape must be box|circle|pill|decision`);
        if (n.tone !== undefined && !TONE_NAMES.includes(n.tone)) out.push(`nodes[${i}].tone must be one of ${TONE_NAMES.join(', ')}`);
        if (n.group !== undefined && !(d.groups ?? []).some((g: any) => g.id === n.group)) out.push(`nodes[${i}].group "${n.group}" not in groups`);
      });
      const eids = new Set<string>();
      edges.forEach((e, i) => {
        if (!ids.has(e?.from) || !ids.has(e?.to)) out.push(`edges[${i}] ${e?.from}>${e?.to}: unknown node`);
        eids.add(`${e?.from}>${e?.to}`);
        if (e.label && e.label.length > 22) out.push(`edges[${i}].label max 22 chars`);
        if (e.tone !== undefined && !TONE_NAMES.includes(e.tone)) out.push(`edges[${i}].tone must be one of ${TONE_NAMES.join(', ')}`);
      });
      steps.forEach((s, i) => {
        for (const x of s?.show ?? []) if (!ids.has(x) && !eids.has(x)) out.push(`steps[${i}].show "${x}" is neither a node id nor an edge "from>to"`);
        for (const x of s?.flow ?? []) if (!eids.has(x)) out.push(`steps[${i}].flow "${x}" is not an edge "from>to"`);
        for (const x of s?.cut ?? []) if (!eids.has(x)) out.push(`steps[${i}].cut "${x}" is not an edge "from>to"`);
        if (s?.focus !== undefined && !ids.has(s.focus)) out.push(`steps[${i}].focus "${s.focus}" unknown`);
        const tok: string[] = s?.token ?? [];
        tok.forEach((x, j) => {
          if (!ids.has(x)) out.push(`steps[${i}].token "${x}" unknown`);
          if (j && !eids.has(`${tok[j - 1]}>${x}`) && !eids.has(`${x}>${tok[j - 1]}`)) out.push(`steps[${i}].token hop ${tok[j - 1]}→${x} has no edge`);
        });
        if (s?.note !== undefined && (typeof s.note !== 'string' || s.note.length > 80)) out.push(`steps[${i}].note must be ≤ 80 chars`);
        if (!s?.say && !s?.focus && !(s?.show ?? []).some((x: string) => ids.has(x)) && !s?.label) out.push(`steps[${i}] needs say, focus, label or a shown node (to know when it is spoken)`);
      });
      return out;
    },
    callouts: (d) =>
      (d?.steps ?? []).map((s: any, i: number) => {
        const node = (id?: string) => (d.nodes ?? []).find((n: any) => n.id === id);
        const first = (s.show ?? []).map(node).find(Boolean);
        return {anchor: `s${i + 1}`, label: s.label ?? node(s.focus)?.label ?? first?.label ?? `Step ${i + 1}`, text: s.note, say: s.say};
      }),
  },

  /* ---------------------------------------------------------------- pack: endoscopy */
  scope: {layout: 'side', doc: 'Flexible endoscope, whole instrument', ...fixed(['controlHead', 'valves', 'biopsyPort', 'insertionTube', 'distalTip', 'connector', 'channels'])},
  channels: {layout: 'side', doc: 'Insertion-tube cross-section', ...fixed(['suction', 'air', 'water', 'light', 'ccd', 'wires', 'sheath'])},
  biofilm: {layout: 'side', doc: 'Channel wall: soil → bacteria → biofilm; disinfectant/flow/brush events', ...fixed(['wall', 'soil', 'bacteria', 'matrix', 'disinfectant', 'flow', 'brush'])},
  leaktest: {layout: 'side', doc: 'Leak tester, gauge, breach and bubbles', ...fixed(['tester', 'gauge', 'sheath', 'breach', 'bubbles', 'connector'])},
  elevator: {layout: 'side', doc: 'Duodenoscope distal tip with elevator and recess', ...fixed(['tip', 'lens', 'elevator', 'accessory', 'recess'])},
  drying: {layout: 'side', doc: 'Alcohol/air drying, coiled vs cabinet storage', ...fixed(['alcohol', 'air', 'moisture', 'coiled', 'cabinet'])},
  aer: {layout: 'side', doc: 'Automated endoscope reprocessor, connectors, cycle record', ...fixed(['reprocessor', 'connectors', 'missing', 'record'])},
};

// pack: heart (src/art/packs/heart.tsx) — anchors mirror HEART_ANCHORS there
CATALOG.heart = {
  layout: 'side',
  doc: 'Human heart, frontal section, beating. Anatomy: ra rv la lv septum apex svc ivc aorta trunk pv · valves: tricuspid pulmonary mitral aortic chordae · events: flowRight flowLeft (blood routes) · conduction: sa av his branches purkinje (wave grows as named). data: {bpm?, beat?}',
  anchors: () => ['ra', 'rv', 'la', 'lv', 'septum', 'apex', 'svc', 'ivc', 'aorta', 'trunk', 'pv', 'tricuspid', 'pulmonary', 'mitral', 'aortic', 'chordae', 'sa', 'av', 'his', 'branches', 'purkinje', 'flowRight', 'flowLeft'],
  check: (d) => (d?.bpm !== undefined && (typeof d.bpm !== 'number' || d.bpm < 40 || d.bpm > 120) ? ['bpm must be 40–120'] : []),
};

// pack: circulation (src/art/packs/circulation.tsx)
CATALOG.artery = {layout: 'side', doc: 'Cut-open artery: blood flows, each beat sends a pressure wave stretching the wall; a gauge follows it. anchors: heart wall blood gauge · events: systole diastole (gauge marks peak / floor). data {bpm?}', ...fixed(['heart', 'wall', 'blood', 'gauge', 'systole', 'diastole'])};
CATALOG.bpmonitor = {layout: 'side', doc: 'Upper arm in a cuff + digital monitor counting up to the reading. anchors: cuff artery monitor sys dia unit. data {sys?: 120, dia?: 80, sysLabel?, diaLabel?, unit?}', ...fixed(['cuff', 'artery', 'monitor', 'sys', 'dia', 'unit'])};
CATALOG.bpscale = {layout: 'side', doc: 'Colour scale of blood-pressure bands; a pin moves to each band as it is named. anchors: low ideal raised high. data {marks?: ["90/60","120/80","140/90"]}', ...fixed(['low', 'ideal', 'raised', 'high'])};

// pack: metabolic (src/art/packs/metabolic.tsx)
CATALOG.insulin = {layout: 'side', doc: 'Pancreas, blood vessel with glucose, body cell. anchors: pancreas glucose insulin receptor uptake cell · events: glucose (sugar rises) insulin (keys leave pancreas) receptor (keys dock) uptake (gates open, glucose enters as energy) type1 (no insulin, sugar piles up) type2 (keys dock, locks don\'t respond)', ...fixed(['pancreas', 'glucose', 'insulin', 'receptor', 'uptake', 'cell', 'type1', 'type2'])};
// pack: respiratory (src/art/packs/respiratory.tsx)
CATALOG.lungs = {layout: 'side', doc: 'Airway, lungs and diaphragm, breathing. anchors: trachea bronchi lungs diaphragm alveoli · events: inhale (diaphragm flattens, lungs expand, air in) exhale (diaphragm domes, air out; then keeps breathing)', ...fixed(['trachea', 'bronchi', 'lungs', 'diaphragm', 'alveoli', 'inhale', 'exhale'])};
CATALOG.alveolus = {layout: 'side', doc: 'One air sac wrapped by a capillary; red cells arrive blue, leave red. anchors: alveolus capillary wall rbc · events: oxygen (O₂ into blood) co2 (CO₂ out to the sac)', ...fixed(['alveolus', 'capillary', 'wall', 'rbc', 'oxygen', 'co2'])};
// pack: infection (src/art/packs/infection.tsx)
CATALOG.moments = {layout: 'side', doc: 'Patient bed in the dashed patient zone; WHO five moments light up in place. anchors: zone patient m1 (before touching patient) m2 (before clean/aseptic procedure) m3 (after body-fluid exposure risk) m4 (after touching patient) m5 (after touching surroundings)', ...fixed(['zone', 'patient', 'm1', 'm2', 'm3', 'm4', 'm5'])};
CATALOG.hand = {layout: 'side', doc: 'Hand (palm view) with germs; each rubbing step clears its area. anchors: germs palms between thumbs tips missed clean (missed pulses the areas most often missed; clean = all gone)', ...fixed(['germs', 'palms', 'between', 'thumbs', 'tips', 'missed', 'clean'])};

// pack: body (src/art/packs/body.tsx) — generic people, organs and everyday objects, mostly used as stage layers
export const ICON_NAMES = ['salt', 'vegetables', 'fruit', 'walk', 'cigarette', 'alcohol', 'calendar', 'scale', 'pill', 'water', 'sleep', 'stethoscope'];
CATALOG.person = {layout: 'side', doc: 'A friendly standing person (breathes, blinks). anchors: head face chest heart arm hand feet · events: wave worry smile. data {shirt?, shirtDark?, skin?, skinDark?, hair?, stethoscope?: true}', ...fixed(['head', 'face', 'chest', 'heart', 'arm', 'hand', 'feet', 'wave', 'worry', 'smile']), events: ['wave', 'worry', 'smile']};
CATALOG.body = {layout: 'side', doc: 'Body map with brain, heart, kidneys and the arterial tree in place; blood streams. anchors: brain heart kidneys kidneyL kidneyR arteries arm leg head chest · events: brain heart kidneys (organ hurt: turns red, pulses) strain (arteries swell, heart pounds) flow', ...fixed(['brain', 'heart', 'kidneys', 'kidneyL', 'kidneyR', 'arteries', 'arm', 'leg', 'head', 'chest', 'strain', 'flow']), events: ['brain', 'heart', 'kidneys', 'strain']};
CATALOG.vessel = {layout: 'side', doc: 'Artery in cross-section: wall layers, lumen, red cells. anchors: wall lumen blood lining outer · events: push (force arrows press outward each beat) stretch (wall stretches and recoils) stiff (wall thickens, lumen narrows) tear (lining damaged, fatty patches)', ...fixed(['wall', 'lumen', 'blood', 'lining', 'outer', 'push', 'stretch', 'stiff', 'tear']), events: ['push', 'stiff', 'tear']};
CATALOG.gauge = {layout: 'side', doc: 'Pressure dial, green → amber → red, no numbers. anchors: dial needle low ok high · events: rise (needle climbs into the red) ok (settles in the green). data {start?: 0–1}', ...fixed(['dial', 'needle', 'low', 'ok', 'high', 'rise']), events: ['rise']};
CATALOG.icon = {
  layout: 'side',
  doc: `An everyday object. data {name: ${ICON_NAMES.join(' | ')}} · anchors: item · event: act (salt pours, vegetables bounce, the walker strides, smoke curls, both calendar days tick…)`,
  anchors: () => ['item', 'act'],
  check: (d) => (ICON_NAMES.includes(d?.name) ? [] : [`data.name must be one of ${ICON_NAMES.join(', ')}`]),
  events: ['act'],
};

// generated packs (scripts/art.mts register): each src/art/packs/<pack>.catalog.ts
export const entryOf = (m: PartMeta): Entry => ({layout: m.layout ?? 'side', doc: m.doc, ...fixed(m.anchors), events: m.events ?? []});
for (const [name, m] of Object.entries(GENERATED)) CATALOG[name] = entryOf(m);
// imported vector assets: their manifests are the catalogue entries
for (const v of Object.values(VECTOR_MANIFESTS) as any[]) {
  const events = [...(v.motion?.cardiac ? ['vf', 'stop', 'compress', 'rosc'] : []), ...(v.motion?.highlight ?? []), ...(v.signals ?? []).map((x: any) => x.event), ...(v.regions ?? []).map((x: any) => x.event)];
  CATALOG[v.key] = entryOf({layout: 'side', doc: v.doc, anchors: [...Object.keys(v.anchors), ...events.filter((e) => !(e in v.anchors))], events});
}

/** Callouts for a figure: the spec's own, else derived from diagram items. */
export const calloutsFor = (art: string, data: any, own?: Callout[]): Callout[] => own ?? CATALOG[art]?.callouts?.(data) ?? [];
