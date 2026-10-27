#!/bin/sh
# The whole course with nobody at the keyboard: headless Claude Code works through HANDOFF.md
# (docs/AUTOPILOT.md is its brief), the bulk render runs here without spending tokens, and the same
# Claude session is resumed after every usage limit, crash or reboot (re-run this command).
#
#   sh scripts/autopilot.sh [project]     (default ms-mr-55)  → iterations/autopilot/log
#   tail -f iterations/autopilot/log      watch   ·   pkill -f scripts/autopilot.sh   stop
#
# Claude signals with files in iterations/autopilot/: ready-for-bulk (Phase 2 passed) · done.
# Model: opus until the project has its illustrations ("arts" set), sonnet after.
cd "$(dirname "$0")/.." || exit 1
P="${1:-ms-mr-55}"
A=iterations/autopilot
mkdir -p "$A"
if [ "$AUTOPILOT_DETACHED" != 1 ]; then
  if command -v caffeinate >/dev/null; then awake="caffeinate -ims"
  elif systemd-inhibit --what=sleep:idle true 2>/dev/null; then awake="systemd-inhibit --what=sleep:idle --why=course-autopilot"
  else awake=""; fi
  AUTOPILOT_DETACHED=1 nohup $awake sh "$0" "$P" >> "$A/log" 2>&1 &
  echo "started (pid $!) — tail -f $A/log"; exit 0
fi
CLAUDE="${CLAUDE_BIN:-claude}"
# no permission bypass: file edits + the pipeline's own commands only (plus .claude/settings.json);
# anything else is refused in headless mode, never run
ALLOW="Read Edit Write Glob Grep Bash(node:*) Bash(npm:*) Bash(npx:*) Bash(.venv/bin/python:*) Bash(ffmpeg:*) Bash(ffprobe:*) Bash(pdftotext:*) Bash(pdfinfo:*) Bash(git add:*) Bash(git commit:*) Bash(git status:*) Bash(git diff:*) Bash(git log:*) Bash(ls:*) Bash(cat:*) Bash(head:*) Bash(tail:*) Bash(wc:*) Bash(grep:*) Bash(find:*) Bash(mkdir:*) Bash(cp:*) Bash(mv:*) Bash(touch:*) Bash(echo:*) Bash(nohup:*) Bash(timeout:*) Bash(sleep:*) Bash(kill:*) Bash(ps:*) Bash(pgrep:*) Bash(free:*) Bash(nproc:*) Bash(dmesg:*) Bash(date:*) Bash(jq:*) Bash(sort:*) Bash(cut:*) Bash(awk:*) Bash(sed:*)"
set -f  # $ALLOW is split into words, never globbed
log() { echo "━━ $(date '+%F %T') $*"; }

# one Claude turn; waits out usage limits and retries crashes on the same session
turn() {
  fails=0
  while :; do
    model=opus; grep -q '"arts": *\[ *"' "projects/$P/project.json" && model=sonnet
    if [ -f "$A/session" ]; then s="--resume $(cat "$A/session")"
    else id=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen | tr A-Z a-z); s="--session-id $id"; fi
    log "claude ($model): $(echo "$1" | head -c 80)"
    "$CLAUDE" -p $s --model "$model" --permission-mode acceptEdits --allowedTools $ALLOW --disallowedTools "Bash(git push:*)" "Bash(curl:*)" "Bash(wget:*)" "Bash(sudo:*)" "Bash(rm -rf:*)" "Read(.env)" "Read(~/.aws/**)" -- "$1" < /dev/null > "$A/last" 2>&1
    code=$?
    tail -c 1500 "$A/last"; echo
    [ -f "$A/session" ] || { [ $code = 0 ] && echo "$id" > "$A/session"; }
    if grep -qiE "usage limit|limit reached|rate limit|resets|overloaded|429|529" "$A/last" && [ $(wc -c < "$A/last") -lt 3000 ]; then
      log "usage limit — retrying in 15 min"; sleep 900; continue
    fi
    grep -qiE "failed to authenticate|please run /login|not logged in" "$A/last" && { log "Claude is not logged in — run claude, /login, then re-run this script"; exit 1; }
    if grep -qi "no conversation found" "$A/last"; then rm -f "$A/session"; continue; fi
    [ $code = 0 ] && return 0
    fails=$((fails + 1)); [ $fails -ge 8 ] && { log "claude failed 8× in a row — stopping"; exit 1; }
    log "claude exited $code — retrying in 5 min"; sleep 300
  done
}

[ -f "$A/session" ] || turn "$(cat docs/AUTOPILOT.md) PROJECT: $P"
turns=0; rounds=0
while [ ! -f "$A/done" ]; do
  if [ -f "$A/ready-for-bulk" ]; then
    rounds=$((rounds + 1)); [ $rounds -gt 3 ] && { log "3 bulk rounds without done — stopping"; exit 1; }
    rm -f "$A/ready-for-bulk"
    log "bulk round $rounds"
    COURSE_DETACHED=1 sh scripts/course.sh "$P" >> iterations/course.log 2>&1
    turn "Bulk round $rounds finished (iterations/course.log, tail it — don't read it whole). Do the AUTOPILOT 'Finish' step."
  else
    turns=$((turns + 1)); [ $turns -gt 30 ] && { log "30 continue turns — stopping"; exit 1; }
    turn "continue (follow docs/AUTOPILOT.md; signal with $A/ready-for-bulk or $A/done when that step is reached)"
  fi
done
log "done — see FINAL_REPORT.md"
