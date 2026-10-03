# Picture-first lessons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every lesson show its ideas: a `stage` scene (an illustrated world the camera travels through, choreographed by narrated beats), a `visual` slot on text scenes, an open-licensed asset library with an importer, gates that enforce it, and BP01 re-produced as the pilot.

**Architecture:** Pure model in `src/stage.ts` (types, target resolution, camera keyframes, label placement, validation, on-screen word count) shared by renderer, validator and tests — same pattern as `src/sync.ts`. One renderer `src/templates/StageView.tsx` draws a world at a frame; `StageScene` and the visual-slot layouts (`src/templates/visual.tsx`) both use it. Library manifest `public/library/library.json` (served by `staticFile`), read by `src/library.ts`; `scripts/assets.mts` imports from NIH BioArt, Bioicons and Fluent Emoji.

**Tech Stack:** Remotion 4 (React 19), TypeScript run by `node` directly (`.mts`/`.ts`), jimp (image trim/sheets), ffmpeg, `node:assert` tests in `scripts/test.mts`.

**Spec:** `docs/superpowers/specs/2026-09-26-picture-first-design.md`

## Global Constraints

- Never SVG `<text>`/`<tspan>` — all text is HTML (lint-art enforces).
- Deterministic rendering only: no `Math.random`, no timers; animate from the frame (`tw`, `mix`, `hash`).
- Every reveal hears its word: stage beats are a strict sync group in `src/sync.ts`.
- Licences accepted: `Public Domain`, `CC0`, `MIT`, `CC BY 4.0` (credit shown on the end card). Nothing else.
- Assets live under `public/library/` (vendored, no network at render time).
- Old specs render exactly as before; new gates default off for existing projects (`minIllustrated: 0`, `maxScreenWords: 0`), on for new projects (`0.75`, `20`).
- Don't hand-edit `src/registry.gen.ts` or `projects/*/build/`. TS check: `npx tsc --noEmit`.
- Not a git repo: "checkpoint" = `npm test -- --fast` green (full `npm test` after render-affecting tasks).

---

### Task 1: Asset library + importer

**Files:**
- Create: `src/library.ts`, `scripts/assets.mts`, `public/library/library.json` (`{"assets": []}`)
- Modify: `scripts/export.mts:60` (add `public/library`), `scripts/test.mts` (units)

**Interfaces:**
- Produces:
  ```ts
  // src/library.ts
  export type Asset = {id: string; file: string; title: string; source: string; license: string; creator?: string;
    credit?: string | null; tags: string[]; w: number; h: number; anchors?: Record<string, [number, number]>};
  export const LICENSES: string[];                       // allow-list
  export const LIB: Record<string, Asset>;               // from public/library/library.json
  export const assetOf: (id: string) => Asset | undefined;
  export const needsCredit: (a: Asset) => boolean;       // CC BY or explicit credit
  export const creditLine: (assets: Asset[]) => string;  // "Illustrations: NIAID NIH BioArt (public domain) · …"
  ```
- CLI: `node scripts/assets.mts index bioart [--from n --to m]` · `search <words…>` · `add bioart:<n>|bioicons:<path>|fluent:<Name> [--slug s] [--tags a,b]` · `anchor <id> name=x,y …` · `sheet <id>`
- Crawl index: `scripts/data/bioart-index.json` (`[{n, title, keywords, files:[{id,name}]}]`); sheets: `iterations/library/<slug>.png`.

- [ ] Step 1: units in test.mts: `LICENSES` accepts `Public Domain`/`CC0`/`MIT`/`CC BY 4.0`, `needsCredit` true only for CC BY/explicit credit, `creditLine` groups by source. Run `npm test -- --fast` → FAIL (module missing).
- [ ] Step 2: write `src/library.ts` (JSON import of the manifest; pure).
- [ ] Step 3: write `scripts/assets.mts`: BioArt page parse (title `<h6>`, keywords line, `files/<id>` + names), download largest colour PNG via `/api/bioarts/<n>/files/<id>`, read PNG tEXt `license`/`creator`; Bioicons raw SVG from `duerrsimon/bioicons` (licence = path segment); Fluent `assets/<Name>/Flat/*_flat.svg` (MIT). SVG → PNG not needed (Img renders SVG). Trim transparent margins with jimp (PNG); record w/h; write manifest entry; draw sheet (image + 10% grid + anchors) with jimp.
- [ ] Step 4: `index bioart` crawl ≤2 req/s, resumable; `search` over index + manifest.
- [ ] Step 5: run `add` for one asset of each source; Read the sheets; `npm test -- --fast` green.

### Task 2: Stage model (pure)

**Files:**
- Create: `src/stage.ts`
- Modify: `scripts/test.mts` (units)

**Interfaces:**
- Consumes: `LIB`/`assetOf` (Task 1), `ARTS`-free catalog data via `CATALOG` for art anchors (pure).
- Produces:
  ```ts
  export type Target = string;  // "layer" | "layer.anchor"
  export type Layer = {id: string; asset?: string; art?: string; data?: any; at: [number, number]; h: number; hidden?: boolean; flip?: boolean};
  export type Beat = {say: string[]; camera?: {on: Target; zoom?: number} | 'overview'; show?: string | string[];
    label?: {on: Target; text: string}; pulse?: Target; travel?: {along: Target[]; as?: string; tone?: string; stream?: boolean; loop?: boolean};
    act?: Target | Target[]; swap?: {layer: string; to: string}; inset?: {of: Target; show: string; zoom?: number}; cross?: Target; dim?: Target[] | false};
  export type World = {w: number; h: number; layers: Layer[]};
  export type Visual = {asset?: string; art?: string; data?: any; world?: World; beats?: Beat[]; open?: Target};
  export const VIEW: {x: number; y: number; w: number; h: number};          // viewport rect for the world (px)
  export const normalizeVisual: (v: Visual) => {world: World; beats: Beat[]; open?: Target};
  export const layerBox: (l: Layer, aspect: number) => {x: number; y: number; w: number; h: number};
  export const targetPoint: (world: World, t: Target, aspectOf: (l: Layer) => number, anchorsOf: (l: Layer) => Record<string,[number,number]>) => [number, number] | null;
  export type Cam = {cx: number; cy: number; s: number};                   // world point at viewport centre, px per world unit
  export const fitCam: (world: World, view?: typeof VIEW) => Cam;
  export const camFor: (world: World, beat: Beat, prev: Cam, resolve: (t: Target) => {pt: [number,number]; box?: {w:number;h:number}} | null, view?: typeof VIEW) => Cam;
  export const camAt: (f: number, keys: {f: number; cam: Cam}[]) => Cam;   // eased (inOut, log-scale zoom), 30-frame legs starting 8 frames before the beat
  export const toScreen: (cam: Cam, p: [number, number], view?: typeof VIEW) => [number, number];
  export const placeLabel: (pt: [number, number], w: number, h: number, taken: {x:number;y:number;w:number;h:number}[], view?: typeof VIEW) => {x: number; y: number};
  export const stageProblems: (v: Visual, ctx: {asset: (id: string) => {w:number;h:number;anchors?:Record<string,[number,number]>} | undefined; artAnchors: (art: string, data: any) => string[] | null}) => string[];
  export const screenWords: (texts: string[]) => number;
  export const beatPhrases: (beats: Beat[]) => string[][];                  // for sync.ts
  ```
- [ ] Step 1: units: `fitCam` fits a 3200×1800 world into VIEW; `camFor` on a layer frames it at ~70% of the viewport and clamps inside the world; `camAt` equals key cams at rest and is monotone between; `placeLabel` avoids a taken rect and stays inside VIEW; `stageProblems` flags unknown layer/asset/anchor, beats without a visible verb, a label > 28 chars, `show` of a non-hidden layer; `normalizeVisual({asset})` gives a single-layer world. Run → FAIL.
- [ ] Step 2: implement `src/stage.ts`. Run → PASS.

### Task 3: Contract wiring (spec, sync, validate, project rules)

**Files:**
- Modify: `src/spec.ts` (StageScene; `visual?: Visual` on hook/definition/check/answer, per-step `visual`, `left/right.visual`, `wrong/right.visual`), `src/sync.ts` (`revealGroups`: `stage` → `beats` strict; `visual.beats` → `visual` strict for text scenes), `scripts/validate.mts` (SCENE_TYPES + `stage`; stage/visual checks via `stageProblems`; illustrated share; text budget), `src/project.ts` (`rules.minIllustrated`, `rules.maxScreenWords` default 0), `scripts/new-project.mts` (new projects: 0.75 / 20), `scripts/lib/coverage.mts` NOT_TEXT (+`asset`,`on`,`layer`,`along`,`as`,`of`,`show`,`act`,`cross`,`dim`,`camera`,`open`), `scripts/brief.mts` (print stage verbs + library summary).
- Illustrated share (validate, word-count estimate): a scene counts when `stage`, a `figure` whose art is a pack or `image`, or any scene with a `visual` (steps: any step visual; compare/mistake: both sides). Error when `< rules.minIllustrated`; always printed in the ⏱ line.
- Text budget: per scene, words simultaneously on screen outside captions (title + strip texts + max labels visible between overviews); error when `> rules.maxScreenWords` (if > 0).
- [ ] Step 1: units: `revealGroups` of a stage returns strict `beats`; `syncProblems` reports an unheard beat; validator run on a temp project with a bad stage lists the problems. Run → FAIL.
- [ ] Step 2: implement. Run `npm test -- --fast` → PASS (all existing projects still validate).

### Task 4: StageView renderer + `stage` scene + fixture F10

**Files:**
- Create: `src/templates/StageView.tsx`, `projects/fixtures/specs/F10.json`
- Modify: `src/templates/scenes.tsx` (export `StageScene`), `src/VideoComposition.tsx` (dispatch), `src/art/kit.tsx` (nothing unless needed)

**Interfaces:**
- Consumes: Task 2 model, Task 1 `assetOf`, `ARTS`, `ArtView`, `SceneFrame`, `anchorGroup`, `Sfx`.
- Produces: `<StageView v={normalized} beats={number[]} f={number} view={VIEW-like rect} still?: boolean />` — layers (Img for assets with soft shadow; ArtView for arts with `at(anchor)` = frame of the first `act` on that anchor), camera, labels (HTML, constant screen size, leader + dot, current bright / older dim, cleared on `overview`), pulse ring, travel particles, swap crossfade, inset loupe, cross, dim. `StageScene` = SceneFrame + optional title + StageView over VIEW.
- [ ] Step 1: write F10 (every verb, asset + art + hidden layer, anchor + layer targets, zoom min/max) using Task 1 assets; `node scripts/validate.mts fixtures F10` green.
- [ ] Step 2: implement StageView + StageScene.
- [ ] Step 3: storyboard stills `node scripts/lib/storyboard.mts fixtures F10 <idx> --at 0.1,0.3,0.5,0.7,0.9` — Read them; fix until camera/labels/verbs read correctly. `npm test` (full) green.

### Task 5: Visual slot on text scenes + fixture F11

**Files:**
- Create: `src/templates/visual.tsx`, `projects/fixtures/specs/F11.json`
- Modify: `src/templates/scenes.tsx` (hook/definition/steps/compare/mistake/check/answer delegate to visual layouts when a visual is present)
- Layouts: picture area = VIEW minus a lower strip (y ≥ 760). hook: headline strip, question on its beat; definition: term + plain in strip; steps: current step picture (crossfade between steps), numbered progress chips in strip; compare/mistake: two pictures side by side, keyword/label above each, ≤2 lines under each, `cross` + WRONG/RIGHT stamps on mistake; check: dimmed picture behind the question card; answer: picture + answer strip.
- [ ] Step 1: F11 covering each type with a visual; validate green.
- [ ] Step 2: implement; storyboard stills; Read; iterate. Full `npm test` green.

### Task 6: Credits, asset gate, beat-change gate, freeze threshold

**Files:**
- Modify: `src/templates/scenes.tsx` (recap outro: `creditLine` of the lesson's credit-needing assets, small, under the signoff), `scripts/validate.mts` (asset exists + licence allowed — from Task 3's `stageProblems` ctx), `scripts/preflight.mts` (dry-run: for each stage beat render stills at beat−2 and beat+24 on synthetic timings and require a mean pixel difference > threshold, via jimp; warn → error when the picture doesn't change), `scripts/qa.mts:67` (freezedetect `d=3` → `d=2.5`).
- [ ] Step 1: add a fixture beat whose only verb targets an invisible change (expect preflight to flag it) — use `projects/audit-probe`-style throwaway probe `projects/stage-probe` with one stage whose beat does nothing visible (a `pulse` on an off-screen target); assert in test.mts 5e that preflight fails with "picture does not change".
- [ ] Step 2: implement; full `npm test` green.

### Task 7: Drawn actor `vessel` (artery cross-section)

**Files:**
- Modify: `src/art/packs/circulation.tsx` (new `vessel` art), `src/art/catalog.ts` (entry), `projects/fixtures/specs/F06.json` or F10 (exercise all anchors/events)
- `vessel`: round artery cross-section (outer wall, muscle layer, lumen with red cells). Anchors: `wall lumen blood`; events: `push` (outward force arrows pulse with a beat), `stretch` (wall expands/relaxes with pulses), `stiff` (wall thickens, lumen narrows, colour darkens), `tear` (small tears on the inner lining). Text-free.
- [ ] Step 1: add to catalog + fixture; validate.
- [ ] Step 2: draw; storyboard stills; Read; iterate; full `npm test`.

### Task 8: Authoring docs, skill, agent, brief

**Files:**
- Modify: `docs/AUTHORING_GUIDE.md` (new §"Show, don't tell": storyboard method, `stage` schema + verbs, `visual` slot, text budget; stage is the default teach scene), `docs/ART.md` (library vs drawn art; `assets.mts` workflow; `vessel`), `.claude/skills/lesson-series/SKILL.md` (storyboard step + asset step), `.claude/agents/lesson-author.md` (workflow: storyboard → assets → narration to the picture → beats), `README.md`, `HANDOFF.md` (§0/§3/§4), `scripts/brief.mts` (verbs + library ids by tag).
- [ ] Step 1: write; run `node scripts/brief.mts med-blood-pressure-en` and check it's complete and ≤ ~5k tokens.

### Task 9: Pilot — BP01 re-authored

**Files:**
- Modify: `projects/med-blood-pressure-en/specs/BP01.json`, `projects/med-blood-pressure-en/project.json` (`minIllustrated: 0.75`, `maxScreenWords: 20`)
- Keep: the delivered MP4 copied to `output/MedSkills/EN_Blood_Pressure/_before/` for side-by-side.
- [ ] Step 1: import assets (body, heart, brain, kidney, blood cells, person; Fluent salt/vegetables/walking/no-smoking/stethoscope-or-cuff); anchor them; Read sheets.
- [ ] Step 2: storyboard (spec §6) → rewrite BP01 with stages/visuals; facts only from `source/`.
- [ ] Step 3: `npm run preflight -- med-blood-pressure-en` clean; storyboard stills Read and judged.
- [ ] Step 4: `caffeinate -ims npm run produce -- med-blood-pressure-en 2>&1 | tee iterations/med-blood-pressure-en_produce.log`; QA passes on the final MP4; Read the certify contact sheet; watch sampled frames.
- [ ] Step 5: report before/after (illustrated share, screenshots) to the owner.
