import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  interpolate,
  staticFile,
} from 'remotion';
import {timings, SceneTiming} from './helpers';
import {colors, fonts} from './theme';
import {Background} from './components/Background';
import {Captions} from './components/Captions';
import {Watermark} from './components/Chrome';
import {Scene1Hook} from './scenes/Scene1Hook';
import {Scene2Definition} from './scenes/Scene2Definition';
import {Scene3Analogy} from './scenes/Scene3Analogy';
import {Scene4Code} from './scenes/Scene4Code';
import {Scene5Difference} from './scenes/Scene5Difference';
import {Scene6Recap} from './scenes/Scene6Recap';

const SCENES: Record<number, React.FC<{scene: SceneTiming}>> = {
  1: Scene1Hook,
  2: Scene2Definition,
  3: Scene3Analogy,
  4: Scene4Code,
  5: Scene5Difference,
  6: Scene6Recap,
};

const total = timings.totalDurationInFrames;

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{background: colors.bg, fontFamily: fonts.body}}>
      <Background />

      {timings.scenes.map((scene) => {
        const SceneComp = SCENES[scene.index];
        return (
          <Sequence
            key={scene.index}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
            name={`Scene ${scene.index} — ${scene.title}`}
          >
            <SceneComp scene={scene} />
            <Sequence from={scene.leadFrames} name={`VO ${scene.index}`}>
              <Html5Audio src={staticFile(scene.audioFile)} />
            </Sequence>
            <Captions scene={scene} />
          </Sequence>
        );
      })}

      {/* Music bed: "Deliberate Thought" — Kevin MacLeod (CC BY 4.0).
          Ducked ~-20 dB under the narration; fades in and out. */}
      <Html5Audio
        src={staticFile('audio/music/deliberate-thought.mp3')}
        loop
        volume={(f) =>
          interpolate(f, [0, 70, total - 100, total - 8], [0, 0.1, 0.1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />

      <Watermark />
    </AbsoluteFill>
  );
};
