/**
 * Storyboard stills: several moments through chosen scenes, tiled per scene — for judging
 * animation (build-up, flows, focus), not just the settled end state.
 *   node scripts/lib/storyboard.mts <project> <id> [sceneIndex…] [--at 0.15,0.4,0.65,0.95] [--out dir]
 */
import {copyFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {ROOT, loadProject, readSpec, readTimings, timingsPath} from './paths.mts';
import {syntheticTimings} from './fake-timings.mts';
import {closeBrowser, lesson, still} from './remotion.mts';
import {spoken} from '../../src/project.ts';
import {paceOf, retime} from '../../src/schedule.ts';

const args = process.argv.slice(2);
const val = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const [project, id, ...rest] = args.filter((a, i) => !a.startsWith('--') && !['--at', '--out'].includes(args[i - 1]));
const fracs = (val('--at') ?? '0.15,0.4,0.65,0.95').split(',').map(Number);
const out = join(ROOT, val('--out') ?? join('iterations', 'storyboard', project, id));
// not voiced yet → storyboard against the synthetic timeline preflight uses
// voiced timings only when they belong to this version of the spec (same narration per scene)
const spec = readSpec(project, id);
const voiced = existsSync(timingsPath(project, id)) ? readTimings(project, id) : null;
const fresh = voiced && voiced.scenes.length === spec.scenes.length && voiced.scenes.every((s: any, i: number) => s.type === spec.scenes[i].type && s.narration === spoken(spec.scenes[i].narration));
const raw = fresh ? voiced : syntheticTimings(project, spec);
const t = retime(raw, paceOf(loadProject(project, spec)));
const scenes = rest.length ? rest.map(Number) : t.scenes.filter((s) => s.type === 'figure').map((s) => s.index);
mkdirSync(out, {recursive: true});
const {serveUrl, composition, inputProps} = await lesson(project, id, raw);
for (const si of scenes) {
  const s = t.scenes[si - 1];
  const files: string[] = [];
  for (const p of fracs) {
    const f = s.startFrame + s.leadFrames + Math.round(s.voDurationInFrames * p);
    const file = join(out, `s${String(si).padStart(2, '0')}_${String(Math.round(p * 100)).padStart(3, '0')}.png`);
    await still({serveUrl, composition, inputProps, output: file, frame: f});
    files.push(file);
  }
  if (files.length === 1) copyFileSync(files[0], join(out, `scene${String(si).padStart(2, '0')}.png`));
  else execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}]scale=960:-1[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % 2) * 960}_${Math.floor(i / 2) * 540}`).join('|')}`, '-frames:v', '1', join(out, `scene${String(si).padStart(2, '0')}.png`)]);
  console.log(`  scene ${si} (${s.type}) → ${join(out, `scene${String(si).padStart(2, '0')}.png`).replace(ROOT + '/', '')}`);
}
await closeBrowser();
