/**
 * Narration for a project's lessons, with FREE Microsoft Edge neural TTS (no key, no quota)
 * via scripts/lib/tts_edge.py. Voice comes from project.json.
 *
 *   node scripts/voiceover.mts <project> [ids… | --all] [--force]
 *
 * Per scene: synthesize MP3 + per-word timeline, measure the real duration, store both in
 * projects/<p>/build/<id>.timings.json. Scenes whose narration + voice are unchanged are
 * reused (hash-cached), so editing one line re-voices one scene. Reports measured pace and
 * runtime against the project's length target. Frame layout is derived later by
 * src/schedule.ts; the SRT is written by render.mts from that same schedule.
 */
import {PACE} from '../src/pace.gen.ts';
import {readFileSync, writeFileSync, mkdirSync, existsSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseFile} from 'music-metadata';
import {captionsFromWords, type Word} from './lib/captions.mts';
import {ROOT, FPS, loadProject, parseArgs, readSpec, timingsPath, voDir, voStatic} from './lib/paths.mts';
import {writeRegistry} from './prepare-registry.mts';
import {recordStage} from './lib/metrics.mts';
import {BREATHE_RANGE, fitBreathe, holdsRange, paceOf, retime} from '../src/schedule.ts';
import {speakTokens} from './lib/speak.mts';
import {revealTimes} from '../src/sync.ts';
import {spoken} from '../src/project.ts';
import {isIndic} from '../src/lang.ts';

const PY = join(ROOT, 'scripts', 'lib', 'tts_edge.py');
const PYTHON = existsSync(join(ROOT, '.venv', 'bin', 'python')) ? join(ROOT, '.venv', 'bin', 'python') : 'python3';

type Voice = {name: string; rate: string; pitch: string};
type Pace = {sentencePause: number; beat: number; lexicon: Record<string, string>; english: boolean};

function synth(text: string, mp3: string, wordsJson: string, v: Voice, pace: Pace) {
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync(PYTHON, [PY, '--voice', v.name, `--rate=${v.rate}`, `--pitch=${v.pitch}`, '--pause', String(pace.sentencePause), '--beat', String(pace.beat), '--out', mp3, '--words', wordsJson], {
        input: JSON.stringify({tokens: speakTokens(text, pace.lexicon, pace.english)}),
        stdio: ['pipe', 'ignore', 'pipe'],
        timeout: 15 * 60 * 1000, // backstop if the helper itself wedges; retried below
      });
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500 * attempt); // transient network blip
    }
  }
}

async function buildOne(project: string, id: string, force: boolean) {
  const cfg = loadProject(project, id);
  const v: Voice = cfg.voice;
  const pace: Pace = {...cfg.pacing, lexicon: cfg.lexicon, english: !isIndic(cfg.lang)};
  // legacy one-pass voicing keeps its original cache key
  const legacy = pace.sentencePause === 0 && !Object.keys(pace.lexicon).length;
  const spec = readSpec(project, id);
  const prev = existsSync(timingsPath(project, id)) ? JSON.parse(readFileSync(timingsPath(project, id), 'utf8')) : null;
  const dir = voDir(project, id);
  mkdirSync(dir, {recursive: true});

  const scenes: any[] = [];
  let voiced = 0;
  let chars = 0;
  const t0 = Date.now();
  for (let i = 0; i < spec.scenes.length; i++) {
    const s = spec.scenes[i];
    // a silent scene (the brand ident) has a fixed length and no voice
    if (s.type === 'ident') {
      const sec = s.seconds ?? 3.2;
      scenes.push({index: i + 1, type: s.type, hash: 'silent', narration: '', audioFile: 'audio/silence.mp3', voDurationInSeconds: sec, voDurationInFrames: Math.ceil(sec * FPS), captions: [], words: []});
      continue;
    }
    const mp3 = join(dir, `scene-${i + 1}.mp3`);
    // legacy projects keep their original cache key; others hash exactly what is spoken
    const key = legacy ? [s.narration, v.name, v.rate, v.pitch] : [speakTokens(s.narration, pace.lexicon, pace.english), v.name, v.rate, v.pitch, pace.sentencePause, pace.beat];
    const hash = createHash('sha1').update(JSON.stringify(key)).digest('hex').slice(0, 12);
    const cached = prev?.scenes?.[i];
    if (!force && cached?.hash === hash && existsSync(mp3)) {
      scenes.push({...cached, index: i + 1, type: s.type});
      continue;
    }
    const wordsJson = join(dir, `scene-${i + 1}.words.json`);
    synth(s.narration, mp3, wordsJson, v, pace);
    chars += spoken(s.narration).length;
    const words = JSON.parse(readFileSync(wordsJson, 'utf8')) as Word[];
    rmSync(wordsJson, {force: true});
    const meta = await parseFile(mp3);
    const voSec = meta.format.duration ?? (words.length ? words[words.length - 1].end : (s.narration ?? "").split(/\s+/).length / 2.5);
    scenes.push({
      index: i + 1,
      type: s.type,
      hash,
      narration: spoken(s.narration),
      audioFile: voStatic(project, id, i + 1),
      voDurationInSeconds: voSec,
      voDurationInFrames: Math.ceil(voSec * FPS),
      captions: captionsFromWords(words, isIndic(cfg.lang) ? 54 : 42),
      words: words.map((w) => ({w: w.w, start: w.start, end: w.end})),
    });
    voiced++;
  }
  // frame layout (lead/tail/startFrame) is derived by src/schedule.ts
  const timings = retime({id, fps: FPS, totalDurationInFrames: 0, voice: {id: v.name, name: v.name}, scenes}, paceOf(cfg));
  // sync against the REAL voice: every reveal must find its word in the spoken timeline
  const missed: string[] = [];
  spec.scenes.forEach((sc: any, i: number) => {
    for (const [g, rs] of Object.entries(revealTimes(sc, scenes[i].words ?? [], scenes[i].voDurationInSeconds)))
      for (const r of rs) if (r.t == null && r.strict) missed.push(`scene[${i}] ${g} "${r.label}"`);
  });
  mkdirSync(join(timingsPath(project, id), '..'), {recursive: true});
  writeFileSync(timingsPath(project, id), JSON.stringify(timings, null, 2));

  // speaking pace excludes the silence we add, so it stays comparable to voice.wpm
  const toks = spec.scenes.flatMap((s: any) => (s.narration ?? "").split(/\s+/).filter(Boolean));
  const words = toks.filter((t: string) => !/^\[pause\]$/i.test(t)).length;
  const added = toks.filter((t: string) => /[.!?…।॥]["')\]”’]*$/.test(t)).length * pace.sentencePause + toks.filter((t: string) => /^\[pause\]$/i.test(t)).length * pace.beat;
  const audioSec = scenes.reduce((n, s) => n + s.voDurationInSeconds, 0);
  const voSec = audioSec - added;
  const runtimeMinutes = +(timings.totalDurationInFrames / FPS / 60).toFixed(2);
  const top = {lang: cfg.lang, runtimeMinutes, words};
  // only a real synthesis run is a TTS measurement; a fully cached run keeps the last one
  if (voiced) recordStage(project, id, 'voiceover', {seconds: +((Date.now() - t0) / 1000).toFixed(1), scenesVoiced: voiced, scenes: scenes.length, characters: chars, audioSeconds: +audioSec.toFixed(1), wpm: Math.round((words / voSec) * 60), voice: v.name}, top);
  else recordStage(project, id, 'voiceover-check', {seconds: +((Date.now() - t0) / 1000).toFixed(1), cached: true}, top);
  // exact-length projects: the holds are solved to hit the total; say how far the narration is from a comfortable fit
  let fit: string | null = null;
  const exact = paceOf(cfg).exactFrames;
  if (exact) {
    const br = fitBreathe(timings, exact);
    const [bmin, bmax] = holdsRange(cfg);
    const holdsAt1 = (exact - scenes.reduce((n, s) => n + s.voDurationInFrames, 0)) / br;
    const wpm = (words / voSec) * 60;
    const wordsFor = (b: number) => Math.round((((exact - holdsAt1 * b - scenes.reduce((n, s) => n + s.voDurationInFrames, 0)) / FPS) / 60) * wpm);
    if (br < bmin) fit = `narration too long for exactly ${cfg.length.exact} s — cut about ${-wordsFor(bmin)} words (holds would shrink to ×${br.toFixed(2)})`;
    else if (br > bmax) fit = `narration too short for exactly ${cfg.length.exact} s — add about ${wordsFor(bmax)} words (holds would stretch to ×${br.toFixed(2)})`;
  }
  return {min: timings.totalDurationInFrames / FPS / 60, wpm: (words / voSec) * 60, voiced, missed, fit};
}

const {project, ids, flags} = parseArgs();
const cfg = loadProject(project);
const [lo, hi] = cfg.length.minutes;
console.log(`${project}: ${cfg.voice.name} (rate ${cfg.voice.rate}, pitch ${cfg.voice.pitch}, +${cfg.pacing.sentencePause}s/sentence, breathe ×${cfg.pacing.breathe}) · target ${lo}–${hi} min\n`);
let bad = 0;
const paces: number[] = [];
for (const id of ids) {
  try {
    const r = await buildOne(project, id, !!flags.force);
    paces.push(r.wpm);
    // the lesson's own length (spec.length, e.g. a 60 s intro) wins over the project's band
    const [lo, hi] = loadProject(project, id).length.minutes;
    const inBand = r.fit === null && r.min >= lo - 0.05 && r.min <= hi + 0.05;
    if (!inBand) bad++;
    if (r.missed.length && cfg.rules.sync === 'error') bad++;
    const mm = `${Math.floor(r.min)}:${String(Math.round((r.min % 1) * 60)).padStart(2, '0')}`;
    console.log(`  ${id}  ${inBand ? '✅' : '⚠️ '} ${mm}  ${Math.round(r.wpm)} wpm  (${r.voiced ? `${r.voiced} scene(s) voiced` : 'cached'})${inBand ? '' : `  — ${r.fit ?? `outside ${lo}–${hi} min: edit narration length`}`}`);
    for (const m of r.missed) console.log(`        ${cfg.rules.sync === 'error' ? '❌' : '⚠️ '} sync vs real voice: ${m} never heard — reword or add "say"`);
  } catch (e) {
    bad++;
    console.log(`  ${id}  ❌ ${(e as Error).message.split('\n')[0]}`);
  }
}
if (paces.length) {
  const avg = Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
  // self-calibration: record the measured pace for this voice+rate (median of the last 9 lessons)
  const key = `${cfg.voice.name}|${cfg.voice.rate}`;
  const book = {...PACE};
  const samples = [...(book[key]?.samples ?? []), ...paces.map(Math.round)].slice(-9);
  const sorted = [...samples].sort((a, b) => a - b);
  book[key] = {wpm: sorted[Math.floor(sorted.length / 2)], samples};
  writeFileSync(join(ROOT, 'src', 'pace.gen.ts'), `// generated by scripts/voiceover.mts — measured speaking pace (wpm, pauses excluded) per voice and rate:\n// the median of the last real voiceovers. Length estimates use it over any configured value.\nexport const PACE: Record<string, {wpm: number; samples: number[]}> = ${JSON.stringify(book)};\n`);
  if (Math.abs(avg - cfg.voice.wpm) > 8) console.log(`\n  ℹ️  measured pace ${avg} wpm vs the calibrated ${cfg.voice.wpm} wpm — calibration updated (src/pace.gen.ts → ${book[key].wpm} wpm)`);
}
console.log(`\nRegistered ${writeRegistry()} lesson(s) for Studio.`);
process.exit(bad ? 1 : 0);
