# Job visuals.choose.channelBrush.2
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/choose.channelBrush.2.json` (one Write), and stop.

## System
You are the art director of a medical education house (journal-figure look: clean, precise,
professional; no cartoons, no clip-art, no photos with text baked in). Judge candidate illustrations
for one teaching concept, each 0–5 on: relevance (shows the concept and the parts the lessons name),
accuracy (anatomically/technically right), quality (professional rendering, clean, legible at video
size), animation (clear separate parts a camera and labels can point at; plain background; no
lettering in the image), style (fits a clean clinical house style). Then choose the best one's number,
or 0 if none reaches relevance ≥ 4 AND accuracy ≥ 4 AND quality ≥ 3 — a wrong or poor picture is
worse than none.

## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"scores":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"n":{"type":"integer"},"relevance":{"type":"integer","minimum":0,"maximum":5},"accuracy":{"type":"integer","minimum":0,"maximum":5},"quality":{"type":"integer","minimum":0,"maximum":5},"animation":{"type":"integer","minimum":0,"maximum":5},"style":{"type":"integer","minimum":0,"maximum":5},"note":{"type":"string","maxLength":160}},"required":["n","relevance","accuracy","quality","animation","style","note"]}},"choice":{"type":"integer","minimum":0},"reason":{"type":"string","maxLength":300}},"required":["scores","choice","reason"]}
```

## Input
CONCEPT channelBrush: Endoscope cleaning brush of the correct diameter and length passing through a channel, with the handle and bristle head shown.
TEACHES: Why brush diameter and length matter and why brushing continues until the brush emerges visibly clean.
PARTS THE LESSONS NAME: brush, channel, ports, elevator recess

CANDIDATES:
1. PSM V88 D187 Hair brush cleaning apparatus.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/channelBrush/1.png
2. Best Medical Equipment Supplier.png — commons, CC0 — preview iterations/visuals/fx-trial-cssd/channelBrush/2.png
3. Lipid Bilayer Brush — bioart, Public Domain (check entry) — preview iterations/visuals/fx-trial-cssd/channelBrush/3.png

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/channelBrush/1.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/channelBrush/2.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/channelBrush/3.png
