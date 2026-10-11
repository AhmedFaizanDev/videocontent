---
name: feedback-verify-final-mp4
description: Verify the final MP4 frames themselves, not just stills — user caught a render-only diagram bug twice
metadata:
  type: feedback
---
Before calling videos done, check frames extracted from the rendered MP4, not only review stills — `npm run qa -- <project>` does this (MP4-vs-stills check), plus look at a few MP4 frames yourself.
**Why:** the V801 sequence diagram looked perfect in stills but the long render had shifted/clipped SVG text; the user found it by watching the video.
**How to apply:** no SVG <text> in art (HTML layer only, linted by `npm run validate`); `npm run qa` must pass on every render before reporting (it's the last stage of `npm run produce`). See [[project-cssd-module10]].
