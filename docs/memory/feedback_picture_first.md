---
name: feedback-picture-first
description: "Client rejected text+voiceover lessons; owner wants picture-first, code-drawn visuals and strictly 5-minute videos"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8314b709-7a2f-48a7-989c-a9e998e16ec0
  modified: 2026-09-26T17:16:27.345Z
---

Every lesson must teach with moving, code-drawn pictures (the `stage` scene: drawn world, camera, beats that act and label on the picture), never text cards + voiceover. All imagery was drawn in code (src/art) until 2026-10-03; now source-first (authoritative public-domain/licensed assets, ingested and animated), code-drawn only when nothing fits — see [[feedback-scientific-v2]]. Every video is exactly 5:00 (`length.exact: 300`).

**Why:** MedSkills client feedback on the demo: "It looks more like text with audio voiceover. It should have more images with proper explanations and animations." The owner wants this as a pipeline capability for bulk production, not per-video fixes.

**How to apply:** New lessons use stage scenes and the picture-first gates (minIllustrated, maxScreenWords); missing drawings become generic pack parts first; hit the word range validate prints for exact length. See [[user-video-preferences]] and HANDOFF §3.

Owner (2026-09-27): new-subject drawings must be automated (series-planner → art-author → art gates → art-reviewer → approve), and all generation agents (planner, art-author, art-reviewer, lesson-author) run on Sonnet (`model: sonnet` in .claude/agents). Orchestrator still eyeballs the first lesson's storyboard per series.
