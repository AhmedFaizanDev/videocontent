/**
 * Vector asset importer: any licensed or public-domain SVG (Illustrator/Inkscape export)
 * becomes animatable library art, from one small manifest — no hand-drawing, no per-lesson work.
 *
 *   node scripts/ingest-art.mts                 every assets/vector/<dir>/ with a manifest.json
 *   node scripts/ingest-art.mts <dir>           one asset
 *   node scripts/ingest-art.mts <dir> --parts   list the parts (index, id, bbox hint, fills) to write a manifest
 *
 * assets/vector/<dir>/ holds `source.svg` (the original, untouched apart from namespace prefixes)
 * and `manifest.json`:
 *   {
 *     "key": "heartExterior",               // the art name specs use
 *     "licence": "Public Domain", "credit": "…", "source": "https://…",
 *     "doc": "what it shows (for the catalogue)",
 *     "layers": [{"id": "ventricles", "parts": [3, 4, "#top_vessels", "top:0"], "role": "ventricles"}, …],
 *     "motion": {…}, "anchors": {"aorta": [x, y], …}, "flows": [{"path": [[x,y],…cubic points], "tone": "artery"}]
 *   }
 * Part refs: a number = the nth child of the drawing's main (last top-level) group; "#id" = an
 * element by id; "top:N" = the nth top-level group. Everything is in source-SVG units.
 *
 * Output: src/art/vector/<key>.gen.ts (cleaned defs + one markup string per layer, ids and CSS
 * classes prefixed so several assets can share a frame) and src/art/vector/index.gen.ts.
 * The generic renderer is src/art/vector.tsx; credits are collected for the video's end card.
 */
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

const ASSETS = join(ROOT, 'assets', 'vector');
const OUT = join(ROOT, 'src', 'art', 'vector');

type El = {start: number; end: number; tag: string; id?: string};

/** Top-level elements of the root <svg>, and the children of its last top-level <g>. */
function outline(svg: string) {
  const re = /<(\/?)([\w:-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  const stack: {tag: string; start: number; depth: number; id?: string}[] = [];
  const top: El[] = [];
  const kids = new Map<number, El[]>(); // index in `top` → its children
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const [all, close, tag, attrs, self] = m;
    if (close) {
      const open = stack.pop()!;
      const el: El = {start: open.start, end: m.index + all.length, tag: open.tag, id: open.id};
      if (open.depth === 0) top.push(el);
      if (open.depth === 1) {
        const parent = top.length; // the depth-1 element still open
        kids.set(parent, [...(kids.get(parent) ?? []), el]);
      }
      continue;
    }
    const id = /\bid="([^"]*)"/.exec(attrs)?.[1];
    const depth = stack.length;
    if (self) {
      const el: El = {start: m.index, end: m.index + all.length, tag, id};
      if (depth === 0) top.push(el);
      if (depth === 1) kids.set(top.length, [...(kids.get(top.length) ?? []), el]);
      continue;
    }
    stack.push({tag, start: m.index, depth, id});
  }
  return {top, kids};
}

function ingest(dir: string, listParts: boolean) {
  const base = join(ASSETS, dir);
  const manifest = JSON.parse(readFileSync(join(base, 'manifest.json'), 'utf8'));
  const key: string = manifest.key;
  let svg = readFileSync(join(base, 'source.svg'), 'utf8').replace(/\r/g, '');
  // clean: one namespace, plain href (SVG2), no metadata/comments, no text (art is text-free: labels are the lesson's)
  svg = svg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/\b(?:ns\d+|xlink):href=/g, 'href=')
    .replace(/<text[\s\S]*?<\/text>/g, '');
  // sanitise at the trust boundary: the markup is embedded in the render, so nothing executable
  // or external survives — no scripts, no event handlers, no foreignObject, only local/data links
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href|src)\s*=\s*"(?!#|data:image\/(?:png|jpeg|gif|webp);base64,)[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
  if (/<script|javascript:|\son\w+=/i.test(svg)) throw new Error(`${dir}: source.svg still has executable content after sanitising — refusing`);
  const vb = /viewBox="([^"]*)"/.exec(svg)![1].split(/[\s,]+/).map(Number);
  // prefix ids and classes so several assets (or two copies of one) never collide
  const P = key;
  svg = svg
    .replace(/\bid="([^"]+)"/g, `id="${P}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${P}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${P}-$1"`)
    .replace(/\.cls-(\d+)/g, `.${P}-cls-$1`)
    .replace(/class="([^"]*)"/g, (_, c: string) => `class="${c.replace(/\bcls-(\d+)/g, `${P}-cls-$1`)}"`);
  const rootOpen = /<svg\b[^>]*>/.exec(svg)!;
  const inner = svg.slice(rootOpen.index + rootOpen[0].length, svg.lastIndexOf('</svg>'));
  const {top, kids} = outline(inner);
  const groups = top.map((t, i) => ({...t, i})).filter((t) => t.tag === 'g');
  const main = groups[groups.length - 1];
  const parts = kids.get(main.i) ?? [];
  const defs = top.filter((t) => t.tag === 'defs').map((t) => inner.slice(t.start, t.end)).join('');
  if (listParts) {
    console.log(`${key}: viewBox ${vb.join(' ')} · ${groups.length} top-level groups · main group has ${parts.length} parts`);
    parts.forEach((p, i) => {
      const s = inner.slice(p.start, p.end);
      const fills = [...new Set([...s.matchAll(/fill(?::\s*|=")(#[0-9a-f]{3,6})/gi)].map((x) => x[1]))].slice(0, 3);
      const cls = [...new Set([...s.matchAll(/class="([^"]*)"/g)].map((x) => x[1]))].slice(0, 2);
      console.log(`  ${String(i).padStart(2)} <${p.tag}>${p.id ? ` #${p.id}` : ''} ${s.length} chars ${fills.join(' ')} ${cls.join(' ')}`);
    });
    return;
  }
  const byRef = (ref: number | string): string => {
    if (typeof ref === 'number') {
      if (!parts[ref]) throw new Error(`${key}: no part ${ref} (main group has ${parts.length})`);
      return inner.slice(parts[ref].start, parts[ref].end);
    }
    if (ref.startsWith('top:')) return inner.slice(groups[+ref.slice(4)].start, groups[+ref.slice(4)].end);
    const id = `${P}-${ref.slice(1)}`;
    const el = [...top, ...parts].find((e) => e.id === id);
    if (!el) throw new Error(`${key}: no element ${ref}`);
    return inner.slice(el.start, el.end);
  };
  const used = new Set<string>();
  const layers = (manifest.layers as {id: string; parts: (number | string)[]}[]).map((l) => {
    for (const r of l.parts) {
      if (used.has(String(r))) throw new Error(`${key}: part ${r} is in two layers`);
      used.add(String(r));
    }
    return {id: l.id, markup: l.parts.map(byRef).join('')};
  });
  // a part left out of every layer is dropped (deliberately, e.g. a stray background) — report it
  const unused = parts.map((_, i) => i).filter((i) => !used.has(String(i)) && !(parts[i].id && used.has(`#${parts[i].id.slice(P.length + 1)}`)));
  if (unused.length) console.log(`  ${key}: main-group parts not in any layer (dropped): ${unused.join(', ')}`);
  mkdirSync(OUT, {recursive: true});
  writeFileSync(
    join(OUT, `${key}.gen.ts`),
    `// generated by scripts/ingest-art.mts from assets/vector/${dir}/ — do not edit\n` +
      `export default ${JSON.stringify({key, vb, defs, layers})};\n`,
  );
  console.log(`✅ ${key}: ${layers.length} layers, ${Math.round((defs.length + layers.reduce((n, l) => n + l.markup.length, 0)) / 1024)} KB → src/art/vector/${key}.gen.ts`);
}

const args = process.argv.slice(2);
const dirs = args.filter((a) => !a.startsWith('--'));
const all = readdirSync(ASSETS).filter((d) => existsSync(join(ASSETS, d, 'manifest.json')));
for (const d of dirs.length ? dirs : all) ingest(d, args.includes('--parts'));
if (!args.includes('--parts')) {
  // the registry: every ingested asset with its manifest
  const keys = all.map((d) => ({d, key: JSON.parse(readFileSync(join(ASSETS, d, 'manifest.json'), 'utf8')).key as string}));
  writeFileSync(
    join(OUT, 'index.gen.ts'),
    `// generated by scripts/ingest-art.mts — do not edit\n` +
      keys.map(({d, key}) => `import ${key} from './${key}.gen';\nimport ${key}M from '../../../assets/vector/${d}/manifest.json';`).join('\n') +
      `\nexport const VECTOR_ASSETS = {${keys.map(({key}) => `${key}: {asset: ${key}, manifest: ${key}M}`).join(', ')}};\n`,
  );
  // manifests alone (small, pure) for the catalogue and validation in Node
  writeFileSync(
    join(OUT, 'manifests.gen.ts'),
    `// generated by scripts/ingest-art.mts — do not edit\nexport const VECTOR_MANIFESTS: Record<string, any> = ${JSON.stringify(Object.fromEntries(keys.map(({d, key}) => [key, JSON.parse(readFileSync(join(ASSETS, d, 'manifest.json'), 'utf8'))])), null, 1)};\n`,
  );
}
