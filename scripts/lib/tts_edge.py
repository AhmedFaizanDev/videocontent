#!/usr/bin/env python3
"""
Free, high-quality neural TTS via Microsoft Edge (no API key, no quota), with pacing.
Reads narration from stdin; writes an MP3 and a JSON sidecar of per-word timings.

  echo "First idea. [pause] Second idea." | python3 scripts/lib/tts_edge.py \
      --voice en-IN-NeerjaExpressiveNeural --rate=+0% --pitch=+0Hz --pause 0.4 --beat 0.9 \
      --out scene.mp3 --words scene.words.json

stdin is plain narration, or JSON {"tokens": [{"d": display, "s": spoken}]} from
scripts/lib/speak.mts: the voice says `s` (ranges, symbols, abbreviations and the lexicon
spelled out), while the word timeline keeps `d` — so captions and sync match the script.

Pacing: with --pause > 0 (or any [pause] marker) the narration is voiced
one sentence at a time and re-joined with real silence — `pause` seconds after each
sentence, `beat` seconds at each [pause] marker — so ideas get breathing room the neural
voice would not give on its own. Otherwise it is voiced in one pass (legacy behaviour).


Timings: WordBoundary events when the voice emits them; else each sentence's exact window
is split across its words by length. Output: [{"w","raw","start","end"}] in seconds.
"""
import argparse
import asyncio
import json
import re
import subprocess
import sys
import unicodedata
import edge_tts

SR = 24000  # Edge's native mp3: 24 kHz mono
MARK = "[pause]"


def norm(word: str) -> str:
    """A word's comparable core in any script: letters, combining vowel signs, digits."""
    return "".join(ch for ch in unicodedata.normalize("NFC", word.lower()) if unicodedata.category(ch)[0] in "LMN")


def split_sentence(text: str, start: float, dur: float):
    """Distribute a sentence's exact [start, start+dur] window across its words."""
    raw_words = [w for w in re.split(r"\s+", text.strip()) if w]
    if not raw_words:
        return []
    weights = [len(norm(w)) + 1 for w in raw_words]
    total = sum(weights) or 1
    out, t = [], start
    for w, wt in zip(raw_words, weights):
        d = dur * (wt / total)
        if norm(w):
            out.append({"w": norm(w), "raw": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return out


async def synth(text: str, args, sem):
    """One Edge call → (mp3 bytes, word events, sentence events)."""
    async with sem:
        for attempt in range(4):
            try:
                try:
                    comm = edge_tts.Communicate(text, args.voice, rate=args.rate, pitch=args.pitch, boundary="WordBoundary")
                except TypeError:
                    comm = edge_tts.Communicate(text, args.voice, rate=args.rate, pitch=args.pitch)
                audio, words, sents = bytearray(), [], []

                async def pull():
                    nonlocal audio
                    async for chunk in comm.stream():
                        t = chunk["type"]
                        if t == "audio":
                            audio += chunk["data"]
                        elif t == "WordBoundary":
                            s, d = chunk["offset"] / 1e7, chunk["duration"] / 1e7
                            words.append((chunk["text"], s, s + d))
                        elif t == "SentenceBoundary":
                            sents.append((chunk["text"], chunk["offset"] / 1e7, chunk["duration"] / 1e7))

                # a sentence takes a few seconds; the service sometimes leaves a socket open and
                # silent forever (edge-tts's own receive timeout doesn't fire) — give up and retry
                await asyncio.wait_for(pull(), timeout=90)
                return bytes(audio), words, sents
            except Exception:
                if attempt == 3:
                    raise
                await asyncio.sleep(1.5 * (attempt + 1))


def decode(mp3: bytes) -> bytes:
    """mp3 → raw s16le mono PCM at SR."""
    return subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(SR), "pipe:1"], input=mp3, capture_output=True, check=True).stdout


def encode(pcm: bytes, out: str):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "64k", out], input=pcm, check=True)


def timeline(disp, spoken, words, sents, offset):
    """Map a segment's boundary events back onto its display tokens.

    `spoken[k]` is what display token `disp[k]` was voiced as (possibly several words);
    every event is matched to a spoken word, then collapsed onto its display token."""
    flat = [(k, w) for k, sp in enumerate(spoken) for w in sp.split() if norm(w)]
    out = {}
    if words:
        j = 0
        for text, s, e in words:
            n = norm(text)
            for m in range(j, min(j + 6, len(flat))):
                if norm(flat[m][1]) == n or (n and n in norm(flat[m][1])):
                    k = flat[m][0]
                    if k in out:
                        out[k][1] = e
                    else:
                        out[k] = [s, e]
                    j = m + 1
                    break
    else:
        split = []
        for text, s, d in sents:
            split.extend(split_sentence(text, s, d))
        for i, w in enumerate(split):
            if i < len(flat):
                k = flat[i][0]
                if k in out:
                    out[k][1] = w["end"]
                else:
                    out[k] = [w["start"], w["end"]]
    res = []
    for k in sorted(out):
        raw = disp[k]
        if norm(raw):
            res.append({"w": norm(raw), "raw": raw, "start": round(offset + out[k][0], 3), "end": round(offset + out[k][1], 3)})
    return res


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="en-IN-NeerjaExpressiveNeural")
    ap.add_argument("--rate", default="+0%")
    ap.add_argument("--pitch", default="+0Hz")
    ap.add_argument("--pause", type=float, default=0.0, help="seconds of silence after each sentence")
    ap.add_argument("--beat", type=float, default=0.9, help="seconds of silence at each [pause] marker")
    ap.add_argument("--out", required=True)
    ap.add_argument("--words", required=True)
    args = ap.parse_args()

    raw = sys.stdin.read().strip()
    if not raw:
        print("no text on stdin", file=sys.stderr)
        return 1
    if raw.startswith("{"):
        toks = json.loads(raw)["tokens"]
        disp = [t["d"] for t in toks]
        spk = [t["s"] for t in toks]
    else:
        disp = [t for t in re.split(r"\s+", raw) if t]
        spk = list(disp)

    # segments end at sentence ends and [pause] markers; each carries the silence after it
    segs, cur = [], []
    for d, sp in zip(disp, spk):
        if d.lower() == MARK:
            if cur:
                segs.append([cur, args.beat])
                cur = []
            elif segs:
                segs[-1][1] = max(segs[-1][1], args.beat)
            continue
        cur.append((d, sp))
        if re.search(r"[.!?…।॥][\"')\]”’]*$", sp):
            segs.append([cur, args.pause])
            cur = []
    if cur:
        segs.append([cur, args.pause])
    if segs:
        segs[-1][1] = 0.0
    paced = args.pause > 0 or any(d.lower() == MARK for d in disp)
    if not paced:  # legacy single pass
        segs = [[[t for s, _ in segs for t in s], 0.0]]

    sem = asyncio.Semaphore(4)
    results = await asyncio.gather(*[synth(" ".join(sp for _, sp in seg), args, sem) for seg, _ in segs])

    pcm, words, cursor = bytearray(), [], 0.0
    for (seg, pause), (audio, wev, sev) in zip(segs, results):
        body = decode(audio)
        words.extend(timeline([d for d, _ in seg], [sp for _, sp in seg], wev, sev, cursor))
        pcm += body
        cursor += len(body) / 2 / SR
        gap = int(round(pause * SR))
        pcm += b"\x00\x00" * gap
        cursor += gap / SR
    encode(bytes(pcm), args.out)
    with open(args.words, "w") as f:
        json.dump(words, f)
    print(f"{len(words)} word timings, {len(segs)} segment(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
