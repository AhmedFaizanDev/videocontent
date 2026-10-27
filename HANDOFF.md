# HANDOFF — MS-MR-55 Medical Records course (25 videos × 9–10 min, unattended)

Read this, `CLAUDE.md`, `docs/SCRIPT_BRIEF.md` and `docs/ART.md` first. The owner is **away for
the whole run**: no questions, no waiting for approval. Decide from this file and the evidence; if
one video is truly blocked, set it aside, finish the rest, and report it.

## Goal (owner's requirements, 2026-10-27)
Every lesson of **Medical Records and Clinical Documentation** (`projects/ms-mr-55`; PDFs in
`projects/ms-mr-55/source/`, identical copies in `MS-MR-55/`) as a finished, QA-passed MP4 in
`output/MedSkills/MS_MR_55/`:
- **25 videos**: `M00` course introduction (from the handbook) + **2 per module** (`M01a`, `M01b`
  … `M12b`), each half covering only the sections in its `outline` (`course.json`).
- **9–10 minutes each** (`length.minutes [9,10]`; a script estimated short is a build error and
  gets lengthened by the batch's repair). ~1,300 narrated words, 15–20 scenes.
- **Look and teaching like `output/MedSkills/Pilot_Lungs/MedSkills_pilot_lungs_L1.mp4`** — the
  reference (its script is `docs/EXEMPLAR_LESSON.json`, shown to the writer): illustrations
  explained part by part as they are named, warm teacher voice, flowcharts/tables only for
  sequences, comparisons and numbers. Illustration gate: ≥ 40 % of teaching scenes.
- **No background music** (house default `music: null`) — narration only.
- **Technical depth**: the client PDF is the backbone (all sections, every number and legal
  requirement); depth from authoritative sources is allowed, and every added fact is written by
  the writer into `projects/ms-mr-55/source/added/<id>.md` with its source (the grounding gate
  accepts it from there). **Audit these files** — they are the only place outside facts enter.
- **Continuity**: every video opens with a "Previously" recap of the last video and closes with a
  "Recap" and a "Coming next" preview (the batch gives the writer the previous/next video and the
  previous script's take-aways — so scripts must be written **in course order**, which
  `batch.mts write` does).
- English, Amazon Polly **Kiara** generative (house default; AWS creds in `~/.aws/credentials`,
  `.env`), MedSkills brand.

## Status at handoff (2026-10-27)
- Pipeline audited and simplified (memory `project-history`); `npm test -- --fast` green.
- `ms-mr-55`: 25-video plan done, **no scripts**, **no illustrations** (`"arts": []` — every
  lesson would fail the illustration gate). Phase 1 fixes that.
- Pilots (`pilot-cssd`, `pilot-bls`) are switched to Kiara and no music but were **not
  re-rendered** (the run was stopped on the owner's request); their MP4s still have the old
  voice and music. Not needed for this course.
- Headless Claude logged in (`claude -p`, the batch's writer).

## Phase 1 — the records illustration pack (in the Claude session, before any script)
Nine-to-ten-minute lessons need a wide picture vocabulary: draw **10–12 arts** in
**`src/art/packs/records.tsx`** + **`records.catalog.ts`**, in the house ink idiom (copy the
structure of `packs/respiratory.tsx` — the Lungs reference's art — and `packs/reprocessing.tsx`;
helpers in `src/art/ink.tsx`, `kit.tsx`). Never SVG `<text>` (words go in `Html`); anchors on the
parts; every event visibly changes the picture. Suggested set (each with named anchors and 2–3
events = what the narration makes it do):
`caseSheet` (case file: cover with ID box, tabbed sections; open, tab, entry signed/timed) ·
`progressNote` (dated/timed/signed entries; late entry, single-line correction + initials,
illegible/blank flagged) · `consentForm` (patient, procedure, risks, signatures, witness,
interpreter; fields fill, missing signature) · `medicationChart` (drug/dose/route/times grid;
order, administration ticks, omission, verbal-order countersign) · `investigationReport`
(request → report → acknowledged) · `operativeNote` · `dischargeSummary` (sections fill, copy to
patient/next carer; death-certificate variant) · `recordsRoom` (compactor shelves, tracer card;
retrieve, return, missing file) · `emrScreen` (patient banner, note, audit-trail panel, lock;
login, edit logged, break-the-glass, auto-logout) · `codingDesk` (diagnosis → index → code; audit
mismatch) · `retentionClock` (retention periods / legal hold) · `person` exists already.
Then: `node scripts/art.mts register` · `node scripts/art.mts check --pack records` → **look at
every gallery** `iterations/artlab/<art>.png` (recognisable to a records officer, correct, events
legible, same polish as the lungs art) → fix → write `iterations/artlab/records.review.json`
`{"pack":"records","verdicts":{"<art>":"PASS",…}}` → `node scripts/art.mts approve records`.
Give each art **2–4 playbooks** in `assets/playbooks/<art>.json` (format:
`assets/playbooks/leakTest.json`; regenerate with
`node -e "import('./scripts/lib/playbook-store.mts').then(m=>m.writePlaybookRegistry())"`).
Set `projects/ms-mr-55/project.json` `"arts": [the keys]`. `npx tsc --noEmit`, `npm test -- --fast`.

## Phase 2 — two videos, then a deep self-audit (still in the session)
```
node scripts/batch.mts ms-mr-55 write M00 M01a
node scripts/batch.mts ms-mr-55 produce M00 M01a
```
Audit both **final MP4s** (not stills) against the Lungs reference:
`ffmpeg -i <mp4> -vf fps=1/4,scale=640:-1,tile=5x6 sheet.jpg` and open full frames where needed.
- 9–10 min; Previously / Recap / Coming next present and correct (M00: no Previously).
- pictures carry the lesson; illustrations move/label on the spoken word; no frame > 7 s still;
  no clipped/overlapping/tiny (< 22 px) text, nothing off-frame, no empty boxes.
- facts: every number/requirement in the PDF; read `source/added/<id>.md` — each added fact
  correct, sourced, relevant; remove anything doubtful (and the narration that uses it).
- narration: `.venv/bin/python scripts/hear.py ms-mr-55 <id> --model medium.en`; misread terms →
  project `lexicon` as IPA `"/…/"`; no spoken abbreviations; no music in the mix.
- `output/MedSkills/MS_MR_55/QA.md` PASS (−14 LUFS, decode, frozen frames, layout).
Fix every problem **at its root** (brief, template, renderer, art) — never by hand-editing one
video — `npm test -- --fast`, re-produce both, re-audit. Only when both are publishable: Phase 3.

## Phase 3 — the bulk run (detached; survives the Claude session ending)
```
sh scripts/course.sh ms-mr-55          # → iterations/course.log ; tail -f to watch
```
- Writes the 23 missing scripts in course order (one headless Sonnet call each, ~$0.25 API-eq,
  ≤ 2 scoped repairs), then voice → render → QA per lesson. Re-running skips finished work, so
  after **any** interruption (reboot, quota, crash) run the same command again.
- **Usage limits** are waited out automatically; a failing lesson is set aside, the run continues;
  a crashed render retries at concurrency 4.
- **Capacity:** `RENDER_CONCURRENCY=8` by default in `course.sh` (M5, 10 cores, 16 GB). If renders
  crash (out of memory) more than once, set `RENDER_CONCURRENCY=6` and re-run. One render at a
  time; nothing else heavy in parallel.
- Estimate: ~10–12 min machine time per 9.5-min video → **~4.5 h** for 23; writing ~2 min each.
  Polly ≈ $6 for the course. Keep the Mac plugged in (`caffeinate` keeps it awake).

## Finish line
- `ls output/MedSkills/MS_MR_55/*.mp4 | wc -l` = 25, every one PASS in `QA.md`, each 9–10 min.
- Set-aside lessons: fix the root cause, re-run `sh scripts/course.sh ms-mr-55`.
- Audit a contact sheet of every 4th video, every video that needed a repair, and all
  `source/added/*.md`.
- `FINAL_REPORT.md`: counts, set-aside lessons and why, fixes made, added-facts audit, tokens/cost
  (`projects/ms-mr-55/jobs/usage.jsonl`, `metrics/polly-usage.jsonl`), render times.
- Commit everything except MP4s. Pushing is blocked for Claude (`.claude/settings.json`) — the
  owner pushes.
