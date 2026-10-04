/**
 * Model calls for the bulk pipeline, one place: headless Claude Code (`claude -p`, no session, a
 * JSON schema for the answer, optionally images it may Read) when it is logged in; otherwise
 * "agent mode": a job file the orchestrating Claude session runs as one subagent, single pass.
 * Usage is logged per call to projects/<p>/jobs/usage.jsonl (read by scripts/benchmark.mts).
 *
 *   model: 'sonnet' (per-video work) · 'opus' (creative capital: playbooks, once per asset)
 *   BATCH_OFFLINE=1  no model calls at all (tests, the deterministic benchmark)
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs';
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
/** null until the first call; false once headless Claude proved unavailable (→ job files). */
export const cli = {ok: null as boolean | null};

export type Call = {project: string; tag: {id: string; role: string}; system: string; user: string; schema: object; model?: 'sonnet' | 'opus'; images?: string[]};

/** One structured model call; null when headless Claude isn't available (→ agent mode). */
export function callModel(c: Call): any | null {
  if (cli.ok === false || OFFLINE) return null;
  const tmp = join(ROOT, 'iterations', 'batch-cwd'); // outside any CLAUDE.md scope we'd load needlessly
  mkdirSync(tmp, {recursive: true});
  const tools = c.images?.length ? ['--tools', 'Read', '--allowedTools', 'Read', '--add-dir', join(ROOT, 'iterations'), '--add-dir', join(ROOT, 'assets')] : ['--tools', ''];
  const user = c.images?.length ? `${c.user}\n\nIMAGES (Read each one before answering):\n${c.images.map((i) => `- ${i}`).join('\n')}` : c.user;
  const r = spawnSync(claudeBin(), ['-p', '--model', c.model ?? 'sonnet', ...tools, '--no-session-persistence', '--system-prompt', c.system, '--output-format', 'json', '--json-schema', JSON.stringify(c.schema)], {input: user, encoding: 'utf8', cwd: tmp, maxBuffer: 64 << 20, timeout: 20 * 60 * 1000});
  let out: any;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    cli.ok = false;
    return null;
  }
  if (out.is_error) {
    if (/log ?in/i.test(String(out.result))) console.log('  ⚠️  headless Claude is not logged in — switching to agent mode (job files). Log in once with: "<claude binary>" then /login');
    cli.ok = false;
    return null;
  }
  cli.ok = true;
  const u = out.usage ?? {};
  const jobs = join(projectDir(c.project), 'jobs');
  mkdirSync(jobs, {recursive: true});
  writeFileSync(join(jobs, 'usage.jsonl'), JSON.stringify({at: new Date().toISOString(), ...c.tag, model: c.model ?? 'sonnet', cost: out.total_cost_usd, in: u.input_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens, out: u.output_tokens, ms: out.duration_ms}) + '\n', {flag: 'a'});
  return out.structured_output ?? JSON.parse(String(out.result).replace(/^```json\s*|```\s*$/g, ''));
}

/** Agent mode: the same call as a job file for one subagent; returns its path. */
export function writeJob(c: Call & {name: string; target: string; preface?: string; extra?: string}): string {
  const jobs = join(projectDir(c.project), 'jobs');
  mkdirSync(jobs, {recursive: true});
  const f = join(jobs, `${c.name}.md`);
  const model = c.model === 'opus' ? 'Opus' : 'Sonnet';
  writeFileSync(
    f,
    `# Job ${c.name}\nRun as ONE ${model} subagent: read nothing else${c.images?.length ? ' but the images listed under Input' : ''}. ${c.preface ?? ''} Write the final JSON to \`${c.target.replace(ROOT + '/', '')}\` (one Write), and stop.\n\n## System\n${c.system}${c.extra ?? ''}\n\n## Schema\n\`\`\`json\n${JSON.stringify(c.schema)}\n\`\`\`\n\n## Input\n${c.user}${c.images?.length ? `\n\nIMAGES (Read each one):\n${c.images.map((i) => `- ${i}`).join('\n')}` : ''}\n`,
  );
  return f;
}
