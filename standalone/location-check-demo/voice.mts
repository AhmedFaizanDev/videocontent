// Voices narration.json with the repo's Edge TTS helper, then writes timeline.json:
// scene start/length in frames + caption lines. Run: node standalone/location-check-demo/voice.mts
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captionsFromWords, type Word} from '../../scripts/lib/captions.mts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const FPS = 30;
const LEAD = 0.3; // silence before the voice starts in each scene
const TAIL = 0.6; // hold after the voice ends, before the next scene
const voDir = join(root, 'public', 'location-check-demo', 'vo');
mkdirSync(voDir, {recursive: true});

const cfg = JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8'));

// "{display|spoken}" groups become one token; everything else splits on spaces.
const tokenize = (text: string) =>
  [...text.matchAll(/\{([^|}]*)\|([^}]*)\}|(\S+)/g)].map((m) => (m[3] ? {d: m[3], s: m[3]} : {d: m[1], s: m[2]}));

let start = 0;
const scenes = [];
for (const scene of cfg.scenes) {
  const mp3 = join(voDir, `${scene.id}.mp3`);
  const words = join(voDir, `${scene.id}.words.json`);
  execFileSync(
    join(root, '.venv', 'bin', 'python'),
    [join(root, 'scripts', 'lib', 'tts_edge.py'), '--voice', cfg.voice, `--rate=${cfg.rate}`, '--pause', String(cfg.pause), '--out', mp3, '--words', words],
    {input: JSON.stringify({tokens: tokenize(scene.text)})},
  );
  const voice = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString());
  const timeline: Word[] = JSON.parse(readFileSync(words, 'utf8'));
  const seconds = LEAD + voice + TAIL;
  scenes.push({
    id: scene.id,
    from: Math.round(start * FPS),
    frames: Math.round(seconds * FPS),
    voiceFrom: Math.round((start + LEAD) * FPS),
    audio: `location-check-demo/vo/${scene.id}.mp3`,
    captions: captionsFromWords(timeline, 46).map((c) => ({text: c.text, from: Math.round((start + LEAD + c.start) * FPS), to: Math.round((start + LEAD + c.end) * FPS)})),
  });
  console.log(`${scene.id.padEnd(8)} voice ${voice.toFixed(1)} s`);
  start += seconds;
}
writeFileSync(join(here, 'timeline.json'), JSON.stringify({fps: FPS, frames: Math.round(start * FPS), scenes}, null, 1));
console.log(`total ${start.toFixed(1)} s`);
