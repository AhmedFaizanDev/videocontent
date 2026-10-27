/**
 * Audition how the project's voice says a word or phrase, with the house + project lexicon
 * applied exactly as in a real voiceover — the fast loop for fixing a mispronunciation:
 *   node scripts/say.mts <project> "MedSkills"            → iterations/say/<project>/medskills.mp3 (and plays it)
 *   node scripts/say.mts <project> "MedSkills" --as "Med Skills"   try a respelling before adding it
 *   node scripts/say.mts <project> "Keep learning with {}." --variants "MedSkills|Med Skills|Med-Skills"
 *       one audition file: each candidate spoken in that sentence, announced "Option 1, 2…", so the
 *       owner picks by ear; put the winner in project.json lexicon (IPA "/…/" for Polly voices).
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, loadProject} from './lib/paths.mts';
import {speakTokens, voiceArgs} from './lib/speak.mts';
import {isIndic} from '../src/lang.ts';

const args = process.argv.slice(2);
const varAt = args.indexOf('--variants');
const variants = varAt >= 0 ? args.splice(varAt, 2)[1].split('|') : null;
const asAt = args.indexOf('--as');
const as = asAt >= 0 ? args.splice(asAt, 2)[1] : null;
const [project, text] = args;
if (!project || !text) {
  console.error('usage: node scripts/say.mts <project> "word or phrase" [--as "respelling"]');
  process.exit(1);
}
const cfg = loadProject(project);
if (variants) {
  // an audition sheet: "Option n." · pause · the sentence with candidate n · pause …
  const dir = join(ROOT, 'iterations', 'say', project);
  mkdirSync(dir, {recursive: true});
  const PYV = existsSync(join(ROOT, '.venv', 'bin', 'python')) ? join(ROOT, '.venv', 'bin', 'python') : 'python3';
  const clip = (text: string, file: string) =>
    execFileSync(PYV, [join(ROOT, 'scripts', 'lib', 'tts.py'), ...voiceArgs(cfg.voice), '--out', file, '--words', join(dir, 'last.words.json')], {input: JSON.stringify({tokens: text.split(/\s+/).map((w) => ({d: w, s: w}))}), stdio: ['pipe', 'ignore', 'inherit']});
  const parts: string[] = [];
  variants.forEach((v, i) => {
    const a = join(dir, `v${i}a.mp3`);
    const b = join(dir, `v${i}b.mp3`);
    clip(`Option ${i + 1}.`, a);
    clip(text.replace('{}', v), b);
    parts.push(a, b);
  });
  const out = join(dir, 'audition.mp3');
  const inputs = parts.flatMap((p) => ['-i', p]);
  const gaps = parts.map((_, i) => `[${i}:a]apad=pad_dur=${i % 2 ? 0.9 : 0.35}[p${i}]`).join(';');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${gaps};${parts.map((_, i) => `[p${i}]`).join('')}concat=n=${parts.length}:v=0:a=1[o]`, '-map', '[o]', out]);
  console.log(variants.map((v, i) => `  ${i + 1}. ${v}`).join('\n') + `\n→ ${out}`);
  process.exit(0);
}
const tokens = as ? [{d: text, s: as}] : speakTokens(text, cfg.lexicon, !isIndic(cfg.lang));
const dir = join(ROOT, 'iterations', 'say', project);
mkdirSync(dir, {recursive: true});
const out = join(dir, `${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'say'}${as ? '.as' : ''}.mp3`);
const PY = existsSync(join(ROOT, '.venv', 'bin', 'python')) ? join(ROOT, '.venv', 'bin', 'python') : 'python3';
execFileSync(PY, [join(ROOT, 'scripts', 'lib', 'tts.py'), ...voiceArgs(cfg.voice), '--out', out, '--words', join(dir, 'last.words.json')], {input: JSON.stringify({tokens}), stdio: ['pipe', 'ignore', 'inherit']});
console.log(`${cfg.voice.name} says: "${tokens.map((t) => t.s).join(' ')}"\n→ ${out}`);
if (process.platform === 'darwin' && !process.env.CI) execFileSync('afplay', [out]);
