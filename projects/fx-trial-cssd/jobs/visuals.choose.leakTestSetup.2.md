# Job visuals.choose.leakTestSetup.2
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/choose.leakTestSetup.2.json` (one Write), and stop.

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
CONCEPT leakTestSetup: Flexible endoscope connected to a leak tester and immersed in water, with air bubbles escaping from a breach in the outer sheath.
TEACHES: How a leak test shows a breach before immersion, since a breached scope admits fluid into an interior that cannot be cleaned.
PARTS THE LESSONS NAME: leak tester, outer sheath, breach, insertion tube, control body

CANDIDATES:
1. Queensland State Archives 2874 Brisbane General Hospital and Womens Hospital XRay equipment 1946.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/leakTestSetup/1.png
2. Green's Eye Hospital, equipment (Western Hospital Review, 1928).png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/leakTestSetup/2.png
3. Pressure Gauge (PSF).png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/leakTestSetup/3.png
4. Gastroscopy by Hecker.PNG — commons, Public domain — preview iterations/visuals/fx-trial-cssd/leakTestSetup/4.png
5. Bubbles - Sir John Everett Millais.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/leakTestSetup/5.png
6. Bubbles by Sir John E Millais.png — commons, Public domain — preview iterations/visuals/fx-trial-cssd/leakTestSetup/6.png

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/leakTestSetup/1.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/leakTestSetup/2.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/leakTestSetup/3.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/leakTestSetup/4.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/leakTestSetup/5.png
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/leakTestSetup/6.png
