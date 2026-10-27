# AGENTS.md — start here

A production pipeline that turns educational material into narrated, animated explainer
videos (Remotion + free Edge neural TTS). **`README.md`** = how it works and the commands.
**`docs/AUTHORING_GUIDE.md`** = the lesson spec contract. **`HANDOFF.md`** = state, decisions,
history — **start at its §0 "Continue here"** (work queue, bulk throughput, open items).
**Bulk (the default for client courses): `docs/BULK.md`** — `node scripts/batch.mts <p> all`:
PDFs → one schema-constrained writer call per video → upstream gates → overnight render.
One-off/custom lessons → the **`lesson-series`** skill (`.Codex/skills/lesson-series/SKILL.md`).

## Projects
- `med-blood-pressure-en`, `med-diabetes-hi`, `med-respiration-kn`, `med-hand-hygiene-mr` —
  the MedSkills four-language demo (one ~5-min video each, `output/MedSkills/`).
- `human-heart` — The Human Heart for nursing/medical students (house defaults: Indian English
  female voice, generous pacing).
- `ms-cssd-15` — client module (MedSkills MS-CSSD-15 M10, flexible endoscope reprocessing),
  5 videos, delivered. `fixtures`, `smoke` — test corpora.

## Framework
Remotion (React) + Amazon Polly TTS. The HyperFrames/brag skills installed on this machine are a
different framework — use them only as motion/creative references (see the lesson-series
skill), never to render lessons for this repo.

## House standard v2 (2026-10-03) — guide §1b
- **Plan first:** `projects/<p>/plans/<id>.md` (docs/PLAN_TEMPLATE.md; `rules.requirePlan`).
- **Scientific, not cartoonish:** journal-figure look (muted palette, thin outlines, precise
  motion, no bounce), authentic code-drawn anatomy, no cartoon characters. Explanations for a
  professional science audience. Label every named structure correctly.
- **Visual priority:** flowchart (`graph` + `data.mermaid`) → table (`table`) → authentic
  diagram → animation — all on `stage` scenes, built as narrated. Reuse library art first.
  **Source first:** medical illustrations come from authoritative public-domain/CC assets
  (`scripts/find-assets.mts` → `scripts/ingest-art.mts`, animated by manifest); code-draw only
  when nothing suitable exists (owner, 2026-10-03, supersedes "all drawn in code").
- **Motion:** visuals must actively explain — `node scripts/motion-audit.mts <p> <id>` flags
  frozen stretches during narration; stages drift, tables/flowcharts reveal progressively.
- **Type:** Sora Heavy headings, Noto Sans everything else (automatic: fonts.ts/theme.ts).
- **Pronunciation:** Amazon Polly Kiara (generative); check with `scripts/hear.py`; a real miss →
  project.json `lexicon` as IPA; audition with `node scripts/say.mts <p> "<word>"`.
- **5–7 minutes** (`length.minutes [5,7]`); 7 only when depth needs it. Picture-first gates
  (`minIllustrated`, `maxScreenWords`) still apply.

## Rules that prevent the bugs we've already had
- **`npm run preflight -- <p>` must be clean before voicing/rendering** (grounding in
  `source/`, spelling, speech hazards, timing, dry-run layout). `produce` runs it first.
- **Never SVG `<text>`/`<tspan>`** — Chrome can lay it out before the web font loads and
  never re-lay it out; long renders show shifted/clipped labels while stills look perfect.
  Text goes in HTML (art: the ArtDef `Html` layer). Linted by `npm run validate` / `npm test`.
- **Bulk = certify locally, render on the server.** `node scripts/certify.mts <p>` proves each
  lesson render-ready (preflight, real voice, layout + text audit at real timings, assets) and
  writes a certificate; `node scripts/export.mts` packs the certified batch; the server runs
  `node scripts/render-batch.mts` (render + QA; refuses anything changed since certification).
  A lesson is done when the server's QA passes on the final MP4. Look at the certify contact
  sheets yourself — gates catch errors, not taste.
- **Every fix is a pipeline capability**, never a per-lesson patch: generalise the problem,
  fix it in src/ or scripts/, add a fixture or test that reproduces it.
- **Every reveal must hear its word** (`src/sync.ts`). Fix sync errors by rewording narration
  or adding `say`, never by ignoring them.
- **Stay inside the source material** — no invented facts, numbers or brands.
- Fix recurring problems in the pipeline (templates/diagrams/rules), add a fixture that
  reproduces them, run `npm test`, then re-render (manifests pick up code changes).
- Bulk: `caffeinate -ims npm run produce -- <p> 2>&1 | tee iterations/<p>_produce.log`. A failing
  lesson is set aside and the batch continues; one produce/render at a time (CPU-bound).
- On-screen brand is **MedSkills** (client logo, `public/brand/`, keyed by
  `scripts/prep-brand.mts`); never the old TA/ZSkillup marks. Per-project signoff in project.json.
- **Languages:** `lang` en/hi/mr/kn per project, fully native on screen; narration never
  contains abbreviations (preflight rejects them) — speak the full form, show the
  abbreviation on screen. Visual system "Clinical" (off-white, Sora/Inter + Anek/Noto, no
  edge chrome).
- **Metrics:** stages record themselves in `projects/<p>/build/<id>.metrics.json`; record
  authoring tokens with `node scripts/metrics.mts authoring …`; `npm run metrics -- report`.
- Don't hand-edit `src/registry.gen.ts` or `projects/*/build/`. TS check: `npx tsc --noEmit`
  (covers src/ and scripts/).
