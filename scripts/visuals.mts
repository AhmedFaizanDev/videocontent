/**
 * The visuals stage — source first, automatically, for any subject (owner, 2026-10-04):
 *
 *   understand the lessons → decide the illustrations they need → reuse the library → search
 *   authoritative sources for what is missing → judge the candidates → ingest + register the
 *   best → author its teaching playbooks (Opus, once) → verify the labels → the writer composes.
 *
 *   node scripts/visuals.mts <project>            run every step that can run (resumable)
 *   node scripts/visuals.mts <project> --report   show the plan
 *
 * State: projects/<p>/visual-plan.json — one entry per concept:
 *   {id, what, teaches, parts, queries, lessons, decision: reuse|acquire|draw|chart, art?, status, …}
 * status: planned → searched → chosen → ingested → authored → verified  (or: none → fallback)
 * Model steps run headless (scripts/lib/llm.mts) or, in agent mode, become job files in
 * projects/<p>/jobs/ (visuals.*.md) — run them, then run this again; it continues where it stopped.
 * Fallback when no candidate passes: `draw` (a code-drawn pack via the art-author agent) when the
 * concept needs a picture; otherwise `chart` (the lesson teaches it with flowcharts/tables).
 * Credits for every acquired asset go to the course's CREDITS.md (scripts/credits.mts).
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, projectDir} from './lib/paths.mts';
import {callModel, cli, writeJob} from './lib/llm.mts';
import {VECTOR_MANIFESTS} from '../src/art/vector/manifests.gen.ts';
import {ALL_ART_PLAYS, DATA_PLAYS} from '../src/playbooks.ts';

const [project, ...flags] = process.argv.slice(2);
if (!project) {
  console.error('usage: node scripts/visuals.mts <project> [--report]');
  process.exit(1);
}
const PD = projectDir(project);
const planPath = join(PD, 'visual-plan.json');
const jobsDir = join(PD, 'jobs');
const STAGE = join(ROOT, 'iterations', 'visuals', project);
type Concept = {
  id: string;
  what: string;
  teaches: string;
  parts: string[];
  queries: string[];
  lessons: string[];
  decision?: 'reuse' | 'acquire' | 'draw' | 'chart';
  art?: string;
  status?: string;
  candidates?: {n: number; source: string; id: string; title: string; licence: string; dir: string; preview: string; score: number}[];
  choice?: {n: number; reason: string; scores?: any};
  reason?: string;
  broadened?: boolean;
};
type Plan = {concepts: Concept[]};
const readPlan = (): Plan | null => (existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf8')) : null);
const savePlan = (p: Plan) => writeFileSync(planPath, JSON.stringify(p, null, 2) + '\n');
const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
const camel = (s: string) => s.replace(/[^A-Za-z0-9]+(.)?/g, (_: string, c: string) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toLowerCase());
/** A model step: headless, or a job file (returns null and the caller stops until it is run). */
const ask = (name: string, call: Omit<Parameters<typeof callModel>[0], 'project'>, target: string) => {
  if (existsSync(target)) return JSON.parse(readFileSync(target, 'utf8'));
  const out = callModel({project, ...call});
  if (out) {
    mkdirSync(join(target, '..'), {recursive: true});
    writeFileSync(target, JSON.stringify(out, null, 2));
    return out;
  }
  const f = writeJob({project, ...call, name, target});
  console.log(`  📝 job → ${f.replace(ROOT + '/', '')}`);
  return null;
};
const answers = join(STAGE, 'answers');

/* ------------------------------------------------------------------ 1 needs: what must be shown */
const library = () =>
  Object.values(VECTOR_MANIFESTS as Record<string, any>)
    .map((m) => `- ${m.key}: ${String(m.doc).slice(0, 300)}${ALL_ART_PLAYS.some((p) => p.art === m.key) ? `\n    playbooks: ${ALL_ART_PLAYS.filter((p) => p.art === m.key).map((p) => `${p.id} (${p.teaches.slice(0, 90)})`).join('; ')}` : ''}`)
    .join('\n');
const NEEDS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    concepts: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {type: 'string', pattern: '^[a-z][a-zA-Z0-9]{2,30}$'},
          what: {type: 'string', maxLength: 200},
          teaches: {type: 'string', maxLength: 240},
          parts: {type: 'array', maxItems: 12, items: {type: 'string', maxLength: 40}},
          queries: {type: 'array', minItems: 2, maxItems: 5, items: {type: 'string', maxLength: 40}},
          lessons: {type: 'array', items: {type: 'string', maxLength: 12}},
          reuse: {type: 'string', maxLength: 40},
        },
        required: ['id', 'what', 'teaches', 'parts', 'queries', 'lessons', 'reuse'],
      },
    },
  },
  required: ['concepts'],
};
const NEEDS_SYSTEM = `You plan the illustrations for a course of narrated medical explainer videos for clinical staff.
Read the lessons' source material and list the ILLUSTRATIONS the course needs: physical things a
viewer must SEE to understand — anatomy, a device and its parts, an instrument, equipment, a
mechanism inside a structure. Not processes, steps, comparisons, numbers or decisions: those are
taught with flowcharts and tables, which the house already has — do not list them.
For each illustration: an id (camelCase), what it must show (the object and view), what it
teaches, the parts a lesson will name on it (as the source names them), 2–5 search queries an
illustration library would match — short plain titles: the device AND the procedure name
("endoscope", "endoscopy"), the equipment category ("endoscopy equipment"), the body region,
the lesson ids that need it, and reuse: the key of a LIBRARY asset that already shows it well,
or "" if none does. At most 8, most important first; prefer one versatile illustration over
several near-duplicates.`;

function needs(): Plan | null {
  const plan = readPlan();
  if (plan) return plan;
  const course = JSON.parse(readFileSync(join(PD, 'course.json'), 'utf8')) as {videos: {id: string; title?: string; source: string; pages?: [number, number]}[]};
  const text = (v: (typeof course.videos)[number]) => {
    const p = join(PD, 'source', v.source);
    const t = /\.pdf$/i.test(v.source) ? execFileSync('pdftotext', ['-enc', 'UTF-8', ...(v.pages ? ['-f', String(v.pages[0]), '-l', String(v.pages[1])] : []), p, '-'], {encoding: 'utf8', maxBuffer: 64 << 20}) : readFileSync(p, 'utf8');
    return t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  };
  const per = Math.floor(60000 / Math.max(1, course.videos.length));
  const user = [`LIBRARY (already acquired, with their teaching playbooks):\n${library() || '(empty)'}`, ...course.videos.map((v) => `LESSON ${v.id}${v.title ? ` — ${v.title}` : ''}:\n<<<\n${text(v).slice(0, per)}\n>>>`)].join('\n\n');
  const out = ask('visuals.needs', {tag: {id: 'course', role: 'visual-needs'}, system: NEEDS_SYSTEM, user, schema: NEEDS_SCHEMA}, join(answers, 'needs.json'));
  if (!out) return null;
  const p: Plan = {
    concepts: out.concepts.map((c: any) => {
      const reuse = c.reuse && VECTOR_MANIFESTS[c.reuse] ? c.reuse : '';
      return {...c, reuse: undefined, decision: reuse ? 'reuse' : 'acquire', ...(reuse ? {art: reuse, status: 'verified'} : {status: 'planned'})};
    }),
  };
  savePlan(p);
  console.log(`  🧭 ${p.concepts.length} illustration(s) needed: ${p.concepts.map((c) => `${c.id}${c.decision === 'reuse' ? ` = ${c.art}` : ''}`).join(', ')}`);
  return p;
}

/* ------------------------------------------------------------------ 2 search + stage candidates */
async function search(c: Concept) {
  const {searchAll, fetchHit} = await import('./find-assets.mts');
  const words = new Set(`${c.what} ${c.parts.join(' ')} ${c.queries.join(' ')}`.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const seen = new Map<string, any>();
  for (const q of c.queries) for (const h of await searchAll(q)) seen.set(`${h.source}:${h.id}`, h);
  // pre-score: licence, a vector source (animatable parts) over a raster, title words that name the concept
  const scored = [...seen.values()]
    .filter((h) => h.rank < 2)
    .map((h) => ({h, score: (2 - h.rank) * 2 + (h.source === 'bioart' ? 2 : h.source === 'commons' ? 1 : 1) + h.title.toLowerCase().split(/\W+/).filter((w: string) => words.has(w)).length * 3}))
    .filter((x) => x.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  c.candidates = [];
  mkdirSync(join(STAGE, c.id), {recursive: true});
  for (const {h, score} of scored) {
    const n = c.candidates.length + 1;
    const dir = `_cand-${kebab(c.id)}-${n}`;
    try {
      await fetchHit(h, dir);
      // a preview to judge by: macOS renders the SVG (QuickLook), then a fixed size
      const src = join(ROOT, 'assets', 'vector', dir, 'source.svg');
      execFileSync('qlmanage', ['-t', '-s', '900', '-o', join(STAGE, c.id), src], {stdio: 'ignore'});
      const preview = join(STAGE, c.id, `${n}.png`);
      renameSync(join(STAGE, c.id, 'source.svg.png'), preview);
      c.candidates.push({n, source: h.source, id: h.id, title: h.title, licence: h.licence, dir, preview, score});
    } catch (e) {
      console.log(`     (skipped ${h.source}:${h.id}: ${(e as Error).message.split('\n')[0]})`);
      rmSync(join(ROOT, 'assets', 'vector', dir), {recursive: true, force: true});
    }
  }
  c.status = c.candidates.length ? 'searched' : c.broadened ? 'none' : 'broaden';
  console.log(`  🔎 ${c.id}: ${c.candidates.length} candidate(s) staged${c.candidates.length ? '' : ' — none usable'}`);
}

/* ------------------------------------------------------------------ 2b broaden: nothing found → ask for wider queries once */
const BROADEN_SCHEMA = {type: 'object', additionalProperties: false, properties: {queries: {type: 'array', minItems: 3, maxItems: 8, items: {type: 'string', maxLength: 40}}}, required: ['queries']};
function broaden(c: Concept): boolean {
  const out = ask(`visuals.broaden.${c.id}`, {tag: {id: c.id, role: 'visual-broaden'}, system: 'Illustration libraries (NIH BioArt, Servier Medical Art, Wikimedia Commons) index pictures by short plain titles. Queries that found nothing are given; write 3–8 broader or differently-worded queries likely to find an illustration of the same thing: the procedure name as well as the device ("endoscopy" for an endoscope), the equipment category ("endoscopy equipment"), the anatomical region or system it belongs to, British and American spellings, singular nouns. One to three words each.', user: `CONCEPT: ${c.what}\nFAILED QUERIES: ${c.queries.join('; ')}`, schema: BROADEN_SCHEMA}, join(answers, `broaden.${c.id}.json`));
  if (!out) return false;
  c.queries = out.queries.filter((q: string) => !c.queries.includes(q));
  c.broadened = true;
  c.status = 'planned';
  console.log(`  🔁 ${c.id}: nothing found — searching again with: ${c.queries.join('; ')}`);
  return true;
}

/* ------------------------------------------------------------------ 3 choose (vision) */
const CHOOSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scores: {type: 'array', items: {type: 'object', additionalProperties: false, properties: {n: {type: 'integer'}, relevance: {type: 'integer', minimum: 0, maximum: 5}, accuracy: {type: 'integer', minimum: 0, maximum: 5}, quality: {type: 'integer', minimum: 0, maximum: 5}, animation: {type: 'integer', minimum: 0, maximum: 5}, style: {type: 'integer', minimum: 0, maximum: 5}, note: {type: 'string', maxLength: 160}}, required: ['n', 'relevance', 'accuracy', 'quality', 'animation', 'style', 'note']}},
    choice: {type: 'integer', minimum: 0},
    reason: {type: 'string', maxLength: 300},
  },
  required: ['scores', 'choice', 'reason'],
};
const CHOOSE_SYSTEM = `You are the art director of a medical education house (journal-figure look: clean, precise,
professional; no cartoons, no clip-art, no photos with text baked in). Judge candidate illustrations
for one teaching concept, each 0–5 on: relevance (shows the concept and the parts the lessons name),
accuracy (anatomically/technically right), quality (professional rendering, clean, legible at video
size), animation (clear separate parts a camera and labels can point at; plain background; no
lettering in the image), style (fits a clean clinical house style). Then choose the best one's number,
or 0 if none reaches relevance ≥ 4 AND accuracy ≥ 4 AND quality ≥ 3 — a wrong or poor picture is
worse than none. Open EVERY candidate image before scoring it — never score from the title.`;
function choose(c: Concept): boolean {
  const user = `CONCEPT ${c.id}: ${c.what}\nTEACHES: ${c.teaches}\nPARTS THE LESSONS NAME: ${c.parts.join(', ')}\n\nCANDIDATES:\n${c.candidates!.map((x) => `${x.n}. ${x.title} — ${x.source}, ${x.licence} — preview ${x.preview.replace(ROOT + '/', '')}`).join('\n')}`;
  const round = c.broadened ? '.2' : '';
  const out = ask(`visuals.choose.${c.id}${round}`, {tag: {id: c.id, role: 'visual-choose'}, system: CHOOSE_SYSTEM, user, schema: CHOOSE_SCHEMA, images: c.candidates!.map((x) => x.preview)}, join(answers, `choose.${c.id}${round}.json`));
  if (!out) return false;
  const pick = c.candidates!.find((x) => x.n === out.choice);
  c.choice = {n: out.choice, reason: out.reason, scores: out.scores};
  // every candidate rejected: one wider search before giving up on an authoritative picture
  c.status = pick ? 'chosen' : c.broadened ? 'none' : 'broaden';
  console.log(`  🎯 ${c.id}: ${pick ? `#${pick.n} ${pick.title} (${pick.licence})` : 'no candidate good enough'} — ${out.reason}`);
  return true;
}

/* ------------------------------------------------------------------ 4 ingest + register */
async function ingest(c: Concept, plan: Plan) {
  const pick = c.candidates!.find((x) => x.n === c.choice!.n)!;
  // the same picture chosen for another concept: acquired once, shared (its playbooks are authored with both in mind)
  const twin = plan.concepts.find((o) => o !== c && o.art && o.candidates?.some((x) => x.n === o.choice?.n && x.source === pick.source && x.id === pick.id));
  if (twin) {
    for (const x of c.candidates!) rmSync(join(ROOT, 'assets', 'vector', x.dir), {recursive: true, force: true});
    c.art = twin.art;
    c.status = twin.status === 'verified' ? 'verified' : 'shared';
    console.log(`  🔗 ${c.id}: same picture as ${twin.id} — shares ${twin.art}`);
    return;
  }
  const dir = kebab(c.id);
  rmSync(join(ROOT, 'assets', 'vector', dir), {recursive: true, force: true});
  renameSync(join(ROOT, 'assets', 'vector', pick.dir), join(ROOT, 'assets', 'vector', dir));
  for (const x of c.candidates!) rmSync(join(ROOT, 'assets', 'vector', x.dir), {recursive: true, force: true});
  const lic = JSON.parse(readFileSync(join(ROOT, 'assets', 'vector', dir, 'licence.json'), 'utf8'));
  const {autoManifest} = await import('./find-assets.mts');
  await autoManifest(dir, lic);
  c.art = camel(dir);
  c.decision = 'acquire';
  c.status = 'ingested';
  console.log(`  📥 ${c.id}: ingested as ${c.art} (assets/vector/${dir})`);
}

/* ------------------------------------------------------------------ 5 playbooks (Opus, once) */
const probe = (art: string, out: string, mode: 'grid' | 'anchors') => spawnSync('node', ['scripts/visuals.mts', '--probe', art, out, mode], {cwd: ROOT, stdio: 'inherit'}).status === 0;
const PLAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    doc: {type: 'string', maxLength: 400},
    anchors: {type: 'object', additionalProperties: {type: 'array', items: {type: 'number', minimum: 0, maximum: 1}, minItems: 2, maxItems: 2}},
    regions: {type: 'array', maxItems: 6, items: {type: 'object', additionalProperties: false, properties: {event: {type: 'string', pattern: '^[a-z][a-zA-Z0-9]+$'}, points: {type: 'array', minItems: 4, maxItems: 20, items: {type: 'array', items: {type: 'number', minimum: 0, maximum: 1}, minItems: 2, maxItems: 2}}}, required: ['event', 'points']}},
    playbooks: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {type: 'string'},
          teaches: {type: 'string', maxLength: 300},
          moments: {type: 'array', minItems: 2, maxItems: 8, items: {type: 'object', additionalProperties: false, properties: {slot: {type: 'string'}, hint: {type: 'array', minItems: 1, items: {type: 'string'}}, optional: {type: 'boolean'}, beat: {type: 'object'}}, required: ['slot', 'hint', 'beat']}},
        },
        required: ['id', 'teaches', 'moments'],
      },
    },
  },
  required: ['doc', 'anchors', 'regions', 'playbooks'],
};
const vbOf = (dir: string) => /viewBox="([^"]*)"/.exec(readFileSync(join(ROOT, 'assets', 'vector', dir, 'source.svg'), 'utf8'))![1].split(/[\s,]+/).map(Number);
function author(c: Concept): boolean {
  const dir = kebab(c.id);
  const grid = join(STAGE, c.id, 'grid.png');
  if (!existsSync(grid) && !probe(c.art!, grid, 'grid')) throw new Error(`${c.art}: grid render failed`);
  const man = JSON.parse(readFileSync(join(ROOT, 'assets', 'vector', dir, 'manifest.json'), 'utf8'));
  const also = plan!.concepts.filter((o) => o.id !== c.id && (o.status === 'shared' || o.art === c.art) && o.art === c.art);
  const user = `ASSET KEY: ${c.art}\nCONCEPT: ${c.what}\nTEACHES: ${c.teaches}\nPARTS THE LESSONS NAME: ${c.parts.join(', ')}${also.length ? `\nALSO USED FOR (give each a playbook): ${also.map((o) => `${o.what} — ${o.teaches}`).join(' | ')}` : ''}\nSOURCE: ${man.credit}\nLABELLED PARTS FOUND IN THE FILE (names only, may be absent): ${Object.keys(man.anchors ?? {}).join(', ') || 'none'}\n\nEXAMPLE (the house's heart playbooks — targets are anchor names; your ids start "${c.art}."):\n${JSON.stringify(ALL_ART_PLAYS.filter((p) => p.art === 'heartExterior').slice(0, 2).map(({art: _a, ...p}) => p))}\n\nDATA PLAYS the writer also has (do not duplicate charts): ${DATA_PLAYS.map((p) => p.id).join(', ')}`;
  const out = ask(`visuals.author.${c.id}`, {tag: {id: c.id, role: 'playbook-author'}, model: 'opus', system: readFileSync(join(ROOT, 'docs', 'PLAYBOOK_BRIEF.md'), 'utf8'), user, schema: PLAY_SCHEMA, images: [grid]}, join(answers, `author.${c.id}.json`));
  if (!out) return false;
  // grid fractions → the drawing's own units
  const [vx, vy, vw, vh] = vbOf(dir);
  const at = ([fx, fy]: number[]) => [Math.round(vx + fx * vw), Math.round(vy + fy * vh)];
  man.anchors = {...Object.fromEntries(Object.entries(out.anchors).map(([k, p]) => [k, at(p as number[])]))};
  man.regions = out.regions.map((r: any) => ({event: r.event, points: r.points.map(at)}));
  man.doc = `${out.doc} anchors: ${Object.keys(man.anchors).join(' ')}${man.regions.length ? ` · events: ${man.regions.map((r: any) => r.event).join(' ')} (that part picked out)` : ''}`;
  man.playbooks = out.playbooks.map((p: any) => ({...p, id: p.id.startsWith(`${c.art}.`) ? p.id : `${c.art}.${p.id}`}));
  writeFileSync(join(ROOT, 'assets', 'vector', dir, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
  execFileSync('node', ['scripts/ingest-art.mts', dir], {cwd: ROOT, stdio: 'ignore'});
  c.status = 'authored';
  console.log(`  🎬 ${c.id}: ${Object.keys(man.anchors).length} anchors, ${man.regions.length} regions, ${man.playbooks.length} playbook(s)`);
  return true;
}

/* ------------------------------------------------------------------ 6 verify the labels (vision) */
const VERIFY_SCHEMA = {type: 'object', additionalProperties: false, properties: {wrong: {type: 'array', items: {type: 'string'}}, note: {type: 'string', maxLength: 300}}, required: ['wrong', 'note']};
function verify(c: Concept): boolean {
  const dir = kebab(c.id);
  const shot = join(STAGE, c.id, 'anchors.png');
  if (!existsSync(shot) && !probe(c.art!, shot, 'anchors')) throw new Error(`${c.art}: anchor render failed`);
  const man = JSON.parse(readFileSync(join(ROOT, 'assets', 'vector', dir, 'manifest.json'), 'utf8'));
  const out = ask(`visuals.verify.${c.id}`, {tag: {id: c.id, role: 'visual-verify'}, system: 'You check a medical illustration\'s anchor points. Each magenta dot carries a name. List the names whose dot is NOT on the structure that name describes (a dot in empty space, on the wrong part, or on a part not visible). Be strict; correct ones are not listed.', user: `ILLUSTRATION: ${c.what}\nANCHORS: ${Object.keys(man.anchors).join(', ')}`, schema: VERIFY_SCHEMA, images: [shot]}, join(answers, `verify.${c.id}.json`));
  if (!out) return false;
  const wrong = new Set<string>(out.wrong);
  if (wrong.size) {
    // drop the wrong points and every moment that needs them; a playbook that loses a required moment goes
    for (const w of wrong) delete man.anchors[w];
    const uses = (b: any) => JSON.stringify(b).match(/"(?:on|pulse)":"([^"]+)"/g)?.map((m) => m.split('"')[3]) ?? [];
    const bad = (m: any) => uses(m.beat).some((u: string) => wrong.has(u));
    man.playbooks = man.playbooks
      .filter((p: any) => !p.moments.some((m: any) => bad(m) && !m.optional))
      .map((p: any) => ({...p, moments: p.moments.filter((m: any) => !bad(m))}))
      .filter((p: any) => p.moments.length >= 2);
    writeFileSync(join(ROOT, 'assets', 'vector', dir, 'manifest.json'), JSON.stringify(man, null, 2) + '\n');
    execFileSync('node', ['scripts/ingest-art.mts', dir], {cwd: ROOT, stdio: 'ignore'});
  }
  c.status = 'verified';
  for (const o of plan!.concepts) if (o.status === 'shared' && o.art === c.art) o.status = 'verified';
  console.log(`  ✅ ${c.id}: labels verified${wrong.size ? ` (${wrong.size} misplaced point(s) removed: ${[...wrong].join(', ')})` : ''} — ${man.playbooks.length} playbook(s) ready`);
  return true;
}

/* ------------------------------------------------------------------ probe renders (a fresh bundle sees new assets) */
if (project === '--probe') {
  const [art, out, mode] = flags;
  const {selectComposition} = await import('@remotion/renderer');
  const {serve, still, closeBrowser} = await import('./lib/remotion.mts');
  const serveUrl = await serve();
  const inputProps = {art, grid: mode === 'grid', showAnchors: mode === 'anchors'};
  const composition = await selectComposition({serveUrl, id: 'ArtProbe', inputProps});
  mkdirSync(join(out, '..'), {recursive: true});
  await still({serveUrl, composition, inputProps, output: out, frame: 150});
  await closeBrowser();
  process.exit(0);
}

/* ------------------------------------------------------------------ the run */
const plan = needs();
if (!plan) process.exit(0);
if (flags.includes('--report')) {
  for (const c of plan.concepts) console.log(`  ${c.id.padEnd(22)} ${String(c.decision).padEnd(8)} ${String(c.status).padEnd(9)} ${c.art ?? ''}  ${c.what}`);
  process.exit(0);
}
let waiting = false;
for (const c of plan.concepts) {
  if (c.decision === 'reuse' || c.status === 'verified' || c.decision === 'chart' || c.decision === 'draw') continue;
  if (c.status === 'planned') await search(c);
  if (c.status === 'broaden' && broaden(c)) await search(c);
  else if (c.status === 'broaden') waiting = true;
  savePlan(plan);
  if (c.status === 'searched' && !choose(c)) waiting = true;
  if (c.status === 'broaden' && broaden(c)) {
    await search(c);
    if ((c.status as string) === 'searched' && !choose(c)) waiting = true;
  } else if (c.status === 'broaden') waiting = true;
  savePlan(plan);
  if (c.status === 'chosen') await ingest(c, plan);
  savePlan(plan);
  if (c.status === 'ingested' && !author(c)) waiting = true;
  savePlan(plan);
  if (c.status === 'authored' && !verify(c)) waiting = true;
  if (c.status === 'none') {
    // nothing authoritative is good enough: draw it (art-author agent) if lessons need the picture
    c.decision = c.parts.length >= 3 ? 'draw' : 'chart';
    c.reason = c.choice?.reason ?? 'no usable candidate found';
    console.log(`  ✏️  ${c.id}: ${c.decision === 'draw' ? 'no authoritative asset — queued for drawing (projects/<p>/visuals.json → art-author)' : 'taught with charts'} — ${c.reason}`);
  }
  savePlan(plan);
}
// the drawing queue, in the format the art pipeline already reads (scripts/art.mts gaps)
const toDraw = plan.concepts.filter((c) => c.decision === 'draw');
if (toDraw.length) {
  const vf = join(PD, 'visuals.json');
  const v = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')) : {parts: []};
  for (const c of toDraw) if (!v.parts.some((p: any) => p.name === c.id)) v.parts.push({name: c.id, pack: kebab(project), usedBy: c.lessons, what: `${c.what}. Teaches: ${c.teaches}`, anchors: c.parts.map(camel)});
  writeFileSync(vf, JSON.stringify(v, null, 1) + '\n');
}
console.log(waiting ? `\nvisuals: waiting on job(s) in projects/${project}/jobs/visuals.*.md — run them, then run this again` : `\nvisuals: ${plan.concepts.filter((c) => c.status === 'verified').length}/${plan.concepts.length} illustration(s) ready${toDraw.length ? `, ${toDraw.length} queued for drawing` : ''}`);
if (cli.ok === false && waiting) process.exit(0);
