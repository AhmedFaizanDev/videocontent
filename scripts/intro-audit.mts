/**
 * Final delivery audit for the 69 intros. Exit 1 unless every video is present and sound.
 *   node scripts/intro-audit.mts          checks output/Course_Intros_MP4/ against queue.csv + QA.md
 * Also writes a contact sheet per video (8 frames) to iterations/intro-audit/<id>.jpg for LOOKING at.
 */
import {existsSync, mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './lib/paths.mts';

const DIR = join(ROOT, 'output', 'Course_Intros_MP4');
const QA = readFileSync(join(ROOT, 'output', 'MedSkills', 'Course_Intros', 'QA.md'), 'utf8');
const ids: string[] = JSON.parse(readFileSync(join(ROOT, 'projects', 'ms-intros', 'course.json'), 'utf8')).videos.map((v: any) => v.id);
const sheets = join(ROOT, 'iterations', 'intro-audit');
mkdirSync(sheets, {recursive: true});
const bad: string[] = [];
const files = existsSync(DIR) ? readdirSync(DIR) : [];
for (const f of files.filter((f) => !f.endsWith('.mp4'))) bad.push(`stray non-mp4 in delivery folder: ${f}`);
for (const id of ids) {
  const f = `MedSkills_Intro_${id.replace(/\W+/g, '_')}.mp4`;
  const p = join(DIR, f);
  if (!existsSync(p)) { bad.push(`${id}: missing ${f}`); continue; }
  if (!new RegExp(`### ${id} — PASS`).test(QA)) bad.push(`${id}: no QA PASS`);
  const pr = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', p], {encoding: 'utf8'});
  let j: any = {};
  try { j = JSON.parse(pr.stdout); } catch { bad.push(`${id}: unreadable`); continue; }
  const v = j.streams?.find((s: any) => s.codec_type === 'video'), a = j.streams?.find((s: any) => s.codec_type === 'audio'), d = Number(j.format?.duration);
  if (!v || v.width !== 1920 || v.height !== 1080) bad.push(`${id}: not 1920x1080`);
  if (!a) bad.push(`${id}: no audio`);
  if (!(d >= 45 && d <= 90)) bad.push(`${id}: duration ${d?.toFixed?.(1)}s outside 45–90 s`);
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', p, '-vf', `fps=8/${d},scale=480:-1,tile=4x2`, '-frames:v', '1', join(sheets, `${id}.jpg`)]);
}
console.log(bad.length ? `❌ ${bad.length} problem(s):\n  ${bad.join('\n  ')}` : `✅ ${ids.length}/${ids.length} videos present, QA-passed, 1080p, with audio, ≤90 s. Contact sheets: iterations/intro-audit/`);
process.exit(bad.length ? 1 : 0);
