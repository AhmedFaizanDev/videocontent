/** Build readable caption lines from a per-word timeline (Polly or Edge). */
import {WIDE} from '../../src/lang.ts';
export type Word = {w: string; raw: string; start: number; end: number};
export type Caption = {text: string; start: number; end: number};

/** `max` characters per caption; Indic scripts count vowel signs as characters, so they get more. */
export function captionsFromWords(words: Word[], max = 42): Caption[] {
  const MAX = max;
  const caps: Caption[] = [];
  let chunk: Word[] = [];
  const flush = () => {
    if (!chunk.length) return;
    caps.push({
      // Japanese narration is phrase-spaced for timing; on screen it reads unspaced
      text: chunk.map((w) => w.raw).join(' ').replace(new RegExp(`(?<=${WIDE.source}) (?=${WIDE.source})`, 'gu'), ''),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
    });
    chunk = [];
  };
  for (const w of words) {
    const len = chunk.map((x) => x.raw).join(' ').length;
    if (len > 0 && len + 1 + w.raw.length > MAX) flush();
    chunk.push(w);
    if (/[.!?…—:।॥。！？]$/.test(w.raw) && chunk.map((x) => x.raw).join(' ').length > 16) flush();
  }
  flush();
  for (let i = 0; i < caps.length; i++) {
    const next = caps[i + 1];
    caps[i].end = Math.min(caps[i].end + 0.2, next ? next.start : caps[i].end + 0.2);
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
