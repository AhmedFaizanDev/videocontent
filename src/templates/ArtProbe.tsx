/**
 * ArtProbe — one art alone on a white plate, for the art gates (scripts/art.mts): the art is
 * fitted into a 1200×900 frame and its events fire at the frames given in `events`
 * ({anchor: frame}); anchors not listed never fire (base elements show from the start).
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ARTS, ArtView} from '../art';
import {useHouseFonts} from '../fonts';

/** `grid`: a 0–1 coordinate grid over the drawing (x across, y down), so a reviewer or author can name a point on it */
export type ArtProbeProps = {art: string; data?: Record<string, unknown>; events?: Record<string, number>; showAnchors?: boolean; grid?: boolean};
export const PROBE = {w: 1200, h: 900, pad: 60};

export const ArtProbe: React.FC<ArtProbeProps> = ({art, data, events = {}, showAnchors, grid}) => {
  useHouseFonts();
  const f = useCurrentFrame();
  const def = React.useMemo(() => ARTS[art](data ?? {}), [art, data]);
  const k = Math.min((PROBE.w - 2 * PROBE.pad) / def.w, (PROBE.h - 2 * PROBE.pad) / def.h);
  const x = (PROBE.w - def.w * k) / 2;
  const y = (PROBE.h - def.h * k) / 2;
  // the gate reads the art's geometry from here (scripts/art.mts)
  console.log(`[probe] ${JSON.stringify({w: def.w, h: def.h, k, x, y, anchors: def.anchors})}`);
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <ArtView art={def} k={k} ctx={{f, at: (a) => events[a] ?? null}} style={{left: x, top: y}} />
      {grid
        ? Array.from({length: 21}, (_, i) => i / 20).flatMap((t) => {
            const major = Math.round(t * 20) % 2 === 0;
            const c = major ? 'rgba(20,90,200,0.55)' : 'rgba(20,90,200,0.22)';
            const lab = {position: 'absolute' as const, fontFamily: 'Noto Sans, sans-serif', fontSize: 15, fontWeight: 700, color: '#1458C8', background: 'rgba(255,255,255,0.85)', padding: '0 2px'};
            return [
              <div key={`v${t}`} style={{position: 'absolute', left: x + t * def.w * k, top: y, width: 1, height: def.h * k, background: c}} />,
              <div key={`h${t}`} style={{position: 'absolute', left: x, top: y + t * def.h * k, width: def.w * k, height: 1, background: c}} />,
              ...(major ? [<div key={`lx${t}`} style={{...lab, left: x + t * def.w * k - 12, top: y - 22}}>{t.toFixed(1)}</div>, <div key={`ly${t}`} style={{...lab, left: x - 36, top: y + t * def.h * k - 10}}>{t.toFixed(1)}</div>] : []),
            ];
          })
        : null}
      {showAnchors
        ? Object.entries(def.anchors).map(([name, [ax, ay]]) => (
            <div key={name} style={{position: 'absolute', left: x + ax * k - 7, top: y + ay * k - 7, width: 14, height: 14, borderRadius: 7, background: '#D8148C', border: '3px solid #fff', boxShadow: '0 0 0 2px #D8148C'}}>
              <div style={{position: 'absolute', left: 18, top: -8, fontFamily: 'Noto Sans, sans-serif', fontWeight: 700, fontSize: 18, color: '#6A1F8E', background: 'rgba(255,255,255,0.9)', padding: '0 4px', whiteSpace: 'nowrap'}}>{name}</div>
            </div>
          ))
        : null}
    </AbsoluteFill>
  );
};
