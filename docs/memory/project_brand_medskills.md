---
name: project-brand-medskills
description: On-screen brand is MedSkills (client logo) from 2026-09-26; TA/Talha and ZSkillup marks are retired
metadata:
  type: project
---
From 2026-09-26 every video uses the **MedSkills** brand (magenta→purple gradient shield-cross logo + wordmark). Logo files keyed from the client's black-background PNGs by `scripts/prep-brand.mts` into `public/brand/medskills-{lockup,icon}[-white].png`; originals in `brand/medskills/`. The TA monogram (TaMark) was removed from the code.

**Why:** User said "no more TA/Zskillup branding, use these instead… from now on".

**How to apply:** Default brand in `src/project.ts` is MedSkills; never reintroduce TA/ZSkillup marks. Brand colours: magenta #D8148C → purple #7A24A1 (`brand` in `src/theme.ts`). See [[user-video-preferences]].
