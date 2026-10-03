/**
 * One command from specs to deliverables, with every quality gate in order:
 *
 *   node scripts/produce.mts <project> [ids…] [--force] [--review]
 *
 *   1 preflight  the whole batch first — everything provable before audio/video exists:
 *                shape, rules, sync, source grounding, spelling, speech hazards, timing
 *                simulation, dry-run layout. Spec problems surface in minutes, not hours in.
 *   then, lesson by lesson, all the way to a QA'd MP4:
 *   2 voiceover  Edge TTS (hash-cached per scene); runtime vs target; sync vs the real voice
 *   3 render     manifest-based: skipped when inputs and rendering code are unchanged
 *   4 qa         technical checks + MP4-vs-stills consistency + layout (skipped once passed)
 *   (--review adds director's stills with the real timings before rendering)
 *
 * Bulk-safe: a lesson that fails a gate is set aside and the batch carries on; finished
 * videos appear as it runs; the summary lists what stopped where. Re-running resumes — every
 * stage skips work that is already current. Keeps the Mac awake while running.
 */
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, outputDir, parseArgs, projectDir} from './lib/paths.mts';
import {stayAwake} from './lib/awake.mts';

stayAwake();
const {project, ids, flags} = parseArgs();
const force = flags.force ? ['--force'] : [];
const step = (name: string, args: string[]) => {
  console.log(`\n━━ ${name} ${'━'.repeat(Math.max(4, 60 - name.length))}`);
  return spawnSync('node', args, {cwd: ROOT, stdio: 'inherit'}).status === 0;
};
const t0 = Date.now();
const failed: Record<string, string> = {};

step('preflight', ['scripts/preflight.mts', project, ...ids]);
const reportFile = join(projectDir(project), 'PREFLIGHT.md');
if (statSync(reportFile).mtimeMs < t0) {
  console.log('\n❌ preflight crashed before writing its report — fix it and re-run.');
  process.exit(1);
}
const report = readFileSync(reportFile, 'utf8');
for (const id of ids) if (!new RegExp(`^## ${id} — (CLEAN|OK)`, 'm').test(report)) failed[id] = 'preflight → projects/' + project + '/PREFLIGHT.md';

for (const id of ids.filter((id) => !failed[id])) {
  const stages: [string, string[], string][] = [
    ['voiceover', ['scripts/voiceover.mts', project, id], 'voiceover (see its output above)'],
    ...(flags.review ? [['review', ['scripts/review.mts', project, id], 'review'] as [string, string[], string]] : []),
    ['render', ['scripts/render.mts', project, id, ...force], 'render (see its output above)'],
    ['qa', ['scripts/qa.mts', project, id, ...force], `qa → ${join(outputDir(project), 'QA.md').replace(ROOT + '/', '')}`],
  ];
  for (const [name, args, where] of stages)
    if (!step(`${name} · ${id}`, args)) {
      failed[id] = where;
      break;
    }
}

step('credits', ['scripts/credits.mts', project, ...ids]);
const done = ids.length - Object.keys(failed).length;
console.log(`\n${done ? '✅' : '❌'} ${project}: ${done}/${ids.length} lesson(s) produced and QA'd in ${((Date.now() - t0) / 60000).toFixed(1)} min → ${outputDir(project).replace(ROOT + '/', '')}/`);
for (const [id, where] of Object.entries(failed)) console.log(`   ❌ ${id} stopped at ${where}`);
if (Object.keys(failed).length) console.log('   Fix those and re-run the same command: finished lessons are skipped.');
process.exit(Object.keys(failed).length ? 1 : 0);
