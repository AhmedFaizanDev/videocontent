/**
 * The client deliverable: every QA-passed video of a course, copied into a clean tree (the render
 * folder also holds SRTs, posters, manifests and QA reports). Re-run any time; it only adds/updates.
 *
 *   node scripts/deliver.mts <project>
 *   → output/Delivery/<course name>/<NN Module name>/<id> - <title>.mp4 (+ .srt)
 */
import {copyFileSync, existsSync, mkdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, loadProject, projectDir, specPath} from './lib/paths.mts';

const project = process.argv[2];
if (!project) {
  console.error('usage: node scripts/deliver.mts <project>');
  process.exit(1);
}
const cfg = loadProject(project);
const outDir = join(ROOT, 'output', cfg.output.dir || project);
const qa = existsSync(join(outDir, 'QA.md')) ? readFileSync(join(outDir, 'QA.md'), 'utf8') : '';
// the latest verdict per lesson wins
const verdict = new Map<string, string>();
for (const m of qa.matchAll(/^### (\S+) — (PASS|FAIL)/gm)) verdict.set(m[1], m[2]);
const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
const moduleOf = (source: string) => {
  const m = /_M(\d{2})_(.+)\.pdf$/i.exec(source);
  return m ? `${m[1]} ${m[2].replace(/-/g, ' ')}` : '00 Course';
};
const root = join(ROOT, 'output', 'Delivery', clean(cfg.name));
const videos: {id: string; title?: string; source: string}[] = JSON.parse(readFileSync(join(projectDir(project), 'course.json'), 'utf8')).videos;
let done = 0;
const missing: string[] = [];
for (const v of videos) {
  const spec = existsSync(specPath(project, v.id)) ? JSON.parse(readFileSync(specPath(project, v.id), 'utf8')) : null;
  const mp4 = spec && join(outDir, spec.outputFilename);
  if (!mp4 || !existsSync(mp4) || verdict.get(v.id) !== 'PASS') {
    missing.push(`${v.id}${verdict.get(v.id) === 'FAIL' ? ' (QA FAIL)' : ''}`);
    continue;
  }
  const dir = join(root, clean(moduleOf(v.source)));
  mkdirSync(dir, {recursive: true});
  const name = clean(`${v.id} - ${spec.title ?? v.title ?? v.id}`);
  const dst = join(dir, `${name}.mp4`);
  if (!existsSync(dst) || statSync(dst).mtimeMs < statSync(mp4).mtimeMs) copyFileSync(mp4, dst);
  const srt = mp4.replace(/\.mp4$/, '.srt');
  if (existsSync(srt)) copyFileSync(srt, join(dir, `${name}.srt`));
  done++;
}
console.log(`${done}/${videos.length} delivered → ${root.replace(ROOT + '/', '')}${missing.length ? `\nnot yet: ${missing.join(', ')}` : ''}`);
