import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import {SceneTiming, anchorFrame, easeIn, popIn} from '../helpers';
import {KineticTitle} from '../components/KineticTitle';
import {SceneShell} from '../components/SceneShell';

/** A tiny phone that "remembers" a name and greets the user. */
const Phone: React.FC<{appear: number; greetAt: number}> = ({appear, greetAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = popIn(frame, fps, appear);
  const name = 'Ava';
  const typed = name.slice(0, Math.max(0, Math.floor((frame - appear - 14) / 5)));
  const greet = popIn(frame, fps, greetAt);

  return (
    <div
      style={{
        width: 330,
        height: 420,
        borderRadius: 40,
        border: `2.5px solid ${colors.panelBorder}`,
        background: 'linear-gradient(180deg, rgba(24,31,64,0.95), rgba(13,17,38,0.98))',
        boxShadow: '0 34px 80px rgba(0,0,0,0.5)',
        padding: 30,
        opacity: Math.min(1, p * 1.3),
        transform: `translateY(${(1 - p) * 80}px) rotate(${(1 - p) * 4}deg)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <div style={{width: 90, height: 9, borderRadius: 5, background: colors.panelBorder, alignSelf: 'center'}} />
      <div style={{fontFamily: fonts.body, fontSize: 24, color: colors.textDim}}>Your name</div>
      <div
        style={{
          border: `2px solid ${colors.accent}88`,
          borderRadius: 16,
          padding: '14px 20px',
          fontFamily: fonts.mono,
          fontSize: 34,
          color: colors.text,
          minHeight: 66,
        }}
      >
        {typed}
        <span style={{opacity: frame % 16 < 8 ? 1 : 0, color: colors.accent}}>|</span>
      </div>
      <div
        style={{
          alignSelf: 'flex-start',
          background: colors.accent,
          color: '#fff',
          borderRadius: '22px 22px 22px 6px',
          padding: '14px 24px',
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: 30,
          opacity: greet,
          transform: `scale(${greet})`,
          transformOrigin: 'bottom left',
          boxShadow: `0 16px 40px ${colors.accent}55`,
        }}
      >
        Hi, Ava! 👋
      </div>
    </div>
  );
};

export const Scene1Hook: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const askAt = anchorFrame(scene, /where does it/i, 0.55);
  const q = easeIn(frame, fps, askAt);

  return (
    <SceneShell scene={scene} kicker="The hook">
      <div style={{display: 'flex', alignItems: 'center', gap: 110}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 44, maxWidth: 880}}>
          <KineticTitle
            text="When an app remembers your name…"
            delay={scene.leadFrames}
            fontSize={82}
            align="left"
            highlights={{remembers: colors.accent}}
          />
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 800,
              fontSize: 88,
              color: colors.variable,
              opacity: q,
              transform: `translateY(${(1 - q) * 40}px)`,
              textShadow: `0 0 60px ${colors.variable}44`,
            }}
          >
            where does it put it?
          </div>
        </div>
        <Phone appear={scene.leadFrames + 8} greetAt={askAt - 26} />
      </div>
    </SceneShell>
  );
};
