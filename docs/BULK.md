# Bulk production — course PDFs → finished videos, first pass

Owner's operating model (2026-10-04): client courses arrive as module PDFs; 50–100 videos a week;
English plus fully native Hindi, Marathi, Kannada; narration strictly from the source; no human
checkpoints until the finished videos; one automatic repair per failing video, then set aside;
rendering on this Mac overnight.

## Why videos used to take so long (measured, `npm run metrics -- report`)
| cost | before | cause | now |
|---|---|---|---|
| authoring tokens | 0.5–9.6 M per video (output only 8–50 k) | an agent loop re-reading ~35 KB of context dozens of times: write → preflight → fix → storyboard → look → fix | one schema-constrained call per video, ~5–10 k tokens in, ~3 k out; one repair call max |
| layout retries | most iterations | hand-placed worlds, layer sizes, camera zooms, label spots | recipe scenes compile all of it (`src/compile.ts`): authors cannot place coordinates |
| "static / tiny text" retries | found by watching renders | no upstream check | `rules.maxIdle` (7 s) fails preflight before audio; long LR charts auto-tour; tables/flows reveal progressively |
| art rounds | many review rounds per drawing | drawing from scratch | source first (`find-assets` → `ingest-art`), once per subject, reused by every video |
| re-renders | after late fixes | correctness found after render | gates moved upstream; a script reaches render only when proven |
| render time | 5–8 min per 5-min video | fanless MacBook Air: bursts ~45–50 fps, sustained ~22–25 fps (thermal) | unchanged by design — 100 videos ≈ 11 h/week overnight; the lever is never re-rendering |

## Architecture v5 (2026-10-04): compositions, a director, self-healing
- **Compositions, not templates** (`type: "scene"`, src/compile.ts): 1–3 elements on one screen —
  illustration, flowchart, table, `stat` (count-up figure + icon array), bars, timeline, cycle,
  hub, stack — plus the writer's teaching moves (focus, label, act, note, reveal, pulse). A slot
  solver lays them out (main + side, halves, main + two stacked; dense tables/charts take the main
  slot; text-bearing elements are laid out at their slot's width). Recipes remain as presets.
- **Director** (src/director.ts, `frame.direct`): same illustration keeps its side across scenes,
  transitions chosen by the relation between scenes, camera breath alternates direction.
- **Variety gate** (`rules.variety`): no three identical screens in a row, no kind over 40 %, ≥ 2
  compositions per 6 teaching scenes; course-level warning for identical scene sequences.
- **Legibility gate**: any art text under 22 px on the frame fails preflight (`tiny-text`).
- **Writer + editor**: the editor pass (docs/EDITOR_BRIEF.md rubric: depth, precision, picture
  fit, variety, rhythm, voice) returns the improved script.
- **Self-healing check** (no human): deterministic fixers (scripts/lib/fix.mts: abbreviations →
  full forms from the dictionary, approved spellings, ratios, unspoken cues) → up to 3 escalating
  model repairs (whole script, rethink, failing scenes only) → deterministic fallback
  (scripts/lib/simplify.mts: a failing composition becomes its densest element full screen, same
  narration). `BATCH_OFFLINE=1` runs fixers + fallback only. Every step is recorded.
- **Compiler self-repair**: beats cued by one word merge; long still stretches get a camera
  breath toward what is being said (measured in spoken characters).
- **Pronunciation dictionary** (src/dictionary.ts): brand, medical, abbreviation, proper, tts,
  spelling terms per language, status approved/respelled/pending; the lexicon, the fixer and the
  writer's FULL FORMS list derive from it. Preflight queues unknown words in
  assets/pronunciation/pending.json; `node scripts/say.mts <p> --pending` auditions the queue.
- **Illustrations for a new subject**: `find-assets "<query>"` (NIH BioArt, Servier Medical Art,
  Wikimedia Commons; every hit kept in assets/index.json, `--index` searches it offline) →
  `--get <source>:<id> <dir> --auto` imports, wraps rasters (Servier PNG) as SVG, writes a starter
  manifest with anchors measured from the drawing's labelled parts, and ingests — one command.
  Credits go to projects/<p>/CREDITS.md and output/<dir>/CREDITS.md (scripts/credits.mts, run by
  produce), never into the video. Nothing suitable → tables/flowcharts/stats carry the idea.
- **Benchmark**: `node scripts/benchmark.mts <project…>` → output/BENCHMARK.md (first-pass rate,
  fixer/repair/fallback rates, tokens mean/median, voice and render time, failure categories,
  human-needed share, new-asset share, reusable coverage). Says "not proven" under 20 lessons.

## Built once, reused by every video
- **Scene recipes** (`src/compile.ts`): `opener`, `explain` (any illustration, labelled points,
  camera visits), `flow` (Mermaid; living connectors, auto-tour, ghost map), `table` (progressive
  cells, bars, count-up, row tour), `summary`; plus the automatic **frame**: logo intro + signoff
  outro from `project.json` `frame`.
- **Art library**: imported authoritative assets (`assets/vector/*` + manifests; motion,
  regions, signals, flows) and code packs; `find-assets` / `ingest-art` add more, once per subject.
- **Look and motion**: typography (Sora Heavy / Noto Sans), palette, camera drift, transitions,
  journal-figure flowcharts and tables — all automatic.
- **Narration rules + pronunciation**: `docs/SCRIPT_BRIEF.md` (the gates as writing rules),
  house lexicon (`src/lexicon.ts`), audition tool.
- **Gates** (seconds, no audio/render): schema, sync, grounding in the source, abbreviations,
  pronunciation watch, screen words, idle time, length, dry-run layout + text audit; after
  render: QA + `motion-audit`.
- **Caches**: PDF text, voice per scene, render manifest (skips unchanged), QA.

## The run
```
node scripts/new-project.mts <p> "<Course name>"   # bulk defaults: frame, maxIdle 7, 5:00 standard
cp <client module PDFs> projects/<p>/source/
node scripts/batch.mts <p> plan        # course.json: one video per module PDF (no model call; edit to split)
node scripts/batch.mts <p> write       # one writer call per video → specs/<id>.json
node scripts/batch.mts <p> check       # gates → fixers → ≤3 repairs → fallback (recorded)
caffeinate -ims node scripts/batch.mts <p> produce   # voice → render → QA, overnight
node scripts/batch.mts <p> translate hi             # native copies into <p>-hi, then: batch <p>-hi check/produce
```
`node scripts/batch.mts <p> all` runs plan → write → check → produce.

**Writer modes.** Headless: the batch calls Claude Code's CLI itself (`claude -p`, Sonnet, no
tools, JSON schema) — fully unattended. It needs one login on this Mac: run the CLI once in a
terminal (`"$HOME/Library/Application Support/Claude/claude-code/<version>/<hash>/claude.app/Contents/MacOS/claude"`,
or a separately installed `claude`) and `/login`; set `CLAUDE_BIN` if it lives elsewhere.
Until then the batch writes **job files** (`projects/<p>/jobs/*.md`); in a Claude session say
"run the batch jobs for <p>": one Sonnet subagent per job, single pass, writes the spec — then
`batch check` continues. Token use per call is logged to `projects/<p>/jobs/usage.jsonl`.

## Keeping it first-pass
- A new failure class → add it as a gate (validate/preflight) **and** as a rule line in
  `docs/SCRIPT_BRIEF.md`, never a per-video fix.
- A new subject → find/ingest its assets once before writing that course's scripts; list them in
  `project.json` `arts` so the writer sees them.
- Look at the first finished video of a new course (and `motion-audit`); the rest run unattended.
