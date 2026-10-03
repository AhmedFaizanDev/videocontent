/**
 * Asset-first sourcing (house rule, owner 2026-10-03): before drawing any medical illustration,
 * search authoritative reusable sources; code-draw only when nothing suitable exists.
 *
 *   node scripts/find-assets.mts "<query>"            search NIH BioArt (public domain, professional
 *                                                      vectors) and Wikimedia Commons (SVG, licences read
 *                                                      from file metadata) → ranked list + report
 *   node scripts/find-assets.mts --get bioart:<id> <dir>     download that BioArt entry's SVG into
 *   node scripts/find-assets.mts --get commons:<File:Name.svg> <dir>   assets/vector/<dir>/source.svg
 *   node scripts/find-assets.mts --get servier:<slug> <dir>             with licence.json (source, licence, credit)
 *   node scripts/find-assets.mts --get url:<https://…svg|png|jpg> <dir> --licence "…" --credit "…"
 *   node scripts/find-assets.mts --wrap <local.png|jpg|svg> <dir> --licence "…" --credit "…"
 *   add --auto to any --get/--wrap: write a starter manifest (one layer; anchors from the drawing's
 *   own labelled parts, measured in the browser) and ingest it — usable library art in one command
 *   node scripts/find-assets.mts --index "<query>"     search the local index of every hit seen so far
 *                                                      (assets/index.json) — no network
 * Raster images (Servier Medical Art is PNG) are wrapped in an SVG (downscaled, embedded), so the
 * same renderer, camera, labels and highlights work on them.
 * Hand-tune the manifest afterwards for motion (`node scripts/ingest-art.mts <dir> --parts`).
 *
 * Licence ranking: public domain / CC0 (use freely) > CC BY (credit in the course documentation,
 * scripts/credits.mts — never in the video, owner 2026-10-04) > CC BY-SA / GFDL (share-alike —
 * avoid for client work) > anything else (excluded).
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {extname, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openBrowser} from '@remotion/renderer';
import {ROOT} from './lib/paths.mts';

type Hit = {source: 'bioart' | 'commons' | 'servier'; id: string; title: string; licence: string; rank: number; url: string; thumb?: string; credit?: string};
const rankOf = (lic: string) => (/public domain|pd|cc0/i.test(lic) ? 0 : /by-sa|gfdl|share/i.test(lic) ? 2 : /cc[ -]by/i.test(lic) ? 1 : 9);

async function commons(q: string): Promise<Hit[]> {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: `${q} filetype:drawing`, gsrlimit: '20', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '400'}).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, {headers: {'User-Agent': 'medskills-video-pipeline/1.0 (asset research)'}});
  const j: any = await r.json();
  return Object.values(j.query?.pages ?? {})
    .map((p: any) => {
      const ii = p.imageinfo?.[0];
      const m = ii?.extmetadata ?? {};
      const lic = m.LicenseShortName?.value ?? 'unknown';
      return {source: 'commons' as const, id: p.title, title: p.title.replace(/^File:/, ''), licence: lic, rank: rankOf(lic), url: ii?.descriptionurl, thumb: ii?.thumburl, credit: (m.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim()};
    })
    .filter((h) => h.rank < 9);
}

const UA = {'User-Agent': 'Mozilla/5.0 (medskills-video-pipeline asset research)'};
async function servier(q: string): Promise<Hit[]> {
  const html = await (await fetch(`https://smart.servier.com/?s=${encodeURIComponent(q)}`, {headers: UA})).text();
  // result cards link their image several times; the page's other image links appear once
  const n = new Map<string, number>();
  for (const m of html.matchAll(/smart\.servier\.com\/smart_image\/([a-z0-9-]+)\//g)) n.set(m[1], (n.get(m[1]) ?? 0) + 1);
  return [...n].filter(([, c]) => c >= 2).map(([sl]) => sl)
    .map((sl) => ({source: 'servier' as const, id: sl, title: sl.replace(/-/g, ' '), licence: 'CC BY 4.0', rank: 1, url: `https://smart.servier.com/smart_image/${sl}/`, credit: 'Servier Medical Art (smart.servier.com), CC BY 4.0'}));
}

async function getServier(slug: string, dir: string, auto: boolean) {
  const url = `https://smart.servier.com/smart_image/${slug}/`;
  const html = await (await fetch(url, {headers: UA})).text();
  // the full-size image: the upload without a -WxH size suffix
  const img = [...html.matchAll(/https:\/\/smart\.servier\.com\/wp-content\/uploads\/[^"' ]+?\.(?:png|jpg)/g)].map((m) => m[0]).find((u) => !/-\d+x\d+\.(png|jpg)$/.test(u));
  if (!img) throw new Error(`servier:${slug}: no full-size image on ${url}`);
  const file = join(ROOT, 'iterations', 'assets', `${slug}${extname(img)}`);
  mkdirSync(join(ROOT, 'iterations', 'assets'), {recursive: true});
  writeFileSync(file, Buffer.from(await (await fetch(img, {headers: UA})).arrayBuffer()));
  return wrap(file, dir, {source: url, licence: 'CC BY 4.0', credit: `${slug.replace(/-/g, ' ')} — Servier Medical Art (smart.servier.com), CC BY 4.0`}, auto);
}

/** A local image or SVG → assets/vector/<dir>/source.svg; rasters are downscaled and embedded. */
async function wrap(file: string, dir: string, meta: {source: string; licence: string; credit: string}, auto: boolean) {
  if (/\.svg$/i.test(file)) return save(dir, readFileSync(file, 'utf8'), meta, auto);
  const tmp = join(ROOT, 'iterations', 'assets', `wrap-${dir}.png`);
  mkdirSync(join(ROOT, 'iterations', 'assets'), {recursive: true});
  // ≤ 1600 px on the long side: sharp at full-frame size, small enough to embed
  execFileSync('sips', ['-s', 'format', 'png', '-Z', '1600', file, '--out', tmp], {stdio: 'ignore'});
  const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', tmp], {encoding: 'utf8'});
  const w = +/pixelWidth: (\d+)/.exec(dims)![1];
  const h = +/pixelHeight: (\d+)/.exec(dims)![1];
  const b64 = readFileSync(tmp).toString('base64');
  // a margin round the picture: library art never touches its plate's edge
  const m = Math.round(Math.max(w, h) * 0.06);
  return save(dir, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${w + 2 * m} ${h + 2 * m}"><g id="drawing"><image href="data:image/png;base64,${b64}" x="0" y="0" width="${w}" height="${h}"/></g></svg>`, meta, auto);
}

async function withPage<T>(fn: (page: any) => Promise<T>): Promise<T> {
  const b = await openBrowser('chrome');
  const page = await (b as any).newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  try {
    return await fn(page);
  } finally {
    await b.close({silent: true});
  }
}

async function bioart(q: string): Promise<Hit[]> {
  return withPage(async (page) => {
    await page.goto({url: `https://bioart.niaid.nih.gov/discover?q=${encodeURIComponent(q)}`, timeout: 60000});
    await new Promise((r) => setTimeout(r, 6000));
    const items: {id: string; title: string}[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href*="/bioart/"]')).map((a: any) => ({id: a.getAttribute('href').split('/').pop(), title: (() => {
          // the card's lines: title, "N colors available", collection, BIOART-id — take the title
          let el: any = a;
          for (let k = 0; k < 4 && el && !/BIOART-/.test(el.innerText || ''); k++) el = el.parentElement;
          const lines = String(el?.innerText || '').split('\n').map((x: string) => x.trim()).filter(Boolean);
          const alt = el?.querySelector?.('img[alt]')?.getAttribute('alt') ?? '';
          return (alt || lines.find((x: string) => !/colors? available|^BIOART-|^NIAID|Reference Atlas/i.test(x)) || '').slice(0, 80);
        })()})),
    );
    const seen = new Set<string>();
    return items
      .filter((i) => /^\d+$/.test(i.id) && !seen.has(i.id) && seen.add(i.id))
      .map((i) => ({source: 'bioart' as const, id: i.id, title: i.title || `BioArt ${i.id}`, licence: 'Public Domain (check entry)', rank: 0, url: `https://bioart.niaid.nih.gov/bioart/${i.id}`, credit: 'NIAID NIH BioArt Source'}));
  });
}

async function getBioart(id: string, dir: string) {
  // the entry page shows preview images (file ids); each representation's SVG sits just after its preview
  const {ids, licence, title, creator} = await withPage(async (page) => {
    await page.goto({url: `https://bioart.niaid.nih.gov/bioart/${id}`, timeout: 60000});
    await new Promise((r) => setTimeout(r, 5000));
    return page.evaluate(() => {
      const text = document.body.innerText;
      const ids = Array.from(new Set(Array.from(document.querySelectorAll('img')).map((i: any) => /\/files\/(\d+)/.exec(i.src)?.[1]).filter(Boolean)));
      return {ids, licence: /Licensing:\s*([^\n]+)/.exec(text)?.[1] ?? 'unknown', title: document.querySelector('h1')?.textContent ?? '', creator: /CREATOR\s*\n\s*([^\n]+)/.exec(text)?.[1] ?? ''};
    });
  });
  if (process.env.DEBUG) console.log({ids, licence, title});
  const auto = process.argv.includes('--auto');
  for (const pid of (ids as string[]).map(Number))
    for (let k = 1; k <= 3; k++) {
      const r = await fetch(`https://bioart.niaid.nih.gov/api/bioarts/${id}/files/${pid + k}`);
      if (!r.ok) continue;
      const t = await r.text();
      if (/<(?:\w+:)?svg[\s>]/.test(t) && /Multicolor|#[0-9a-f]{6}/i.test(t)) return save(dir, t, {source: `https://bioart.niaid.nih.gov/bioart/${id}`, licence, credit: `${title} — NIAID NIH BioArt Source (bioart.niaid.nih.gov/bioart/${id})${creator ? `, ${creator}` : ''}`}, auto);
    }
  throw new Error(`no colour SVG found for BioArt ${id}`);
}

async function getCommons(file: string, dir: string) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action: 'query', format: 'json', titles: file, prop: 'imageinfo', iiprop: 'url|extmetadata|mime'}).forEach(([k, v]) => u.searchParams.set(k, v));
  const j: any = await (await fetch(u, {headers: {'User-Agent': 'medskills-video-pipeline/1.0'}})).json();
  const ii: any = (Object.values(j.query.pages)[0] as any).imageinfo[0];
  const lic = ii.extmetadata?.LicenseShortName?.value ?? 'unknown';
  if (rankOf(lic) >= 2) throw new Error(`${file}: licence "${lic}" is share-alike or unknown — not imported (house rule)`);
  const svg = await (await fetch(ii.url, {headers: {'User-Agent': 'medskills-video-pipeline/1.0'}})).text();
  return save(dir, svg, {source: ii.descriptionurl, licence: lic, credit: `${file.replace(/^File:/, '')} — ${(ii.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim()}, Wikimedia Commons, ${lic}`}, process.argv.includes('--auto'));
}

async function save(dir: string, svg: string, meta: {source: string; licence: string; credit: string}, auto = false) {
  const base = join(ROOT, 'assets', 'vector', dir);
  mkdirSync(base, {recursive: true});
  writeFileSync(join(base, 'source.svg'), svg.replace(/\bns\d+:(?=\w)/g, '').replace(/xmlns:ns\d+=/g, 'xmlns:x='));
  writeFileSync(join(base, 'licence.json'), JSON.stringify({...meta, fetched: new Date().toISOString().slice(0, 10)}, null, 2) + '\n');
  console.log(`✅ assets/vector/${dir}/source.svg (${Math.round(svg.length / 1024)} KB) · ${meta.licence}\n   credit: ${meta.credit}\n   next: write manifest.json (node scripts/ingest-art.mts ${dir} --parts), then node scripts/ingest-art.mts ${dir}`);
  if (auto) await autoManifest(dir, meta);
}

/**
 * A starter manifest, so a new subject's art is usable at once: the whole drawing as one layer,
 * anchors at the centres of the drawing's own labelled parts (Inkscape labels, titles, meaningful
 * ids — measured in the browser), the doc from the title. Then ingest.
 */
export async function autoManifest(dir: string, meta: {credit: string; licence: string; source: string}) {
  const base = join(ROOT, 'assets', 'vector', dir);
  let svg = readFileSync(join(base, 'source.svg'), 'utf8');
  // drawables directly under <svg> would be lost (layers are groups): wrap the drawing in one group
  const open = /<svg\b[^>]*>/.exec(svg)!;
  const body = svg.slice(open.index + open[0].length, svg.lastIndexOf('</svg>'));
  const defs = (body.match(/<defs[\s\S]*?<\/defs>/g) ?? []).join('');
  const rest = body.replace(/<defs[\s\S]*?<\/defs>/g, '').replace(/<metadata[\s\S]*?<\/metadata>/g, '').replace(/<sodipodi:namedview[\s\S]*?(\/>|<\/sodipodi:namedview>)/g, '');
  svg = `${svg.slice(0, open.index + open[0].length)}${defs}<g id="drawing">${rest}</g></svg>`;
  writeFileSync(join(base, 'source.svg'), svg);
  const anchors: Record<string, [number, number]> = await withPage(async (page) => {
    // inline in an HTML page: the HTML parser makes it SVG whatever namespaces the export used
    const probe = join(ROOT, 'iterations', 'assets', `probe-${dir}.html`);
    mkdirSync(join(ROOT, 'iterations', 'assets'), {recursive: true});
    writeFileSync(probe, `<!doctype html><html><body style="margin:0">${svg.replace(/<\?xml[^>]*>/, '').replace(/<svg\b/, '<svg width="1000" height="1000"')}</body></html>`);
    await page.goto({url: pathToFileURL(probe).href, timeout: 60000});
    return page.evaluate(() => {
      const root = document.querySelector('svg') as any;
      const vb = root.viewBox.baseVal;
      const inv = root.getScreenCTM().inverse();
      const out: Record<string, [number, number]> = {};
      const generic = /^(path|g|rect|circle|ellipse|polygon|polyline|line|layer|svg|defs|use|text|tspan|image|group|clip|mask|linear|radial|drawing|shape|object|cls)[-_ ]?\d*$/i;
      for (const el of Array.from(root.querySelectorAll('*')) as any[]) {
        const name = (el.getAttribute('inkscape:label') || el.querySelector(':scope > title')?.textContent || el.id || '').trim();
        if (!name || generic.test(name) || /^\d|_x[0-9A-F]{4}_/.test(name) || !el.getBBox) continue;
        const b = el.getBBox();
        if (b.width * b.height < 0.0005 * vb.width * vb.height || b.width * b.height > 0.6 * vb.width * vb.height) continue;
        const pt = root.createSVGPoint();
        pt.x = b.x + b.width / 2;
        pt.y = b.y + b.height / 2;
        const p = pt.matrixTransform(inv.multiply(el.getScreenCTM()));
        const key = name.replace(/[^A-Za-z0-9]+(.)?/g, (_: string, c: string) => (c ? c.toUpperCase() : '')).replace(/^./, (c: string) => c.toLowerCase()).slice(0, 24);
        if (key && !out[key]) out[key] = [Math.round(p.x), Math.round(p.y)];
      }
      return Object.fromEntries(Object.entries(out).slice(0, 40));
    });
  });
  const key = dir.replace(/[^A-Za-z0-9]+(.)?/g, (_: string, c: string) => (c ? c.toUpperCase() : '')).replace(/^./, (c: string) => c.toLowerCase());
  const groups = (svg.slice(open.index).match(/<g\b/g) ?? []).length ? 1 : 0;
  const manifest = {key, source: meta.source, licence: meta.licence, credit: meta.credit, doc: `${meta.credit.split(' — ')[0]} (auto-imported${Object.keys(anchors).length ? `; anchors: ${Object.keys(anchors).join(' ')}` : '; no labelled parts — use notes, or add anchors'})`, auto: true, layers: [{id: 'drawing', parts: groups ? ['#drawing'] : []}], anchors};
  writeFileSync(join(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✅ starter manifest: ${key} · ${Object.keys(anchors).length} anchors from labelled parts`);
  execFileSync('node', ['scripts/ingest-art.mts', dir], {cwd: ROOT, stdio: 'inherit'});
  execFileSync('node', ['scripts/prepare-registry.mts'], {cwd: ROOT, stdio: 'ignore'});
}

/* ------------------------------------------------------------------ the local index: every hit ever seen */
const INDEX = join(ROOT, 'assets', 'index.json');
const readIndex = (): Record<string, Hit & {queries: string[]}> => (existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : {});
function remember(q: string, hits: Hit[]) {
  const idx = readIndex();
  for (const h of hits) {
    const k = `${h.source}:${h.id}`;
    idx[k] = {...h, queries: [...new Set([...(idx[k]?.queries ?? []), q])]};
  }
  writeFileSync(INDEX, JSON.stringify(idx, null, 1) + '\n');
}

const args = process.argv.slice(2);
const flag = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const auto = args.includes('--auto');
if (args[0] === '--get') {
  const [src, id] = args[1].split(/:(.+)/);
  if (src === 'url') {
    if (!flag('--licence') || !flag('--credit')) throw new Error('--get url: needs --licence and --credit');
    const r = await fetch(id, {headers: UA});
    const file = join(ROOT, 'iterations', 'assets', `url-${args[2]}${extname(new URL(id).pathname) || '.png'}`);
    mkdirSync(join(ROOT, 'iterations', 'assets'), {recursive: true});
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    await wrap(file, args[2], {source: id, licence: flag('--licence')!, credit: flag('--credit')!}, auto);
  } else await (src === 'bioart' ? getBioart(id, args[2]) : src === 'servier' ? getServier(id, args[2], auto) : getCommons(id, args[2]));
} else if (args[0] === '--wrap') {
  if (!flag('--licence') || !flag('--credit')) throw new Error('--wrap needs --licence and --credit');
  await wrap(args[1], args[2], {source: flag('--source') ?? args[1], licence: flag('--licence')!, credit: flag('--credit')!}, auto);
} else if (args[0] === '--index') {
  const words = args.slice(1).join(' ').toLowerCase().split(/\W+/).filter(Boolean);
  const hits = Object.entries(readIndex()).filter(([, h]) => words.every((w) => `${h.title} ${h.queries.join(' ')}`.toLowerCase().includes(w)));
  for (const [k, h] of hits.sort((a, b) => a[1].rank - b[1].rank)) console.log(`  ${k}  ${h.title}  [${h.licence}]  ${h.url}`);
  if (!hits.length) console.log('  nothing in the local index — run a network search: node scripts/find-assets.mts "<query>"');
} else {
  const q = args.join(' ');
  const hits = [...(await bioart(q).catch(() => [])), ...(await servier(q).catch(() => [])), ...(await commons(q).catch(() => []))].sort((a, b) => a.rank - b.rank);
  remember(q, hits);
  const tag = ['✅ free', '✅ credit (docs)', '⚠️ share-alike'];
  console.log(`assets for "${q}" — ${hits.length} usable (public domain first)`);
  for (const h of hits.slice(0, 20)) console.log(`  ${tag[h.rank] ?? '?'}  ${h.source}:${h.id}  ${h.title}  [${h.licence}]  ${h.url}`);
  mkdirSync(join(ROOT, 'iterations', 'assets'), {recursive: true});
  const md = `# Asset search: ${q}\n\n| | source | title | licence | link |\n|---|---|---|---|---|\n${hits.map((h) => `| ${h.thumb ? `![](${h.thumb})` : ''} | ${h.source}:${h.id} | ${h.title} | ${h.licence} | ${h.url} |`).join('\n')}\n`;
  writeFileSync(join(ROOT, 'iterations', 'assets', `${q.replace(/\W+/g, '-')}.md`), md);
}
