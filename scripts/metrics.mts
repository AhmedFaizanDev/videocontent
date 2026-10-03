/**
 * Production metrics: record Claude authoring usage, and report measured cost/time with an
 * ETA model for bulk runs.
 *
 *   node scripts/metrics.mts authoring <project> <id> --label "spec" (--transcript f.jsonl … | --session <id>) [--since ISO] [--until ISO] [--replace]
 *       sum token usage from Claude Code transcripts (a subagent's own transcript = that
 *       video's authoring; or a main-session time window) into the lesson's metrics
 *   node scripts/metrics.mts overhead --label "pipeline work" (--transcript … | --session <id>) [--since] [--until]
 *       one-off work not tied to a video (pipeline changes, new art) → metrics/overhead.json
 *   node scripts/metrics.mts report [projects…]    → output/METRICS.md (all projects by default)
 *
 * Stage timings (preflight, voiceover, render, qa) are recorded by those scripts themselves.
 */
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {ROOT, listProjects, loadProject, mp4Path, specIds} from './lib/paths.mts';
import {PRICES, readMetrics, usageFromTranscripts, writeMetrics, type Metrics, type Segment} from './lib/metrics.mts';

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const many = (k: string) => argv.flatMap((a, i) => (a === `--${k}` ? [argv[i + 1]] : []));
const OVERHEAD = join(ROOT, 'metrics', 'overhead.json');

/** Transcript files: explicit, or a session's main transcript plus its subagents. */
function transcripts(): string[] {
  const files = many('transcript');
  const sid = opt('session');
  if (sid) {
    const dir = join(homedir(), '.claude', 'projects', ROOT.replace(/[^A-Za-z0-9]/g, '-'));
    files.push(join(dir, `${sid}.jsonl`));
    const sub = join(dir, sid, 'subagents');
    if (existsSync(sub) && !opt('main-only')) files.push(...readdirSync(sub).filter((f) => f.endsWith('.jsonl')).map((f) => join(sub, f)));
  }
  const missing = files.filter((f) => !existsSync(f));
  if (!files.length || missing.length) (console.error(`transcripts missing: ${missing.join(', ') || '(none given)'}`), process.exit(1));
  return files;
}

const segment = (): Segment => ({label: opt('label') ?? 'authoring', ...usageFromTranscripts(transcripts(), opt('since'), opt('until'))});
const fmtTok = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);
const totalTok = (t: Segment['tokens']) => t.input + t.cacheWrite5m + t.cacheWrite1h + t.cacheRead + t.output;

if (cmd === 'authoring') {
  const [, project, id] = argv;
  if (!project || !id) (console.error('usage: metrics.mts authoring <project> <id> --label … --transcript …'), process.exit(1));
  const m = readMetrics(project, id);
  const seg = segment();
  m.authoring = argv.includes('--replace') ? [seg] : [...m.authoring.filter((s) => s.label !== seg.label), seg];
  writeMetrics(m);
  console.log(`${project}/${id} ${seg.label}: ${seg.requests} requests, ${fmtTok(totalTok(seg.tokens))} tokens (${fmtTok(seg.tokens.output)} out), $${seg.costUSD.toFixed(2)} API-equivalent, ${seg.wallMinutes} min`);
} else if (cmd === 'overhead') {
  const all: Segment[] = existsSync(OVERHEAD) ? JSON.parse(readFileSync(OVERHEAD, 'utf8')) : [];
  const seg = segment();
  mkdirSync(join(ROOT, 'metrics'), {recursive: true});
  writeFileSync(OVERHEAD, JSON.stringify([...all.filter((s) => s.label !== seg.label), seg], null, 2));
  console.log(`overhead ${seg.label}: ${fmtTok(totalTok(seg.tokens))} tokens, $${seg.costUSD.toFixed(2)}, ${seg.wallMinutes} min`);
} else if (cmd === 'report') {
  report(argv.slice(1).filter((a) => !a.startsWith('--')));
} else {
  console.error('usage: node scripts/metrics.mts authoring|overhead|report …');
  process.exit(1);
}

function report(only: string[]) {
  const projects = only.length ? only : listProjects().filter((p) => !['fixtures', 'smoke'].includes(p));
  const rows: {p: string; id: string; m: Metrics}[] = [];
  for (const p of projects) for (const id of specIds(p)) if (existsSync(join(ROOT, 'projects', p, 'build', `${id}.metrics.json`))) rows.push({p, id, m: readMetrics(p, id)});
  const s = (m: Metrics, k: string) => m.stages[k]?.seconds ?? 0;
  const machine = (m: Metrics) => s(m, 'preflight') + s(m, 'voiceover') + (m.stages.render?.totalSeconds ?? s(m, 'render')) + s(m, 'qa');
  const auth = (m: Metrics) => m.authoring.reduce((a, x) => ({tok: a.tok + totalTok(x.tokens), out: a.out + x.tokens.output, cost: a.cost + x.costUSD, min: a.min + x.wallMinutes}), {tok: 0, out: 0, cost: 0, min: 0});
  const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
  const lines: string[] = [
    '# Production metrics',
    '',
    `Generated ${new Date().toISOString()} on this Mac. Machine stages are measured by the scripts; authoring is Claude Code token usage from transcripts, priced at API list rates (${Object.entries(PRICES).map(([k, v]) => `${k} $${v.input}/$${v.output} per MTok`).slice(0, 1).join('')}; cache writes 1.25×/2× input, reads $0.20) — a subscription is not billed per token, so cost is the API-equivalent for planning.`,
    '',
    '| video | lang | runtime | words | authoring tokens | output tok | API-eq. cost | authoring wall | preflight | TTS | render | render fps | QA | machine total | MP4 |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const {p, id, m} of rows) {
    const a = auth(m);
    const mp4 = existsSync(mp4Path(p, id)) ? `${((m.stages.render?.bytes ?? 0) / 1e6).toFixed(0)} MB` : '—';
    lines.push(
      `| ${p}/${id} | ${m.lang ?? loadProject(p).lang} | ${m.runtimeMinutes ? mmss(m.runtimeMinutes * 60) : '—'} | ${m.words ?? '—'} | ${a.tok ? fmtTok(a.tok) : '—'} | ${a.out ? fmtTok(a.out) : '—'} | ${a.cost ? `$${a.cost.toFixed(2)}` : '—'} | ${a.min ? `${a.min.toFixed(0)} min` : '—'} | ${s(m, 'preflight').toFixed(0)} s | ${s(m, 'voiceover').toFixed(0)} s | ${mmss(s(m, 'render'))} | ${m.stages.render?.fps ?? '—'} | ${mmss(s(m, 'qa'))} | ${mmss(machine(m))} | ${mp4} |`,
    );
  }
  const done = rows.filter(({m}) => m.stages.render && m.runtimeMinutes);
  if (done.length) {
    const vidMin = done.reduce((n, {m}) => n + (m.runtimeMinutes ?? 0), 0);
    const machMin = done.reduce((n, {m}) => n + machine(m), 0) / 60;
    const perVidMin = machMin / vidMin;
    const authored = rows.filter(({m}) => m.authoring.length);
    const avg = (f: (m: Metrics) => number) => (authored.length ? authored.reduce((n, {m}) => n + f(m), 0) / authored.length : 0);
    const aTok = avg((m) => auth(m).tok);
    const aCost = avg((m) => auth(m).cost);
    const aMin = avg((m) => auth(m).min);
    const overhead: Segment[] = existsSync(OVERHEAD) ? JSON.parse(readFileSync(OVERHEAD, 'utf8')) : [];
    lines.push(
      '',
      '## Rates (measured)',
      '',
      `- Machine time: **${perVidMin.toFixed(2)} min per minute of finished video** (${done.length} video(s), ${vidMin.toFixed(1)} min of video, ${machMin.toFixed(0)} min of machine time; render dominates and is CPU-bound — one job at a time).`,
      authored.length ? `- Authoring (Claude): **${fmtTok(aTok)} tokens, $${aCost.toFixed(2)} API-equivalent, ~${aMin.toFixed(0)} min** per video on average (${authored.length} video(s)).` : '- Authoring: not recorded yet.',
      ...(overhead.length ? [`- One-off overhead (not per video): ${overhead.map((o) => `${o.label} ${fmtTok(totalTok(o.tokens))} tokens / $${o.costUSD.toFixed(2)} / ${o.wallMinutes} min`).join('; ')}.`] : []),
      '',
      '## ETA and cost model',
      '',
      'Machine time runs unattended, one video at a time; authoring runs in parallel ahead of it (subagents), so wall-clock ≈ max(machine, authoring ÷ parallel writers).',
      '',
      '| batch | video length | machine time | authoring tokens | authoring cost (API-eq.) |',
      '|---|---|---|---|---|',
      ...[10, 50, 100, 500].flatMap((n) =>
        [5, 10].map((len) => `| ${n} | ${len} min | ${((n * len * perVidMin) / 60).toFixed(1)} h (${((n * len * perVidMin) / 60 / 24).toFixed(1)} days) | ${fmtTok(n * aTok * (len / 5))} | $${(n * aCost * (len / 5)).toFixed(0)} |`),
      ),
      '',
      'Authoring scales roughly with narration length (the 10-min rows assume 2× a 5-min script). New subjects that need bespoke illustration packs add one-off overhead.',
    );
  }
  mkdirSync(join(ROOT, 'output'), {recursive: true});
  writeFileSync(join(ROOT, 'output', 'METRICS.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}
