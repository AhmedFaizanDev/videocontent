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

/** One structured model call → the parsed object. Throws when headless Claude is unavailable. */
export function callModel(c: Call): any {
  if (OFFLINE) throw new Error('BATCH_OFFLINE: no model calls');
  const cwd = join(ROOT, 'iterations', 'batch-cwd'); // outside any CLAUDE.md scope
  mkdirSync(cwd, {recursive: true});
  const args = ['-p', '--model', c.model ?? 'sonnet', '--tools', '', '--strict-mcp-config', '--disable-slash-commands', '--setting-sources', '', '--no-session-persistence', '--system-prompt', c.system, '--output-format', 'json', '--json-schema', JSON.stringify(c.schema)];
  const r = spawnSync(claudeBin(), args, {input: c.user, encoding: 'utf8', cwd, maxBuffer: 64 << 20, timeout: 20 * 60 * 1000});
  let out: any;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    throw new Error(`headless Claude gave no JSON: ${(r.stderr || r.stdout || String(r.error)).slice(0, 300)}`);
  }
  if (out.is_error) throw new Error(`headless Claude: ${String(out.result).slice(0, 300)}${/log ?in/i.test(String(out.result)) ? ' — run the claude binary once and /login' : ''}`);
  const u = out.usage ?? {};
  const jobs = join(projectDir(c.project), 'jobs');
  mkdirSync(jobs, {recursive: true});
  appendFileSync(join(jobs, 'usage.jsonl'), JSON.stringify({at: new Date().toISOString(), ...c.tag, model: c.model ?? 'sonnet', cost: out.total_cost_usd, in: u.input_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens, out: u.output_tokens, ms: out.duration_ms}) + '\n');
  return out.structured_output ?? JSON.parse(String(out.result).replace(/^```json\s*|```\s*$/g, ''));
}
