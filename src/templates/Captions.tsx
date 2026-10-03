import React from 'react';
import {interpolate, useVideoConfig} from 'remotion';
import {useSceneFrame, useThumb} from '../motion';
import {fonts} from '../theme';
import {lh} from '../lang';
import {SceneTiming} from '../spec';

/** Burned-in captions on a deep-aubergine pill (white type): legible over anything on the page. */
export const Captions: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const frame = useSceneFrame();
  const thumb = useThumb();
  const {fps} = useVideoConfig();
  if (thumb) return null;
  const t = (frame - scene.leadFrames) / fps;
  const current = scene.captions.find((c) => t >= c.start && t <= c.end);
  if (!current) return null;
  const opacity =
    interpolate(t, [current.start, current.start + 0.1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(t, [current.end - 0.08, current.end], [1, 0.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 58, display: 'flex', justifyContent: 'center', opacity}}>
      <div
        style={{
          maxWidth: 1360,
          background: 'rgba(28,21,48,0.9)',
          borderRadius: 16,
          padding: '10px 28px 12px',
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 34,
          lineHeight: lh(1.26),
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 10px 30px -10px rgba(28,21,48,0.45)',
        }}
      >
        {current.text}
      </div>
    </div>
  );
};
