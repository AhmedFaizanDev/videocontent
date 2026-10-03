# Authoring guide — the lesson spec contract

A lesson is one JSON file, `projects/<slug>/specs/<id>.json`. You write **content and exact
narration only**; timing, layout, motion, sound and captions are automatic, and every
on-screen reveal fires when the narrator says its word. `npm run validate -- <slug>` checks
everything below that can be checked from text. Types live in `src/spec.ts`.

Real examples: `projects/ms-cssd-15/specs/` (clinical, 3–4 min, figures + knowledge checks),
`projects/human-heart/specs/` (nursing/medical, 10 min, graphs + pack art),
`projects/fixtures/specs/` (every scene type at its limits).

---

## 1. File shape

```json
{
  "id": "V801",
  "title": "Why Flexible Endoscopes Are Different",
  "outputFilename": "M10_V1_Why_Flexible_Endoscopes_Are_Different.mp4",
  "episode": "10.1",
  "module": "Module 10 · Flexible Endoscope Reprocessing",
  "topicGroup": "Flexible Endoscope Reprocessing",
  "scenes": [ … ]
}
```

- `id` = the filename. `outputFilename`: letters, digits, `_ . -`, ending `.mp4`, unique in the project.
- `episode` (optional): the on-screen mark after the project's `episodeLabel` (default: the id's digits).
- `module` prints above the poster title; `topicGroup` on the poster's footer tag.

## 1b. House standard v2 — scientific, planned, structure-first (2026-10-03)

History: the client rejected text cards + voiceover (2026-09-26 → picture-first `stage`
scenes); the owner then asked for videos that look **professional and scientific, not
cartoonish**, explained for a professional science audience, with flowcharts and tables
first (2026-10-03). Every lesson now follows these rules:

**1. Plan before you write** — `projects/<p>/plans/<id>.md` (template:
`docs/PLAN_TEMPLATE.md`). Audience and level, 3–5 measurable objectives, the source facts
(each with its source), the scene-by-scene outline with each scene's *purpose*, *visual
choice* (and why) and *reuse* of library art, the term/pronunciation list, the target length.
`npm run validate` errors on a spec without its plan when `rules.requirePlan` is on (default
for new projects).

**2. Visual priority** — choose the representation that carries the idea most exactly:
| the idea is… | use | how |
|---|---|---|
| a sequence, algorithm, decision, pathway, classification tree | **flowchart** | `graph` art with `data.mermaid` (Mermaid flowchart syntax), built step by step |
| a comparison, a set of values/parameters/doses, a classification | **table** | `table` art (booktabs rules), rows build in and highlight as named |
| a structure and where things are | **authentic diagram** | anatomical/scientific art from the library (`node scripts/brief.mts <p>`) |
| a mechanism unfolding in time | **animation** | a `stage` with acting arts, `travel`, `inset` |
Tables and flowcharts are placed on a `stage` like any art (camera, beats, labels, notes all
work), so they are never static slides: they build as the narration names each part.
Prefer them over designed diagrams wherever they carry the idea as well.

**3. Look** — journal figure: neutral off-white page, slate ink, muted scientific hues
(theme.ts), thin precise outlines, exact labels with leader lines. Motion lands precisely
(no bounce or overshoot), elements align to the layout, nothing overlaps (the layout audit
fails overlaps). Anatomy is drawn authentically — a heart looks like a heart, not a symbol.
People appear only when the action needs a person (a rescuer's hand position), as
schematic figures — never cartoon characters with expressions for their own sake.

**4. Labels** — name every structure the narration refers to, with the correct term,
spelled as in the source; a label states a fact (no decoration). Abbreviations on screen,
full forms in the narration (§3).

**5. Explanations** — written for clinicians and science students: precise terminology,
mechanism (why, not just what), numbers with units, each claim traceable to `source/`. No
filler, no hype, no rhetorical questions.

**6. Type** — headings are Sora Heavy; every other text (labels, notes, tables, captions,
values) is Noto Sans. Automatic (theme.ts / fonts.ts) — never set families by hand.

**7. Pronunciation** — the voice says what `src/lexicon.ts` (house) + project.json
`lexicon` tell it (e.g. MedSkills → "Medd Skills"). Preflight errors on run-together names
not in a lexicon and lists technical words to audition once (`node scripts/say.mts <p>
"<word>"`); add each to the lexicon as itself if right, as a respelling if not.

**8. Length** — 5 to 7 minutes (`length.minutes [5, 7]`). Take the extra two minutes only
when the depth of explanation needs them; never pad. (`length.exact` still exists for
fixed-length deliverables: it solves the holds to hit N seconds.)

**10. v3 (2026-10-03):** shorthand `flow` / `table` scenes (brief §v3; src/compile.ts) are the
default for flowcharts and tables; imported vector illustrations (`assets/vector/<dir>/` +
manifest → `node scripts/ingest-art.mts`, renderer src/art/vector.tsx) for anatomy; natural pace
~147 wpm with 5:00 as the standard (validate warns past 5:45 unless the plan's "## Length" says
why); narration explains mechanisms; textbook depth logged with citations.

**9. Reuse** — before drawing anything, check the catalogue (`brief.mts`) and earlier
projects' layers; a missing part becomes a generic library part (docs/ART.md), never a
one-off.

Legacy text scenes (hook, definition, steps, compare, mistake) still render, but count as
unillustrated.

## 2. The lesson arc

Every lesson follows a teaching arc. The project's `rules` (project.json) enforce the
frame; the rest is craft.

1. **intro** (required first). Narration **opens by naming the topic** ("In this video,
   we're going to talk about…"). Its second half **enumerates the `learn` bullets in order**,
   reusing a distinctive word from each. The ticks only listen after the first 40% of the
   narration, so the enumeration belongs in the second half (validator checks each is heard).
2. **hook**: a question, tension or stake that makes the topic matter.
3. **Teach**: `definition`, `steps`, `figure`, `compare`, `pseudocode`/`code`,
   `example` — one idea per scene. Include a **real-world** beat and, where the subject has
   one, a **concrete worked example** with correct numbers.
4. **mistake**: the most common real error, wrong vs right.
5. **check → answer** (optional pairs): a knowledge-check question, a timed pause, then
   the model answer. Great for certified courses; mirror the course's assessment questions.
6. **recap** (required last): 2–3 bullets + one memorable takeaway.

Runtime is set per project (`length.minutes`). Validate estimates it from word count; the
voiceover measures it. Roughly: **words ≈ minutes × voice.wpm × 0.85** (the rest is
breathing room between scenes).

## 3. Narration rules

- Write **exactly what is spoken**: full, warm, second-person sentences, never bullet
  fragments. Say numbers and symbols as a person would ("one-twenty", "the letter A").
- **Stay inside the source.** For client/compliance material, never invent figures,
  concentrations, times, brands or claims that aren't in the source; say "follow the
  manufacturer's instructions" instead. Accuracy beats colour.
- **Narration drives sync.** Each reveal listens for words from its label (≥4 letters,
  in order). If the narrator says something different from the label ("Remove…" for a card
  titled "Removable parts"), add `"say": ["remove"]` to that item. Items that accept `say`:
  steps, figure callouts / diagram items, compare items, recap bullets, example trace
  rows, definition chips. Validate lists every reveal whose word is never spoken.
- Mention items **in the order they appear** on screen.
- **Breathing room is automatic** (project `pacing`: a pause after every sentence, longer holds
  around scenes). Put `[pause]` in narration for a deliberate beat after a key idea
  (≈0.9 s of silence; never shown in captions): *"It pauses at the AV node. [pause] Why?"*
- **Write for the ear.** The voice is given a speakable form automatically ("60–100" → "60 to
  100", "e.g." → "for example", "70%" → "70 percent"), but write units and ratios in words
  ("millilitres", "120 over 80"); preflight flags what the voice would misread. Hard words
  go in project.json `lexicon` (`{"Purkinje": "Pur-kin-jee"}`) — captions keep the spelling.
- **Never make the voice read an abbreviation.** Neural voices spell acronyms letter by
  letter ("B-P", "W-H-O"). Narration always speaks the full form ("blood pressure",
  "World Health Organization", "millimetres of mercury"); the abbreviation may stay on
  screen, where it is emphasised automatically as a chip. Preflight rejects any abbreviation
  in narration (BP, HbA1c, CO2, mmHg…) unless project.json `lexicon` spells it out.
- **Key terms are emphasised on screen automatically.** List them in project.json `terms`
  (e.g. `["systolic", "diastolic", "hypertension"]`, or the Hindi/Kannada/Marathi terms):
  every occurrence in titles, labels, notes and bullets is set in the brand colour at full
  weight. Use full forms on screen where they help: "High blood pressure (hypertension)".
- **Every factual number must be in `source/`.** Preflight checks each number in narration
  and on screen against the source material (the fact ledger). For general-knowledge
  lessons, write `source/reference-notes.md`: the facts you'll state, each with a citation.
  Worked examples, code and pseudocode are exempt (illustrative).

### Languages (project.json `lang`: `en` · `hi` · `mr` · `kn`)

One language per project; narration and all on-screen text are in that language (fully
native script), captions follow the narration, and the template's own words ("In this
lesson", "Knowledge check"…) come from `src/lang.ts`. The voice defaults to the house
Indian female voice of that language (Neerja / Swara / Aarohi / Sapna). For Hindi, Marathi
and Kannada narration:
- write whole numbers as digits (the voice reads them natively), but write decimals,
  percentages and ranges in words — no `% – / + =` symbols (preflight rejects them);
- `say` words are native-script words (≥4 characters) that are literally spoken; a stem
  matches its inflected forms (`कोशिका` matches `कोशिकाओं`), so pick the stem;
- the fact ledger can stay in English — grounding checks the digits.

## 4. Scene catalog

Every scene has `type`, `kicker` (1–3 word chapter label, shown top-left) and `narration`.

### intro
```json
{"type":"intro","kicker":"Introduction","narration":"In this video, we're going to talk about …",
 "topic":"Bedside Pre-clean and the Leak Test","subtitle":"MS-CSSD-15 · Module 10",
 "learn":["what a proper bedside clean involves","how a leak test protects the scope","why neither can ever be skipped"]}
```
2–4 `learn` bullets. `topic` "A: B" prints B in the accent italic.

### hook
```json
{"type":"hook","kicker":"The hook","narration":"…","headline":"The busiest person. The busiest moment.",
 "question":"That's when reprocessing begins.","highlight":["busiest"],"chips":[{"icon":"","label":"optional"}]}
```

### definition
```json
{"type":"definition","kicker":"Definition","narration":"…","term":"biofilm",
 "plain":"Organisms embedded in a protective matrix, stuck to a surface.","highlight":{"matrix":"#2FA69A"},
 "chips":[{"icon":"","label":"≤5 short chips","say":["optional"]}]}
```

### steps
```json
{"type":"steps","kicker":"How it works","narration":"…","title":"Manual cleaning",
 "startAt":0,"steps":[{"label":"Immerse","detail":"Correct detergent, dilution, temperature.","say":["immerse"]}]}
```
2–6 cards. Longer lists: split into two `steps` scenes and number the second with `startAt`.

### stage — the picture-first teaching scene
```json
{"type":"stage","kicker":"What it is","narration":"…","title":"optional ≤60",
 "world":{"w":2600,"h":1200,"layers":[
   {"id":"heart","art":"heart","at":[560,620],"h":760},
   {"id":"artery","art":"vessel","at":[1840,600],"h":980}]},
 "beats":[
   {"say":["force"],"note":"Blood pressure: the force of blood on artery walls"},
   {"say":["inside"],"camera":{"on":"artery"},"label":{"on":"artery.wall","text":"Artery wall"}},
   {"say":["heartbeat"],"camera":"overview","travel":{"along":["heart.lv","artery.lumen"],"tone":"red","stream":true},"act":"artery.push"},
   {"say":["stretches"],"act":"artery.stretch","label":{"on":"artery.stretch","text":"Stretches, springs back"}}]}
```
A world is a canvas in its own units; layers are catalogue arts placed by centre and height.
Targets are `layer` or `layer.anchor`. Each beat fires on its `say` word(s) and applies verbs:

| verb | effect |
|---|---|
| `camera` | `{on, zoom?}` pushes in to a part (a layer fills ~75 % of the view; anchors default 2×) · `"overview"` frames everything on stage |
| `show` / `hide` | a hidden layer draws on / a layer leaves (its labels, flows and crosses leave with it) |
| `act` | fires an art's event: `artery.systole`, `vessel.stiff`, `body.kidneys`, `icon.act`, `gauge.rise`, `bpmonitor.sys` |
| `label` | `{on, text ≤28}` pinned on the picture, placed clear of other labels; lasts until the next camera move |
| `note` | one line (≤90) at the top — a definition, a key figure, the rule to remember |
| `pulse` | rings on the part being named |
| `travel` | `{along, tone, stream?, loop?}` particles move through the parts (blood, a signal, a drug) |
| `inset` | `{of, art, act?, zoom?}` a magnifier loupe beside the part: the micro view (body → artery wall) |
| `cross` | strikes the wrong thing (a belief, a habit to avoid) |
| `dim` | racks everything but the named targets back (`false` clears) |

Examples: `projects/med-blood-pressure-en/specs/BP01.json` (a whole picture-first lesson),
`projects/fixtures/specs/F10.json` (every verb), `F11.json` (every body-pack part).

### figure — illustrations and diagrams
```json
{"type":"figure","kicker":"The sequence","narration":"…","title":"optional",
 "art":"cycle","data":{"start":"PATIENT","items":[{"label":"Pre-clean","note":"shown on the tape","say":["bedside"]}]},
 "caption":"optional note tape (side figures)"}
```
Pick the art that matches the *shape of the idea* — all generic diagrams work for any subject:

| art | use it for | data |
|---|---|---|
| `cycle` | a repeating process, a loop back to the start | `items` 3–8 (label ≤26), optional `start` tag |
| `flow` | a one-way pipeline / procedure | `items` 2–6 (label ≤28) |
| `timeline` | events in time order | `items` 3–7 with `when` (≤12) + label ≤30 |
| `hub` | one idea and its parts / causes / uses | `center` ≤22, `items` 3–6 (label ≤22) |
| `stack` | layers, levels, strata, a hierarchy | `items` 2–6 (label ≤30) |
| `graph` | **any system, process, loop, hierarchy or causal chain**, built up and animated | `nodes`, `edges`, `groups?`, `steps` (see below) |
| `bars` | quantities compared (grow as spoken, count-up values) | `items` 2–8 `{label, value, display?, tone?}`, `unit?`, `ref?` |
| `trace` | a waveform drawn by a moving pen (ECG, action potential, pressure/sound) | `segments` `{shape: flat/bump/spike/dip/plateau/rise/fall, w?, h?, label?}`, `repeat?`, `grid?` |
| `image` | a real photo or scan with labelled points | `src` (under public/), `credit`, `points {name:[x,y]}` 0–1; `callouts` required |
| pack arts | hand-drawn domain illustrations: endoscopy (`scope`, `biofilm`, `aer`…), `heart` (beating; valves; blood flow; conduction) | `callouts` with the art's anchors |

**`graph` — the diagram engine.** Declare the idea; layout and animation are automatic:
```json
{"type":"figure","kicker":"Double circulation","art":"graph","narration":"…",
 "data":{"direction":"LR",
  "nodes":[{"id":"body","label":"Body tissues","shape":"pill","tone":"blue"},{"id":"rh","label":"Right heart","group":"heart"},
           {"id":"lungs","label":"Lungs","shape":"pill","tone":"green"},{"id":"lh","label":"Left heart","group":"heart","tone":"red"}],
  "groups":[{"id":"heart","label":"Heart"}],
  "edges":[{"from":"body","to":"rh","tone":"blue"},{"from":"rh","to":"lungs","tone":"blue","label":"deoxygenated"},
           {"from":"lungs","to":"lh","tone":"red","label":"oxygenated"},{"from":"lh","to":"body","tone":"red"}],
  "steps":[{"say":["body"],"show":["body","rh"],"flow":["body>rh"],"focus":"rh","note":"Blood returns to the right heart"},
           {"say":["lungs"],"show":["lungs"],"flow":["rh>lungs"],"focus":"lungs"},
           {"say":["left"],"show":["lh"],"flow":["lungs>lh"],"focus":"lh"},
           {"say":["around"],"flow":["lh>body"],"token":["body","rh","lungs","lh","body"],"loop":true,"note":"Two circuits, one heart"}]}}
```
Each step fires on its words: `show` builds nodes/edges in (never-listed ones are there from
the start), `flow` sets particles running along edges, `token` sends a marker along a path
(`loop` repeats), `focus` spotlights a node while the rest racks back, `cut` blocks an edge
(its flow stops, a red cross lands, what it fed greys out — failures, inhibition,
occlusion), `note` runs on the tape. Cycles route as return arcs; `direction: "TB"` draws hierarchies top-down.

Prefer a figure wherever an idea has shape — projects can require it (`rules.minFigures`).
Diagram items become callouts automatically (anchors `i1…iN`, label, `note` → tape text,
`say`). Give `callouts` yourself only to override. Side figures (image, pack arts) take ≤6
callouts in the margin column; wide diagrams ≤8 and carry their own labels. The full list
with anchors is `src/art/catalog.ts`; adding an illustration pack is in `docs/ART.md`.
Images must be yours or openly licensed. Put the source + licence in `credit`.

### compare
```json
{"type":"compare","kicker":"Which one?","narration":"…","question":"Where the pressure lands",
 "left":{"keyword":"COURAGE","title":"individual","color":"variable","items":[{"icon":"","label":"A technician decides alone","say":["technician"]}]},
 "right":{"keyword":"SYSTEM","title":"organisational","color":"constant","items":[{"icon":"","label":"Written policy"}]},
 "tip":"optional tape"}
```

### mistake
```json
{"type":"mistake","kicker":"Common mistake","narration":"…","title":"Skipping the leak test",
 "wrong":{"label":"List running late","lines":["Leak test: skipped","Fluid inside the scope"]},
 "right":{"label":"Every time","lines":["Leak test: FAIL","Sent for repair"]},"note":"optional tape"}
```
≤4 short lines per side (monospace; `//` lines render dim).

### pseudocode / code
```json
{"type":"pseudocode","kicker":"The logic","narration":"…","title":"Sum a basket",
 "lines":["SET total <- 0","FOR EACH price IN basket","    total <- total + price","END FOR"],
 "caption":"sticky note","callouts":[{"line":3,"text":"runs once per item"}]}
```
≤9 lines; leading spaces indent. Lines reveal as their identifiers are spoken. `code` takes
real-language `lines: [{segments:[{t, c?}]}]` with optional annotations/highlights/error.

### example — the worked example
```json
{"type":"example","kicker":"Worked example","narration":"…","title":"One procedure, one record",
 "boxes":[{"label":"Cycle","value":"?","color":"constant"}],
 "trace":[{"note":"Reprocessing cycle 1142 passed","set":{"Cycle":"1142 OK"},"highlight":"Cycle"},
          {"note":"Chain complete: traceable","set":{},"result":true}]}
```
≤6 boxes, ≤8 rows; all values are strings; every `set` key is a box label. Give intermediate
steps their own rows (0 → 10 → 15). **The trace must be correct.** Keep values short
(≤9 chars) so tiles sit two per row.

### check → answer
```json
{"type":"check","kicker":"Knowledge check","narration":"Time for a knowledge check. <question> Pause here and think it through.",
 "question":"Why is the leak test performed before immersion, every time?"},
{"type":"answer","kicker":"Answer","narration":"…","question":"(same question)",
 "answer":"A breached scope admits fluid inside, where it can't be cleaned.","points":["Organisms multiply inside","Takes about a minute"]}
```
The check holds a timed ~6 s thinking pause. ≤4 points.

### recap
```json
{"type":"recap","kicker":"Recap","narration":"Let's recap. …",
 "bullets":[{"icon":"","label":"Pre-clean — immediately, at the bedside","color":"variable"}],
 "takeaway":"One minute of testing protects every patient after.","signoff":"optional; default from project.json"}
```
2–3 bullets; " — " splits a coloured head from a plain tail. Reuse a distinctive word from
the scene each bullet recalls: the recap circles that scene on the contact sheet.

## 5. Limits that keep layouts clean

The validator enforces the hard limits; these keep things *comfortable*:
- Titles ≤ ~60 chars; hook headline ≤ ~70; definition `plain` ≤ ~140.
- Step/figure labels short and concrete; put the explanation in `detail` / `note` / narration.
- One scene ≈ 25–60 s of narration. Split longer ideas.
