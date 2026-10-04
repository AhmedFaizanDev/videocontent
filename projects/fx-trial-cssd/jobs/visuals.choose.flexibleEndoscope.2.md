# Job visuals.choose.flexibleEndoscope.2
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/choose.flexibleEndoscope.2.json` (one Write), and stop.

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
CONCEPT flexibleEndoscope: Whole flexible endoscope in side view: control body, insertion tube, umbilical connection and distal tip, with ports and valves visible.
TEACHES: What a flexible endoscope is made of and where its channels, ports, valves and removable parts sit, so each reprocessing step can be located on it.
PARTS THE LESSONS NAME: control body, insertion tube, distal tip, ports, valves, buttons, caps, channels

CANDIDATES:
1. Fiberscope (view inside clock).png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/flexibleEndoscope/1.png
2. Gastroscopy by Hecker.PNG — commons, Public domain — preview iterations/visuals/fx-trial-cssd/flexibleEndoscope/2.png
3. endoscopy — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/flexibleEndoscope/3.png
4. 202303 Nasal Endoscopy Male.svg — commons, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/flexibleEndoscope/4.png
5. 202303 Nasal Endoscopy Female.svg — commons, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/flexibleEndoscope/5.png
6. 8 well pcr tube strip — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/flexibleEndoscope/6.png

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/1.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/2.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/3.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/4.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/5.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/6.png
