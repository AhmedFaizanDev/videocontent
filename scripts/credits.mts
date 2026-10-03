/**
 * Asset credits for a course, in its documentation — never in the video (owner, 2026-10-04):
 *   node scripts/credits.mts <project> [ids…]   → projects/<p>/CREDITS.md and output/<dir>/CREDITS.md
 * Lists every imported illustration each lesson uses, with its licence, credit line and source.
 * produce.mts runs it after every batch.
 */
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {outputDir, parseArgs, projectDir, readSpec} from './lib/paths.mts';
import {VECTOR_MANIFESTS} from '../src/art/vector/manifests.gen.ts';

const {project, ids} = parseArgs();
const used = new Map<string, string[]>();
for (const id of ids)
  for (const s of readSpec(project, id).scenes ?? [])
    for (const l of s.world?.layers ?? []) if (VECTOR_MANIFESTS[l.art] && !used.get(l.art)?.includes(id)) used.set(l.art, [...(used.get(l.art) ?? []), id]);
const rows = [...used].map(([art, lessons]) => {
  const m = VECTOR_MANIFESTS[art];
  return `| ${m.credit ?? art} | ${m.licence ?? '?'} | ${m.source ? `<${m.source}>` : ''} | ${lessons.join(', ')} |`;
});
const md = `# Illustration credits — ${project}\n\nIllustrations adapted (animated, recoloured states) from the sources below. Credits are given here, in the course documentation, not in the videos.\n\n| Illustration | Licence | Source | Lessons |\n|---|---|---|---|\n${rows.join('\n') || '| (no imported illustrations) | | | |'}\n`;
writeFileSync(join(projectDir(project), 'CREDITS.md'), md);
const out = outputDir(project);
if (existsSync(out)) writeFileSync(join(out, 'CREDITS.md'), md);
else mkdirSync(out, {recursive: true}), writeFileSync(join(out, 'CREDITS.md'), md);
console.log(`credits: ${used.size} illustration(s) → projects/${project}/CREDITS.md`);
