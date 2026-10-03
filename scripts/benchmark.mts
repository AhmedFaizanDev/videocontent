/**
 * Benchmark — how well the pipeline produces videos, measured from what every stage records
 * (projects/<p>/build/<id>.metrics.json, projects/<p>/jobs/usage.jsonl). It reads; it never generates.
 *
 *   node scripts/benchmark.mts <project…>      → output/BENCHMARK.md (+ .json), and a summary here
 *
 * Per run of lessons: first-pass certification rate (preflight clean as written), fixer / repair /
 * fallback rates, tokens per video (mean, median), voice and render time, failure categories,
 * share needing a human (set aside, QA failed, or a job left pending), share of new assets, and
 * reusable-asset coverage. With fewer than 20 lessons the report says the system is NOT yet proven.
 */
import {existsSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, projectDir, specIds} from './lib/paths.mts';
import {readMetrics} from './lib/metrics.mts';
import {readSpec} from './lib/paths.mts';
import {VECTOR_MANIFESTS} from '../src/art/vector/manifests.gen.ts';

const projects = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (!projects.length) {
  console.error('usage: node scripts/benchmark.mts <project…>');
  process.exit(1);
}
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '—');

type Row = {project: string; id: string; firstPass?: boolean; fixed: boolean; repairs: number; fallback: boolean; ok?: boolean; tokens: number; calls: number; voiceS?: number; renderS?: number; qa?: boolean; categories: string[]; qaFailed: string[]; human: boolean; arts: string[]; newArts: string[]};
const rows: Row[] = [];
for (const p of projects) {
  const usageFile = join(projectDir(p), 'jobs', 'usage.jsonl');
  const usage = existsSync(usageFile) ? readFileSync(usageFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  for (const id of specIds(p)) {
    const m = readMetrics(p, id);
    const c = m.stages.check ?? {};
    const u = usage.filter((x) => x.id === id);
    const tokens = u.reduce((n, x) => n + (x.in ?? 0) + (x.cacheRead ?? 0) + (x.cacheWrite ?? 0) + (x.out ?? 0), 0) + (m.authoring ?? []).reduce((n, s) => n + s.tokens.input + s.tokens.cacheRead + s.tokens.cacheWrite5m + s.tokens.cacheWrite1h + s.tokens.output, 0);
    // illustrations: library art the lesson uses; "new" = imported for this course (within a day before its script, or after)
    let arts: string[] = [];
    try {
      arts = [...new Set(readSpec(p, id).scenes.flatMap((s: any) => (s.world?.layers ?? []).map((l: any) => l.art)).filter((a: string) => VECTOR_MANIFESTS[a]))] as string[];
    } catch {}
    const born = statSync(join(projectDir(p), 'specs', `${id}.json`)).birthtimeMs;
    const newArts = arts.filter((a) => statSync(join(ROOT, 'src', 'art', 'vector', `${a}.gen.ts`)).birthtimeMs > born - 86400000);
    const qa = m.stages.qa?.pass;
    rows.push({
      project: p,
      id,
      firstPass: c.firstPass,
      fixed: (c.fixes ?? []).length > 0,
      repairs: c.repairs ?? 0,
      fallback: (c.fallback ?? []).length > 0,
      ok: c.ok,
      tokens,
      calls: u.length,
      voiceS: m.stages.voiceover?.seconds,
      renderS: m.stages.render?.seconds,
      qa,
      categories: c.categories ?? [],
      qaFailed: m.stages.qa?.failed ?? [],
      // a human was needed: set aside, failed QA, or a job still waiting for an agent
      human: c.ok === false || qa === false || (!c.at && existsSync(join(projectDir(p), 'jobs', `${id}.md`))),
      arts,
      newArts,
    });
  }
}

const checked = rows.filter((r) => r.firstPass !== undefined);
const cats = new Map<string, number>();
for (const r of rows) for (const k of [...r.categories, ...r.qaFailed.map((q) => `qa:${q}`)]) cats.set(k, (cats.get(k) ?? 0) + 1);
const tok = rows.map((r) => r.tokens).filter((t) => t > 0);
const voice = rows.map((r) => r.voiceS ?? 0).filter(Boolean);
const render = rows.map((r) => r.renderS ?? 0).filter(Boolean);
const artUses = rows.flatMap((r) => r.arts);
const newUses = rows.flatMap((r) => r.newArts);
const S = {
  lessons: rows.length,
  checked: checked.length,
  firstPassRate: pct(checked.filter((r) => r.firstPass).length, checked.length),
  fixerRate: pct(checked.filter((r) => r.fixed).length, checked.length),
  repairRate: pct(checked.filter((r) => r.repairs > 0).length, checked.length),
  fallbackRate: pct(checked.filter((r) => r.fallback).length, checked.length),
  certifiedRate: pct(checked.filter((r) => r.ok).length, checked.length),
  tokensMean: Math.round(mean(tok)),
  tokensMedian: Math.round(median(tok)),
  voiceSecondsMean: +mean(voice).toFixed(1),
  renderSecondsMean: +mean(render).toFixed(1),
  qaPassRate: pct(rows.filter((r) => r.qa).length, rows.filter((r) => r.qa !== undefined).length),
  humanRate: pct(rows.filter((r) => r.human).length, rows.length),
  newAssetShare: pct(newUses.length, artUses.length),
  reusableCoverage: pct(artUses.length - newUses.length, artUses.length),
  failureCategories: Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])),
};
const proven = S.lessons >= 20 && checked.length >= 20;
const md = `# Pipeline benchmark — ${projects.join(', ')}\n\n${new Date().toISOString().slice(0, 16)} · ${S.lessons} lesson(s), ${S.checked} through the batch check.${proven ? '' : `\n\n> **Not proven yet:** ${S.lessons} lesson(s) is too few to call any rate stable (needs ≥ 20 across ≥ 2 courses). Treat these numbers as a first reading.`}\n\n| metric | value |\n|---|---|\n| first-pass certification (clean as written) | ${S.firstPassRate} |\n| fixed by deterministic fixers | ${S.fixerRate} |\n| needed a model repair | ${S.repairRate} |\n| needed the fallback treatment | ${S.fallbackRate} |\n| certified in the end | ${S.certifiedRate} |\n| tokens per video — mean / median | ${S.tokensMean.toLocaleString()} / ${S.tokensMedian.toLocaleString()} |\n| voice generation — mean | ${S.voiceSecondsMean} s |\n| render — mean | ${S.renderSecondsMean} s |\n| QA pass on the final MP4 | ${S.qaPassRate} |\n| needed a human | ${S.humanRate} |\n| new assets (share of illustration uses) | ${S.newAssetShare} |\n| reusable asset coverage | ${S.reusableCoverage} |\n\n## Failure categories (first pass + QA)\n${Object.entries(S.failureCategories).map(([k, n]) => `- ${k}: ${n}`).join('\n') || '- none'}\n\n## Lessons\n| lesson | first pass | fixers | repairs | fallback | certified | tokens | voice s | render s | QA | categories |\n|---|---|---|---|---|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.project}/${r.id} | ${r.firstPass === undefined ? '—' : r.firstPass ? '✅' : '❌'} | ${r.fixed ? 'yes' : ''} | ${r.repairs || ''} | ${r.fallback ? 'yes' : ''} | ${r.ok === undefined ? '—' : r.ok ? '✅' : '❌'} | ${r.tokens || '—'} | ${r.voiceS ?? '—'} | ${r.renderS ?? '—'} | ${r.qa === undefined ? '—' : r.qa ? '✅' : '❌'} | ${r.categories.join(' ')} |`).join('\n')}\n`;
writeFileSync(join(ROOT, 'output', 'BENCHMARK.md'), md);
writeFileSync(join(ROOT, 'output', 'BENCHMARK.json'), JSON.stringify({summary: S, rows}, null, 2));
console.log(md.split('\n## Lessons')[0]);
