/**
 * Local certification: prove every lesson correct BEFORE any bulk render (the render itself
 * happens elsewhere — `scripts/render-batch.mts` on the render server). No MP4 is made here.
 *
 *   node scripts/certify.mts <project> [ids…] [--strict]      (--strict: warnings block too)
 *
 *   1 preflight   text gates + dry-run layout render + text audit (synthetic timings)
 *   2 voiceover   the real voice: runtime inside the band, every reveal heard on its word
 *   3 review      stills at the REAL timings (poster, every scene twice, outro): margin/caption
 *                 gate + text audit — the layout the server will actually render
 *   4 assets      narration audio, music, brand art all present
 *   → projects/<p>/build/<id>.certified.json {hash, …}: the build hash (spec + timings +
 *     rendering code + config, as render.mts computes it). The render server renders only
 *     lessons whose certificate matches the code it received.
 * Frozen pictures are designed out (camera push + float; `npm test` 5d proves it) and the
 * encode/loudness checks are the server's QA — the only gates that need a real MP4.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, loadProject, mergeReport, parseArgs, projectDir, readTimings} from './lib/paths.mts';
import {buildHash} from './render.mts';

const {project, ids, flags} = parseArgs();
const cfg = loadProject(project);
const run = (args: string[]) => spawnSync('node', args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
const t0 = Date.now();
const result: Record<string, {ok: boolean; notes: string[]}> = Object.fromEntries(ids.map((id) => [id, {ok: true, notes: []}]));
const fail = (id: string, note: string) => ((result[id].ok = false), result[id].notes.push(`❌ ${note}`));

// 1 preflight (whole batch at once)
console.log(`━━ preflight`);
run(['scripts/preflight.mts', project, ...ids]);
const pre = readFileSync(join(projectDir(project), 'PREFLIGHT.md'), 'utf8');
for (const id of ids) {
  const m = new RegExp(`^## ${id} — (\\w+)`, 'm').exec(pre);
  if (!m || m[1] === 'BLOCKED') fail(id, 'preflight blocked → PREFLIGHT.md');
  else if (m[1] !== 'CLEAN') (flags.strict ? fail : (i: string, n: string) => result[i].notes.push(`⚠️ ${n}`))(id, 'preflight warnings → PREFLIGHT.md');
}

for (const id of ids.filter((i) => result[i].ok)) {
  // 2 real voice
  console.log(`━━ voiceover · ${id}`);
  const v = run(['scripts/voiceover.mts', project, id]);
  const vLine = (v.stdout.split('\n').find((l) => l.includes(id)) ?? '').trim();
  if (v.status !== 0) {
    fail(id, `voiceover: ${vLine} ${v.stdout.split('\n').filter((l) => l.includes('never heard')).map((l) => l.trim()).join(' · ')}`);
    continue;
  }
  result[id].notes.push(`voice ${vLine.replace(id, '').trim()}`);
  // 3 layout at the real timings
  console.log(`━━ review · ${id}`);
  const r = run(['scripts/review.mts', project, id, '--out', join('iterations', 'certify', project)]);
  if (r.status !== 0) {
    fail(id, `layout at real timings: ${r.stdout.split('\n').filter((l) => l.includes('@')).map((l) => l.trim()).join(' · ')}`);
    continue;
  }
  // 4 assets
  const t = readTimings(project, id);
  const missing = [
    ...t.scenes.map((s: any) => join(ROOT, 'public', s.audioFile)),
    ...(cfg.music ? [join(ROOT, 'public', cfg.music)] : []),
    join(ROOT, 'public', cfg.brand.art.lockup),
    join(ROOT, 'public', cfg.brand.art.icon),
  ].filter((f) => !existsSync(f));
  if (missing.length) {
    fail(id, `missing assets: ${missing.map((f) => f.replace(ROOT + '/', '')).join(', ')}`);
    continue;
  }
  // publishing needs the music's credit/licence line (public/audio/music/credits.json)
  const creditsFile = join(ROOT, 'public', 'audio', 'music', 'credits.json');
  if (cfg.music && !(existsSync(creditsFile) && JSON.parse(readFileSync(creditsFile, 'utf8'))[cfg.music.split('/').pop()!]))
    (flags.strict ? fail : (i: string, n: string) => result[i].notes.push(`⚠️ ${n}`))(id, `no credit line for ${cfg.music} in public/audio/music/credits.json`);
  writeFileSync(
    join(projectDir(project), 'build', `${id}.certified.json`),
    JSON.stringify({hash: buildHash(project, id), certifiedAt: new Date().toISOString(), strict: !!flags.strict, notes: result[id].notes}, null, 2),
  );
}

const sections = Object.fromEntries(
  ids.map((id) => [id, [`## ${id} — ${result[id].ok ? 'CERTIFIED' : 'NOT CERTIFIED'} (${new Date().toISOString()})`, '', ...result[id].notes.map((n) => `- ${n}`), ...(result[id].ok ? [`- stills at real timings: iterations/certify/${project}/${id}_sheet.png`] : [])].join('\n')]),
);
mergeReport(project, join(projectDir(project), 'CERTIFIED.md'), `# Certification — ${project}`, sections);
const ok = ids.filter((id) => result[id].ok);
console.log(`\n${ok.length === ids.length ? '✅' : '❌'} ${project}: ${ok.length}/${ids.length} certified in ${((Date.now() - t0) / 60000).toFixed(1)} min → projects/${project}/CERTIFIED.md`);
for (const id of ids.filter((i) => !result[i].ok)) console.log(`   ${id}: ${result[id].notes.filter((n) => n.startsWith('❌')).join(' · ')}`);
process.exit(ok.length === ids.length ? 0 : 1);
