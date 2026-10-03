/**
 * Production metrics, per lesson: projects/<p>/build/<id>.metrics.json
 *
 *   stages.preflight   seconds (the batch's time split per lesson)
 *   stages.voiceover   seconds, scenes voiced / cached, characters sent to TTS, audio seconds
 *   stages.render      seconds, frames, fps, MP4 bytes
 *   stages.qa          seconds, pass
 *   authoring          Claude segments (tokens, API-equivalent cost, wall time) — recorded by
 *                      `node scripts/metrics.mts authoring …` from Claude Code transcripts
 *
 * Every stage script records itself, so the numbers are measured, never estimated.
 * `node scripts/metrics.mts report` turns them into output/METRICS.md with an ETA/cost model.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {projectDir} from './paths.mts';

export type Segment = {
  label: string;
  model: string;
  requests: number;
  tokens: {input: number; cacheWrite5m: number; cacheWrite1h: number; cacheRead: number; output: number};
  costUSD: number;
  wallMinutes: number;
  from: string;
  to: string;
  /** output tokens estimated from the generated text/tool inputs (transcript lacked the final count; hidden thinking excluded) */
  outputEstimated?: boolean;
};
export type Metrics = {
  project: string;
  id: string;
  lang?: string;
  runtimeMinutes?: number;
  words?: number;
  stages: Record<string, Record<string, any> & {seconds?: number; at: string}>;
  authoring: Segment[];
};

export const metricsPath = (p: string, id: string) => join(projectDir(p), 'build', `${id}.metrics.json`);

export function readMetrics(p: string, id: string): Metrics {
  const f = metricsPath(p, id);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {project: p, id, stages: {}, authoring: []};
}

export function writeMetrics(m: Metrics) {
  const f = metricsPath(m.project, m.id);
  mkdirSync(dirname(f), {recursive: true});
  writeFileSync(f, JSON.stringify(m, null, 2));
}

/** Record one stage's measurements (replaces that stage's previous record). */
export function recordStage(p: string, id: string, stage: string, data: Record<string, any>, top: Partial<Metrics> = {}) {
  const m = readMetrics(p, id);
  m.stages[stage] = {...data, at: new Date().toISOString()};
  Object.assign(m, top);
  writeMetrics(m);
}

/**
 * API list prices, USD per million tokens (Anthropic, cached 2026-06-24). Cache writes:
 * 5-minute = 1.25× input, 1-hour = 2× input; cache reads as listed. Claude Code on a
 * subscription isn't billed per token — this is the API-equivalent cost, for planning.
 */
export const PRICES: Record<string, {input: number; output: number; cacheRead: number}> = {
  'claude-opus-5-5': {input: 4, output: 20, cacheRead: 0.2},
  'claude-opus-5': {input: 5, output: 25, cacheRead: 0.5},
  'claude-fable-5-1': {input: 10, output: 50, cacheRead: 0.25},
  'claude-sonnet-5': {input: 2, output: 10, cacheRead: 0.2},
  'claude-haiku-4-5': {input: 1, output: 5, cacheRead: 0.1},
};
export const priceOf = (model: string) => PRICES[model] ?? PRICES[Object.keys(PRICES).find((k) => model.startsWith(k)) ?? 'claude-opus-5-5'];
export const costOf = (model: string, t: Segment['tokens']) => {
  const p = priceOf(model);
  return (t.input * p.input + t.cacheWrite5m * p.input * 1.25 + t.cacheWrite1h * p.input * 2 + t.cacheRead * p.cacheRead + t.output * p.output) / 1e6;
};

/**
 * Sum usage over Claude Code transcript files (one JSON object per line; a response spans
 * several lines with the same message id, counted once), optionally within [since, until].
 */
export function usageFromTranscripts(files: string[], since?: string, until?: string): Omit<Segment, 'label'> {
  // one entry per response: its lines repeat the usage as it streams, so keep the largest values
  const byId = new Map<string, {model: string; ts: string; t: Segment['tokens']; est: number; blocks: Set<string>}>();
  for (const f of files)
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line.includes('"usage"')) continue;
      let d: any;
      try {
        d = JSON.parse(line);
      } catch {
        continue;
      }
      const msg = d.message;
      const u = msg?.usage;
      if (!u || d.type !== 'assistant') continue;
      const ts: string = d.timestamp ?? '';
      if ((since && ts < since) || (until && ts > until)) continue;
      const key = msg.id ?? d.requestId ?? d.uuid;
      const w1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
      const w5m = u.cache_creation?.ephemeral_5m_input_tokens ?? Math.max(0, (u.cache_creation_input_tokens ?? 0) - w1h);
      const t = {input: u.input_tokens ?? 0, cacheWrite5m: w5m, cacheWrite1h: w1h, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0};
      if (!byId.has(key)) byId.set(key, {model: msg.model, ts, t, est: 0, blocks: new Set()});
      const r = byId.get(key)!;
      for (const k of Object.keys(t) as (keyof typeof t)[]) r.t[k] = Math.max(r.t[k], t[k]);
      // generated content, for when the transcript only kept a streaming stub of output_tokens
      for (const b of Array.isArray(msg.content) ? msg.content : []) {
        const body = b.type === 'text' ? b.text : b.type === 'tool_use' ? JSON.stringify(b.input) : '';
        if (!body || r.blocks.has(body.slice(0, 200))) continue;
        r.blocks.add(body.slice(0, 200));
        r.est += estTokens(body);
      }
    }
  let estimated = false;
  for (const r of byId.values())
    if (r.t.output < 16 && r.est > r.t.output) (r.t.output = r.est), (estimated = true);
  const t = {input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0};
  const byModel = new Map<string, typeof t>();
  let first = '';
  let last = '';
  for (const r of byId.values()) {
    const mt = byModel.get(r.model) ?? {input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0};
    for (const k of Object.keys(t) as (keyof typeof t)[]) (t[k] += r.t[k]), (mt[k] += r.t[k]);
    byModel.set(r.model, mt);
    if (!first || r.ts < first) first = r.ts;
    if (r.ts > last) last = r.ts;
  }
  const cost = [...byModel].reduce((n, [m, x]) => n + costOf(m, x), 0);
  return {
    model: [...byModel.keys()].join(', ') || 'none',
    requests: byId.size,
    tokens: t,
    costUSD: +cost.toFixed(4),
    wallMinutes: first && last ? +((Date.parse(last) - Date.parse(first)) / 60000).toFixed(1) : 0,
    from: first,
    to: last,
    ...(estimated ? {outputEstimated: true} : {}),
  };
}

/** Rough token count of generated text: ~3.8 characters per token for Latin/JSON, ~1.5 for Indic scripts. */
export const estTokens = (s: string) => {
  const non = (s.match(/[^\x00-\x7F]/g) ?? []).length;
  return Math.round((s.length - non) / 3.8 + non / 1.5);
};
