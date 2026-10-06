# Graph Report - zskillup video content  (2026-09-17)

## Corpus Check
- 165 files · ~215,382 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 320 nodes · 746 edges · 13 communities (10 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 190,736 output

## Community Hubs (Navigation)
- Remotion Scene Components
- Spec Schema and Beat Timing
- Docs and Content Specs
- Caption and Path Utilities
- Package Dependencies
- ElevenLabs Voiceover Generator
- Spec Validator
- TypeScript Config
- Remotion Root and Registry
- Eleven TTS Library
- Edge TTS Library
- Brand Logo

## God Nodes (most connected - your core abstractions)
1. `remotion` - 22 edges
2. `CLAUDE.md — Project Entry Point` - 21 edges
3. `react` - 20 edges
4. `popIn()` - 20 edges
5. `README.md — Technical How-To` - 19 edges
6. `colors` - 18 edges
7. `popIn()` - 17 edges
8. `fonts` - 16 edges
9. `anchorBeats()` - 13 edges
10. `anchorFrame()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Word-Accurate Sync (anchorBeats)` --implements--> `anchorBeats()`  [EXTRACTED]
  HANDOFF.md → src/beats.ts
- `README.md — Technical How-To` --references--> `anchorBeats()`  [EXTRACTED]
  README.md → src/beats.ts
- `Spec Scene Types` --implements--> `ValueBox()`  [EXTRACTED]
  content/AUTHORING_GUIDE.md → src/templates/primitives.tsx
- `Stepping Value Boxes (ValueBox)` --implements--> `ValueBox()`  [EXTRACTED]
  HANDOFF.md → src/templates/primitives.tsx
- `Labeled Box / Locking Box Analogy` --semantically_similar_to--> `Video Scene Arc (intro to recap)`  [INFERRED] [semantically similar]
  script.md → content/AUTHORING_GUIDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Docs Jointly Describe the Spec-Driven Pipeline** — claude_entry_point, handoff_project_handoff, readme_readme, content_authoring_guide_guide, handoff_spec_driven_pipeline [INFERRED 0.85]
- **Word-Accurate Sync Engine Components** — handoff_word_accurate_sync, handoff_intro_enumeration_rule, handoff_stepping_value_boxes, src_beats_anchorbeats, content_authoring_guide_narration_rules [INFERRED 0.85]
- **Video Production Pipeline Stages** — video_blueprint_csv, content_specs_v001_spec, scripts_voiceover_module, scripts_prepare_registry, scripts_render_module [INFERRED 0.85]

## Communities (13 total, 2 thin omitted)

### Community 0 - "Remotion Scene Components"
Cohesion: 0.12
Nodes (45): react, remotion, Background(), Captions(), Kicker(), Watermark(), Annotation, CodeBlock() (+37 more)

### Community 1 - "Spec Schema and Beat Timing"
Cohesion: 0.09
Nodes (53): anchorBeats(), beatFrames(), easeIn(), keywordsOf(), normWord(), popIn(), sceneExit(), shake() (+45 more)

### Community 2 - "Docs and Content Specs"
Cohesion: 0.09
Nodes (46): CLAUDE.md — Project Entry Point, AUTHORING_GUIDE.md — Spec Authoring Contract, Spec Validator Hard Requirements, Narration Word-Count & Sync Rules, Pseudocode Keyword Convention, Spec Scene Types, Video Scene Arc (intro to recap), content/groups.json (23 topic groups) (+38 more)

### Community 3 - "Caption and Path Utilities"
Cohesion: 0.10
Nodes (35): music-metadata, Caption, captionsFromWords(), srtTime(), Word, FPS, groupOrder(), moduleOrder() (+27 more)

### Community 4 - "Package Dependencies"
Cohesion: 0.05
Nodes (36): dependencies, react, react-dom, remotion, @remotion/cli, @remotion/google-fonts, description, devDependencies (+28 more)

### Community 5 - "ElevenLabs Voiceover Generator"
Cohesion: 0.11
Nodes (16): Alignment, API_KEY, blocks, Caption, fail(), headers, manifest, md (+8 more)

### Community 6 - "Spec Validator"
Cohesion: 0.23
Nodes (13): argIds, checkScene(), checkSpec(), COLORS, err(), errors, isStr(), Issue (+5 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "Remotion Root and Registry"
Cohesion: 0.28
Nodes (6): Main(), READY, RemotionRoot(), renderScene(), VideoComposition(), VideoProps

### Community 10 - "Edge TTS Library"
Cohesion: 0.53
Nodes (5): main(), norm(), Free, high-quality neural TTS via Microsoft Edge (no API key, no quota). Reads…, Distribute a sentence's exact [start, start+dur] window across its words., split_sentence()

## Knowledge Gaps
- **101 isolated node(s):** `name`, `version`, `private`, `description`, `studio` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 114 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `music-metadata` connect `Caption and Path Utilities` to `Package Dependencies`, `ElevenLabs Voiceover Generator`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `README.md — Technical How-To` connect `Docs and Content Specs` to `Spec Schema and Beat Timing`, `Caption and Path Utilities`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `anchorBeats()` connect `Spec Schema and Beat Timing` to `Docs and Content Specs`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Remotion Scene Components` be split into smaller, more focused modules?**
  _Cohesion score 0.12374405076679006 - nodes in this community are weakly interconnected._
- **Should `Spec Schema and Beat Timing` be split into smaller, more focused modules?**
  _Cohesion score 0.09059029807130334 - nodes in this community are weakly interconnected._
- **Should `Docs and Content Specs` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._