/**
 * VideoSpec — the content contract for one explainer video.
 * A spec is pure content + narration; all on-screen timing is derived from the
 * measured ElevenLabs audio durations at build time (see scripts/generate-voiceover.mts).
 *
 * Every scene carries its exact `narration` line and a `kicker` label. The
 * renderer distributes each scene's visual "beats" across that scene's measured
 * voiceover length, so animation always stays in lockstep with the narration
 * without hand-tuning 116 videos.
 */

import type {StageSpec} from './stage';
import type {TxKind} from './schedule';

export type Segment = {t: string; c?: string};
export type CodeLineSpec = {segments: Segment[]; beat?: number};

export type IntroScene = {
  type: 'intro';
  kicker: string;
  narration: string;
  topic: string; // the concept/title — the big headline
  subtitle: string; // e.g. "Programming Fundamentals · Pseudocode"
  learn: string[]; // 2-4 "what you'll learn" bullets, revealed one per beat
};

export type HookScene = {
  type: 'hook';
  kicker: string;
  narration: string;
  headline: string; // kinetic, appears first
  question: string; // the punchy hook line, appears on beat
  highlight?: string[]; // words in headline to tint with the accent
  chips?: {icon: string; label: string}[]; // optional supporting chips
};

export type DefinitionScene = {
  type: 'definition';
  kicker: string;
  narration: string;
  term: string; // the word being defined (mono pill)
  plain: string; // the plain-English definition sentence (kinetic)
  highlight?: Record<string, string>; // word -> color for the definition
  chips?: {icon: string; label: string; say?: string[]}[];
};

export type StepsScene = {
  type: 'steps';
  kicker: string;
  narration: string;
  title?: string;
  steps: {icon?: string; label: string; detail?: string; say?: string[]}[]; // revealed one per beat (say: spoken anchor words)
  startAt?: number; // number the cards from startAt+1 (a list continued from the previous scene)
};

/**
 * The signature "worked example" visual: a row of labelled value-boxes plus a
 * watch panel that steps through the trace, updating box values live.
 */
export type ExampleScene = {
  type: 'example';
  kicker: string;
  narration: string;
  title?: string;
  boxes: {label: string; value: string; color?: 'variable' | 'constant' | 'accent'}[];
  // Each trace row is one beat. `set` updates box values; `highlight` names a box to pulse.
  trace: {note: string; set?: Record<string, string>; highlight?: string; result?: boolean; say?: string[]}[];
};

export type CodeScene = {
  type: 'code';
  kicker: string;
  narration: string;
  fileName?: string;
  lines: CodeLineSpec[];
  annotations?: {line: number; col: number; text: string; color: string; beat: number}[];
  highlights?: {line: number; fromBeat: number; toBeat?: number; color: string}[];
  error?: {line: number; beat: number; text: string};
  caption?: string;
};

export type PseudocodeScene = {
  type: 'pseudocode';
  kicker: string;
  narration: string;
  title?: string;
  lines: string[]; // plain pseudocode; keywords are auto-highlighted
  caption?: string;
  callouts?: {line: number; text: string; color?: string; beat?: number}[];
};

export type CompareScene = {
  type: 'compare';
  kicker: string;
  narration: string;
  question?: string;
  left: {keyword: string; title: string; color: 'variable' | 'constant' | 'accent'; items: {icon: string; label: string; say?: string[]}[]};
  right: {keyword: string; title: string; color: 'variable' | 'constant' | 'accent'; items: {icon: string; label: string; say?: string[]}[]};
  tip?: string;
};

export type MistakeScene = {
  type: 'mistake';
  kicker: string;
  narration: string;
  title?: string;
  wrong: {label: string; lines: string[]};
  right: {label: string; lines: string[]};
  note?: string;
};

export type RecapScene = {
  type: 'recap';
  kicker: string;
  narration: string;
  bullets: {icon: string; label: string; color?: 'variable' | 'constant' | 'accent'; say?: string[]}[];
  takeaway: string;
  signoff?: string; // outro line under the mark
};

/**
 * An animated illustration (src/templates/art) with labelled callouts, each revealed as
 * the narrator names it. `say` = the spoken keyword(s) that fire it (default: label words).
 */
export type FigureScene = {
  type: 'figure';
  kicker: string;
  narration: string;
  title?: string;
  /** an entry of src/art/catalog.ts: a generic diagram (cycle, flow, …) or a pack illustration */
  art: string;
  /** diagram input, e.g. {items: [{label, note?, say?}]} — see the catalog */
  data?: Record<string, unknown>;
  /** optional for diagrams (derived from data.items), required for pack illustrations */
  callouts?: {anchor: string; label: string; text?: string; say?: string[]}[];
  caption?: string;
};

/**
 * The picture-first teaching scene (src/stage.ts): one illustrated world the camera travels
 * through while beats — each fired by its spoken words — show, animate and label its parts.
 */
export type StageScene = StageSpec & {
  type: 'stage';
  kicker: string;
  narration: string;
  /** optional heading (≤ 60 chars); most stages carry their words as labels and notes */
  title?: string;
};

/**
 * The closing brand moment: an elegant animated logo reveal (icon, a heartbeat line drawn
 * through it, the wordmark, the signoff). Narration is one short line.
 */
/** The brand ident: a silent, fixed-length animated sting (default 3.2 s) that opens a video. */
export type IdentScene = {type: 'ident'; kicker: string; narration?: ''; seconds?: number};

export type OutroScene = {type: 'outro'; kicker: string; narration: string; /** line under the logo (default: project signoff) */ line?: string};

/** A picture beside a check/answer card: one art in its settled state, optionally acting. */
export type SceneVisual = {art: string; data?: any; act?: string[]};

/** Knowledge check: the question, then a silent thinking pause (the scene's long tail). */
export type CheckScene = {
  type: 'check';
  kicker: string;
  narration: string;
  question: string;
  visual?: SceneVisual;
};

/** The model answer to the preceding check. */
export type AnswerScene = {
  type: 'answer';
  kicker: string;
  narration: string;
  question: string;
  answer: string;
  /** a point may carry `say` like every other anchored item */
  points?: (string | {label: string; say?: string[]})[];
  visual?: SceneVisual;
};

export type Scene = (
  | IntroScene
  | StageScene
  | OutroScene
  | IdentScene
  | FigureScene
  | CheckScene
  | AnswerScene
  | HookScene
  | DefinitionScene
  | StepsScene
  | ExampleScene
  | CodeScene
  | PseudocodeScene
  | CompareScene
  | MistakeScene
  | RecapScene
) & {/** how this scene is entered, overriding the automatic choice: cut (with a flash), pan, slide, portal, flood, zoomout */ transition?: TxKind};

export type VideoSpec = {
  id: string; // e.g. "V001"
  section: string; // "Section 1: Pseudocode"
  module: string; // "Programming Fundamentals"
  topicGroup: string; // "Variables & Data Types"
  title: string; // human title
  outputFilename: string; // S1_V001_....mp4
  episode?: string; // on-screen episode mark (default: id without the V)
  voice?: {name: string; rate?: string; pitch?: string}; // per-video narrator override
  scenes: Scene[];
  /**
   * A running clock across scenes (1-based): starts at the narration of scene `from`, freezes
   * green at the start of scene `stop` (or at its beat `stopBeat`, 0-based), fades at scene `to`.
   */
  clock?: {from: number; stop: number; to: number};
  /** delivered before plans were required: the reason it has none (validate then skips the plan gate) */
  planExempt?: string;
  /** this lesson's own length, replacing the project's (e.g. a 60 s course intro among 5–7 min modules) */
  length?: {minutes: [number, number]; exact?: number; holds?: [number, number]};
};

// ---- Generated timing manifest (written by the voiceover script) ----
export type Caption = {text: string; start: number; end: number};
export type WordTime = {w: string; start: number; end: number};
export type SceneTiming = {
  index: number;
  type: Scene['type'];
  narration: string;
  audioFile: string;
  voDurationInSeconds: number;
  voDurationInFrames: number;
  leadFrames: number;
  tailFrames: number;
  durationInFrames: number;
  startFrame: number;
  captions: Caption[];
  words?: WordTime[]; // per-word timeline (seconds), used to anchor reveals to speech
  total?: number; // injected by VideoComposition — total scene count
  totalFrames?: number; // injected by VideoComposition — whole-video duration, for the progress rail
};
export type VideoTimings = {
  id: string;
  fps: number;
  totalDurationInFrames: number;
  voice: {id: string; name: string};
  scenes: SceneTiming[];
};
