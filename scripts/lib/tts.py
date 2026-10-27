#!/usr/bin/env python3
"""
Narration TTS with pacing: Amazon Polly (--engine neural|generative|standard, AWS credentials
from the default chain, e.g. ~/.aws/credentials) or free Microsoft Edge TTS (--engine edge,
for languages Polly lacks: Marathi, Kannada). Reads narration from stdin; writes an MP3 and a
JSON sidecar of per-word timings.

  echo "First idea. [pause] Second idea." | python3 scripts/lib/tts.py \
      --engine neural --voice Kajal --rate=+0% --pause 0.4 --beat 0.9 \
      --out scene.mp3 --words scene.words.json

Polly pronunciation override: a project lexicon value written as /ipa/ is spoken as that IPA
(<phoneme>); any other value is plain substitute text.

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
import os
import time
import re
import subprocess
import sys
import unicodedata
from html import escape

SR = 24000  # Edge's native mp3: 24 kHz mono
MARK = "[pause]"


def norm(word: str) -> str:
    """A word's comparable core in any script: letters, combining vowel signs, digits."""
    return "".join(ch for ch in unicodedata.normalize("NFC", word.lower()) if unicodedata.category(ch)[0] in "LMN")


WIDE = r"[\u3000-\u30FF\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]"


def unspace(text: str) -> str:
    """Japanese narration is written phrase-spaced (so captions and sync have words); the voice gets it unspaced."""
    return re.sub(rf"(?<={WIDE}) +(?={WIDE})", "", text)


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


IPA = re.compile(r"^(\W*)/([^/\s][^/]*)/(\W*)$")


def ssml_tokens(seg):
    """A segment's (display, spoken) tokens as SSML: /ipa/ spoken forms become <phoneme>."""
    out = []
    for d, sp in seg:
        m = IPA.match(sp)
        if m:
            word = re.sub(r"^\W+|\W+$", "", d)
            out.append(f'{escape(m[1])}<phoneme alphabet="ipa" ph="{escape(m[2])}">{escape(word)}</phoneme>{escape(m[3])}')
        else:
            out.append(escape(sp))
    return " ".join(out)


_polly = None


def polly_call(ssml: str, args, **kw):
    global _polly
    import boto3
    if _polly is None:
        _polly = boto3.client("polly", region_name=args.region)
    rate = args.rate if args.rate != "+0%" else None
    body = f'<speak><prosody rate="{100 + int(rate.rstrip("%"))}%">{ssml}</prosody></speak>' if rate else f"<speak>{ssml}</speak>"
    r = _polly.synthesize_speech(Engine=args.engine, VoiceId=args.voice, LanguageCode=args.lang, TextType="ssml", Text=body, **kw)
    # every call is billed by characters (SSML tags excluded): metrics/polly-usage.jsonl is the AWS bill's ledger
    with open(os.path.join(os.path.dirname(__file__), "..", "..", "metrics", "polly-usage.jsonl"), "a") as f:
        f.write(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "engine": args.engine, "voice": args.voice, "kind": kw.get("OutputFormat"), "chars": int(r["RequestCharacters"])}) + "\n")
    return r


def synth_polly(ssml: str, args):
    """Two Polly calls → (mp3 bytes, word events, sentence events). Word marks carry only a start
    time; each word ends where the next begins (the last at the clip's end, minus its tail)."""
    for attempt in range(4):
        try:
            audio = polly_call(ssml, args, OutputFormat="mp3", SampleRate=str(SR))["AudioStream"].read()
            dur = len(decode(audio)) / 2 / SR
            try:
                raw = polly_call(ssml, args, OutputFormat="json", SpeechMarkTypes=["word"])["AudioStream"].read().decode()
                marks = [json.loads(l) for l in raw.splitlines() if l.strip()]
            except Exception:  # an engine without speech marks: timings split by length
                marks = []
            words = []
            for i, m in enumerate(marks):
                s = m["time"] / 1000
                e = marks[i + 1]["time"] / 1000 if i + 1 < len(marks) else min(dur - 0.05, s + 0.12 + 0.07 * len(m["value"]))
                words.append((m["value"], s, max(s, e)))
            plain = re.sub(r"<[^>]+>", "", ssml)
            return audio, words, [(plain, 0.0, dur)]
        except Exception as e:
            if attempt == 3 or "Throttl" not in type(e).__name__ + str(e) and "Timeout" not in str(e):
                raise
            time.sleep(1.5 * (attempt + 1))


async def synth(text: str, args, sem):
    """One Edge call → (mp3 bytes, word events, sentence events)."""
    import edge_tts
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
    if words and any(re.search(WIDE, t) for t, _, _ in words):
        # Japanese: the voice reports morphemes, not our phrases — align them character by character
        owner = [k for k, w in flat for _ in norm(w)]
        chars = "".join(norm(w) for _, w in flat)
        c = 0
        for text, s, e in words:
            n = norm(text)
            i = chars.find(n, c, c + 40) if n else -1
            if i < 0:
                continue
            for k in {owner[i], owner[i + len(n) - 1]}:
                out[k] = [out[k][0], e] if k in out else [s, e]
            c = i + len(n)
    elif words:
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
    # a word the voice did not report (a number it read as "sixteen", a token it merged) is never
    # dropped: it takes the time between its reported neighbours, so captions and reveals keep it
    keys = [k for k in range(len(disp)) if norm(disp[k])]
    known = sorted(out)
    if known:
        for k in keys:
            if k in out:
                continue
            before = [q for q in known if q < k]
            after = [q for q in known if q > k]
            if before and after:
                a, b = before[-1], after[0]
                t0, t1 = out[a][1], out[b][0]
                gap = [q for q in keys if a < q < b]
                i = gap.index(k)
                step = max(0.0, t1 - t0) / len(gap)
                out[k] = [t0 + i * step, t0 + (i + 1) * step]
            elif after:
                out[k] = [out[after[0]][0], out[after[0]][0]]
            else:
                out[k] = [out[before[-1]][1], out[before[-1]][1]]
    res = []
    for k in sorted(out):
        raw = disp[k]
        if norm(raw):
            res.append({"w": norm(raw), "raw": raw, "start": round(offset + out[k][0], 3), "end": round(offset + out[k][1], 3)})
    return res


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", default="edge", help="edge | neural | generative | standard (the last three are Polly)")
    ap.add_argument("--voice", default="en-IN-NeerjaExpressiveNeural")
    ap.add_argument("--lang", default="en-IN", help="Polly LanguageCode (bilingual voices need it)")
    ap.add_argument("--region", default=os.environ.get("AWS_REGION", "us-east-1"))
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
        if re.search(r"[.!?…।॥。！？][\"')\]”’」』]*$", sp):
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
    if args.engine == "edge":
        results = await asyncio.gather(*[synth(unspace(" ".join(sp for _, sp in seg)), args, sem) for seg, _ in segs])
    else:
        async def one(seg):
            async with sem:
                return await asyncio.to_thread(synth_polly, unspace(ssml_tokens(seg)), args)
        results = await asyncio.gather(*[one(seg) for seg, _ in segs])

    pcm, words, cursor = bytearray(), [], 0.0
    for (seg, pause), (audio, wev, sev) in zip(segs, results):
        body = decode(audio)
        words.extend(timeline([d for d, _ in seg], [d if IPA.match(sp) else sp for d, sp in seg], wev, sev, cursor))
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
