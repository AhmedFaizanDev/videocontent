/**
 * Preflight — prove a lesson correct BEFORE any audio or video is made, so bulk runs are
 * right on the first pass instead of render → spot → fix → re-render.
 *
 *   node scripts/preflight.mts <project> [ids…] [--no-render] [--map]   (--map: which spoken word fires each reveal)
 *
 *   1 validate     shape · project rules · narration sync · runtime estimate   (scripts/validate.mts)
 *   2 grounding    every factual number is in source/ (the fact ledger); on-screen technical
 *                  terms use the source's vocabulary
 *   3 language     one spelling system per project; nothing the voice would misread
 *   4 timing       the narration is "heard" at the voice's pace (synthetic word timeline):
 *                  reveals crammed together, long static stretches, over-long scenes
 *   5 layout       a dry-run render of every scene's settled frame with those synthetic
 *                  timings → overflow gate + text audit (text wider than its box, visible
 *                  text colliding — measured in the browser) + contact sheet
 *                  (iterations/preflight/<p>/)
 *
 * Errors block (exit 1); warnings are listed in projects/<p>/PREFLIGHT.md. produce.mts runs
 * this first; voiceover then re-checks sync against the real voice.
 */
import {mkdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {ROOT, loadProject, mergeReport, parseArgs, projectDir, readSpec} from './lib/paths.mts';
import {corpus, claimsOf, pronunciationWatch, speechHazards, spellingProblems, ungroundedNumbers, unknownTerms} from './lib/grounding.mts';
import {syntheticTimings} from './lib/fake-timings.mts';
import {closeBrowser, lesson, still} from './lib/remotion.mts';
import {overflow, settledFrame, gateKind} from './lib/frames.mts';
import {revealGroups, revealTimes} from '../src/sync.ts';
import {isIndic} from '../src/lang.ts';
import {recordStage} from './lib/metrics.mts';
import {uncovered} from './lib/coverage.mts';
import {addPending} from './lib/pending.mts';

const {project, ids, flags} = parseArgs();
const cfg = loadProject(project);
type F = {id: string; level: 'error' | 'warn'; stage: string; msg: string};
const found: F[] = [];
const add = (id: string, level: F['level'], stage: string, msg: string) => found.push({id, level, stage, msg});
const t0 = Date.now();

// 1 validate — structural errors make the rest meaningless
const v = spawnSync('node', ['scripts/validate.mts', project, ...ids], {cwd: ROOT, encoding: 'utf8'});
const vOut = v.stdout + v.stderr;
for (const line of vOut.split('\n')) {
  if (line.includes('⏱')) console.log(line);
  const m = /^\s*(❌|⚠️)\s+(\S+): (.*)$/.exec(line);
  if (m) add(m[2], m[1] === '❌' ? 'error' : 'warn', 'validate', m[3]);
}
// a lesson that fails validate is blocked; the rest of the batch is still checked
const blocked = new Set(found.filter((f) => f.level === 'error').map((f) => f.id));
if (v.status !== 0 && !blocked.size) {
  console.log(vOut);
  process.exit(1);
}
const live = ids.filter((id) => !blocked.has(id));

// 2 grounding · 3 language
const src = corpus(project);
const specs = live.map((id) => readSpec(project, id));
if (!src.files.length) {
  if (cfg.rules.grounding !== 'off') for (const id of live) add(id, 'warn', 'grounding', `no source material in projects/${project}/source/ — numbers and terms are unchecked (add the client material, or reference-notes.md with citations)`);
} else if (cfg.rules.grounding !== 'off') {
  for (const s of specs) {
    for (const m of ungroundedNumbers(s, src.text)) add(s.id, cfg.rules.grounding === 'error' ? 'error' : 'warn', 'grounding', m);
    for (const m of unknownTerms(s, src.text)) add(s.id, 'warn', 'grounding', m);
  }
}
const texts = specs.flatMap((s) => claimsOf(s).map((c) => ({where: `${s.id} ${c.where}`, text: c.text})));
for (const m of spellingProblems(texts, cfg.style.spelling)) {
  const first = m.split(' ')[0];
  add(live.includes(first) ? first : live[0], cfg.style.spelling ? 'error' : 'warn', 'language', m);
}
// every character on screen needs a house glyph (vendored fonts), or the render server's
// fallback fonts decide what it looks like
for (const s of specs) {
  const miss = uncovered(s, cfg);
  if (miss.length) add(s.id, 'error', 'language', `characters with no house-font glyph: ${miss.map((c) => `"${c}" U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(', ')} — rephrase, or add a font covering them (scripts/vendor-fonts.mts)`);
}
for (const s of specs)
  s.scenes.forEach((sc: any, i: number) => {
    for (const m of speechHazards(sc.narration ?? '', cfg.lexicon, !isIndic(cfg.lang))) add(s.id, /units out/.test(m) ? 'warn' : 'error', 'language', `scene[${i}] ${m}`);
  });
for (const s of specs) {
  if (isIndic(cfg.lang)) continue;
  const words = [...new Set(s.scenes.flatMap((sc: any) => pronunciationWatch(sc.narration ?? '', cfg.lexicon)))];
  addPending(cfg.lang, words as string[], project);
  if (words.length) add(s.id, 'warn', 'language', `pronunciation — audition these once (node scripts/say.mts ${project} "<word>"), then add each to project.json lexicon as itself if right or as a respelling if not: ${words.join(', ')}`);
}

// 4 timing — hear it at the voice's pace
const synth = new Map(specs.map((s) => [s.id, syntheticTimings(project, s)]));
for (const s of specs) {
  const t = synth.get(s.id)!;
  s.scenes.forEach((sc: any, i: number) => {
    const st = t.scenes[i];
    const vo = st.voDurationInSeconds;
    if (vo > 75) add(s.id, 'warn', 'timing', `scene[${i}] (${sc.type}) runs ~${Math.round(vo)} s of narration — split it; one idea per scene`);
    const groups = revealTimes(sc, st.words ?? [], vo);
    if (flags.map)
      for (const [name, rs] of Object.entries(groups))
        console.log(
          `  map ${s.id} scene[${i}] ${name}: ${rs.map((r) => `"${r.label.slice(0, 24)}" ← ${r.t == null ? '∅ never heard' : `"${(st.words ?? []).find((w: any) => w.start === r.t)?.w ?? '?'}" ${r.t.toFixed(1)}s`}`).join(' · ')}`,
        );
    const times = Object.values(groups).flat().map((r) => r.t).filter((x): x is number => x != null).sort((a, b) => a - b);
    for (const [name, rs] of Object.entries(groups))
      for (let k = 1; k < rs.length; k++) {
        const a = rs[k - 1].t;
        const b = rs[k].t;
        if (a != null && b != null && b - a < 0.8) add(s.id, 'warn', 'timing', `scene[${i}] ${name}: "${rs[k - 1].label}" and "${rs[k].label}" reveal ${(b - a).toFixed(1)} s apart — give each its own sentence`);
      }
    // a word just past a listening window's start (intro ticks, answer points) can fall before it in
    // the real voice, whose timing differs from this simulation — the reveal would then never fire
    const G = revealGroups(sc);
    for (const [name, rs] of Object.entries(groups)) {
      const sf = G[name]?.startFrac;
      if (!sf) continue;
      rs.forEach((r) => {
        if (r.t != null && r.t < (sf + 0.05) * vo) add(s.id, 'warn', 'timing', `scene[${i}] ${name}: "${r.label}" is spoken right at the start of its listening window (${Math.round(sf * 100)}% of the narration) — the real voice may say it too early; move that word later in the narration`);
      });
    }
    // reveals the templates place at fixed moments (not tied to a word) also refresh the screen
    const FIXED: Record<string, number[]> = {hook: [0.42], mistake: [0.42, 0.82], definition: [0.14], check: [0.14], compare: [0.9], intro: [0.34], answer: [0.05]};
    const marks = [0, ...times, ...(FIXED[sc.type] ?? []).map((p) => p * vo), vo].sort((a, b) => a - b);
    let idle = 0;
    let idleAt = 0;
    for (let k = 1; k < marks.length; k++) if (marks[k] - marks[k - 1] > idle) [idle, idleAt] = [marks[k] - marks[k - 1], marks[k - 1]];
    // where: the words spoken while nothing changes (so a repair knows exactly what to fix)
    const still = (st.words ?? []).filter((w: any) => w.start >= idleAt && w.start < idleAt + idle).map((w: any) => w.w);
    const where = still.length ? ` — still while saying "${still.slice(0, 14).join(' ')}${still.length > 14 ? ' …' : ''}"` : '';
    const static_ = cfg.rules.maxIdle ?? (['hook', 'definition', 'check'].includes(sc.type) ? 26 : 22);
    // a still opening reads as a frozen frame (QA's freeze check): stricter than mid-scene holds
    if (cfg.rules.maxIdle && marks.length > 1 && marks[1] - marks[0] > 4.5 && sc.type === 'stage')
      add(s.id, 'error', 'timing', `scene[${i}] (stage): opens on ~${Math.round(marks[1] - marks[0])} s of a still picture — the first item's word must come sooner (or a camera move must)`);
    if (idle > static_) add(s.id, cfg.rules.maxIdle ? 'error' : 'warn', 'timing', `scene[${i}] (${sc.type}): ~${Math.round(idle)} s with nothing new on screen${where} — bring an item/note there, re-mention an on-screen item, or shorten`);
  });
}

// 5 layout — dry-run render with the synthetic timings
if (!flags['no-render']) {
  const dir = join(ROOT, 'iterations', 'preflight', project);
  for (const s of specs) {
    const t = synth.get(s.id)!;
    const out = join(dir, s.id);
    rmSync(out, {recursive: true, force: true});
    mkdirSync(out, {recursive: true});
    const files: string[] = [];
    try {
      const {serveUrl, composition, inputProps} = await lesson(project, s.id, t);
      for (const st of t.scenes) {
        const settled = settledFrame(st, s.scenes[st.index - 1]);
        const frames = st.type === 'figure' ? [st.startFrame + st.leadFrames + Math.round(st.voDurationInFrames * 0.5), settled] : [settled];
        for (const frame of frames) {
          const p = (frame - st.startFrame - st.leadFrames) / Math.max(1, st.voDurationInFrames);
          const file = join(out, `${String(st.index).padStart(2, '0')}_${st.type}_${Math.round(p * 100)}.png`);
          const audit = await still({serveUrl, composition, inputProps, output: file, frame, audit: frame === settled});
          files.push(file);
          for (const m of audit) add(s.id, 'error', 'layout', `scene[${st.index - 1}] (${st.type}): ${m} (${file.replace(ROOT + '/', '')})`);
          for (const m of await overflow(file, gateKind(s.scenes[st.index - 1]))) add(s.id, 'error', 'layout', `scene[${st.index - 1}] (${st.type}) @${Math.round(p * 100)}%: ${m} (${file.replace(ROOT + '/', '')})`);
        }
      }
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-pattern_type', 'glob', '-i', join(out, '*.png'), '-vf', `scale=480:-1,tile=5x${Math.ceil(files.length / 5)}:padding=4:color=0x222222`, '-frames:v', '1', join(dir, `${s.id}_sheet.png`)]);
    } catch (e) {
      add(s.id, 'error', 'layout', `dry-run render failed: ${(e as Error).message.split('\n')[0]}`);
    }
  }
}

await closeBrowser();
report();
// the batch's time, split evenly per lesson
for (const id of ids) recordStage(project, id, 'preflight', {seconds: +((Date.now() - t0) / 1000 / ids.length).toFixed(1), batch: ids.length, errors: found.filter((f) => f.id === id && f.level === 'error').length});
process.exit(found.some((f) => f.level === 'error') ? 1 : 0);

function report() {
  const byId = new Map<string, F[]>();
  for (const f of found) byId.set(f.id, [...(byId.get(f.id) ?? []), f]);
  const errors = found.filter((f) => f.level === 'error').length;
  const warns = found.length - errors;
  // produce.mts reads each lesson's verdict from these headings (BLOCKED / OK / CLEAN)
  const sections: Record<string, string> = {};
  for (const id of ids) {
    const fs = byId.get(id) ?? [];
    const head = `## ${id} — ${fs.some((f) => f.level === 'error') ? 'BLOCKED' : fs.length ? 'OK with warnings' : 'CLEAN'} (${new Date().toISOString()})`;
    sections[id] = [head, '', ...fs.map((f) => `- ${f.level === 'error' ? '❌' : '⚠️'} **${f.stage}** ${f.msg}`)].join('\n');
  }
  mergeReport(project, join(projectDir(project), 'PREFLIGHT.md'), `# Preflight — ${project}`, sections);
  for (const f of found) console.log(`  ${f.level === 'error' ? '❌' : '⚠️ '} ${f.id} ${f.stage}: ${f.msg}`);
  console.log(`\n${project}: ${ids.length} lesson(s) — ${errors} error(s), ${warns} warning(s) in ${((Date.now() - t0) / 1000).toFixed(0)} s. Report: projects/${project}/PREFLIGHT.md`);
}
