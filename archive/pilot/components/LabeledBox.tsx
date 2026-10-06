import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import {easeIn, popIn, shake} from '../helpers';

type Props = {
  appear: number;
  label: string;
  color: string;
  /** {value, at} — token drops into the box at frame `at`. */
  drops: {value: string; at: number}[];
  /** frame at which the previous token pops out (just before the 2nd drop). */
  swapOutAt?: number;
  /** constant-style box: lid closes + padlock at this frame. */
  lockAt?: number;
  /** a rejected token bounces off the closed lid at this frame. */
  rejectAt?: number;
  caption: string;
};

/**
 * The analogy visual: an open storage box with a name-tag label.
 * Tokens (values) drop in with a bounce; constants close a lid and padlock it.
 */
export const LabeledBox: React.FC<Props> = ({
  appear,
  label,
  color,
  drops,
  swapOutAt,
  lockAt,
  rejectAt,
  caption,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const boxIn = popIn(frame, fps, appear);
  const locked = lockAt !== undefined && frame >= lockAt;
  const lidP = lockAt === undefined ? 0 : easeIn(frame, fps, lockAt, 16);
  const lockPop = lockAt === undefined ? 0 : popIn(frame, fps, lockAt + 10);
  const rejectShake = rejectAt === undefined ? 0 : shake(frame, rejectAt + 8, 10);

  const tokenStyle = (at: number, isOut: boolean): React.CSSProperties => {
    const dropP = popIn(frame, fps, at);
    let y = interpolate(dropP, [0, 1], [-420, 0]);
    let opacity = frame >= at ? 1 : 0;
    let x = 0;
    if (isOut && swapOutAt !== undefined && frame >= swapOutAt) {
      const outP = easeIn(frame, fps, swapOutAt, 18);
      y = -420 * outP;
      x = 170 * outP;
      opacity = 1 - outP;
    }
    return {
      position: 'absolute',
      left: '50%',
      top: 240,
      transform: `translateX(-50%) translate(${x}px, ${y}px) scale(${0.5 + dropP * 0.5})`,
      opacity,
      width: 128,
      height: 128,
      borderRadius: '50%',
      background: `linear-gradient(160deg, ${color}, ${color}99)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.mono,
      fontWeight: 700,
      fontSize: 44,
      color: '#0B1026',
      boxShadow: `0 14px 40px ${color}44`,
    };
  };

  // rejected token: falls toward the lid, bounces off and away
  const rejectToken = (): React.CSSProperties | null => {
    if (rejectAt === undefined || frame < rejectAt) return null;
    const t = frame - rejectAt;
    const approach = Math.min(t / 10, 1);
    let y = -520 + approach * 440;
    let x = 0;
    let opacity = 1;
    if (t > 10) {
      const b = t - 10;
      y = -80 - b * 18 + b * b * 1.5;
      x = b * 20;
      opacity = Math.max(0, 1 - b / 20);
    }
    return {
      position: 'absolute',
      left: '50%',
      top: 240,
      transform: `translateX(-50%) translate(${x}px, ${y}px)`,
      opacity,
      width: 110,
      height: 110,
      borderRadius: '50%',
      background: `linear-gradient(160deg, ${colors.danger}, ${colors.danger}99)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.mono,
      fontWeight: 700,
      fontSize: 40,
      color: '#0B1026',
    } as React.CSSProperties;
  };
  const rejStyle = rejectToken();

  return (
    <div
      style={{
        position: 'relative',
        width: 460,
        opacity: Math.min(1, boxIn * 1.3),
        transform: `translateY(${(1 - boxIn) * 70}px) translateX(${rejectShake}px)`,
      }}
    >
      {/* tokens — rendered above the box body so they read as "inside" it */}
      <div style={{position: 'absolute', inset: 0, zIndex: 3}}>
        {drops.map((d, i) => (
          <div key={i} style={tokenStyle(d.at, i < drops.length - 1)}>
            {d.value}
          </div>
        ))}
        {rejStyle ? <div style={rejStyle}>3.2</div> : null}
      </div>

      {/* box body */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 190,
          height: 230,
          borderRadius: 26,
          background: `linear-gradient(180deg, rgba(30,38,74,0.95), rgba(16,22,48,0.98))`,
          border: `2px solid ${color}55`,
          boxShadow: `0 30px 70px rgba(0,0,0,0.45), inset 0 14px 30px rgba(0,0,0,0.5)`,
        }}
      >
        {/* label tag */}
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            background: color,
            color: '#0B1026',
            fontFamily: fonts.mono,
            fontWeight: 700,
            fontSize: 34,
            padding: '8px 26px',
            borderRadius: 12,
            boxShadow: '0 10px 26px rgba(0,0,0,0.4)',
            zIndex: 5,
          }}
        >
          {label}
        </div>

        {/* lid (constants only) */}
        {lockAt !== undefined ? (
          <div
            style={{
              position: 'absolute',
              top: -16,
              left: -8,
              right: -8,
              height: 34,
              borderRadius: 12,
              background: `linear-gradient(180deg, ${color}dd, ${color}88)`,
              transformOrigin: 'left center',
              transform: `rotate(${(1 - lidP) * -70}deg) scaleX(${0.4 + lidP * 0.6})`,
              opacity: frame >= lockAt ? 1 : 0,
              zIndex: 6,
            }}
          />
        ) : null}

        {/* padlock */}
        {lockAt !== undefined ? (
          <div
            style={{
              position: 'absolute',
              top: -46,
              right: 34,
              fontSize: 64,
              zIndex: 7,
              opacity: lockPop,
              transform: `scale(${lockPop})`,
              filter: `drop-shadow(0 8px 18px ${color}66)`,
            }}
          >
            🔒
          </div>
        ) : null}
      </div>

      {/* caption under box */}
      <div
        style={{
          marginTop: 30,
          textAlign: 'center',
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: 31,
          color,
          letterSpacing: 0.4,
          opacity: locked || lockAt === undefined ? 1 : 0.85,
        }}
      >
        {caption}
      </div>
    </div>
  );
};
