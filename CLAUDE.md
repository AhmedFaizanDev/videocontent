# CLAUDE.md — start here

Turns MedSkills course PDFs into ~5-minute narrated, animated teaching videos (Remotion + free
Edge TTS). State and next steps: **`HANDOFF.md`**. Commands: **`README.md`**.

## The pipeline (one path)
```
per subject, once, interactive: illustrations → assets/vector or src/art/packs + playbooks (docs/ART.md)
per lesson, unattended:  node scripts/batch.mts <p> all
  course PDF → 1 Sonnet call (headless, docs/SCRIPT_BRIEF.md) → preflight → fixers → ≤2 scoped repairs
  → voice → render → QA (final MP4)
```
Token use is logged per call in `projects/<p>/jobs/usage.jsonl`. Headless Claude must be logged in;
the batch stops otherwise (no subagent fallback — it cost 100× more).

## What makes a lesson good (the client rejected "text with voiceover")
- **Illustration-led:** ≥ 40 % of teaching scenes on an animated illustration (gate). Mechanisms,
  structures, devices and procedures are taught on their picture; flowcharts and tables only for
  decisions, sequences, comparisons and numbers.
- **Every reveal hears its word** (`src/sync.ts`); nothing on screen sits still > 7 s.
- **Source only** — no invented facts or numbers (grounding gate). No abbreviations in narration.
- Scientific look (muted palette, thin outlines, precise motion), Sora headings / Noto body,
  MedSkills brand. Indian English female voice; `lang` en/hi/mr/kn.

## Rules
- Judge quality on the **final MP4** (frames every few seconds), not on stills or gates alone.
- Fix a recurring problem in the template or renderer; add a gate only for a failure seen twice.
- Never SVG `<text>` (fonts load late in long renders) — text goes in the art's `Html` layer.
- Don't hand-edit `src/*.gen.ts` or `projects/*/build/`. Check: `npx tsc --noEmit`, `npm test -- --fast`.
- One render at a time (CPU-bound).
