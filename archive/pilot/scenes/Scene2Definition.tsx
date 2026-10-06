import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, radius} from '../theme';
import {SceneTiming, anchorFrame, easeIn, popIn} from '../helpers';
import {KineticTitle} from '../components/KineticTitle';
import {SceneShell} from '../components/SceneShell';

const ExampleChip: React.FC<{icon: string; label: string; at: number}> = ({icon, label, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = popIn(frame, fps, at);
  if (frame < at) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: colors.panel,
        border: `1px solid ${colors.panelBorder}`,
        borderRadius: radius.chip,
        padding: '14px 30px',
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: 32,
        color: colors.text,
        opacity: Math.min(1, p * 1.3),
        transform: `translateY(${(1 - p) * 34}px) scale(${0.9 + p * 0.1})`,
      }}
    >
      <span style={{fontSize: 38}}>{icon}</span>
      {label}
    </div>
  );
};

/** A named memory cell whose value gets swapped live. */
const MemoryCell: React.FC<{appear: number; swapAt: number}> = ({appear, swapAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = popIn(frame, fps, appear);
  const swap = easeIn(frame, fps, swapAt, 18);
  const newIn = popIn(frame, fps, swapAt + 8);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        background: colors.panel,
        border: `2px solid ${colors.variable}55`,
        borderRadius: radius.card,
        padding: '30px 46px',
        opacity: Math.min(1, p * 1.3),
        transform: `translateY(${(1 - p) * 50}px)`,
        boxShadow: '0 30px 70px rgba(0,0,0,0.45)',
      }}
    >
      <div
        style={{
          background: colors.variable,
          color: '#0B1026',
          fontFamily: fonts.mono,
          fontWeight: 700,
          fontSize: 34,
          padding: '10px 24px',
          borderRadius: 12,
          transform: 'rotate(-2deg)',
        }}
      >
        name
      </div>
      <div style={{fontFamily: fonts.mono, fontSize: 44, color: colors.textDim}}>=</div>
      <div style={{position: 'relative', width: 190, height: 78}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.mono,
            fontWeight: 700,
            fontSize: 48,
            color: colors.text,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            opacity: 1 - swap,
            transform: `translateY(${swap * -60}px)`,
          }}
        >
          "Ava"
        </div>
        {frame >= swapAt + 8 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonts.mono,
              fontWeight: 700,
              fontSize: 48,
              color: colors.variable,
              background: `${colors.variable}14`,
              border: `1.5px solid ${colors.variable}66`,
              borderRadius: 14,
              opacity: newIn,
              transform: `translateY(${(1 - newIn) * 60}px)`,
            }}
          >
            "Ben"
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Scene2Definition: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const chip1 = anchorFrame(scene, /score in a game/i, 0.06);
  const chip2 = anchorFrame(scene, /items in your cart/i, 0.12);
  const chip3 = anchorFrame(scene, /name you just typed/i, 0.18);
  const defAt = anchorFrame(scene, /named piece/i, 0.36);
  const cellAt = anchorFrame(scene, /give it a name/i, 0.72);
  const swapAt = anchorFrame(scene, /swap that something/i, 0.88);

  return (
    <SceneShell scene={scene} kicker="What is a variable?">
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 70}}>
        <div style={{display: 'flex', gap: 30}}>
          <ExampleChip icon="🎮" label="your score" at={chip1} />
          <ExampleChip icon="🛒" label="cart items" at={chip2} />
          <ExampleChip icon="⌨️" label="the name you typed" at={chip3} />
        </div>
        <KineticTitle
          text="A variable is a named piece of memory that holds a value."
          delay={defAt}
          stagger={3}
          fontSize={72}
          maxWidth={1360}
          highlights={{named: colors.accent, value: colors.variable, variable: colors.variable}}
        />
        <MemoryCell appear={cellAt} swapAt={swapAt} />
      </div>
    </SceneShell>
  );
};
