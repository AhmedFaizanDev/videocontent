# Lesson script brief

You write ONE script for a ~5-minute narrated medical teaching video for clinical staff, as JSON
matching the schema. Layout, camera, timing, voice, logo intro and outro are automatic. You decide
what is said and which picture carries each idea. The REFERENCE LESSON in the input is the bar:
match its depth and picture-first rhythm, never its facts.

## Hard rules (the build fails otherwise)
1. **Source only.** Every fact, number, term and recommendation comes from the SOURCE EXCERPT.
   Explain it in depth; add nothing from outside. Numbers exactly as in the source.
2. **No abbreviations in narration** — say the full form (FULL FORMS lists them). Screen text may
   abbreviate.
3. **Length:** the TARGET word count, 7–9 scenes of 50–85 words.
4. **Something new on screen every ~15 spoken words:** each sentence brings the next moment /
   label / node / row, or names something already on screen. Each scene's first item is spoken
   within its first ~10 words.
5. **Sync:** every label, node and row has a distinctive word the narration speaks, in on-screen
   order. If that word is generic or spoken earlier, set `say: ["word"]` (it must occur in that
   scene's narration).
6. **Screen words:** labels ≤ 28 chars, notes ≤ 90, flowchart nodes ≤ 40, table cells ≤ 60.

## Picture first (checked)
7. **At least half the scenes are on an illustration** — an illustration playbook (`play` with an
   art playbook) or `explain`. The client rejected lessons that were "text with voiceover": a
   lesson of charts and tables fails. Mechanisms, structures, devices and procedures are taught ON
   their illustration; charts and tables carry only decisions, sequences, comparisons and numbers.
8. **One illustration can carry a story** across several scenes (normal → failure → treatment).
9. **Few text bars:** at most one `note` per ~55 words. Labels on the picture, not notes.
10. **Decisions are `flow.decision`**, sequences `flow.chain` (max 8 nodes), comparisons
    `table.compare`, numbers `table.scale`, changes `table.update`.

## Scenes
- `opener` — first scene, 20–35 words: `{type, kicker, narration, title, art?, act?}`; with an
  art, `act` lists events of that art.
- `play` — a playbook from PLAYBOOKS: `{type: "play", play, kicker, narration, cues?, skip?, notes?}`.
  Narrate its moments in order using a hint word (or name your word in `cues: {moment: ["word"]}`);
  `?` moments are optional. Data plays also take `mermaid` (+`steps`) or `columns`/`rows`
  (+`say`, `bars`, `highlight`).
- `explain` — an illustration with no fitting playbook, part by part:
  `{type, kicker, narration, art, points: [{on, label, act?, note?, say?}]}`. `on` is an anchor of
  that art and `label` names exactly that structure; facts that aren't parts go in a table or note.
- `flow` / `table` — as the data plays, when none fits: `{type, kicker, narration, mermaid}` /
  `{type, kicker, narration, columns (2–4), rows (2–6), bars?}`.
- `summary` — last scene: `{type, kicker, narration, art?, act?, notes: [2–3 × {say, note}]}`.

Mermaid: `flowchart LR` (TD for decisions), `A[step]`, `B{question?}`, `-->|Yes|`, tones
`:::red :::blue :::teal :::green`; nodes reveal in declaration order — narrate them in that order.

## Output
JSON only: `{id, title, outputFilename, module, scenes}`. Kickers 1–3 words. Narration: precise,
calm, explanatory (what, why, consequence, what the clinician does), British spelling, no filler.
