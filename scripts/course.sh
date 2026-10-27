#!/bin/sh
# Produce whole courses unattended, detached from any terminal or Claude session (a job started
# inside a Claude session dies with it). Resumable: re-run the same command after any interruption —
# written scripts, voiceovers and finished renders are skipped. Usage limits are waited out
# (scripts/lib/llm.mts); a lesson that fails is set aside and the rest continue.
#
#   sh scripts/course.sh <project> [project…]      → log: iterations/course.log
#   tail -f iterations/course.log                   watch      ·   pkill -f scripts/course.sh   stop
#
# Render concurrency (Chrome tabs): RENDER_CONCURRENCY, default 8 — sized for 16 GB RAM (M5 Mac,
# i7-12700 Linux); a render that crashes (out of memory) is retried at 4.
# Keeps the machine awake: caffeinate (macOS) or systemd-inhibit (Linux) when present.
cd "$(dirname "$0")/.." || exit 1
mkdir -p iterations
if [ "$COURSE_DETACHED" != 1 ]; then
  if command -v caffeinate >/dev/null; then awake="caffeinate -ims"
  elif systemd-inhibit --what=sleep:idle true 2>/dev/null; then awake="systemd-inhibit --what=sleep:idle --why=course-render"
  else awake=""; fi
  COURSE_DETACHED=1 nohup $awake sh "$0" "$@" >> iterations/course.log 2>&1 &
  echo "started (pid $!) — tail -f iterations/course.log"; exit 0
fi
export RENDER_CONCURRENCY="${RENDER_CONCURRENCY:-8}"
for p in "$@"; do
  echo "━━ $(date '+%F %T') $p (render concurrency $RENDER_CONCURRENCY)"
  node scripts/batch.mts "$p" all
  # a render that crashed (browser out of memory) gets one more try at lower concurrency
  RENDER_CONCURRENCY=4 node scripts/batch.mts "$p" produce
  # the client deliverable: QA-passed videos in output/Delivery/<course>/<module>/
  node scripts/deliver.mts "$p"
done
echo "━━ $(date '+%F %T') done: $*"
