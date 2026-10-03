/**
 * Renders a project's voiced lessons to output/<output.dir>/<outputFilename> (+ .srt).
 *
 *   node scripts/render.mts <project> [ids… | --all] [--force]
 *   node scripts/render.mts <project> V801 --out iterations/x [--frames 900-1400]   # review cut
 *
 * Bundles once, renders the props-driven "Lesson" composition (picture + VO + SFX + ducked
 * music), writes the SRT from the same retimed schedule, masters audio (−14 LUFS, −1.5 dBTP,
 * video stream-copied) and records a .build.json manifest. A lesson whose spec, timings,
 * project config and rendering code are unchanged since its last render is skipped — so
 * interrupted batches resume, and a code fix re-renders everything it affects.
 */
import {mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync, statSync} from 'node:fs';
import {join, basename} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {renderMedia} from '@remotion/renderer';
import {ROOT, manifestPath, mp4Path, parseArgs, srtPath, timingsPath, specPath, loadProject, readSpec} from './lib/paths.mts';
import {srtTime} from './lib/captions.mts';
import {masterAudio} from './lib/master.mts';
import {lesson} from './lib/remotion.mts';
import {stayAwake} from './lib/awake.mts';
import {paceOf, retime} from '../src/schedule.ts';
import {recordStage} from './lib/metrics.mts';

/** Everything that can change a pixel or a sample of a lesson. */
export function buildHash(project: string, id: string) {
  const h = createHash('sha1');
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (f.startsWith('.')) continue;
      if (statSync(p).isDirectory()) walk(p);
      // project.ts holds config defaults — their resolved values are hashed below instead
      // dotfiles (.DS_Store…) are machine noise, never shipped: they must not change the hash
      else if (!f.startsWith('.') && f !== 'registry.gen.ts' && f !== 'project.ts') h.update(f).update(readFileSync(p));
    }
  };
  walk(join(ROOT, 'src'));
  h.update(readFileSync(join(ROOT, 'scripts', 'lib', 'master.mts')));
  // only config that reaches pixels or samples (voice/lexicon/pacing changes arrive via the timings)
  const cfg = loadProject(project, id);
  h.update(JSON.stringify({brand: cfg.brand, music: cfg.music, series: cfg.series, breathe: cfg.pacing.breathe, exact: cfg.length.exact}));
  h.update(readFileSync(specPath(project, id))).update(readFileSync(timingsPath(project, id)));
  return h.digest('hex').slice(0, 16);
}

export const isCurrent = (project: string, id: string) =>
  existsSync(mp4Path(project, id)) && existsSync(manifestPath(project, id)) && JSON.parse(readFileSync(manifestPath(project, id), 'utf8')).hash === buildHash(project, id);

function writeSrt(project: string, id: string, file: string) {
  const t = retime(JSON.parse(readFileSync(timingsPath(project, id), 'utf8')), paceOf(loadProject(project, id)));
  let srt = '';
  let n = 1;
  for (const s of t.scenes) {
    const offset = (s.startFrame + s.leadFrames) / t.fps;
    for (const c of s.captions) srt += `${n++}\n${srtTime(offset + c.start)} --> ${srtTime(offset + c.end)}\n${c.text}\n\n`;
  }
  writeFileSync(file, srt);
}

/** Upload kit next to the MP4: thumbnail (the designed poster frame) + title/chapters/credits text. */
function writePublishKit(project: string, id: string, mp4: string) {
  const cfg = loadProject(project, id);
  const spec = readSpec(project, id);
  const t = retime(JSON.parse(readFileSync(timingsPath(project, id), 'utf8')), paceOf(cfg));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', mp4, '-frames:v', '1', '-q:v', '2', mp4.replace(/\.mp4$/, '.jpg')]);
  const mmss = (f: number) => `${Math.floor(f / 30 / 60)}:${String(Math.floor((f / 30) % 60)).padStart(2, '0')}`;
  const chapters: string[] = [];
  let last = '';
  t.scenes.forEach((s, i) => {
    const kind = spec.scenes[i]?.type;
    const title = kind === 'answer' ? '' : kind === 'check' ? 'Knowledge check' : spec.scenes[i]?.kicker ?? '';
    if (title && title !== last) chapters.push(`${chapters.length ? mmss(s.startFrame) : '0:00'} ${title}`);
    if (title) last = title;
  });
  // credits for any music file live next to it: public/audio/music/credits.json {file: line}
  const creditsFile = join(ROOT, 'public', 'audio', 'music', 'credits.json');
  const credits: Record<string, string> = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {};
  const music = cfg.music && credits[basename(cfg.music)] ? [credits[basename(cfg.music)]] : [];
  writeFileSync(mp4.replace(/\.mp4$/, '.youtube.txt'), [spec.title, '', ...chapters, '', `${cfg.series} · ${cfg.brand.name}`, ...music, ''].join('\n'));
}

export async function renderLesson(project: string, id: string, opts: {out?: string; frames?: [number, number]; timeout?: number} = {}) {
  const final = opts.out ? join(ROOT, opts.out, `${id}${opts.frames ? `_${opts.frames[0]}-${opts.frames[1]}` : ''}_${basename(mp4Path(project, id))}`) : mp4Path(project, id);
  mkdirSync(join(final, '..'), {recursive: true});
  const raw = final.replace(/\.mp4$/, '.raw.mp4');
  const {serveUrl, composition, inputProps} = await lesson(project, id);
  const t0 = Date.now();
  const common = {
    serveUrl,
    composition,
    inputProps,
    overwrite: true,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || null,
    // every tab loads all vendored font faces before its first frame; under load that can
    // exceed Remotion's default 30 s (same budget as composition selection in lib/remotion.mts)
    timeoutInMilliseconds: opts.timeout ?? 120000,
  };
  const video = {codec: 'h264' as const, crf: 17, jpegQuality: 94, colorSpace: 'bt709' as const};
  // one pass: chunking was measured and doesn't help — this fanless Mac throttles under any
  // sustained load (300-frame bursts ~45–50 fps, sustained ~22–25 fps), so fewer renders is the lever
  await renderMedia({...common, ...video, outputLocation: raw, audioBitrate: '256k', frameRange: opts.frames ?? null});
  const sec = (Date.now() - t0) / 1000;
  if (opts.frames) renameSync(raw, final);
  else {
    masterAudio(raw, final);
    rmSync(raw, {force: true});
    writeSrt(project, id, opts.out ? final.replace(/\.mp4$/, '.srt') : srtPath(project, id));
    writePublishKit(project, id, final);
    if (!opts.out) writeFileSync(manifestPath(project, id), JSON.stringify({hash: buildHash(project, id), renderedAt: new Date().toISOString(), seconds: Math.round(sec)}, null, 2));
    if (!opts.out)
      recordStage(project, id, 'render', {
        seconds: Math.round(sec),
        totalSeconds: Math.round((Date.now() - t0) / 1000),
        frames: composition.durationInFrames,
        fps: +(composition.durationInFrames / sec).toFixed(1),
        bytes: statSync(final).size,
      });
  }
  return {final, sec, fps: (opts.frames ? opts.frames[1] - opts.frames[0] + 1 : composition.durationInFrames) / sec};
}

if (import.meta.filename === process.argv[1]) {
  stayAwake();
  const {project, ids, flags} = parseArgs(['out', 'frames', 'timeout']);
  const out = typeof flags.out === 'string' ? flags.out : undefined;
  const frames = typeof flags.frames === 'string' ? (flags.frames.split('-').map(Number) as [number, number]) : undefined;
  let ok = 0;
  let failed = 0;
  for (const id of ids) {
    if (!existsSync(timingsPath(project, id))) {
      console.log(`  ${id}  ⚠️  not voiced — run voiceover first`);
      failed++;
      continue;
    }
    if (!out && !flags.force && isCurrent(project, id)) {
      console.log(`  ${id}  ⏭  up to date`);
      continue;
    }
    try {
      const r = await renderLesson(project, id, {out, frames, timeout: typeof flags.timeout === 'string' ? Number(flags.timeout) : undefined});
      console.log(`  ${id}  ✅  ${r.sec.toFixed(0)}s (${r.fps.toFixed(1)} fps)  → ${r.final.replace(ROOT + '/', '')}`);
      ok++;
    } catch (e) {
      console.log(`  ${id}  ❌  ${(e as Error).message.split('\n')[0]}`);
      failed++;
    }
  }
  console.log(`\nDone. ${ok} rendered, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}
