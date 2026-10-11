/**
 * Course-intro queue: one CSV row per video, and the MP4-only delivery folder.
 *   node scripts/intro-queue.mts            rewrite projects/ms-intros/queue.csv (status from disk)
 *   node scripts/intro-queue.mts --collect  also copy every QA-passed MP4 into output/Course_Intros_MP4/ (MP4s only)
 */
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

const P = join(ROOT, 'projects', 'ms-intros');
const OUT = join(ROOT, 'output', 'MedSkills', 'Course_Intros');
const DEST = join(ROOT, 'output', 'Course_Intros_MP4');
const rd = (f: string) => JSON.parse(readFileSync(join(P, f), 'utf8'));
const videos: {id: string; title: string; spoken: string}[] = rd('course.json').videos;
const meta = Object.fromEntries(rd('courses.json').map((c: any) => [c.code, c]));
const qa = existsSync(join(OUT, 'QA.md')) ? readFileSync(join(OUT, 'QA.md'), 'utf8') : '';
const q = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const state = (id: string) => {
  const mp4 = `MedSkills_Intro_${id.replace(/\W+/g, '_')}.mp4`;
  const passed = new RegExp(`### ${id} — PASS`).test(qa) && existsSync(join(OUT, mp4));
  if (passed) return 'done';
  if (existsSync(join(P, 'build', `${id}.timings.json`))) return 'voiced';
  if (existsSync(join(P, 'specs', `${id}.json`))) return 'scripted';
  return 'todo';
};
const rows = videos.map((v, i) => {
  const m = meta[v.id] ?? {};
  return [i + 1, v.id, q(v.title), q(v.spoken), q(m.category), m.hours, m.type, `MedSkills_Intro_${v.id.replace(/\W+/g, '_')}.mp4`, state(v.id)].join(',');
});
writeFileSync(join(P, 'queue.csv'), ['seq,video_id,course_name,spoken_name,category,hours,type,output_file,status', ...rows].join('\n') + '\n');
console.log(`queue.csv: ${rows.length} rows — ${['done', 'voiced', 'scripted', 'todo'].map((s) => `${s} ${rows.filter((r) => r.endsWith(',' + s)).length}`).join(', ')}`);

if (process.argv.includes('--collect')) {
  mkdirSync(DEST, {recursive: true});
  let n = 0;
  for (const v of videos) {
    const f = `MedSkills_Intro_${v.id.replace(/\W+/g, '_')}.mp4`;
    if (state(v.id) === 'done') (copyFileSync(join(OUT, f), join(DEST, f)), n++);
  }
  const stray = readdirSync(DEST).filter((f) => !f.endsWith('.mp4'));
  console.log(`${n} MP4(s) → output/Course_Intros_MP4/${stray.length ? ` — stray non-mp4: ${stray.join(', ')}` : ''}`);
}
