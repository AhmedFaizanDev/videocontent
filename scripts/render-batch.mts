/**
 * Render server: render + QA every CERTIFIED lesson, nothing else. No voicing, no authoring —
 * the batch arrives certified (scripts/certify.mts) with its narration audio and timings.
 *
 *   node scripts/render-batch.mts [projects…]      (default: every project with certificates)
 *   node scripts/render-batch.mts --list           what would render, and what is skipped why
 *
 * Per lesson: the certificate's build hash must equal the hash of the code/specs/timings here
 * (anything edited after certification is refused — re-certify it locally). Finished lessons
 * (MP4 current + QA passed) are skipped, so the command resumes after interruption. One
 * render at a time (CPU-bound); set REMOTION concurrency via the machine, not by parallel runs.
 * Summary: output/RENDER_BATCH.md.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, listProjects, manifestPath, projectDir, specIds} from './lib/paths.mts';
import {buildHash, isCurrent} from './render.mts';
import {stayAwake} from './lib/awake.mts';
import {writeRegistry} from './prepare-registry.mts';

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const certPath = (p: string, id: string) => join(projectDir(p), 'build', `${id}.certified.json`);
const projects = args.filter((a) => !a.startsWith('--'));
const pool = (projects.length ? projects : listProjects()).flatMap((p) => specIds(p).filter((id) => existsSync(certPath(p, id))).map((id) => ({p, id})));

// environment: fail fast, before hours of queue, if the server can't produce a correct MP4
const env: string[] = [];
if (Number(process.versions.node.split('.')[0]) < 20) env.push(`Node ${process.versions.node} — need 20+`);
for (const bin of ['ffmpeg', 'ffprobe']) if (spawnSync(bin, ['-version']).status !== 0) env.push(`${bin} not on PATH (QA and audio mastering need it)`);
const fontFaces: {file: string}[] = JSON.parse(readFileSync(join(ROOT, 'src', 'fonts.gen.json'), 'utf8'));
const lostFonts = fontFaces.filter((f) => !existsSync(join(ROOT, 'public', f.file)));
if (lostFonts.length) env.push(`${lostFonts.length} vendored font file(s) missing under public/fonts — the archive is incomplete`);
if (env.length) {
  console.error(`❌ environment:\n  ${env.join('\n  ')}`);
  process.exit(1);
}

type Row = {p: string; id: string; status: string};
const rows: Row[] = [];
const queue: {p: string; id: string}[] = [];
for (const {p, id} of pool) {
  const cert = JSON.parse(readFileSync(certPath(p, id), 'utf8'));
  if (cert.hash !== buildHash(p, id)) rows.push({p, id, status: 'REFUSED — changed since certification; re-certify locally'});
  else if (isCurrent(p, id) && JSON.parse(readFileSync(manifestPath(p, id), 'utf8')).qa) rows.push({p, id, status: 'done (rendered + QA passed)'});
  else queue.push({p, id});
}
console.log(`${pool.length} certified lesson(s): ${queue.length} to render, ${rows.filter((r) => r.status.startsWith('done')).length} done, ${rows.filter((r) => r.status.startsWith('REFUSED')).length} refused`);
if (listOnly) {
  for (const r of [...rows, ...queue.map((q) => ({...q, status: 'queued'}))]) console.log(`  ${r.p}/${r.id}  ${r.status}`);
  process.exit(0);
}

stayAwake();
// the Studio registry lists whichever projects are present here (it is not shipped)
writeRegistry();
const t0 = Date.now();
for (const [k, {p, id}] of queue.entries()) {
  console.log(`\n━━ ${k + 1}/${queue.length} ${p}/${id}`);
  const r = spawnSync('node', ['scripts/render.mts', p, id], {cwd: ROOT, stdio: 'inherit'});
  if (r.status !== 0) {
    rows.push({p, id, status: 'FAILED at render'});
    continue;
  }
  const q = spawnSync('node', ['scripts/qa.mts', p, id], {cwd: ROOT, stdio: 'inherit'});
  rows.push({p, id, status: q.status === 0 ? 'rendered + QA passed' : 'FAILED at QA → its QA.md'});
}
const bad = rows.filter((r) => /FAILED|REFUSED/.test(r.status));
const report = [`# Render batch (${new Date().toISOString()}, ${((Date.now() - t0) / 3600000).toFixed(2)} h)`, '', '| lesson | status |', '|---|---|', ...rows.map((r) => `| ${r.p}/${r.id} | ${r.status} |`), ''].join('\n');
writeFileSync(join(ROOT, 'output', 'RENDER_BATCH.md'), report);
console.log(`\n${bad.length ? '❌' : '✅'} ${rows.length - bad.length}/${rows.length} ok → output/RENDER_BATCH.md`);
process.exit(bad.length ? 1 : 0);
