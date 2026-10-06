import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {colors} from '../theme';

/**
 * Persistent backdrop shared by every scene, so cuts between scenes read as
 * content changes rather than hard jumps. v2: warm near-black stage lighting
 * + film grain, replacing the v1 navy dot-grid. `technical` scenes (code /
 * pseudocode / compare) get a faint blueprint grid instead of the plain
 * glow — a quiet visual cue that we've switched into "how it works" mode.
 */
export const Background: React.FC<{technical?: boolean}> = ({technical = false}) => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 240) * 60;
  const driftB = Math.cos(frame / 300) * 70;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bgDeep}}>
      {/* asymmetric stage lighting — warm ember lower-left, cool violet upper-right */}
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 1300,
          left: -440 + driftA,
          bottom: -620,
          background: `radial-gradient(circle, ${colors.signature}1c 0%, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          right: -420 - driftB,
          top: -540,
          background: `radial-gradient(circle, ${colors.violet}17 0%, transparent 62%)`,
        }}
      />

      {technical ? (
        <AbsoluteFill
          style={{
            backgroundImage:
              'linear-gradient(rgba(246,241,231,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(246,241,231,0.035) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      ) : null}

      {/*
        Film grain — a static pre-baked noise tile, not a live SVG filter.
        feTurbulence recomputed every frame is expensive enough in headless
        Chromium to stall a render over thousands of frames; a tiled PNG with
        mix-blend-mode:overlay gives the same texture at effectively zero
        per-frame cost.
      */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('textures/grain.png')})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.5,
          mixBlendMode: 'overlay',
        }}
      />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(4,3,2,0.6) 100%)',
        }}
      />

      {/* inset frame line — a quiet "this is a composed shot" signature, not a UI card border */}
      <div style={{position: 'absolute', inset: 22, border: '1px solid rgba(246,241,231,0.07)'}} />
    </AbsoluteFill>
  );
};
