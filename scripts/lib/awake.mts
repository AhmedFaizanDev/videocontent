/** Keep macOS awake while this process runs (idle sleep kills long renders). No-op elsewhere. */
import {spawn} from 'node:child_process';

export function stayAwake() {
  if (process.platform !== 'darwin') return;
  spawn('caffeinate', ['-ims', '-w', String(process.pid)], {stdio: 'ignore', detached: true}).unref();
}
