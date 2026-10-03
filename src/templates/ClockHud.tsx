/**
 * A running clock across a stretch of scenes (spec `clock`): elapsed real time since a moment
 * the story starts counting from (a cardiac arrest, an incident), top-right, with a pulsing
 * red dot. It freezes and turns green when it stops, then fades. The viewer feels the seconds.
 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {fonts} from '../theme';
import {E, clamp01, tw} from '../motion';

export const ClockHud: React.FC<{from: number; stop: number; out: number}> = ({from, stop, out}) => {
  const f = useCurrentFrame();
  if (f < from - 10 || f > out + 20) return null;
  const run = Math.min(f, stop) - from;
  const sec = Math.max(0, Math.floor(run / 30));
  const stopped = f >= stop;
  const o = tw(f, from - 10, 12, E.out) * (1 - tw(f, out, 18, E.inOut));
  const pulse = stopped ? 1 : 0.35 + 0.65 * Math.abs(Math.cos((f - from) / 30 * Math.PI));
  const col = stopped ? '#22A55B' : '#E11D48';
  const pop = 1 + 0.08 * (stopped ? 1 - tw(f, stop, 14, E.out) : 0);
  return (
    <div
      style={{
        position: 'absolute',
        right: 64,
        top: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px 10px 16px',
        borderRadius: 16,
        background: 'rgba(12,16,32,0.72)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        opacity: o,
        transform: `scale(${pop})`,
        transformOrigin: 'right top',
      }}
    >
      <div style={{width: 16, height: 16, borderRadius: 8, background: col, opacity: clamp01(pulse), boxShadow: `0 0 12px ${col}`}} />
      <div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 40, lineHeight: 1, color: stopped ? '#86EFAC' : '#FFFFFF', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em'}}>
        {`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`}
      </div>
    </div>
  );
};
