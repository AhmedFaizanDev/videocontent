import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, radius} from '../theme';
import {popIn, shake} from '../helpers';

export type Segment = {t: string; c?: string};
export type CodeLine = {segments: Segment[]; at: number};
export type Annotation = {
  line: number;
  col: number;
  text: string;
  color: string;
  at: number;
  until?: number;
};
export type Highlight = {line: number; at: number; until?: number; color: string};

const FONT_SIZE = 46;
const CHAR_W = FONT_SIZE * 0.6; // JetBrains Mono advance width
const LINE_H = 84;
const PAD_X = 56;
const TYPE_SPEED = 1.5; // chars per frame

type Props = {
  appear: number;
  lines: CodeLine[];
  annotations?: Annotation[];
  highlights?: Highlight[];
  errorAt?: number;
  errorLine?: number;
  errorText?: string;
  fileName?: string;
  width?: number;
};

/** Editor-style code card: lines type out, get highlighted, annotated and can error. */
export const CodeBlock: React.FC<Props> = ({
  appear,
  lines,
  annotations = [],
  highlights = [],
  errorAt,
  errorLine,
  errorText,
  fileName = 'variables.js',
  width = 1150,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cardIn = popIn(frame, fps, appear);
  const errShake = errorAt === undefined ? 0 : shake(frame, errorAt, 16);
  const toastIn = errorAt === undefined ? 0 : popIn(frame, fps, errorAt + 4);

  return (
    <div
      style={{
        position: 'relative',
        width,
        opacity: Math.min(1, cardIn * 1.3),
        transform: `translateY(${(1 - cardIn) * 60}px) translateX(${errShake}px)`,
      }}
    >
      <div
        style={{
          borderRadius: radius.code,
          background: 'linear-gradient(180deg, rgba(22,28,58,0.97), rgba(13,17,38,0.98))',
          border: `1px solid ${colors.panelBorder}`,
          boxShadow: '0 40px 90px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* window chrome */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '20px 28px',
            borderBottom: `1px solid ${colors.panelBorder}`,
          }}
        >
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c}} />
          ))}
          <div
            style={{
              marginLeft: 18,
              fontFamily: fonts.mono,
              fontSize: 26,
              color: colors.textDim,
            }}
          >
            {fileName}
          </div>
        </div>

        {/* code */}
        <div style={{padding: `34px ${PAD_X}px 40px`, position: 'relative'}}>
          {lines.map((line, li) => {
            const total = line.segments.reduce((n, s) => n + s.t.length, 0);
            const typed = Math.max(0, Math.min(total, Math.floor((frame - line.at) * TYPE_SPEED)));
            const isTyping = frame >= line.at && typed < total;
            const hl = highlights.find(
              (h) => h.line === li && frame >= h.at && (h.until === undefined || frame < h.until),
            );
            const isErr = errorAt !== undefined && errorLine === li && frame >= errorAt;

            let used = 0;
            return (
              <div
                key={li}
                style={{
                  position: 'relative',
                  height: LINE_H,
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: fonts.mono,
                  fontSize: FONT_SIZE,
                  whiteSpace: 'pre',
                  borderRadius: 12,
                  padding: '0 18px',
                  margin: '0 -18px',
                  background: isErr
                    ? `${colors.danger}1f`
                    : hl
                      ? `${hl.color}17`
                      : 'transparent',
                  boxShadow: isErr
                    ? `inset 3px 0 0 ${colors.danger}`
                    : hl
                      ? `inset 3px 0 0 ${hl.color}`
                      : undefined,
                }}
              >
                <span style={{color: 'rgba(154,163,199,0.45)', width: 64, fontSize: 30}}>
                  {line.segments.length > 0 ? li + 1 : ''}
                </span>
                {line.segments.map((seg, si) => {
                  const visible = Math.max(0, Math.min(seg.t.length, typed - used));
                  used += seg.t.length;
                  return (
                    <span key={si} style={{color: seg.c ?? colors.text}}>
                      {seg.t.slice(0, visible)}
                    </span>
                  );
                })}
                {isTyping ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: CHAR_W * 0.66,
                      height: FONT_SIZE * 1.1,
                      background: colors.accent,
                      marginLeft: 3,
                      borderRadius: 3,
                    }}
                  />
                ) : null}
              </div>
            );
          })}

          {/* annotations pointing at tokens */}
          {annotations.map((a, i) => {
            const p = popIn(frame, fps, a.at);
            const fadeOut =
              a.until === undefined
                ? 1
                : interpolate(frame, [a.until, a.until + 8], [1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });
            if (frame < a.at || fadeOut === 0) return null;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: PAD_X + 64 + 18 + a.col * CHAR_W,
                  top: 34 + (a.line + 1) * LINE_H - 6,
                  opacity: Math.min(1, p * 1.4) * fadeOut,
                  transform: `translateY(${(1 - p) * 18}px)`,
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 20,
                    background: a.color,
                    marginLeft: 18,
                    borderRadius: 2,
                  }}
                />
                <div
                  style={{
                    background: a.color,
                    color: '#0B1026',
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: 25,
                    padding: '5px 16px',
                    borderRadius: 9,
                    boxShadow: `0 10px 26px ${a.color}44`,
                  }}
                >
                  {a.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* error toast */}
      {errorAt !== undefined && errorText ? (
        <div
          style={{
            position: 'absolute',
            right: -30,
            bottom: -76,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'rgba(40,12,22,0.96)',
            border: `1.5px solid ${colors.danger}`,
            borderRadius: 16,
            padding: '16px 28px',
            fontFamily: fonts.mono,
            fontSize: 29,
            color: '#FFD9DF',
            opacity: Math.min(1, toastIn * 1.3),
            transform: `translateY(${(1 - toastIn) * 30}px) scale(${0.9 + toastIn * 0.1})`,
            boxShadow: `0 24px 60px ${colors.danger}33`,
          }}
        >
          <span style={{fontSize: 34}}>⛔️</span>
          {errorText}
        </div>
      ) : null}
    </div>
  );
};
