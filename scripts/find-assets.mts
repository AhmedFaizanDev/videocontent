/**
 * Asset-first sourcing (house rule, owner 2026-10-03): before drawing any medical illustration,
 * search authoritative reusable sources; code-draw only when nothing suitable exists.
 *
 *   node scripts/find-assets.mts "<query>"            search NIH BioArt (public domain, professional
 *                                                      vectors) and Wikimedia Commons (SVG, licences read
 *                                                      from file metadata) → ranked list + report
 *   node scripts/find-assets.mts --get bioart:<id> <dir>     download that BioArt entry's SVG into
 *   node scripts/find-assets.mts --get commons:<File:Name.svg> <dir>   assets/vector/<dir>/source.svg
 *                                                      with licence.json (source, licence, credit)
 * Then write assets/vector/<dir>/manifest.json (`node scripts/ingest-art.mts <dir> --parts` lists the
 * parts) and run `node scripts/ingest-art.mts <dir>` — the asset is animatable library art.
 *
 * Licence ranking: public domain / CC0 (use freely) > CC BY (credit in the end card) > CC BY-SA /
 * GFDL (share-alike — avoid for client work) > anything else (excluded).
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {openBrowser} from '@remotion/renderer';
import {ROOT} from './lib/paths.mts';

type Hit = {source: 'bioart' | 'commons'; id: string; title: string; licence: string; rank: number; url: string; thumb?: string; credit?: string};
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
  for (const pid of (ids as string[]).map(Number))
    for (let k = 1; k <= 3; k++) {
      const r = await fetch(`https://bioart.niaid.nih.gov/api/bioarts/${id}/files/${pid + k}`);
      if (!r.ok) continue;
      const t = await r.text();
      if (/<(?:\w+:)?svg[\s>]/.test(t) && /Multicolor|#[0-9a-f]{6}/i.test(t)) return save(dir, t, {source: `https://bioart.niaid.nih.gov/bioart/${id}`, licence, credit: `${title} — NIAID NIH BioArt Source (bioart.niaid.nih.gov/bioart/${id})${creator ? `, ${creator}` : ''}`});
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
  return save(dir, svg, {source: ii.descriptionurl, licence: lic, credit: `${file.replace(/^File:/, '')} — ${(ii.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim()}, Wikimedia Commons, ${lic}`});
}

function save(dir: string, svg: string, meta: {source: string; licence: string; credit: string}) {
  const base = join(ROOT, 'assets', 'vector', dir);
  mkdirSync(base, {recursive: true});
  writeFileSync(join(base, 'source.svg'), svg.replace(/\bns\d+:(?=\w)/g, '').replace(/xmlns:ns\d+=/g, 'xmlns:x='));
  writeFileSync(join(base, 'licence.json'), JSON.stringify({...meta, fetched: new Date().toISOString().slice(0, 10)}, null, 2) + '\n');
  console.log(`✅ assets/vector/${dir}/source.svg (${Math.round(svg.length / 1024)} KB) · ${meta.licence}\n   credit: ${meta.credit}\n   next: write manifest.json (node scripts/ingest-art.mts ${dir} --parts), then node scripts/ingest-art.mts ${dir}`);
}

const args = process.argv.slice(2);
if (args[0] === '--get') {
  const [src, id] = args[1].split(/:(.+)/);
  await (src === 'bioart' ? getBioart(id, args[2]) : getCommons(id, args[2]));
} else {
  const q = args.join(' ');
  const hits = [...(await bioart(q).catch(() => [])), ...(await commons(q).catch(() => []))].sort((a, b) => a.rank - b.rank);
  const tag = ['✅ free', '✅ credit', '⚠️ share-alike'];
  console.log(`assets for "${q}" — ${hits.length} usable (public domain first)`);
  for (const h of hits.slice(0, 20)) console.log(`  ${tag[h.rank] ?? '?'}  ${h.source}:${h.id}  ${h.title}  [${h.licence}]  ${h.url}`);
  mkdirSync(join(ROOT, 'iterations', 'assets'), {recursive: true});
  const md = `# Asset search: ${q}\n\n| | source | title | licence | link |\n|---|---|---|---|---|\n${hits.map((h) => `| ${h.thumb ? `![](${h.thumb})` : ''} | ${h.source}:${h.id} | ${h.title} | ${h.licence} | ${h.url} |`).join('\n')}\n`;
  writeFileSync(join(ROOT, 'iterations', 'assets', `${q.replace(/\W+/g, '-')}.md`), md);
}
