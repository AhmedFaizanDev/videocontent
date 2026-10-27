# Educational video pipeline

Turns teaching material into narrated, animated 1080p explainer videos. You write a lesson
as JSON (content + exact narration); the pipeline voices it with free Microsoft Edge neural
TTS in English, Hindi, Marathi or Kannada, animates it in the house "Clinical" style (clean
off-white page, Sora/Inter + Anek/Noto type, colourful animated medical illustrations,
MedSkills brand, camera moves, foley, ducked music) with every reveal fired by the spoken
word, renders it with Remotion, proves it with QA gates, and records production metrics.

Course PDF → video: `node scripts/batch.mts <project> all` (one writer call per lesson; see
CLAUDE.md). Writer contract: **`docs/SCRIPT_BRIEF.md`**. Illustrations: **`docs/ART.md`**.

## Quick start

```bash
npm install
python3 -m venv .venv && .venv/bin/pip install boto3 edge-tts faster-whisper   # Polly (needs ~/.aws/credentials), Edge for mr/kn, Whisper check
brew install ffmpeg poppler        # macOS; Linux: see HANDOFF.md "Machine"

npm test -- --fast                                          # pipeline healthy?
node scripts/new-project.mts biology-101 "Biology 101" "Life Sciences"
#   … edit projects/biology-101/project.json, write projects/biology-101/specs/L01.json
npm run produce -- biology-101                              # → output/biology-101/
```

## Commands

Every tool takes `<project> [ids… | --all | --range A B]` (no ids = all).

| command | what it does |
|---|---|
| `npm run validate -- <p>` | text gate: shape, project rules, narration sync, runtime estimate (+ no SVG text) |
| `npm run preflight -- <p>` | **before any audio/video**: validate + source grounding + spelling + speech hazards + timing simulation + dry-run layout → `projects/<p>/PREFLIGHT.md` |
| `npm run voiceover -- <p>` | Amazon Polly (Edge for languages Polly lacks) per sentence with pacing (hash-cached per scene), word timeline, runtime vs target, sync vs the real voice |
| `npm run review -- <p> [ids] [--transitions]` | stills + contact sheet per lesson, layout gate |
| `npm run render -- <p> [--force]` | render + master + SRT + thumbnail + YouTube chapters/credits + manifest; skips lessons already current |
| `npm run qa -- <p>` | technical checks + MP4-vs-stills consistency + layout → `output/…/QA.md` |
| `node scripts/batch.mts <p> plan\|write\|check\|produce\|all` | course PDFs → scripts (1 call each) → gates + ≤2 scoped repairs → produce |
| `npm run produce -- <p> [--review]` | preflight the whole batch, then each lesson voiceover → render → qa; a failing lesson is set aside and the batch carries on; re-runs skip finished work |
| `node scripts/strings.mts extract\|apply …` | translate a finished lesson into another language (extract the text, translate, apply into a new project) |
| `node scripts/vendor-fonts.mts` | re-download the house fonts into `public/fonts` (only when the font set changes) |
| `npm run metrics -- report` | measured time per stage + Claude token usage per video → `output/METRICS.md`, with an ETA/cost model for bulk runs (`metrics.mts authoring …` records a video's authoring tokens from Claude Code transcripts) |
| `npm run studio` | Remotion Studio: every voiced lesson, by `<project>-<id>` |
| `npm test [-- --fast]` | the pipeline's own tests (types, lint, units, all specs, fixture renders) |
| `node scripts/new-project.mts <slug> "<Name>" ["<Series>"]` | scaffold a project |
| `node scripts/render.mts <p> <id> --out dir --frames a-b` | render a review clip |

## Layout

```
projects/<slug>/project.json      brand, voice, music, target length, rules, output folder
projects/<slug>/specs/<id>.json   lessons (authored)             ← the only thing you write
projects/<slug>/source/           the client material = the fact ledger (PDF/.md/.txt)
projects/<slug>/build/            measured timings (generated)
public/audio/vo/<slug>/<id>/      narration (generated)
output/<output.dir>/              MP4 + SRT + .build.json manifest + QA.md

src/project.ts   project config + defaults      src/spec.ts      lesson contract
src/stage.ts     the picture-first `stage` scene: world, camera, beats (renderer: templates/StageScene.tsx)
src/sync.ts      which spoken word fires which reveal (shared by renderer + validator)
src/schedule.ts  frame layout + transitions     src/motion.ts    easing, camera, clocks
src/theme.ts     palette, type, safe area       src/templates/   scenes, stage, brand
src/art/         kit, generic diagrams (cycle flow timeline hub stack bars trace image),
                 the graph engine (graph.tsx), packs (endoscopy, heart, circulation, metabolic,
                 respiratory, infection, body: person/body map/vessel/gauge/icons), catalog (docs/ART.md)
scripts/         the tools above; scripts/lib/  paths, TTS, captions, mastering, pixel checks
projects/fixtures, projects/smoke               test corpora (not deliverables)
archive/         retired pilot, ElevenLabs code, historical docs
```

## How quality is guaranteed

| risk | guard |
|---|---|
| a reveal whose word is never spoken drifts off the voice | `src/sync.ts` + validate (error; `say` overrides) + re-check against the real voice after TTS |
| a number or term that isn't in the source material | preflight grounding against `source/` (the fact ledger) |
| the voice misreads symbols, ranges, units, hard names | `scripts/lib/speak.mts` speakable form + project `lexicon` + preflight speech check |
| mixed spelling (fibre/fiber) | preflight, `style.spelling` |
| crammed reveals, long static stretches, over-long scenes | preflight timing simulation at the voice's pace |
| a layout problem found only after rendering | preflight dry-run render with synthetic timings, settled-frame sampling |
| wrong scene order / missing knowledge check | project `rules` in validate |
| lesson too long/short | validate estimate → voiceover measurement vs `length.minutes` |
| text/figure overflow into margins or captions | review + qa layout gate; fixtures at min/max |
| render-only bugs (e.g. text laid out before fonts load) | qa compares MP4 frames with stills; lint bans SVG text |
| stale renders after a code fix | render manifest hashes spec + timings + config + `src/` |
| broken encode, loudness, black/frozen frames, bad SRT | qa technical checks (−14 LUFS, BT.709, full decode…) |
| machine sleeps mid-batch | render/produce hold a `caffeinate` assertion |
| one bad lesson stalls a bulk run | produce sets it aside and continues; TTS calls time out and retry; reports merge per lesson |

## Troubleshooting

- **Render finishes frames then hangs at 0% CPU (macOS, no network):** Remotion's bundled
  ffmpeg is blocked by Gatekeeper. Symlink Homebrew ffmpeg@7 next to the bundled `remotion`
  binary and pass `--binaries-directory` (details: `archive/docs/HANDOFF_history.md` §7).
- **Voice:** `scripts/lib/tts.py` (never name it `edge_tts.py`/`boto3.py` — it would shadow the
  package). Pacing comes from project.json `pacing` and `voice.rate`. A word Polly says wrong goes in
  project.json `lexicon` as IPA (`"asystole": "/eɪˈsɪstəli/"`). Check a voiced lesson by ear-proxy:
  `.venv/bin/python scripts/hear.py <p> <id> --model medium.en` (Whisper; lists words heard differently).
- **Music licence:** see `public/audio/music/CREDITS.md` before publishing.
