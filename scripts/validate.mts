/**
 * Pre-voice gate: everything that can be proven from the spec text alone.
 *
 *   node scripts/validate.mts <project> [ids…]          (npm run validate -- <project>)
 *
 *   shape      every scene matches its contract (src/spec.ts); figure data + anchors are
 *              checked against the art catalog (src/art/catalog.ts)
 *   rules      project.json rules: first/last scene type, required scene types; each
 *              `check` is followed by its `answer`
 *   sync       every word-anchored reveal will find its word in the narration (src/sync.ts);
 *              a miss would silently drift the visuals off the voice
 *   length     estimated runtime (voice.wpm + schedule overhead) inside project.length
 *
 * Exit 1 on any error. Warnings are worth reading; notes are informational.
 */
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, loadProject, parseArgs, specPath} from './lib/paths.mts';
import {CATALOG, calloutsFor} from '../src/art/catalog.ts';
import {syncProblems} from '../src/sync.ts';
import {compileSpec} from '../src/compile.ts';
import {BREATHE_RANGE, holds, holdsRange} from '../src/schedule.ts';
import {spoken} from '../src/project.ts';
import {screenWords, stageProblems} from '../src/stage.ts';

const COLORS = ['variable', 'constant', 'accent'];
const SCENE_TYPES = ['intro', 'hook', 'definition', 'steps', 'example', 'code', 'pseudocode', 'compare', 'mistake', 'recap', 'figure', 'check', 'answer', 'stage', 'outro', 'ident'];
/** An art's anchor names for the stage validator, or null when there is no such art. */
const artAnchors = (name: string, data: any): string[] | null => (CATALOG[name] ? CATALOG[name].anchors(data ?? {}) : null);
const visualProblems = (v: any): string[] => {
  if (!v) return [];
  if (!CATALOG[v.art]) return [`visual: unknown art "${v.art}"`];
  const anchors = new Set(CATALOG[v.art].anchors(v.data ?? {}));
  return [...CATALOG[v.art].check(v.data ?? {}).map((p) => `visual [${v.art}]: ${p}`), ...(v.act ?? []).filter((a: string) => !anchors.has(a)).map((a: string) => `visual.act "${a}" is not an anchor of ${v.art}`)];
};
/** Scenes whose narration is spoken over a picture that carries the explanation. */
const illustrated = (s: any) => s.type === 'stage' || (s.type === 'figure' && CATALOG[s.art]?.layout === 'side') || ((s.type === 'check' || s.type === 'answer') && !!s.visual);

type Issue = {id: string; level: 'error' | 'warn' | 'note'; msg: string};
const issues: Issue[] = [];
const err = (id: string, msg: string) => void issues.push({id, level: 'error', msg});
const warn = (id: string, msg: string) => void issues.push({id, level: 'warn', msg});
const note = (id: string, msg: string) => void issues.push({id, level: 'note', msg});

const isStr = (v: any) => typeof v === 'string';
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function checkScene(id: string, i: number, s: any) {
  const where = `scene[${i}] (${s?.type ?? '?'})`;
  if (!s || typeof s !== 'object') return err(id, `${where}: not an object`);
  if (!SCENE_TYPES.includes(s.type)) return err(id, `${where}: bad type "${s.type}"`);
  if (!isStr(s.kicker) || !s.kicker) err(id, `${where}: missing kicker`);
  if (s.type === 'ident') {
    if (s.narration) err(id, `${where}: an ident is silent (no narration)`);
    if (s.seconds !== undefined && !(s.seconds >= 2 && s.seconds <= 6)) err(id, `${where}: seconds must be 2–6`);
    return;
  }
  if (!isStr(s.narration) || words(s.narration) < 4) err(id, `${where}: narration too short/missing`);

  switch (s.type) {
    case 'intro':
      if (!isStr(s.topic)) err(id, `${where}: missing topic`);
      if (!isStr(s.subtitle)) err(id, `${where}: missing subtitle`);
      if (!Array.isArray(s.learn) || s.learn.length < 2) err(id, `${where}: needs >=2 learn bullets`);
      else if (s.learn.length > 4) warn(id, `${where}: ${s.learn.length} learn bullets (keep <=4)`);
      break;
    case 'hook':
      if (!isStr(s.headline)) err(id, `${where}: missing headline`);
      if (!isStr(s.question)) err(id, `${where}: missing question`);
      break;
    case 'definition':
      if (!isStr(s.term)) err(id, `${where}: missing term`);
      if (!isStr(s.plain)) err(id, `${where}: missing plain`);
      break;
    case 'steps':
      if (!Array.isArray(s.steps) || s.steps.length < 2) err(id, `${where}: needs >=2 steps`);
      else {
        if (s.steps.length > 6) warn(id, `${where}: ${s.steps.length} steps (keep <=6 for clarity)`);
        s.steps.forEach((st: any, k: number) => {
          if (!isStr(st.label)) err(id, `${where}.step[${k}]: missing label`);
        });
      }
      break;
    case 'example':
      if (!Array.isArray(s.boxes) || s.boxes.length < 1) err(id, `${where}: needs boxes`);
      else {
        if (s.boxes.length > 6) warn(id, `${where}: ${s.boxes.length} boxes (keep <=6)`);
        s.boxes.forEach((b: any, k: number) => {
          if (!isStr(b.label)) err(id, `${where}.box[${k}]: label must be string`);
          if (!isStr(b.value)) err(id, `${where}.box[${k}]: value must be string`);
          if (b.color && !COLORS.includes(b.color)) err(id, `${where}.box[${k}]: bad color "${b.color}"`);
        });
      }
      if (!Array.isArray(s.trace) || s.trace.length < 1) err(id, `${where}: needs trace`);
      else {
        if (s.trace.length > 8) warn(id, `${where}: ${s.trace.length} trace rows (keep <=8)`);
        const labels = new Set((s.boxes ?? []).map((b: any) => b.label));
        s.trace.forEach((r: any, k: number) => {
          if (!isStr(r.note)) err(id, `${where}.trace[${k}]: note must be string`);
          if (r.set) {
            for (const key of Object.keys(r.set)) {
              if (!labels.has(key)) err(id, `${where}.trace[${k}]: set targets unknown box "${key}"`);
              if (!isStr(r.set[key])) err(id, `${where}.trace[${k}]: set value must be string`);
            }
          }
          if (r.highlight && !labels.has(r.highlight)) err(id, `${where}.trace[${k}]: highlight unknown box "${r.highlight}"`);
        });
      }
      break;
    case 'pseudocode':
      if (!Array.isArray(s.lines) || s.lines.length < 2) err(id, `${where}: needs >=2 lines`);
      else if (s.lines.length > 9) warn(id, `${where}: ${s.lines.length} lines (keep <=9)`);
      if (s.lines && s.lines.some((l: any) => !isStr(l))) err(id, `${where}: all lines must be strings`);
      break;
    case 'code':
      if (!Array.isArray(s.lines) || s.lines.length < 1) err(id, `${where}: needs lines`);
      break;
    case 'compare':
      for (const side of ['left', 'right']) {
        const sd = s[side];
        if (!sd || !Array.isArray(sd.items)) err(id, `${where}: missing ${side}.items`);
        if (sd && sd.color && !COLORS.includes(sd.color)) err(id, `${where}: bad ${side}.color`);
      }
      break;
    case 'mistake':
      if (!s.wrong || !Array.isArray(s.wrong.lines)) err(id, `${where}: missing wrong.lines`);
      if (!s.right || !Array.isArray(s.right.lines)) err(id, `${where}: missing right.lines`);
      break;
    case 'figure': {
      const entry = CATALOG[s.art];
      if (!entry) {
        err(id, `${where}: unknown art "${s.art}" (have: ${Object.keys(CATALOG).join(', ')})`);
        break;
      }
      for (const p of entry.check(s.data ?? {})) err(id, `${where} [${s.art}]: ${p}`);
      if (s.callouts !== undefined && !Array.isArray(s.callouts)) err(id, `${where}: callouts must be an array`);
      const callouts = calloutsFor(s.art, s.data ?? {}, s.callouts);
      if (!callouts.length) err(id, `${where}: needs callouts (${s.art} has no data-derived callouts)`);
      const anchors = new Set(entry.anchors(s.data ?? {}));
      callouts.forEach((c: any, k: number) => {
        if (!anchors.has(c.anchor)) err(id, `${where}.callout[${k}]: anchor "${c.anchor}" not in ${s.art} (${[...anchors].join(', ')})`);
        if (typeof c.label !== 'string' || !c.label) err(id, `${where}.callout[${k}]: label missing`);
      });
      const max = entry.layout === 'side' ? 6 : 8;
      if (callouts.length > max) err(id, `${where}: ${callouts.length} callouts (max ${max} for a ${entry.layout} figure)`);
      break;
    }
    case 'check':
      if (!isStr(s.question)) err(id, `${where}: missing question`);
      for (const p of visualProblems(s.visual)) err(id, `${where}: ${p}`);
      break;
    case 'answer':
      if (!isStr(s.question) || !isStr(s.answer)) err(id, `${where}: needs question + answer`);
      if (s.points && s.points.length > 4) err(id, `${where}: ${s.points.length} points (max 4)`);
      for (const p of visualProblems(s.visual)) err(id, `${where}: ${p}`);
      break;
    case 'outro':
      if (s.line !== undefined && (!isStr(s.line) || s.line.length > 60)) err(id, `${where}: line must be ≤ 60 chars`);
      break;
    case 'stage':
      if (s.transition !== undefined && !['cut', 'pan', 'slide', 'portal', 'flood', 'zoomout'].includes(s.transition)) err(id, `${where}: transition must be cut|pan|slide|portal|flood|zoomout`);
      if (s.title !== undefined && (!isStr(s.title) || s.title.length > 60)) err(id, `${where}: title must be ≤ 60 chars`);
      for (const p of stageProblems(s, artAnchors)) err(id, `${where}: ${p}`);
      for (const l of s.world?.layers ?? []) if (CATALOG[l.art]) for (const p of CATALOG[l.art].check(l.data ?? {})) err(id, `${where} layer ${l.id} [${l.art}]: ${p}`);
      break;
    case 'recap':
      if (!Array.isArray(s.bullets) || s.bullets.length < 1) err(id, `${where}: needs bullets`);
      if (!isStr(s.takeaway)) err(id, `${where}: missing takeaway`);
      break;
  }
}

function checkSpec(project: string, id: string, seenFiles: Map<string, string>): {id: string; estMin: number} | void {
  let spec: any;
  try {
    spec = JSON.parse(readFileSync(specPath(project, id), 'utf8'));
  } catch (e) {
    return err(id, `invalid JSON: ${(e as Error).message}`);
  }
  const cfg = loadProject(project, spec);
  try {
    spec = compileSpec(spec, cfg.frame);
  } catch (e) {
    return err(id, `shorthand scene: ${(e as Error).message}`);
  }
  if (spec.id !== id) err(id, `id field "${spec.id}" != filename ${id}`);
  for (const k of ['title', 'outputFilename']) if (!isStr(spec[k]) || !spec[k]) err(id, `missing ${k}`);
  if (isStr(spec.outputFilename)) {
    if (!/^[\w.-]+\.mp4$/.test(spec.outputFilename)) err(id, `outputFilename "${spec.outputFilename}" must be a plain *.mp4 name (letters, digits, _ . -)`);
    if (seenFiles.has(spec.outputFilename)) err(id, `outputFilename also used by ${seenFiles.get(spec.outputFilename)}`);
    seenFiles.set(spec.outputFilename, id);
  }
  if (!Array.isArray(spec.scenes) || spec.scenes.length < 3) return err(id, 'needs a scenes array (≥3 scenes)');
  const types: string[] = spec.scenes.map((s: any) => s?.type);
  if (spec.clock !== undefined) {
    const {from, stop, to} = spec.clock ?? {};
    const n = spec.scenes.length;
    if (![from, stop, to].every((x) => Number.isInteger(x) && x >= 1 && x <= n) || !(from < stop && stop <= to)) err(id, `clock needs scene numbers 1–${n} with from < stop ≤ to`);
  }

  // project rules
  if (cfg.rules.first && types[0] !== cfg.rules.first) err(id, `first scene must be "${cfg.rules.first}" (is "${types[0]}")`);
  if (cfg.rules.last && types[types.length - 1] !== cfg.rules.last) err(id, `last scene must be "${cfg.rules.last}" (is "${types[types.length - 1]}")`);
  for (const group of cfg.rules.requireOneOf) if (!types.some((t) => group.includes(t))) err(id, `project rule: needs a ${group.join(' or ')} scene`);
  types.forEach((t, i) => {
    if (t === 'check' && types[i + 1] !== 'answer') err(id, `scene[${i}] check must be followed by its answer`);
    if (t === 'answer' && types[i - 1] !== 'check') err(id, `scene[${i}] answer must follow a check`);
    if (t === 'check' && types[i + 1] === 'answer' && spec.scenes[i].question !== spec.scenes[i + 1].question) warn(id, `scene[${i + 1}] answer.question differs from its check`);
  });

  const figs = types.filter((t) => t === 'figure' || t === 'stage').length;
  if (figs < cfg.rules.minFigures) err(id, `project rule: needs ≥${cfg.rules.minFigures} stage/figure scenes (pictures that teach), has ${figs}`);
  // variety: a run of three same-type scenes reads like slides
  for (let i = 2; i < types.length; i++) if (types[i] === types[i - 1] && types[i] === types[i - 2] && types[i] !== 'figure' && types[i] !== 'stage') warn(id, `scenes ${i - 2}–${i} are all "${types[i]}" — vary the visual form`);
  spec.scenes.forEach((s: any, i: number) => checkScene(id, i, s));

  // narration sync: only for well-formed scenes
  spec.scenes.forEach((s: any, i: number) => {
    if (!SCENE_TYPES.includes(s?.type) || !isStr(s?.narration)) return;
    try {
      for (const p of syncProblems(s)) (p.strict ? (cfg.rules.sync === 'warn' ? warn : err) : note)(id, `scene[${i}] (${s.type}) sync: ${p.msg} — reword the narration or add "say"`);
    } catch {
      /* shape errors already reported */
    }
  });

  // house standard v2: planned first; structure (tables, flowcharts) wherever it carries the idea
  const planFile = join(ROOT, 'projects', cfg.slug, 'plans', `${id}.md`);
  // `planExempt: "<reason>"` on a spec delivered before the rule (it is not re-planned retroactively)
  if (cfg.rules.requirePlan && !isStr(spec.planExempt)) {
    if (!existsSync(planFile)) err(id, `no lesson plan — write projects/${cfg.slug}/plans/${id}.md first (docs/PLAN_TEMPLATE.md)`);
    else {
      const plan = readFileSync(planFile, 'utf8');
      for (const h of ['Objectives', 'Source facts', 'Outline']) if (!new RegExp(`^##\\s+${h}`, 'mi').test(plan)) err(id, `lesson plan is missing its "## ${h}" section (docs/PLAN_TEMPLATE.md)`);
    }
  }
  const structured = spec.scenes.some((s: any) => s?.type === 'stage' && (s.world?.layers ?? []).some((l: any) => l?.art === 'table' || l?.art === 'graph'));
  if (cfg.rules.requirePlan && !structured) note(id, 'no table or flowchart in this lesson — fine only if the plan found none that carries an idea better than a picture');

  // picture-first: most of the narration is spoken over a picture, and the screen isn't a page of text
  const wc = (s: any) => (isStr(s?.narration) ? words(spoken(s.narration)) : 0);
  const allWords = spec.scenes.reduce((n: number, s: any) => n + wc(s), 0);
  const share = allWords ? spec.scenes.filter(illustrated).reduce((n: number, s: any) => n + wc(s), 0) / allWords : 0;
  if (cfg.rules.minIllustrated && share < cfg.rules.minIllustrated)
    err(id, `picture-first: ${Math.round(share * 100)}% of the narration is spoken over a picture (project needs ≥${Math.round(cfg.rules.minIllustrated * 100)}%) — teach with stage scenes`);
  if (cfg.rules.maxScreenWords)
    spec.scenes.forEach((s: any, i: number) => {
      if (s?.type !== 'stage') return;
      const n = screenWords(s.title, s.beats ?? []);
      if (n > cfg.rules.maxScreenWords) err(id, `scene[${i}] (stage): up to ${n} words on screen at once (max ${cfg.rules.maxScreenWords}) — shorten labels/notes, or pull back to the overview to clear labels`);
    });

  // runtime estimate: narration at the voice's measured pace + the schedule's breathing room
  const narr = spec.scenes.map((s: any) => (isStr(s?.narration) ? s.narration : ''));
  const identSec = spec.scenes.reduce((n: number, s: any) => n + (s?.type === 'ident' ? s.seconds ?? 3.2 : 0), 0);
  const totalWords = narr.reduce((n: number, t: string) => n + words(spoken(t)), 0);
  const pauses = narr.reduce((n: number, t: string) => n + (spoken(t).match(/[.!?…।॥]["')\]”’]*(\s|$)/g) ?? []).length * cfg.pacing.sentencePause + (t.match(/\[pause\]/gi) ?? []).length * cfg.pacing.beat, 0);
  const n = spec.scenes.length;
  // the schedule's own hold rules (src/schedule.ts), so estimates match what the render will do
  const overhead = cfg.pacing.breathe * holds(types as any).reduce((a, [l, t]) => a + l + t, 0);
  const estMin = (totalWords / cfg.voice.wpm) + pauses / 60 + overhead / 30 / 60;
  const fmt = (m: number) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
  const exact = cfg.length.exact;
  if (exact) {
    // exact-length projects: holds are solved to hit `exact`; the narration must fit at a comfortable pace
    const voMin = totalWords / cfg.voice.wpm + pauses / 60 + identSec / 60;
    const holdMin = overhead / cfg.pacing.breathe / 1800; // holds at ×1
    const fit = (exact / 60 - voMin) / holdMin;
    const wordsAt = (b: number) => Math.round((exact / 60 - holdMin * b - pauses / 60 - identSec / 60) * cfg.voice.wpm);
    const [bmin, bmax] = holdsRange(cfg);
    if (fit < bmin || fit > bmax) err(id, `narration can't fill exactly ${fmt(exact / 60)}: holds would be ×${fit.toFixed(2)} (comfortable ${bmin}–${bmax}) — aim for ${wordsAt(bmax)}–${wordsAt(bmin)} words (have ${totalWords})`);
    console.log(`  ⏱  ${id}: exactly ${fmt(exact / 60)} · ${totalWords} narration words → holds ×${fit.toFixed(2)} · fits at ${wordsAt(bmax)}–${wordsAt(bmin)} words (house pace ≈ ${wordsAt(cfg.pacing.breathe)})`);
    return {id, estMin: exact / 60};
  }
  const [lo, hi] = cfg.length.minutes;
  const wordsFor = (m: number) => Math.round((m - overhead / 1800 - pauses / 60) * cfg.voice.wpm);
  if (estMin < lo - 0.15 || estMin > hi + 0.15) warn(id, `estimated ${fmt(estMin)} (${totalWords} words at ${cfg.voice.wpm} wpm) — target ${lo}–${hi} min ≈ ${wordsFor(estMin < lo ? lo + 0.1 : hi - 0.1)} words`);
  // 5:00 is the house standard; longer only when the plan says why (owner, 2026-10-03)
  const planPath = join(ROOT, 'projects', cfg.slug, 'plans', `${id}.md`);
  const lengthWhy = existsSync(planPath) && /##\s*Length[\s\S]*?\b(because|needs?|requires?)\b/i.test(readFileSync(planPath, 'utf8'));
  if (hi > 5 && estMin > 5.75 && !lengthWhy) warn(id, `estimated ${fmt(estMin)} — longer than the 5:00 standard; tighten to ≈ ${wordsFor(5)} words, or say in the plan's "## Length" why the subject needs it`);
  // always shown: authors trim or extend against this instead of hunting for it
  console.log(`  ⏱  ${id}: est ${fmt(estMin)} · ${totalWords} narration words · standard 5:00 ≈ ${wordsFor(5)} words · allowed ${lo}–${hi} min`);
  return {id, estMin};
}

const {project, ids} = parseArgs();
const seen = new Map<string, string>();
const est: {id: string; estMin: number}[] = [];
for (const id of ids) {
  if (!existsSync(specPath(project, id))) {
    err(id, 'spec file missing');
    continue;
  }
  const r = checkSpec(project, id, seen);
  if (r && typeof r === 'object') est.push(r);
}
const icon = {error: '❌', warn: '⚠️ ', note: 'ℹ️ '};
for (const it of issues.filter((i) => i.level !== 'note' || process.argv.includes('--notes'))) console.log(`  ${icon[it.level]} ${it.id}: ${it.msg}`);
const count = (l: Issue['level']) => issues.filter((i) => i.level === l).length;
const avg = est.length ? est.reduce((a, b) => a + b.estMin, 0) / est.length : 0;
console.log(`\n${project}: ${ids.length} spec(s) — ${count('error')} error(s), ${count('warn')} warning(s), ${count('note')} note(s)${count('note') ? ' (--notes to show)' : ''}. Avg est. runtime ${avg.toFixed(1)} min.`);

process.exit(count('error') > 0 ? 1 : 0);
