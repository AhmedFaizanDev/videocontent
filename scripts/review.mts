/**
 * Pre-render gate + director's review. For each lesson: renders the poster, two settled
 * moments per scene (and transition midpoints with --transitions), tiles a contact sheet,
 * and flags layout overflow on every still. Exit 1 if anything overflows.
 *
 *   node scripts/review.mts <project> [ids…] [--transitions] [--out dir]
 *   → <out>/<id>/f<frame>_<tag>.png, <out>/<id>_sheet.png   (default out: iterations/review/<project>)
 */
import {mkdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, loadProject, parseArgs, readSpec, readTimings} from './lib/paths.mts';
import {closeBrowser, lesson, still} from './lib/remotion.mts';
import {overflow, settledFrame, gateKind} from './lib/frames.mts';
import {paceOf, retime} from '../src/schedule.ts';

const {project, ids, flags} = parseArgs(['out']);
const outDir = join(ROOT, typeof flags.out === 'string' ? flags.out : join('iterations', 'review', project));
const problems: string[] = [];
for (const id of ids) {
  const t = retime(readTimings(project, id), paceOf(loadProject(project, id)));
  const spec = readSpec(project, id);
  const frames: {f: number; tag: string; type: string; check: boolean}[] = [{f: 0, tag: 'poster', type: 'poster', check: false}];
  for (const s of t.scenes) {
    const vo = s.startFrame + s.leadFrames;
    frames.push({f: vo + Math.round(s.voDurationInFrames * 0.3), tag: `${s.index}-${s.type}-a`, type: s.type, check: false});
    frames.push({f: settledFrame(s, spec.scenes[s.index - 1]), tag: `${s.index}-${s.type}-b`, type: gateKind(spec.scenes[s.index - 1]), check: true});
    if (flags.transitions && s.index > 1) frames.push({f: s.startFrame - 3, tag: `${s.index}-tx`, type: 'tx', check: false}, {f: s.startFrame + 5, tag: `${s.index}-tx+`, type: 'tx', check: false});
  }
  frames.push({f: t.totalDurationInFrames - 40, tag: 'outro', type: 'outro', check: false});
  const dir = join(outDir, id);
  rmSync(dir, {recursive: true, force: true});
  mkdirSync(dir, {recursive: true});
  const {serveUrl, composition, inputProps} = await lesson(project, id);
  for (const fr of frames) {
    const file = join(dir, `f${String(fr.f).padStart(5, '0')}_${fr.tag}.png`);
    const audit = await still({serveUrl, composition, inputProps, output: file, frame: fr.f, audit: fr.check});
    if (fr.check) for (const p of [...(await overflow(file, fr.type)), ...audit]) problems.push(`${id} ${fr.tag} @${fr.f}: ${p}  (${file.replace(ROOT + '/', '')})`);
  }
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-pattern_type', 'glob', '-i', join(dir, 'f*.png'), '-vf', `scale=640:-1,tile=4x${Math.ceil(frames.length / 4)}:padding=6:color=0x222222`, '-frames:v', '1', join(outDir, `${id}_sheet.png`)]);
  console.log(`  ${id}  ${frames.length} stills → ${join(outDir, `${id}_sheet.png`).replace(ROOT + '/', '')}`);
}
await closeBrowser();
if (problems.length) console.log(`\n❌ ${problems.length} layout problem(s):\n  ${problems.join('\n  ')}`);
else console.log(`\n✅ no layout overflow`);
process.exit(problems.length ? 1 : 0);
