# HANDOFF — MedSkills course introductions (bulk render)

Scope of this file: **only the 69 course-introduction videos** (project `ms-intros`). The
full pipeline handoff (course modules, playbooks, visuals stage, history) is archived in
`archive/docs/HANDOFF_pipeline_2026-10-04.md`. Commands and gates: `README.md`, `docs/BULK.md`;
intro contract: `docs/INTRO_BRIEF.md`.

## 0. Goal
One ~1:30 promo per course, 69 total (source: `MedSkills_Course_Master_2026.xlsx`, sheet
"Course Master"). Fixed template: logo ident → Welcome + what/why → what you will learn
(4-node flow) → what you will be able to do (hours stat + 4 outcomes) → who it is for + enroll
line → logo end card. Facts come only from the course's own row
(`projects/ms-intros/source/<CODE>.md`); never speak the website, price or course code.
Voice: `en-IN-NeerjaNeural` +10 %, MedSkills brand, watermark bottom-right.

## 0.5 Mission, ownership and definition of done (read first, Linux session)
**Mission:** deliver all 69 intro videos, finished and client-ready, with nobody available to
help. The owner is away until it is done and cannot afford a mistake. **You own this project end to
end on this machine**: audit the code, `CLAUDE.md` and this file; set up the environment (§2);
write, voice, render and QA every video; fix problems at their root in `src/`/`scripts/` (never a
per-video patch, add a fixture/test, run `npm test`); keep going until done. Don't stop to ask for
permission or confirmation, don't ask questions (decide using the evidence and `docs/memory/`; if
truly blocked on one video, set it aside, finish the rest, and list it at the top of the final
report). **Never `git push`, never delete the owner's files outside `iterations/`/`output/`.**

**Quality bar = the reference video** `output/MedSkills/Course_Intros/MedSkills_Intro_MS_NABH_01.mp4`
(structure, look, pacing, animation polish, brand/end card). Exception: its music bed is too loud —
the new quieter bed (§1) is correct; narration must be clearly audible over it at all times.
Every video must match the reference in finish; none may be a degraded version of it.

**Per-video acceptance — ALL must hold, verified on the FINAL MP4 (not stills):**
1. `QA.md` says PASS for it (`node scripts/qa.mts ms-intros <id>`), 1920×1080, 30 fps, audio present.
2. Extract frames from the MP4 at the middle of every scene + the first/last second and LOOK at
   them: no distortion, stretching, squashed or blurred logo/art, no clipped, overlapping, shifted
   or cut-off text, nothing off-screen, no empty/black/frozen frames, no wrong glyphs or missing
   fonts, flowchart/stat/stack/hub items fully visible and legible, logo watermark bottom-right,
   end card correct.
3. Content: the first spoken sentence is exactly the OPENING; course name spelled and spoken
   correctly; hours, objectives, outcomes and audience match the course's row in `source/<CODE>.md`
   and nothing is invented; no website, price or course code spoken; no spoken abbreviations;
   words on screen are the ones being said (sync); duration ≤ 1:30.
4. Audio: voice clear, natural pace (≈ 127–147 wpm), mispronunciations fixed via the project
   `lexicon` (audition with `node scripts/say.mts ms-intros "<word>"`); music audibly under the
   voice (check with ffmpeg `ebur128`/`volumedetect` on voice-only vs mixed if unsure); −14 LUFS,
   no clipping.
5. A video that fails any item is fixed (root cause) and re-rendered — not shipped.

**Process:**
- Inspection gate first (§3.2: three videos, each inspected as above), then the bulk run (§3.4).
- During the bulk run, inspect every video's contact sheet (`iterations/intro-audit/<id>.jpg`, made
  by `node scripts/intro-audit.mts`) and open full-size frames for any that look off; fully
  inspect at least every 5th video and every video whose gates needed a repair.
- If you fix a pipeline bug, re-render every already-finished video it could affect.
- **Finish line:** `node scripts/intro-queue.mts --collect && node scripts/intro-audit.mts` prints
  ✅ for 69/69 and `output/Course_Intros_MP4/` contains exactly 69 MP4s and nothing else. Then
  write `FINAL_REPORT.md` at the repo root: counts, any problems found and how they were fixed,
  videos individually inspected, measured timings, anything needing the owner's attention.
  Do not stop before this is true. Run long work in `tmux`, resume after any interruption
  (every stage skips finished work).

## 0.6 Don't re-derive what's already decided
- `docs/memory/*.md` = the owner's standing preferences and past decisions (brand is MedSkills;
  slower pacing; Indian female voice; no spoken acronyms; verify the final MP4, not stills; picture-first).
  Read `docs/memory/MEMORY.md` first.
- `.claude/settings.json` pre-approves the pipeline commands (node scripts, npm, ffmpeg, tmux, apt),
  denies `git push` — ask before pushing anywhere.
- Already built and proven on the Mac, don't rebuild: the intro writer prompt (`docs/INTRO_BRIEF.md`),
  gates, `fixOpening`, spoken names + full forms for all 69 courses (`course.json`, `project.json`),
  sheet importer, voice, watermark/ident/outro. Reuse; fix at the root only if a check fails.
- `graphify-out/` holds a knowledge graph of the repo — query it (`/graphify`) instead of re-reading files.

## 1. State
- **Queue = `projects/ms-intros/queue.csv`** — one row per video (69): `seq, video_id,
  course_name, spoken_name, category, hours, type, output_file, status`
  (`todo → scripted → voiced → done`). Refresh it any time: `node scripts/intro-queue.mts`.
- `projects/ms-intros/course.json` is the batch's video list (same 69 ids, with spoken names).
  `courses.json` / `source/*.md` come from the workbook (`scripts/import-courses.py`, already run —
  re-run only if the workbook changes: `.venv/bin/python scripts/import-courses.py <xlsx> ms-intros`).
- **Done: 1 of 69** — `MS-NABH-01` (QA passed, 88.6 s) — **but it was rendered with the old, loud
  music bed. Re-render it** (step 3).
- **Music lowered (2026-10-06)** in `src/templates/stage.tsx` `MusicBed`: under narration
  0.15 → 0.05, gaps 0.42 → 0.20, outro lift 0.55 → 0.35. Audio is mastered to −14 LUFS afterwards,
  so a quieter bed makes the voice clearer. Applies to every video. If still too loud, lower `UNDER`
  again (nothing else needed; renders re-run because the code hash changed).
- Open warning from the first intro: pronunciation of "Healthcare", "coordinators" — audition
  once (`node scripts/say.mts ms-intros "<word>"`) and add to `project.json` `lexicon` if wrong.

## 2. Setup on the Linux PC (once)
This repo arrives as `zskillup-intros-kit.zip` (no `node_modules`, `.venv`, `.git`, or render
scratch — those are rebuilt here). Everything else is in it: code, specs, `public/` (fonts, music,
brand), `assets/`, all projects, docs, `.claude/` agents + skills, and the finished NABH-01 intro as
the reference video (`output/MedSkills/Course_Intros/`, the only real MP4 in the kit — other
MP4s in the Mac repo are Git-LFS pointers and were left out; it was rendered with the OLD loud music).
```bash
unzip zskillup-intros-kit.zip && cd "zskillup video content"
node -v            # need 20+ ; else install via nvm or NodeSource
sudo apt install -y ffmpeg python3 python3-venv unzip tmux      # ffprobe ships with ffmpeg
npm ci             # Linux binaries for Remotion/esbuild
python3 -m venv .venv && .venv/bin/pip install edge-tts openpyxl
npx remotion browser ensure     # headless Chrome; if it won't start: sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libcups2
mkdir -p iterations output
git init -q && git add -A && git commit -qm "baseline from kit"    # optional: gives you diffs/rollback here
node scripts/headless-check.mts # writer needs `claude` logged in (run `claude`, /login)
```
**Fonts.** The renderer loads only the vendored files in `public/fonts/` (listed in
`src/fonts.gen.json`), never system fonts, so Linux needs none. If any listed file is missing
or the font set looks incomplete, **download them yourself**: `node scripts/vendor-fonts.mts`
(fetches the house families from Google Fonts into `public/fonts/` and regenerates
`src/fonts.gen.json`), then re-run `npm test -- --fast`. `render-batch.mts` also refuses to start
if fonts are missing.

Network needed: Edge TTS (free Microsoft endpoint — if voicing fails everywhere,
`.venv/bin/pip install -U edge-tts`), Google Fonts (only if re-vendoring). Keep-awake
(`caffeinate`) is macOS-only and a no-op here — run long jobs inside `tmux`.
Not logged in to `claude` → "agent mode": job files in `projects/ms-intros/jobs/*.md`; run one
Sonnet subagent per job file, then continue with `check`.

## 3. Run (in this order)
1. Health: `npm test -- --fast` (seconds).
2. **Inspection gate (mandatory).** Do the first 3 videos one by one — MS-NABH-02 (accreditation),
   one clinical course (e.g. `MS-BLS-29`), one administrative/IT course:
   `node scripts/batch.mts ms-intros write <id>` → `check <id>` → `node scripts/produce.mts ms-intros <id>`,
   then inspect per §0.5 (extract frames, listen-levels, SRT, QA.md). Compare with
   `MedSkills_Intro_MS_NABH_01.mp4` (rendered on the Mac) to prove Linux renders identically.
   Fix root causes and re-render until perfect; log what you changed at the bottom of this file.
3. Re-render the finished one with the quieter music:
   `node scripts/produce.mts ms-intros MS-NABH-01 --force`
4. **Bulk** (one job at a time — CPU-bound; never run two renders in parallel):
   ```bash
   tmux new -s intros   # then:
   node scripts/batch.mts ms-intros all 2>&1 | tee iterations/ms-intros_batch.log
   ```
   `all` = write (one schema-constrained Sonnet call per course) → check (gates + ≤3 verified
   repairs) → produce (voice → render → QA). A failing video is set aside and the batch
   continues. Re-running resumes: finished videos are skipped. Intro projects skip the visuals stage.
   ~1.5 min of video each → roughly 2–3 min machine time per video on a Mac.
5. Track progress any time: `node scripts/intro-queue.mts` (rewrites `queue.csv`; failures stay
   `todo`/`scripted`/`voiced` — details in `projects/ms-intros/PREFLIGHT.md`, `output/MedSkills/Course_Intros/QA.md`).
6. Re-run step 4 until `queue.csv` shows no `todo`/`scripted`/`voiced`, fixing failures per §5.

## 3.5 ETA (estimate for the Linux PC: i7-12700, 12C/20T, 16 GB RAM (~11 free), no GPU)
Measured on the Mac (M5) for the first intro (1:29, 2658 frames, 158 words): preflight 4 s ·
voice 10 s · render 56 s (47 fps) · QA 10 s ≈ **1.5 min machine time**; script writing is one
Sonnet call (~1–2 min headless; slower in agent mode). Remotion is CPU-only (no GPU use), so the
i7-12700 should land around 30–50 fps — the same order as the Mac.
| phase | per video | 69 videos |
|---|---|---|
| write + check (headless `claude`) | 1.5–3 min | 2–3.5 h (can overlap nothing: one job at a time) |
| voice + render + QA | 1.5–2.5 min | 2–3 h |
| **total unattended** | **≈ 3–5 min** | **≈ 4–6 h** |
| first-3 inspection gate + fixes | — | + 1–2 h, once, before the bulk run |
Agent mode (not logged in) adds ~3–5 min per video for the subagent writer → ≈ 8–10 h.
RAM is the constraint, not CPU: if Chrome gets OOM-killed or swap climbs (2 GB swap only), set
`RENDER_CONCURRENCY=6` (try 4 if it persists). Watch `free -h`; never run two renders at once.
These are estimates — after the first video, replace them with the real number
(`npm run metrics -- report`) and log it at the bottom of this file.

## 4. Deliverable: a folder with MP4s only
Pipeline output lands in `output/MedSkills/Course_Intros/` mixed with SRT/JPG/QA/credits files.
The delivery folder is separate:
```bash
node scripts/intro-queue.mts --collect     # copies every QA-passed MP4 → output/Course_Intros_MP4/
node scripts/intro-audit.mts               # final gate: 69/69 present, QA PASS, 1080p, audio, ≤90 s; contact sheets
ls output/Course_Intros_MP4 | grep -v '\.mp4$'   # must print nothing
```
Files are named `MedSkills_Intro_<CODE with underscores>.mp4` (e.g. `MedSkills_Intro_MS_NABH_01.mp4`).
Only QA-passed videos are copied; re-run `--collect` after each batch pass.

## 5. Rules and failure handling (don't reintroduce old bugs)
- Opening sentence is exact (`fixOpening`); 140–160 words; ≤ 1:30 total. Narration has no
  abbreviations — full forms come from `project.json` `fullForms`; screen text may abbreviate.
- Every fix is a pipeline capability, never a per-video patch: fix in `src/`/`scripts/`, add a fixture,
  `npm test`, then re-run. Don't hand-edit `src/registry.gen.ts` or `projects/*/build/`.
- Never SVG `<text>`. Every reveal must hear its word (`src/sync.ts`) — reword narration, don't ignore.
- A video is done only when QA passes on the final MP4 (loudness −14 LUFS, no frozen/black frames,
  render = stills).
- Don't touch other projects. On-screen brand is MedSkills only.
