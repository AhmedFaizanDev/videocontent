/**
 * Audio mastering: two-pass EBU R128 loudness normalisation to −14 LUFS integrated,
 * −1.5 dBTP true-peak ceiling (YouTube/online-video norm). Video is stream-copied.
 * Uses system ffmpeg when present, otherwise Remotion's bundled ffmpeg.
 */
import {execFileSync, spawnSync} from 'node:child_process';

export const TARGET = {I: -14, TP: -1.5, LRA: 11};

const ffmpeg = (): string[] => {
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-filters'], {encoding: 'utf8'});
  if (probe.status === 0 && /loudnorm/.test(probe.stdout)) return ['ffmpeg'];
  return ['npx', 'remotion', 'ffmpeg'];
};

export function masterAudio(input: string, output: string) {
  const [bin, ...pre] = ffmpeg();
  const base = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}`;
  const pass1 = spawnSync(bin, [...pre, '-hide_banner', '-nostats', '-i', input, '-vn', '-af', `${base}:print_format=json`, '-f', 'null', '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const json = /\{[^{}]*"input_i"[^{}]*\}/s.exec(pass1.stderr ?? '');
  if (!json) throw new Error('loudnorm measurement failed');
  const m = JSON.parse(json[0]);
  const filter = `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync(
    bin,
    [...pre, '-loglevel', 'error', '-y', '-i', input, '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0', '-af', filter, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', output],
    {stdio: 'inherit'},
  );
}
