/**
 * ArtProbe — one art alone on a white plate, for the art gates (scripts/art.mts): the art is
 * fitted into a 1200×900 frame and its events fire at the frames given in `events`
 * ({anchor: frame}); anchors not listed never fire (base elements show from the start).
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ARTS, ArtView} from '../art';
import {useHouseFonts} from '../fonts';

export type ArtProbeProps = {art: string; data?: Record<string, unknown>; events?: Record<string, number>; showAnchors?: boolean};
export const PROBE = {w: 1200, h: 900, pad: 60};

export const ArtProbe: React.FC<ArtProbeProps> = ({art, data, events = {}, showAnchors}) => {
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
