# Illustrations — adding art to the library

## Source first, draw last (owner's rule, 2026-10-03)
For any medical diagram or illustration, **research existing authoritative assets before
drawing anything**. Code-draw only when no suitable source exists or none meets the quality bar.
1. `node scripts/find-assets.mts "<subject>"` — NIH BioArt (public domain, professional vector)
   and Wikimedia Commons (licences read from metadata), ranked: public domain/CC0 → CC BY (credit)
   → share-alike (avoid for client work). Report in `iterations/assets/`.
2. `node scripts/find-assets.mts --get bioart:<id> <dir>` (or `commons:File:<name>.svg`) →
   `assets/vector/<dir>/source.svg` + `licence.json`.
3. `node scripts/ingest-art.mts <dir> --parts` lists the drawing's parts; write
   `manifest.json` (layers by role, motion, anchors, flows — see heart-bioart); then
   `node scripts/ingest-art.mts <dir>` → animatable library art (src/art/vector.tsx). Credits go
   in the video's end card.
4. Only if nothing fits: commission a code-drawn pack (below), in the house ink style
   (src/art/ink.tsx).


Most subjects never need new art: the generic diagrams (`cycle`, `flow`, `timeline`, `hub`,
`stack`, `image`) cover processes, sequences, histories, relationships, layers and real
photos. Add a **pack** only when a subject needs a bespoke drawing whose parts light up as
they are narrated (the endoscope, a cell, an engine, a circuit…).

## The contract (`src/art/kit.tsx`)

An art is a factory `(data) => ArtDef`:

```ts
{ w, h,                         // its own coordinate space (side arts: 1000×620 fits the plate)
  layout: 'side' | 'full',      // side = plate + callout column; full = wide, labels drawn by the art
  anchors: {name: [x, y]},      // where callout leaders land (art coordinates)
  C:    React.FC<ArtCtx>,       // the drawing — SVG only, NO TEXT
  Html?: React.FC<ArtCtx> }     // every piece of text, HTML positioned in the same coordinates
```

`ArtCtx = {f, at}`: `f` is the scene frame (draw-on starts at 0), `at(anchor)` is the frame
that anchor's callout is spoken, or `null` when the spec doesn't call it out.
- **Base** elements (always part of the picture) appear at `at(x) ?? 0` — use `base(c, 'x')`.
- **Event** elements (a brush pass, bubbles, a flow) happen only when called out:
  `c.at('brush') != null ? … : null`.

## Rules that keep art reliable

- **Never SVG `<text>`.** Chrome may lay it out with fallback-font metrics and never re-lay
  it out, so long renders show shifted/clipped labels while stills look perfect. Put text in
  `Html` with the `T` helper. `npm run validate` / `npm test` reject SVG text.
- House idiom ("Clinical"): colourful flat forms, each outlined in a darker shade of its own
  hue that draws on before the fill arrives (`Form` in `packs/circulation.tsx`, or the kit's
  `Sh`/`Tube`/`draw`/`fillIn`), meaning-carrying colour (arterial red, venous blue, oxygen
  teal, glucose amber), and `Ping` to pulse the part being named. For a silhouette built
  from several shapes (a hand), draw every outline first and every fill over them.
- Text inside an art is numbers, units and formulas only (or comes from `data`), so the art
  works in every language; the callout column carries the words.
- A hand-drawn part's fill follows its outline: pair `draw(f, i, dur)` with
  `fillIn(f, i, dur)`. A fill that fades in first reads as a floating colour blob.
- Deterministic only: no `Math.random`, no timers; animate from `f` (use `tw`, `mix`, `hash`).
- Anchors belong on the part itself; order the callouts top-to-bottom where you can so
  leaders don't cross (the leader runs from the right-hand column to the anchor).

## Packs

| pack | arts | file |
|---|---|---|
| endoscopy | scope channels biofilm leaktest elevator drying aer | `packs/endoscopy.tsx` |
| heart | heart | `packs/heart.tsx` |
| circulation | artery (pressure wave + gauge) · bpmonitor (cuff + counting monitor) · bpscale | `packs/circulation.tsx` |
| metabolic | insulin (pancreas → glucose → insulin key → receptor → uptake; type1/type2 events) | `packs/metabolic.tsx` |
| respiratory | lungs (inhale/exhale with the diaphragm) · alveolus (O₂ in, CO₂ out) | `packs/respiratory.tsx` |
| infection | moments (WHO five moments around the patient zone) · hand (germs cleared step by step) | `packs/infection.tsx` |
| body | person (breathes, blinks; wave, worry, smile) · body (map: brain, heart, kidneys, arterial tree; organs hurt, strain, flow) · vessel (artery cross-section: push, stretch, stiff, tear) · gauge (dial: rise, ok) · icon (salt, vegetables, fruit, walk, cigarette, alcohol, calendar, scale, pill, water, sleep, stethoscope — each acts) | `packs/body.tsx` |

Arts are also **stage layers** (docs/AUTHORING_GUIDE.md §4 stage): draw generic, reusable
parts (a person, an organ, an instrument, an everyday object) whose events show what they
*do*, so any lesson can place them in a world, move the camera to them and fire their events.
A stage lesson needs the parts to read at any zoom (1–4×): no hairline details, no text.

Every anchor is exercised by `projects/fixtures/specs/F03` (endoscopy) and `F06`–`F08`
(medical packs).

## Automated: new parts for a new subject (house workflow, 2026-09-26)

A series never waits on a human to say what to draw. The `lesson-series` skill runs:
`series-planner` → `projects/<p>/visuals.json` (parts reused + specs of new ones) →
`node scripts/art.mts gaps <p>` → one `art-author` per new pack (draft files
`src/art/packs/<pack>.tsx` + `<pack>.catalog.draft.ts`) → `node scripts/art.mts check --pack
<pack>` (gates: registered, anchors consistent and on the drawing, no text, draws on, spans its
box, not cut off, colourful, deterministic, every event visible; gallery
`iterations/artlab/<art>.png`) → `art-reviewer` (recognisable, correct against the ledger, house
idiom, events and anchors; writes `iterations/artlab/<pack>.review.json`) → fixes, ≤3 rounds →
`node scripts/art.mts approve <pack>` (the draft joins the library; registries regenerated). All
three agents run on Sonnet. Drafts are bundled in isolation, so packs are drawn in parallel.

## Steps (by hand)

1. Write `src/art/packs/<pack>.tsx` exporting `Record<string, ArtFactory>` (see `endoscopy.tsx`).
2. Register it in `src/art/index.ts` (`{...DIAGRAMS, ...ENDOSCOPY, ...YOURS}`).
3. Describe each art in `src/art/catalog.ts` (`layout`, `doc`, `fixed([...anchors])`) so specs
   are validated against it.
4. Add a fixture lesson that calls every anchor (copy `projects/fixtures/specs/F03.json`),
   then `npm test`. Look at `iterations/test/fixtures/<id>_sheet.png` before using it for real.
