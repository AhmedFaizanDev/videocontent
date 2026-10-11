/**
 * Model calls for the batch, one place: headless Claude Code (`claude -p`) with a JSON schema for
 * the answer and nothing else in context — no plugins, skills, MCP servers or settings (those
 * added ~90k tokens to every call; this way the overhead is ~1.3k). Usage is logged per call to
 * projects/<p>/jobs/usage.jsonl (`total_cost_usd` = API-equivalent, also on a subscription).
 *
 * Not logged in → throws. There is no fallback: a subagent session costs 100× a headless call.
 *   BATCH_OFFLINE=1  no model calls at all (tests)
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync, existsSync, mkdirSync, readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {ROOT, projectDir} from './paths.mts';

export const OFFLINE = !!process.env.BATCH_OFFLINE;
export const claudeBin = () => {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const base = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code');
  if (!existsSync(base)) return 'claude';
  const vers = readdirSync(base).filter((d) => /^\d/.test(d)).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  for (const ver of vers.reverse())
    for (const h of readdirSync(join(base, ver))) {
      const b = join(base, ver, h, 'claude.app', 'Contents', 'MacOS', 'claude');
      if (existsSync(b)) return b;
    }
  return 'claude';
};

export type Call = {project: string; tag: {id: string; role: string}; system: string; user: string; schema: object; model?: 'sonnet' | 'opus' | 'haiku'};

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/** A usage/rate limit: wait it out (until the reset time when the message gives one) — the batch never gives up on quota. */
const limitWait = (msg: string): number | null => {
  if (!/limit|rate|overloaded|429|529/i.test(msg)) return null;
  const epoch = /\|(\d{10})\b/.exec(msg);
  return epoch ? Math.max(60_000, +epoch[1] * 1000 - Date.now() + 60_000) : 15 * 60_000;
};

/** One structured model call → the parsed object. Waits out usage limits; throws on anything else (not logged in, bad output). */
export function callModel(c: Call): any {
  if (OFFLINE) throw new Error('BATCH_OFFLINE: no model calls');
  const cwd = join(ROOT, 'iterations', 'batch-cwd'); // outside any CLAUDE.md scope
  mkdirSync(cwd, {recursive: true});
  const args = ['-p', '--model', c.model ?? 'sonnet', '--tools', '', '--strict-mcp-config', '--disable-slash-commands', '--setting-sources', '', '--no-session-persistence', '--system-prompt', c.system, '--output-format', 'json', '--json-schema', JSON.stringify(c.schema)];
  let out: any;
  for (let attempt = 1; ; attempt++) {
    const r = spawnSync(claudeBin(), args, {input: c.user, encoding: 'utf8', cwd, maxBuffer: 64 << 20, timeout: 20 * 60 * 1000});
    try {
      out = JSON.parse(r.stdout);
    } catch {
      const msg = (r.stderr || r.stdout || String(r.error)).slice(0, 300);
      const wait = limitWait(msg) ?? (attempt <= 3 ? attempt * 60_000 : null); // network hiccups: 3 retries
      if (wait == null) throw new Error(`headless Claude gave no JSON: ${msg}`);
      console.log(`  ⏳ ${c.tag.id}: ${msg.split('\n')[0]} — retrying in ${Math.round(wait / 60_000)} min`);
      sleep(wait);
      continue;
    }
    if (!out.is_error) break;
    const msg = String(out.result);
    if (/log ?in/i.test(msg)) throw new Error(`headless Claude: ${msg.slice(0, 200)} — run the claude binary once and /login`);
    const wait = limitWait(msg);
    if (wait == null) throw new Error(`headless Claude: ${msg.slice(0, 300)}`);
    console.log(`  ⏳ ${c.tag.id}: usage limit (${msg.slice(0, 80)}) — waiting ${Math.round(wait / 60_000)} min, then resuming`);
    sleep(wait);
  }
  const u = out.usage ?? {};
  const jobs = join(projectDir(c.project), 'jobs');
  mkdirSync(jobs, {recursive: true});
  appendFileSync(join(jobs, 'usage.jsonl'), JSON.stringify({at: new Date().toISOString(), ...c.tag, model: c.model ?? 'sonnet', cost: out.total_cost_usd, in: u.input_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens, out: u.output_tokens, ms: out.duration_ms}) + '\n');
  return out.structured_output ?? JSON.parse(String(out.result).replace(/^```json\s*|```\s*$/g, ''));
}
