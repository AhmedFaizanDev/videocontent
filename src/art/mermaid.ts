/**
 * Mermaid flowchart syntax → the `graph` diagram's nodes and edges. Pure (no React/Remotion):
 * the catalog (validation) and the renderer (src/art/graph.tsx) both read charts through it.
 */
export type GNode = {id: string; label: string; shape?: 'box' | 'circle' | 'pill' | 'decision'; tone?: string; group?: string};
export type GEdge = {from: string; to: string; label?: string; tone?: string; dashed?: boolean};
export type GStep = {say?: string[]; show?: string[]; flow?: string[]; focus?: string; token?: string[]; loop?: boolean; note?: string; label?: string; cut?: string[]};
export type GData = {direction?: 'LR' | 'TB'; nodes: GNode[]; edges?: GEdge[]; groups?: {id: string; label: string}[]; steps?: GStep[]; mermaid?: string};

/* ------------------------------------------------------------------ Mermaid flowchart syntax */
const SHAPES: [RegExp, GNode['shape']][] = [
  [/^\(\((.*)\)\)$/, 'circle'],
  [/^\(\[(.*)\]\)$/, 'pill'],
  [/^\{\{(.*)\}\}$/, 'decision'],
  [/^\[(.*)\]$/, 'box'],
  [/^\((.*)\)$/, 'pill'],
  [/^\{(.*)\}$/, 'decision'],
];
const NODE = /^([A-Za-z_][\w-]*)\s*(\(\(.*?\)\)|\(\[.*?\]\)|\{\{.*?\}\}|\[.*?\]|\(.*?\)|\{.*?\})?(?::::(\w+))?/;
const EDGE = /^\s*(?:(-\.->|-\.-|==>|-->|---)|--\s+(.+?)\s+-->|-\.\s+(.+?)\s+\.->)\s*(?:\|([^|]*)\|)?\s*/;
const clean = (t: string) => t.replace(/^["']|["']$/g, '').replace(/<br\s*\/?>/gi, ' ').trim();

/** Mermaid flowchart text → nodes, edges, direction. Throws on anything it can't read (validate reports it). */
export function parseMermaid(src: string): Pick<GData, 'direction' | 'nodes' | 'edges'> {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  let direction: GData['direction'] = 'TB';
  const node = (id: string, raw?: string, cls?: string) => {
    const n = nodes.get(id) ?? {id, label: id};
    if (raw) for (const [re, shape] of SHAPES) {
      const m = re.exec(raw);
      if (m) {
        n.label = clean(m[1]);
        n.shape = shape;
        break;
      }
    }
    if (cls) n.tone = cls;
    nodes.set(id, n);
    return id;
  };
  // statements end at newlines, or at ';' outside brackets/quotes (labels may contain ';')
  const statements: string[] = [];
  let cur = '';
  let depth = 0;
  let quote = false;
  for (const ch of src) {
    if (ch === '"') quote = !quote;
    if (!quote && '([{'.includes(ch)) depth++;
    if (!quote && ')]}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === '\n' || (ch === ';' && depth === 0 && !quote)) {
      statements.push(cur);
      cur = '';
    } else cur += ch;
  }
  statements.push(cur);
  statements.forEach((line0, ln) => {
    const line = line0.replace(/%%.*$/, '').trim();
    if (!line) return;
    const head = /^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/i.exec(line);
    if (head) return void (direction = /LR|RL/i.test(head[1]) ? 'LR' : 'TB');
    const cls = /^class\s+([\w,\s-]+?)\s+(\w+)$/.exec(line);
    if (cls) return void cls[1].split(',').forEach((id) => node(id.trim(), undefined, cls[2]));
    if (/^(classDef|style|linkStyle|click|subgraph|end)\b/.test(line)) return;
    let rest = line;
    let m = NODE.exec(rest);
    if (!m) throw new Error(`mermaid line ${ln + 1}: can't read "${line}"`);
    let prev = node(m[1], m[2], m[3]);
    rest = rest.slice(m[0].length);
    while (rest.trim()) {
      const e = EDGE.exec(rest);
      if (!e) throw new Error(`mermaid line ${ln + 1}: expected an arrow in "${line}"`);
      rest = rest.slice(e[0].length);
      m = NODE.exec(rest);
      if (!m) throw new Error(`mermaid line ${ln + 1}: arrow without a target in "${line}"`);
      const to = node(m[1], m[2], m[3]);
      rest = rest.slice(m[0].length);
      const label = clean(e[4] ?? e[2] ?? e[3] ?? '');
      edges.push({from: prev, to, ...(label ? {label} : {}), ...(/\./.test(e[1] ?? (e[3] ? '.' : '')) ? {dashed: true} : {})});
      prev = to;
    }
  });
  return {direction, nodes: [...nodes.values()], edges};
}
/** The graph's data with any `mermaid` text expanded into nodes/edges (explicit fields win). */
export const graphData = (d: any): GData => {
  if (!d?.mermaid) return d;
  const g = parseMermaid(d.mermaid);
  return {...d, direction: d.direction ?? g.direction, nodes: d.nodes ?? g.nodes, edges: d.edges ?? g.edges};
};

