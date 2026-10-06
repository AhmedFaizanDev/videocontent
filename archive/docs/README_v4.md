# ZSkillup — Animated Explainer Video Factory

A spec-driven pipeline that turns a CSV blueprint of topics into premium, narrated,
1080p animated explainer videos with **Remotion** (React + TypeScript). Voiceover is
generated with **free Microsoft Edge neural TTS** (no API key, no quota), and every
on-screen reveal is timed to the exact word being spoken.

**Section 1 (Pseudocode) — all 116 videos are rendered** into `output/` (≈10.7 h of
content, ~4.1 GB), each 1080p/30fps H.264 with voiceover, ducked music, and burned-in
captions, plus a matching `.srt`.

---

## Output layout

Videos are organised **section → module → topic group**, numbered in curriculum order:

```
output/Section_1_Pseudocode/
  01_Programming_Fundamentals/
    01_Variables_and_Data_Types/
      S1_V001_integer_float_character_boolean_string_types.mp4
      S1_V001_integer_float_character_boolean_string_types.srt
      ...
    02_Operators/ ...
  02_Programming_Logic_Patterns/ ...
  03_Arrays_and_Strings_Manipulation/ ...
  04_Recursion_Functions_and_Stack_Flow/ ...
  05_Bitwise_Operations_and_Masking/ ...
```

(`output/variables-and-constants.mp4` is the original standalone pilot; see "Pilot" below.)

---

## How it works

```
video_blueprint.csv ─► content/section1.json ─► content/specs/V###.json (authored content)
                                                         │
                                     scripts/voiceover.mts (Edge TTS + word timings)
                                                         ▼
                              public/audio/vo/V###/*.mp3  +  content/build/V###.timings.json  +  .srt
                                                         │
                                     scripts/prepare-registry.mts (src/registry.gen.ts)
                                                         ▼
                              Remotion renders from spec + timings ─► output/.../S1_V###_*.mp4
```

- **Content spec** (`content/specs/V###.json`) — pure content + exact narration per scene.
  Written to the contract in [`src/spec.ts`](src/spec.ts); see
  [`content/AUTHORING_GUIDE.md`](content/AUTHORING_GUIDE.md).
- **Scene archetypes** ([`src/templates/scenes.tsx`](src/templates/scenes.tsx)) — a reusable
  library rendering any spec: `intro`, `hook`, `definition`, `steps`, `example`
  (value-boxes + stepping watch panel), `pseudocode` (auto-highlighted), `code`, `compare`,
  `mistake`, `recap`. One shared design system (`src/theme.ts`).
- **Word-accurate timing** — Edge TTS returns per-sentence boundaries; we split them into a
  per-word timeline (`scripts/lib/tts_edge.py`) and store it in each scene's timings. At
  render time, `anchorBeats()` ([`src/beats.ts`](src/beats.ts)) fires each reveal at the
  moment its keyword is spoken — no even-spacing drift.
- **All timing is derived from measured audio.** Nothing is hand-timed; regenerate the
  voiceover and every animation re-syncs automatically.

---

## Setup

```bash
npm install                                          # Node >= 22
python3 -m venv .venv && .venv/bin/pip install edge-tts   # free neural TTS (scripts/lib/tts_edge.py)
```

No API keys are required — Edge TTS is free and unlimited. (A `.env` may hold an optional
`ELEVENLABS_API_KEY`/`VOICE_ID`, but the default pipeline does not use ElevenLabs.)

---

## Commands

```bash
npm run studio                          # preview any video in Remotion Studio
npm run validate                        # validate all specs against the schema
npm run voiceover -- V001 V002          # generate VO + timings + SRT for specific ids
npm run voiceover -- --all              # ...for every spec
npm run registry                        # regenerate src/registry.gen.ts from built timings
npm run render -- V001                  # render one video into the output hierarchy
npm run render -- --all --skip-existing # render everything not already rendered (resumable)
npm run verify                          # integrity sweep over all rendered MP4s
npm run build:all                       # voiceover -> registry -> render -> verify (end to end)
```

**Tips for long batches**
- Rendering uses the Node API (bundle once, render many). Wrap long runs in `caffeinate -ims`
  on macOS so idle sleep can't kill them.
- `--skip-existing` makes rendering fully resumable — re-run after any interruption and it
  continues where it stopped.
- Override the narrator with `VOICE=en-US-BrianNeural` or the pace with `EDGE_RATE=-8%`
  (defaults: `en-US-AndrewNeural`, `-10%`).

---

## Voice & music

- **Narrator:** Microsoft Edge Neural **Emma** (`en-US-EmmaMultilingualNeural`), rate −8%,
  pitch +2 Hz — warm and enthusiastic. Free, no key, no quota. Override with `VOICE`,
  `EDGE_RATE`, `EDGE_PITCH`. Requires `.venv` with `edge-tts` (see Setup).
- **Music / SFX:** see `public/audio/music/CREDITS.md` (bed ducked under narration by an
  envelope from the exact VO windows; paper-and-print foley; mastered to −14 LUFS).
- **Look & motion:** design system v4 "Proof" — see HANDOFF §12.

---

## Adding a new video, topic group, or section

1. Add/adjust rows in `video_blueprint.csv`, then regenerate the JSON slices:
   `node -e "..."` already produced `content/section1.json`, `content/groups.json`. For a new
   section, extend `scripts/lib/paths.mts` to read the new section slice.
2. Author `content/specs/<id>.json` following `content/AUTHORING_GUIDE.md` (or delegate the
   authoring, one agent per topic group). Run `npm run validate`.
3. `npm run voiceover -- <id> [...]`, then `npm run registry`.
4. `npm run render -- <id>` (preview first with `npm run studio`).

To change the topic of the **whole factory**, point the pipeline at a different CSV and
re-author the specs — the engine, design system, and scripts are content-agnostic.

---

## Pilot

`src/Main.tsx` + `script.md` are the original standalone "Variables and Constants" pilot
(composition id `VariablesAndConstants`), which pre-dates the spec-driven system. It still
renders via `remotion render VariablesAndConstants output/variables-and-constants.mp4`.
Everything in Section 1 uses the generalized spec-driven pipeline instead.

---

## Repo map

| Path | What |
| --- | --- |
| `video_blueprint.csv` | The source curriculum (733 videos across 4 sections) |
| `content/section1.json`, `content/groups.json` | Parsed Section 1 rows / topic groups |
| `content/AUTHORING_GUIDE.md` | The rules every spec follows |
| `content/specs/V###.json` | Authored content specs (116) |
| `content/build/V###.timings.json` | Generated per-scene timings + word timeline |
| `src/spec.ts` | Spec + timings TypeScript contract |
| `src/templates/` | Scene archetypes + shared primitives |
| `src/beats.ts` | Beat timing + word-anchoring (the sync engine) |
| `src/VideoComposition.tsx`, `src/Root.tsx` | Assembles a video from spec + timings |
| `scripts/` | `voiceover`, `prepare-registry`, `validate`, `render`, `verify`, `lib/` |
| `output/` | Final MP4s + SRTs in the section/module/group hierarchy |
```
