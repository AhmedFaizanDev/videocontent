import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {fonts, ink} from './theme';
import {useHouseFonts} from './fonts';
import {VideoSpec, VideoTimings, SceneTiming} from './spec';
import type {ProjectConfig} from './project';
import {ProjectCtx, episodeOf} from './templates/brand';
import {isIndic, setLang} from './lang';
import {AuditCtx, TextAudit} from './templates/audit';
import {TX, overlaps, planTransitions, type TxPlan} from './schedule';
import {SceneClock} from './motion';
import {Captions} from './templates/Captions';
import {StageScene} from './templates/StageScene';
import {OutroScene} from './templates/OutroScene';
import {IdentScene} from './templates/IdentScene';
import {ClockHud} from './templates/ClockHud';
import {FixedChrome, InkFlood, MusicBed, PosterLayer, Sfx, World} from './templates/stage';
import {
  IntroScene,
  HookScene,
  DefinitionScene,
  StepsScene,
  ExampleScene,
  CodeScene,
  PseudocodeScene,
  CompareScene,
  MistakeScene,
  RecapScene,
  FigureScene,
  CheckScene,
  AnswerScene,
  type Print,
} from './templates/scenes';

/** Timings arriving here are already retimed (src/schedule.ts) by Root's calculateMetadata. */
/** `audit`: preflight/review stills only — measure text overflow and collisions (src/templates/audit.tsx). */
export type VideoProps = {project: ProjectConfig; spec: VideoSpec; timings: VideoTimings; audit?: boolean};

type SceneSpec = VideoSpec['scenes'][number];

const renderScene = (spec: SceneSpec, timing: SceneTiming, enter: TxPlan, exit: TxPlan | null, episode: string, prints?: Print[]) => {
  const p = {scene: timing, enter, exit, episode};
  switch (spec.type) {
    case 'intro':
      return <IntroScene {...p} spec={spec} />;
    case 'hook':
      return <HookScene {...p} spec={spec} />;
    case 'definition':
      return <DefinitionScene {...p} spec={spec} />;
    case 'steps':
      return <StepsScene {...p} spec={spec} />;
    case 'example':
      return <ExampleScene {...p} spec={spec} />;
    case 'code':
      return <CodeScene {...p} spec={spec} />;
    case 'pseudocode':
      return <PseudocodeScene {...p} spec={spec} />;
    case 'compare':
      return <CompareScene {...p} spec={spec} />;
    case 'mistake':
      return <MistakeScene {...p} spec={spec} />;
    case 'figure':
      return <FigureScene {...p} spec={spec} />;
    case 'stage':
      return <StageScene {...p} spec={spec} />;
    case 'outro':
      return <OutroScene {...p} spec={spec} />;
    case 'ident':
      return <IdentScene {...p} spec={spec} />;
    case 'check':
      return <CheckScene {...p} spec={spec} />;
    case 'answer':
      return <AnswerScene {...p} spec={spec} />;
    case 'recap':
      return <RecapScene {...p} spec={spec} prints={prints} />;
    default:
      return null;
  }
};

const TX_SFX: Record<TxPlan['kind'], {name: 'pan' | 'push' | 'cut' | 'shove' | 'deal' | 'stamp'; offset: number; volume: number} | null> = {
  pan: {name: 'pan', offset: -11, volume: 0.3},
  slide: {name: 'deal', offset: -10, volume: 0.34},
  portal: {name: 'push', offset: 2, volume: 0.45},
  cut: {name: 'cut', offset: 0, volume: 0.42},
  flood: {name: 'stamp', offset: -2, volume: 0.3},
  zoomout: null,
};

export const VideoComposition: React.FC<VideoProps> = ({project, spec, timings, audit}) => {
  useHouseFonts();
  // one project per render: the active script drives line heights, glyph metrics and the UI words
  setLang(project.lang);
  return (
    <ProjectCtx.Provider value={project}>
      <div lang={project.lang ?? 'en'} style={{position: 'absolute', inset: 0}}>
        {/* Indic scripts: tracking breaks their joined letterforms, and case doesn't exist */}
        {isIndic(project.lang ?? 'en') ? <style>{`[lang] * { letter-spacing: 0 !important; }`}</style> : null}
        <AuditCtx.Provider value={!!audit}>
          <Lesson spec={spec} timings={timings} />
        </AuditCtx.Provider>
        {audit ? <TextAudit /> : null}
      </div>
    </ProjectCtx.Provider>
  );
};

const Lesson: React.FC<{spec: VideoSpec; timings: VideoTimings}> = ({spec, timings}) => {
  const total = timings.totalDurationInFrames;
  // a scene may choose how it is entered (spec `transition`); otherwise the house plan decides
  const plans = planTransitions(timings.scenes.map((s) => s.type)).map((p, i) => {
    const want = spec.scenes[i]?.transition;
    return want ? {...p, kind: want} : p;
  });
  const episode = episodeOf(spec);
  const scenesT: SceneTiming[] = timings.scenes.map((t) => ({...t, total: timings.scenes.length, totalFrames: total}));

  // Recap contact sheet: every earlier scene, printed at its settled state. The one just
  // before the recap is frozen on its very last frame so the zoom-out starts seamlessly.
  const recapIdx = spec.scenes.findIndex((s) => s.type === 'recap');
  const prints: Print[] = spec.scenes.slice(0, Math.max(0, recapIdx)).map((s, i) => {
    const t = scenesT[i];
    const freeze = i === recapIdx - 1 ? t.durationInFrames - 1 : t.leadFrames + Math.round(t.voDurationInFrames * 0.97);
    const {narration: _n, ...rest} = s as SceneSpec & {narration: string};
    return {
      index: i + 1,
      kicker: s.kicker,
      text: JSON.stringify(rest).toLowerCase(),
      node: (
        <SceneClock.Provider value={{offset: 0, freeze, thumb: i !== recapIdx - 1}}>
          {renderScene(s, t, {kind: 'cut', axis: 'x'}, i === recapIdx - 1 ? plans[recapIdx] : null, episode)}
        </SceneClock.Provider>
      ),
    };
  });

  return (
    <AbsoluteFill style={{background: ink.paper, fontFamily: fonts.body}}>
      <World timings={timings} plans={plans} />
      {scenesT.map((t, i) => {
        const sceneSpec = spec.scenes[i];
        if (!sceneSpec) return null;
        // Camera-move transitions overlap neighbours: pre-roll before the cut, post-roll after.
        const pre = i > 0 && overlaps(plans[i]) ? TX.exit : 0;
        const post = overlaps(plans[i + 1]) ? TX.enter : 0;
        return (
          <Sequence key={i} from={t.startFrame - pre} durationInFrames={t.durationInFrames + pre + post} name={`${i + 1} · ${sceneSpec.type}`}>
            <SceneClock.Provider value={{offset: pre}}>
              {renderScene(sceneSpec, t, plans[i], plans[i + 1] ?? null, episode, sceneSpec.type === 'recap' ? prints : undefined)}
              <Sequence from={pre + t.leadFrames} name="VO" layout="none">
                <Html5Audio src={staticFile(t.audioFile)} />
              </Sequence>
              <Captions scene={t} />
            </SceneClock.Provider>
          </Sequence>
        );
      })}

      {scenesT.slice(1).map((s, k) => {
        const plan = plans[k + 1];
        const sx = TX_SFX[plan.kind];
        return (
          <React.Fragment key={k}>
            {sx ? <Sfx at={s.startFrame + sx.offset} name={sx.name} volume={sx.volume} /> : null}
            {plan.kind === 'flood' ? (
              <>
                <Sfx at={s.startFrame - 14} name="pan" volume={0.3} />
                <InkFlood B={s.startFrame} tone={plan.tone ?? 'red'} label={spec.scenes[k + 1]?.kicker ?? ''} index={k + 2} />
              </>
            ) : null}
          </React.Fragment>
        );
      })}

      {spec.clock && scenesT[spec.clock.from - 1] && scenesT[spec.clock.stop - 1] && scenesT[spec.clock.to - 1] ? (
        <ClockHud
          from={scenesT[spec.clock.from - 1].startFrame + scenesT[spec.clock.from - 1].leadFrames}
          stop={scenesT[spec.clock.stop - 1].startFrame}
          out={scenesT[spec.clock.to - 1].startFrame}
        />
      ) : null}
      <MusicBed timings={timings} />
      <FixedChrome total={total} showFrom={spec.scenes[0]?.type === 'ident' ? scenesT[0].durationInFrames : undefined} hideFrom={(() => {
        const o = spec.scenes.findIndex((x) => x.type === 'outro');
        return o >= 0 ? scenesT[o].startFrame : undefined;
      })()} />
      <PosterLayer spec={spec} minutes={Math.max(1, Math.round(total / 30 / 60))} />
    </AbsoluteFill>
  );
};
