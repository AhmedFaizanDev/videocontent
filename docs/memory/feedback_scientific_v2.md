---
name: feedback-scientific-v2
description: Owner's house standard v2 (2026-10-03) — scientific not cartoonish, flowcharts/tables first, planned lessons, Sora Heavy + Noto Sans, lexicon pronunciation, 5–7 min
metadata:
  type: feedback
---
Every video: professional and scientific (journal-figure look, muted palette, thin outlines, precise no-bounce motion, authentic anatomy drawn in code — e.g. a real heart shape, not a symbol), no cartoon characters. Visual priority: flowchart (Mermaid via `graph` art) → table (`table` art) → authentic diagram → animation; reuse library art first. Every lesson planned first (`projects/<p>/plans/<id>.md`, docs/PLAN_TEMPLATE.md). Explanations for a professional science audience. Headings Sora Heavy, all other text Noto Sans. Pronunciation fixed via `src/lexicon.ts` (MedSkills → "Med Skills"). Length 5–7 min (7 only when depth needs it).

**Why:** owner's request 2026-10-03 after the BLS intro: wants pipeline-level consistency, not per-video fixes. Chose code-drawn only (no Servier/stock libraries), Noto Sans ("New Neto"), journal-figure style, pilot = BLS Module 01 written from AHA 2025 guidelines (Module 01 PDF not supplied).

**How to apply:** follow guide §1b; supersedes "exactly 5:00" in [[feedback-picture-first]] (picture-first gates still apply). See [[user-video-preferences]].

**v3 refinements (owner, 2026-10-03, after the M01 pilot):** M01 still below the bar. (1) Illustration style = the owner's reference: textbook ink illustration (dark ink outlines, flat muted colour, fine hatching, cutaway anatomy with valves/chordae) — applied to the WHOLE visual system (diagrams, tables, arrows too). (2) Narration must be genuinely explanatory (mechanism, why, consequence), not vague lines over visuals; depth may add standard textbook science beyond the client source, each addition logged with a citation for clinical review; rules/numbers stay from the source. (3) Pace natural ~145 wpm (121 was too slow). (4) 5:00 is the standard; 6–7 only when the subject truly needs it. (5) Flowcharts/tables/transitions must be "wow"; effects left to me. (6) Priority: everything built becomes reusable infrastructure that cuts future token use (bulk), not one-off work. Ask questions before major changes.

**v4 (owner, 2026-10-03):** (1) Source first — for medical diagrams/illustrations research authoritative public-domain/licensed assets (scripts/find-assets.mts: NIH BioArt, Wikimedia Commons) and ingest them (scripts/ingest-art.mts); code-draw only when none fits. (2) Visuals must actively explain via motion/progressive reveals — never a static illustration under narration; motion-audit.mts measures it. (3) Every improvement is a reusable pipeline capability, never an M01-only patch. (4) MedSkills pronunciation must sound natural — fix in the house lexicon, verified by the owner's ear (say.mts --variants audition).
