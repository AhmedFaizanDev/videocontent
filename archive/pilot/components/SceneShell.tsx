import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SceneTiming, sceneExit} from '../helpers';
import {Kicker} from './Chrome';

/**
 * Wraps a scene's content: shows the numbered kicker and lifts/fades all
 * content out just before the next scene, so there are no hard jump-cuts.
 */
export const SceneShell: React.FC<{
  scene: SceneTiming;
  kicker: string;
  exit?: boolean;
  children: React.ReactNode;
}> = ({scene, kicker, exit = true, children}) => {
  const frame = useCurrentFrame();
  const out = exit ? sceneExit(frame, scene.durationInFrames) : 0;
  return (
    <AbsoluteFill>
      <Kicker index={scene.index} label={kicker} />
      <AbsoluteFill
        style={{
          opacity: 1 - out,
          transform: `translateY(${out * -46}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
