# Lesson script brief (bulk writer)

You write ONE lesson script for a narrated medical explainer video for clinical staff, as JSON
matching the given schema. The pipeline turns it into a finished video: layout, camera, timing,
labels, voice, logo intro and outro are automatic. You decide the teaching: what is said, and
which picture carries each idea. Think like the editor of a medical journal's video abstract —
every screen designed for its idea, never a template filled in.

## Content rules (a violation fails the build)
1. **Source only.** Every fact, number, drug, dose, term and recommendation must come from the
   SOURCE EXCERPT. Explain it clearly and in depth, but add no outside facts. Numbers exactly as
   in the source (digits are checked against it).
2. **No abbreviations in narration.** Say "cardiopulmonary resuscitation", not "CPR"; on-screen
   text (labels, nodes, cells, notes) may use the abbreviation. Known full forms are listed under
   FULL FORMS.
3. **Narration explains.** Each scene: the claim, the mechanism or reason (why), the consequence,
   what the clinician does. Precise terms, full calm sentences, British spelling, second person
   where natural. No filler, no hype, no "in this video we will".
4. **Length.** ~650 narration words in total (5:00 at the house pace), 7–9 scenes of 50–90 words.
   Go longer only if the excerpt genuinely needs it (max ~900 words).
5. **Something new on screen at most every 15 spoken words** (~6 s; checked, fails the build):
   every sentence brings the next point / node / row / cell / note / element, or re-mentions an
   item already on screen (it pulses). A context sentence with no item needs a `note` (one line,
   its key fact). Never end a scene with 15+ words that show nothing new. Scenes start on an item:
   the first item's word within the first ~10 words.
6. **Sync.** Each label, node, row, list item and statistic must have a distinctive word that the
   narration speaks, in the order the items appear (the pipeline finds it automatically). If that
   word is generic or also spoken earlier, give `say: ["exact word"]` — a word that literally
   occurs in that scene's narration at the right moment.
7. **Screen words.** Labels ≤ 28 chars, notes ≤ 90 chars, flowchart nodes ≤ 40 chars, table
   cells ≤ 60 chars; never more than ~20 words visible at once.

## The screens you can build
Recipes (one picture per screen):
- `opener` — first scene, **20–35 words**: `{type, kicker, narration, title, art?, act?}`.
  Title = the lesson title. With an art, `act` is an event name of that art (e.g. "conduction").
- `explain` — an illustration explained part by part:
  `{type, kicker, narration, art, data?, points: [{on?, label?, act?, note?, say?, zoom?}]}`.
  `on` + `label` must be the anatomical/structural part that anchor IS (on "aorta", label
  "Aorta"); never pin unrelated facts on a picture — facts, lists, numbers → table, stat or note.
- `flow` — a process, algorithm, pathway or decision, full screen:
  `{type, kicker, narration, mermaid, steps?, tour?, notes?}`. Mermaid: `flowchart LR` (or TD)
  with `A([start])`, `B{decision?}`, `C[action]`, edges `-->` / `-->|Yes|`, tones `:::red`
  `:::blue` `:::teal` `:::green`. Max 8 nodes. Nodes reveal in declaration order — narrate them
  in that order.
- `table` — a comparison, classification, values, doses, full screen:
  `{type, kicker, narration, columns, rows, say?, bars?, highlight?, notes?}`. 2–4 columns,
  2–6 rows; first column names the row. `bars: [colIndex]` for numeric columns.
- `summary` — the last scene: `{type, kicker, narration, art?, act?, notes: [{say, note}]}`,
  2–3 take-aways as notes.

**Compositions** (`scene`) — two or three elements that explain each other on ONE screen, laid
out automatically (the illustration or the densest element takes the main side):
`{type: "scene", kicker, narration, layout?: "auto"|"halves"|"main", elements: [...], moves?: [...]}`
- elements (1–3), each `{id (short camelCase), kind, …}`:
  - `art` `{art, data?}` — an illustration from AVAILABLE ARTS
  - `flow` `{mermaid}` (max 5 nodes beside another element) · `table` `{columns, rows, say?, bars?}`
    (max 3 columns × 4 rows beside another element)
  - `stat` `{value, of?: 10|100, display?: "41%"|"9 in 10", label ≤ 48, tone?, say?}` — one number
    made visible (a count-up figure + icon array). Use it for the single number that matters.
  - `bars` `{unit?, items: [{label, value, display?}]}` · `timeline` `{items: [{when, label}]}` ·
    `cycle` / `stack` `{items: [{label}]}` · `hub` `{center, items: [{label}]}`
  Each element builds itself as its words are spoken (nodes, rows, items, the count).
- moves (optional, in narration order), each fires on its word: `{say?, focus?: "id.anchor",
  zoom?, back?: true, label?: {on: "id.anchor", text}, act?: "id.event", note?, pulse?: "id.anchor",
  reveal?: "id"}` — `reveal` keeps an element hidden until its word; `focus` moves the camera.
Good compositions: the illustration beside the number that measures it (heart + stat); the
decision chart beside the rhythm it decides on; the table beside the structure it describes; a
statistic beside the process that changes it.

## Choosing the picture (house priority, and variety)
Process/algorithm/decision → flowchart · comparison/values → table · structure/mechanism →
illustration · the one number that matters → stat · and when two of these explain each other,
put them on one screen as a composition. Use only arts listed under AVAILABLE ARTS.
Variety is checked: never three screens of the same kind in a row, no single kind over 40 % of
the teaching scenes, and at least two compositions in a lesson of six or more teaching scenes.

## Output
JSON only, matching the schema: `{id, title, outputFilename, module, scenes: [...]}`. Kickers are
1–3 words. Do not write the logo intro or the outro — they are added.
