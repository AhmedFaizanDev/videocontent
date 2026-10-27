---
name: lesson-series
description: Turn educational source material (a client PDF/module, a course outline, a curriculum CSV, lecture notes or a plain brief) into a finished series of narrated, animated explainer videos with this repo's pipeline — plan the series, write the lesson specs, pick diagrams/illustrations, voice, review, render and QA. Use this whenever the user wants videos made from teaching content in this repository, asks to "turn this PDF/module/syllabus into videos", adds a new client or course, wants more lessons in an existing project, or asks to re-produce/fix lessons — even if they don't mention specs, Remotion or the pipeline by name.
---

> **Client course from module PDFs? Use the bulk path instead: `docs/BULK.md`** (`node scripts/batch.mts <p> all`) — one writer call per video, recipe scenes, upstream gates, overnight render. This skill is for custom or one-off lessons.

# Lesson series playbook

You are the creative director and producer. The pipeline (projects → validate → voiceover →
review → render → qa) guarantees *technical* quality and sync; your job is the teaching:
what each video covers, how it's told, and what the viewer sees at each moment. The
contract for every lesson is `docs/AUTHORING_GUIDE.md` — read it before writing a spec.

## 0. Orient (every time)

- `AGENTS.md` (commands, rules) → `docs/AUTHORING_GUIDE.md` (spec contract) →
  `ls projects/` (existing projects are working examples; `ms-cssd-15` is the reference
  client module).
- `npm test -- --fast` must pass before you start; if it doesn't, fix the pipeline first.

## 1. Study the source completely

Read the whole thing (PDFs page by page), then write down:
- learning objectives, the section structure, and any **assessment questions** (they become
  knowledge checks);
- audience, level, locale (drives voice and tone), standards/compliance basis;
- what the client specified: number of videos, length, voice, imagery;
- defects in the source (duplicated sections, broken figures, contradictions). Report these
  to the user — clients want to know, and you must not reproduce them.

## 2. Ask only what blocks you

One round of questions, only for decisions that are genuinely the user's and change the
build. Typical blockers: on-screen **brand** (house mark vs client's), **imagery** approach
when the client asks for real photos (generic diagrams + pack art vs licensed images via the
`image` diagram vs client-supplied photos), and approval of the **split**. Propose a default
for each. Decide everything else yourself and say what you decided (voice, pacing, style).

## 3. Set up the project

```bash
node scripts/new-project.mts <slug> "<Name>" "<Series line>"
```
Edit `projects/<slug>/project.json`:
- `lang`: `en` · `hi` · `mr` · `kn` (narration + all on-screen text; the house voice for that
  language is the default). Other languages need their UI words in `src/lang.ts` and a font
  stack for their script in `src/theme.ts`.
- `terms`: the subject's key terms, emphasised on screen everywhere.
- `voice`: pick a Polly voice (house en: Kiara generative); Edge only for languages Polly lacks.
  Audition 2 voices × 2 rates with `echo "<a real paragraph>" | .venv/bin/python
  scripts/lib/tts.py --engine neural --voice <v> --rate=<r> --out x.mp3 --words x.json` and give the
  user a sample. Set `wpm` from a measurement (voiceover prints it) — estimates depend on it.
- `length`: new projects default to 5–7 minutes (`{"minutes":[5,7]}`) — 5 by default, up to 7
  when the depth of explanation needs it; `exact` only for a client's fixed-length deliverable. `rules.requireOneOf`: e.g. `[["check"]]` for certified
  courses with assessments, `[["pseudocode","code"],["example"]]` for coding lessons.
- `brand` (signoff; artwork defaults to MedSkills — `public/brand/`), `music` (see `public/audio/music/CREDITS.md` — prefer the
  licence-clear bed for client work), `output.dir` if the client needs a folder structure.
Put the source files in `projects/<slug>/source/` — it is the **fact ledger**: preflight
rejects any factual number not found there. When there's no client material (a topic you
teach from general knowledge), write `source/reference-notes.md` first: the facts the series
will state, each with a textbook/guideline citation. Set `style.spelling` (en-GB for Indian
and UK audiences) and add hard-to-pronounce terms to `lexicon`.
Pacing defaults are generous (the owner is paid per minute): keep them unless a client
brief caps the runtime.

## 4. Plan the series

Write one lesson plan per video, `projects/<slug>/plans/<id>.md`, from docs/PLAN_TEMPLATE.md
(validate requires it: `rules.requirePlan`): audience, objectives, the source facts with
citations, the scene outline (purpose · visual choice and why · reuse/new art · seconds),
explanation notes, terms and pronunciation, length. Check
that every objective and every assessment point lands somewhere, that videos don't overlap,
and that each opens its topic and ends with a recap. Share the plan if the user is waiting on
it; otherwise proceed.

**House standard v2 (2026-10-03, docs/AUTHORING_GUIDE.md §1b): scientific, planned,
structure-first.** Visual priority per idea: flowchart (`graph` with `data.mermaid`) → table
(`table`) → authentic diagram (anatomical library art) → animation. Journal-figure look, no
cartoon characters, precise labels, explanations for a professional science audience,
Sora Heavy headings / Noto Sans everything else (automatic), pronunciation via the lexicon.
**Picture-first still holds** (client feedback 2026-09-26: text + voiceover is not
acceptable) — tables and flowcharts sit on stages and build with the narration. Every teaching scene is a `stage`: one illustrated world, the camera travelling
to what is explained, parts acting and labelled on the picture. In `plan.md` write, per
scene, *what the viewer sees happen* — if a row reads like a slide ("5 bullet points about
prevention"), redesign it (the objects as stations the camera visits, each one acting).
Missing drawings are commissioned as generic pack parts (docs/ART.md) before authoring, once
per subject, so every later lesson reuses them. Videos run **5–7 minutes**: ≈ 12–16 scenes, ≈ 600–850 words at the house voice's pace.

Visual choices inside a stage (or a legacy figure) — match the *shape of the idea*, and prefer motion over slides:
any system, pathway, feedback loop, cause→effect chain or hierarchy → **`graph`** (it builds
with the narration, runs flows, sends tokens along paths); repeating process → `cycle`;
procedure → `flow`/`steps`; history → `timeline`; parts of a whole → `hub`; layers →
`stack`; quantities → `bars`; signals/curves → `trace`; real object with parts → pack art
or `image`; trade-off → `compare`; error → `mistake`; calculation/record → `example`. Aim for
a figure in at least a third of the scenes. Only commission new pack art (docs/ART.md)
when the lesson genuinely needs a bespoke drawing; it costs real time and must pass `npm test`.

## 4b. Automated visuals: plan → draw → gate → review → approve (no human in the loop)

Every agent in this chain runs on **Sonnet** (their `model:` frontmatter); you orchestrate.
Never ask the user what to draw.

1. **Plan.** Spawn `series-planner` (project + what the series covers). It writes `plan.md` and
   `visuals.json` (parts reused, new parts with pack, anchors, events, accuracy notes) and runs
   `node scripts/art.mts gaps <p>`. Read its report; sanity-check that new parts are generic
   and reusable, and that no lesson row reads like a slide.
2. **Draw.** For each new pack, spawn one `art-author` (pack name + that pack's part specs
   pasted from visuals.json). Packs are independent drafts bundled in isolation, so run
   several in parallel. Each ends with `art.mts check --pack <pack>` green.
3. **Review.** For each pack, spawn `art-reviewer` (pack + project). It writes
   `iterations/artlab/<pack>.review.json`. Any FIX → send the notes back to the SAME art-author
   (SendMessage), then re-review. Max 3 rounds; a part still failing is escalated in your final
   report and the plan is adjusted to reuse existing parts instead — never shipped weak.
   An existing part flagged "needs <events>" is extended the same way: an art-author edits that
   part's pack, `art.mts check <part>` must stay green and the reviewer judges the new events
   before any lesson uses them.
4. **Approve.** `node scripts/art.mts approve <pack>` (re-runs the gates, requires every PASS,
   moves the draft into the library, regenerates the registries). Then `npm test -- --fast`.
   Look at the galleries yourself for the first pack of a new subject — taste is still yours.
5. `node scripts/art.mts gaps <p>` must print 0 missing before any lesson is authored; lessons
   can only use approved parts (validate rejects unknown arts).

## 5. Write the specs (token-efficient; same quality bar)

Authoring is where the tokens go (measured 2026-09-26: ~40 agent requests re-reading a
growing context per lesson). Keep it lean — the pipeline carries the quality:
- **One gold spec** per series first (yourself), preflight-clean and looked at. Then delegate.
- **Delegate to the `lesson-author` agent (Sonnet)** (`.Codex/agents/lesson-author.md`; in a session
  where it isn't listed yet, spawn a general agent told to read and follow that file). Its
  prompt is just: project, id(s), filename, and that lesson's rows of `plan.md` — the agent
  pulls everything else from `node scripts/brief.mts <project>` in one call (rules, scene
  shapes, catalogue, word budget, fact ledger, gold excerpt; ~4k tokens).
- **Batch:** give one agent 4–8 lessons of the same project (it reads the brief once and
  writes them one after another). Run 2–3 agents in parallel for big series.
- **Translate instead of re-authoring** when the same lesson is needed in another language:
  `node scripts/strings.mts extract` → translate → `apply --to <project>/<id>`.
- **No image review by authors:** preflight's dry-run render includes a browser text audit
  (text overflowing its box, text colliding) and the margin/caption gate. You, the
  orchestrator, look at one contact sheet per lesson for taste.
- Authors iterate on `preflight --no-render` (seconds) with small edits, then run the full
  preflight once. `--map` shows which word fires each reveal.
- Record each author's tokens: `node scripts/metrics.mts authoring <p> <id> --transcript
  <agent transcript>` (subagent transcripts are under `~/.Codex/projects/<repo>/<session>/subagents/`).
- The rules themselves don't change: narration is the product; name the topic first; learn
  bullets enumerated late in the intro; one idea per scene; items said in on-screen order;
  **never add facts, numbers, brands or claims that aren't in the source**.

## 6. Certify locally, render on the server

```bash
node scripts/certify.mts <slug>          # preflight → real voice (sync, runtime) → layout + text audit
                                          # at the real timings → assets → certificate per lesson
node scripts/export.mts <slug…>          # dist/render-kit-<date>.tar.gz (code, fonts, audio, certificates)
# on the render server (RENDER.md inside the kit):
npm ci && node scripts/render-batch.mts  # render + QA every certified lesson; resumes; refuses edits
```
- Don't render whole lessons locally during authoring — certification proves everything that
  can be proven without an MP4 (frozen pictures are designed out; `npm test` 5d proves it),
  and the server's QA covers encode, loudness and MP4-vs-stills.
- Look at each lesson's certify sheet (`iterations/certify/<slug>/<id>_sheet.png`) for taste.
- A lesson that fails certification is fixed in its spec (or, if the cause is general, in the
  pipeline) and certified again; only changed scenes re-voice.
- Budget: certification ≈ 15–60 s per lesson (plus ~40 s of TTS the first time). Server render
  ≈ 1 min of machine time per minute of video on an M5-class CPU, one batch at a time.

## 7. Deliver

The server's `output/RENDER_BATCH.md` lists every lesson's status; each output folder has the
MP4, SRT, thumbnail, publish kit and QA.md. Then report: files and lengths, how objectives map
to videos, source defects found, decisions made on the client's behalf, and anything they must
verify (voice, licences, clinical/legal review).

## Related skills (design references, not frameworks)

This repo renders with **Remotion** — don't switch frameworks. The installed HyperFrames
skills are still useful as *motion and creative references* when designing new diagrams,
pack art or scene choreography: `hyperframes-animation` (rules like svg-path-draw,
chart-scrub-readout, coordinate-target-zoom, depth-of-field; blueprints like
constellation-hub, camera-journey, dataviz-countup), `hyperframes-creative` (beat planning,
palettes), and brag's audio references for music/SFX prep. Translate ideas into this
pipeline's primitives (src/art/kit.tsx, src/motion.ts) and keep every rule in docs/ART.md.

## When something looks wrong

- Fix the **pipeline**, not the lesson, when the problem would recur (a template overflow, a
  diagram that breaks at 7 items, a sync rule): change `src/`, add a fixture that reproduces
  it in `projects/fixtures/`, `npm test`, then re-render — manifests re-render every lesson the
  code change affects.
- Never hand-edit `src/registry.gen.ts` or `projects/*/build/`.
