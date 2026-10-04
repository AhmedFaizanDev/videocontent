# Job visuals.choose.duodenoscopeElevator.2
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/choose.duodenoscopeElevator.2.json` (one Write), and stop.

## System
You are the art director of a medical education house (journal-figure look: clean, precise,
professional; no cartoons, no clip-art, no photos with text baked in). Judge candidate illustrations
for one teaching concept, each 0–5 on: relevance (shows the concept and the parts the lessons name),
accuracy (anatomically/technically right), quality (professional rendering, clean, legible at video
size), animation (clear separate parts a camera and labels can point at; plain background; no
lettering in the image), style (fits a clean clinical house style). Then choose the best one's number,
or 0 if none reaches relevance ≥ 4 AND accuracy ≥ 4 AND quality ≥ 3 — a wrong or poor picture is
worse than none. Open EVERY candidate image before scoring it — never score from the title.

## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"scores":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"n":{"type":"integer"},"relevance":{"type":"integer","minimum":0,"maximum":5},"accuracy":{"type":"integer","minimum":0,"maximum":5},"quality":{"type":"integer","minimum":0,"maximum":5},"animation":{"type":"integer","minimum":0,"maximum":5},"style":{"type":"integer","minimum":0,"maximum":5},"note":{"type":"string","maxLength":160}},"required":["n","relevance","accuracy","quality","animation","style","note"]}},"choice":{"type":"integer","minimum":0},"reason":{"type":"string","maxLength":300}},"required":["scores","choice","reason"]}
```

## Input
CONCEPT duodenoscopeElevator: Distal tip of a duodenoscope close-up, side-viewing, showing the elevator mechanism and its narrow recess, ideally open and closed.
TEACHES: Why the elevator recess is a documented outbreak site: it directs accessories, is narrow and mechanically complex, and is extremely difficult to clean.
PARTS THE LESSONS NAME: distal tip, elevator, elevator recess, accessory channel

CANDIDATES:
1. Digestive system showing bile duct it.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/duodenoscopeElevator/1.png
2. Digestive system showing bile duct-ar.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/duodenoscopeElevator/2.png
3. Digestive system showing bile duct-pt-BR — openverse, CC0 — preview iterations/visuals/fx-trial-cssd/duodenoscopeElevator/3.png
4. Digestive system showing bile duct finnish.PNG — commons, Public domain — preview iterations/visuals/fx-trial-cssd/duodenoscopeElevator/4.png
5. Digestive system showing bile duct hindi.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/duodenoscopeElevator/5.png
6. Digestive system showing bile duct-pt-BR.svg — commons, CC0 — preview iterations/visuals/fx-trial-cssd/duodenoscopeElevator/6.png

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/duodenoscopeElevator/1.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/duodenoscopeElevator/2.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/duodenoscopeElevator/3.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/duodenoscopeElevator/4.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/duodenoscopeElevator/5.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/duodenoscopeElevator/6.png
