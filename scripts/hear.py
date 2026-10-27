#!/usr/bin/env python3
"""
Hear a voiced lesson the way a learner would: transcribe every scene's narration audio with
Whisper (no prompt, so nothing biases it towards the script) and list the words it heard
differently from the script — mispronunciations, swallowed words, abbreviations read wrong.
An ASR also mishears rare terms itself, so read the list as "listen to these", and compare
voices on the same lesson by their counts.

  .venv/bin/python scripts/hear.py <project> <id> [--model small.en] [--out report.md]
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def words(text: str):
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text.lower().replace("’", "'"))
    return [canon(w) for w in re.findall(r"[a-z0-9']+", text.replace("-", " ")) if w.strip("'")]


NUM = "zero one two three four five six seven eight nine ten".split()
SAME = {"fibers": "fibres", "mannequin": "manikin", "center": "centre"}


def canon(w: str) -> str:
    """Spelling variants a voice cannot be blamed for: US/UK -ize, digits, homophones."""
    w = re.sub(r"iz(e|es|ed|ing|ation)$", r"is\1", w)
    return NUM[int(w)] if w.isdigit() and int(w) <= 10 else SAME.get(w, w)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("id")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--out")
    ap.add_argument("--timings", help="a timings.json other than the lesson's own (voice auditions)")
    a = ap.parse_args()
    import numpy as np
    from faster_whisper import WhisperModel

    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    t = json.loads(Path(a.timings or ROOT / "projects" / a.project / "build" / f"{a.id}.timings.json").read_text())
    lines, total, bad = [f"# hear {a.project}/{a.id} — voice {t['voice']['name']}, model {a.model}", ""], 0, 0
    for s in t["scenes"]:
        if not s.get("narration"):
            continue
        pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(ROOT / "public" / s["audioFile"]), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
        segs, _ = model.transcribe(np.frombuffer(pcm, np.float32), language="en", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
        heard = [(w.word, w.start) for seg in segs for w in seg.words]
        hw = [x for w, _ in heard for x in words(w)]
        ht = [st for w, st in heard for _ in words(w)]
        sw = words(s["narration"])
        total += len(sw)
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, sw, hw, autojunk=False).get_opcodes():
            if op == "equal" or "".join(sw[i1:i2]) == "".join(hw[j1:j2]):  # "re learning", "350 000"
                continue
            bad += max(i2 - i1, 1)
            at = f"{ht[j1]:.1f}s" if j1 < len(ht) else "end"
            lines.append(f"- scene {s['index']} @{at}: script “{' '.join(sw[i1:i2]) or '∅'}” → heard “{' '.join(hw[j1:j2]) or '∅'}”")
    lines.insert(1, f"{bad} differing word(s) of {total} ({100 * bad / max(total, 1):.1f} %)")
    out = "\n".join(lines) + "\n"
    if a.out:
        Path(a.out).write_text(out)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
