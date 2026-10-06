/** Shared ElevenLabs helpers: voice resolution, TTS with timestamps, caption chunking. */

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};
export type Caption = {text: string; start: number; end: number};

const API = 'https://api.elevenlabs.io/v1';

export function requireKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    console.error(
      '\n❌ ELEVENLABS_API_KEY is missing. Add it to the .env file at the project root:\n' +
        '  ELEVENLABS_API_KEY=sk_...\n' +
        'Create a key at https://elevenlabs.io/app/settings/api-keys\n',
    );
    process.exit(1);
  }
  return key;
}

export async function resolveVoice(key: string): Promise<{id: string; name: string}> {
  const override = process.env.VOICE_ID?.trim();
  const res = await fetch(`${API}/voices`, {headers: {'xi-api-key': key}});
  if (!res.ok) {
    console.error(`\n❌ Could not list ElevenLabs voices (HTTP ${res.status}). Check ELEVENLABS_API_KEY.\n`);
    process.exit(1);
  }
  const data = (await res.json()) as {voices: {voice_id: string; name: string}[]};
  if (override) {
    const f = data.voices.find((v) => v.voice_id === override);
    return {id: override, name: f?.name ?? 'custom voice'};
  }
  const preferred = ['Brian', 'George', 'Eric', 'Daniel', 'Bella'];
  for (const name of preferred) {
    const v = data.voices.find((x) => x.name === name || x.name.startsWith(`${name} `));
    if (v) return {id: v.voice_id, name: v.name};
  }
  const first = data.voices[0];
  if (!first) {
    console.error('\n❌ Your ElevenLabs account has no voices available.\n');
    process.exit(1);
  }
  return {id: first.voice_id, name: first.name};
}

export async function tts(
  key: string,
  voiceId: string,
  text: string,
  prev?: string,
  next?: string,
): Promise<{audio: Buffer; alignment: Alignment}> {
  const res = await fetch(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {'xi-api-key': key, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      // Calm, measured tutorial read (speed < 1 slows the pace for beginners).
      voice_settings: {stability: 0.58, similarity_boost: 0.75, style: 0.12, use_speaker_boost: true, speed: 0.94},
      previous_text: prev,
      next_text: next,
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed (HTTP ${res.status}): ${await res.text()}`);
  }
  const payload = (await res.json()) as {audio_base64: string; alignment: Alignment};
  return {audio: Buffer.from(payload.audio_base64, 'base64'), alignment: payload.alignment};
}

/** Group character-level alignment into readable ~42-char caption lines. */
export function captionsFromAlignment(align: Alignment): Caption[] {
  type Word = {text: string; start: number; end: number};
  const words: Word[] = [];
  let cur: Word | null = null;
  align.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
    } else if (!cur) {
      cur = {text: ch, start: align.character_start_times_seconds[i], end: align.character_end_times_seconds[i]};
    } else {
      cur.text += ch;
      cur.end = align.character_end_times_seconds[i];
    }
  });
  if (cur) words.push(cur);

  const MAX = 42;
  const caps: Caption[] = [];
  let chunk: Word[] = [];
  const flush = () => {
    if (!chunk.length) return;
    caps.push({text: chunk.map((w) => w.text).join(' '), start: chunk[0].start, end: chunk[chunk.length - 1].end});
    chunk = [];
  };
  for (const w of words) {
    const len = chunk.map((x) => x.text).join(' ').length;
    if (len > 0 && len + 1 + w.text.length > MAX) flush();
    chunk.push(w);
    if (/[.!?…—:]$/.test(w.text) && chunk.map((x) => x.text).join(' ').length > 16) flush();
  }
  flush();
  for (let i = 0; i < caps.length; i++) {
    const next = caps[i + 1];
    caps[i].end = Math.min(caps[i].end + 0.25, next ? next.start : caps[i].end + 0.25);
  }
  return caps;
}

export const srtTime = (sec: number) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const milli = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${milli}`;
};
