import {forLesson} from './project';
import {compileSpec} from './compile';
import React from 'react';
import {Composition} from 'remotion';
import {VideoComposition, type VideoProps} from './VideoComposition';
import {READY} from './registry.gen';
import {paceOf, retime} from './schedule';
import {ArtProbe, PROBE, type ArtProbeProps} from './templates/ArtProbe';

/**
 * "Lesson" is the one production composition: render scripts pass {project, spec, timings}
 * as input props and calculateMetadata sizes it from the measured narration. The per-video
 * entries below exist only so Studio can browse voiced lessons (registry.gen.ts is written
 * by voiceover.mts); rendering never depends on them.
 */
const metadata = ({props}: {props: VideoProps}) => {
  const timings = retime(props.timings, paceOf(forLesson(props.project, props.spec as never)));
  // shorthand scenes (flow, table) compile to stages here too: Studio entries import raw specs
  return {durationInFrames: Math.max(1, timings.totalDurationInFrames), props: {...props, spec: compileSpec(props.spec as never, (props.project as any).frame) as VideoProps['spec'], timings}};
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* the art gates render single arts through this (scripts/art.mts) */}
    <Composition id="ArtProbe" component={ArtProbe as React.FC<ArtProbeProps>} durationInFrames={600} fps={30} width={PROBE.w} height={PROBE.h} defaultProps={{art: 'gauge'}} />
    {READY.length ? (
      <Composition id="Lesson" component={VideoComposition} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={READY[0]} calculateMetadata={metadata} />
    ) : null}
    {READY.map((v) => (
      <Composition
        key={`${v.project.slug}-${v.spec.id}`}
        id={`${v.project.slug}-${v.spec.id}`}
        component={VideoComposition}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={v}
        calculateMetadata={metadata}
      />
    ))}
  </>
);
