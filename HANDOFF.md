# HANDOFF — state, decisions, how to continue

Read with `README.md` (architecture + commands) and `docs/AUTHORING_GUIDE.md` (spec
contract). The pre-productization history (Section 1 build, redesigns, operational war
stories) is preserved verbatim in `archive/docs/HANDOFF_history.md`.

## 0. Continue here (next session) — updated 2026-10-04

**State at end of 2026-10-04 — infrastructure done, NOT yet bulk-proven. Next step needs the
owner's explicit go-ahead: BLS + CSSD proof videos (do not start bulk or proofs without it).**

Pipeline (docs/BULK.md: "The visuals stage", "Architecture v6", "Architecture v5"):
`node scripts/batch.mts <p> all` = plan → **visuals** → write → check → produce.
- **Quality baseline = the Opus-built reference** (`ms-bls-29` M01, ~6M tokens; owner's reference
  video = the Intro+Module 01 MP4). Its spec must compile byte-identical to snapshot `e59094a` —
  re-check after any src/ change (diff `readSpec('ms-bls-29','M01')` against that commit). Never
  redesign the proven flowchart/table/camera/transition/animation code; reuse it.
- **Visuals stage** (`scripts/visuals.mts <p>`, state `projects/<p>/visual-plan.json`): needs (Sonnet)
  → reuse library → search BioArt / Servier (REST API) / Commons (SVG+PNG diagrams, no photos) /
  Openverse, PD/CC0/CC-BY only → broaden once → vision judge (every image opened) → ingest →
  Opus places anchors/regions + writes playbooks → vision verifies anchors → only then draw
  (art-author Opus → art-reviewer → `art.mts approve`) → Opus playbooks for the drawing.
- **Playbooks** (src/playbooks.ts + asset manifests + assets/playbooks/*.json for drawn art):
  the reusable teaching choreography; Sonnet writes `play` scenes through their moments.
  Reference exemplar `docs/EXEMPLAR_M01.json` is in every writer/editor prompt.
- **Gates**: taste (≤1 text bar/55 words; illustrations perform), variety (no composition quota),
  visual plan (a lesson must use its planned illustrations), legibility ≥22 px, empty-chart
  opening, plus all earlier gates.
- **Repairs are verified** (scripts/lib/repair.mts): every fixer/repair re-gated, kept only on
  proven progress, else rolled back with the reason fed to the next attempt; agent-mode repairs
  self-verify and are re-checked against a snapshot.
- **Pace self-calibrates** (src/pace.gen.ts, ~128 wpm measured); writer TARGET ≈ 576 words/5:00.
- "No" is no longer read as "number" (scripts/lib/speak.mts).
- **Headless**: `node scripts/headless-check.mts` — currently NOT logged in. Owner runs the Claude
  Code binary once and `/login` (or `setup-token` → CLAUDE_CODE_OAUTH_TOKEN in shell profile).
  Until then model steps are job files (projects/<p>/jobs/*.md) run as subagents.

CSSD (`fx-trial-cssd`): visual plan 8/8 ready — Servier endoscope (imported, 3 playbooks) + 5
approved Opus drawings (`scope-detail`: channelCutaway, duodenoscopeTip; `reprocessing`: leakTest,
endoscopeReprocessor, dryingCabinet; 11 playbooks). Free libraries had none of the reprocessing
equipment (2 search rounds, 80+ candidates rejected). Its old T01 script predates the gates and
must be rewritten (fails visual-plan + variety). Fixtures: `fx-plays` (P01 reference in playbook
form, P02 heart playbooks, P03 drawn playbooks), `fx-compose`, `fx-trial-heart`.

Unproven / open: no video since v6+visuals (v5 Sonnet video was below reference); verified
repairs and headless never run on a real lesson; drawn CSSD art never rendered in a video
(cosmetic: biofilm labels linger after brushing, brushHead label at shaft end); pace from 3
lessons; benchmark (`scripts/benchmark.mts`) not run. Trials: `ms-bls-29-v5` (v5 M01, QA passed,
below reference).

**House standard now:** picture-first `stage` lessons, all imagery drawn in code, every video
exactly 5:00, generation agents on Sonnet. Client feedback that drove it: *"looks like text with
a voiceover"*. Full design: `docs/superpowers/specs/2026-09-26-picture-first-design.md`.

1. Health: `npm test -- --fast` (seconds). Full `npm test` (~10 min: fixture renders, the
   render-timeout regression clip, and the art gates on reference arts) after any `src/` change.
2. **A new series (any subject) — run the `lesson-series` skill; it is fully automated:**
   `node scripts/new-project.mts <slug> "<Name>" "<Series>"` (defaults: exactly 300 s,
   picture-first gates) → **series-planner** (plan.md + visuals.json + fact ledger) →
   `node scripts/art.mts gaps <p>` → one **art-author** per missing pack (draft,
   `src/art/packs/<pack>.tsx` + `.catalog.draft.ts`) → `node scripts/art.mts check --pack <pack>`
   (gates + gallery `iterations/artlab/`) → **art-reviewer** (writes `<pack>.review.json`; FIX →
   SendMessage the same author; ≤3 rounds, then escalate/fix yourself) → `node scripts/art.mts
   approve <pack>` → **lesson-author** per lesson → YOU look at one storyboard per series
   (`node scripts/lib/storyboard.mts <p> <id> <scenes…>`) → `npm run produce -- <p>`.
   Agents live in `.claude/agents/` (all `model: sonnet`). Never ask the owner what to draw.
3. Bulk rendering: `certify` locally → `export` → server `render-batch` (unchanged, see §2).
4. **Work queue:**
   - **BLS & ACLS course intro (2026-09-30):** `output/MedSkills/EN_BLS_ACLS/MedSkills_BLS_ACLS_Course_Introduction.mp4`
     — 60 s sample that sets the quality bar for the course (project `ms-bls-29`, source = the
     MS-BLS-29 handbook). New capabilities it introduced (use them course-wide): dark cinematic
     `mood`, `bare` stages, beat verbs `sfx` / `title` (hero) / `flash`, per-scene `transition`,
     the `outro` logo-reveal scene, bottom-right `brand.watermark`, short-film holds
     (`length.holds`), in-house synthesised sfx (`scripts/synth-sfx.mts`), and approved packs
     `resus` (ecgmonitor, aed) and `cpr` (cpr, timer). Next: modules 01–11 as 5:00 lessons.
     **v2 (rework after "feels like a presentation"):** opens on a MedSkills `ident` (silent brand
     sting), then a clinical story — ward at night, monitor goes VF, "the nearest person is you",
     CPR, shock, team, return of circulation — with a running `clock` HUD; only then does the
     course reveal itself (the 6-link `chain` = its modules), who it's for, and the outro. Spec:
     `projects/ms-bls-29/specs/M00.json` (v1 kept at `iterations/M00_v1.json`). Added for it:
     scene type `ident`; spec `clock {from, stop, to}`; stage `drawn: true` (picture already there
     on frame 1 — for scenes that cut into a running moment); layers revealed by `show` now arrive
     fully drawn (no headless people); `ecgmonitor` `data.rhythm` (open mid-arrest — keep the
     rhythm medically continuous: VF is shockable, flatline is not); packs `ward` (night ward bay,
     events alarm/calm) and `diagrams2` (`chain`, n rings, events l1…l8/all); sfx `alarm`, `thud`.
     **v3 (2026-10-01, current — client brief):** must open "Welcome to <course name>", then in
     order: why it matters → what's covered → outcomes → who it's for → how it helps → centred
     logo outro; logo bottom-right throughout; never speak the course code. Bright clinical look
     (no ident, no dark mood); opener = beating `heart` + `title` hero. Voice complaint was
     "dramatic/choppy, pace off" → plain `en-IN-NeerjaNeural` at rate −6 % (121 wpm), full
     sentences, and `length.holds [0.5,1.4]` (default holds left ~2.4 s dead air per scene and a
     9 s static outro at 60 s). Watermark made stronger (stage.tsx: 38 px, 0.9 opacity). v1/v2
     specs in `iterations/M00_v1.json`, `M00_v2.json`. Client asked about en/ta/hi/kn/ml/mr
     versions with identical visuals: owner chose **English on-screen text everywhere, only the
     voice changes** — needs ta/ml added to src/lang.ts + HOUSE_VOICES (Edge ta-IN-PallaviNeural,
     ml-IN-SobhanaNeural) and a "screen text stays en" mode; not built yet.
   - **House standard v2 (2026-10-03, guide §1b, CLAUDE.md):** scientific not cartoonish,
     planned lessons (`plans/<id>.md`, `rules.requirePlan`, `planExempt` for delivered specs),
     flowcharts (`graph` + `data.mermaid`, parser `src/art/mermaid.ts`) and tables (`table`
     art) first, Sora Heavy headings / Noto Sans all else (fonts.ts maps every Sora weight to
     800), muted journal palette + no-overshoot easing, house pronunciation lexicon
     (`src/lexicon.ts`, MedSkills → "Medd Skills") + preflight pronunciation gate/watch +
     `scripts/say.mts` audition, 5–7 min default, per-lesson `length` override (spec.length).
     Labels now keep clear of their neighbours' anchor points (StageScene). `tw()` is safe for
     never-firing events. New approved pack `anatomy` (`heartAnterior`: atlas heart, events
     vf/stop/compress/rosc, `data.state`).
     **Pilot delivered:** `output/MedSkills/EN_BLS_ACLS/MedSkills_BLS_ACLS_M01_Cardiac_Arrest_and_the_Chain_of_Survival.mp4`
     (6:33, QA passed). Module 01's own PDF was not supplied — written from AHA 2025 sources in
     `projects/ms-bls-29/source/M01_reference-notes.md` (AHA sites block fetches; facts via the
     AHA newsroom and CHEST Physician summary) → **clinician review before client release**.
     Open: audition "defibrillation", "defibrillator", "opioid" (preflight lists them; no ASR
     installed — optional: faster-whisper round-trip check); the old cartoon `person`/`cpr`
     arts remain in the library for legacy specs but should not be used under v2.
   - **v3 (2026-10-03, after owner review of the M01 pilot):** M01 rebuilt — 5:17, natural pace
     (Neerja +10% ≈ 147 wpm; house default now), deeper mechanism-first narration with textbook
     additions logged as [T1–T10] in `source/M01_reference-notes.md` (clinical review!).
     New reusable infrastructure:
     · **Vector asset pipeline** — `assets/vector/<dir>/source.svg + manifest.json` →
       `node scripts/ingest-art.mts` (sanitises: no scripts/handlers/external links; prefixes ids
       and classes; `--parts` lists parts to map) → `src/art/vector/*.gen.ts`; generic animated
       renderer `src/art/vector.tsx` (cardiac state machine, dusky/highlight via CSS filters, flow
       chevrons, anchors). First asset: `heartExterior` (NIH BioArt 228, public domain). Owner
       chose free public-domain assets; the code-drawn `cardio`/heartSection draft is parked
       (reviewer FIX notes in iterations/artlab/cardio.review.json); ink kit `src/art/ink.tsx` kept.
     · **Shorthand scenes** `flow` (Mermaid → stage, auto beats from node labels, `tour` camera
       fly-through) and `table` (auto row beats, `bars`, count-up numbers), compiled by
       `src/compile.ts` at every spec load (readSpec/validate/Root); stage layers `fit: true`.
     · **Flowchart look**: wipe-reveal cards with print shadow, spark-drawn connectors, accent
       path into the focused node, ripple, untaken branches recede to 30 %.
     · Length: 5:00 standard (`[4.5, 7]`; validate warns past 5:45 unless plan "## Length" says why).
     v1 of M01 kept at iterations/M01_v1.json.
   - **Bulk system (2026-10-04) — read docs/BULK.md first.** Course PDFs → `node scripts/batch.mts
     <p> all`: plan (no model call) → one schema-constrained writer call per video (recipes only:
     opener/explain/flow/table/summary; frame auto-added) → upstream gates (maxIdle 7 s with the
     exact words quoted, sync, grounding, layout) → ≤1 repair → overnight produce; `translate
     <lang>` for hi/mr/kn. Trial on the BLS handbook: first pass 10 errors → after compiler fixes
     (echo emphasis, table-tour/explicit-say positions, mermaid `;`) and brief rules → 0 errors,
     no repair, 5:40, ~110 k tokens incl. subagent overhead (was 0.5–9.6 M per video). Headless
     writer needs a one-time CLI `/login` (else agent-mode job files). Render: fanless Mac,
     sustained ~22–25 fps (chunking measured, no gain — reverted).
   - Deliverables ready for owner/client review (all QA-passed, exactly 5:00):
     `output/MedSkills/EN_Blood_Pressure/…What_the_Numbers_Mean.mp4` (BP01, picture-first pilot)
     and `output/MedSkills/EN_Asthma/…What_Happens_in_the_Airways.mp4` (AS01, first lesson made
     by the automated new-subject workflow; project `demo-asthma-en`).
   - Re-author DM01 (hi), RS01 (kn), HH01 (mr) and the CSSD module (`ms-cssd-15`) as stages
     with the automated workflow; `human-heart` too. Their project.json need `length.exact: 300`
     + picture-first rules (copy from `med-blood-pressure-en/project.json`).
   - Native-speaker listen for hi/kn/mr before publishing anything.
   - Known limits: a lesson-author can pick a misleading picture (AS01 showed vegetables as
     "allergens" — caught only by the storyboard look); Sonnet art-authors can claim fixes they
     didn't make (the reviewer catches it; budget ~20–40 min + up to 4 review rounds per new pack).
   - Optional: ElevenLabs MCP if narration quality becomes the next complaint; Google Drive
     for bulk delivery. Motion.so is a task app — not useful here.

### Picture-first system map (what was built 2026-09-26/27)
| Piece | Where |
|---|---|
| `stage` model (world, camera maths, labels, validation, word budget) | `src/stage.ts` |
| Renderer (camera, labels on picture, note, pulse, travel, inset loupe, cross, dim, edge fade) | `src/templates/StageScene.tsx` |
| Exact length (holds solved to hit N s; words-to-cut/add in validate + voiceover) | `src/schedule.ts` `fitBreathe`, `length.exact` |
| Gates: `rules.minIllustrated`, `rules.maxScreenWords`, stage layer overlap (preflight audit) | `scripts/validate.mts`, `StageScene.tsx` |
| Hand-drawn packs: body (person, body map, vessel, gauge, 12 icons), airways (bronchiole, inhaler) | `src/art/packs/` |
| Art library tooling: register / gaps / check (gates + gallery) / approve | `scripts/art.mts`, `src/templates/ArtProbe.tsx` |
| Generated registries (never hand-edit) | `src/art/packs.gen.ts`, `src/art/catalog.gen.ts` |
| Check/answer picture panel | `visual` field, `scenes.tsx` `VisualPlate` |
| Docs | `docs/AUTHORING_GUIDE.md` §1b/§4 stage, `docs/AUTHORING_BRIEF.md`, `docs/ART.md` |

### Bugs fixed this round (don't reintroduce)
- Full renders failed `delayRender "house fonts"`: the handle was taken at module evaluation and
  orphaned by Remotion's second delay-render copy → now taken on mount (`useHouseFonts`).
- Storyboards used stale voiced timings after a spec rewrite → they now fall back to synthetic.
- Art gate missed brief events (a puff) → samples +15/+45 frames too; reviewer compares
  same-frame tiles; `approve` refuses a review older than the art.
- Clip-path seams: two paints (outline + fill) clipped separately leave an anti-aliased hairline
  → composite first (`<g opacity={0.999}>` inside the clip) or avoid clips (draw order).
- Glow filters on thin paths were boxed by the default filter region → `filterUnits="userSpaceOnUse"`.
- Scripts must treat `narration` as optional (ident scenes are silent) — `?? ""`.

## 1. State (2026-09-26)

The repo is a generic, project-based pipeline. Nothing in `src/` or `scripts/` is tied to a
subject, client or brand.

| project | what | status |
|---|---|---|
| `med-blood-pressure-en` | Blood Pressure: What the Numbers Mean — English, 5:55, 12 scenes | demo delivered 2026-09-26; QA pass |
| `med-diabetes-hi` | मधुमेह: इंसुलिन और रक्त शर्करा — Hindi, 6:18, 13 scenes | demo delivered 2026-09-26; QA pass |
| `med-respiration-kn` | ಉಸಿರಾಟ ಮತ್ತು ಅನಿಲ ವಿನಿಮಯ — Kannada, 6:19, 12 scenes | demo delivered 2026-09-26; QA pass |
| `med-hand-hygiene-mr` | हातांची स्वच्छता: पाच क्षण — Marathi, 5:59, 12 scenes | demo delivered 2026-09-26; QA pass |
| `human-heart` | The Human Heart: Structure, Flow and Rhythm — nursing/medical, 10:47, 19 scenes, 11 figures | delivered 2026-09-25; first first-pass run; QA pass |
| `ms-cssd-15` | MedSkills MS-CSSD-15 Module 10 — Flexible Endoscope Reprocessing, 5 × 3–4 min | delivered 2026-09-24/25; manifests stale (refinements only, see §5) |
| `fixtures` | every scene type + every diagram at min/max, synthetic timings | test corpus for `npm test` |
| `smoke` | 3-scene real lesson (TTS → render → QA) | end-to-end check: `npm run produce -- smoke` |

## 2. Bulk production — readiness and throughput

**Ready.** Everything after the spec is automated and gated; a bad lesson is set aside
without stopping the batch. The one step that isn't automatic is **authoring**: Claude
writes each spec (and, when there's no client material, the fact ledger) with the
`lesson-series` skill, then runs preflight until it's clean. Look at the first video of every
new series yourself (contact sheet + a watch): gates catch errors, not taste.

**Current numbers (Clinical style, 2026-09-26)** — `npm run metrics -- report` →
`output/METRICS.md` has the per-video table and the ETA/cost model. On this Mac (M5, 16 GB) a
~6-min video takes ~5–7 min of machine time end to end (render 38–50 fps, ~4–5 min; TTS
~45 s; QA ~1 min) — about **1 minute of machine time per minute of video**, ~3× faster than
the old paper style. Authoring a spec with a subagent: ~10–17 min, ~15k output tokens, ~$2–3
API-equivalent (see METRICS.md).

Older measurement (Proof style) for the 10:47 heart video:

| stage | time | notes |
|---|---|---|
| preflight | ~25 s | text checks + dry-run stills |
| voiceover | ~1.5 min | Edge TTS, cached per scene afterwards |
| render | ~19 min | 17 fps; CPU-bound: never run two render/produce jobs at once |
| qa | ~5 min | was ~10 before frame-seek fix |
| **total** | **~26 min per 10-min video** | ≈ 55 videos/day unattended; a ~5-min video ≈ 13 min |

Authoring (not machine time): roughly 15–30 min of Claude time per spec with the stock
diagrams; new pack art (like `heart`) is hours, once per subject. Disk: ~400 MB per 10-min
MP4 (264 GB free on 2026-09-25). 617 ZSkillup videos at ~5–6 min ≈ 5–6 days of render time.

**Residual risks:** Edge TTS is a free, unofficial Microsoft endpoint — it can throttle or
change; if voicing starts failing across the board, check `.venv/bin/pip install -U
edge-tts` first. There is no paid fallback wired in (ElevenLabs code is in `archive/`).

## 3. Decisions (condensed timeline)

- **Scale-up (Section 1):** CSV is a skeleton; we author the pedagogy. ~5 min lessons (up to
  12 for depth), open by naming the topic, real-world beat, code + a correct worked example,
  recap. Free Edge TTS (ElevenLabs quota ran out; key must be rotated — §5).
- **Sync:** visuals appear as the narrator says them (word-anchored reveals); intro ticks sync
  to an enumeration of the learn bullets.
- **Visual system v4 "Proof":** risograph paper booklet, spot colours, paper physics,
  meaning-driven transitions, foley, −14 LUFS. On-screen brand Talha (`TaMark`).
- **Client module (MS-CSSD-15 M10):** 5 × 3–4 min, Indian English female voice, custom-drawn
  animated illustrations (no stock/AI photos), Talha brand, knowledge checks mirroring the
  course assessment, content strictly from the PDF.
- **Render-only text bug:** SVG `<text>` shifted/clipped in long renders though stills were
  perfect → all art text is HTML, SVG text is linted, QA compares MP4 frames with stills.
- **Productization:** authoring = Claude Code playbook (`lesson-series` skill); visuals =
  generic diagram library + optional domain packs; one house style, brand per project.
- **Maturity pass:** pacing +15% (owner is paid per minute), diagrams first-class, house
  default = Indian English female (Neerja) + Talha, first-pass correctness before rendering.
- **Framework:** Remotion stays. HyperFrames/brag skills are design references only.
- **MedSkills rebrand + "Clinical" system v5 (2026-09-26):** client logo (keyed from their
  black-background PNGs by `scripts/prep-brand.mts`) replaces TA/ZSkillup everywhere;
  off-white page with soft brand glows, white cards, no edge chrome (crop marks, colour bar,
  progress rule and folio removed); Sora (display) + Inter (body), Anek + Noto for
  Devanagari/Kannada, never italic; brand-gradient accents; key terms (`terms`) and
  abbreviations emphasised automatically on screen.
- **Languages (2026-09-26):** project `lang` en/hi/mr/kn; fully native on-screen text; UI
  words in `src/lang.ts`; Unicode-aware sync, TTS word timeline and danda sentence ends;
  preflight rejects spoken abbreviations (all languages) and symbols/ranges in Indic
  narration. House voices: Neerja / Swara / Aarohi / Sapna (measured 141 / 121 / 96 / 83 wpm).
- **Medical illustration packs (2026-09-26):** circulation (artery, bpmonitor, bpscale),
  metabolic (insulin), respiratory (lungs, alveolus), infection (moments, hand) — docs/ART.md.
- **Token-efficient authoring (2026-09-26):** profiling showed authoring cost is context
  re-reading (~40 requests × a context growing to 160–225k), not writing (~15k output). Fixes:
  `scripts/brief.mts` (whole contract in one ~4k-token call), `.claude/agents/lesson-author.md`
  (lean tool set, fixed workflow: one Write → `--no-render` loop with small Edits → one full
  preflight), `scripts/strings.mts` (translate a finished lesson), preflight `--map` and an
  always-printed `⏱` runtime/word band, and the browser **text audit** in the dry-run render
  (text overflowing its box, colliding text — replaces image checks by authors; regression
  test `projects/audit-probe`). Measured on the same Hindi lesson: 37 → 18 requests, 4.37M →
  1.72M tokens, $1.95 → $1.06; translating a lesson: 16 requests, 1.45M tokens, $1.14; with
  the lean `lesson-author` agent type (fixed context 8k instead of 49k): 11 requests, 536k
  tokens, $0.67. The dedicated agent type loads at session start — use it for all authoring.
  Also from this pass: steps scenes show numbered placeholder cards until each step is named
  (previews the structure and keeps the picture alive — a long opener had tripped QA's
  frozen-picture gate), the bpmonitor's SYS/DIA labels follow the lesson language, and
  preflight warns when an anchor word sits at the very start of a listening window.
- **Picture-first + exactly 5:00 (2026-09-26, client feedback "text with a voiceover"):** the
  delivered lessons had 0–39 % of narration over an actual illustration. New teaching scene
  `stage` (src/stage.ts model + src/templates/StageScene.tsx): one drawn world per scene, a
  camera that travels to what is explained, beats (fired by spoken words) that show / act /
  label on the picture / flow particles / open a magnifier loupe / strike / focus. New generic
  drawn parts (src/art/packs/body.tsx: person, body map, vessel cross-section, gauge, 12
  everyday icons); check/answer take a `visual`. Gates: `rules.minIllustrated`,
  `rules.maxScreenWords`, every beat visible (validate); `length.exact` solves the holds so a
  video is exactly N s (src/schedule.ts fitBreathe; validate + voiceover report words to
  cut/add). New projects default to exactly 300 s + picture-first. All imagery is drawn in code
  (owner decision: no image libraries, no AI images). BP01 re-authored as the pilot; spec +
  plan in docs/superpowers/.
- **Render fix (2026-09-26):** full renders failed with `delayRender() "house fonts" … not
  cleared`: the handle was taken at module evaluation and orphaned when Remotion's render entry
  evaluated its second delay-render copy (`remotion/no-react`), which resets the handle list —
  so its timer fired in any render longer than the timeout. Fonts still start loading at import;
  the handle is now taken on mount (`useHouseFonts`, src/fonts.ts). `npm test` 5b renders a clip
  longer than a short `--timeout` to keep it fixed.
- **Metrics (2026-09-26):** every stage records itself; Claude authoring tokens are summed
  from Claude Code transcripts (`scripts/metrics.mts`). Subagent transcripts keep only a stub
  of output tokens, so output is estimated from the generated text (hidden thinking excluded);
  input/cache counts are exact.

## 4. What exists (by layer)

- **Projects** (`projects/<slug>/project.json`): brand, voice (+ measured wpm), pacing,
  lexicon, music, runtime band, scene rules, sync strictness, spelling, output folder.
  `source/` is the fact ledger (client PDF, or `reference-notes.md` with citations).
- **One props-driven composition** ("Lesson" + `calculateMetadata`); the generated registry
  only feeds Studio.
- **Sync** (`src/sync.ts`): renderer, validator, preflight and the real-voice audit share
  one definition of which word fires which reveal; `say` overrides on every anchored item.
- **Art** (`src/art/`, rules in `docs/ART.md`): kit primitives (`draw` + `fillIn`: fills
  follow their outlines), generic diagrams (cycle, flow, timeline, hub, stack, image, bars,
  trace), the graph engine (auto layout, narrated storyboard: flow/token/focus/cut), packs
  (`endoscopy`, `heart`), and a pure catalog the validator uses.
- **Speakable narration** (`scripts/lib/speak.mts`): ranges, %, abbreviations, symbols and
  the project lexicon are spelled out for the voice; captions keep the script.
- **Gates**, in `produce` order: preflight (validate · grounding in `source/` · spelling ·
  speech hazards · timing simulation · dry-run layout) → voiceover (runtime band, sync vs
  the real voice) → render (manifest hash of spec + timings + visual config + `src/`) → qa
  (format, loudness, decode, black/frozen, cuts, SRT, MP4-vs-stills, layout).
- **Publish kit** per render: `.jpg` thumbnail, `.youtube.txt` (title, chapters, credits), `.srt`.

### Bulk hardening (2026-09-25, last change set)
- `produce` preflights the whole batch, then takes each lesson to a QA'd MP4; a failing
  lesson is recorded and skipped, the batch continues, the summary lists what stopped where.
- `PREFLIGHT.md` / `QA.md` merge per lesson (partial re-runs keep other lessons' results;
  deleted lessons drop out). `produce` reads verdicts from `PREFLIGHT.md` headings.
- QA records the passing build in the manifest (`qa` = `hash`) and skips it next time
  (`--force` re-checks); sample frames are extracted by seeking (pixel-identical, ~30× faster).
- TTS: each Edge call has a 90 s timeout (a silent socket hung a run for 19 min), plus a
  15 min per-scene backstop; both retry.
- Preflight: a lesson that fails validate or crashes its dry-run is blocked; the rest are
  still fully checked.
- Heart pack: muscle/chamber fills no longer appear before their outlines.

## 5. Open items and cleanup candidates

- **Native-language review:** hi/kn/mr specs were written by Claude and checked by preflight
  (grounding, sync, layout), not by a native speaker. Listen for mispronunciations and add
  `lexicon` entries (display → spoken spelling), then `npm run produce` re-voices only
  changed scenes.
- **Pipeline safeguards added 2026-09-26 (all content-agnostic):** vendored fonts
  (public/fonts, src/fonts.ts — renders identical on any machine) + a glyph-coverage gate;
  ambient motion (float + scale breath in quadrature) so no settled scene can freeze
  (`npm test` 5d); browser text audit (overflow/collision); certificates bound to a build hash
  that ignores machine noise (.DS_Store); server environment check; poster art in its base
  state for any art; music credits from public/audio/music/credits.json; author example chosen
  from certified lessons.
- **Old lessons vs the no-spoken-abbreviation rule:** `human-heart` (SA, AV, ECG, QRS, PR) and
  `ms-cssd-15` (CSSD) now fail preflight's speech check; rewrite those narrations with full
  forms (or a `lexicon` entry where clinicians say the letters, e.g. QRS) before re-producing.
- **Experiments:** `projects/lab-*` are the token experiments (outputs in
  `output/_experiments/`); delete them when no longer needed.
- **Brand files:** the logo was keyed from raster PNGs; ask the client for SVG/transparent
  masters and re-run `node scripts/prep-brand.mts`.

- **ms-cssd-15:** V803/V805 specs gained `say` anchors and `src/` has improved since
  delivery, so all five manifests are stale. Delivered files are fine; re-render when
  convenient (`npm run produce -- ms-cssd-15`, ~40 min). V801 uses general-anatomy terms not
  in the client PDF (preflight warnings) — confirm with the client.
- **Security:** `.env` still holds an `ELEVENLABS_API_KEY` that was leaked earlier. Nothing
  live uses it — rotate it at elevenlabs.io and delete `.env`.
- **Licences / sign-off:** `bed.mp3` licence (ende.app) unverified; `deliberate-thought.mp3`
  is CC BY 4.0 (credit is written into `.youtube.txt`). Client to confirm the Neerja voice by
  ear. Heart facts: clinician review before publishing.
- **No version control:** the folder is not a git repo. Recommended: `git init` with
  `iterations/`, `public/audio/vo/`, `graphify-out/` added to `.gitignore`.
- **Disk/clutter:** cleaned 2026-09-25 (see §0). `graphify-out/` is a 2026-09-17 snapshot from
  before productization (stale — rebuild or delete).

## 6. Quality bar (enforced where possible)

Open by naming the topic · enumerate learn bullets late in the intro · one idea per scene ·
every reveal on its spoken word · real-world beat · correct worked examples · faithful to the
source · recap · runtime inside the project band · no overflow · MP4 identical to stills ·
−14 LUFS, BT.709, clean decode, SRT. Review contact sheets by eye before batch renders.

## 7. Operational gotchas

- **Render hash is conservative:** any byte change in `src/` (even a comment) marks every
  lesson of every project stale. Intended; batch your `src/` changes before a big render.
- **Mac sleep** kills long jobs: `render`/`produce` hold a `caffeinate` assertion; wrap other
  long commands in `caffeinate -ims`.
- **Orphaned headless Chrome** after a killed run: `pkill -f chrome-headless-shell` when no
  job is running.
- **Render finishes frames then hangs at 0% CPU:** Gatekeeper blocking Remotion's ffmpeg —
  README → Troubleshooting.
- **edge-tts helper** must stay named `tts_edge.py` (`edge_tts.py` shadows the package);
  SSML `<break>` doesn't work — pacing comes from project `pacing`.
- Legacy projects pin `pacing: {sentencePause: 0, breathe: 1}` so they reproduce exactly.
- Don't hand-edit `src/registry.gen.ts` or `projects/*/build/`.
