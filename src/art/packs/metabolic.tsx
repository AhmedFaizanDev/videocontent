/**
 * Domain pack: glucose metabolism and diabetes.
 *
 *   insulin   the pancreas, a blood vessel carrying glucose, and a body cell. Named in turn:
 *             glucose (sugar builds up in the blood), insulin (keys leave the pancreas),
 *             receptor (keys dock on the cell's locks), uptake (the gates open and glucose
 *             moves into the cell as energy). Failure modes, as events:
 *             type1 (the pancreas makes little or no insulin — no keys, sugar piles up)
 *             type2 (keys arrive but the locks don't respond — gates stay shut).
 *             anchors: pancreas glucose insulin receptor uptake cell type1 type2
 */
import React from 'react';
import {clamp01, mix, tw, E, hash} from '../../motion';
import {draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';
import {Form, Ping} from './circulation';

type P = [number, number];
const C = {
  panc: '#F7B267',
  pancDark: '#C4742A',
  islet: '#F25F5C',
  vessel: '#FFE4E6',
  vesselWall: '#E5484D',
  vesselDark: '#A3202E',
  glucose: '#F59E0B',
  glucoseDark: '#B45309',
  cell: '#EDE9FE',
  cellDark: '#7C3AED',
  nucleus: '#C4B5FD',
  key: '#0EA5A0',
  keyDark: '#0F766E',
  lock: '#9333EA',
  gate: '#6D28D9',
  energy: '#FBBF24',
  grey: '#B8B3C7',
  bad: '#E11D48',
};

const hex = (x: number, y: number, r: number) =>
  `M${Array.from({length: 6}, (_, i) => `${(x + r * Math.cos((Math.PI / 3) * i + Math.PI / 6)).toFixed(1)} ${(y + r * Math.sin((Math.PI / 3) * i + Math.PI / 6)).toFixed(1)}`).join(' L')} Z`;

const Glucose: React.FC<{x: number; y: number; o: number; glow?: number}> = ({x, y, o, glow = 0}) =>
  o <= 0.01 ? null : (
    <g opacity={o}>
      {glow > 0 ? <circle cx={x} cy={y} r={26} fill={C.energy} opacity={0.35 * glow} /> : null}
      <path d={hex(x, y, 15)} fill={C.glucose} stroke={C.glucoseDark} strokeWidth={3} />
    </g>
  );

/** Insulin as a key: round bow, shaft, two teeth. */
const Key: React.FC<{x: number; y: number; rot: number; o: number}> = ({x, y, rot, o}) =>
  o <= 0.01 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
      <circle cx={-22} cy={0} r={13} fill={C.key} stroke={C.keyDark} strokeWidth={3} />
      <circle cx={-22} cy={0} r={4.5} fill="#fff" />
      <path d="M-9 -4 H 22 V 4 H -9 Z" fill={C.key} stroke={C.keyDark} strokeWidth={2.5} />
      <path d="M10 4 V 12 M 18 4 V 10" stroke={C.keyDark} strokeWidth={5} strokeLinecap="round" />
    </g>
  );

const insulin: ArtFactory = () => {
  const CX = 790;
  const CY = 350;
  const CR = 180;
  // three receptor sites on the cell's left membrane, each with a gate just below it
  const sites = [-28, 0, 28].map((deg) => {
    const a = ((180 + deg) * Math.PI) / 180;
    return {x: CX + Math.cos(a) * CR, y: CY + Math.sin(a) * CR, a};
  });
  const anchors: Record<string, P> = {
    pancreas: [220, 120],
    glucose: [250, 360],
    insulin: [560, 356],
    receptor: [sites[0].x, sites[0].y],
    uptake: [sites[1].x + 10, sites[1].y],
    cell: [CX + 60, CY - 90],
    type1: [220, 120],
    type2: [sites[2].x, sites[2].y],
  };
  const VY0 = 300;
  const VY1 = 420;

  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const at = (a: string) => c.at(a);
    const on = (a: string) => at(a) != null && f >= at(a)!;
    const t1 = at('type1') != null;
    const t2 = at('type2') != null;
    const insAt = t1 ? null : (at('insulin') ?? (at('receptor') != null ? at('receptor')! - 50 : at('uptake') != null ? at('uptake')! - 90 : null));
    const dockAt = at('receptor') ?? (insAt != null ? insAt + 60 : null);
    const upAt = t1 || t2 ? null : at('uptake');
    const gluAt = at('glucose') ?? 0;

    // glucose in the blood: drifts downstream; with type 1 or 2 it keeps piling up
    const N = t1 || t2 ? 20 : 14;
    const glucose = Array.from({length: N}, (_, j) => {
      const appear = gluAt + j * 5;
      const o = at('glucose') != null || !upAt ? tw(f, appear, 12) : 1;
      const speed = 0.9 + hash(j) * 0.5;
      let x = 60 + ((hash(j * 3) * 520 + f * speed) % 540);
      let y = VY0 + 22 + hash(j * 7) * (VY1 - VY0 - 44);
      let glow = 0;
      let inCell = false;
      // uptake: each molecule, in turn, passes a gate into the cell and becomes energy
      if (upAt != null && j < 10) {
        const go = upAt + 10 + j * 7;
        const p = tw(f, go, 34, E.inOut);
        if (p > 0) {
          const gate = sites[j % 3];
          const gx = gate.x + 14;
          const gy = gate.y + 24;
          const tx = CX - 40 + hash(j * 11) * 150;
          const ty = CY - 90 + hash(j * 13) * 190;
          const px = p < 0.5 ? mix(x, gx, p * 2) : mix(gx, tx, (p - 0.5) * 2);
          const py = p < 0.5 ? mix(y, gy, p * 2) : mix(gy, ty, (p - 0.5) * 2);
          x = px;
          y = py;
          inCell = p >= 1;
          glow = p >= 1 ? 0.6 + 0.4 * Math.sin((f - go) / 6) : 0;
        }
      }
      const edge = inCell ? 1 : clamp01(Math.min(x - 50, 600 - x) / 30);
      return <Glucose key={j} x={x} y={y} o={o * edge} glow={glow} />;
    });

    // insulin keys: leave the islets, drop into the vessel, ride to the receptors
    const keys =
      insAt == null
        ? null
        : sites.map((s, k) => {
            const start = insAt + k * 10;
            const arrive = Math.max(start + 40, (dockAt ?? start + 60) + k * 6);
            const p = clamp01((f - start) / (arrive - start));
            const path: P[] = [
              [230 + k * 30, 150],
              [300 + k * 20, VY0 + 30],
              [560, VY0 + 50 + k * 16],
              [s.x - 30, s.y],
            ];
            const seg = Math.min(2, Math.floor(p * 3));
            const u = E.inOut(clamp01(p * 3 - seg));
            const [x0, y0] = path[seg];
            const [x1, y1] = path[seg + 1];
            const docked = p >= 1;
            const jiggle = docked && t2 ? Math.sin(f * 1.3 + k) * 5 * Math.exp(-((f - arrive) % 50) / 12) : 0;
            return <Key key={k} x={mix(x0, x1, u)} y={mix(y0, y1, u) + jiggle} rot={docked ? 0 : 20 * Math.sin(f / 9 + k)} o={tw(f, start, 10)} />;
          });

    const gateOpen = upAt != null ? tw(f, upAt, 16) : 0;
    const shaking = t2 && at('type2') != null && f >= at('type2')!;

    return (
      <g>
        {/* pancreas with its islets (insulin-making cells) */}
        <g opacity={t1 && on('type1') ? mix(1, 0.55, tw(f, at('type1')!, 20)) : 1}>
          <Form d="M60 128 C 70 70 170 62 260 78 C 330 90 370 96 400 118 C 420 134 402 162 370 160 C 320 158 280 170 230 184 C 150 206 52 196 60 128 Z" fill={C.panc} stroke={C.pancDark} f={f} i={0} />
          {[
            [140, 130],
            [210, 118],
            [280, 128],
            [340, 128],
          ].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={11} fill={t1 && on('type1') ? C.grey : C.islet} stroke="#fff" strokeWidth={3} opacity={fillIn(f, 1)} />
          ))}
        </g>
        {t1 && on('type1') ? (
          <g stroke={C.bad} strokeWidth={8} strokeLinecap="round" opacity={tw(f, at('type1')! + 10, 12)}>
            <path d="M190 90 L 250 150 M 250 90 L 190 150" />
          </g>
        ) : null}
        <path d="M250 190 C 262 230 280 262 300 300" stroke={C.pancDark} strokeWidth={5} strokeDasharray="4 10" strokeLinecap="round" fill="none" opacity={0.6 * fillIn(f, 1)} />

        {/* blood vessel */}
        <rect x={40} y={VY0} width={580} height={VY1 - VY0} rx={20} fill={C.vessel} opacity={fillIn(f, 1)} />
        <path d={`M40 ${VY0} H 620 M 40 ${VY1} H 620`} stroke={C.vesselWall} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 1)} />

        {/* the cell */}
        <circle cx={CX} cy={CY} r={CR} fill={C.cell} opacity={fillIn(f, 2)} />
        <circle cx={CX} cy={CY} r={CR} fill="none" stroke={C.cellDark} strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(f, 2)} />
        <circle cx={CX + 60} cy={CY + 30} r={52} fill={C.nucleus} stroke={C.cellDark} strokeWidth={3} opacity={fillIn(f, 3)} />

        {/* receptors (locks) and gates on the membrane */}
        {sites.map((s, k) => {
          const shake = shaking ? Math.sin(f * 1.1 + k * 2) * 3 : 0;
          const deg = (s.a * 180) / Math.PI;
          const lit = on('receptor') || (upAt != null && f >= upAt);
          return (
            <g key={k} opacity={fillIn(f, 3)}>
              <g transform={`translate(${s.x + shake} ${s.y}) rotate(${deg})`}>
                <path d="M-6 -22 H 22 V 22 H -6 V 9 H 10 V -9 H -6 Z" fill={lit ? C.lock : '#B79BE0'} stroke={C.gate} strokeWidth={2.5} />
              </g>
              {/* gate just below each lock: two leaves that part to let glucose in */}
              <g transform={`translate(${s.x + 14} ${s.y + 26}) rotate(${deg})`}>
                <rect x={-6} y={-14 - 10 * gateOpen} width={14} height={12} rx={4} fill={C.gate} />
                <rect x={-6} y={2 + 10 * gateOpen} width={14} height={12} rx={4} fill={C.gate} />
              </g>
              {shaking ? (
                <path d={`M${s.x - 64} ${s.y - 10} l 14 14 m 0 -14 l -14 14`} stroke={C.bad} strokeWidth={5} strokeLinecap="round" opacity={tw(f, at('type2')! + 30 + k * 6, 10)} />
              ) : null}
            </g>
          );
        })}
        {glucose}
        {keys}
        <Ping x={anchors.receptor[0]} y={anchors.receptor[1]} r={36} f={f} at={at('receptor')} />
        <Ping x={anchors.uptake[0]} y={anchors.uptake[1]} r={40} f={f} at={upAt} color={C.glucose} />
      </g>
    );
  };
  return {w: 1000, h: 560, layout: 'side', lean: 0.02, anchors, C: C_};
};

export const METABOLIC: Record<string, ArtFactory> = {insulin};
