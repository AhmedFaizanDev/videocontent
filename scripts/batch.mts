/**
 * Bulk production: a course of module PDFs → finished, QA'd videos: a writer call and an editor
 * call per video, deterministic fixers, at most three escalating repairs and a deterministic
 * fallback — no agent loops, no human checkpoint, and no render until a script is proven correct.
 *
 *   node scripts/batch.mts <project> plan                  course.json from source/*.pdf (one video per
 *                                                          module PDF; no model call). Edit to split/merge.
 *   node scripts/batch.mts <project> visuals                the illustrations the course needs: reuse →
 *                                                          search → judge → ingest → playbooks (scripts/visuals.mts)
 *   node scripts/batch.mts <project> write [ids…]          write missing scripts — one call each
 *   node scripts/batch.mts <project> check [ids…]          validate + preflight (no audio, no render);
 *                                                          failures: deterministic fixers → fallback
 *                                                          treatment → up to 3 escalating repairs
 *   node scripts/batch.mts <project> produce [ids…]        voice → render → QA for every clean script
 *   node scripts/batch.mts <project> translate <lang> [ids…]   native-language copies into <project>-<lang>
 *   node scripts/batch.mts <project> all                   plan → visuals → write → check → produce
 *
 * Writer: headless Claude Code (`claude -p`, Sonnet, no tools, JSON-schema output) when it is
 * logged in (CLAUDE_BIN overrides the binary); otherwise "agent mode": job files are written to
 * projects/<p>/jobs/ and the orchestrating Claude session runs one Sonnet subagent per job
 * ("run the jobs in projects/<p>/jobs"), then `check` continues. Same prompts either way.
 *
 * Each job carries only: the script brief (docs/SCRIPT_BRIEF.md), the arts it may use, and its
 * own module's source text — never the whole repo, the guide or other lessons.
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {ROOT, loadProject, projectDir, specPath} from './lib/paths.mts';
import {SCRIPT_SCHEMA} from './lib/script-schema.mts';
import {OFFLINE, callModel, cli, writeJob} from './lib/llm.mts';
import {CATALOG} from '../src/art/catalog.ts';
import {VECTOR_MANIFESTS} from '../src/art/vector/manifests.gen.ts';
import {fullForms} from '../src/dictionary.ts';
import {ALL_ART_PLAYS, DATA_PLAYS, isArtPlay} from '../src/playbooks.ts';
import {fixSpec} from './lib/fix.mts';
import {simplify} from './lib/simplify.mts';
import {recordStage} from './lib/metrics.mts';
import {categorize} from './lib/categories.mts';

type Video = {id: string; title?: string; source: string; pages?: [number, number]; outline?: string};
const [project, cmd = 'all', ...rest] = process.argv.slice(2);
if (!project) {
  console.error('usage: node scripts/batch.mts <project> plan|write|check|produce|translate|all [ids…]');
  process.exit(1);
}
const PD = projectDir(project);
const coursePath = join(PD, 'course.json');
const jobs = join(PD, 'jobs');
const course = (): {videos: Video[]} => JSON.parse(readFileSync(coursePath, 'utf8'));

/* ------------------------------------------------------------------ plan (no model call) */
function plan() {
  const src = join(PD, 'source');
  const pdfs = existsSync(src) ? readdirSync(src).filter((f) => /\.pdf$/i.test(f)).sort() : [];
  const prev = existsSync(coursePath) ? course().videos : [];
  const videos: Video[] = pdfs.map((f) => {
    const m = /M(\d{2})/i.exec(f);
    const id = m ? `M${m[1]}` : f.replace(/\.pdf$/i, '').replace(/\W+/g, '').slice(0, 8);
    return prev.find((v) => v.source === f) ?? {id, source: f};
  });
  writeFileSync(coursePath, JSON.stringify({videos}, null, 2) + '\n');
  console.log(`course.json: ${videos.length} video(s) — ${videos.map((v) => `${v.id}←${v.source}`).join(', ')}`);
}

/* ------------------------------------------------------------------ prompts */
const sourceText = (v: Video) => {
  const p = join(PD, 'source', v.source);
  if (/\.pdf$/i.test(v.source)) {
    const args = ['-enc', 'UTF-8', '-layout', ...(v.pages ? ['-f', String(v.pages[0]), '-l', String(v.pages[1])] : []), p, '-'];
    return execFileSync('pdftotext', args, {encoding: 'utf8', maxBuffer: 64 << 20});
  }
  return readFileSync(p, 'utf8');
};
// compact: running headers/footers and blank runs cost tokens and carry nothing
const tidy = (t: string) => {
  const lines = t.split('\n').map((l) => l.replace(/\s+$/, ''));
  const freq = new Map<string, number>();
  for (const l of lines) if (l.trim()) freq.set(l.trim(), (freq.get(l.trim()) ?? 0) + 1);
  return lines.filter((l) => !(l.trim() && (freq.get(l.trim()) ?? 0) > 2 && l.trim().length < 120)).join('\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{3,}/g, '  ');
};
const arts = (cfg: any) => {
  const names = [...new Set([...Object.keys(VECTOR_MANIFESTS), ...((cfg.arts as string[]) ?? [])])].filter((n) => CATALOG[n]);
  return names.map((n) => `- ${n}: ${CATALOG[n].doc}`).join('\n');
};
const brief = () => readFileSync(join(ROOT, 'docs', 'SCRIPT_BRIEF.md'), 'utf8');
/** The playbook catalogue as the writer sees it: what each teaches, its moments and their hint words. */
const playbooks = (cfg: any) => {
  const have = new Set([...Object.keys(VECTOR_MANIFESTS), ...((cfg.arts as string[]) ?? [])]);
  return [...ALL_ART_PLAYS.filter((p) => have.has(p.art)), ...DATA_PLAYS]
    .map((p) => `- ${p.id}: ${p.teaches}${isArtPlay(p) ? `\n    moments in order: ${p.moments.map((m) => `${m.slot}${m.optional ? '?' : ''} [${m.hint.join('/')}]`).join(' → ')}` : ''}`)
    .join('\n');
};
/** The course's visual plan (scripts/visuals.mts) for this lesson: which illustration teaches what. */
const visualPlanNote = (id: string) => {
  const f = join(PD, 'visual-plan.json');
  if (!existsSync(f)) return '';
  const mine = JSON.parse(readFileSync(f, 'utf8')).concepts.filter((c: any) => c.lessons.includes(id) && c.status === 'verified' && c.art);
  return mine.length ? `VISUAL PLAN — this lesson must teach these on their illustrations (use their playbooks):\n${mine.map((c: any) => `- ${c.what} → art ${c.art}: ${c.teaches}`).join('\n')}` : '';
};
/** The reference lesson in playbook form: the quality bar, shown rather than described. */
const exemplar = () => readFileSync(join(ROOT, 'docs', 'EXEMPLAR_M01.json'), 'utf8');
const editorBrief = () => `${readFileSync(join(ROOT, 'docs', 'EDITOR_BRIEF.md'), 'utf8')}\n\n${brief()}`;
const fullFormsNote = (cfg: any) => {
  const f = {...fullForms(cfg.lang ?? 'en'), ...(cfg.fullForms ?? {})};
  return Object.keys(f).length ? `FULL FORMS (say these in narration; the abbreviation may appear on screen):\n${Object.entries(f).map(([a, b]) => `${a} = ${b}`).join('; ')}` : '';
};
const lexiconNote = (cfg: any) => (cfg.lang === 'en' ? '' : `\nLANGUAGE: write the narration and all on-screen text in native ${cfg.lang} script (numbers as digits).`);

function writerPrompt(v: Video) {
  const cfg = loadProject(project);
  const user = [
    `COURSE: ${cfg.name} — ${cfg.series}. Audience: clinical staff.`,
    `LESSON: id "${v.id}"${v.title ? `, title "${v.title}"` : ''}. outputFilename: "${(cfg.brand?.name ?? 'Lesson').replace(/\W+/g, '')}_${project.replace(/\W+/g, '_')}_${v.id}.mp4". module: "${v.title ?? v.id}".`,
    v.outline ? `OUTLINE: ${v.outline}` : '',
    visualPlanNote(v.id),
    `PLAYBOOKS (prefer these):\n${playbooks(cfg)}`,
    `AVAILABLE ARTS (for explain/compositions when no playbook fits):\n${arts(cfg)}`,
    `REFERENCE LESSON — the quality bar (another module; match its depth, picture-first teaching and pacing, never its facts):\n${exemplar()}`,
    lexiconNote(cfg),
    fullFormsNote(cfg),
    `SOURCE EXCERPT (the only allowed facts):\n<<<\n${tidy(sourceText(v)).slice(0, 60000)}\n>>>`,
  ].filter(Boolean).join('\n\n');
  return {system: brief(), user};
}

/* ------------------------------------------------------------------ the writer (scripts/lib/llm.mts) */
const llm = (system: string, user: string, tag: {id: string; role: string}): any | null => callModel({project, tag, system, user, schema: SCRIPT_SCHEMA});
const job = (name: string, system: string, user: string, target: string, editor = false) =>
  writeJob({project, name, tag: {id: name, role: 'job'}, system, user, schema: SCRIPT_SCHEMA, target, preface: editor ? 'Write the script, then edit your own draft against the editor rubric below (a second, critical pass).' : '', extra: editor ? `\n\n## Editor rubric (second pass)\n${readFileSync(join(ROOT, 'docs', 'EDITOR_BRIEF.md'), 'utf8')}` : ''});
const cliOk = () => cli.ok;

function write(ids: string[]) {
  const vids = course().videos.filter((v) => (ids.length ? ids.includes(v.id) : !existsSync(specPath(project, v.id))));
  for (const v of vids) {
    const {system, user} = writerPrompt(v);
    const t0 = Date.now();
    const draft = llm(system, user, {id: v.id, role: 'writer'});
    if (draft) {
      // the editor pass: depth, precision, picture fit, variety — the whole script back, improved
      const edited = llm(editorBrief(), `${user.slice(user.indexOf('PLAYBOOKS'))}\n\nDRAFT:\n${JSON.stringify(draft)}`, {id: v.id, role: 'editor'});
      writeFileSync(specPath(project, v.id), JSON.stringify({...(edited ?? draft), id: v.id}, null, 2) + '\n');
      recordStage(project, v.id, 'write', {seconds: Math.round((Date.now() - t0) / 1000), edited: !!edited});
      console.log(`  ✍️  ${v.id}: written + edited in ${Math.round((Date.now() - t0) / 1000)} s`);
    } else console.log(`  📝 ${v.id}: job → ${job(v.id, system, user, specPath(project, v.id), true).replace(ROOT + '/', '')}`);
  }
}

/* ------------------------------------------------------------------ check: fixers → repairs → fallback */
const gate = (id: string) => {
  const r = spawnSync('node', ['scripts/preflight.mts', project, id], {cwd: ROOT, encoding: 'utf8'});
  const errs = (r.stdout + r.stderr).split('\n').filter((l) => l.includes('❌')).map((l) => l.trim());
  return {ok: r.status === 0 && !errs.length, errs};
};
const readJSON = (id: string) => JSON.parse(readFileSync(specPath(project, id), 'utf8'));
const save = (id: string, spec: any) => writeFileSync(specPath(project, id), JSON.stringify({...spec, id}, null, 2) + '\n');
/** Errors name compiled scenes (with the automatic logo intro first); map back to the script's scenes. */
const failingScenes = (errs: string[], spec: any) => {
  const shift = loadProject(project).frame?.ident && spec.scenes?.[0]?.type !== 'ident' ? 1 : 0;
  return [...new Set(errs.flatMap((e) => [...e.matchAll(/scene\[(\d+)\]/g)].map((m) => +m[1] - shift)).filter((i) => i >= 0 && i < (spec.scenes?.length ?? 0)))];
};

function check(ids: string[]) {
  const vids = course().videos.filter((v) => existsSync(specPath(project, v.id)) && (!ids.length || ids.includes(v.id)));
  const clean: string[] = [];
  for (const v of vids) {
    const t0 = Date.now();
    const cfg = loadProject(project);
    let g = gate(v.id);
    const firstPass = g.ok;
    const categories = [...new Set(g.errs.map(categorize))];
    let fixes: string[] = [];
    let repairs = 0;
    let fallback: number[] = [];
    let pending = false;
    // 1 deterministic fixers (no tokens)
    if (!g.ok) {
      const r = fixSpec(readJSON(v.id), cfg.lang, cfg.fullForms ?? {});
      if (r.fixes.length) {
        save(v.id, r.spec);
        fixes = r.fixes.map((f) => `${f.kind}: ${f.what}`);
        g = gate(v.id);
      }
    }
    // 2 fallback (deterministic, zero tokens, same narration): a composition failing on layout
    // or legibility is re-expressed as its densest element full screen
    if (!g.ok) {
      const spec = readJSON(v.id);
      // only what a simpler screen can cure: layout, legibility, element errors
      const curable = g.errs.filter((e) => ['tiny-text', 'overflow', 'collision', 'layout', 'schema'].includes(categorize(e)));
      fallback = failingScenes(curable, spec).filter((i) => spec.scenes[i]?.type === 'scene');
      if (fallback.length) {
        save(v.id, {...spec, scenes: spec.scenes.map((s: any, i: number) => (fallback.includes(i) ? simplify(s) : s))});
        const g2 = gate(v.id);
        // kept only if it helps: no new kind of error, fewer errors
        const was = new Set(g.errs.map(categorize));
        if (g2.errs.length < g.errs.length && g2.errs.every((e) => was.has(categorize(e)))) g = g2;
        else {
          save(v.id, spec);
          fallback = [];
        }
      }
    }
    // 3 escalating repairs: the script with its errors → again, rethinking → only the failing scenes
    const {system} = writerPrompt(v);
    while (!g.ok && repairs < 3 && !OFFLINE) {
      repairs++;
      const spec = readJSON(v.id);
      const bad = failingScenes(g.errs, spec);
      const user =
        repairs < 3 || !bad.length
          ? `${repairs > 1 ? 'A previous repair did not clear these errors. Rethink the failing scenes (reword, re-order, or choose a different screen for the idea) rather than patching words. ' : ''}Fix ONLY these build errors in the script below; keep everything else identical. Errors:\n${g.errs.join('\n')}\n\nSCRIPT:\n${JSON.stringify(spec)}`
          : `Rewrite ONLY scenes ${bad.join(', ')} (0-based) of the script so these errors clear — same facts, same narration length; you may change the screen type. Return the complete script. Errors:\n${g.errs.join('\n')}\n\nSCRIPT:\n${JSON.stringify(spec)}`;
      const out = llm(system, user, {id: v.id, role: `repair${repairs}`});
      if (!out) {
        if (cliOk() === false && !OFFLINE) {
          console.log(`  📝 ${v.id}: repair job → ${job(`${v.id}.repair${repairs}`, system, user, specPath(project, v.id)).replace(ROOT + '/', '')}`);
          pending = true;
        }
        break;
      }
      save(v.id, fixSpec(out, cfg.lang, cfg.fullForms ?? {}).spec);
      g = gate(v.id);
    }
    if (!pending)
      recordStage(project, v.id, 'check', {seconds: Math.round((Date.now() - t0) / 1000), firstPass, ok: g.ok, categories, fixes, repairs, fallback, remaining: g.ok ? [] : [...new Set(g.errs.map(categorize))]});
    if (g.ok) clean.push(v.id);
    else if (!pending) console.log(`  ⛔ ${v.id}: set aside after fixers, ${repairs} repair(s) and fallback —\n     ${g.errs.slice(0, 6).join('\n     ')}`);
  }
  console.log(`check: ${clean.length}/${vids.length} clean${clean.length ? ` (${clean.join(', ')})` : ''}`);
  return clean;
}

/* ------------------------------------------------------------------ translate */
function translate(lang: string, ids: string[]) {
  const target = `${project}-${lang}`;
  const tdir = projectDir(target);
  if (!existsSync(join(tdir, 'project.json'))) {
    const p = JSON.parse(readFileSync(join(PD, 'project.json'), 'utf8'));
    mkdirSync(join(tdir, 'specs'), {recursive: true});
    const {voice: _v, lexicon: _l, ...keep} = p;
    writeFileSync(join(tdir, 'project.json'), JSON.stringify({...keep, lang, output: {dir: `${p.output?.dir ?? project}_${lang.toUpperCase()}`}}, null, 2) + '\n');
    // the same source ledger grounds the translation
    execFileSync('ln', ['-s', join(PD, 'source'), join(tdir, 'source')]);
  }
  const system = `${brief()}\n\nTRANSLATION: return the SAME script with narration and all on-screen text (titles, kickers, labels, notes, flowchart node texts inside the mermaid, table cells, say words) in native ${lang} script. Keep structure, ids, arts, anchors, acts, mermaid syntax/ids and every number identical. Every say word must occur in the translated narration of its scene.`;
  for (const v of course().videos.filter((x) => existsSync(specPath(project, x.id)) && (!ids.length || ids.includes(x.id)))) {
    const out = llm(system, readFileSync(specPath(project, v.id), 'utf8'), {id: v.id, role: `translate-${lang}`});
    const dst = join(tdir, 'specs', `${v.id}.json`);
    if (out) writeFileSync(dst, JSON.stringify({...out, id: v.id, outputFilename: out.outputFilename.replace(/\.mp4$/, `_${lang}.mp4`)}, null, 2) + '\n');
    else console.log(`  📝 ${v.id}: translation job → ${job(`${v.id}.${lang}`, system, readFileSync(specPath(project, v.id), 'utf8'), dst).replace(ROOT + '/', '')}`);
  }
}

const ids = rest.filter((x) => !x.startsWith('-'));
if (cmd === 'plan') plan();
else if (cmd === 'visuals') spawnSync('node', ['scripts/visuals.mts', project, ...rest], {cwd: ROOT, stdio: 'inherit'});
else if (cmd === 'write') write(ids);
else if (cmd === 'check') check(ids);
else if (cmd === 'translate') translate(rest[0], rest.slice(1));
else if (cmd === 'produce' || cmd === 'all') {
  if (cmd === 'all') {
    if (!existsSync(coursePath)) plan();
    // source first: the illustrations the course needs are acquired before any script is written
    spawnSync('node', ['scripts/visuals.mts', project], {cwd: ROOT, stdio: 'inherit'});
    write(ids);
  }
  const clean = check(ids);
  if (clean.length) spawnSync('node', ['scripts/produce.mts', project, ...clean], {cwd: ROOT, stdio: 'inherit'});
}
