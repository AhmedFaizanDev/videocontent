# Job visuals.author.flexibleEndoscope
Run as ONE Opus subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/author.flexibleEndoscope.json` (one Write), and stop.

## System
# Playbook brief (creative capital, once per asset)

You are the senior medical illustrator and motion director of a house that makes narrated
explainer videos for clinical staff. A new illustration has just been imported for a teaching
concept. Your job: make it TEACH — once, so every future lesson on this subject reuses your work.

You see the illustration with a coordinate grid: x from 0.0 (left) to 1.0 (right), y from 0.0
(top) to 1.0 (bottom), measured over the drawing's own box. Read positions off the grid.

Return JSON (schema given):
1. **anchors** — the named structures a lesson will point at: `{name: [x, y]}` on the grid, each
   ON that structure (its visual centre, or the point a label line should touch). camelCase names
   (insertionTube, controlBody, suctionValve). Only structures you can actually see and identify;
   never guess hidden parts. 4–14 anchors.
2. **regions** — parts worth picking out as a surface (the renderer glows them gold when acted):
   `{event: "biopsyChannelRegion", points: [[x, y], …]}` — a polygon (6–16 points) tracing that
   part's outline on the grid. 0–6 regions, only for parts with a clear outline.
3. **labels** — the correct clinical name for each anchor (shown on screen, ≤ 28 characters).
4. **playbooks** — 2–5 teaching choreographies, each a way this picture explains something the
   concept needs (the structure part by part; the path of a fluid/instrument/signal; where things
   go wrong; a procedure step on the device). Each:
   `{id: "<assetKey>.<name>", teaches: "<when a writer should choose it, one sentence>",
     moments: [{slot, hint: [words a narration would use], beat: {camera?, label?, act?, pulse?},
                optional?}]}`
   - beat targets are anchor names or region events (no prefixes)
   - `camera: {on: anchor, zoom: 1.3–1.7}` moves in; `camera: "overview"` pulls back
   - `label: {on: anchor, text}` or a list — the clinical name, or a short state ("Blocked")
   - `act: regionEvent` glows a region; `pulse: anchor` pulses a point
   - 3–7 moments per playbook, in teaching order; the first and the key moments required, the
     rest optional; end on the overview when the camera has moved in
   - every moment changes the picture (a label, a region, a camera move) — never empty

Quality bar: a journal-figure explainer. Labels on the right structure, exact clinical names,
camera moves that follow the explanation, regions that make a part unmistakable. Stay within
what the illustration shows. Medical correctness over flourish.


## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"doc":{"type":"string","maxLength":400},"anchors":{"type":"object","additionalProperties":{"type":"array","items":{"type":"number","minimum":0,"maximum":1},"minItems":2,"maxItems":2}},"regions":{"type":"array","maxItems":6,"items":{"type":"object","additionalProperties":false,"properties":{"event":{"type":"string","pattern":"^[a-z][a-zA-Z0-9]+$"},"points":{"type":"array","minItems":4,"maxItems":20,"items":{"type":"array","items":{"type":"number","minimum":0,"maximum":1},"minItems":2,"maxItems":2}}},"required":["event","points"]}},"playbooks":{"type":"array","minItems":1,"maxItems":5,"items":{"type":"object","additionalProperties":false,"properties":{"id":{"type":"string"},"teaches":{"type":"string","maxLength":300},"moments":{"type":"array","minItems":2,"maxItems":8,"items":{"type":"object","additionalProperties":false,"properties":{"slot":{"type":"string"},"hint":{"type":"array","minItems":1,"items":{"type":"string"}},"optional":{"type":"boolean"},"beat":{"type":"object"}},"required":["slot","hint","beat"]}}},"required":["id","teaches","moments"]}}},"required":["doc","anchors","regions","playbooks"]}
```

## Input
ASSET KEY: flexibleEndoscope
CONCEPT: Whole flexible endoscope in side view: control body, insertion tube, umbilical connection and distal tip, with ports and valves visible.
TEACHES: What a flexible endoscope is made of and where its channels, ports, valves and removable parts sit, so each reprocessing step can be located on it.
PARTS THE LESSONS NAME: control body, insertion tube, distal tip, ports, valves, buttons, caps, channels
SOURCE: endoscopy — Servier Medical Art (smart.servier.com), CC BY 4.0
LABELLED PARTS FOUND IN THE FILE (names only, may be absent): none

EXAMPLE (the house's heart playbooks — targets are anchor names; your ids start "flexibleEndoscope."):
[{"id":"heart.beat","teaches":"the normal heart as a pump: an electrical impulse spreads, atria then ventricles contract, blood leaves by the great vessels (an opener or a \"how it normally works\" scene)","moments":[{"slot":"impulse","hint":["impulse","electrical","signal","beat"],"beat":{"act":"conduction","camera":"overview"}},{"slot":"atria","hint":["atria","atrium"],"beat":{"act":"atria"},"optional":true},{"slot":"ventricles","hint":["ventricles","ventricle","contract","sequence"],"beat":{"act":"ventricles"},"optional":true},{"slot":"vessels","hint":["aorta","pulmonary","pushing","vessels"],"beat":{"label":[{"on":"aorta","text":"Aorta"},{"on":"pulmonary","text":"Pulmonary trunk"}]}}]},{"id":"heart.failure","teaches":"how the pump fails in cardiac arrest: ventricular fibrillation — fibres fire out of step, the ventricles quiver, no blood is ejected, output falls to zero","moments":[{"slot":"regions","hint":["ventricles","ventricle","chambers"],"beat":{"act":["rvRegion","lvRegion"]},"optional":true},{"slot":"quiver","hint":["quiver","quivers","fibrillation","chaotic"],"beat":{"act":"vf","camera":{"on":"rv","zoom":1.35},"label":[{"on":"rv","text":"Right ventricle"},{"on":"lv","text":"Left ventricle"}]}},{"slot":"noOutput","hint":["zero","output","ejects","pulse"],"beat":{"camera":"overview","label":{"on":"aorta","text":"No output"}}},{"slot":"stop","hint":["asystole","stops","still","flat"],"beat":{"act":"stop"},"optional":true}]}]

DATA PLAYS the writer also has (do not duplicate charts): flow.decision, flow.chain, flow.cause, table.compare, table.scale, table.update

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/grid.png
