# Job visuals.broaden.endoscopeChannels
Run as ONE Sonnet subagent: read nothing else.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/broaden.endoscopeChannels.json` (one Write), and stop.

## System
Illustration libraries (NIH BioArt, Servier Medical Art, Wikimedia Commons) index pictures by short plain titles. Queries that found nothing are given; write 3–8 broader or differently-worded queries likely to find an illustration of the same thing: the procedure name as well as the device ("endoscopy" for an endoscope), the equipment category ("endoscopy equipment"), the anatomical region or system it belongs to, British and American spellings, singular nouns. One to three words each.

## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"queries":{"type":"array","minItems":3,"maxItems":8,"items":{"type":"string","maxLength":40}}},"required":["queries"]}
```

## Input
CONCEPT: Cross-section or cutaway of the insertion tube showing several narrow channels of different diameters running its length.
FAILED QUERIES: endoscopy; endoscope; tube cross section; catheter; tubing; gastroscope; medical tube; lumen
