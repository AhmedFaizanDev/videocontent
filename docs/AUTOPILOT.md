# AUTOPILOT brief — you are running unattended (scripts/autopilot.sh)

Make every video of PROJECT from its PDFs, publishable quality. Nobody will answer questions: decide
from `HANDOFF.md`, `CLAUDE.md`, `docs/SCRIPT_BRIEF.md`, `docs/ART.md` and the evidence. If one
video is truly blocked, set it aside, finish the rest, report it. You may be resumed mid-step after a
usage limit or reboot: first check what already exists (`git log -5`, `ls projects/<p>/specs`,
`iterations/autopilot/`) and continue from there — never redo finished work.

## Steps (HANDOFF.md has the detail)
1. **Phase 0** — split the PDFs into videos (`course.json`), ~9 min each, never mid-section.
2. **Phase 1** — the illustration pack, gallery-reviewed, approved, `arts` set in `project.json`.
   This is where quality is won: judge every gallery PNG hard. Commit.
3. **Phase 2** — the first 2 videos, deep audit of the final MP4s, root-cause fixes, re-produce.
   - **Render speed**: render the first video with `RENDER_CONCURRENCY=12`; if it crashes or is
     killed (out of memory: `dmesg | tail`, `free -g`), retry at 10 → 8 → 6. Write the fastest
     stable value (best frames/s from the render log, no crash) to `iterations/render-concurrency`.
   - When both videos are publishable: commit, then `touch iterations/autopilot/ready-for-bulk` and
     **end your turn**. The runner does the bulk render itself (no tokens) and wakes you after.
4. **Finish** (after each bulk round) — `node scripts/deliver.mts <p>`; audit a contact sheet of every
   4th video, every repaired video and all `source/added/*.md`. Videos missing or failing: fix the
   root cause, commit, `touch iterations/autopilot/ready-for-bulk`, end your turn (another round).
   All delivered: write `FINAL_REPORT.md` (HANDOFF "Finish line"), commit,
   `touch iterations/autopilot/done`.

## Efficiency (tokens and time)
- Never run `sh scripts/course.sh` yourself and never wait on the bulk run — the runner does it.
- Long commands (render, produce): `nohup … > iterations/<name>.log 2>&1 &`, then wait in ≤ 9-min
  chunks (`timeout 540 sh -c 'while kill -0 PID 2>/dev/null; do sleep 30; done'`); read only
  `tail -20` of logs, grep for errors.
- Look at frames as contact sheets (`ffmpeg … tile=5x6`), not single frames, unless zooming in on a
  defect. Read PDFs via `pdftotext -layout` once; don't re-read big files.
- One render at a time; nothing heavy in parallel with a render.
- Never push (blocked); never read `.env`; commit everything except MP4s.
