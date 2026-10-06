import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, radius} from '../theme';
import {SceneTiming, anchorFrame, easeIn, popIn} from '../helpers';
import {KineticTitle} from '../components/KineticTitle';
import {SceneShell} from '../components/SceneShell';

const Card: React.FC<{
  appear: number;
  color: string;
  keyword: string;
  title: string;
  items: {icon: string; label: string}[];
  fromLeft: boolean;
}> = ({appear, color, keyword, title, items, fromLeft}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = easeIn(frame, fps, appear, 22);

  return (
    <div
      style={{
        width: 560,
        background: colors.panel,
        border: `2px solid ${color}55`,
        borderRadius: radius.card,
        padding: '38px 44px',
        opacity: p,
        transform: `translateX(${(1 - p) * (fromLeft ? -120 : 120)}px)`,
        boxShadow: '0 34px 80px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontWeight: 700,
            fontSize: 30,
            color: '#0B1026',
            background: color,
            borderRadius: 10,
            padding: '6px 18px',
          }}
        >
          {keyword}
        </div>
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 700,
            fontSize: 42,
            color,
            letterSpacing: 1,
          }}
        >
          {title}
        </div>
      </div>
      {items.map((item, i) => {
        const ip = popIn(frame, fps, appear + 14 + i * 9);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontFamily: fonts.body,
              fontWeight: 500,
              fontSize: 34,
              color: colors.text,
              opacity: Math.min(1, ip * 1.3),
              transform: `translateX(${(1 - ip) * 30}px)`,
            }}
          >
            <span style={{fontSize: 40}}>{item.icon}</span>
            {item.label}
          </div>
        );
      })}
    </div>
  );
};

export const Scene5Difference: React.FC<{scene: SceneTiming}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleAt = anchorFrame(scene, /one question/i, 0.06);
  const varAt = anchorFrame(scene, /use a variable/i, 0.32) - 20;
  const constAt = anchorFrame(scene, /use a constant/i, 0.62) - 20;
  const tipAt = anchorFrame(scene, /habit/i, 0.8);
  const tipIn = popIn(frame, fps, tipAt);

  return (
    <SceneShell scene={scene} kicker="Which one?">
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 54}}>
        <KineticTitle
          text="Will this value ever change?"
          delay={titleAt}
          fontSize={76}
          highlights={{change: colors.accent}}
        />
        <div style={{display: 'flex', gap: 90}}>
          <Card
            appear={varAt}
            color={colors.variable}
            keyword="let"
            title="VARIABLE"
            fromLeft
            items={[
              {icon: '🏆', label: 'a game score'},
              {icon: '⏳', label: 'a countdown timer'},
              {icon: '👤', label: 'an editable username'},
            ]}
          />
          <Card
            appear={constAt}
            color={colors.constant}
            keyword="const"
            title="CONSTANT"
            fromLeft={false}
            items={[
              {icon: '📅', label: 'days in a week — 7'},
              {icon: '🧾', label: 'a tax rate'},
              {icon: '🏷️', label: "your app's name"},
            ]}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: `linear-gradient(90deg, ${colors.accent}22, ${colors.accent}0d)`,
            border: `1.5px solid ${colors.accent}77`,
            borderRadius: radius.chip,
            padding: '16px 40px',
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 34,
            color: colors.text,
            opacity: Math.min(1, tipIn * 1.3),
            transform: `translateY(${(1 - tipIn) * 40}px)`,
          }}
        >
          ⭐ Pro habit: reach for <span style={{color: colors.constant, fontFamily: fonts.mono}}>const</span>
          first — switch to <span style={{color: colors.variable, fontFamily: fonts.mono}}>let</span> only
          when it must change.
        </div>
      </div>
    </SceneShell>
  );
};
