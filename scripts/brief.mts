/**
 * Everything an author needs to write a lesson, in ONE call (instead of reading the guide,
 * the catalogue, example specs and source code — the biggest avoidable token cost):
 *
 *   node scripts/brief.mts <project> [--gold <project>/<id>] [--no-ledger]
 *
 * prints docs/AUTHORING_BRIEF.md, the project's settings and word budget, the illustration
 * catalogue (one line per art), the fact ledger (source/*.md|txt; PDFs by path), and a gold
 * example (intro, one illustrated figure, steps, recap of the most recent certified lesson —
 * this project's, else same language, else any; override with --gold <project>/<id>).
 */
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, listProjects, loadProject, parseArgs, projectDir, readSpec, specIds} from './lib/paths.mts';
import {CATALOG} from '../src/art/catalog.ts';
import {isIndic} from '../src/lang.ts';

const {project, flags} = parseArgs(['gold']);
const cfg = loadProject(project);
const out: string[] = [readFileSync(join(ROOT, 'docs', 'AUTHORING_BRIEF.md'), 'utf8').trim()];

// ---- project
const [lo, hi] = cfg.length.exact ? [cfg.length.exact / 60, cfg.length.exact / 60] : cfg.length.minutes;
// ≈1.3 min of a ~12-scene lesson is holds, transitions and sentence pauses (measured on the 2026-09 lessons)
const words = Math.round(((lo + hi) / 2 - 1.3) * cfg.voice.wpm);
out.push(
  `## This project: ${project}`,
  [
    `- name: ${cfg.name} · series: ${cfg.series} · lang: ${cfg.lang}${isIndic(cfg.lang) ? ' (native script on screen)' : ''} · spelling: ${cfg.style.spelling ?? '—'}`,
    `- voice ${cfg.voice.name} at ~${cfg.voice.wpm} wpm · ${cfg.length.exact ? `exactly ${cfg.length.exact} s` : `target ${lo}–${hi} min`} → aim for ~${words} narration words in total (validate prints the exact range)`,
    `- rules: first ${cfg.rules.first} · last ${cfg.rules.last} · need ${cfg.rules.requireOneOf.map((g) => g.join('|')).join(', ') || '—'} · ≥${cfg.rules.minFigures} stage/figure scenes · ≥${Math.round(cfg.rules.minIllustrated * 100)}% narration over pictures · ≤${cfg.rules.maxScreenWords || '∞'} words on screen`,
    `- key terms (emphasised on screen automatically): ${cfg.terms.join(', ') || '— (add the subject\'s key terms to project.json "terms")'}`,
    `- existing specs: ${specIds(project).join(', ') || 'none'}`,
  ].join('\n'),
);

// ---- catalogue
out.push(
  '## Illustrations (art · layout · what it shows / anchors / data)',
  Object.entries(CATALOG)
    .map(([k, e]) => `- ${k} (${e.layout}): ${e.doc}`)
    .join('\n'),
);

// ---- fact ledger
if (!flags['no-ledger']) {
  const dir = join(projectDir(project), 'source');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')) : [];
  const parts = files.map((f) =>
    /\.(md|txt)$/i.test(f) ? `### ${f}\n${readFileSync(join(dir, f), 'utf8').trim()}` : `### ${f}\n(${f.split('.').pop()} — search it: grep -i "<term>" projects/${project}/source/.text/*.txt after a first preflight)`,
  );
  out.push('## Fact ledger (the only facts you may state)', parts.join('\n\n') || '(empty — write source/reference-notes.md with cited facts first)');
}

// ---- gold example
// the example: --gold, else the most recently certified lesson — from this project first, then
// one in the same language, then any. A certified lesson has passed every gate, so its craft
// is a safe model; content from another subject is only there to show density and style.
const certified = listProjects()
  .flatMap((p) => specIds(p).map((id) => ({p, id, f: join(projectDir(p), 'build', `${id}.certified.json`)})))
  .filter((c) => existsSync(c.f))
  .map((c) => ({...c, at: JSON.parse(readFileSync(c.f, 'utf8')).certifiedAt as string, lang: loadProject(c.p).lang}))
  .sort((a, b) => b.at.localeCompare(a.at));
// picture-first lessons (stage scenes) are the model for new work
const isStaged = (c: {p: string; id: string}) => readSpec(c.p, c.id).scenes.some((s: any) => s.type === 'stage');
const pickGold = certified.find((c) => c.p === project && isStaged(c)) ?? certified.find((c) => isStaged(c)) ?? certified.find((c) => c.p === project) ?? certified.find((c) => c.lang === cfg.lang) ?? certified[0];
const gold = typeof flags.gold === 'string' ? flags.gold : pickGold ? `${pickGold.p}/${pickGold.id}` : '';
const [gp, gid] = gold.split('/');
if (!gold) out.push('## Gold example', '(none certified yet — the first lesson of a new series is the gold: write it carefully, certify it, then batch)');
else if (existsSync(join(ROOT, 'projects', gp, 'specs', `${gid}.json`))) {
  const spec = readSpec(gp, gid);
  const pick = (t: string, pred: (s: any) => boolean = () => true) => spec.scenes.find((s: any) => s.type === t && pred(s));
  const stages = spec.scenes.filter((s: any) => s.type === 'stage');
  const scenes = stages.length ? [pick('intro'), ...stages.slice(0, 3), pick('answer'), pick('recap')].filter(Boolean) : [pick('intro'), pick('figure', (s) => !!s.callouts), pick('steps'), pick('recap')].filter(Boolean);
  out.push(`## Gold example (${gold}: craft and density to match; the full lesson has ${spec.scenes.length} scenes)`, scenes.map((s) => JSON.stringify(s)).join('\n'));
}

console.log(out.join('\n\n'));
