import React from 'react';
import {colors} from '../theme';
import {SceneTiming, anchorFrame} from '../helpers';
import {KineticTitle} from '../components/KineticTitle';
import {LabeledBox} from '../components/LabeledBox';
import {SceneShell} from '../components/SceneShell';

export const Scene3Analogy: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const varBoxAt = anchorFrame(scene, /labeled box/i, 0.03);
  const drop10At = anchorFrame(scene, /might hold ten/i, 0.24);
  const swapOutAt = anchorFrame(scene, /takes the ten out/i, 0.38);
  const drop50At = anchorFrame(scene, /drops in a fifty/i, 0.44) + 6;
  const constBoxAt = anchorFrame(scene, /constant is a different/i, 0.6);
  const dropPiAt = anchorFrame(scene, /put a value in/i, 0.7);
  const lockAt = anchorFrame(scene, /shut the lid/i, 0.76) + 8;
  const rejectAt = anchorFrame(scene, /nobody can swap/i, 0.86);

  return (
    <SceneShell scene={scene} kicker="The analogy">
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56}}>
        <KineticTitle
          text="Think of them as boxes."
          delay={scene.leadFrames}
          fontSize={64}
          highlights={{boxes: colors.accent}}
        />
        <div style={{display: 'flex', gap: 190, alignItems: 'flex-start'}}>
          <LabeledBox
            appear={varBoxAt}
            label="score"
            color={colors.variable}
            drops={[
              {value: '10', at: drop10At},
              {value: '50', at: drop50At},
            ]}
            swapOutAt={swapOutAt}
            caption="VARIABLE — contents can change"
          />
          <LabeledBox
            appear={constBoxAt}
            label="PI"
            color={colors.constant}
            drops={[{value: 'π', at: dropPiAt}]}
            lockAt={lockAt}
            rejectAt={rejectAt}
            caption="CONSTANT — locked once set"
          />
        </div>
      </div>
    </SceneShell>
  );
};
