/**
 * Generates one ElevenLabs voiceover MP3 per scene in script.md,
 * measures each file's real duration, and writes:
 *   - public/audio/vo/scene-<n>.mp3
 *   - src/data/timings.json   (drives ALL on-screen timing in Remotion)
 *   - output/captions.srt     (subtitles synced to the VO)
 *
 * Run with: node scripts/generate-voiceover.mts
 * Requires ELEVENLABS_API_KEY in .env (VOICE_ID optional).
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFile} from 'music-metadata';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;

// Frames of visual breathing room around each scene's narration.
const LEAD_FRAMES = 12;
const DEFAULT_TAIL_FRAMES = 22;
const TAIL_OVERRIDES: Record<number, number> = {
  1: 12, // hook cuts quickly to the answer
  6: 96, // logo outro after the last line
};

try {
  process.loadEnvFile(join(ROOT, '.env'));
} catch {
  fail(
    'No .env file found. Create one at the project root with:\n' +
      '  ELEVENLABS_API_KEY=sk_...\n  VOICE_ID=   (optional)',
  );
}

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
if (!API_KEY) {
  fail(
    'ELEVENLABS_API_KEY is empty. Add it to the .env file at the project root:\n' +
      '  ELEVENLABS_API_KEY=sk_...\n' +
      'You can create a key at https://elevenlabs.io/app/settings/api-keys',
  );
}

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

// ---------- 1. Parse scenes + narration out of script.md ----------
type Scene = {index: number; title: string; narration: string};

const md = readFileSync(join(ROOT, 'script.md'), 'utf8');
const scenes: Scene[] = [];
const sceneRe = /^## Scene (\d+) — (.+?)$/gm;
const blocks = md.split(/^## /m).slice(1);
for (const block of blocks) {
  const header = block.split('\n')[0];
  const m = header.match(/^Scene (\d+) — (.+?)\s*(\(|$)/);
  if (!m) continue;
  const narrMatch = block.match(/\*\*Narration:\*\*\s*\n((?:> .*\n?)+)/);
  if (!narrMatch) fail(`Scene ${m[1]} has no narration block in script.md`);
  const narration = narrMatch[1]
    .split('\n')
    .map((l) => l.replace(/^> ?/, '').trim())
    .filter(Boolean)
    .join(' ');
  scenes.push({index: Number(m[1]), title: m[2].trim(), narration});
}
if (scenes.length === 0) fail('No scenes found in script.md');
console.log(`Parsed ${scenes.length} scenes from script.md`);

// ---------- 2. Resolve the narrator voice ----------
const API = 'https://api.elevenlabs.io/v1';
const headers = {'xi-api-key': API_KEY, 'Content-Type': 'application/json'};

async function resolveVoiceId(): Promise<{id: string; name: string}> {
  const override = process.env.VOICE_ID?.trim();
  const res = await fetch(`${API}/voices`, {headers});
  if (!res.ok) {
    fail(
      `Could not list ElevenLabs voices (HTTP ${res.status}): ${await res.text()}\n` +
        'Check that ELEVENLABS_API_KEY in .env is valid.',
    );
  }
  const data = (await res.json()) as {
    voices: {voice_id: string; name: string; category?: string}[];
  };
  if (override) {
    const found = data.voices.find((v) => v.voice_id === override);
    return {id: override, name: found?.name ?? 'custom voice'};
  }
  // Warm, clear tutorial narrators, in order of preference.
  const preferred = ['Brian', 'George', 'Eric', 'Daniel', 'Bella'];
  for (const name of preferred) {
    const v = data.voices.find((x) => x.name === name || x.name.startsWith(`${name} `) || x.name.startsWith(`${name} -`));
    if (v) return {id: v.voice_id, name: v.name};
  }
  const first = data.voices[0];
  if (!first) fail('Your ElevenLabs account has no voices available.');
  return {id: first.voice_id, name: first.name};
}

// ---------- 3. Generate audio per scene (with character timestamps) ----------
type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};
type Caption = {text: string; start: number; end: number};

function captionsFromAlignment(align: Alignment): Caption[] {
  type Word = {text: string; start: number; end: number};
  const words: Word[] = [];
  let cur: Word | null = null;
  align.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
    } else {
      if (!cur) {
        cur = {text: ch, start: align.character_start_times_seconds[i], end: align.character_end_times_seconds[i]};
      } else {
        cur.text += ch;
        cur.end = align.character_end_times_seconds[i];
      }
    }
  });
  if (cur) words.push(cur);

  const MAX_CHARS = 42;
  const captions: Caption[] = [];
  let chunk: Word[] = [];
  const flush = () => {
    if (chunk.length === 0) return;
    captions.push({
      text: chunk.map((w) => w.text).join(' '),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
    });
    chunk = [];
  };
  for (const w of words) {
    const len = chunk.map((x) => x.text).join(' ').length;
    if (len > 0 && len + 1 + w.text.length > MAX_CHARS) flush();
    chunk.push(w);
    // Prefer breaking after sentence-ending punctuation once the line has substance.
    if (/[.!?…—]$/.test(w.text) && chunk.map((x) => x.text).join(' ').length > 18) flush();
  }
  flush();
  // Pad caption ends slightly so they don't flicker off, without overlapping.
  for (let i = 0; i < captions.length; i++) {
    const next = captions[i + 1];
    captions[i].end = Math.min(captions[i].end + 0.25, next ? next.start : captions[i].end + 0.25);
  }
  return captions;
}

const voDir = join(ROOT, 'public', 'audio', 'vo');
mkdirSync(voDir, {recursive: true});
mkdirSync(join(ROOT, 'src', 'data'), {recursive: true});
mkdirSync(join(ROOT, 'output'), {recursive: true});

const voice = await resolveVoiceId();
console.log(`Narrator voice: ${voice.name} (${voice.id})`);

type SceneTiming = {
  index: number;
  title: string;
  narration: string;
  audioFile: string;
  voDurationInSeconds: number;
  voDurationInFrames: number;
  leadFrames: number;
  tailFrames: number;
  durationInFrames: number;
  startFrame: number;
  captions: Caption[];
};

const timings: SceneTiming[] = [];
let cursor = 0;

for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  process.stdout.write(`Scene ${scene.index} "${scene.title}" … `);
  const res = await fetch(
    `${API}/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: scene.narration,
        model_id: 'eleven_multilingual_v2',
        // Calm, consistent tutorial read.
        voice_settings: {stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true},
        previous_text: i > 0 ? scenes[i - 1].narration : undefined,
        next_text: i < scenes.length - 1 ? scenes[i + 1].narration : undefined,
      }),
    },
  );
  if (!res.ok) {
    fail(`ElevenLabs TTS failed for scene ${scene.index} (HTTP ${res.status}): ${await res.text()}`);
  }
  const payload = (await res.json()) as {audio_base64: string; alignment: Alignment};
  const fileName = `scene-${scene.index}.mp3`;
  writeFileSync(join(voDir, fileName), Buffer.from(payload.audio_base64, 'base64'));

  const meta = await parseFile(join(voDir, fileName));
  const voSec = meta.format.duration;
  if (!voSec) fail(`Could not measure duration of ${fileName}`);
  const voFrames = Math.ceil(voSec * FPS);
  const tail = TAIL_OVERRIDES[scene.index] ?? DEFAULT_TAIL_FRAMES;
  const durationInFrames = LEAD_FRAMES + voFrames + tail;

  timings.push({
    index: scene.index,
    title: scene.title,
    narration: scene.narration,
    audioFile: `audio/vo/${fileName}`,
    voDurationInSeconds: voSec,
    voDurationInFrames: voFrames,
    leadFrames: LEAD_FRAMES,
    tailFrames: tail,
    durationInFrames,
    startFrame: cursor,
    captions: captionsFromAlignment(payload.alignment),
  });
  cursor += durationInFrames;
  console.log(`${voSec.toFixed(2)}s (${durationInFrames} frames incl. padding)`);
}

const manifest = {
  fps: FPS,
  totalDurationInFrames: cursor,
  generatedAt: new Date().toISOString(),
  voice,
  scenes: timings,
};
writeFileSync(join(ROOT, 'src', 'data', 'timings.json'), JSON.stringify(manifest, null, 2));
console.log(`\nWrote src/data/timings.json — total ${(cursor / FPS).toFixed(1)}s (${cursor} frames)`);

// ---------- 4. SRT subtitles (absolute video time) ----------
const srtTime = (sec: number) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const milli = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${milli}`;
};
let srt = '';
let n = 1;
for (const t of timings) {
  const offset = (t.startFrame + t.leadFrames) / FPS;
  for (const c of t.captions) {
    srt += `${n++}\n${srtTime(offset + c.start)} --> ${srtTime(offset + c.end)}\n${c.text}\n\n`;
  }
}
writeFileSync(join(ROOT, 'output', 'captions.srt'), srt);
console.log('Wrote output/captions.srt');
