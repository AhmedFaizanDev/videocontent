import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, radius} from '../theme';
import {SceneTiming, anchorFrame, popIn} from '../helpers';
import {CodeBlock} from '../components/CodeBlock';
import {SceneShell} from '../components/SceneShell';

// Syntax palette (used only here, on top of the global design system)
const kw = '#B39DFF';
const name = colors.variable;
const val = '#7EE787';
const comment = '#6B7394';

export const Scene4Code: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const l0At = anchorFrame(scene, /score equal ten/i, 0.09) + 6;
  const kwAt = anchorFrame(scene, /make me a box/i, 0.2);
  const nameAt = anchorFrame(scene, /the label/i, 0.26);
  const valAt = anchorFrame(scene, /ten goes inside/i, 0.3);
  const l1At = anchorFrame(scene, /score equals fifty/i, 0.36);
  const noLetAt = anchorFrame(scene, /already exists/i, 0.43);
  const l3At = anchorFrame(scene, /now the constant/i, 0.55) + 10;
  const l4At = anchorFrame(scene, /if you try to change/i, 0.74);
  const errorAt = anchorFrame(scene, /throws an error/i, 0.8) + 12;
  const shieldAt = anchorFrame(scene, /protection you asked/i, 0.92);
  const shieldIn = popIn(frame, fps, shieldAt);

  return (
    <SceneShell scene={scene} kicker="Real code">
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60}}>
        <CodeBlock
          appear={scene.leadFrames}
          width={1330}
          lines={[
            {
              at: l0At,
              segments: [
                {t: 'let ', c: kw},
                {t: 'score', c: name},
                {t: ' = '},
                {t: '10', c: val},
                {t: ';'},
              ],
            },
            {
              at: l1At,
              segments: [
                {t: 'score', c: name},
                {t: ' = '},
                {t: '50', c: val},
                {t: ';'},
                {t: '      // same box, new value', c: comment},
              ],
            },
            {at: 0, segments: []},
            {
              at: l3At,
              segments: [
                {t: 'const ', c: kw},
                {t: 'PI', c: colors.constant},
                {t: ' = '},
                {t: '3.14159', c: val},
                {t: ';'},
              ],
            },
            {
              at: l4At,
              segments: [
                {t: 'PI', c: colors.constant},
                {t: ' = '},
                {t: '3.2', c: val},
                {t: ';'},
                {t: '        // ❌ not allowed', c: comment},
              ],
            },
          ]}
          annotations={[
            {line: 0, col: 0, text: '“make me a box”', color: kw, at: kwAt, until: l1At - 6},
            {line: 0, col: 4, text: 'the label', color: name, at: nameAt, until: l1At - 6},
            {line: 0, col: 12, text: 'the value', color: val, at: valAt, until: l1At - 6},
            {
              line: 1,
              col: 0,
              text: 'no “let” — the box already exists',
              color: colors.accent,
              at: noLetAt,
              until: l3At - 6,
            },
          ]}
          highlights={[
            {line: 1, at: l1At, until: l3At - 6, color: colors.variable},
            {line: 3, at: l3At, until: l4At - 6, color: colors.constant},
          ]}
          errorAt={errorAt}
          errorLine={4}
          errorText="TypeError: Assignment to constant variable."
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: colors.panel,
            border: `1.5px solid ${colors.constant}66`,
            borderRadius: radius.chip,
            padding: '16px 38px',
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 34,
            color: colors.text,
            opacity: Math.min(1, shieldIn * 1.3),
            transform: `translateY(${(1 - shieldIn) * 40}px)`,
          }}
        >
          🛡️ That error is <span style={{color: colors.constant}}>protection you asked for</span>
        </div>
      </div>
    </SceneShell>
  );
};
