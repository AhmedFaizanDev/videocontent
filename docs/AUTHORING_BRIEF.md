# Authoring brief (compact)

The whole contract for writing one lesson spec, sized to read once. `node scripts/brief.mts
<project>` prints this plus the project's settings, word budget, illustration catalogue, fact
ledger and a gold example — everything an author needs in one call. The long-form guide
(`docs/AUTHORING_GUIDE.md`) only adds background.

## The file
`projects/<p>/specs/<id>.json`: `{"id","title","outputFilename" (…​.mp4, letters/digits/_.-),
"episode"?, "module", "topicGroup", "scenes":[…]}`. Every scene: `type`, `kicker` (1–3 words)
and `narration` (exactly what is spoken).

## Picture-first (the house standard — client feedback: "not text with a voiceover")
Every idea is SHOWN happening: a process plays out, a cause visibly leads to its effect, a part
is zoomed into, a state transforms. Teach with **`stage`** scenes: one illustrated world per
scene, the camera travels to what is being explained, parts act and get short labels ON the
picture, and the narration explains what the viewer is watching ("watch the wall stretch").
On-screen text is names and numbers only. Storyboard first: for each scene write one line —
*what does the viewer see happen?* — then pick the arts (catalogue below), then write the
narration to the picture, then the beats. Gates: ≥ `minIllustrated` of the narration spoken over
a picture, ≤ `maxScreenWords` words on screen at once, every beat changes the picture.

## House standard v2 — scientific, planned, structure-first (owner, 2026-10-03)
- **Plan first:** implement `projects/<p>/plans/<id>.md` scene by scene (validate requires it).
- **Visual priority:** flowchart → table → authentic diagram → animation. Flowcharts are
  `graph` layers written in Mermaid (`"data": {"mermaid": "flowchart TD\n A([Start]) --> B{Q?}\n B -->|Yes| C[Do]", "steps": [{"show": ["A"]}, …]}`,
  steps fired by `act: "chart.s1"`…); tables are `table` layers (`columns`, `rows`; rows fired
  by `act: "tbl.r1"`…, `c2` highlights a column, `r2c3` rings a cell). Both sit on stages, so
  camera, labels and notes work on them, and they build as the narration names each part.
- **Look:** journal figure, authentic anatomy, precise motion, no cartoon characters (people only
  when an action needs one). **Label** every structure the narration names, correctly.
- **Register:** a professional science audience — precise terms, the mechanism (why), numbers
  with units, calm full sentences. No filler.
- **Pronunciation:** audition the technical words preflight lists (`node scripts/say.mts <p>
  "<word>"`); fix with project.json `lexicon`.

## v3 shorthand + assets (2026-10-03) — fewest tokens, best visuals
- **Flowchart scene** (no stage bookkeeping): `{"type":"flow","kicker","narration","mermaid":"flowchart LR\n A([..]) --> B{..}\n B --> C[..]:::red","tour":true}`
  — one node per step in chart order; each node reveals on the first narration word from its
  label (write the narration in node order); `tour` flies the camera node to node, then back out.
  Optional `steps` (show/focus/say), `notes` [{say, note}].
- **Table scene**: `{"type":"table","kicker","narration","columns":[..],"rows":[[..]],"say":[["word"]…],"bars":[1],"highlight":[{"say":[..],"col":2}],"notes":[..]}`
  — rows build as named (give `say` per row when the first cell's word is ambiguous), numbers
  count up, `bars` columns get inline bars. Both compile to fit-to-frame stages (src/compile.ts).
- **Illustrations**: prefer imported professional assets (e.g. `heartExterior`, NIH BioArt) —
  events vf/stop/compress/rosc, data {state}. New ones: scripts/ingest-art.mts.
- **Narration**: every scene explains claim → mechanism → consequence → action, in full sentences,
  at ~147 wpm; 5:00 ≈ 655 words. Textbook science beyond the source is allowed when logged with a
  citation in `source/*reference-notes.md` (tag [T…]).

## The arc (quality bar)
intro (names the topic first; second half enumerates the `learn` bullets in order, reusing a
distinctive word of each) → hook **stage** (a person, a stake, something hidden made visible) →
teach, one idea per **stage**: what it is (zoom into it), how it works (the mechanism moving),
how it's measured/used, what goes wrong (damage shown in place) → prevention/practice (objects
as stations the camera visits) → mistake **stage** (belief vs the evidence; `cross` the wrong
thing) → check → answer (both with a `visual`) → recap (2–3 bullets "heading — detail" + one
takeaway). Warm, second-person, spoken sentences; `[pause]` after a key idea. Accuracy beats
colour.

## Length
House standard v2: 5–7 minutes (`length.minutes`), longer only when the explanation needs it.
When a project sets `length.exact` (fixed-length deliverables), every video is exactly that long:
the holds between sentences and scenes are solved around the real narration. Hit the word
range validate prints (`fits at A–B words`); aim for the house-pace figure. Prefer fewer,
richer scenes (≈ 12) over many thin ones.

## Hard rules (preflight enforces)
- **Facts:** only what the fact ledger states; every digit in narration or on screen must be in
  it. No invented numbers, brands or claims.
- **Sync:** every reveal fires on a spoken word. Give each callout / step / chip / compare item /
  answer point / recap bullet a `say` list: a word (≥4 letters) literally in that scene's
  narration, in on-screen order; a stem matches inflections. Side figures ≤6 callouts.
- **Abbreviations:** never in narration (the voice spells them). Speak the full form; the
  abbreviation may be on screen, where it is emphasised automatically.
- **Numbers & symbols:** English: write units/ratios in words ("millimetres of mercury",
  "120 over 80"). Hindi/Marathi/Kannada: whole numbers as digits; decimals, percentages,
  ranges in words; no `% – / + =` in narration.
- **Language:** one per project; narration and all on-screen text in it (native script for
  hi/mr/kn); spelling per `style.spelling`.
- **Layout:** preflight's dry-run render + text audit reject overflow and colliding text —
  no need to look at images unless something fails.

## Stage (the teaching scene)
```json
{"type":"stage","kicker":"What it is","narration":"…","[title]":"≤60",
 "world":{"w":2600,"h":1200,"layers":[
   {"id":"heart","art":"heart","at":[560,620],"h":760},
   {"id":"artery","art":"vessel","at":[1840,600],"h":980},
   {"id":"days","art":"icon","data":{"name":"calendar"},"at":[…],"h":560,"hidden":true}]},
 "[open]":"heart",
 "beats":[{"say":["inside"],"camera":{"on":"artery"},"label":{"on":"artery.wall","text":"Artery wall"}},
          {"say":["beats"],"travel":{"along":["heart.lv","artery.lumen"],"tone":"red","stream":true},"act":"artery.push"}]}
```
- **World**: a canvas in its own units (make it ~16:9-ish, a little larger than the layers);
  layers are catalogue arts placed by centre `at` and height `h`. `hidden` layers enter on `show`.
- **Targets**: `"layer"` or `"layer.anchor"` (anchors from the catalogue).
- **Beats** fire on their `say` words (in narration order; every beat must be heard) and apply
  verbs: `camera` `{on, zoom 1–4}` | `"overview"` (frames what's on stage) · `show`/`hide` ·
  `act` (fires an art's event: `artery.push`, `body.kidneys`, `icon.act`) · `label {on, text ≤28}`
  (pinned on the picture; cleared by the next camera move) · `note ≤90` (one line at the top,
  e.g. a definition or a key figure) · `pulse` · `travel {along[targets], tone, stream?, loop?}`
  (particles moving through the parts) · `inset {of, art, act[], zoom?}` (magnifier loupe: the
  micro view) · `cross` (strike the wrong thing) · `dim [targets]`/`false` (focus).
- Craft: 4–7 beats per stage; vary the camera (push in → act → pull back); one label per beat;
  a whole-layer `camera` pushes in ≥1.2×; an anchor push is `zoom` 1.6–2.4. Objects in a row
  become "stations" the camera visits one per sentence.

## Scene shapes (fields in brackets are optional)
- intro `{topic "A: B", subtitle, learn[2–4]}`
- hook `{headline, question, [highlight[words]], [chips[{label,say}]]}`
- definition `{term, plain, [highlight{word:"accent"|"variable"|"constant"}], [chips[≤5 {label,say}]]}`
- steps `{[title], steps[2–6 {label, [detail], say}], [startAt]}`
- figure `{art, [title], [data], [callouts[{anchor,label,[text],say}]], [caption]}` — diagrams
  take `data.items[{label,[note],say}]` (callouts derived); pack arts take `callouts` on their anchors
- compare `{[question], left{keyword,title,color,items[{label,say}]}, right{…}, [tip]}`
  (color: variable|constant|accent)
- mistake `{[title], wrong{label, lines[≤4 short]}, right{label, lines[≤4]}, [note]}`
- check `{question, [visual{art,[data],[act[]]}]}` → answer `{question (same), answer, points[≤4 {label,say}], [visual]}`
  — give both a `visual` (the picture the question is about; answer events fire with the points)
- recap `{bullets[2–3 {label "heading — detail", say, [color]}], takeaway, [signoff]}`
- graph data `{direction "LR"|"TB", nodes[2–12 {id,label≤28,[shape box|circle|pill],[tone]}],
  edges[{from,to,[label≤22],[tone]}], steps[1–10 {say, [show[ids|"a>b"]], [flow["a>b"]],
  [focus id], [token[ids]], [cut["a>b"]], [note≤80]}]}`; tones: ink blue red teal green sun orange pink

## Efficient workflow (keeps tokens low without lowering the bar)
1. `node scripts/brief.mts <p>` once. Don't read source code or other specs.
2. Write the whole spec in one `Write`, aiming at ~90% of the word budget (drafts run long;
   a trim pass costs a whole extra round). Preflight prints `⏱ est · words · band` every run.
3. `node scripts/preflight.mts <p> <id> --no-render` (seconds). Fix with small `Edit`s — never
   rewrite the file or use scripts to regenerate it. `--map` prints which word fires each
   reveal when a sync problem is unclear.
4. When the text stages are clean: `node scripts/preflight.mts <p> <id>` once (dry-run render +
   text audit). Fix any layout error it names.
5. Report in ≤6 lines: result line, runtime estimate, anything you could not state.
