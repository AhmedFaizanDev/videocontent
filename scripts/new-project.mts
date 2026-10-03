/**
 * Scaffold a project: node scripts/new-project.mts <slug> "<Name>" "<Series line>"
 * Writes projects/<slug>/project.json (defaults spelled out so they are easy to edit),
 * specs/ and source/ (drop the client material there).
 */
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PROJECTS} from './lib/paths.mts';
import {PROJECT_DEFAULTS} from '../src/project.ts';

const [slug, name, series] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !name) {
  console.error('Usage: node scripts/new-project.mts <slug: lowercase-with-dashes> "<Name>" ["<Series line>"]');
  process.exit(1);
}
const dir = join(PROJECTS, slug);
if (existsSync(dir)) {
  console.error(`projects/${slug} already exists`);
  process.exit(1);
}
for (const d of ['specs', 'source', 'plans']) mkdirSync(join(dir, d), {recursive: true});
const {output: _o, ...defaults} = PROJECT_DEFAULTS;
// house standard v2 for new series (2026-10-03): planned, scientific, 5–7 minutes, picture-first
const house = {
  ...defaults,
  length: {minutes: [4.5, 7]}, // 5:00 is the standard; validate warns past 5:45 unless the plan justifies it
  rules: {...defaults.rules, first: 'ident', last: 'outro', requireOneOf: [], minFigures: 3, minIllustrated: 0.75, maxScreenWords: 20, requirePlan: false, maxIdle: 7},
  frame: {ident: true, outro: defaults.brand.signoff},
};
writeFileSync(join(dir, 'project.json'), JSON.stringify({name, series: series ?? name, ...house}, null, 2) + '\n');
console.log(`Created projects/${slug}/ — edit project.json (voice, length, rules, brand), put source material in source/, author specs/.`);
