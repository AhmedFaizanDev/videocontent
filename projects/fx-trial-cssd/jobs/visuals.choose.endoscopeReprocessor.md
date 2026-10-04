# Job visuals.choose.endoscopeReprocessor
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/choose.endoscopeReprocessor.json` (one Write), and stop.

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
CONCEPT endoscopeReprocessor: Automated endoscope reprocessor with lid open, a scope coiled in the basin and tubing connectors attached to its channels.
TEACHES: How every channel must be attached to the correct model-specific connector, since an unconnected channel is not perfused or disinfected.
PARTS THE LESSONS NAME: reprocessor, connectors, channels, basin, insertion tube

CANDIDATES:
1. Ardrey Vehicle Washer Co. ("American medical directory", 1906 advert).png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/endoscopeReprocessor/1.png
2. Sterilization Bill January 30th 1917.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/endoscopeReprocessor/2.png
3. Laws regarding sterilization for contraceptive purposes around the world.svg — commons, CC0 — preview iterations/visuals/fx-trial-cssd/endoscopeReprocessor/3.png
4. Laws regarding sterilization for contraceptive purposes around the world — openverse, CC0 — preview iterations/visuals/fx-trial-cssd/endoscopeReprocessor/4.png
5. Endoscopy — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeReprocessor/5.png
6. Endoscopy — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeReprocessor/6.png

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeReprocessor/1.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeReprocessor/2.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeReprocessor/3.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeReprocessor/4.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeReprocessor/5.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeReprocessor/6.png
