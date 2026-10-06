import React from 'react';

/**
 * A tiny hand-drawn (not emoji) glyph set. Rendering marks as SVG rather than
 * emoji characters keeps weight/color under our control and reads as
 * typeset, not decorated — one of the biggest tells that separates this
 * from a generic AI-generated explainer.
 */
export const Check: React.FC<{size?: number; color?: string; strokeWidth?: number}> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2.5,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5L9.5 18L20 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Cross: React.FC<{size?: number; color?: string; strokeWidth?: number}> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2.5,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 5L19 19M19 5L5 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const ArrowRight: React.FC<{width?: number; height?: number; color?: string; strokeWidth?: number}> = ({
  width = 48,
  height = 20,
  color = 'currentColor',
  strokeWidth = 1.5,
}) => (
  <svg width={width} height={height} viewBox="0 0 48 20" fill="none">
    <path d={`M1 10 H${width - 8}`} stroke={color} strokeWidth={strokeWidth} />
    <path d={`M${width - 14} 4 L${width - 8} 10 L${width - 14} 16`} stroke={color} strokeWidth={strokeWidth} fill="none" />
  </svg>
);

export const Warning: React.FC<{size?: number; color?: string}> = ({size = 22, color = 'currentColor'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3L22 20H2L12 3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M12 9.5V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <circle cx="12" cy="17" r="0.9" fill={color} />
  </svg>
);
