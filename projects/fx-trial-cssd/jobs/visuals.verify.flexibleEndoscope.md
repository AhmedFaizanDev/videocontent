# Job visuals.verify.flexibleEndoscope
Run as ONE Sonnet subagent: read nothing else but the images listed under Input.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/verify.flexibleEndoscope.json` (one Write), and stop.

## System
You check a medical illustration's anchor points. Each magenta dot carries a name. List the names whose dot is NOT on the structure that name describes (a dot in empty space, on the wrong part, or on a part not visible). Be strict; correct ones are not listed.

## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"wrong":{"type":"array","items":{"type":"string"}},"note":{"type":"string","maxLength":300}},"required":["wrong","note"]}
```

## Input
ILLUSTRATION: Whole flexible endoscope in side view: control body, insertion tube, umbilical connection and distal tip, with ports and valves visible.
ANCHORS: eyepiece, controlBody, instrumentChannelPort, strainRelief, insertionTube, bendingSection, distalTip, umbilicalCord, lightGuideConnector, lightGuidePlug, connectorPort

IMAGES (Read each one):
- /Users/faizan/RootVault/zskillup video content/iterations/visuals/fx-trial-cssd/flexibleEndoscope/anchors.png
