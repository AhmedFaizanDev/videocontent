/**
 * Motion audit: where does a rendered lesson stop explaining with movement? Samples the final
 * MP4 (or a preview) at 5 fps, measures how much the picture changes between samples, and maps
 * still stretches back to scenes and narration. A teaching video should never hold a frozen
 * picture while the narrator talks — the picture should be doing what the voice describes.
 *
 *   node scripts/motion-audit.mts <project> <id> [--max 2.5]   (seconds of stillness allowed)
 *
 * Reports per scene: % of time moving, the longest still stretch and what was being said.
 * Exit 1 when any stretch longer than --max seconds falls inside narration.
 */
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {loadProject, parseArgs, readSpec, readTimings} from './lib/paths.mts';
import {paceOf, retime} from '../src/schedule.ts';
import {ROOT} from './lib/paths.mts';

const {project, ids, flags} = parseArgs();
const max = Number((flags as any)?.max ?? process.argv[process.argv.indexOf('--max') + 1] ?? 2.5) || 2.5;
const FPS = 5;
const W = 96;
const H = 54;
let bad = 0;
for (const id of ids) {
  const cfg = loadProject(project, id);
  const spec = readSpec(project, id);
  const file = join(ROOT, 'output', cfg.output.dir, spec.outputFilename);
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', 'pipe:1'], {maxBuffer: 1 << 30});
  const n = Math.floor(raw.length / (W * H));
  // change per sample: mean absolute pixel difference, ignoring the caption band (bottom 18%)
  const rows = Math.floor(H * 0.82);
  const diff: number[] = [0];
  for (let i = 1; i < n; i++) {
    let s = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) s += Math.abs(raw[i * W * H + y * W + x] - raw[(i - 1) * W * H + y * W + x]);
    diff.push(s / (rows * W));
  }
  const STILL = 0.35; // grey levels: below this the picture is effectively frozen
  const t = retime(readTimings(project, id), paceOf(cfg));
  console.log(`${id}: motion audit (still = < ${STILL} grey-level change per ${1000 / FPS} ms; allowed ${max}s)`);
  for (const sc of t.scenes) {
    const a = Math.floor((sc.startFrame / 30) * FPS);
    const b = Math.floor(((sc.startFrame + sc.durationInFrames) / 30) * FPS);
    const voA = (sc.startFrame + sc.leadFrames) / 30;
    let moving = 0;
    let run = 0;
    let worst = {len: 0, at: 0};
    for (let i = a; i < Math.min(b, n); i++) {
      if (diff[i] >= STILL) {
        moving++;
        run = 0;
      } else {
        run++;
        if (run > worst.len) worst = {len: run, at: i - run + 1};
      }
    }
    const len = worst.len / FPS;
    const at = worst.at / FPS;
    const said = (sc.words ?? []).filter((w) => voA + w.start >= at && voA + w.start <= at + len).map((w) => w.w).join(' ');
    const share = Math.round((moving / Math.max(1, b - a)) * 100);
    const flag = len > max && said ? '❌' : len > max ? '⚠️ ' : '✅';
    if (flag === '❌') bad++;
    console.log(`  ${flag} scene ${String(sc.index).padStart(2)} ${sc.type.padEnd(6)} moving ${String(share).padStart(3)}% · longest still ${len.toFixed(1)}s at ${at.toFixed(1)}s${said ? ` while saying "${said.slice(0, 80)}${said.length > 80 ? '…' : ''}"` : ''}`);
  }
}
process.exit(bad ? 1 : 0);
