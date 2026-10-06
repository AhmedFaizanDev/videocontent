# Course introduction brief (1–1.5 min promo, one per course)

You write ONE course introduction video script for MedSkills, as JSON matching the schema. It is a
short promotional voice-over, professional and warm (Indian English, British spelling), shown over
animated branded screens. The pipeline adds the logo intro and the end card (logo + website).

## Source of truth
The COURSE ROW in the input is the only source of facts: name, learning hours, descriptions,
objectives, learning outcomes, who can take it. Never add facts it does not state — no module
counts, no regulations, no audiences, no numbers that are not in the row.

## Structure (the client's template — follow it exactly, in this order)
1. **Welcome + what and why** — the narration's FIRST sentence is exactly the OPENING given in
   the input. Then one or two sentences on what the course is and why it matters (from the
   descriptions).
2. **What you will learn** — the course objectives, spoken naturally as a journey.
3. **What you will be able to do** — the learning outcomes, and the learning hours.
4. **Who it is for** — who can take the course, and how it helps them. End this scene with an
   invitation to enroll: "Enroll in the short-term course on <the spoken course name> now." (you
   may add a short warm clause, e.g. "…now, and take the next step towards safer care.").
Never say the website, the price or "MedSkills dot in" — the end card shows the website.

## Length — a hard cap
Total narration 140–160 words (≈ 1:20 with the logo and end card; the video must not exceed
1:30). Scene 1 25–40 words, scenes 2–4 35–45 words each.

## Screens (use exactly these)
1. `{type: "opener", kicker: "Welcome", title: <the course name as written in the row>, narration,
    notes: [{say: ["<a word of your second sentence>"], note: <the row's Short Description, shortened to ≤ 90 chars without changing its facts>}]}`
   — the title builds in two parts if it has a dash; the note appears as the second sentence starts.
2. `{type: "play", play: "flow.chain", kicker: "What you will learn", narration, mermaid}` —
   `flowchart LR` with exactly 4 nodes, one per objective, each a 2–5 word label (≤ 32 chars),
   `A[...] --> B[...] --> C[...] --> D[...]`, tones `:::teal` on the last. Narrate the objectives
   in node order; each node's label must contain a word the narration speaks for it.
3. `{type: "scene", kicker: "What you will be able to do", narration, elements: [
     {id: "hours", kind: "stat", value: <learning hours>, display: "<hours> hours", label: "of learning", tone: "teal", say: ["<hours word as spoken>"]},
     {id: "outcomes", kind: "stack", items: [4 × {label: ≤ 40 chars}]}]}` —
   one item per learning outcome, in order; narrate them in order; say the hours.
4. `{type: "scene", kicker: "Who it is for", narration, elements: [
     {id: "who", kind: "hub", center: "Who it's for", items: [3–6 × {label: ≤ 22 chars}]}]}` —
   the audience groups from the row (merge similar roles), in the order narrated.

## Language rules
- No abbreviations in narration: say the full forms (FULL FORMS are listed); the screen labels
  may use abbreviations. Numbers as digits.
- Each on-screen item must have a distinctive word that the narration speaks, in order.
- No filler ("in this video"), no hype, no exclamation marks.

## Output
JSON only: `{id, title, outputFilename, module, scenes: [4 scenes as above]}`.
