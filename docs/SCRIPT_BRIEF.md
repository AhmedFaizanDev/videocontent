# Lesson script brief (bulk writer)

You write ONE lesson script for a narrated medical explainer video, as JSON matching the given
schema. The pipeline turns it into a finished video: layout, camera, timing, labels, voice,
logo intro and outro are automatic. Write the content and the narration only.

## Content rules (a violation fails the build)
1. **Source only.** Every fact, number, drug, dose, term and recommendation must come from the
   SOURCE EXCERPT. Explain it clearly and in depth, but add no outside facts. Numbers exactly as
   in the source (digits are checked against it).
2. **No abbreviations in narration.** Say "cardiopulmonary resuscitation", not "CPR"; on-screen
   text (labels, nodes, cells, notes) may use the abbreviation.
3. **Narration explains.** Each scene: the claim, the mechanism or reason (why), the consequence,
   what the clinician does. Precise terms, full calm sentences, British spelling, second person
   where natural. No filler, no hype, no "in this video we will".
4. **Length.** ~650 narration words in total (5:00 at the house pace), 7–9 scenes of 50–90 words.
   Go longer only if the excerpt genuinely needs it (max ~900 words).
5. **Something new on screen at most every 15 spoken words** (~6 s; checked, fails the build):
   every sentence must bring the next point / node / row / cell / note, or re-mention an item
   already on screen (it pulses). A context sentence with no item needs a `note` (one line, its
   key fact). Never end a scene with 15+ words that show nothing new. Scenes start on an item:
   the first item's word within the first ~10 words.
6. **Sync.** Each point label, flowchart node and table row must have a distinctive word that the
   narration speaks, in the same order the items appear (the pipeline finds it automatically).
   If that word is generic or also spoken earlier, give `say: ["exact word"]` — a word that
   literally occurs in that scene's narration at the right moment.
7. **Screen words.** Labels ≤ 28 chars, notes ≤ 90 chars, flowchart nodes ≤ 40 chars, table
   cells ≤ 60 chars; never more than ~20 words visible at once.

## Scene recipes (use only these)
- `opener` — first scene, **20–35 words**: `{type, kicker, narration, title, art?, act?}`.
  Title = the lesson title. With an art, `act` is an event name of that art (e.g. "conduction").
- `explain` — an illustration explained part by part:
  `{type, kicker, narration, art, data?, points: [{on?, label?, act?, note?, say?, zoom?}]}`.
  `on` = an anchor of the art, `label` names it on the picture, `act` fires an art event,
  `note` = a one-line definition/number at the top. The camera visits labelled points.
  `on` + `label` must be the anatomical/structural part that anchor IS (e.g. on "aorta", label
  "Aorta"); never pin unrelated facts on a picture — facts, lists, numbers → `table` or `note`.
- `flow` — a process, algorithm, pathway or decision:
  `{type, kicker, narration, mermaid, steps?, tour?, notes?}`. Mermaid: `flowchart LR` (or TD)
  with `A([start])`, `B{decision?}`, `C[action]`, edges `-->` / `-->|Yes|`, tones `:::red`
  `:::blue` `:::teal` `:::green`. Max 8 nodes. Nodes reveal in declaration order — narrate them
  in that order. 5+ nodes in LR tour automatically.
- `table` — a comparison, classification, values, doses:
  `{type, kicker, narration, columns, rows, say?, bars?, highlight?, notes?}`. 2–4 columns,
  2–6 rows; first column names the row. `bars: [colIndex]` for numeric columns. Cells appear as
  their words are spoken; numbers count up.
- `summary` — the last scene: `{type, kicker, narration, art?, act?, notes: [{say, note}]}`,
  2–3 take-aways as notes.

## Visual choice (house priority)
flowchart for sequences/algorithms/decisions → table for comparisons/values → `explain` over an
authentic illustration for structure/mechanism. Use only arts listed under AVAILABLE ARTS.

## Output
JSON only, matching the schema: `{id, title, outputFilename, module, scenes: [...]}`. Kickers are
1–3 words. Do not write the logo intro or the outro — they are added.
