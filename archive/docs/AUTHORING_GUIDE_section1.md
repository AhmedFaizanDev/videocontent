# Spec Authoring Guide — ZSkillup Pseudocode Explainers

You are authoring the **content spec** (JSON) for one or more 1080p animated explainer
videos. A renderer turns each spec into a premium animated video with AI voiceover, ducked
music, and burned-in captions. You write **content + exact narration only**; all timing and
animation are automatic. Study `content/specs/V001.json` — it is the gold-standard example.

## Audience & tone
- **Absolute beginners with zero coding background.** Define every term the first time it
  appears. No unexplained jargon.
- Warm, confident, friendly — a polished dev-education channel. Conversational, second person
  ("you"), concrete. Never robotic or list-like in the narration.
- This is the **Pseudocode** section: use **language-agnostic pseudocode**, never a real
  language's syntax. Keywords: `SET, IF/THEN/ELSE, FOR, WHILE, REPEAT/UNTIL, PRINT, READ,
  FUNCTION, RETURN, CALL, MOD, AND, OR, NOT, TRUE, FALSE`. Use `<-` or `=` for assignment.

## Every video's shape — target ~5 MINUTES (9–11 scenes)
These are longer, richer videos (~5 minutes; going a bit over is fine). Use this arc:

1. **intro** (REQUIRED, first) — a branded opener that **names the topic out loud**: the
   narration must literally start with something like *"In this video, we're going to talk
   about <topic>."* then a one-line promise of what they'll learn. On screen it shows the
   topic title + 2–4 "what you'll learn" bullets.
2. **hook** — a relatable question/problem where this concept is the answer.
3. **definition** — plain-English definition on screen.
4. **steps titled real-world** — a `steps` scene titled like "Where you'll see this" giving
   2–3 concrete **real-world uses / why it matters** (games, banking apps, spreadsheets,
   messaging, e-commerce, etc.). Ground the abstract concept in reality.
5. **steps** — the step-by-step walkthrough of HOW it works.
6. **pseudocode** — SHOW THE LOGIC IN CODE. A pseudocode card of the actual construct. Almost
   every video should have this (or a second one). This is the "showcase coding" requirement.
7. **example** — ONE concrete worked example, fully animated (the SIGNATURE visual: value
   boxes + stepping watch panel). Numbers must be correct.
8. *(optional)* a SECOND `example`, a `compare`, or another `pseudocode` when it deepens
   understanding (great for loops, recursion, bitwise, matrix, comparisons).
9. **mistake** — the most common beginner mistake, done wrong vs right.
10. **recap** — 2–3 bullet recap + one-line takeaway.

Always start with `intro`, always end with `recap`. **Include at least one `pseudocode`/`code`
scene and at least one `example` scene.** Include a real-world beat. Prefer clarity over
cramming — **one idea on screen at a time** — but be thorough enough to fill ~5 minutes.

## Narration rules (this is what the voice reads — write it exactly)
- **Total 820–980 words across all scenes** (~5 min at the narrator's pace). Roughly: intro
  50–65, hook 45–60, definition 70–90, real-world 75–100, walkthrough 100–130, pseudocode
  85–115, example 110–150, optional scene 80–120, mistake 80–105, recap 55–75. When in doubt,
  write MORE — these should feel like a full ~5-minute lesson, not a quick clip.
- The intro narration MUST explicitly name the topic ("In this video, we're going to
  talk about …" or a close variant) — this is a hard product requirement.
- Narration must **match the on-screen beats in order**. In an `example` scene, walk through
  the trace rows in the same sequence. In `steps`/`pseudocode`, mention each line/step.
- Say numbers/symbols the way a person speaks them ("two-thirds", "the letter A", "true").
- Keep it flowing and human — full sentences, not bullet fragments.

### intro scene shape
```json
{"type":"intro","kicker":"Introduction","narration":"In this video, we're going to talk about ...",
 "topic":"Variable Declaration & Initialization","subtitle":"Programming Fundamentals · Pseudocode",
 "learn":["what it means to declare a variable","how initialization gives it a first value","the mistake to avoid"]}
```
`topic` is a short display title (may shorten the CSV title). `subtitle` = "<module> · Pseudocode".

**Intro tick-sync rule (important):** the on-screen ticks are the `learn` bullets, and
they reveal as the narrator names them. So the SECOND HALF of the intro narration must
**enumerate the three learn bullets in the same order**, reusing a distinctive word from
each bullet. Pattern: *"…By the end, you'll understand <bullet 1 words>, you'll see <bullet 2
words>, and you'll learn <bullet 3 words>."* Don't mention those distinctive words earlier in
the intro, or the tick will fire too soon.

**Worked-example stepping:** value boxes now animate through EVERY value you set, in order.
So to show a running total go 0 → 10 → 15, give the box `"value":"0"` and add trace rows that
`set` it to `"10"` then `"15"` — each shows on its own beat. Don't jump straight to the final
value; include the intermediate steps as separate trace rows.

## The scene types (JSON shapes)

All scenes require `type`, `kicker` (a 1–3 word UPPERCASE-ish label like "The hook",
"Worked example"), and `narration`.

### hook
```json
{"type":"hook","kicker":"The hook","narration":"...",
 "headline":"short kinetic line, a question","question":"the punchy payoff line",
 "highlight":["word","word"]}
```

### definition
```json
{"type":"definition","kicker":"Plain definition","narration":"...",
 "term":"the word being defined","plain":"one-sentence plain definition",
 "highlight":{"word":"#7C6CFF","other":"#FFB454"},
 "chips":[{"icon":"🔢","label":"short"}]}   // chips optional, <=5
```

### steps  (walkthrough as titled cards)
```json
{"type":"steps","kicker":"How it works","narration":"...","title":"optional title",
 "steps":[{"icon":"1️⃣","label":"Bold step title","detail":"one supporting line"}]}  // 2–6 steps
```

### pseudocode  (auto-highlighted code card; lines reveal one by one)
```json
{"type":"pseudocode","kicker":"The logic","narration":"...","title":"optional",
 "lines":["SET total <- 0","FOR each n IN list","    total <- total + n","END FOR","PRINT total"],
 "caption":"optional one-line takeaway under the card",
 "callouts":[{"line":3,"text":"runs once per item","color":"#7C6CFF"}]}   // callouts optional
```
Use **leading spaces** to indent (they become visual indentation). Keep to <=9 lines.

### example  (SIGNATURE VISUAL: labelled value-boxes + a stepping watch panel)
```json
{"type":"example","kicker":"Worked example","narration":"...","title":"short title",
 "boxes":[{"label":"i","value":"?","color":"variable"},{"label":"sum","value":"0","color":"constant"}],
 "trace":[
   {"note":"i = 1, add to sum → sum = 1","set":{"i":"1","sum":"1"},"highlight":"sum"},
   {"note":"i = 2, add to sum → sum = 3","set":{"i":"2","sum":"3"},"highlight":"sum"},
   {"note":"final answer: sum = 3","set":{},"highlight":"sum","result":true}
 ]}
```
- `boxes`: <=6. `value` is the STARTING display (use "?" or "0" etc). ALL values are STRINGS.
- `trace`: <=8 rows, each a real step. `set` updates box values (keys MUST match a box label).
  `highlight` pulses one box. `result:true` marks the final answer row (turns green ✓).
- The trace must be **numerically/logically correct** — this is a real worked example.
- `color`: "variable" (amber, for changing values), "constant" (teal, for fixed/results),
  "accent" (indigo, for names/labels). Choose meaningfully.

### compare  (two-column comparison — great for X vs Y concepts)
```json
{"type":"compare","kicker":"Which one?","narration":"...","question":"optional kinetic question",
 "left":{"keyword":"WHILE","title":"ENTRY CHECK","color":"variable","items":[{"icon":"🔁","label":"..."}]},
 "right":{"keyword":"DO-WHILE","title":"EXIT CHECK","color":"constant","items":[{"icon":"✅","label":"..."}]},
 "tip":"optional pro-tip line"}
```

### mistake  (wrong vs right, side by side)
```json
{"type":"mistake","kicker":"Common mistake","narration":"...","title":"short title",
 "wrong":{"label":"what's wrong","lines":["code line","// comment"]},
 "right":{"label":"the fix","lines":["code line","// comment"]},
 "note":"one-line lesson"}
```
`lines` are plain strings (<=4 each). Lines starting with `//` or `#` render as dim comments.

### recap
```json
{"type":"recap","kicker":"Recap","narration":"...",
 "bullets":[{"icon":"📦","label":"Key point — short tail","color":"variable"}],   // 2–3 bullets
 "takeaway":"one memorable sentence"}
```
Bullet `label` may use " — " to split into a colored head and a plain tail.

## Hard requirements (a validator enforces these)
- File path: `content/specs/<VIDEO_ID>.json` (e.g. `content/specs/V014.json`).
- Top-level: `id`, `section`, `module`, `topicGroup`, `title`, `outputFilename`, `scenes`.
  Copy `id`, `section`, `module`, `topicGroup`, `title`, `outputFilename` EXACTLY from the
  brief you're given. `section` is always `"Section 1: Pseudocode"`.
- Every box `value` and every `set` value is a **string** (wrap numbers in quotes: `"25"`).
- `set`/`highlight` keys must reference an existing box `label`.
- Valid JSON (double quotes, no trailing commas, no comments in the JSON itself).
- Emojis are fine in `icon`/labels/notes. Do NOT put emojis inside `pseudocode.lines`.

## Quality bar
- Every worked example uses **specific, correct numbers** and a real trace — no hand-waving.
- The mistake must be the **actual** most common beginner error for that concept.
- Vary examples across videos so the set doesn't feel repetitive.
- Read your narration aloud in your head: does it flow, and does it match the visuals?

## How the v4 renderer reads your content (so you can author for it)
The visuals adapt to what you write — no layout fields needed:
- **`pseudocode.callouts` and `caption` become sticky notes** beside the code sheet; keep
  each to ~60 characters.
- **Example trace:** every `set` drops a new tile into that box's tray and prints the row on
  the trace receipt — give intermediate steps their own rows (0 → 10 → 15), and keep box
  labels as the real identifiers (case is preserved). Multi-line values: `\\n` in the string.
- **`highlight` words get a highlighter swipe;** use 1–3 words that carry the idea.
- **Recap points are circled on the lesson's contact sheet** by matching their words to
  earlier scenes — reuse a distinctive word from the scene you mean.
- The first three frames are a poster built from the intro `topic`, its longest word, and
  the example's final values — a strong `topic` and a meaningful example make the thumbnail.
