/**
 * Where everything lives, and the one argument convention every script shares:
 *   node scripts/<tool>.mts <project> [ids… | --all | --range A B] [--flag value]
 *
 * projects/<slug>/project.json         config (see src/project.ts)
 * projects/<slug>/specs/<id>.json      authored lessons
 * projects/<slug>/build/<id>.timings.json   measured VO + word timeline (generated)
 * public/audio/vo/<slug>/<id>/          narration audio (generated)
 * output/<output.dir>/<outputFilename>  final MP4 + SRT (+ .build.json manifest)
 */
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withDefaults, forLesson, type ProjectConfig} from '../../src/project.ts';
import {compileSpec} from '../../src/compile.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FPS = 30;
export const PROJECTS = join(ROOT, 'projects');

export const projectDir = (p: string) => join(PROJECTS, p);
export const listProjects = () => readdirSync(PROJECTS).filter((d) => existsSync(join(PROJECTS, d, 'project.json'))).sort();

const cfgCache = new Map<string, ProjectConfig>();
/** The project's config; given a lesson (its id or its spec), with that lesson's own `length`. */
export function loadProject(p: string, lesson?: string | {length?: ProjectConfig['length']}): ProjectConfig {
  const cfg = loadProjectOnly(p);
  if (!lesson) return cfg;
  const spec = typeof lesson === 'string' ? (existsSync(specPath(p, lesson)) ? JSON.parse(readFileSync(specPath(p, lesson), 'utf8')) : null) : lesson;
  return forLesson(cfg, spec);
}
function loadProjectOnly(p: string): ProjectConfig {
  if (!cfgCache.has(p)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p)) throw new Error(`Project slug "${p}" must be lowercase letters, digits and dashes`);
    const file = join(projectDir(p), 'project.json');
    if (!existsSync(file)) throw new Error(`No project "${p}" (expected ${file}). Projects: ${listProjects().join(', ')}`);
    cfgCache.set(p, withDefaults(p, JSON.parse(readFileSync(file, 'utf8'))));
  }
  return cfgCache.get(p)!;
}

export const specPath = (p: string, id: string) => join(projectDir(p), 'specs', `${id}.json`);
export const timingsPath = (p: string, id: string) => join(projectDir(p), 'build', `${id}.timings.json`);
export const voDir = (p: string, id: string) => join(ROOT, 'public', 'audio', 'vo', p, id);
/** Path used inside Remotion via staticFile(): relative to /public. */
export const voStatic = (p: string, id: string, sceneIndex: number) => `audio/vo/${p}/${id}/scene-${sceneIndex}.mp3`;
/** A lesson spec with its shorthand scenes (flow, table) compiled to stages — what every stage sees. */
export const readSpec = (p: string, id: string) => compileSpec(readSpecRaw(p, id), loadProject(p).frame);
/** The spec as authored (for tools that edit or translate it). */
export const readSpecRaw = (p: string, id: string) => JSON.parse(readFileSync(specPath(p, id), 'utf8'));
export const readTimings = (p: string, id: string) => JSON.parse(readFileSync(timingsPath(p, id), 'utf8'));

export const specIds = (p: string) =>
  existsSync(join(projectDir(p), 'specs'))
    ? readdirSync(join(projectDir(p), 'specs')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
    : [];

export const outputDir = (p: string) => join(ROOT, 'output', loadProject(p).output.dir);
export const mp4Path = (p: string, id: string) => join(outputDir(p), readSpec(p, id).outputFilename);
export const srtPath = (p: string, id: string) => mp4Path(p, id).replace(/\.mp4$/, '.srt');
export const manifestPath = (p: string, id: string) => mp4Path(p, id).replace(/\.mp4$/, '.build.json');

/**
 * Rewrite a per-lesson markdown report (PREFLIGHT.md, QA.md) replacing only these lessons'
 * sections — each starts with a `## <id> — …` or `### <id> — …` heading — so a partial
 * re-run keeps every other lesson's result. Sections of lessons that no longer exist are dropped.
 */
export function mergeReport(project: string, file: string, title: string, sections: Record<string, string>) {
  const all: Record<string, string> = {};
  const old = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const known = specIds(project);
  for (const m of old.matchAll(/^#{2,3} (\S+) — [\s\S]*?(?=^#{2,3} \S+ — |(?![\s\S]))/gm)) if (known.includes(m[1])) all[m[1]] = m[0].trimEnd();
  Object.assign(all, sections);
  writeFileSync(file, [title, '', ...Object.keys(all).sort().map((id) => all[id].trimEnd() + '\n')].join('\n'));
}

/** Parse `<project> [ids | --all | --range A B] [--flag value | --switch]`. */
export function parseArgs(valueFlags: string[] = []) {
  const argv = process.argv.slice(2);
  const flags: Record<string, string | true> = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--range') (flags.range = `${argv[i + 1]} ${argv[i + 2]}`), (i += 2);
    else if (a.startsWith('--')) {
      const k = a.slice(2);
      if (valueFlags.includes(k)) (flags[k] = argv[i + 1]), i++;
      else flags[k] = true;
    } else pos.push(a);
  }
  const [project, ...rest] = pos;
  if (!project) {
    console.error(`Usage: node ${process.argv[1].split('/').pop()} <project> [ids… | --all | --range A B]\nProjects: ${listProjects().join(', ')}`);
    process.exit(1);
  }
  loadProject(project);
  const all = specIds(project);
  let ids = rest;
  if (flags.all || (!rest.length && !flags.range)) ids = all;
  if (typeof flags.range === 'string') {
    const [a, b] = flags.range.split(' ');
    ids = all.slice(all.indexOf(a), all.indexOf(b) + 1);
  }
  const unknown = ids.filter((id) => !all.includes(id));
  if (unknown.length) {
    console.error(`Unknown id(s) in ${project}: ${unknown.join(', ')}`);
    process.exit(1);
  }
  return {project, ids, flags};
}
