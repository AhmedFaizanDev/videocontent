---
name: project-bulk-model
description: Owner's bulk-production operating model (2026-10-04) and the v5 batch architecture that serves it
metadata:
  type: project
---
Client courses arrive as module PDFs; target 50–100 videos/week; English + fully native hi/mr/kn; narration strictly from the client source; NO human intervention at all — the pipeline must fix everything itself (owner 2026-10-04, supersedes "one repair then set aside"); render on this Mac overnight (~6–7 min per 5-min video).

**Why:** per-video agent loops cost 0.5–9.6M tokens; owner wants first-pass quality (≤1 iteration), handcrafted-feeling videos, low tokens. Don't call the system proven after one trial — benchmark (`scripts/benchmark.mts`) when the owner asks.

**How to apply:** v5 (docs/BULK.md "Architecture v5"): compositions (`type: scene`, 1–3 elements + moves), director, variety + legibility gates, writer+editor, fixers → fallback → ≤3 repairs, house dictionary (src/dictionary.ts). Illustrations: public domain + Servier allowed, credits in docs (CREDITS.md) never in video; else tables/flows; AI images last resort. Headless writer needs a one-time CLI /login, else agent-mode job files run as Sonnet subagents. See [[feedback-scientific-v2]].
