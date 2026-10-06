# PROJECT HANDOFF — ZSkillup Animated Explainer Video Factory

> Read this end-to-end before touching anything. It captures the **why** behind the code:
> the goal, every user decision/feedback, the quality bar to preserve, the hard-won
> operational lessons, and exactly how to continue. Pair it with `README.md` (the technical
> how-to) and `content/AUTHORING_GUIDE.md` (the content contract).

---

## 1. What this project is

A **spec-driven pipeline** that turns a curriculum CSV (`video_blueprint.csv`, 733 videos
across 4 sections) into premium, narrated, 1080p animated explainer videos using
**Remotion** (React + TypeScript). It was built for the **ZSkillup** dev-education brand
(logo in `logo/`, used as a watermark + outro).

**Current status (as of handoff):**
- ✅ **Section 1 "Pseudocode" — ALL 116 videos rendered, verified, and delivered** in
  `output/Section_1_Pseudocode/…`. ~10.7 h of content, ~4.1 GB, 116 MP4s + 116 `.srt`.
- ⛔ **Sections 2–4 NOT started** — CS Fundamentals (231), Domain Specific (217),
  Coding (169). The engine is section-agnostic but a couple of scripts are hardcoded to
  Section 1 (see §7).
- 🎞️ A standalone **pilot** ("Variables and Constants", composition `VariablesAndConstants`,
  driven by `script.md` + `src/Main.tsx`) predates the spec system. Output:
  `output/variables-and-constants.mp4`. Leave it; Section 1+ use the generalized pipeline.

---

## 2. The brief (what the user asked for)

Original: build a complete, render-ready animated explainer video from scratch — Remotion for
animation, TTS voiceover, 1080p/30fps H.264 with audio, royalty-free ducked music, burned-in
captions **and** a separate `.srt`, a consistent design system, and a README. That produced
the pilot. The user then asked to **generate every Section 1 video from the CSV at the same
quality**, in a clear `output/` directory hierarchy by section/module/topic-group.

---

## 3. User feedback timeline (chronological — this is the real spec)

These are the decisions that shaped the product. **Preserve all of them.**

1. **Scale-up:** "Create all the videos in the CSV belonging to Section 1, Pseudocode. Keep
   the quality the same. Follow the CSV's sequence and titles, but you decide the *how* /
   what to include — add depth and detail to make each video better." → CSV is a skeleton;
   we author the real pedagogy. Also: **clear directory hierarchy** under `output/`.

2. **After first 5-min V001 review — length + structure:**
   - Target **~5 minutes**, but **go up to 10–12 min if a topic needs more depth** (my call).
   - **Always open by naming the topic**: *"In this video we are going to discuss/talk about
     <topic>…"* then move into it. (Implemented as the required `intro` scene.)
   - **Showcase code** wherever suitable, plus **real-world significance** — "use all the
     ways to make the video more enhanced."
   - **Regenerate everything**, including anything already rendered.

3. **After V001/V002 review — voice + sync:**
   - V001 "looks really amazing… exactly as expected. Keep the expectation exactly the same."
   - **Sync issue:** visuals lagged a few seconds behind the narration; the visual for a
     point must appear **at the same time** the narrator says it. (Multiple places.)
   - **Drop ElevenLabs, use an equivalent free voice** (ElevenLabs quota had run out).

4. **After the re-render — pacing + two specific bugs:**
   - **Reduce speech rate** and add **pauses** so learners can absorb.
   - **Intro "ticks" sync**: the three "what you'll learn" checkmarks must appear in sync
     with the narration.
   - **V002 scoreboard**: the score box jumped straight to 15 — it must **step 0 → 10 → 15**.
   - Regenerate V001 + V002 (free voice) for review before the full run.

5. **Approval:** "Go ahead and generate all. ~5 min per video approx; can go up to 10–12 min
   if the topic needs depth — your call."

6. **Operational:** the machine kept sleeping and killing background jobs; the user wanted
   an **automatic status report every 15 minutes**. Solved with `caffeinate`, resumable
   renders, and a background **Monitor** loop that also self-relaunches the render.

---

## 4. Quality bar — the non-negotiables to keep

Every video MUST:
- **~5 min baseline** (longer for deep topics), 9–11 scenes, 820–980 narration words
  (more for deep topics). Validator enforces ranges.
- **Open with an `intro`** whose narration literally names the topic, and whose second half
  **enumerates the 3 "learn" bullets in order** (so the on-screen ticks sync — see §6).
- Include a **real-world / why-it-matters** beat, **≥1 pseudocode/code** scene, and **≥1
  worked `example`** (value-boxes + stepping watch panel) with a **numerically correct trace**.
- End with a **`recap`** + logo outro.
- **Word-accurate sync:** reveals fire as the narrator says them (never even-spaced drift).
- **Free Edge neural voice** "Andrew" (`en-US-AndrewNeural`), calm pace (rate **−10%**).
- **Ducked music** (~−20 dB, fade in/out), **burned-in captions**, and a **`.srt`**.
- Consistent premium **design system v2** (`src/theme.ts` — see §11): warm near-black,
  editorial serif + sans + mono, a graded six-role palette. One idea on screen.
- Land in the **section/module/topic-group hierarchy** with the CSV's `output_filename`.

Audience is **absolute beginners, zero coding background** — define every term on first use,
warm/confident tone, language-agnostic **pseudocode** (never a real language's syntax).

---

## 5. Architecture (see README.md for full detail)

```
video_blueprint.csv → content/section1.json → content/specs/V###.json  (authored content+narration)
   → scripts/voiceover.mts (Edge TTS + per-word timeline)
       → public/audio/vo/V###/*.mp3  +  content/build/V###.timings.json  +  output/.../*.srt
   → scripts/prepare-registry.mts → src/registry.gen.ts
   → scripts/render.mts (Remotion Node API, bundle once) → output/.../S1_V###_*.mp4
   → scripts/verify.mts (integrity sweep)
```

- **Specs** = pure content per scene, typed by `src/spec.ts`, written to
  `content/AUTHORING_GUIDE.md`. Scene types: `intro, hook, definition, steps, example, code,
  pseudocode, compare, mistake, recap`.
- **Archetypes** render any spec: `src/templates/scenes.tsx` + `src/templates/primitives.tsx`.
- **All timing derives from measured audio.** Re-voicing re-syncs everything automatically.

---

## 6. How the two hardest problems were solved (don't regress these)

**A. Word-accurate sync (`src/beats.ts` → `anchorBeats`).**
Edge TTS returns per-**sentence** boundaries (not word). `scripts/lib/tts_edge.py` splits each
sentence's exact window proportionally into a **per-word timeline**, stored in each scene's
timings (`words[]`). At render time, `anchorBeats(scene, phrases, fps, opts)` fires each
reveal at the moment its keyword is spoken, with even-spacing fallback + monotonic ordering.
Each scene component derives keyword candidates from its own content (step labels, box
labels, note words, code identifiers).

- **Intro ticks**: use `startFrac` (a search floor) so a common word in the opening line
  (e.g. "variable") can't pull a tick early; ticks anchor to the "by the end you'll learn…"
  enumeration. **This is why the intro narration must enumerate the bullets in order.**
- **Example rows**: anchor to a *distinctive* word from each row's `note`, **excluding box
  labels** (which repeat across rows and would steal earlier anchors).

**B. Stepping value boxes (`src/templates/primitives.tsx` → `ValueBox`).**
A box shows the value from the **most recent trace update whose beat has passed**, popping on
each change — so a score visibly goes 0 → 10 → 15 instead of jumping to the final value.
`ExampleScene` passes each box its ordered `updates[]`. (Authoring: give intermediate steps
as separate trace rows, per the guide.)

---

## 7. Operational lessons (READ before long runs)

- **macOS idle sleep kills background jobs.** Always wrap long VO/render in
  **`caffeinate -ims`**. This bit us repeatedly until fixed.
- **Rendering is resumable:** `node scripts/render.mts --all --skip-existing`. Re-run after any
  interruption; it skips finished MP4s. A single mid-write kill can leave **one corrupt MP4**
  (0-duration) — `scripts/verify.mts` catches it; just re-render that id.
- **Regenerate the registry before rendering new ids:** `scripts/prepare-registry.mts` writes
  `src/registry.gen.ts` (imports every built spec+timings). `render.mts` bundles **once** at
  start, so ids voiced *after* the bundle won't render until you regenerate + re-run.
- **Auto-status pattern:** a persistent `Monitor` running a bash loop that prints one status
  line every 900s (each line → a chat notification) **and relaunches the render if dead**.
  See the scratchpad `status-loop.sh` pattern; `ScheduleWakeup` only fires when the session
  is active, so it's unreliable for idle-time pushes.
- **Edge TTS quirks:** the script filename must NOT be `edge_tts.py` (it shadows the pip
  package — we use `tts_edge.py`). SSML `<break>` tags do **not** work (they're escaped/
  mangled) — pacing is controlled only via the `--rate` flag. `voiceover.mts` retries each
  scene up to 4× on transient network blips.
- **ElevenLabs is abandoned** (free-tier quota of 40k chars is exhausted after ~1 video). The
  whole Section 1 would need ~570k characters — impractical on ElevenLabs. Edge TTS is free/
  unlimited. ⚠️ **Security:** an ElevenLabs key was once pasted into chat and written to
  `.env`; rotate/revoke it at https://elevenlabs.io/app/settings/api-keys. `.env` is gitignored.
- **No system `ffmpeg`** — Remotion bundles its own; use `npx remotion ffprobe` for probing.
  (Homebrew `ffmpeg`/`ffprobe` is present in some environments now — see the next point, which
  depends on it.)
- **Bundled-compositor `dyld` hang (macOS, sandboxed/no-network sessions):** if a render
  finishes "Rendering frames done" but then hangs forever with 0% CPU before any stitch
  progress, it's `node_modules/@remotion/compositor-darwin-arm64/{ffmpeg,ffprobe,remotion}`
  stuck at `_dyld_start` (confirm with `sample <pid> 2`) — those binaries carry a
  `com.apple.quarantine` xattr and macOS blocks on an online Gatekeeper/notarization check that
  can't complete without network egress. `xattr -dr com.apple.quarantine node_modules/@remotion/
  compositor-darwin-arm64/` did NOT fix it (the OS's `com.apple.provenance` tracking is separate
  and can't be stripped). **Working fix:** point Remotion at a hybrid binaries directory —
  the bundled `remotion` compositor binary is fine (only `ffmpeg`/`ffprobe` hang), so symlink
  system Homebrew `ffmpeg`/`ffprobe` alongside it:
  ```bash
  mkdir -p /tmp/remotion-bin-override
  ln -sf "$(pwd)/node_modules/@remotion/compositor-darwin-arm64/remotion" /tmp/remotion-bin-override/remotion
  ln -sf /opt/homebrew/bin/ffmpeg  /tmp/remotion-bin-override/ffmpeg
  ln -sf /opt/homebrew/bin/ffprobe /tmp/remotion-bin-override/ffprobe
  npx remotion render V001 out.mp4 --binaries-directory=/tmp/remotion-bin-override
  ```
  (`--binaries-directory` needs the whole trio present, not just ffmpeg/ffprobe — passing only
  `dirname $(which ffmpeg)` fails with `ENOENT ... stat '.../remotion'`.) Requires
  `brew install ffmpeg` if Homebrew ffmpeg isn't already present.
- **Homebrew ffmpeg version/codec gaps, once the hang above is fixed:** two more errors can
  surface with the hybrid `--binaries-directory` workaround, both from Homebrew ffmpeg not
  matching what Remotion 4.0.484 expects:
  1. `Error splitting the argument list: Option not found` on a `-filter_script:a` ffmpeg
     invocation — the newest Homebrew `ffmpeg` (9.x tested) dropped/changed this flag. Fix:
     `brew install ffmpeg@7` and point the override symlinks at
     `/opt/homebrew/opt/ffmpeg@7/bin/{ffmpeg,ffprobe}` instead of the default `ffmpeg@9`.
  2. `Error opening output files: Encoder not found` for `libfdk_aac` — Homebrew's ffmpeg build
     excludes the non-free `libfdk_aac` encoder Remotion hardcodes for `--audio-codec=aac`
     (`mapAudioCodecToFfmpegAudioCodecName` in `node_modules/@remotion/renderer/dist/options/
     audio-codec.js`). Fix: render with `--audio-codec=pcm-16`, which **requires the output
     file end in `.mov` or `.mkv`** (h264 + pcm-16 is not valid in `.mp4`), e.g.
     `npx remotion render V001 out.mov --binaries-directory=/tmp/remotion-bin-override
     --audio-codec=pcm-16`. A `.mov` output also silently switches Remotion's default video
     codec to ProRes (huge files, ~1.5 GB for a 5-minute 1080p video) — transcode back down
     afterward with system ffmpeg, which is unaffected by any of the above:
     `ffmpeg -i out.mov -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags
     faststart out.mp4`. Installing `ffmpeg@7` via brew can also leave the **default** `ffmpeg`/
     `ffprobe` on `PATH` broken (`dyld: Library not loaded: .../libx265.*.dylib` — a dependency
     relink side effect); use `/opt/homebrew/opt/ffmpeg@7/bin/ffprobe` explicitly rather than
     bare `ffprobe` until that's resolved (`brew reinstall ffmpeg` fixes it).

---

## 8. How to continue

### Re-render or tweak a Section 1 video
1. Edit `content/specs/V###.json` (follow `content/AUTHORING_GUIDE.md`), `npm run validate`.
2. `npm run voiceover -- V###` → `npm run registry` → `npm run render -- V###`.
3. Preview with `npm run studio`; verify with `npm run verify`.

### Produce Section 2, 3, or 4 (the big next step)
The pattern that worked for Section 1:
1. **Slice the CSV** for the section (mirror how `content/section1.json` + `content/groups.json`
   were produced — a small node script parsing `video_blueprint.csv`).
2. **Generalize the hardcoded bits** (currently Section-1-only):
   - `scripts/lib/paths.mts` reads `content/section1.json` and derives module/group ordering
     from it. Make it read the right section slice (e.g. parameterize by section, or load all
     rows). `outputDir()` already slugifies `section/module/group` generically — just feed it
     the right rows.
   - `scripts/validate.mts` and `voiceover.mts`/`render.mts` glob `content/specs/*.json` and
     `content/build/*.timings.json` — those already scale; just add the new specs.
3. **Author specs** one **topic group per subagent** (that's how 116 were authored fast and
   accurately). Give each agent: `content/AUTHORING_GUIDE.md`, a gold example
   (`content/specs/V001.json`), the group's rows, and the **quality bar in §4**. Insist on
   **correct worked-example traces** (verify the arithmetic) and the **intro-enumeration rule**.
   `npm run validate` must be 0 errors.
4. **Voice → registry → render → verify**, using `caffeinate -ims` + `--skip-existing`, with a
   Monitor loop for status. Expect ~5.5 min render per video (Section 1 took ~10 h wall-clock
   for 116; Sections 2–4 are much larger — budget accordingly).

> Note: Sections 2–4 may not all be "Pseudocode." Domain-Specific / Coding sections might want
> real-language code (the `code` scene supports segmented syntax) rather than pseudocode.
> Confirm the intended style with the user before authoring at scale.

---

## 9. Repo map (the files that matter)

| Path | What |
| --- | --- |
| `HANDOFF.md` | **This file** — context, decisions, expectations |
| `README.md` | Technical how-to, commands, pipeline diagram |
| `content/AUTHORING_GUIDE.md` | The content contract every spec follows |
| `video_blueprint.csv` | Source curriculum (all 4 sections) |
| `content/section1.json`, `content/groups.json` | Parsed Section 1 rows / 23 topic groups |
| `content/specs/V###.json` | 116 authored content specs |
| `content/build/V###.timings.json` | Generated per-scene timings + word timeline |
| `src/spec.ts` | Spec + timings TypeScript contract |
| `src/theme.ts` | Design system (palette, fonts) |
| `src/beats.ts` | Beat timing + **word-anchoring (sync engine)** |
| `src/templates/scenes.tsx` / `primitives.tsx` | Scene archetypes + shared UI |
| `src/VideoComposition.tsx`, `src/Root.tsx`, `src/registry.gen.ts` | Assembly + registration |
| `scripts/voiceover.mts` | Edge TTS + timings + SRT |
| `scripts/lib/tts_edge.py` | Free Edge neural TTS + per-word timeline |
| `scripts/prepare-registry.mts` | Regenerate `src/registry.gen.ts` |
| `scripts/render.mts` | Batch render (Node API, resumable) |
| `scripts/validate.mts` / `verify.mts` | Spec validation / rendered-output integrity |
| `output/Section_1_Pseudocode/…` | Final MP4s + SRTs in the hierarchy |
| `logo/zskillup logo.png`, `public/logo-white.png` | Brand logo (white version for dark theme) |

---

## 10. Environment / setup

- Node ≥ 22, `npm install`. Python 3 + `pip3 install edge-tts` (free TTS, needs internet).
- No API keys required. macOS `caffeinate` for long runs. Remotion 4.0.484.
- Music: *"Deliberate Thought" — Kevin MacLeod (incompetech.com), CC BY 4.0* — keep the
  attribution if publishing (`public/audio/music/`).

**One-line mental model:** *Author a JSON spec per video → Edge TTS gives audio + a per-word
timeline → Remotion archetypes render it with every reveal anchored to the spoken word →
resumable batch render into a clean hierarchy. Keep it ~5 min, beginner-friendly, code +
real-world + a correct worked example, opening by naming the topic.*

---

## 11. Visual redesign v2 (2026-09-17) — ground-up re-skin, engine untouched

The user asked for a complete visual/motion reinvention with **zero resemblance** to the
original look — the brief: current output read as a generic "AI-generated SaaS explainer"
template (navy + dot-grid + Sora + indigo/amber/teal pills), and needed to feel art-directed
and human-produced instead. Full brainstorm-and-approve process is in the session transcript;
this section is the durable record for continuing the work.

**What changed (the "skin" — fully replaced):**
- **Palette** (`src/theme.ts`): warm near-black ground (`#120E0A`/`#0B0805`, not navy) + a
  graded six-role system instead of three generic accents — gold (values/primitives), violet
  (control flow/logic), teal (structure/collections), crimson (change/risk), sage
  (resolved/correct), plus one sparing brand signature (ember) for chrome only.
- **Typography**: Instrument Serif (display, editorial-italic emphasis) + Instrument Sans
  (body) + IBM Plex Mono (code/chrome), replacing Sora/Inter/JetBrains Mono. Headlines set in
  serif, not a bold geometric sans.
- **Geometry**: sharp/near-zero corner radii (`radius.card/chip/code` = 2–3px), replacing the
  v1 pill/28px-rounded look.
- **Chrome**: scene mark is now a timecode-style `SC.0X — LABEL` (was a colored-dash pill), a
  bottom-right `0X / NN` frame counter was added (`SceneTiming.total`, injected by
  `VideoComposition.tsx`), captions are a bottom gradient scrim (film subtitles) instead of a
  floating pill, the watermark is smaller/quieter.
- **Background** (`src/components/Background.tsx`): asymmetric stage-light glows (ember +
  violet) + a **static pre-baked grain texture** (`public/textures/grain.png`, tiled via
  `mix-blend-mode: overlay`) replaced the v1 dot-grid. **Do not swap this for a live SVG
  `feTurbulence` filter** — that was tried first and made a 9,769-frame render stall for
  hours (Chromium recomputes the filter every frame with no caching). Static tile only.
- **No emoji anywhere in template-level chrome** (`src/components/Icons.tsx` has small SVG
  Check/Cross/ArrowRight/Warning marks instead of ✓/✗/⛔️/💡/⭐). Spec-authored `icon` fields
  (chips/steps/recap bullets) are intentionally no longer rendered — replaced with numbered
  index marks — to keep the frame free of decorative emoji; this only affects *rendering*, the
  116 existing spec JSON files were not touched and their `icon` values are simply unused now.
- **Motion** (`src/beats.ts` → `popIn`): retuned the spring config (damping 12→22, stiffness
  130→118) for a more restrained, confident settle instead of a bouncy "SaaS" pop.
  `anchorBeats`/`beatFrames`/`keywordsOf` — the actual sync engine — were **not touched**.

**What was deliberately preserved (the "engine"):**
- `src/beats.ts`'s word-accurate anchoring, `src/spec.ts`'s content contract (still
  `variable`/`constant`/`accent` — `theme.ts` just remaps those names to new hues via
  `colorOf()`), the 10-scene pedagogical arc, the whole voiceover→registry→render pipeline.
- The standalone pilot (`src/Main.tsx`, `src/components/{CodeBlock,KineticTitle,LabeledBox,
  SceneShell,Captions}.tsx`, `src/helpers.ts`) was **left alone** per §1 — it doesn't share
  code with `src/templates/*`, only `theme.ts`'s color object, which keeps legacy aliases
  (`colors.accent/variable/constant/danger/ok`) specifically so the pilot keeps compiling.

**Scope:** forward-only per the user's decision — targets Sections 2–4 (unbuilt). The 116
already-rendered Section 1 videos were **not** re-rendered; `V001` was used as the one
validation render (`output/_redesign_preview/V001_redesign_v1.mp4`) and is not part of the
section hierarchy.

**Known follow-up:** per-frame render cost is higher than v1 (more layered gradients/blend
modes) — budget accordingly before a large batch render, and re-profile if it matters at
Section 2–4 scale (617 videos).

> **§11 is superseded by §12** (v2's dark editorial skin was replaced by the v4 system below;
> the word-sync engine it describes is unchanged).

---

## 12. Design system v4 — "Proof" (2026-09-24) — the current pipeline

The user asked for a pipeline-wide (not per-video) leap to premium, authored 2D editorial
motion design. After several explored directions (a dark "night desk" variant and a
tabletop "model" prototype were tried and **rejected** — snapshots in `iterations/`), the
user chose the **light risograph "Proof"** version rendered in
`iterations/07_proof_motion/` as the reference. The source was restored byte-for-byte
from that render's bundle. Everything below is global — any spec rendered through the
pipeline gets it automatically.

**Concept.** Each lesson is a risograph-printed booklet being made on a desk in real time:
warm uncoated stock, near-black ink, five overprinting spot colours (orange, blue, sun,
teal, pink). Paper objects — cards, slips, tiles, sticky notes, prints — are dealt in with
real shadow physics, stamped, struck through; the camera travels across the desk.

**Brand.** On-screen brand is **Talha / Talha Affan** — the `TaMark` monogram
(`src/components/Logo.tsx`, animatable parts). *Not* the ZSkillup PNG.

**Voice & pace.** `en-US-EmmaMultilingualNeural`, rate −8%, pitch +2 Hz (chosen by prosody
audition, `iterations/voice_audition/`); a light "energy" pass ends invitations on "!";
true word boundaries with punctuation re-attached for captions. Needs the project venv:
`python3 -m venv .venv && .venv/bin/pip install edge-tts`. Pacing (slowed after the 07
review): narration rate `EDGE_RATE` (voiceover.mts), breathing room around each line
`SCHEDULE` and transition length `TX` (src/schedule.ts), and `PACE` (src/motion.ts), a
multiplier on every reveal/landing/stagger.

**Architecture.**
| File | Role |
| --- | --- |
| `src/schedule.ts` | Pure: `retime()` derives lead/tail per scene from measured VO; `planTransitions()` picks each scene's entry by meaning. Shared by Remotion and Node scripts. |
| `src/motion.ts` | Eases, `tw`, `camP/camV` (one velocity-matched camera curve shared by world + neighbouring scenes), `fitSize/estLines`, `SceneClock` (per-scene clock with pre/post-roll, freeze, thumb). |
| `src/templates/stage.tsx` | Desk `World`, `SceneFrame` (transitions, in-scene camera, chrome), `InkFlood`, riso `Poster`, `MusicBed` (VO-keyed duck), `Sfx`, paper physics. |
| `src/templates/primitives.tsx` | `MaskWords`, `PressPrint`, `Dealt`, `Stamp`, `PenStroke`, `loopPath`, `roleColor`. |
| `src/templates/scenes.tsx` | The ten archetypes. |
| `scripts/review.mts` | Director's stills + contact sheet (`--transitions` adds boundary frames). |
| `scripts/qa.mts` | Technical QA per MP4 (format, BT.709, frame count vs schedule, decode, black/frozen, −14 LUFS / −1 dBTP, clipping, poster, cuts inside transition windows, SRT). |
| `scripts/overflow.mts` | Robustness sweep: every scene of every spec, flags ink in margins/caption band. |
| `scripts/lib/master.mts` | Two-pass loudnorm (−14 LUFS, −1.5 dBTP) + BT.709 tags, video stream-copied. |
| `scripts/prep-textures.mts` | Generates the seamless paper stock texture. |

**Transitions (by meaning).** hook ← hard cut landing with a printer's thump (paper flash
+ decaying shake); definition/compare ← crane pan across the desk (both scenes on screen,
the camera lifts and rolls slightly mid-travel, directional blur, velocity-matched);
steps ← a fresh sheet is laid down angled and settles flat while the old page recedes
(steps→steps pans down); pseudocode/code ← portal through the chapter's rotating "0";
example ← slide or portal; mistake ← ink flood with splatter and a focus-pulled chapter
card; recap ← zoom-out from the last scene while the other prints are dealt onto a
contact sheet of the whole lesson.

**Scenes.** Intro: riso-printed title, lesson cards dealt as each point is spoken. Hook:
blue ink-roller band carries the payoff. Definition: giant term, definition slip, pinned
tags. Steps: index cards dealt (staggered, never an identical grid). Pseudocode: typeset
sheet typed line by line with a moving highlighter, sticky notes in their own column.
Example: tile trays + receipt-printer trace; values drop in, old tiles are plucked out;
RESULT stamp. Mistake: red-pen strike + WRONG, fix slip + FIXED. Recap: contact sheet with
grease-pencil loops, takeaway on an orange band, TA mark assembles.

**Sound.** Bed `public/audio/music/bed.mp3` (brag "Happy Beats Vol. 12", crossfaded to
~11.5 min, voice-band carved) ducked by an envelope from exact VO windows; paper & print
foley (Kenney CC0). Mastered to −14 LUFS. ⚠️ Verify ende.app's licence before publishing.

**Known follow-ups.** Render ≈ 12–20 fps (recap/example heaviest; ~150 placed SFX add
mixing time). Tray rows can overflow under captions when values are very long (seen on
V114) — a shrink-to-fit fix exists in the rejected night-desk branch
(`iterations/v4_proof_night_desk_src.tgz`). The WRONG/FIXED/RESULT stamp overlaps are
fixed (stamps sit on the slips' lower corners / hang off the receipt's torn edge).

---

## 13. Client module: MS-CSSD-15 Module 10 — Flexible Endoscope Reprocessing (2026-09-24)

Source: client PDF (MedSkills course MS-CSSD-15, Module 10). Brief: 5 animated videos × 3–4 min,
medical imagery, Indian English female VO. Decisions: on-screen brand **Talha** (Proof look),
**custom-drawn medical illustrations** (no stock/AI photos), split approved as below. Content
stays strictly within the PDF (no invented concentrations/times/brands).

| id | ep | video | assessment Q |
| --- | --- | --- | --- |
| V801 | 10.1 | Why Flexible Endoscopes Are Different (+ 8-step map) | new (HLD vs steam) |
| V802 | 10.2 | Bedside Pre-clean and the Leak Test | Q1 |
| V803 | 10.3 | Manual Cleaning and High-Level Disinfection | Q2 |
| V804 | 10.4 | Rinse, Dry, Store and the Duodenoscope Elevator | Q3, Q4 |
| V805 | 10.5 | Traceability, Surveillance and Pressure | Q5 (Q6 = the traceability example) |

Output: `output/MS_CSSD_15_CSSD_and_Sterilization_Practices/01_Module_10_…/01_…/M10_V#_*.mp4`
(+ `.srt`). Specs not in the CSV get their hierarchy from the spec itself (`scripts/lib/paths.mts`).

Engine additions (all generic, reusable for other medical/client modules):
- Spec fields: `episode` (on-screen EP mark), `voice` {name, rate, pitch} per video, `format:
  "short"` (validator targets 380–490 words ≈ 3.5–4 min), recap `signoff`, steps `startAt`.
- Scene `figure` (`src/templates/art.tsx` illustrations: scope, channels, biofilm, leaktest,
  elevator, drying, aer, sequence) — callouts reveal on the spoken `say` keyword with pen
  leaders + pins; art states (brush pass, bubbles, flow, elevator raise) are keyed to callouts.
- Scenes `check` (question + timed "pause and think", `SCHEDULE.checkTail`) → `answer`.
- Poster shows the first figure when a video has no worked example.
Voice: `en-IN-NeerjaExpressiveNeural`, rate +4% (≈130 wpm; −6% was 118 wpm → videos ran 4.6 min).
Samples: `iterations/16_endoscope_voice/`. Reviews: `iterations/16_endoscope_review/`.
PDF defects to flag to the client: §10.6/10.7 and the "Do not reprocess" box repeat 3–4× on
pp. 5–9; Figure 10.1's footnote overlaps the diagram.

**Render-only text bug (fixed 2026-09-25).** The first V801 delivery showed station numbers and
labels shifted/clipped in the 8-step diagram, varying frame to frame — but every still and
short clip looked correct. Cause: SVG `<text>` laid out against fallback-font metrics inside
some Chromium render tabs and never re-laid out. Fix: all art text moved to an HTML layer
(`ArtDef.Html`, rendered by `ArtView`); the portal numeral too. Prevention: `scripts/lint-art.mts`
(runs in `npm run validate`) rejects SVG text, and `scripts/consistency.mts` compares sampled
MP4 frames (every figure scene densely) against stills block-by-block — it flagged exactly the
broken scene on the old render and must pass before delivery.
