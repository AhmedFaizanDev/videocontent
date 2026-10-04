/**
 * Stage — the picture-first teaching scene, as pure data + maths (no remotion imports):
 * shared by the renderer (src/templates/StageView.tsx), the validator and the tests.
 *
 * A stage is one illustrated WORLD (drawn arts placed on a canvas larger than the frame)
 * and a list of BEATS. Each beat fires when its words are spoken (src/sync.ts) and applies
 * verbs: the camera travels to what is being explained, parts appear, act, get labelled on
 * the picture, particles travel, a loupe shows the micro view, a cross strikes the wrong
 * thing. The narration explains; the picture shows it happening.
 */

export type Target = string; // "layer" or "layer.anchor"
/** `fit: true` (charts, tables): the renderer sizes and centres the layer to fill the world — no hand-placed at/h. */
export type Layer = {id: string; art: string; data?: any; at: [number, number]; h: number; hidden?: boolean; fit?: boolean; /** with fit: the box this layer fills (src/stage.ts SLOTS) — compositions place 1–3 elements side by side */ slot?: Slot};
export type World = {w: number; h: number; layers: Layer[]};
/** Composition slots in the composition world (2400×1000, the stage view's shape): full; halves L/R; main ML/MR (60 %) beside a side SL/SR, split top/bottom as S?T/S?B. */
export type Slot = 'full' | 'L' | 'R' | 'ML' | 'MR' | 'SL' | 'SR' | 'SLT' | 'SLB' | 'SRT' | 'SRB';
export const slotBox = (slot: Slot | undefined, W: {w: number; h: number}): {x: number; y: number; w: number; h: number} => {
  const M = 60;
  const G = 80;
  const iw = W.w - 2 * M;
  const ih = W.h - 2 * M;
  const half = (iw - G) / 2;
  const main = Math.round((iw - G) * 0.6);
  const side = iw - G - main;
  const hh = (ih - G) / 2;
  const b: Record<Slot, [number, number, number, number]> = {
    full: [M, M, iw, ih],
    L: [M, M, half, ih],
    R: [M + half + G, M, half, ih],
    ML: [M, M, main, ih],
    MR: [M + side + G, M, main, ih],
    SL: [M, M, side, ih],
    SR: [M + main + G, M, side, ih],
    SLT: [M, M, side, hh],
    SLB: [M, M + hh + G, side, hh],
    SRT: [M + main + G, M, side, hh],
    SRB: [M + main + G, M + hh + G, side, hh],
  };
  const [x, y, w, h] = b[slot ?? 'full'] ?? b.full;
  return {x, y, w, h};
};
export type Beat = {
  say?: string[];
  camera?: {on: Target; zoom?: number} | 'overview';
  show?: string | string[];
  hide?: string | string[];
  label?: {on: Target; text: string} | {on: Target; text: string}[];
  note?: string;
  pulse?: Target | Target[];
  travel?: {along: Target[]; tone?: string; stream?: boolean; loop?: boolean};
  act?: Target | Target[];
  inset?: {of: Target; art: string; data?: any; act?: string[]; zoom?: number};
  cross?: Target;
  dim?: Target[] | false;
  /** a sound on this beat: a name, or {name, volume?, every? (frames), count?} to repeat it (a heartbeat, a monitor beep) */
  sfx?: string | SfxCue | (string | SfxCue)[];
  /** a hero line over the picture (chapter openers, the course title): large, centred, cinematic */
  title?: string;
  /** a white flash (a defibrillation, a revelation) */
  flash?: boolean;
};
export type SfxCue = {name: string; volume?: number; every?: number; count?: number};
export const SFX_NAMES = ['pan', 'push', 'cut', 'wipe', 'tick', 'roll', 'result', 'strike', 'title', 'logo', 'key1', 'key2', 'key3', 'drop', 'place', 'deal', 'stamp', 'chip', 'shove', 'fan', 'heartbeat', 'beep', 'flatline', 'charge', 'shock', 'boom', 'whoosh', 'riser', 'sting', 'drone', 'alarm', 'thud'];
/** `drift: -1` reverses the slow camera push between moves (the director alternates it so consecutive scenes don't breathe identically). */
/** `mood: 'dark'` sets the stage on deep navy (a cinematic cold open); default is the light house page. */
export type StageSpec = {world: World; beats: Beat[]; open?: Target; mood?: 'light' | 'dark'; /** hide the chapter slug (cinematic openers) */ bare?: boolean; /** the picture is already there on the first frame (no draw-on): scenes that cut into a running moment */ drawn?: boolean; drift?: 1 | -1};

/** The framing rectangle on the 1920×1080 frame (the world may bleed past it). */
export type View = {x: number; y: number; w: number; h: number};
export const viewFor = (title: boolean): View => ({x: 130, y: title ? 250 : 170, w: 1660, h: title ? 610 : 690});

/** What the renderer (ARTS) or validator (CATALOG) knows about an art. */
export type ArtInfo = {w: number; h: number; anchors: Record<string, [number, number]>};

export const arr = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
export const VERBS = ['camera', 'show', 'hide', 'label', 'note', 'pulse', 'travel', 'act', 'inset', 'cross', 'dim', 'sfx', 'title', 'flash'] as const;

/* ------------------------------------------------------------------ geometry */
export type Box = {x: number; y: number; w: number; h: number};
export const layerBox = (l: Layer, info: ArtInfo): Box => {
  const w = (l.h * info.w) / info.h;
  return {x: l.at[0] - w / 2, y: l.at[1] - l.h / 2, w, h: l.h};
};

/** World point of a target, and the box of a whole-layer target. */
export const resolve = (world: World, t: Target, info: (l: Layer) => ArtInfo | null): {pt: [number, number]; box?: Box} | null => {
  const [id, anchor] = t.split('.');
  const l = world.layers.find((x) => x.id === id);
  const a = l && info(l);
  if (!l || !a) return null;
  const b = layerBox(l, a);
  if (!anchor) return {pt: [b.x + b.w / 2, b.y + b.h / 2], box: b};
  const p = a.anchors[anchor];
  return p ? {pt: [b.x + (p[0] / a.w) * b.w, b.y + (p[1] / a.h) * b.h]} : null;
};

/* ------------------------------------------------------------------ camera */
/** World point at the view centre, and pixels per world unit. */
export type Cam = {cx: number; cy: number; s: number};

export const fitCam = (world: World, view: View): Cam => ({cx: world.w / 2, cy: world.h / 2, s: Math.min(view.w / world.w, view.h / world.h)});

/** The overview: frame what is on stage (the union of the visible layers' boxes, with a margin), never tighter than 2.5× the whole world. */
export const overviewCam = (world: World, view: View, boxes: Box[]): Cam => {
  const fit = fitCam(world, view);
  if (!boxes.length) return fit;
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  // frame everything on stage, even a layer that spills past the world's own bounds
  const s = Math.min(fit.s * 2.5, view.w / ((x1 - x0) * 1.2), view.h / ((y1 - y0) * 1.14));
  return {cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s};
};

const clampCentre = (world: World, view: View, c: Cam): Cam => {
  const hw = view.w / (2 * c.s);
  const hh = view.h / (2 * c.s);
  const cl = (v: number, half: number, size: number) => (size <= 2 * half ? size / 2 : Math.max(half, Math.min(size - half, v)));
  return {s: c.s, cx: cl(c.cx, hw, world.w), cy: cl(c.cy, hh, world.h)};
};

export const MAX_ZOOM = 4;
/** Where a beat's camera verb puts the camera (a whole layer fills ~75 % of the view; an anchor gets a 2× push). */
export const camFor = (world: World, view: View, cam: Beat['camera'], prev: Cam, where: (t: Target) => {pt: [number, number]; box?: Box} | null, overview?: Cam): Cam => {
  const fit = fitCam(world, view);
  if (!cam) return prev;
  if (cam === 'overview') return overview ?? fit;
  const r = where(cam.on);
  if (!r) return prev;
  // a whole layer fills ~75 % of the view, and is always a visible push in from the full world
  let s = cam.zoom ? fit.s * cam.zoom : r.box ? Math.max(fit.s * 1.2, Math.min(view.w / (r.box.w * 1.33), view.h / (r.box.h * 1.33))) : Math.max(prev.s, fit.s * 2);
  s = Math.max(fit.s, Math.min(fit.s * MAX_ZOOM, s));
  return clampCentre(world, view, {cx: r.pt[0], cy: r.pt[1], s});
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const LEG = {before: 8, dur: 34};
/**
 * Between camera moves the picture never freezes: the camera eases slowly in (up to DRIFT) over
 * each hold, and gives the push back smoothly during the next move — continuous, never a jump.
 * A multiplier on the camera scale at frame f.
 */
export const DRIFT = 0.08;
// sign -1 mirrors it (holds open slightly in and ease out) — never below the overview scale, so no page edge shows
export const driftAt = (f: number, keys: {f: number}[], sign: 1 | -1 = 1): number => (sign > 0 ? pushAt(f, keys) : 2 + DRIFT - pushAt(f, keys));
const pushAt = (f: number, keys: {f: number}[]): number => {
  const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const starts = [0, ...keys.map((k) => k.f - LEG.before + LEG.dur)];
  const moves = keys.map((k) => k.f - LEG.before);
  let i = 0;
  while (i < moves.length && f >= moves[i]) i++;
  // inside move i-1 (from moves[i-1] to starts[i]): the previous hold's push hands back to 0
  if (i > 0 && f < starts[i]) return 1 + DRIFT * (1 - ease((f - moves[i - 1]) / LEG.dur));
  const hs = starts[i];
  const he = i < moves.length ? moves[i] : hs + 300;
  return 1 + DRIFT * ease((f - hs) / Math.max(60, he - hs));
};
/** Camera at frame f: eased legs (log-scale zoom) that start just before each keyed beat and chain smoothly. */
export const camAt = (f: number, start: Cam, keys: {f: number; cam: Cam}[]): Cam => {
  const leg = (from: Cam, to: Cam, u: number): Cam => ({
    cx: from.cx + (to.cx - from.cx) * u,
    cy: from.cy + (to.cy - from.cy) * u,
    s: Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * u),
  });
  // `cur` is the camera at the moment leg i starts; a leg that starts before the previous
  // one lands takes over from wherever the camera is at that moment
  let cur = start;
  for (let i = 0; i < keys.length; i++) {
    const t0 = keys[i].f - LEG.before;
    if (f <= t0) return cur;
    const next = keys[i + 1] ? keys[i + 1].f - LEG.before : Infinity;
    const until = Math.min(f, next);
    cur = leg(cur, keys[i].cam, ease(Math.min(1, (until - t0) / LEG.dur)));
    if (f <= next) return cur;
  }
  return cur;
};

export const toScreen = (cam: Cam, p: [number, number], view: View): [number, number] => [view.x + view.w / 2 + (p[0] - cam.cx) * cam.s, view.y + view.h / 2 + (p[1] - cam.cy) * cam.s];

/* ------------------------------------------------------------------ labels */
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
/** Offsets tried in order: up-right first (reading direction), then the other sides. */
const DIRS: [number, number][] = [[1, -1], [1, 0], [-1, -1], [-1, 0], [1, 1], [-1, 1], [0, -1], [0, 1]];
/** Top-left of a label box pinned to screen point `pt`, clear of `taken` (other labels, loupes) and inside the view. */
export const placeLabel = (pt: [number, number], w: number, h: number, taken: Box[], view: View, gap = 70): Box => {
  let best: {b: Box; cost: number} | null = null;
  for (const [dx, dy] of DIRS) {
    const x = dx > 0 ? pt[0] + gap : dx < 0 ? pt[0] - gap - w : pt[0] - w / 2;
    const y = dy < 0 ? pt[1] - gap * 0.8 - h : dy > 0 ? pt[1] + gap * 0.8 : pt[1] - h / 2;
    const b = {x, y, w, h};
    const out = w * h - overlap(b, view);
    const cost = out * 4 + taken.reduce((n, t) => n + overlap(b, t), 0) + overlap(b, {x: pt[0] - 30, y: pt[1] - 30, w: 60, h: 60}) * 2;
    if (!best || cost < best.cost) best = {b, cost};
    if (cost === 0) break;
  }
  return best!.b;
};

/* ------------------------------------------------------------------ text */
export const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
/** Most words on screen at once (outside captions): title + the current note + labels since the last camera move. */
export const screenWords = (title: string | undefined, beats: Beat[]): number => {
  let labels = 0;
  let note = 0;
  let most = 0;
  for (const b of beats) {
    if (b.camera) labels = 0;
    labels += arr(b.label).reduce((n, l) => n + words(l.text), 0);
    if (b.note !== undefined) note = words(b.note);
    if (b.title !== undefined) note = words(b.title);
    most = Math.max(most, labels + note);
  }
  return words(title ?? '') + most;
};

/* ------------------------------------------------------------------ validation */
/** Human-readable problems with a stage; `art` answers for a known art name (anchors), null when unknown. */
export const stageProblems = (s: StageSpec, art: (name: string, data: any) => string[] | null): string[] => {
  const out: string[] = [];
  const w = s?.world;
  if (!w || typeof w.w !== 'number' || typeof w.h !== 'number' || w.w < 400 || w.h < 300 || w.w > 12000 || w.h > 8000) return ['world needs w (400–12000) and h (300–8000)'];
  const layers: Layer[] = Array.isArray(w.layers) ? w.layers : [];
  // a title card (an opener with no illustration) may be words alone
  if ((layers.length < 1 && !(s.beats ?? []).some((b: Beat) => b.title)) || layers.length > 18) out.push(`world needs 1–18 layers (has ${layers.length})`);
  const anchorsOf = new Map<string, Set<string>>();
  layers.forEach((l, i) => {
    if (typeof l?.id !== 'string' || !/^[a-z][\w-]*$/i.test(l.id)) return void out.push(`layers[${i}].id must be a word`);
    if (anchorsOf.has(l.id)) out.push(`duplicate layer id "${l.id}"`);
    const a = art(l.art, l.data ?? {});
    if (!a) out.push(`layers[${i}] (${l.id}): unknown art "${l.art}"`);
    anchorsOf.set(l.id, new Set(a ?? []));
    if (l.fit) return;
    if (!Array.isArray(l.at) || l.at.length !== 2 || l.at.some((n) => typeof n !== 'number')) out.push(`layers[${i}] (${l.id}).at must be [x, y]`);
    else if (l.at[0] < 0 || l.at[0] > w.w || l.at[1] < 0 || l.at[1] > w.h) out.push(`layers[${i}] (${l.id}).at is outside the world`);
    if (typeof l.h !== 'number' || l.h <= 0) out.push(`layers[${i}] (${l.id}).h must be > 0`);
  });
  const target = (t: any, where: string) => {
    if (typeof t !== 'string') return void out.push(`${where}: target must be "layer" or "layer.anchor"`);
    const [id, anchor] = t.split('.');
    if (!anchorsOf.has(id)) out.push(`${where}: unknown layer "${id}"`);
    else if (anchor && !anchorsOf.get(id)!.has(anchor)) out.push(`${where}: "${id}" has no anchor "${anchor}" (${[...anchorsOf.get(id)!].join(', ')})`);
  };
  const layerId = (id: any, where: string) => (typeof id === 'string' && anchorsOf.has(id) ? true : void out.push(`${where}: unknown layer "${id}"`));
  if (s.open !== undefined) target(s.open, 'open');
  const beats: Beat[] = Array.isArray(s.beats) ? s.beats : [];
  if (beats.length < 1 || beats.length > 16) out.push(`needs 1–16 beats (has ${beats.length})`);
  const shown = new Set<string>();
  beats.forEach((b, i) => {
    const at = `beats[${i}]`;
    if (!VERBS.some((v) => (b as any)[v] !== undefined && (b as any)[v] !== false)) out.push(`${at}: does nothing visible (use ${VERBS.join('/')})`);
    for (const k of Object.keys(b)) if (k !== 'say' && !(VERBS as readonly string[]).includes(k)) out.push(`${at}: unknown verb "${k}"`);
    if (b.say !== undefined && (!Array.isArray(b.say) || !b.say.length || b.say.some((x) => typeof x !== 'string'))) out.push(`${at}.say must be a list of spoken words`);
    if (!b.say && !arr(b.label).length) out.push(`${at}: needs "say" (the spoken word that fires it) or a label`);
    if (b.camera && b.camera !== 'overview') {
      target(b.camera.on, `${at}.camera`);
      if (b.camera.zoom !== undefined && !(b.camera.zoom >= 1 && b.camera.zoom <= 4)) out.push(`${at}.camera.zoom must be 1–4`);
    }
    for (const id of arr(b.show)) {
      if (layerId(id, `${at}.show`) && !layers.find((l) => l.id === id)!.hidden) out.push(`${at}.show: "${id}" is not hidden (only hidden layers are shown later)`);
      shown.add(id);
    }
    for (const id of arr(b.hide)) layerId(id, `${at}.hide`);
    for (const l of arr(b.label)) {
      target(l?.on, `${at}.label`);
      if (typeof l?.text !== 'string' || !l.text.trim()) out.push(`${at}.label.text missing`);
      else if (l.text.length > 28) out.push(`${at}.label "${l.text}" is ${l.text.length} chars (max 28 — put the explanation in the narration)`);
    }
    if (b.note !== undefined && (typeof b.note !== 'string' || b.note.length > 90)) out.push(`${at}.note must be ≤ 90 chars`);
    for (const t of arr(b.pulse)) target(t, `${at}.pulse`);
    for (const t of arr(b.act)) target(t, `${at}.act`);
    if (b.travel) {
      if (!Array.isArray(b.travel.along) || b.travel.along.length < 2) out.push(`${at}.travel.along needs ≥ 2 targets`);
      else b.travel.along.forEach((t) => target(t, `${at}.travel`));
    }
    if (b.inset) {
      target(b.inset.of, `${at}.inset.of`);
      if (!art(b.inset.art, b.inset.data ?? {})) out.push(`${at}.inset: unknown art "${b.inset.art}"`);
    }
    if (b.cross !== undefined) target(b.cross, `${at}.cross`);
    for (const c of arr(b.sfx)) {
      const n = typeof c === 'string' ? c : c?.name;
      if (!SFX_NAMES.includes(n)) out.push(`${at}.sfx: unknown sound "${n}" (${SFX_NAMES.join(', ')})`);
    }
    if (b.title !== undefined && (typeof b.title !== 'string' || b.title.length > 60)) out.push(`${at}.title must be ≤ 60 chars`);
    if (b.dim) arr(b.dim).forEach((t) => target(t, `${at}.dim`));
  });
  for (const l of layers) if (l.hidden && !shown.has(l.id)) out.push(`layer "${l.id}" is hidden but no beat shows it`);
  return out;
};
