# Picture-first lessons — design

Status: approved 2026-09-26 (owner). Phase 1 = engine + library + gates + BP01 pilot.

## Why

Client feedback on the MedSkills demo: *"It looks more like text with audio voiceover. It
should have more images with proper explanations and animations."*

Measured on the delivered specs, the share of narration spoken over an actual
illustration is 0–39 % (BP01 31 %, DM01 18 %, HH01 19 %, RS01 35 %, V801–V805 0–26 %,
H01 39 %). The rest is text cards (intro, hook, definition, steps, compare, mistake,
check/answer, recap) or `graph`/`hub` boxes of words. Where there is art, it sits on a
~1070 px plate beside a column of 4–6 text callouts and mostly holds still while labels tick
on: a labelled textbook figure, not an explanation. The scene grammar is text-first, and
hand-coded art (hours per subject) is the bottleneck that pushes authors back to text.

## Goal

Every lesson *shows* its ideas: processes play out, causes visibly lead to effects,
mechanisms move, states transform, and the camera travels through one illustrated world
per scene as the narrator explains it. Text on screen is names and numbers. Reusable for
any educational/medical subject, any `lang`.

Direction chosen by the owner: **hybrid imagery** (open-licensed medical illustration
library + our drawn code art) in an **Osmosis / Kurzgesagt-style** flat illustrated
motion look (extends the current "Clinical" system).

Success = BP01 re-produced passes all gates with ≥ 75 % illustrated share, and the owner
judges it answers the client's feedback when watched side by side with the old BP01.

## 1. `stage` scene — the illustrated world

A new scene type; `figure` keeps working for existing specs.

```json
{"type":"stage","kicker":"The pressure wave","title":"Every heartbeat sends a pressure wave",
 "narration":"…",
 "world":{"w":3200,"h":1800,"layers":[
   {"id":"heart","asset":"bioart:heart-anterior","at":[520,900],"h":620},
   {"id":"artery","art":"artery","at":[1900,900],"h":700},
   {"id":"trace","art":"trace","data":{…},"at":[1900,1500],"h":360,"hidden":true}]},
 "beats":[
   {"say":["heart"],"camera":{"on":"heart","zoom":1.8},"pulse":"heart","label":{"on":"heart","text":"Heart"}},
   {"say":["elastic"],"camera":{"on":"artery.wall","zoom":2.4},"act":"artery.wall","label":{"on":"artery.wall","text":"Elastic wall"}},
   {"say":["systolic"],"show":"trace","camera":{"on":"trace"},"act":"artery.systole","label":{"on":"trace.peak","text":"Systolic"}},
   {"say":["diastolic"],"act":"artery.diastole","label":{"on":"trace.floor","text":"Diastolic"}},
   {"say":["reading"],"camera":"overview"}]}}
```

- **World**: one canvas in its own units, larger than the frame. Layers are placed by
  centre `at` and height `h` (width from the source aspect). A layer is one of:
  - `asset`: a library image (`<source>:<slug>`, §3);
  - `art`: an existing drawn art from `src/art` (packs, diagrams, graph, trace, bars) with
    its `data` — its anchors become `layer.anchor` targets and its events become `act`s;
  - `hidden: true` layers enter on a `show` beat; others are present from the start
    (drawn arts draw on, images wipe/scale in during the scene's opening).
- **Targets**: `layer` or `layer.anchor` (art anchors, or named asset anchors from the
  library manifest).
- **Beats** fire on their `say` words through `src/sync.ts` (strict group: every beat must
  be heard — the existing "every reveal hears its word" rule). Verbs, all optional per beat:

| verb | effect |
|---|---|
| `camera` | `{"on": target, "zoom"?: n}` push/pan to frame the target; `"overview"` pulls back to the whole world. Eased (out-family on arrivals, inOut on repositions), one camera state per scene, never springy. |
| `show` | a hidden layer (or list) enters: drawn art draws on + fills; images wipe/scale in. |
| `label` | `{on, text}` short label pinned on the picture with a leader, placed away from the target and other labels by the layout solver; stays until the next `camera: "overview"` or scene end, dims when not current. |
| `pulse` | glow/ping on a target (existing `Ping`). |
| `travel` | `{"along": [t1, t2, …], "as": "dot"/"cell"/asset, "stream"?: true, "loop"?: true}` particles or an actor move along a path through targets. |
| `act` | fires a drawn art's event (`artery.systole`, `insulin.type2`) — today's `at(anchor)` contract, so every existing pack event becomes an action. |
| `swap` | `{"layer": id, "to": asset}` before→after transformation in place (crossfade + slight scale settle). |
| `inset` | `{"of": target, "show": asset/art, "zoom"?: n}` a circular magnifier loupe (macro→micro) beside the target, leader to it. |
| `cross` | a red cross drawn over a target (wrong / blocked / not this). |
| `dim` | rack everything but the named targets back (focus). |

- Camera legs are motivated by beats only; the scene opens on the overview (or on the
  first beat's target when `open: target`). Ambient life (existing float/breath) continues.
- Layout: the world fills the frame below the title (≈ 1800 × 820 px visible at zoom 1);
  captions stay; no margin text column. Labels are HTML (never SVG text).
- Language: labels come from the spec, so they are native; assets carry no text.

## 2. A visual slot on text scenes

`hook`, `definition`, `steps`, `compare`, `mistake`, `check`, `answer` accept `visual`:

```json
"visual": {"asset": "bioart:…"}                      // or {"art": "artery", "data": {…}, "act": ["…"]}
"visual": {"world": {…}, "beats": […]}               // a mini stage (same schema as §1)
```

With a `visual`, the scene switches to a picture-dominant layout:
- **hook / definition**: picture fills the frame; headline/term + one line move to a
  lower-third strip; definition chips become `label`s on the picture.
- **steps**: each step may carry its own `visual`; the current step's picture fills the
  frame, a numbered progress strip (label only, ≤ 4 words) runs underneath; `detail`
  moves into narration.
- **compare / mistake**: two pictures side by side (`left.visual`, `right.visual` /
  `wrong.visual`, `right.visual`); the wrong side gets `cross`; lines shrink to ≤ 2 short
  labels per side.
- **check / answer**: the question over the dimmed picture of the scene it tests; the
  answer replays that picture with the key label.

Scenes without `visual` render exactly as today (backward compatible). Intro and recap are
unchanged (the recap already reprints the lesson's pictures).

## 3. Asset library

```
assets/library/
  library.json          # manifest, one entry per asset
  <source>/<slug>.png|svg
  sheets/<slug>.png      # gridded preview (for anchor placement + author browsing)
assets/index/bioart.json # crawled catalogue (not imported, searchable)
```

Manifest entry:
```json
{"id":"bioart:heart-anterior","file":"bioart/heart-anterior.png","title":"Heart, anterior view",
 "source":"https://bioart.niaid.nih.gov/bioart/123","license":"Public Domain","creator":"…",
 "credit":null,"tags":["heart","anatomy","cardiovascular"],"w":1451,"h":1344,
 "anchors":{"aorta":[0.52,0.12],"left-ventricle":[0.62,0.7]}}
```

`scripts/assets.mts`:
- `index bioart` — crawl `bioart.niaid.nih.gov/bioart/<n>` politely (≤ 2 req/s, cached,
  resumable): title, keywords, file ids. Search is server-rendered, so a local index is
  the reliable way to search.
- `search <words>` — over the manifest + indexes, prints ids, titles, licences.
- `add <source>:<ref> [--slug s]` — download the largest colour PNG (BioArt API
  `/api/bioarts/<n>/files/<fileId>`, licence/creator read from the PNG tEXt metadata) or
  the SVG (Bioicons GitHub raw, licence from its folder), trim transparent margins, write
  the manifest entry and the gridded sheet.
- `anchor <id> name=x,y …` — set named anchors (0–1), regenerating the sheet with them.
- Phase 2: `add servier:<kit>` (PPTX → PNG via the installed `soffice`), CC BY.

Licensing: only Public Domain / CC0 / MIT / CC BY assets are accepted. CC BY (and any
asset with a `credit`) is credited automatically on the end card of each video that uses
it ("Illustrations: … CC BY 4.0"). Assets are vendored in the repo (and the render kit), so
renders need no network.

Drawn art stays the tool for anything that must move part by part (a valve opening, a
key turning a lock, a wall stretching). Library = the nouns; drawn art = the verbs.

## 4. Authoring

- `docs/AUTHORING_GUIDE.md`: new §"Show, don't tell": the storyboard-first method, the
  `stage` schema, verbs, the `visual` slot, the text budget; `stage` becomes the default
  teach scene.
- `lesson-series` skill + `lesson-author` agent + `scripts/brief.mts`: a **storyboard
  step** before narration — per scene one line "the viewer sees …", then assets picked
  with `assets.mts search` (and added/anchored if missing), then narration written *to* the
  picture ("Watch the wall stretch…"), then beats. The brief prints the verbs and the
  library index for the project's tags so the agent doesn't re-read docs.
- Rule: explain with the picture; on-screen text is names and numbers only.

## 5. Gates

In `validate`/`preflight` (text-provable) and `certify`/`qa` (render-provable):

- **Illustrated share** — narration time (word-count estimate in validate, real timings in
  certify) spoken over a picture-dominant scene (`stage`, `figure` with a pack/asset art,
  any scene with `visual`) ≥ `rules.minIllustrated` (default 0.75 for new projects via
  `new-project.mts`; 0 for old projects until re-authored). Reported always.
- **Text budget** — on-screen words outside captions per scene state ≤ `rules.maxScreenWords`
  (default 20), counted from the spec (titles, labels, strips, lines) at each beat.
- **Every beat changes the picture** — validator: each `stage` beat has at least one
  visible verb; QA: the existing freezedetect tightened from 3 s to 2.5 s *and* a check that
  frame difference spikes near each beat's frame.
- **Assets** — every referenced asset/anchor exists in the manifest, licence is on the
  allow-list, credits present; images are within the render kit.
- **Layout** — the dry-run text audit covers pinned labels (no overflow, no collisions,
  labels inside the frame at every beat's camera pose).
- Fixtures: `projects/fixtures/specs/F10.json` (every verb, every target kind, min/max
  camera zoom) and `F11.json` (every text scene with `visual`), with library assets vendored
  for tests; `npm test` runs them.

## 6. Pilot — BP01 re-authored

| scene | what the viewer sees |
|---|---|
| Hook | a person who feels fine; an inset gauge in the chest silently climbs into red |
| Definition | push from the arm into an artery cross-section; blood pushes on the walls (force arrows), the wall stretches |
| Pressure wave | heart beats, a pulse travels the artery, live trace swings between systolic peak and diastolic floor |
| Reading | cuff inflates and squeezes; monitor counts up to 120 / 80 |
| Where it falls | a marker slides along the scale as each reading is spoken |
| Damage | dive into the strained wall, pull back to a body map: heart, brain, kidneys light up in place |
| Prevention | each habit as a picture (salt, vegetables, walking, no tobacco, a home cuff) |
| Mistake / check | "I feel fine" vs the monitor reading 150 / 95, placed on the scale |

Facts stay inside `projects/med-blood-pressure-en/source/`. The old BP01 MP4 is kept for a
side-by-side comparison. New drawn actors are added only where no library asset + existing
art can show the mechanism (expected: arm-with-cuff squeeze, artery cross-section with
force arrows, body map with organ anchors), each as a generic pack art with a fixture.

## Out of scope (phase 2)

Re-authoring DM01, RS01, HH01, V801–V805, H01; the Servier importer; 3D/realistic looks;
AI-generated imagery (declined).

## Risks and ceilings

- Library PNGs move as whole pieces (move, zoom, mask, swap); part-by-part motion needs
  drawn art. Library styles vary slightly; mitigation: prefer one source per lesson, the
  sheet review in certify, and the house plate/shadow treatment on every image layer.
- Authoring cost per lesson rises (storyboard + asset picking), estimated ≈ 1.5×; the
  brief keeps it bounded. Render cost roughly unchanged (images are cheap layers).
- BioArt crawl depends on the site's page structure; the index is cached in the repo so a
  site change only affects adding new assets, never rendering.
