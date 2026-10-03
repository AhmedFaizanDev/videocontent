# Render server

This archive holds 1 certified lesson(s) in 1 project(s): smoke.
They were validated locally (scripts/certify.mts): content, sync against the real voice,
layout at real timings. The server only renders and runs the technical QA.

```bash
# once: Node 20+, ffmpeg on PATH (Remotion downloads its own headless Chrome)
npm ci
node scripts/render-batch.mts --list        # what will render
caffeinate -ims node scripts/render-batch.mts   # macOS; on Linux: nohup node scripts/render-batch.mts &
```
- Output: `output/<project output dir>/` (MP4, SRT, thumbnail, publish kit, QA.md) and
  `output/RENDER_BATCH.md` (per-lesson status). Re-running resumes; finished lessons are skipped.
- Fonts are vendored (public/fonts): rendering needs no network access. Remotion downloads its
  headless Chrome on first use (Linux: install its shared libraries, e.g. `npx remotion browser ensure`).
- A lesson edited after certification is refused (its build hash no longer matches).
- One batch at a time: rendering is CPU-bound and already uses every core.
