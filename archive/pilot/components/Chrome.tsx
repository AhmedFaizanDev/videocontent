import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import {easeIn} from '../helpers';
import {TalhaMark} from './Logo';

/** Small brand watermark, top-right — quiet, not a badge. */
export const Watermark: React.FC = () => (
  <div style={{position: 'absolute', top: 40, right: 56, opacity: 0.5}}>
    <TalhaMark height={26} />
  </div>
);

/** Consistent scene kicker: accent bar + numbered label, top-left. */
export const Kicker: React.FC<{index: number; label: string}> = ({index, label}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = easeIn(frame, fps, 4);
  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        left: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: p,
        transform: `translateX(${(1 - p) * -26}px)`,
      }}
    >
      <div style={{width: 34, height: 5, borderRadius: 3, background: colors.accent}} />
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 25,
          letterSpacing: 4,
          color: colors.textDim,
        }}
      >
        {String(index).padStart(2, '0')} · {label.toUpperCase()}
      </div>
    </div>
  );
};
