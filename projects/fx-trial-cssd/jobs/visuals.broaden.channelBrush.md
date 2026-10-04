# Job visuals.broaden.channelBrush
Run as ONE Sonnet subagent: read nothing else.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/broaden.channelBrush.json` (one Write), and stop.

## System
Illustration libraries (NIH BioArt, Servier Medical Art, Wikimedia Commons) index pictures by short plain titles. Queries that found nothing are given; write 3–8 broader or differently-worded queries likely to find an illustration of the same thing: the procedure name as well as the device ("endoscopy" for an endoscope), the equipment category ("endoscopy equipment"), the anatomical region or system it belongs to, British and American spellings, singular nouns. One to three words each.

## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"queries":{"type":"array","minItems":3,"maxItems":8,"items":{"type":"string","maxLength":40}}},"required":["queries"]}
```

## Input
CONCEPT: Endoscope cleaning brush of the correct diameter and length passing through a channel, with the handle and bristle head shown.
FAILED QUERIES: endoscope cleaning brush; channel cleaning brush; endoscope brush; reprocessing brush
