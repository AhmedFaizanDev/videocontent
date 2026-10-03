/**
 * Synthetic timings — narration "spoken" at the project's voice.wpm, words spaced by length,
 * audio = 1 s of silence. Lets tests render any spec (fixtures, drafts) with no TTS.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {FPS, loadProject, readSpec, timingsPath} from './paths.mts';
import {captionsFromWords, type Word} from './captions.mts';
import {normWord} from '../../src/sync.ts';
import {spoken} from '../../src/project.ts';
import {paceOf, retime} from '../../src/schedule.ts';
import {isIndic} from '../../src/lang.ts';

/** Timings as if the narration were spoken at voice.wpm — no audio, deterministic. */
export function syntheticTimings(project: string, spec: any) {
  const {voice, pacing, lang} = loadProject(project);
  const id = spec.id;
  const scenes = spec.scenes.map((s: any, i: number) => {
    if (s.type === 'ident') {
      const sec = s.seconds ?? 3.2;
      return {index: i + 1, type: s.type, narration: '', audioFile: 'audio/silence.mp3', voDurationInSeconds: sec, voDurationInFrames: Math.ceil(sec * FPS), captions: [], words: []};
    }
    const toks: string[] = spoken(s.narration).split(/\s+/).filter(Boolean);
    const sec = (toks.length / voice.wpm) * 60 + toks.filter((t) => /[.!?…।॥]$/.test(t)).length * pacing.sentencePause;
    const total = toks.reduce((n, t) => n + t.length + 1, 0);
    let t = 0.05;
    const words: Word[] = toks.map((raw) => {
      const d = (sec * (raw.length + 1)) / total;
      const w = {w: normWord(raw), raw, start: +t.toFixed(3), end: +(t + d).toFixed(3)};
      t += d;
      return w;
    });
    return {
      index: i + 1,
      type: s.type,
      narration: spoken(s.narration),
      audioFile: 'audio/silence.mp3',
      voDurationInSeconds: sec,
      voDurationInFrames: Math.ceil(sec * FPS),
      captions: captionsFromWords(words, isIndic(lang) ? 54 : 42),
      words: words.map(({w, start, end}) => ({w, start, end})),
    };
  });
  return retime({id, fps: FPS, totalDurationInFrames: 0, voice: {id: 'synthetic', name: 'synthetic'}, scenes} as any, paceOf(loadProject(project, spec)));
}

/** Write synthetic timings as the lesson's build timings (fixtures/tests only). */
export function writeFakeTimings(project: string, id: string) {
  mkdirSync(join(timingsPath(project, id), '..'), {recursive: true});
  writeFileSync(timingsPath(project, id), JSON.stringify(syntheticTimings(project, readSpec(project, id)), null, 2));
}
