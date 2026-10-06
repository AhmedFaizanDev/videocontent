import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import {popIn} from '../helpers';

type Props = {
  text: string;
  delay?: number;
  stagger?: number;
  fontSize?: number;
  /** Words to tint with a color, e.g. {named: colors.accent} (lowercased, punctuation stripped). */
  highlights?: Record<string, string>;
  align?: 'center' | 'left';
  maxWidth?: number;
};

/** Word-by-word kinetic headline with springy pops and per-word highlights. */
export const KineticTitle: React.FC<Props> = ({
  text,
  delay = 0,
  stagger = 4,
  fontSize = 84,
  highlights = {},
  align = 'center',
  maxWidth = 1400,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.32em',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        maxWidth,
        fontFamily: fonts.heading,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.18,
        color: colors.text,
      }}
    >
      {words.map((word, i) => {
        const p = popIn(frame, fps, delay + i * stagger);
        const key = word.toLowerCase().replace(/[^a-z0-9']/g, '');
        const color = highlights[key];
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: Math.min(1, p * 1.4),
              transform: `translateY(${(1 - p) * 42}px) scale(${0.85 + p * 0.15})`,
              color: color ?? colors.text,
              textShadow: color ? `0 0 46px ${color}66` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
