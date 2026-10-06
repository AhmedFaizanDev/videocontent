import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors, fonts} from '../theme';
import {FPS, SceneTiming} from '../helpers';

/** Burned-in captions, timed by the ElevenLabs character alignment. */
export const Captions: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const frame = useCurrentFrame();
  const t = (frame - scene.leadFrames) / FPS;
  const current = scene.captions.find((c) => t >= c.start && t <= c.end);
  if (!current) return null;

  const opacity =
    interpolate(t, [current.start, current.start + 0.12], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(t, [current.end - 0.1, current.end], [1, 0.35], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 46,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          background: 'rgba(7, 10, 26, 0.78)',
          border: `1px solid ${colors.panelBorder}`,
          borderRadius: 14,
          padding: '12px 30px',
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 34,
          color: colors.text,
          letterSpacing: 0.2,
        }}
      >
        {current.text}
      </div>
    </div>
  );
};
