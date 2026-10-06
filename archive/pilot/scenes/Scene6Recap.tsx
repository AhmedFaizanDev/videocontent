import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {TalhaMark} from '../components/Logo';
import {colors, fonts} from '../theme';
import {SceneTiming, anchorFrame, easeIn, popIn} from '../helpers';
import {SceneShell} from '../components/SceneShell';

const RecapLine: React.FC<{icon: string; text: string; color: string; at: number}> = ({
  icon,
  text,
  color,
  at,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = popIn(frame, fps, at);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        fontFamily: fonts.heading,
        fontWeight: 700,
        fontSize: 62,
        color: colors.text,
        opacity: Math.min(1, p * 1.3),
        transform: `translateY(${(1 - p) * 46}px)`,
      }}
    >
      <span style={{fontSize: 66}}>{icon}</span>
      <span>
        <span style={{color}}>{text.split(' — ')[0]}</span>
        <span style={{color: colors.textDim}}> — </span>
        {text.split(' — ')[1]}
      </span>
    </div>
  );
};

export const Scene6Recap: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const line1At = anchorFrame(scene, /boxes you can refill/i, 0.12) - 10;
  const line2At = anchorFrame(scene, /boxes that lock/i, 0.3) - 6;
  const takeawayAt = anchorFrame(scene, /name your data/i, 0.45);
  const logoAt = anchorFrame(scene, /see you/i, 0.85) - 4;

  const takeIn = easeIn(frame, fps, takeawayAt);
  // recap content makes room for the logo outro
  const handoff = easeIn(frame, fps, logoAt, 20);
  const logoIn = popIn(frame, fps, logoAt + 8);
  const lineSweep = easeIn(frame, fps, logoAt + 20, 24);
  const byeIn = easeIn(frame, fps, logoAt + 26);

  return (
    <SceneShell scene={scene} kicker="Recap" exit={false}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 44,
          opacity: 1 - handoff,
          transform: `translateY(${handoff * -70}px) scale(${1 - handoff * 0.06})`,
        }}
      >
        <RecapLine icon="📦" text="Variables — boxes you can refill" color={colors.variable} at={line1At} />
        <RecapLine icon="🔒" text="Constants — boxes that lock" color={colors.constant} at={line2At} />
        <div
          style={{
            marginTop: 20,
            fontFamily: fonts.body,
            fontWeight: 500,
            fontSize: 40,
            color: colors.textDim,
            opacity: takeIn,
            transform: `translateY(${(1 - takeIn) * 30}px)`,
          }}
        >
          Name your data. Protect what shouldn't change.
        </div>
      </div>

      {/* logo outro */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 38,
          opacity: frame >= logoAt ? 1 : 0,
        }}
      >
        <div
          style={{
            opacity: Math.min(1, logoIn * 1.3),
            transform: `scale(${0.7 + logoIn * 0.3})`,
            filter: 'drop-shadow(0 0 60px rgba(124,108,255,0.4))',
          }}
        >
          <TalhaMark height={190} color="#ffffff" />
        </div>
        <div
          style={{
            height: 6,
            width: interpolate(lineSweep, [0, 1], [0, 420]),
            borderRadius: 3,
            background: `linear-gradient(90deg, ${colors.variable}, ${colors.accent}, ${colors.constant})`,
          }}
        />
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 500,
            fontSize: 40,
            color: colors.textDim,
            opacity: byeIn,
            transform: `translateY(${(1 - byeIn) * 24}px)`,
          }}
        >
          See you in the next one.
        </div>
      </div>
    </SceneShell>
  );
};
