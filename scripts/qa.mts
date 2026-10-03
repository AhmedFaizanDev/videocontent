/**
 * Post-render gate. A lesson is deliverable only when all of this passes.
 *
 * Technical (per MP4):
 *   format   1920×1080, 30 fps, H.264 yuv420p, BT.709 tags, AAC 48 kHz
 *   duration matches the retimed schedule; hard cuts land only on scene boundaries
 *   integrity full decode; no black runs, no ≥3 s frozen picture
 *   loudness −14 ±1 LUFS, true peak ≤ −1 dBTP, no clipping; designed poster at frame 0; SRT sane
 * Consistency: sampled MP4 frames (every figure scene densely, every other scene settled)
 *   match single-frame stills of the same frames. Long parallel renders can differ from
 *   stills (e.g. text laid out before its font loaded) — stills-only review can't see that.
 * Layout: the same stills are checked for overflow into margins / beside captions.
 *
 *   node scripts/qa.mts <project> [ids…] [--force] → output/<dir>/QA.md, exit 1 on any failure
 *   A lesson that already passed for its current build (manifest) is skipped unless --force.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {ROOT, loadProject, manifestPath, mergeReport, mp4Path, outputDir, parseArgs, readSpec, readTimings, timingsPath} from './lib/paths.mts';
import {closeBrowser, lesson, still} from './lib/remotion.mts';
import {DELTA_LIMIT, blockDelta, overflow, settledFrame, gateKind} from './lib/frames.mts';
import {TX, paceOf, retime} from '../src/schedule.ts';
import {revealTimes} from '../src/sync.ts';
import {recordStage} from './lib/metrics.mts';

const run = (args: string[]) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {encoding: 'utf8', maxBuffer: 256 * 1024 * 1024}).stderr ?? '';
const probe = (file: string) =>
  JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8'}).stdout);

type Check = {name: string; pass: boolean; detail: string};

function technical(project: string, id: string, file: string) {
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({name, pass, detail});
  const p = probe(file);
  const v = p.streams.find((s: any) => s.codec_type === 'video');
  const a = p.streams.find((s: any) => s.codec_type === 'audio');
  const [fn, fd] = String(v.r_frame_rate).split('/').map(Number);
  const fps = fn / (fd || 1);
  add('format', v.width === 1920 && v.height === 1080 && fps === 30 && v.codec_name === 'h264' && v.pix_fmt === 'yuv420p',
    `${v.width}×${v.height} ${fps}fps ${v.codec_name} ${v.pix_fmt}`);
  add('color tags', v.color_primaries === 'bt709' && v.color_transfer === 'bt709' && v.color_space === 'bt709',
    `${v.color_primaries}/${v.color_transfer}/${v.color_space}`);
  add('audio stream', !!a && a.codec_name === 'aac' && Number(a.sample_rate) === 48000, a ? `${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : 'missing');

  const dur = Number(p.format.duration);
  if (existsSync(timingsPath(project, id))) {
    const t = retime(JSON.parse(readFileSync(timingsPath(project, id), 'utf8')), paceOf(loadProject(project, id)));
    const frames = parseInt(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], {encoding: 'utf8'}).stdout, 10);
    add('duration', frames === t.totalDurationInFrames, `${frames} video frames vs schedule ${t.totalDurationInFrames} (${(frames / 30).toFixed(2)}s)`);

    // hard scene changes must fall inside a planned transition window
    const sc = run(['-i', file, '-vf', "scale=480:-1,select='gt(scene,0.32)',showinfo", '-an', '-f', 'null', '-']);
    const times = [...sc.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1])).filter((x) => x > 0.2);
    const bounds = t.scenes.slice(1).map((s) => s.startFrame / 30);
    // …or at a flash the spec asks for (a stage beat with `flash`, placed on its real spoken word)
    const spec = readSpec(project, id);
    const flashes = t.scenes.flatMap((st) => {
      const sc = spec.scenes[st.index - 1];
      if (sc?.type !== 'stage' || !sc.beats?.some((b: any) => b.flash)) return [];
      const at = revealTimes(sc, st.words ?? [], st.voDurationInSeconds).beats ?? [];
      return sc.beats.flatMap((b: any, i: number) => (b.flash && at[i]?.t != null ? [(st.startFrame + st.leadFrames) / 30 + at[i].t!] : []));
    });
    const stray = times.filter((x) => !bounds.some((b) => x >= b - (TX.exit + 4) / 30 && x <= b + (TX.enter + 6) / 30) && !flashes.some((fl) => x >= fl - 0.3 && x <= fl + 1.2) && x < dur - 5);
    add('cuts on boundaries', stray.length === 0, `${times.length} hard changes; ${stray.length} off-boundary${stray.length ? ' @ ' + stray.map((x) => x.toFixed(2)).join(', ') : ''}`);
  }

  const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  add('decode integrity', (dec.stderr ?? '').trim() === '', (dec.stderr ?? '').trim().split('\n')[0] || 'clean full decode');

  const bl = run(['-i', file, '-vf', 'blackdetect=d=0.25:pic_th=0.985:pix_th=0.035', '-an', '-f', 'null', '-']);
  const blacks = [...bl.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => `${m[1]}–${m[2]}`);
  add('no black frames', blacks.length === 0, blacks.length ? blacks.join(', ') : 'none');

  const fr = run(['-i', file, '-vf', 'freezedetect=n=-60dB:d=3', '-an', '-f', 'null', '-']);
  const freezes = [...fr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => m[1]);
  add('no frozen picture', freezes.length === 0, freezes.length ? `freeze @ ${freezes.join(', ')}` : 'none ≥3s');

  const lu = run(['-i', file, '-vn', '-af', 'ebur128=peak=true,astats=measure_perchannel=none:measure_overall=Peak_level+Number_of_samples', '-f', 'null', '-']);
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(lu.split('Summary:').pop() ?? '')?.[1]);
  const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(lu.split('True peak:').pop() ?? '')?.[1]);
  add('loudness', Math.abs(I + 14) <= 1, `${I} LUFS (target −14)`);
  add('true peak', TP <= -1.0, `${TP} dBTP`);
  const clip = run(['-i', file, '-vn', '-af', "volumedetect", '-f', 'null', '-']);
  const maxv = Number(/max_volume: (-?[\d.]+) dB/.exec(clip)?.[1]);
  add('no clipping', maxv < -0.1, `sample peak ${maxv} dBFS`);

  // poster: frame 0 must differ from the first intro frames and not be dark
  const sig = (sel: string) =>
    Number(/YAVG=([\d.]+)/.exec(run(['-i', file, '-vf', `select='${sel}',signalstats,metadata=print`, '-frames:v', '1', '-an', '-f', 'null', '-']))?.[1] ?? 0);
  const y0 = sig('eq(n,0)');
  const y4 = sig('eq(n,4)');
  add('poster frame', y0 > 22 && Math.abs(y0 - y4) > 2, `frame0 Y=${y0.toFixed(1)} vs frame4 Y=${y4.toFixed(1)}`);

  const srt = file.replace(/\.mp4$/, '.srt');
  if (existsSync(srt)) {
    const cues = [...readFileSync(srt, 'utf8').matchAll(/(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})/g)].map((m) => [
      +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000,
      +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000,
    ]);
    const mono = cues.every((c, i) => c[1] > c[0] && (i === 0 || c[0] >= cues[i - 1][0]));
    add('srt', mono && cues.length > 0 && cues[cues.length - 1][1] <= dur, `${cues.length} cues, last ends ${cues[cues.length - 1]?.[1].toFixed(2)}s`);
  } else add('srt', false, 'missing');

  return checks;
}

async function visual(project: string, id: string, file: string): Promise<Check[]> {
  const t = retime(readTimings(project, id), paceOf(loadProject(project, id)));
  const spec = readSpec(project, id);
  const samples: {n: number; type: string}[] = [];
  for (const s of t.scenes) {
    const vo = s.startFrame + s.leadFrames;
    if (s.type === 'figure') for (const p of [0.2, 0.4, 0.6, 0.8]) samples.push({n: vo + Math.round(s.voDurationInFrames * p), type: '', });
    samples.push({n: settledFrame(s, spec.scenes[s.index - 1]), type: gateKind(spec.scenes[s.index - 1])});
  }
  const tmp = join(ROOT, 'iterations', 'qa', project, id);
  mkdirSync(tmp, {recursive: true});
  const {serveUrl, composition, inputProps} = await lesson(project, id);
  const diffs: string[] = [];
  const layout: string[] = [];
  for (const {n, type} of samples) {
    const a = join(tmp, `${n}_mp4.png`);
    const b = join(tmp, `${n}_still.png`);
    // accurate seek to half a frame before n = exactly frame n (verified pixel-identical to
    // select=eq(n,N), which decodes from the start: ~30× slower on a 10-min video)
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(Math.max(0, (n - 0.5) / 30)), '-i', file, '-frames:v', '1', a]);
    await still({serveUrl, composition, inputProps, output: b, frame: n});
    const d = await blockDelta(a, b);
    if (d > DELTA_LIMIT) diffs.push(`${n} (Δ${d.toFixed(0)})`);
    if (type) for (const p of await overflow(a, type)) layout.push(`${n} ${type}: ${p}`);
  }
  return [
    {name: 'render = stills', pass: !diffs.length, detail: diffs.length ? `${diffs.length}/${samples.length} frames differ: ${diffs.join(', ')} — see ${tmp.replace(ROOT + '/', '')}` : `${samples.length} sampled frames match`},
    {name: 'layout', pass: !layout.length, detail: layout.length ? layout.join('; ') : 'no overflow'},
  ];
}

const {project, ids, flags} = parseArgs();
const rows: Record<string, string> = {};
let failed = 0;
for (const id of ids) {
  const file = mp4Path(project, id);
  if (!existsSync(file)) {
    console.log(`\n❌ ${id}: not rendered (${file.replace(ROOT + '/', '')})`);
    rows[id] = `### ${id} — FAIL\n\nnot rendered`;
    failed++;
    continue;
  }
  // the manifest remembers which build passed, so resumed batches don't re-QA finished videos
  const manifest = existsSync(manifestPath(project, id)) ? JSON.parse(readFileSync(manifestPath(project, id), 'utf8')) : null;
  if (!flags.force && manifest?.qa && manifest.qa === manifest.hash) {
    console.log(`\n✅ ${id}  already passed QA for this build (--force to re-check)`);
    continue;
  }
  const tq = Date.now();
  let vis: Check[] = [];
  if (!flags['skip-visual'])
    try {
      vis = await visual(project, id, file);
    } catch (e) {
      vis = [{name: 'render = stills', pass: false, detail: `could not run: ${(e as Error).message.split('\n')[0]}`}];
    }
  const checks = [...technical(project, id, file), ...vis];
  const pass = checks.every((c) => c.pass);
  if (!pass) failed++;
  recordStage(project, id, 'qa', {seconds: Math.round((Date.now() - tq) / 1000), pass, failed: checks.filter((c) => !c.pass).map((c) => c.name)});
  console.log(`\n${pass ? '✅' : '❌'} ${id}  ${file.replace(ROOT + '/', '')}`);
  for (const c of checks) console.log(`   ${c.pass ? '·' : '✗'} ${c.name.padEnd(20)} ${c.detail}`);
  rows[id] = `### ${id} — ${pass ? 'PASS' : 'FAIL'} (${new Date().toISOString()})\n\n| check | | detail |\n|---|---|---|\n${checks.map((c) => `| ${c.name} | ${c.pass ? '✅' : '❌'} | ${c.detail} |`).join('\n')}`;
  if (manifest) writeFileSync(manifestPath(project, id), JSON.stringify({...manifest, qa: pass ? manifest.hash : undefined}, null, 2));
}
await closeBrowser();
mergeReport(project, join(outputDir(project), 'QA.md'), `# QA — ${project}`, rows);
console.log(`\n${ids.length - failed}/${ids.length} passed. Report: ${join(outputDir(project), 'QA.md').replace(ROOT + '/', '')}`);
process.exit(failed ? 1 : 0);
