#!/bin/sh
# Produce whole courses unattended, detached from any terminal or Claude session (a job started
# inside a Claude session dies with it). Resumable: re-run the same command after any interruption —
# written scripts, voiceovers and finished renders are skipped. Usage limits are waited out
# (scripts/lib/llm.mts); a lesson that fails is set aside and the rest continue.
#
#   sh scripts/course.sh <project> [project…]      → log: iterations/course.log
#   tail -f iterations/course.log                   watch      ·   pkill -f scripts/course.sh   stop
cd "$(dirname "$0")/.." || exit 1
[ "$COURSE_DETACHED" = 1 ] || { COURSE_DETACHED=1 nohup caffeinate -ims sh "$0" "$@" >> iterations/course.log 2>&1 & echo "started (pid $!) — tail -f iterations/course.log"; exit 0; }
for p in "$@"; do
  echo "━━ $(date '+%F %T') $p"
  node scripts/batch.mts "$p" all
  # a render that crashed (browser out of memory) gets one more try at lower concurrency
  RENDER_CONCURRENCY=4 node scripts/batch.mts "$p" produce
done
echo "━━ $(date '+%F %T') done: $*"
