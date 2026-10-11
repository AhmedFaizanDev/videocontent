/**
 * Course PDFs → finished, QA'd lesson videos. Per lesson: one writer call, deterministic fixers,
 * at most two scoped model repairs (each kept only if the gate proves progress), then voice → render → QA.
 * Illustrations are onboarded once per subject beforehand (docs/ART.md); this never searches or draws.
 *
 *   node scripts/batch.mts <project> plan                 course.json: one video per module PDF (no model call)
 *   node scripts/batch.mts <project> write [ids…]         write missing scripts (one call each)
 *   node scripts/batch.mts <project> check [ids…]         preflight → fixers → ≤2 scoped repairs
 *   node scripts/batch.mts <project> produce [ids…]       check, then voice → render → QA the clean ones
 *   node scripts/batch.mts <project> translate <lang> [ids…]   native copies into <project>-<lang>
 *   node scripts/batch.mts <project> all                  plan (if needed) → write → check → produce
 *
 * Model calls: scripts/lib/llm.mts (headless Claude, Sonnet, ~1.3k tokens of overhead per call).
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, loadProject, projectDir, specPath} from './lib/paths.mts';
import {SCRIPT_SCHEMA} from './lib/script-schema.mts';
import {OFFLINE, callModel} from './lib/llm.mts';
import {CATALOG} from '../src/art/catalog.ts';
import {VECTOR_MANIFESTS} from '../src/art/vector/manifests.gen.ts';
import {fullForms} from '../src/dictionary.ts';
import {ALL_ART_PLAYS, DATA_PLAYS, isArtPlay} from '../src/playbooks.ts';
import {fixSpec} from './lib/fix.mts';
import {recordStage} from './lib/metrics.mts';
import {categorize} from './lib/categories.mts';
import {judgeRepair} from './lib/repair.mts';

type Video = {id: string; title?: string; source: string; pages?: [number, number]; outline?: string};
const [project, cmd = 'all', ...rest] = process.argv.slice(2);
if (!project) {
  console.error('usage: node scripts/batch.mts <project> plan|write|check|produce|translate|all [ids…]');
  process.exit(1);
}
const PD = projectDir(project);
const coursePath = join(PD, 'course.json');
const course = (): {videos: Video[]} => JSON.parse(readFileSync(coursePath, 'utf8'));
const ids = rest.filter((x) => !x.startsWith('-'));

/* ------------------------------------------------------------------ plan (no model call) */
function plan() {
  const src = join(PD, 'source');
  const pdfs = existsSync(src) ? readdirSync(src).filter((f) => /\.pdf$/i.test(f)).sort() : [];
  const prev = existsSync(coursePath) ? course().videos : [];
  const videos: Video[] = pdfs.map((f) => {
    const m = /M(\d{2})/i.exec(f);
    return prev.find((v) => v.source === f) ?? {id: m ? `M${m[1]}` : f.replace(/\.pdf$/i, '').replace(/\W+/g, '').slice(0, 8), source: f};
  });
  writeFileSync(coursePath, JSON.stringify({videos}, null, 2) + '\n');
  console.log(`course.json: ${videos.length} video(s) — ${videos.map((v) => `${v.id}←${v.source}`).join(', ')}`);
}

/* ------------------------------------------------------------------ the writer prompt */
const sourceText = (v: Video) => {
  const p = join(PD, 'source', v.source);
  if (!/\.pdf$/i.test(v.source)) return readFileSync(p, 'utf8');
  return execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', ...(v.pages ? ['-f', String(v.pages[0]), '-l', String(v.pages[1])] : []), p, '-'], {encoding: 'utf8', maxBuffer: 64 << 20});
};
// running headers/footers and blank runs cost tokens and carry nothing
const tidy = (t: string) => {
  const lines = t.split('\n').map((l) => l.replace(/\s+$/, ''));
  const freq = new Map<string, number>();
  for (const l of lines) if (l.trim()) freq.set(l.trim(), (freq.get(l.trim()) ?? 0) + 1);
  return lines.filter((l) => !(l.trim() && (freq.get(l.trim()) ?? 0) > 2 && l.trim().length < 120)).join('\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{3,}/g, '  ');
};
// the project's own illustrations (project.json `arts`); without a list, the whole imported library
const available = (cfg: any) => new Set(((cfg.arts as string[] | undefined) ?? Object.keys(VECTOR_MANIFESTS)).filter((n) => CATALOG[n]));
const arts = (cfg: any) => [...available(cfg)].map((n) => `- ${n}: ${CATALOG[n].doc}`).join('\n');
const playbooks = (cfg: any) => {
  const have = available(cfg);
  return [...ALL_ART_PLAYS.filter((p) => have.has(p.art)), ...DATA_PLAYS]
    .map((p) => `- ${p.id}: ${p.teaches}${isArtPlay(p) ? `\n    moments: ${p.moments.map((m) => `${m.slot}${m.optional ? '?' : ''} [${m.hint.join('/')}]`).join(' → ')}` : ''}`)
    .join('\n');
};
const fullFormsNote = (cfg: any) => {
  const f = {...fullForms(cfg.lang ?? 'en'), ...(cfg.fullForms ?? {})};
  return Object.keys(f).length ? `FULL FORMS (narration says these; the screen may abbreviate): ${Object.entries(f).map(([a, b]) => `${a} = ${b}`).join('; ')}` : '';
};
const brief = () => readFileSync(join(ROOT, 'docs', 'SCRIPT_BRIEF.md'), 'utf8');

function writerPrompt(v: Video) {
  const cfg = loadProject(project);
  const user = [
    `COURSE: ${cfg.name} — ${cfg.series}. Audience: clinical staff.`,
    `LESSON: id "${v.id}"${v.title ? `, title "${v.title}"` : ''}. outputFilename: "${(cfg.brand?.name ?? 'Lesson').replace(/\W+/g, '')}_${project.replace(/\W+/g, '_')}_${v.id}.mp4". module: "${v.title ?? v.id}".`,
    v.outline ? `OUTLINE: ${v.outline}` : '',
    // 5:00 at the voice's measured pace, less the sentence pauses and scene holds
    `TARGET: ~${Math.round(cfg.voice.wpm * 4.5)} narration words.`,
    `PLAYBOOKS:\n${playbooks(cfg)}`,
    `ILLUSTRATIONS (for explain/opener/summary when no playbook fits):\n${arts(cfg)}`,
    `REFERENCE LESSON (another module — match its depth and picture-first rhythm, never its facts):\n${readFileSync(join(ROOT, 'docs', 'EXEMPLAR_M01.json'), 'utf8')}`,
    cfg.lang && cfg.lang !== 'en' ? `LANGUAGE: narration and all on-screen text in native ${cfg.lang} script (numbers as digits).` : '',
    fullFormsNote(cfg),
    `SOURCE EXCERPT (the only allowed facts):\n<<<\n${tidy(sourceText(v)).slice(0, 60000)}\n>>>`,
  ].filter(Boolean).join('\n\n');
  return {system: brief(), user};
}
const llm = (system: string, user: string, tag: {id: string; role: string}) => callModel({project, tag, system, user, schema: SCRIPT_SCHEMA});

function write(only: string[]) {
  for (const v of course().videos.filter((x) => (only.length ? only.includes(x.id) : !existsSync(specPath(project, x.id))))) {
    const {system, user} = writerPrompt(v);
    const t0 = Date.now();
    let spec: any;
    try {
      spec = llm(system, user, {id: v.id, role: 'writer'});
    } catch (e) {
      // one bad lesson never stops the course; not being logged in does (every call would fail)
      if (/login/i.test(String(e))) throw e;
      console.log(`  ⛔ ${v.id}: writer failed — ${(e as Error).message.slice(0, 200)}`);
      continue;
    }
    mkdirSync(join(PD, 'specs'), {recursive: true});
    writeFileSync(specPath(project, v.id), JSON.stringify({...spec, id: v.id}, null, 2) + '\n');
    recordStage(project, v.id, 'write', {seconds: Math.round((Date.now() - t0) / 1000)});
    console.log(`  ✍️  ${v.id}: written in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
}

/* ------------------------------------------------------------------ check: gate → fixers → ≤1 repair */
const gate = (id: string) => {
  const r = spawnSync('node', ['scripts/preflight.mts', project, id], {cwd: ROOT, encoding: 'utf8'});
  const errs = (r.stdout + r.stderr).split('\n').filter((l) => l.includes('❌')).map((l) => l.trim());
  return {ok: r.status === 0 && !errs.length, errs};
};
const readSpecJSON = (id: string) => JSON.parse(readFileSync(specPath(project, id), 'utf8'));
/** Errors name compiled scenes (the automatic logo intro is scene[0]); map them back to the script's scenes. */
const failingScenes = (errs: string[], spec: any, cfg: any): number[] => {
  const shift = cfg.frame?.ident && spec.scenes?.[0]?.type !== 'ident' ? 1 : 0;
  return [...new Set(errs.flatMap((e) => [...e.matchAll(/scene\[(\d+)\]/g)].map((m) => +m[1] - shift)))].filter((i) => i >= 0 && i < (spec.scenes?.length ?? 0));
};
const save = (id: string, spec: any) => writeFileSync(specPath(project, id), JSON.stringify({...spec, id}, null, 2) + '\n');

function check(only: string[]) {
  const cfg = loadProject(project);
  const clean: string[] = [];
  for (const v of course().videos.filter((x) => existsSync(specPath(project, x.id)) && (!only.length || only.includes(x.id)))) {
    const t0 = Date.now();
    let g = gate(v.id);
    const firstPass = g.ok;
    const categories = [...new Set(g.errs.map(categorize))];
    const log: string[] = [];
    // deterministic fixers (no tokens), kept only when the gate proves them
    if (!g.ok) {
      const before = readSpecJSON(v.id);
      const r = fixSpec(before, cfg.lang, cfg.fullForms ?? {});
      if (JSON.stringify(r.spec) !== JSON.stringify(before)) {
        save(v.id, r.spec);
        const g2 = gate(v.id);
        if (judgeRepair(g, g2).verdict === 'rejected') save(v.id, before);
        else {
          log.push(...r.fixes.map((f) => `fix ${f.kind}: ${f.what}`));
          g = g2;
        }
      }
    }
    // model repairs, scoped to the failing scenes and kept only on proven progress; a second one
    // only after the first made progress (e.g. the script compiles again and reveals timing errors)
    for (let n = 0; n < 2 && !g.ok && !OFFLINE; n++) {
      const before = readSpecJSON(v.id);
      const bad = failingScenes(g.errs, before, cfg);
      const which = bad.length ? `scenes ${bad.join(', ')} (0-based)` : 'the script';
      let out: any;
      try {
        out = llm(writerPrompt(v).system, `Fix these build errors by rewriting ONLY ${which}; return the whole script. You may reword narration, re-order items or change a scene's screen type. Errors:\n${g.errs.join('\n')}\n\nSCRIPT:\n${JSON.stringify(before)}`, {id: v.id, role: `repair${n + 1}`});
      } catch (e) {
        if (/login/i.test(String(e))) throw e;
        log.push(`repair failed: ${(e as Error).message.slice(0, 120)}`);
        break;
      }
      // only the failing scenes are taken from the repair: a rewrite elsewhere would break what passed
      const merged = bad.length && out.scenes?.length === before.scenes.length ? {...before, scenes: before.scenes.map((s: any, i: number) => (bad.includes(i) ? out.scenes[i] : s))} : out;
      save(v.id, fixSpec(merged, cfg.lang, cfg.fullForms ?? {}).spec);
      const g2 = gate(v.id);
      const r = judgeRepair(g, g2);
      log.push(`repair: ${r.verdict}${r.why ? ` (${r.why})` : ''}`);
      if (r.verdict === 'rejected') {
        save(v.id, before);
        break;
      }
      g = g2;
    }
    recordStage(project, v.id, 'check', {seconds: Math.round((Date.now() - t0) / 1000), firstPass, ok: g.ok, categories, log, remaining: g.ok ? [] : [...new Set(g.errs.map(categorize))]});
    if (g.ok) clean.push(v.id);
    else console.log(`  ⛔ ${v.id}: set aside —\n     ${g.errs.slice(0, 6).join('\n     ')}`);
  }
  console.log(`check: ${clean.length} clean${clean.length ? ` (${clean.join(', ')})` : ''}`);
  return clean;
}

/* ------------------------------------------------------------------ translate */
function translate(lang: string, only: string[]) {
  const target = `${project}-${lang}`;
  const tdir = projectDir(target);
  if (!existsSync(join(tdir, 'project.json'))) {
    const {voice: _v, lexicon: _l, ...keep} = JSON.parse(readFileSync(join(PD, 'project.json'), 'utf8'));
    mkdirSync(join(tdir, 'specs'), {recursive: true});
    writeFileSync(join(tdir, 'project.json'), JSON.stringify({...keep, lang, output: {dir: `${keep.output?.dir ?? project}_${lang.toUpperCase()}`}}, null, 2) + '\n');
    execFileSync('ln', ['-s', join(PD, 'source'), join(tdir, 'source')]); // the same ledger grounds the translation
  }
  const system = `${brief()}\n\nTRANSLATION: return the SAME script with narration and all on-screen text (titles, kickers, labels, notes, flowchart node texts inside the mermaid, table cells, say words) in native ${lang} script. Keep structure, ids, arts, anchors, acts, mermaid syntax/ids and every number identical. Every say word must occur in the translated narration of its scene.`;
  for (const v of course().videos.filter((x) => existsSync(specPath(project, x.id)) && (!only.length || only.includes(x.id)))) {
    const out = llm(system, readFileSync(specPath(project, v.id), 'utf8'), {id: v.id, role: `translate-${lang}`});
    writeFileSync(join(tdir, 'specs', `${v.id}.json`), JSON.stringify({...out, id: v.id, outputFilename: out.outputFilename.replace(/\.mp4$/, `_${lang}.mp4`)}, null, 2) + '\n');
  }
}

/* ------------------------------------------------------------------ main */
if (cmd === 'plan') plan();
else if (cmd === 'write') write(ids);
else if (cmd === 'check') check(ids);
else if (cmd === 'translate') translate(rest[0], rest.slice(1));
else if (cmd === 'produce' || cmd === 'all') {
  if (cmd === 'all') {
    if (!existsSync(coursePath)) plan();
    write(ids);
  }
  const clean = check(ids);
  if (clean.length) spawnSync('node', ['scripts/produce.mts', project, ...clean], {cwd: ROOT, stdio: 'inherit'});
} else {
  console.error(`unknown command "${cmd}"`);
  process.exit(1);
}
