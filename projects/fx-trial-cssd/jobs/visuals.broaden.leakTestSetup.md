# Job visuals.broaden.leakTestSetup
Run as ONE Sonnet subagent: read nothing else.  Write the final JSON to `iterations/visuals/fx-trial-cssd/answers/broaden.leakTestSetup.json` (one Write), and stop.

## System
Illustration libraries (NIH BioArt, Servier Medical Art, Wikimedia Commons) index pictures by short plain titles. Queries that found nothing are given; write 3–8 broader or differently-worded queries likely to find an illustration of the same thing: the procedure name as well as the device ("endoscopy" for an endoscope), the equipment category ("endoscopy equipment"), the anatomical region or system it belongs to, British and American spellings, singular nouns. One to three words each.

## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"queries":{"type":"array","minItems":3,"maxItems":8,"items":{"type":"string","maxLength":40}}},"required":["queries"]}
```

## Input
CONCEPT: Flexible endoscope connected to a leak tester and immersed in water, with air bubbles escaping from a breach in the outer sheath.
FAILED QUERIES: endoscope leak test; endoscope leak tester; endoscope immersion; endoscope water tank
