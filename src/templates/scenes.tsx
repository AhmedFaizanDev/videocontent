import React from 'react';
import {useVideoConfig} from 'remotion';
import {brand, fonts, ink, inkSyntax, safe, spot, surface, tracking} from '../theme';
import {lh as lhS, ui} from '../lang';
import type {
  SceneTiming,
  IntroScene as IntroSpec,
  HookScene as HookSpec,
  DefinitionScene as DefSpec,
  StepsScene as StepsSpec,
  ExampleScene as ExampleSpec,
  CodeScene as CodeSpec,
  PseudocodeScene as PseudoSpec,
  CompareScene as CompareSpec,
  MistakeScene as MistakeSpec,
  RecapScene as RecapSpec,
  FigureScene as FigureSpec,
  CheckScene as CheckSpec,
  AnswerScene as AnswerSpec,
} from '../spec';
import {ARTS, ArtView, calloutsFor} from '../art';
import {overlaps, type TxPlan} from '../schedule';
import {anchorGroup, beatFrames, shake} from '../beats';
import {KEYWORDS, keywordsOf, revealGroups, splitTopic} from '../sync';
import {ADVANCE, E, clamp01, estLines, fitSize, mix, tw, useSceneFrame} from '../motion';
import {Dealt, Label, Mark, MaskWords, PenStroke, PressPrint, Rich, Rise, Rule, Stamp, loopPath, roleColor} from './primitives';
import {SceneFrame, Sfx, paperShadow, paperStyle} from './stage';
import {Logo, useProject} from './brand';

/** Brand-gradient fill for display numerals. */
const gradText: React.CSSProperties = {backgroundImage: brand.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'};

type P<T> = {scene: SceneTiming; spec: T; enter: TxPlan; exit: TxPlan | null; episode?: string};

/** Every reveal must hold ≥ 1.5 s before the scene leaves. */
const HOLD = 45;
const guard = (scene: SceneTiming, b: number) => Math.min(b, scene.durationInFrames - HOLD);
/** Structural reveals start inside the pre-roll when the scene arrives by camera move. */
const startOf = (enter: TxPlan) => (overlaps(enter) ? -10 : 2);

/** A value that steps between targets at given frames, easing each hop. */
const stepped = (f: number, beats: number[], targets: number[], initial: number, dur = 18, ease = E.inOut) => {
  let v = initial;
  for (let i = 0; i < beats.length; i++) {
    if (f < beats[i]) break;
    v = mix(v, targets[i], tw(f, beats[i], dur, ease));
  }
  return v;
};

const L = safe.left;
const TITLE_Y = 168;

const SceneTitle: React.FC<{text?: string; at: number; width?: number; max?: number}> = ({text, at, width = safe.width, max = 78}) =>
  text ? (
    <div style={{position: 'absolute', left: L, top: TITLE_Y}}>
      <MaskWords text={text} at={at} size={fitSize(text, width, 1, {max, min: 46, advance: ADVANCE.serif})} width={width} stagger={2} />
    </div>
  ) : null;

/** Callout bar: a white strip with a brand accent edge and a tag, carrying a footnote (tips, notes). */
const Tape: React.FC<{at: number; tag: string; tagColor: string; text: string; y: number}> = ({at, tag, tagColor, text, y}) => {
  const f = useSceneFrame();
  const p = tw(f, at, 16, E.out);
  const size = fitSize(text, 1480, 1, {max: 32, min: 24, advance: ADVANCE.sans});
  // never let the tape reach the caption band, whatever `y` the scene asks for
  const top = Math.min(y, safe.bottom - (size * lhS(1.25) + 30) - 6);
  return (
    <div
      style={{
        position: 'absolute',
        left: L,
        top,
        maxWidth: safe.width,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        background: '#fff',
        border: surface.border,
        borderLeft: `8px solid ${tagColor}`,
        borderRadius: 16,
        padding: '14px 28px 14px 22px',
        clipPath: `inset(-40px ${(1 - p) * 100}% -40px -40px)`,
        boxShadow: surface.shadow,
      }}
    >
      <span style={{fontFamily: fonts.label, fontWeight: 700, fontSize: 17, letterSpacing: tracking.label, textTransform: 'uppercase', color: '#fff', background: tagColor, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap'}}>{tag}</span>
      <span style={{fontFamily: fonts.body, fontWeight: 500, fontSize: size, lineHeight: lhS(1.25), color: ink.ink}}>
        <Rich text={text} />
      </span>
      <Sfx at={at} name="shove" volume={0.22} />
    </div>
  );
};

/* ================================================================== INTRO */
export const IntroScene: React.FC<P<IntroSpec>> = ({scene, spec, enter, exit, episode}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const D = scene.durationInFrames;
  const [head, tail] = splitTopic(spec.topic);
  let size = fitSize(spec.topic, 1600, 2, {max: 176, min: 92, advance: ADVANCE.serif});
  // the title grows upward from its baseline; keep its top (and the episode line above it) clear of the chrome
  while (estLines(spec.topic, 1640, size, ADVANCE.serif) * size * lhS(0.98) > 566 - 210 && size > 80) size -= 4;
  const G = revealGroups(spec);
  const spoken = anchorGroup(scene, G.title, fps, {start: 0.08, end: 0.2})[0];
  const titleAt = Math.min(Math.max(scene.leadFrames - 2, spoken - 4), scene.leadFrames + 90);
  const headWords = head.split(/\s+/).filter(Boolean).length;
  const learnLabelAt = guard(scene, beatFrames(scene, 1, {start: 0.34})[0]);
  const ticks = anchorGroup(scene, G.learn, fps, {start: 0.5, end: 0.92, minGapFrames: 18}).map((b) => guard(scene, b));
  const n = spec.learn.length;
  const colW = (safe.width - (n - 1) * 40) / n;
  const learnSize = Math.min(...spec.learn.map((l) => fitSize(l, colW - 130, 3, {max: 36, min: 26, advance: ADVANCE.sans})));
  const camS = mix(1, 1.03, E.inOut(clamp01(f / D)));
  const tint = tw(f, 0, 30, E.out);

  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{s: camS, ox: L, oy: 600}}>
      {/* the episode line sits just above the title's first line, however many lines the title takes */}
      <div style={{position: 'absolute', left: L, top: Math.max(140, Math.min(176, 566 - estLines(spec.topic, 1640, size, ADVANCE.serif) * size * lhS(0.98) - 50))}}>
        <Label text={`${useProject().brand.episodeLabel}${episode ?? ''} — ${spec.subtitle}`} at={6} color={ink.orangeText} size={22} />
      </div>
      <PressPrint at={titleAt} dur={24} style={{position: 'absolute', left: L, bottom: 1080 - 566, width: 1640}}>
        <MaskWords text={spec.topic} at={titleAt} size={size} width={1640} stagger={3} dur={24} lineHeight={0.98} accentFrom={tail ? headWords : undefined} accentColor={ink.orangeText} />
      </PressPrint>
      <Rule x={L} y={596} w={safe.width} h={3} at={3} dur={34} color={ink.paperShade} />
      <Rule x={L} y={594} w={220} h={7} at={8} dur={30} color={brand.magenta} />
      <div style={{position: 'absolute', right: 1920 - safe.right, top: 610}}>
        <Label text={ui('inThisLesson')} at={learnLabelAt} size={18} />
      </div>
      {spec.learn.map((l, i) => (
        <Dealt key={i} at={ticks[i]} x={L + i * (colW + 40)} y={650} w={colW} rot={[-1.4, 1.1, -0.6, 0.9][i % 4]} from={{dx: 180, dy: 560, rot: 9}} dur={22} style={{padding: '24px 28px', display: 'flex', gap: 22, alignItems: 'flex-start'}}>
          <div style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 56, lineHeight: 1, ...gradText, minWidth: 76}}>{String(i + 1).padStart(2, '0')}</div>
          <div style={{fontFamily: fonts.body, fontWeight: 500, fontSize: learnSize, lineHeight: lhS(1.26), color: ink.ink}}>
            <Rich text={l} />
          </div>
          <Sfx at={ticks[i]} name="deal" volume={0.26} />
          <Sfx at={ticks[i] + 12} name="place" volume={0.3} />
        </Dealt>
      ))}
      <Sfx at={titleAt} name="stamp" volume={0.34} />
    </SceneFrame>
  );
};

/* ================================================================== HOOK */
export const HookScene: React.FC<P<HookSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const W = 1600;
  let size = fitSize(spec.headline, W, 3, {max: 172, min: 76, advance: ADVANCE.serif});
  let qSize = fitSize(spec.question, 1560, 2, {max: 84, min: 52, advance: ADVANCE.serif});
  const measure = () => {
    const hl = estLines(spec.headline, W, size, ADVANCE.serif);
    const ql = estLines(spec.question, 1560, qSize, ADVANCE.serif);
    return {hl, ql, total: hl * size * 1.02 + 90 + ql * qSize * 1.12 + 48};
  };
  let m = measure();
  // the chip row below the question needs its own room above the captions
  const chipRoom = spec.chips?.length ? 70 : 0;
  while (m.total + chipRoom > 660 && size > 76) {
    size -= 6;
    qSize = Math.max(50, qSize - 2);
    m = measure();
  }
  const top = Math.max(190, 530 - m.total / 2);
  const qTop = top + m.hl * size * 1.02 + 90;
  const qH = m.ql * qSize * 1.12;
  const qAt = guard(scene, beatFrames(scene, 1, {start: 0.42})[0]);
  const hl = Object.fromEntries((spec.highlight ?? []).map((w) => [w, ink.orangeText]));
  const roll = tw(f, qAt - 6, 16, E.inOut);
  const punch = tw(f, qAt, 26, E.out);
  const q = /\?/.test(spec.headline + spec.question);
  const chipBeats = beatFrames(scene, Math.max(1, spec.chips?.length ?? 0), {start: 0.55, end: 0.85}).map((b) => guard(scene, b));

  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{s: 1 + 0.03 * punch, ox: L, oy: qTop}}>
      {q ? (
        <div data-audit="skip" style={{position: 'absolute', right: 40, top: -200, fontFamily: fonts.heading, fontWeight: 800, fontSize: 1000, lineHeight: 1, color: brand.magenta, opacity: 0.07 * tw(f, 0, 20)}}>?</div>
      ) : null}
      <div style={{position: 'absolute', left: L, top}}>
        <MaskWords text={spec.headline} at={1} size={size} width={W} stagger={3} dur={22} lineHeight={1.02} highlights={hl} marker />
      </div>
      <div style={{position: 'absolute', left: L - 44, width: safe.width + 88, top: qTop - 28, height: qH + 56, background: brand.gradient, borderRadius: 28, transformOrigin: 'left', transform: `scaleX(${roll})`, boxShadow: surface.shadowHi}} />
      <div style={{position: 'absolute', left: L, top: qTop}}>
        <MaskWords text={spec.question} at={qAt + 4} size={qSize} width={1560} weight={600} color="#fff" onDark stagger={2} lineHeight={1.12} />
      </div>
      {spec.chips?.length ? (
        <div style={{position: 'absolute', left: L, top: Math.min(qTop + qH + 60, safe.bottom - 52), display: 'flex', gap: 40}}>
          {spec.chips.map((c, i) => (
            <Rise key={i} at={chipBeats[i]}>
              <span style={{fontFamily: fonts.body, fontWeight: 500, fontSize: 26, color: ink.soft}}>
                <span style={{fontFamily: fonts.heading, fontWeight: 700, color: brand.magentaText}}>{String(i + 1).padStart(2, '0')}</span> <Rich text={c.label} />
              </span>
            </Rise>
          ))}
        </div>
      ) : null}
      <Sfx at={qAt - 6} name="pan" volume={0.28} />
      <Sfx at={qAt + 4} name="title" volume={0.3} />
    </SceneFrame>
  );
};

/* ================================================================== DEFINITION */
export const DefinitionScene: React.FC<P<DefSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const D = scene.durationInFrames;
  const s0 = startOf(enter);
  const termSize = fitSize(spec.term, safe.width, 1, {max: 250, min: 110, advance: ADVANCE.serif});
  const slipY = 200 + termSize * 1.04 + 26;
  const chips = spec.chips ?? [];
  const slipW = chips.length ? 1130 : 1500;
  let plainSize = fitSize(spec.plain, slipW - 96, 5, {max: 80, min: 38, advance: ADVANCE.serif});
  while (slipY + estLines(spec.plain, slipW - 96, plainSize, ADVANCE.serif) * plainSize * 1.16 + 80 > 862 && plainSize > 38) plainSize -= 2;
  const defAt = guard(scene, beatFrames(scene, 1, {start: 0.14})[0]);
  const chipBeats = anchorGroup(scene, revealGroups(spec).chips, fps, {start: 0.5, end: 0.9}).map((b) => guard(scene, b));
  const hl = Object.fromEntries(Object.entries(spec.highlight ?? {}).map(([k, v]) => [k, roleColor(v)]));
  const truck = mix(16, -16, E.inOut(clamp01(f / D)));

  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{x: truck}}>
      <div style={{position: 'absolute', left: L, top: 168}}>
        <Label text={ui('definition')} at={s0 - 2} color={ink.orangeText} size={20} />
      </div>
      <PressPrint at={s0 + 2} dur={22} style={{position: 'absolute', left: L, top: 196, width: safe.width}}>
        <MaskWords text={spec.term} at={s0 + 2} size={termSize} width={safe.width + 40} weight={700} color={brand.purpleText} stagger={3} dur={24} lineHeight={1.02} style={{whiteSpace: 'nowrap'}} />
      </PressPrint>
      <Dealt at={defAt - 12} x={L} y={slipY} w={slipW} rot={-0.7} from={{dx: -160, dy: 620, rot: -7}} dur={22} style={{padding: '36px 48px 40px'}}>
        <MaskWords text={spec.plain} at={defAt} size={plainSize} width={slipW - 96} stagger={1.6} dur={20} lineHeight={1.16} highlights={hl} marker />
        <Sfx at={defAt - 12} name="deal" volume={0.24} />
        <Sfx at={defAt} name="place" volume={0.28} />
      </Dealt>
      {chips.map((c, i) => (
        <Dealt
          key={i}
          at={chipBeats[i]}
          x={1320}
          y={slipY + 10 + i * Math.min(100, (840 - slipY) / Math.max(1, chips.length))}
          w={480}
          rot={[1.6, -1.3, 0.9, -1.7, 1.2][i % 5]}
          from={{dx: 420, dy: 60, rot: 12}}
          dur={18}
          style={{padding: '20px 24px 20px 58px', fontFamily: fonts.body, fontWeight: 600, fontSize: 28, lineHeight: lhS(1.2), color: ink.ink}}
        >
          <div style={{position: 'absolute', left: 20, top: '50%', width: 16, height: 16, marginTop: -8, borderRadius: 8, background: brand.gradient}} />
          <Rich text={c.label} />
          <Sfx at={chipBeats[i]} name="place" volume={0.22} />
        </Dealt>
      ))}
    </SceneFrame>
  );
};

/* ================================================================== STEPS */
export const StepsScene: React.FC<P<StepsSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const D = scene.durationInFrames;
  const beats = anchorGroup(scene, revealGroups(spec).steps, fps, {start: 0.1, end: 0.82}).map((b) => guard(scene, b));
  const n = spec.steps.length;
  const active = beats.reduce((a, b, i) => (f >= b ? i : a), -1);
  const top = spec.title ? 300 : 220;
  const drift = mix(8, -8, clamp01(f / D));
  const rots = [-1.6, 1.2, -0.8, 1.5, -1.1, 0.7];
  // where each card will land: shown as a faint numbered placeholder until it arrives (the
  // viewer sees how many steps are coming, and the next one breathes while it's introduced)
  const slots: {x: number; y: number; w: number; h: number}[] = [];

  let cards: React.ReactNode;
  if (n <= 3) {
    const colW = n === 1 ? 900 : n === 2 ? 780 : 530;
    const gap = n === 2 ? 60 : 44;
    const labelSize = Math.min(...spec.steps.map((s) => fitSize(s.label, colW - 72, 2, {max: 74, min: 38, advance: ADVANCE.serif})));
    const cardH = Math.min(860 - top, Math.max(400, ...spec.steps.map((s) => 60 + 190 * 0.82 + 45 + estLines(s.label, colW - 72, labelSize, ADVANCE.serif) * labelSize * 1.06 + (s.detail ? 16 + estLines(s.detail, colW - 72, 34, 0.47) * 34 * 1.3 : 0) + 20)));
    spec.steps.forEach((_, i) => slots.push({x: L + i * (colW + gap), y: top, w: colW, h: cardH}));
    cards = spec.steps.map((s, i) => (
      <Dealt key={i} at={beats[i]} x={L + i * (colW + gap)} y={top} w={colW} h={cardH} rot={rots[i]} lift={i === active ? 0.28 : 0} from={{dx: 520 - i * 90, dy: 720, rot: 16}} style={{padding: '30px 36px'}}>
        <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 150, lineHeight: 0.9, letterSpacing: '-0.04em', ...gradText}}>{String(i + 1 + (spec.startAt ?? 0)).padStart(2, '0')}</div>
        <div style={{height: 5, width: 80, borderRadius: 3, background: ink.paperShade, margin: '24px 0 22px'}} />
        <MaskWords text={s.label} at={beats[i] + 6} size={labelSize} width={colW - 72} stagger={2} lineHeight={1.06} />
        {s.detail ? (
          <Rise at={beats[i] + 12} style={{marginTop: 16, fontFamily: fonts.body, fontSize: 32, lineHeight: lhS(1.3), color: ink.soft}}>
            <Rich text={s.detail} />
          </Rise>
        ) : null}
        <Sfx at={beats[i]} name="deal" volume={0.26} />
        <Sfx at={beats[i] + 14} name="place" volume={0.3} />
      </Dealt>
    ));
  } else {
    // A spread of index cards laid by hand: brick-staggered rows, the short row centred,
    // each card at its own angle, sized to its content (never an identical grid).
    const cols = n === 4 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const cw = n === 4 ? 800 : 530;
    const labelSize = Math.min(56, ...spec.steps.map((s) => fitSize(s.label, cw - 190, 2, {max: 56, min: 32, advance: ADVANCE.serif})));
    const cardH = (s: StepsSpec['steps'][number]) =>
      56 + Math.max(120, estLines(s.label, cw - 190, labelSize, ADVANCE.serif) * labelSize * 1.06 + (s.detail ? 12 + estLines(s.detail, cw - 190, 30, 0.47) * 30 * 1.28 : 0));
    const rowTop = (r: number) => top + r * ((860 - top) / rows);
    cards = spec.steps.map((s, i) => {
      const r = Math.floor(i / cols);
      const inRow = Math.min(cols, n - r * cols);
      const c = i % cols;
      const span = inRow * cw + (inRow - 1) * 36;
      const x0 = L + (safe.width - span) / 2 + (r % 2 ? 40 : -40);
      const jitterY = [0, 22, -10, 16, -6, 12][i % 6];
      slots.push({x: x0 + c * (cw + 36), y: rowTop(r) + jitterY, w: cw, h: cardH(s)});
      return (
        <Dealt
          key={i}
          at={beats[i]}
          x={x0 + c * (cw + 36)}
          y={rowTop(r) + jitterY}
          w={cw}
          h={cardH(s)}
          rot={rots[i] * 1.2}
          lift={i === active ? 0.3 : 0}
          from={{dx: 460, dy: 640, rot: 14}}
          style={{padding: '24px 28px', display: 'flex', gap: 22, zIndex: i === active ? 5 : 1}}
        >
          <div style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 90, lineHeight: 0.95, letterSpacing: '-0.04em', ...gradText, minWidth: 140, flexShrink: 0}}>{String(i + 1 + (spec.startAt ?? 0)).padStart(2, '0')}</div>
          <div>
            <MaskWords text={s.label} at={beats[i] + 6} size={labelSize} width={cw - 190} stagger={2} lineHeight={1.06} />
            {s.detail ? (
              <Rise at={beats[i] + 12} style={{marginTop: 12, fontFamily: fonts.body, fontSize: 29, lineHeight: lhS(1.28), color: ink.soft}}>
                <Rich text={s.detail} />
              </Rise>
            ) : null}
          </div>
          <Sfx at={beats[i]} name="deal" volume={0.24} />
          <Sfx at={beats[i] + 14} name="place" volume={0.28} />
        </Dealt>
      );
    });
  }
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{y: drift}}>
      <SceneTitle text={spec.title} at={startOf(enter)} />
      {slots.map((g, i) =>
        f < beats[i] + 12 ? (
          <div
            key={`ghost${i}`}
            data-audit="skip"
            style={{
              position: 'absolute',
              left: g.x,
              top: g.y,
              width: g.w,
              height: g.h,
              borderRadius: surface.radius,
              border: '2px dashed rgba(122,36,161,0.22)',
              padding: '24px 30px',
              fontFamily: fonts.heading,
              fontWeight: 800,
              fontSize: 64,
              lineHeight: 1,
              color: 'rgba(122,36,161,0.16)',
              opacity: tw(f, startOf(enter) + 6 + i * 3, 14) * (1 - tw(f, beats[i], 10)) * (i === active + 1 ? 0.8 + 0.2 * Math.sin(f / 8) : 0.7),
            }}
          >
            {String(i + 1 + (spec.startAt ?? 0)).padStart(2, '0')}
          </div>
        ) : null,
      )}
      {cards}
    </SceneFrame>
  );
};

/* ================================================================== CODE SHEET (shared) */
type Tok = {t: string; c: string};
type SheetLine = {tokens: Tok[]; at: number; indent?: number};



const tokenizeLine = (line: string): Tok[] => {
  const out: Tok[] = [];
  const cIdx = line.search(/\/\/|#/);
  const code = cIdx >= 0 ? line.slice(0, cIdx) : line;
  const comment = cIdx >= 0 ? line.slice(cIdx) : '';
  for (const p of code.split(/(\s+|[()[\]{},]|<=|>=|==|!=|<-|→|[+\-*/=<>])/)) {
    if (p === '') continue;
    if (/^\s+$/.test(p)) out.push({t: p, c: inkSyntax.text});
    else if (KEYWORDS.has(p.toLowerCase())) out.push({t: p, c: inkSyntax.keyword});
    else if (/^["'].*["']$/.test(p)) out.push({t: p, c: inkSyntax.string});
    else if (/^-?\d+\.?\d*$/.test(p)) out.push({t: p, c: inkSyntax.value});
    else if (/^(<-|→|[+\-*/=<>]|<=|>=|==|!=)$/.test(p)) out.push({t: p, c: inkSyntax.op});
    else if (/^[A-Z_]{2,}$/.test(p)) out.push({t: p, c: inkSyntax.constant});
    else out.push({t: p, c: inkSyntax.text});
  }
  if (comment) out.push({t: comment, c: inkSyntax.comment});
  return out;
};


const sheetDims = (lines: SheetLine[], maxW: number, maxH: number) => {
  const chars = Math.max(...lines.map((l) => (l.indent ?? 0) + l.tokens.reduce((n, t) => n + t.t.length, 0)), 12);
  const fs = Math.min(46, (maxH - 84 - 64) / lines.length / 1.6, (maxW - 250) / (chars * ADVANCE.mono));
  return {fs, chars, w: Math.min(maxW, Math.max(980, 170 + chars * ADVANCE.mono * fs + 70)), h: 84 + 64 + lines.length * fs * 1.6};
};

/**
 * The listing: a typeset page on the desk. Lines are typed as they're narrated and the
 * current line gets a fluorescent highlighter swipe that moves down with the reading.
 */
const CodeSheet: React.FC<{lines: SheetLine[]; title?: string; tag: string; x: number; top: number; maxW: number; maxH: number; lineTint?: (i: number) => string | undefined; errorLine?: {line: number; at: number}}> = ({
  lines,
  title,
  tag,
  x,
  top,
  maxW,
  maxH,
  lineTint,
  errorLine,
}) => {
  const f = useSceneFrame();
  const {fs, w} = sheetDims(lines, maxW, maxH);
  const lh = fs * 1.6;
  const active = lines.reduce((a, l, i) => (f >= l.at ? i : a), -1);
  const errShake = errorLine ? shake(f, errorLine.at, 10) : 0;
  return (
    <div style={{position: 'absolute', left: x, top, width: w, ...paperStyle(ink.paperLight), borderRadius: surface.radius, border: surface.border, boxShadow: paperShadow(0.18), transform: `translateX(${errShake}px)`}}>
      <div style={{height: 84, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: `1px solid ${ink.paperShade}`}}>
        <div style={{fontFamily: fonts.heading, fontWeight: 600, fontSize: 34, color: ink.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: w - 340}}>{title ?? ''}</div>
        <div style={{fontFamily: fonts.mono, fontSize: 18, letterSpacing: tracking.label, color: ink.soft}}>
          {tag} · {lines.length} {ui('lines')}
        </div>
      </div>
      <div style={{position: 'relative', padding: '32px 40px'}}>
        {lines.map((l, i) => {
          const total = l.tokens.reduce((n, t) => n + t.t.length, 0);
          const typed = Math.max(0, Math.min(total, Math.floor((f - l.at) * Math.max(2.4, total / 11))));
          const isErr = errorLine && errorLine.line === i && f >= errorLine.at;
          const on = i === active;
          const swipe = on ? tw(f, l.at + 2, 10, E.inOut) : 0;
          const textW = ((l.indent ?? 0) + total) * ADVANCE.mono * fs + 28;
          const tint = lineTint?.(i);
          let used = 0;
          return (
            <div key={i} style={{position: 'relative', height: lh, display: 'flex', alignItems: 'center', fontFamily: fonts.mono, fontSize: fs, whiteSpace: 'pre'}}>
              <div style={{position: 'absolute', left: 64, top: lh * 0.14, height: lh * 0.72, width: textW * swipe, background: isErr ? 'rgba(215,38,61,0.35)' : tint ? `${tint}44` : 'rgba(244,180,0,0.55)', mixBlendMode: 'multiply', borderRadius: 3}} />
              <span style={{width: 64, fontSize: fs * 0.58, color: on ? ink.orangeText : ink.faint, position: 'relative'}}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{paddingLeft: (l.indent ?? 0) * fs * ADVANCE.mono, position: 'relative'}}>
                {l.tokens.map((t, ti) => {
                  const vis = Math.max(0, Math.min(t.t.length, typed - used));
                  used += t.t.length;
                  return (
                    <span key={ti} style={{color: t.c}}>
                      {t.t.slice(0, vis)}
                    </span>
                  );
                })}
                {f >= l.at && typed < total ? <span style={{display: 'inline-block', width: fs * 0.55, height: fs * 1.05, background: ink.ink, verticalAlign: 'middle'}} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** A sticky note slapped onto the page: tape strip, slight angle, real shadow. */
const Sticky: React.FC<{at: number; x: number; y: number; w: number; tag: string; children: React.ReactNode; color?: string}> = ({at, x, y, w, tag, children, color = '#FFF4CC'}) => (
  <Dealt at={at} x={x} y={y} w={w} rot={2.4} from={{dx: 140, dy: -520, rot: -12}} dur={20} bg={color} style={{padding: '40px 34px 34px'}}>
    <div style={{fontFamily: fonts.label, fontWeight: 700, fontSize: 17, letterSpacing: tracking.label, textTransform: 'uppercase', color: ink.soft, marginBottom: 12}}>{tag}</div>
    <div style={{fontFamily: fonts.body, fontSize: 30, lineHeight: lhS(1.3), color: ink.ink}}>{children}</div>
    <Sfx at={at + 10} name="place" volume={0.3} />
  </Dealt>
);

/** Notes always get their own column beside the sheet (the sheet is sized to leave it). */
const NOTE_COL = 500;
const placeNotes = (dims: {w: number; h: number}, top: number, n = 1) => {
  // Notes stack down the column; when there are many they overlap like a pile (each still
  // shows its tag and first line), never running past the caption line.
  const pitch = n <= 1 ? 0 : Math.min(250, (850 - 190 - (top + 20)) / (n - 1));
  return (i: number) => ({x: L + dims.w + 56 + (i % 2) * 14, y: top + 20 + i * pitch, w: Math.min(NOTE_COL, safe.right - (L + dims.w + 56) - 14)});
};

/* ================================================================== PSEUDOCODE */
export const PseudocodeScene: React.FC<P<PseudoSpec>> = ({scene, spec, enter, exit}) => {
  const {fps} = useVideoConfig();
  const beats = anchorGroup(scene, revealGroups(spec).lines, fps, {start: 0.08, end: 0.8}).map((b) => guard(scene, b));
  const lines: SheetLine[] = spec.lines.map((l, i) => ({tokens: tokenizeLine(l.trimStart()), at: beats[i], indent: Math.round((l.length - l.trimStart().length) / 2)}));
  const notes = [...(spec.caption ? [{tag: ui('takeaway'), text: spec.caption, at: guard(scene, beats[beats.length - 1] + 20)}] : [])];
  const calloutBeats = beatFrames(scene, Math.max(1, spec.callouts?.length ?? 0), {start: 0.4, end: 0.86});
  (spec.callouts ?? []).forEach((c, i) => notes.push({tag: `${ui('line')} ${c.line}`, text: c.text, at: guard(scene, c.beat !== undefined ? beats[Math.min(c.beat, beats.length - 1)] : calloutBeats[i])}));
  const maxW = notes.length ? safe.width - NOTE_COL - 56 : safe.width;
  const maxH = 872 - 190;
  const dims = sheetDims(lines, maxW, maxH);
  const top = 176 + Math.max(0, (872 - 176 - dims.h) * 0.4);
  const at = placeNotes(dims, top, notes.length);
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit}>
       <CodeSheet lines={lines} title={spec.title} tag={ui('pseudocode')} x={L} top={top} maxW={maxW} maxH={maxH} />
      {notes.map((n, i) => (
        <Sticky key={i} at={n.at} {...at(i)} tag={n.tag}>
          {n.text}
        </Sticky>
      ))}
      {lines.map((l, i) => (
        <Sfx key={i} at={l.at} name={(['key1', 'key2', 'key3'] as const)[i % 3]} volume={0.22} />
      ))}
    </SceneFrame>
  );
};

/* ================================================================== CODE (segmented, real-language ready) */
export const CodeScene: React.FC<P<CodeSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const nBeats = Math.max(spec.lines.length, ...(spec.annotations ?? []).map((a) => a.beat + 1), ...(spec.highlights ?? []).map((h) => (h.toBeat ?? h.fromBeat) + 1), spec.error ? spec.error.beat + 1 : 0);
  const beats = beatFrames(scene, nBeats, {start: 0.08, end: 0.8}).map((b) => guard(scene, b));
  const beatAt = (b: number) => beats[Math.min(b, beats.length - 1)] ?? scene.leadFrames;
  const lines: SheetLine[] = spec.lines.map((l, i) => ({tokens: l.segments.map((s) => ({t: s.t, c: s.c ? roleColor(s.c) : ink.ink})), at: beatAt(l.beat ?? i)}));
  const notes = [
    ...(spec.annotations ?? []).map((a) => ({tag: `${ui('line')} ${a.line + 1}`, text: a.text, at: beatAt(a.beat), err: false})),
    ...(spec.error ? [{tag: ui('error'), text: spec.error.text, at: beatAt(spec.error.beat) + 4, err: true}] : []),
    ...(spec.caption ? [{tag: ui('takeaway'), text: spec.caption, at: guard(scene, beats[beats.length - 1] + 20), err: false}] : []),
  ];
  const maxW = notes.length ? safe.width - NOTE_COL - 56 : safe.width;
  const maxH = 872 - 190;
  const dims = sheetDims(lines, maxW, maxH);
  const top = 176 + Math.max(0, (872 - 176 - dims.h) * 0.4);
  const at = placeNotes(dims, top, notes.length);
  const lineTint = (i: number) => {
    const h = (spec.highlights ?? []).find((x) => x.line === i && f >= beatAt(x.fromBeat) && (x.toBeat === undefined || f < beatAt(x.toBeat)));
    return h ? roleColor(h.color) : undefined;
  };
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit}>
      <CodeSheet lines={lines} title={spec.fileName} tag={ui('code')} x={L} top={top} maxW={maxW} maxH={maxH} lineTint={lineTint} errorLine={spec.error ? {line: spec.error.line, at: beatAt(spec.error.beat)} : undefined} />
      {notes.map((n, i) => (
        <Sticky key={i} at={n.at} {...at(i)} tag={n.tag} color={n.err ? '#FDE2E7' : undefined}>
          {n.text}
        </Sticky>
      ))}
      {spec.error ? <Sfx at={beatAt(spec.error.beat)} name="stamp" volume={0.4} /> : null}
      {lines.map((l, i) => (
        <Sfx key={i} at={l.at} name={(['key1', 'key2', 'key3'] as const)[i % 3]} volume={0.22} />
      ))}
    </SceneFrame>
  );
};

/* ================================================================== WORKED EXAMPLE */
const zigzag = (w: number, h: number) => {
  const teeth = Math.round(w / 22);
  const pts = ['0px 0px', `${w}px 0px`, `${w}px ${h - 8}px`];
  for (let i = teeth; i >= 0; i--) pts.push(`${((i / teeth) * w).toFixed(1)}px ${i % 2 ? h : h - 8}px`);
  return `polygon(${pts.join(', ')})`;
};

/**
 * Type-case trays hold one paper tile per variable; every assignment plucks the old tile
 * out and drops a new one in. The trace comes off a receipt printer, one line per step.
 */
export const ExampleScene: React.FC<P<ExampleSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const s0 = startOf(enter);
  const beats = anchorGroup(scene, revealGroups(spec).trace, fps, {start: 0.12, end: 0.84}).map((b) => guard(scene, b));
  const active = beats.reduce((a, b, i) => (f >= b ? i : a), -1);

  // ---- trays
  const AREA = 1010;
  const show = (v: string) => v.replace(/\\n/g, '\n');
  const nb = spec.boxes.length;
  const CS = nb <= 2 ? {font: 112, h: 232, min: 460} : nb <= 4 ? {font: 88, h: 196, min: 340} : {font: 72, h: 176, min: 290};
  const GAP = 30;
  const cells = spec.boxes.map((b) => {
    const values = [b.value, ...spec.trace.flatMap((r) => (r.set && r.set[b.label] !== undefined ? [r.set[b.label]] : []))];
    const vLines = values.map((v) => show(v).split('\n'));
    const maxLen = Math.max(...vLines.flat().map((l) => l.length), 1);
    const maxRows = Math.max(...vLines.map((l) => l.length), 1);
    const w = Math.round(Math.min(AREA, Math.max(CS.min, maxLen * ADVANCE.mono * CS.font + 90, b.label.length * 13 + 60)));
    const updates = spec.trace.flatMap((r, i) => (r.set && r.set[b.label] !== undefined ? [{at: beats[i], value: r.set[b.label]}] : []));
    return {...b, w, fs: Math.round(Math.min(CS.font, (w - 60) / (maxLen * ADVANCE.mono), (CS.h - 40) / (maxRows * 1.15))), updates};
  });
  const rows: (typeof cells)[] = [];
  for (const c of cells) {
    const row = rows[rows.length - 1];
    if (row && row.reduce((n, x) => n + x.w + GAP, 0) + c.w <= AREA) row.push(c);
    else rows.push([c]);
  }
  const PITCH = 40 + CS.h + 34;
  const trayTop = spec.title ? 292 : 220;
  const pos = new Map<string, {x: number; y: number; w: number}>();
  rows.forEach((row, ri) => {
    let x = L;
    for (const c of row) {
      pos.set(c.label, {x, y: trayTop + ri * PITCH, w: c.w});
      x += c.w + GAP;
    }
  });

  // ---- receipt printer
  // right edge stays ≥ 50px inside the safe box: the focus camera leans in by a few %
  const PX = 1150;
  const PW = 620;
  const PY = trayTop - 4;
  const NOTE = 29;
  const rowH = spec.trace.map((r) => 26 + estLines(r.note, PW - 150, NOTE, 0.46) * NOTE * 1.3);
  const printed = spec.trace.map((_, i) => tw(f, beats[i], 9, E.out));
  const feed = printed.reduce((s, p, i) => s + p * rowH[i], 0);
  const stripMax = 866 - (PY + 58);
  const stripLen = Math.min(stripMax, 24 + feed + 20);
  const hlLabel = (i: number) => spec.trace[i]?.highlight ?? Object.keys(spec.trace[i]?.set ?? {})[0];
  const resultIdx = spec.trace.findIndex((r) => r.result);

  // ---- camera: gentle focus toward the tray being changed
  const focusOx = stepped(
    f,
    beats,
    beats.map((_, i) => {
      const p = pos.get(hlLabel(i) ?? '');
      return p ? p.x + p.w / 2 : 960;
    }),
    960,
    26,
  );
  const camS = stepped(f, beats, beats.map((_, i) => (hlLabel(i) ? 1.016 : 1)), 1, 26);

  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{s: camS, ox: focusOx, oy: 440}}>
      <SceneTitle text={spec.title} at={s0} width={1000} />
      {cells.map((c, i) => {
        const p = pos.get(c.label)!;
        const col = spot(c.color);
        const appear = s0 + 2 + i * 3;
        const inP = tw(f, appear, 16, E.out);
        const hist = [{at: -9999, value: c.value}, ...c.updates.filter((u, k, arr) => u.value !== (k ? arr[k - 1].value : c.value))];
        const cur = hist.reduce((a, h, k) => (f >= h.at ? k : a), 0);
        const isResult = resultIdx >= 0 && active >= resultIdx && hlLabel(resultIdx) === c.label;
        return (
          <div key={i} style={{position: 'absolute', left: p.x, top: p.y, width: p.w, opacity: inP}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, height: 34}}>
              <div style={{width: 14, height: 14, background: col.fill}} />
              <div style={{fontFamily: fonts.mono, fontSize: 23, color: ink.ink, letterSpacing: '0.04em'}}>{c.label}</div>
            </div>
            <div style={{position: 'relative', marginTop: 6, width: p.w, height: CS.h, background: ink.paperShade, borderRadius: 18, boxShadow: 'inset 0 2px 8px rgba(40,24,64,0.12)'}}>
              {hist.map((h, k) => {
                if (k < cur - 1 || k > cur) return null;
                const leaving = k === cur - 1;
                const t = leaving ? tw(f, hist[cur].at, 12, E.in) : 1;
                if (leaving && t >= 1) return null;
                const drop = k === 0 ? tw(f, appear, 18, E.out) : tw(f, h.at + 4, 14, E.out);
                const lift = leaving ? t * 1.2 : (1 - drop) * 1.1;
                const dy = leaving ? -150 * t : -150 * (1 - drop);
                const dx = leaving ? 70 * t : 0;
                const rot = leaving ? 9 * t : -3 * (1 - drop);
                return (
                  <div
                    key={k}
                    style={{
                      position: 'absolute',
                      inset: 9,
                      ...paperStyle(ink.paperLight),
                      borderRadius: 14,
                      borderTop: `9px solid ${col.fill}`,
                      boxShadow: paperShadow(lift),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: fonts.mono,
                      fontWeight: 600,
                      fontSize: c.fs,
                      color: ink.ink,
                      whiteSpace: 'pre',
                      lineHeight: 1.12,
                      textAlign: 'center',
                      opacity: leaving ? 1 - t * 0.6 : 1,
                      transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${1 + lift * 0.04})`,
                    }}
                  >
                    {show(h.value)}
                    {isResult && k === cur ? <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: ink.green}} /> : null}
                  </div>
                );
              })}
            </div>
            {hist.slice(1).map((h, k) => (
              <Sfx key={k} at={h.at + 14} name="chip" volume={0.3} />
            ))}
          </div>
        );
      })}

      <div style={{position: 'absolute', left: PX + 24, top: PY + 50, width: PW - 48, height: stripLen, overflow: 'hidden', ...paperStyle('#FFFFFF'), boxShadow: paperShadow(0.12), clipPath: zigzag(PW - 48, stripLen)}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 24 + feed, transform: 'translateY(-100%)'}}>
          {spec.trace
            .map((r, i) => ({r, i}))
            .reverse()
            .map(({r, i}) => {
              if (printed[i] <= 0) return null;
              const chars = Math.floor((f - beats[i]) * 4);
              const isActive = i === active;
              return (
                <div key={i} style={{height: rowH[i], display: 'flex', gap: 16, padding: '10px 26px', borderBottom: '2px dashed rgba(28,21,48,0.12)', background: isActive ? brand.tint : undefined}}>
                  <span style={{fontFamily: fonts.mono, fontSize: 20, color: r.result ? ink.green : ink.faint, width: 36, paddingTop: 4}}>
                    {r.result ? <Mark kind="check" color={ink.green} p={tw(f, beats[i], 10)} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{fontFamily: fonts.body, fontWeight: r.result ? 700 : 500, fontSize: NOTE, lineHeight: 1.3, color: r.result ? ink.green : ink.ink}}>{r.note.slice(0, Math.max(0, chars))}</span>
                </div>
              );
            })}
        </div>
      </div>
      <div style={{position: 'absolute', left: PX, top: PY, width: PW, height: 58, background: brand.gradient, borderRadius: 14, boxShadow: paperShadow(0.3), display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14, opacity: tw(f, s0, 14)}}>
        <div style={{width: 10, height: 10, borderRadius: 5, background: active >= 0 && f - beats[active] < 10 ? '#fff' : 'rgba(255,255,255,0.35)'}} />
        <div style={{fontFamily: fonts.label, fontWeight: 700, fontSize: 18, letterSpacing: tracking.label, textTransform: 'uppercase', color: '#fff'}}>{ui('trace')}</div>
        <div style={{flex: 1}} />
        <div style={{fontFamily: fonts.mono, fontSize: 18, color: ink.paperLight}}>
          {String(Math.max(0, active + 1)).padStart(2, '0')}/{String(spec.trace.length).padStart(2, '0')}
        </div>
        
      </div>
      {resultIdx >= 0 ? <Stamp at={beats[resultIdx] + 10} text={ui('result')} color={ink.green} rot={-8} size={34} style={{left: PX + PW - 236, top: Math.min(PY + 50 + stripLen - 16, 836)}} /> : null}

      {active >= 0 && pos.get(hlLabel(active) ?? '')
        ? (() => {
            const p = pos.get(hlLabel(active)!)!;
            const x1 = Math.min(p.x + p.w + 6, PX + 10);
            const y1 = p.y + 40 + CS.h / 2;
            const x0 = PX + 18;
            const y0 = PY + 90;
            const d = `M${x0} ${y0} C ${x0 - 90} ${y0 + 10}, ${x1 + 80} ${y1 - 60}, ${x1} ${y1}`;
            const fade = 1 - tw(f, beats[active] + 44, 14);
            return fade > 0 ? (
              <div style={{position: 'absolute', inset: 0, opacity: fade}}>
                <PenStroke d={d} at={beats[active] + 2} dur={10} color={ink.orange} width={4} />
              </div>
            ) : null;
          })()
        : null}

      {spec.trace.map((r, i) => (
        <React.Fragment key={i}>
          <Sfx at={beats[i]} name="key1" volume={0.18} />
          <Sfx at={beats[i] + 2} name="key3" volume={0.16} />
          <Sfx at={beats[i] + 4} name="key2" volume={0.16} />
          {r.result ? <Sfx at={beats[i] + 10} name="stamp" volume={0.36} /> : null}
        </React.Fragment>
      ))}
    </SceneFrame>
  );
};

/* ================================================================== COMPARE */
export const CompareScene: React.FC<P<CompareSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const s0 = startOf(enter);
  const G = revealGroups(spec);
  const leftBeats = anchorGroup(scene, G.left, fps, {start: 0.16, end: 0.5}).map((b) => guard(scene, b));
  const rightBeats = anchorGroup(scene, G.right, fps, {start: 0.52, end: 0.82}).map((b) => guard(scene, b));
  const tipAt = guard(scene, beatFrames(scene, 1, {start: 0.9})[0]);
  const rightAt = Math.min(rightBeats[0] ?? scene.leadFrames + 30, leftBeats[leftBeats.length - 1] + 24);
  const camX = mix(160, 0, tw(f, rightAt - 12, 34, E.inOut));
  const top = spec.question ? 292 : 220;
  const H = (spec.tip ? 812 : 862) - top;
  const Sheet = (side: CompareSpec['left'], x: number, at: number, beats: number[], rot: number, fromRight: boolean) => {
    const col = spot(side.color);
    const kw = fitSize(side.keyword, 700, 1, {max: 88, min: 44, advance: ADVANCE.serif});
    return (
      <Dealt at={at} x={x} y={top} w={790} h={H} rot={rot} from={fromRight ? {dx: 700, dy: 160, rot: 12} : {dx: -500, dy: 300, rot: -10}} style={{padding: '34px 44px'}}>
        <div style={{height: 12, background: col.fill, margin: '-34px -44px 26px', borderRadius: `${surface.radius}px ${surface.radius}px 0 0`}} />
        <div style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: kw, color: col.text, letterSpacing: '-0.02em', lineHeight: lhS(1)}}>{side.keyword}</div>
        <div style={{fontFamily: fonts.heading, fontWeight: 500, fontSize: 34, color: ink.soft, marginTop: 10}}>{side.title}</div>
        <div style={{height: 2, background: ink.paperShade, margin: '22px 0 24px'}} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          {side.items.map((it, i) => (
            <Rise key={i} at={beats[i]} dist={14}>
              <div style={{display: 'flex', gap: 18, alignItems: 'baseline'}}>
                <span style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 22, color: col.text}}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{fontFamily: fonts.body, fontSize: 31, lineHeight: lhS(1.25), color: ink.ink}}>
                  <Rich text={it.label} />
                </span>
              </div>
              <Sfx at={beats[i]} name="tick" volume={0.2} />
            </Rise>
          ))}
        </div>
        <Sfx at={at} name="deal" volume={0.24} />
        <Sfx at={at + 14} name="place" volume={0.28} />
      </Dealt>
    );
  };
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{x: camX}}>
      {spec.question ? (
        <div style={{position: 'absolute', left: L, top: TITLE_Y}}>
          <MaskWords text={spec.question} at={s0} size={fitSize(spec.question, safe.width, 1, {max: 74, min: 46, advance: ADVANCE.serif})} width={safe.width} stagger={2} />
        </div>
      ) : null}
      {Sheet(spec.left, L, s0 + 2, leftBeats, -1.1, false)}
      {Sheet(spec.right, 1010, rightAt, rightBeats, 1.3, true)}
      <Stamp at={rightAt + 16} text={ui('vs')} color={brand.purple} rot={-12} size={64} style={{left: 960, top: top + H / 2, translate: '-50% -50%'}} />
      <Sfx at={rightAt + 16} name="stamp" volume={0.36} />
      {spec.tip ? <Tape at={tipAt} tag={ui('tip')} tagColor={ink.teal} text={spec.tip} y={830} /> : null}
    </SceneFrame>
  );
};

/* ================================================================== MISTAKE */
export const MistakeScene: React.FC<P<MistakeSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const wrongAt = 6;
  const rightAt = guard(scene, beatFrames(scene, 1, {start: 0.42})[0]);
  const noteAt = guard(scene, beatFrames(scene, 1, {start: 0.82})[0]);
  const strikeAt = Math.max(wrongAt + 34, rightAt - 24);
  const glide = tw(f, rightAt - 8, 36, E.inOut);
  const chars = Math.max(...[...spec.wrong.lines, ...spec.right.lines].map((l) => l.length), 12);
  const fs = Math.round(Math.min(38, 700 / (chars * ADVANCE.sans)));
  const lh = fs * lhS(1.5);
  const top = 300;
  const W = 800;
  const slipH = (side: MistakeSpec['wrong']) => 26 + 40 + 16 + side.lines.length * lh + 34;
  const Slip = (side: MistakeSpec['wrong'], x: number, y: number, rot: number, at: number, wrong: boolean) => {
    const col = wrong ? ink.red : ink.green;
    return (
      <Dealt at={at} x={x} y={y} w={W} rot={rot} from={wrong ? {dx: -300, dy: 600, rot: -10} : {dx: 760, dy: 120, rot: 14}} style={{padding: '26px 36px 34px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, height: 40, marginBottom: 16}}>
          <Mark kind={wrong ? 'cross' : 'check'} color={col} p={tw(f, at + 8, 12)} />
          <span style={{fontFamily: fonts.label, fontWeight: 700, fontSize: 21, letterSpacing: '0.08em', color: col, textTransform: 'uppercase'}}>{side.label}</span>
        </div>
        {side.lines.map((l, i) => {
          const comment = /^\s*(\/\/|#)/.test(l);
          const w = l.length * fs * ADVANCE.sans;
          return (
            <div key={i} style={{position: 'relative', height: lh, display: 'flex', alignItems: 'center', fontFamily: fonts.body, fontWeight: 500, fontSize: fs, whiteSpace: 'pre', color: comment ? ink.faint : ink.ink}}>
              {l}
              {wrong && !comment && l.trim() ? <PenStroke d={`M-6 ${lh * 0.55} Q ${w / 2} ${lh * 0.38} ${w + 14} ${lh * 0.58}`} at={strikeAt + i * 4} dur={9} color={ink.red} width={5} /> : null}
            </div>
          );
        })}
        <Sfx at={at} name="deal" volume={0.26} />
        <Sfx at={at + 14} name="place" volume={0.3} />
      </Dealt>
    );
  };
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{x: mix(420, 0, glide), s: mix(1.06, 1, glide), ox: 960, oy: 540}}>
      <SceneTitle text={spec.title ?? ui('commonMistake')} at={2} />
      {Slip(spec.wrong, L + 20, top, -1.4, wrongAt, true)}
      <Stamp at={strikeAt + 8} text={ui('wrong')} color={ink.red} rot={-12} size={60} style={{left: L + W - 240, top: top + slipH(spec.wrong) - 44}} />
      {Slip(spec.right, 990, top + 40, 1.5, rightAt, false)}
      <Stamp at={rightAt + 20} text={ui('fixed')} color={ink.green} rot={8} size={56} style={{left: 990 + W - 270, top: top + 40 + slipH(spec.right) - 40}} />
      {spec.note ? <Tape at={noteAt} tag={ui('note')} tagColor={ink.teal} text={spec.note} y={818} /> : null}
      <Sfx at={strikeAt} name="shove" volume={0.24} />
      <Sfx at={strikeAt + 8} name="stamp" volume={0.42} />
      <Sfx at={rightAt + 20} name="stamp" volume={0.36} />
    </SceneFrame>
  );
};

/* ================================================================== RECAP: the contact sheet */
export type Print = {index: number; kicker: string; text: string; node: React.ReactNode};

export const recapGrid = (n: number) => {
  const gap = 30;
  const top = 176;
  // widen the sheet until the prints + the recap points below them fit above the captions
  let cols = n <= 4 ? Math.max(1, n) : n <= 8 ? 4 : 5;
  for (;;) {
    const rows = Math.ceil(n / cols);
    const w = Math.floor((safe.width - 20 - (cols - 1) * gap) / cols);
    const h = Math.round((w * 9) / 16);
    const pitch = h + 20 + 34 + 22;
    if (top + rows * pitch + 110 <= safe.bottom || cols >= 8) return {cols, rows, w, h, gap, pitch, top};
    cols++;
  }
};

/**
 * The camera pulls back out of the last scene to reveal the whole lesson printed as a
 * contact sheet; the recap points are circled on it in grease pencil, the takeaway is
 * printed across it, and the sheet clears for the maker's mark.
 */
export const RecapScene: React.FC<P<RecapSpec> & {prints?: Print[]}> = ({scene, spec, enter, exit, prints = []}) => {
  const f = useSceneFrame();
  const {brand: projectBrand} = useProject();
  const {fps} = useVideoConfig();
  const D = scene.durationInFrames;
  const beats = anchorGroup(scene, revealGroups(spec).bullets, fps, {start: 0.08, end: 0.5});
  const takeAt = beatFrames(scene, 1, {start: 0.56})[0];
  const logoAt = Math.min(beatFrames(scene, 1, {start: 0.8})[0], D - 110);
  const g = recapGrid(prints.length);
  const cell = (i: number) => ({x: L + (i % g.cols) * (g.w + g.gap), y: g.top + Math.floor(i / g.cols) * g.pitch, w: g.w, h: g.h});
  const BORDER = 10;

  const ZO = 44;
  const z = enter.kind === 'zoomout' ? E.inOut(clamp01(f / ZO)) : 1;
  const last = prints.length ? cell(prints.length - 1) : {x: 0, y: 0, w: 1920, h: 1080};
  const s0 = 1920 / last.w;
  const s = Math.exp(mix(Math.log(s0), 0, z));
  const cx = -s * (last.x + BORDER) * (1 - z);
  const cy = -s * (last.y + BORDER) * (1 - z);

  const used = new Set<number>();
  const match = spec.bullets.map((b) => {
    const kws = keywordsOf(b.label, 4);
    let best = -1;
    let score = 0;
    prints.forEach((p, i) => {
      if (used.has(i) || p.index <= 2) return;
      const sc = kws.reduce((n, k) => n + (p.text.includes(k) ? 1 : 0), 0);
      if (sc > score || (sc === score && sc > 0 && i > best)) (best = i), (score = sc);
    });
    if (best >= 0) used.add(best);
    return best;
  });

  const bulletsY = g.top + g.rows * g.pitch + 6;
  const colW = (safe.width - (spec.bullets.length - 1) * 40) / spec.bullets.length;
  const take = tw(f, takeAt, 18, E.inOut);
  const hand = tw(f, logoAt, 24, E.in);
  const Lg = logoAt + 16;
  const logoIn = tw(f, Lg, 34, E.inOut);
  const tSize = fitSize(spec.takeaway, 1500, 2, {max: 78, min: 48, advance: ADVANCE.serif});
  const tLines = Math.min(2, estLines(spec.takeaway, 1500, tSize, ADVANCE.serif));

  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{x: cx, y: cy, s, ox: 0, oy: 0}}>
      <div style={{position: 'absolute', inset: 0, opacity: 1 - hand, transform: `translateY(${-60 * hand}px)`}}>
        {prints.map((p, i) => {
          const c = cell(i);
          const isLast = i === prints.length - 1;
          const rot = isLast ? mix(0, -0.6, z) : [-0.8, 0.6, -0.4, 0.9, -0.5, 0.7, -0.9, 0.4, 0.6][i % 9];
          // as the camera pulls back, the other prints are dealt onto the sheet around the last one
          const deal = isLast || enter.kind !== 'zoomout' ? 1 : tw(f, 6 + i * 2.5, 22, E.out);
          const ddx = (c.x - last.x) * 0.35 * (1 - deal);
          const ddy = (c.y - last.y) * 0.35 * (1 - deal) - 40 * (1 - deal);
          return (
            <div key={i} data-audit="skip" style={{position: 'absolute', left: c.x, top: c.y, opacity: deal, transform: `translate(${ddx}px, ${ddy}px) rotate(${rot + (1 - deal) * (i % 2 ? 9 : -9)}deg)`}}>
              <div style={{width: c.w + BORDER * 2, height: c.h + BORDER * 2, padding: BORDER, ...paperStyle('#FFFFFF'), borderRadius: 16, border: surface.border, boxShadow: paperShadow(0.12)}}>
                <div style={{width: c.w, height: c.h, overflow: 'hidden', position: 'relative', borderRadius: 8}}>
                  <div style={{width: 1920, height: 1080, transform: `scale(${c.w / 1920})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0, ...paperStyle(ink.paper)}}>{p.node}</div>
                </div>
              </div>
              <div style={{fontFamily: fonts.label, fontWeight: 600, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink.soft, marginTop: 8, opacity: z, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: c.w}}>
                <span style={{color: brand.magentaText, fontWeight: 700}}>{String(p.index).padStart(2, '0')}</span> {p.kicker}
              </div>
            </div>
          );
        })}
        {match.map((m, i) =>
          m >= 0 ? <PenStroke key={i} d={loopPath(cell(m).x, cell(m).y, cell(m).w + BORDER * 2, cell(m).h + BORDER * 2, i * 7 + 3)} at={beats[i]} dur={16} color={brand.magenta} width={7} /> : null,
        )}
        {spec.bullets.map((b, i) => {
          const [h, t] = b.label.split(' — ');
          const col = spot(b.color);
          return (
            <Rise key={i} at={beats[i]} style={{position: 'absolute', left: L + i * (colW + 40), top: bulletsY, width: colW, display: 'flex', gap: 16}}>
              <span style={{fontFamily: fonts.heading, fontWeight: 800, fontSize: 52, lineHeight: 1, ...gradText}}>{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 40, lineHeight: lhS(1.08), color: col.text}}>{h}</span>
                {t ? (
                  <span style={{display: 'block', fontFamily: fonts.body, fontSize: 27, lineHeight: lhS(1.25), color: ink.soft, marginTop: 4}}>
                    <Rich text={t} />
                  </span>
                ) : null}
              </span>
              <Sfx at={beats[i]} name="pan" volume={0.18} />
            </Rise>
          );
        })}
        <div style={{position: 'absolute', left: L - 40, width: safe.width + 80, top: 360, height: 360, background: brand.gradient, borderRadius: 32, transform: `scaleX(${take})`, transformOrigin: 'left', boxShadow: surface.shadowHi}} />
        <PressPrint at={takeAt + 8} dur={22} style={{position: 'absolute', left: L + 20, top: 360 + (360 - tLines * tSize * 1.1) / 2, width: 1560}}>
          <MaskWords text={spec.takeaway} at={takeAt + 8} size={tSize} width={1540} weight={700} color="#fff" onDark stagger={1.6} lineHeight={1.1} />
        </PressPrint>
      </div>

      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, opacity: f >= Lg ? 1 : 0}}>
        <div style={{transform: `translateY(${(1 - logoIn) * 24}px) scale(${mix(0.94, 1, logoIn)})`, opacity: clamp01(logoIn * 2)}}>
          <Logo height={150} reveal={logoIn} />
        </div>
        <div style={{width: 380 * tw(f, Lg + 30, 22, E.inOut), height: 6, borderRadius: 3, background: brand.gradient}} />
        <Rise at={Lg + 40} style={{fontFamily: fonts.heading, fontWeight: 500, fontSize: 36, lineHeight: lhS(1.2), color: ink.soft, textAlign: 'center'}}>
          {spec.signoff ?? projectBrand.signoff}
        </Rise>
      </div>
      <Sfx at={0} name="shove" volume={0.3} />
      <Sfx at={10} name="fan" volume={0.26} />
      <Sfx at={takeAt} name="pan" volume={0.26} />
      <Sfx at={Lg + 36} name="logo" volume={0.5} />
    </SceneFrame>
  );
};

/* ================================================================== FIGURE: an illustrated plate */
/**
 * A medical illustration printed on a plate, its parts called out in a margin column as
 * the narrator names them: a pen leader is drawn to the part, a pin lands on it and the
 * camera leans toward it. Wide arts ('full') carry their own labels; the current callout
 * then runs along a tape under the plate.
 */
export const FigureScene: React.FC<P<FigureSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  if (!ARTS[spec.art]) throw new Error(`Unknown art "${spec.art}"`);
  const art = React.useMemo(() => ARTS[spec.art](spec.data ?? {}), [spec.art, spec.data]);
  const callouts = calloutsFor(spec.art, spec.data, spec.callouts);
  const s0 = startOf(enter);
  const beats = anchorGroup(scene, revealGroups(spec).callouts, fps, {start: 0.1, end: 0.86, minGapFrames: 14}).map((b) => guard(scene, b));
  const byAnchor = new Map(callouts.map((c, i) => [c.anchor, beats[i]]));
  const at = (a: string) => byAnchor.get(a) ?? null;
  const full = art.layout === 'full';
  const top = spec.title ? 292 : 200;
  const bottom = full || spec.caption ? 772 : 860;
  const PW = full ? safe.width : 1070;
  const avail = bottom - top;
  const PAD = 26;
  const k = Math.min((PW - 2 * PAD) / art.w, (avail - 2 * PAD) / art.h);
  // wide diagrams: the plate hugs the drawing (centred when untitled); the tape follows it
  const PH = full ? Math.min(avail, Math.round(art.h * k + 2 * PAD + 16)) : avail;
  const plateTop = full && !spec.title ? top + Math.round((avail - PH) / 2) : top;
  const tapeY = full ? plateTop + PH + 26 : 800;
  const ox = L + (PW - art.w * k) / 2;
  const oy = plateTop + (PH - art.h * k) / 2;
  const scr = (a: string): [number, number] => {
    const p = art.anchors[a] ?? [art.w / 2, art.h / 2];
    return [ox + p[0] * k, oy + p[1] * k];
  };
  const active = beats.reduce((a, b, i) => (f >= b ? i : a), -1);
  const focus = stepped(f, beats, callouts.map((c) => scr(c.anchor)[0]), 960, 30);
  const focusY = stepped(f, beats, callouts.map((c) => scr(c.anchor)[1]), 540, 30);
  const lean = (art.lean ?? (full ? 0 : 0.03)) * tw(f, beats[0] ?? 0, 30, E.inOut);

  // margin column
  const CX = 1250;
  const CW = 1800 - CX;
  const n = callouts.length;
  const itemH = Math.min(150, PH / Math.max(1, n));
  const colTop = plateTop + (PH - n * itemH) / 2;
  const labelSize = Math.min(40, ...callouts.map((c) => fitSize(c.label, CW - 70, 1, {max: 40, min: 26, advance: ADVANCE.serif})));

  return (
    <SceneFrame
      scene={scene}
      kicker={spec.kicker}
      enter={enter}
      exit={exit}
      // wide plates span the safe box, so they lean in about the centre (≤1.8%) and never reach the margins
      camera={full ? {s: 1 + Math.min(lean, 0.018), ox: 960, oy: Math.min(700, Math.max(360, focusY))} : {s: 1 + lean, ox: Math.min(1500, Math.max(420, focus)), oy: Math.min(700, Math.max(360, focusY))}}
    >
      <SceneTitle text={spec.title} at={s0} />
      <Dealt at={s0 + 2} x={L} y={plateTop} w={PW} h={PH} rot={0} from={{dx: -120, dy: 700, rot: -6}} dur={22}>
        <ArtView art={art} k={k} ctx={{f: f - s0 - 8, at: (a) => (at(a) == null ? null : at(a)! - s0 - 8)}} style={{left: ox - L, top: oy - plateTop}} />
        <div style={{position: 'absolute', right: 22, bottom: 14, fontFamily: fonts.label, fontWeight: 600, fontSize: 15, letterSpacing: tracking.label, textTransform: 'uppercase', color: ink.faint}}>{ui('fig')} {String(scene.index).padStart(2, '0')}</div>
        <Sfx at={s0 + 2} name="deal" volume={0.24} />
        <Sfx at={s0 + 16} name="place" volume={0.3} />
      </Dealt>

      {/* pins + leaders */}
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} width={1920} height={1080}>
        {callouts.map((c, i) => {
          // wide arts highlight their own parts; pins would sit on their labels
          if (full || f < beats[i]) return null;
          const [ax, ay] = scr(c.anchor);
          const p = tw(f, beats[i] + 6, 12, E.settle);
          const on = i === active;
          const ring = on ? ((f - beats[i]) % 40) / 40 : 1;
          return (
            <g key={i}>
              {on ? <circle cx={ax} cy={ay} r={14 + 30 * ring} fill="none" stroke={brand.magenta} strokeWidth={3} opacity={1 - ring} /> : null}
              <circle cx={ax} cy={ay} r={11 * p} fill={on ? brand.magenta : ink.ink} stroke="#fff" strokeWidth={3.5} />
            </g>
          );
        })}
      </svg>
      {!full
        ? callouts.map((c, i) => {
            const [ax, ay] = scr(c.anchor);
            const y = colTop + i * itemH;
            const ly = y + labelSize * 0.62;
            const d = `M${CX - 18} ${ly} C ${CX - 110} ${ly}, ${ax + 90} ${ay}, ${ax + 12} ${ay}`;
            const on = i === active;
            return (
              <React.Fragment key={i}>
                <PenStroke d={d} at={beats[i]} dur={10} color={on ? brand.magenta : ink.ink} width={on ? 3.5 : 2} opacity={on ? 0.95 : 0.28} />
                <Rise at={beats[i]} dist={12} style={{position: 'absolute', left: CX, top: y, width: CW, display: 'flex', gap: 16}}>
                  <span style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 18, color: on ? '#fff' : ink.faint, background: on ? brand.gradient : ink.paperShade, borderRadius: 8, padding: '4px 8px', marginTop: labelSize * 0.12, height: 'fit-content'}}>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span style={{display: 'block', fontFamily: fonts.heading, fontWeight: on ? 700 : 600, fontSize: labelSize, lineHeight: lhS(1.1), color: on ? brand.purpleText : ink.soft}}>{c.label}</span>
                    {c.text ? (
                      <span style={{display: 'block', fontFamily: fonts.body, fontSize: 24, lineHeight: lhS(1.28), color: ink.soft, marginTop: 4}}>
                        <Rich text={c.text} />
                      </span>
                    ) : null}
                  </span>
                </Rise>
                <Sfx at={beats[i]} name="tick" volume={0.2} />
              </React.Fragment>
            );
          })
        : callouts.map((c, i) =>
            i === active && c.text ? <Tape key={i} at={beats[i]} tag={String(i + 1).padStart(2, '0')} tagColor={brand.purple} text={c.text} y={tapeY} /> : null,
          )}
      {spec.caption && !full ? <Tape at={guard(scene, beatFrames(scene, 1, {start: 0.9})[0])} tag={ui('note')} tagColor={ink.teal} text={spec.caption} y={tapeY} /> : null}
    </SceneFrame>
  );
};

/* ================================================================== VISUAL PLATE (check / answer) */
/** A check/answer picture: one art on a white plate beside the card; its events fire at `acts` frames. */
const VisualPlate: React.FC<{v: NonNullable<CheckSpec['visual']>; at: number; acts: number[]; x: number; y: number; w: number; h: number}> = ({v, at, acts, x, y, w, h}) => {
  const f = useSceneFrame();
  const art = React.useMemo(() => ARTS[v.art](v.data ?? {}), [v.art, v.data]);
  const k = Math.min((w - 60) / art.w, (h - 60) / art.h);
  const times = new Map((v.act ?? []).map((a, i) => [a, acts[i] ?? at + 30 + i * 30]));
  return (
    <Dealt at={at} x={x} y={y} w={w} h={h} rot={0.6} from={{dx: 260, dy: 600, rot: 6}}>
      <ArtView art={art} k={k} ctx={{f: f - at - 6, at: (a) => (times.has(a) ? times.get(a)! - at - 6 : null)}} style={{left: (w - art.w * k) / 2, top: (h - art.h * k) / 2}} />
    </Dealt>
  );
};

/* ================================================================== KNOWLEDGE CHECK */
/** The question is dealt onto the desk, then a timer ring runs through the thinking pause. */
export const CheckScene: React.FC<P<CheckSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const D = scene.durationInFrames;
  const qAt = guard(scene, beatFrames(scene, 1, {start: 0.14})[0]);
  const voEnd = scene.leadFrames + scene.voDurationInFrames;
  // with a picture the card takes the left column and the picture the right
  const QW = spec.visual ? 900 : 1500;
  const qSize = fitSize(spec.question, QW, spec.visual ? 5 : 3, {max: spec.visual ? 64 : 84, min: 44, advance: ADVANCE.serif});
  const qLines = estLines(spec.question, QW, qSize, ADVANCE.serif);
  const cardH = qLines * qSize * 1.12 + 120;
  const think = clamp01((f - voEnd) / Math.max(1, D - voEnd - 24));
  const R = 58;
  const C = 2 * Math.PI * R;
  const ticks = Array.from({length: Math.floor((D - voEnd - 24) / 30)}, (_, i) => voEnd + 12 + i * 30);
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit} camera={{s: 1 + 0.02 * think, ox: 960, oy: 480}}>
      <div data-audit="skip" style={{position: 'absolute', right: 40, top: -200, fontFamily: fonts.heading, fontWeight: 800, fontSize: 1000, lineHeight: 1, color: brand.purple, opacity: 0.07 * tw(f, 0, 20)}}>?</div>
      <div style={{position: 'absolute', left: L, top: 190}}>
        <Label text={ui('knowledgeCheck')} at={4} color={ink.orangeText} size={24} />
      </div>
      {spec.visual ? <VisualPlate v={spec.visual} at={qAt + 6} acts={[]} x={1200} y={250} w={600} h={470} /> : null}
      <Dealt at={qAt - 10} x={L} y={250} w={QW + 140} h={cardH} rot={-0.6} from={{dx: 260, dy: 700, rot: 8}} style={{padding: '50px 60px'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: brand.gradientV, borderRadius: `${surface.radius}px 0 0 ${surface.radius}px`}} />
        <MaskWords text={spec.question} at={qAt} size={qSize} width={QW} stagger={1.6} lineHeight={1.12} />
        <Sfx at={qAt - 10} name="deal" volume={0.26} />
        <Sfx at={qAt + 4} name="place" volume={0.3} />
      </Dealt>
      <div style={{position: 'absolute', left: L, top: 250 + cardH + 70, display: 'flex', alignItems: 'center', gap: 34, opacity: tw(f, voEnd - 16, 14)}}>
        <svg width={R * 2 + 12} height={R * 2 + 12}>
          <circle cx={R + 6} cy={R + 6} r={R} fill="none" stroke={ink.paperShade} strokeWidth={10} />
          <circle cx={R + 6} cy={R + 6} r={R} fill="none" stroke={brand.magenta} strokeWidth={10} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * think} transform={`rotate(-90 ${R + 6} ${R + 6})`} />
        </svg>
        <div>
          <div style={{fontFamily: fonts.heading, fontWeight: 700, fontSize: 58, color: ink.ink, lineHeight: lhS(1.1)}}>{ui('pauseThink')}</div>
          <div style={{fontFamily: fonts.label, fontWeight: 600, fontSize: 20, letterSpacing: tracking.label, textTransform: 'uppercase', color: ink.soft, marginTop: 10}}>{ui('answerSoon')}</div>
        </div>
      </div>
      {ticks.map((t, i) => (
        <Sfx key={i} at={t} name="tick" volume={0.14} />
      ))}
    </SceneFrame>
  );
};

/* ================================================================== ANSWER */
export const AnswerScene: React.FC<P<AnswerSpec>> = ({scene, spec, enter, exit}) => {
  const f = useSceneFrame();
  const {fps} = useVideoConfig();
  const s0 = startOf(enter);
  const points = (spec.points ?? []).map((p) => (typeof p === 'string' ? p : p.label));
  const AW = spec.visual ? 860 : 1500;
  const aSize = fitSize(spec.answer, AW, spec.visual ? 4 : 2, {max: spec.visual ? 54 : 70, min: 38, advance: ADVANCE.serif});
  const aLines = estLines(spec.answer, AW, aSize, ADVANCE.serif);
  const slipTop = 262;
  const slipH = aLines * aSize * 1.14 + 104;
  const aAt = s0 + 10;
  const pBeats = anchorGroup(scene, revealGroups(spec).points, fps, {start: 0.3, end: 0.88, minGapFrames: 18}).map((b) => guard(scene, b));
  const pTop = slipTop + slipH + (spec.visual ? 34 : 50);
  // with a picture the points stack under the card in the left column
  const colW = spec.visual ? AW + 140 : points.length ? (safe.width - (points.length - 1) * 36) / points.length : 0;
  const pSize = Math.min(spec.visual ? 30 : 34, ...points.map((p) => fitSize(p, colW - 110, spec.visual ? 1 : 3, {max: spec.visual ? 30 : 34, min: 24, advance: ADVANCE.sans})));
  const pRow = pSize * 1.3 + 44;
  return (
    <SceneFrame scene={scene} kicker={spec.kicker} enter={enter} exit={exit}>
      <div style={{position: 'absolute', left: L, top: 170, width: safe.width, display: 'flex', gap: 18, alignItems: 'baseline', opacity: tw(f, s0, 12)}}>
        <span style={{fontFamily: fonts.label, fontWeight: 700, fontSize: 22, letterSpacing: '0.04em', color: ink.orangeText, whiteSpace: 'nowrap'}}>{ui('q')}</span>
        <span style={{fontFamily: fonts.body, fontSize: 28, lineHeight: lhS(1.3), color: ink.soft}}>{spec.question}</span>
      </div>
      {spec.visual ? <VisualPlate v={spec.visual} at={aAt + 4} acts={pBeats} x={1150} y={250} w={650} h={600} /> : null}
      <Dealt at={aAt - 8} x={L} y={slipTop} w={AW + 140} h={slipH} rot={-0.5} from={{dx: -200, dy: 640, rot: -7}} style={{padding: '46px 56px'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: ink.green, borderRadius: `${surface.radius}px 0 0 ${surface.radius}px`}} />
        <MaskWords text={spec.answer} at={aAt} size={aSize} width={AW} stagger={1.6} lineHeight={1.14} />
        <Sfx at={aAt - 8} name="deal" volume={0.26} />
      </Dealt>
      <Stamp at={aAt + 26} text={ui('answer')} color={ink.green} rot={-7} size={40} style={spec.visual ? {left: L + AW + 40, top: slipTop - 22} : {right: 1920 - safe.right + 30, top: slipTop - 22}} />
      <Sfx at={aAt + 26} name="stamp" volume={0.34} />
      {points.map((p, i) => (
        <Dealt key={i} at={pBeats[i]} x={spec.visual ? L : L + i * (colW + 36)} y={spec.visual ? pTop + i * pRow : pTop} w={colW} rot={[-1.2, 0.9, -0.6, 1.1][i % 4]} from={{dx: 200, dy: 520, rot: 10}} dur={20} style={{padding: spec.visual ? '14px 26px' : '26px 30px', display: 'flex', gap: 18, alignItems: 'flex-start'}}>
          <div style={{paddingTop: 4}}>
            <Mark kind="check" size={34} color={ink.green} p={tw(f, pBeats[i] + 10, 12)} />
          </div>
          <div style={{fontFamily: fonts.body, fontWeight: 500, fontSize: pSize, lineHeight: lhS(1.28), color: ink.ink}}>
            <Rich text={p} />
          </div>
          <Sfx at={pBeats[i]} name="deal" volume={0.22} />
          <Sfx at={pBeats[i] + 12} name="tick" volume={0.2} />
        </Dealt>
      ))}
    </SceneFrame>
  );
};
