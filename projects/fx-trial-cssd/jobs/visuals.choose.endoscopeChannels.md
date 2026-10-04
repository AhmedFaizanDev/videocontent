# Job visuals.choose.endoscopeChannels
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/choose.endoscopeChannels.json` (one Write), and stop.

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
CONCEPT endoscopeChannels: Cross-section or cutaway of the insertion tube showing several narrow channels of different diameters running its length.
TEACHES: Why endoscopes are mechanically complex: multiple narrow channels of different diameters, some hard to access and easy to forget.
PARTS THE LESSONS NAME: insertion tube, channels, outer sheath, distal tip

CANDIDATES:
1. smart artery overview cross section — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeChannels/1.png
2. artery overview cross section — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeChannels/2.png
3. overview red channels — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeChannels/3.png
4. overview pink channels — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeChannels/4.png
5. overview blue channels — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeChannels/5.png
6. overview brown channels smart — servier, CC BY 4.0 — preview iterations/visuals/fx-trial-cssd/endoscopeChannels/6.png

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeChannels/1.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeChannels/2.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeChannels/3.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeChannels/4.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeChannels/5.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/endoscopeChannels/6.png
