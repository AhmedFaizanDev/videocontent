/**
 * Package certified lessons + the pipeline for the render server.
 *
 *   node scripts/export.mts [projects…] [--out dist]     (default: every project with certificates)
 *
 * Refuses if any included lesson is uncertified or changed since certification. The archive
 * holds the code (src, scripts, package files), shared assets (brand, music, sfx, textures),
 * and per included project: project.json, specs, build (timings + certificates) and its
 * narration audio. Not included: node_modules, outputs, iterations, other projects' audio.
 * On the server: see RENDER.md inside the archive.
 */
import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, listProjects, specIds} from './lib/paths.mts';
import {buildHash} from './render.mts';

const args = process.argv.slice(2);
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist';
const named = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const cert = (p: string, id: string) => join(ROOT, 'projects', p, 'build', `${id}.certified.json`);
const projects = named.length ? named : listProjects().filter((p) => specIds(p).some((id) => existsSync(cert(p, id))));

const problems: string[] = [];
for (const p of projects)
  for (const id of specIds(p)) {
    if (!existsSync(cert(p, id))) problems.push(`${p}/${id}: not certified`);
    else if (JSON.parse(readFileSync(cert(p, id), 'utf8')).hash !== buildHash(p, id)) problems.push(`${p}/${id}: changed since certification`);
  }
if (problems.length) {
  console.error(`❌ not exporting — certify these first (node scripts/certify.mts <project>):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const lessons = projects.reduce((n, p) => n + specIds(p).length, 0);
writeFileSync(
  join(ROOT, 'RENDER.md'),
  `# Render server

This archive holds ${lessons} certified lesson(s) in ${projects.length} project(s): ${projects.join(', ')}.
They were validated locally (scripts/certify.mts): content, sync against the real voice,
layout at real timings. The server only renders and runs the technical QA.

\`\`\`bash
# once: Node 20+, ffmpeg on PATH (Remotion downloads its own headless Chrome)
npm ci
node scripts/render-batch.mts --list        # what will render
caffeinate -ims node scripts/render-batch.mts   # macOS; on Linux: nohup node scripts/render-batch.mts &
\`\`\`
- Output: \`output/<project output dir>/\` (MP4, SRT, thumbnail, publish kit, QA.md) and
  \`output/RENDER_BATCH.md\` (per-lesson status). Re-running resumes; finished lessons are skipped.
- Fonts are vendored (public/fonts): rendering needs no network access. Remotion downloads its
  headless Chrome on first use (Linux: install its shared libraries, e.g. \`npx remotion browser ensure\`).
- A lesson edited after certification is refused (its build hash no longer matches).
- One batch at a time: rendering is CPU-bound and already uses every core.
`,
);
const paths = [
  'package.json', 'package-lock.json', 'tsconfig.json', 'remotion.config.ts', 'README.md', 'RENDER.md', 'src', 'scripts', 'docs',
  'public/brand', 'public/fonts', 'public/audio/music', 'public/audio/sfx', ...(existsSync(join(ROOT, 'public/textures')) ? ['public/textures'] : []),
  ...projects.flatMap((p) => [`projects/${p}/project.json`, `projects/${p}/specs`, `projects/${p}/build`, `public/audio/vo/${p}`]),
];
mkdirSync(join(ROOT, outDir), {recursive: true});
const file = join(outDir, `render-kit-${new Date().toISOString().slice(0, 10)}.tar.gz`);
execFileSync('tar', ['-czf', join(ROOT, file), '--exclude', '.DS_Store', '--exclude', 'registry.gen.ts', ...paths], {cwd: ROOT});
const size = statSync(join(ROOT, file)).size;
console.log(`✅ ${file} (${(size / 1e6).toFixed(1)} MB): ${lessons} lesson(s), ${projects.length} project(s). Server steps: RENDER.md inside.`);
