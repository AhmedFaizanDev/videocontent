/**
 * Domain pack: flexible endoscope reprocessing (MS-CSSD-15 Module 10). Custom illustrations
 * with narration-keyed states. A pack is just a map of art name → factory; register it in
 * src/art/index.ts and describe its anchors in src/art/catalog.ts.
 */
import React from 'react';
import {fonts, ink} from '../../theme';
import {E, clamp01, hash, mix, tw} from '../../motion';
import {Arrow, Drop, INK, Rod, Sh, Tube, base, circ, draw, rect, type ArtCtx, type ArtDef, type ArtFactory} from '../kit';
/* ======================================================================== scope */
const SCOPE_TUBE = 'M210 412 C 212 540 320 592 470 580 C 640 566 700 472 826 482';
const SCOPE_BEND = 'M826 482 C 876 486 912 505 930 532';
const ScopeArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const head = 'M150 110 Q150 80 180 80 L240 80 Q270 80 270 110 L268 250 Q266 300 250 330 L238 372 L182 372 L170 330 Q154 300 152 250 Z';
  const tipOn = c.at('distalTip');
  const beam = tipOn != null ? tw(f, tipOn + 4, 14) : 0;
  const chOn = c.at('channels');
  const ch = chOn != null ? tw(f, chOn, 40, E.inOut) : 0;
  const valveOn = c.at('valves');
  const press = valveOn != null ? Math.max(0, Math.sin(clamp01((f - valveOn - 6) / 24) * Math.PI)) * 7 : 0;
  return (
    <g>
      {/* umbilical cord + connector */}
      <Tube d="M268 128 C 360 40 540 30 650 80 C 730 116 770 150 812 150" p={draw(f, 4, 30)} w={22} core={ink.paperShade} />
      <Sh d={rect(812, 112, 146, 80, 12)} fill={ink.paperShade} p={draw(f, 6)} />
      <Sh d={rect(958, 138, 34, 26, 4)} fill={ink.sun} p={draw(f, 7)} />
      <Sh d={circ(846, 172, 9)} fill={ink.blue} p={draw(f, 7)} sw={3} />
      {/* insertion tube with depth marks, bending section, tip */}
      <Tube d={SCOPE_TUBE} p={draw(f, 2, 34)} w={26} />
      <path d={SCOPE_TUBE} fill="none" stroke={INK} strokeWidth={16} strokeDasharray="2 44" opacity={0.45 * tw(f, 40, 20)} />
      <Tube d={SCOPE_BEND} p={draw(f, 8, 12)} w={26} core={ink.paperShade} />
      <path d={SCOPE_BEND} fill="none" stroke={INK} strokeWidth={17} strokeDasharray="3 9" opacity={0.6 * tw(f, 52, 14)} />
      {beam > 0 ? <path d="M938 540 L1000 590 L1000 520 Z" fill={ink.sun} opacity={0.55 * beam} style={{mixBlendMode: 'multiply'}} /> : null}
      <Sh d={circ(934, 538, 17)} fill={ink.paperShade} p={draw(f, 9)} />
      <circle cx={938} cy={541} r={5} fill={ink.blue} opacity={tw(f, 60, 10)} />
      {/* channels running inside (revealed) */}
      {ch > 0 ? (
        <g opacity={0.95}>
          {[SCOPE_TUBE + ' ' + SCOPE_BEND.replace('M826 482', 'L826 482'), 'M262 132 C 360 48 540 38 650 88 C 730 124 770 156 812 156'].map((d, i) => (
            <path key={i} d={d} fill="none" stroke={ink.orange} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ch} style={{mixBlendMode: 'multiply'}} />
          ))}
          <path d="M210 372 L210 412" stroke={ink.orange} strokeWidth={5} opacity={ch} />
          <path d="M150 312 L210 360" stroke={ink.orange} strokeWidth={5} opacity={ch} strokeDasharray="6 6" />
        </g>
      ) : null}
      {/* control head */}
      <Sh d={head} fill={ink.paperShade} p={draw(f, 0)} />
      <Sh d="M182 372 L196 412 L224 412 L238 372" fill={ink.paperShade} p={draw(f, 1)} />
      <path d="M160 250 L262 250" stroke={INK} strokeWidth={2} opacity={0.5 * tw(f, 30, 12)} />
      {/* valves */}
      <g transform={`translate(0 ${press})`}>
        <Sh d={rect(177, 50, 28, 32, 5)} fill={ink.red} p={draw(f, 1)} sw={3} />
        <Sh d={rect(221, 50, 28, 32, 5)} fill={ink.blue} p={draw(f, 1)} sw={3} />
      </g>
      {/* biopsy port */}
      <Sh d="M158 292 L110 318 L118 334 L166 308 Z" fill={ink.paperShade} p={draw(f, 2)} sw={3} />
      <Sh d={circ(113, 326, 12)} fill={ink.sun} p={draw(f, 3)} sw={3} />
      {/* angulation knobs */}
      <Sh d={circ(300, 172, 54)} fill={ink.teal} p={draw(f, 1)} fo={0.55} />
      {Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <path key={i} d={`M${300 + Math.cos(a) * 44} ${172 + Math.sin(a) * 44} L${300 + Math.cos(a) * 54} ${172 + Math.sin(a) * 54}`} stroke={INK} strokeWidth={3} opacity={tw(f, 24 + i, 8)} />;
      })}
      <Sh d={circ(300, 172, 30)} fill={ink.paperLight} p={draw(f, 2)} />
      <Sh d="M318 150 L356 108" p={draw(f, 3)} sw={6} />
    </g>
  );
};

/* ======================================================================== channels */
const CH = {cx: 520, cy: 310, R: 270};
const WIRES: [number, number][] = [
  [361, 151],
  [679, 151],
  [361, 469],
  [679, 469],
];
const ChannelsArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const soil = c.at('suction');
  const soilP = soil != null ? tw(f, soil + 6, 30) : 0;
  const fibres = (x: number, y: number, r: number, k: number) =>
    Array.from({length: 16}, (_, i) => {
      const a = i * 2.39996;
      const rr = r * 0.78 * Math.sqrt((i + 0.5) / 16);
      return <circle key={`${k}-${i}`} cx={x + Math.cos(a) * rr} cy={y + Math.sin(a) * rr} r={3.4} fill={INK} opacity={0.55 * tw(f, 34 + k * 4, 12)} />;
    });
  return (
    <g>
      {/* inset: where the cut is */}
      <Tube d="M30 560 C 70 540 120 520 190 470" p={draw(f, 0, 18)} w={16} />
      <ellipse cx={112} cy={522} rx={9} ry={16} fill="none" stroke={ink.orange} strokeWidth={3} opacity={tw(f, 16, 10)} transform="rotate(-35 112 522)" />
      <path d="M118 510 L 330 150 M 124 532 L 300 520" stroke={ink.orange} strokeWidth={2} strokeDasharray="5 7" opacity={0.8 * tw(f, 22, 12)} />
      {/* sheath (thickness) + body */}
      <Sh d={circ(CH.cx, CH.cy, CH.R)} fill={ink.paperShade} p={draw(f, 1, 30)} sw={5} />
      <Sh d={circ(CH.cx, CH.cy, CH.R - 26)} fill={ink.paperLight} p={draw(f, 2, 30)} sw={3} />
      {/* suction / biopsy */}
      <Sh d={circ(440, 250, 88)} fill={ink.paper} p={draw(f, 3)} sw={5} />
      {soilP > 0
        ? [
            [410, 290, 26, 12],
            [462, 300, 20, 9],
            [440, 212, 14, 8],
            [490, 250, 12, 10],
            [394, 244, 12, 9],
          ].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx * soilP} ry={ry * soilP} fill={i % 2 ? ink.red : ink.orange} opacity={0.75} style={{mixBlendMode: 'multiply'}} />)
        : null}
      {/* air, water */}
      <Sh d={circ(620, 200, 34)} fill={ink.paper} p={draw(f, 4)} />
      <Sh d={circ(700, 280, 34)} fill={ink.blue} fo={0.35} p={draw(f, 5)} />
      {/* light guides + image cable */}
      <Sh d={circ(420, 420, 46)} fill={ink.sun} fo={0.8} p={draw(f, 6)} />
      <Sh d={circ(560, 460, 46)} fill={ink.sun} fo={0.8} p={draw(f, 6)} />
      {fibres(420, 420, 46, 0)}
      {fibres(560, 460, 46, 1)}
      <Sh d={circ(700, 380, 40)} fill={ink.teal} fo={0.6} p={draw(f, 7)} />
      <circle cx={700} cy={380} r={14} fill={INK} opacity={tw(f, 44, 10)} />
      {/* angulation wires in coil sheaths */}
      {WIRES.map(([x, y], i) => (
        <g key={i}>
          <Sh d={circ(x, y, 15)} fill={ink.paperShade} p={draw(f, 8)} sw={3} />
          <circle cx={x} cy={y} r={5} fill={INK} opacity={tw(f, 48, 10)} />
        </g>
      ))}
    </g>
  );
};

/* ======================================================================== biofilm */
const WALL_TOP = 120;
const WALL_BOT = 500;
const mound = (x: number) => 38 + 14 * Math.sin(x / 61) + 8 * Math.sin(x / 23 + 1.3);
const BiofilmArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const brushAt = c.at('brush');
  const bx = brushAt != null ? mix(-180, 1200, clamp01((f - brushAt) / 120)) : -1e4;
  const kept = (x: number) => x > bx + 10;
  const soilP = tw(f, base(c, 'soil'), 26);
  const bacAt = base(c, 'bacteria');
  const grow = tw(f, base(c, 'matrix'), 44, E.inOut);
  const matrixTop = (x: number) => WALL_BOT - mound(x) * grow;
  const x0 = Math.max(10, bx + 10);
  let mPath = '';
  if (grow > 0 && x0 < 990) {
    const pts: string[] = [];
    for (let x = x0; x <= 990; x += 10) pts.push(`${x.toFixed(0)} ${matrixTop(x).toFixed(1)}`);
    mPath = `M${x0} ${WALL_BOT} L${pts.join(' L')} L990 ${WALL_BOT}Z`;
  }
  const disAt = c.at('disinfectant');
  const flowAt = c.at('flow');
  return (
    <g>
      {/* channel walls */}
      <Sh d={rect(0, 50, 1000, WALL_TOP - 50)} fill={ink.paperShade} p={draw(f, 0)} sw={0} />
      <Sh d={rect(0, WALL_BOT, 1000, 80)} fill={ink.paperShade} p={draw(f, 0)} sw={0} />
      {Array.from({length: 26}, (_, i) => (
        <path key={i} d={`M${i * 40} ${WALL_BOT + 72} L${i * 40 + 34} ${WALL_BOT + 10} M${i * 40} ${WALL_TOP - 8} L${i * 40 + 34} ${WALL_TOP - 62}`} stroke={INK} strokeWidth={2} opacity={0.35 * tw(f, 10 + i * 0.6, 10)} />
      ))}
      <Sh d={`M0 ${WALL_TOP} L1000 ${WALL_TOP}`} p={draw(f, 1, 30)} />
      <Sh d={`M0 ${WALL_BOT} L1000 ${WALL_BOT}`} p={draw(f, 1, 30)} />
      {/* flushing / soaking flows straight over */}
      {flowAt != null && f >= flowAt
        ? [210, 270, 330, 390].map((y, i) => (
            <g key={i} opacity={tw(f, flowAt + i * 3, 12) * (1 - tw(f, flowAt + 150, 20))}>
              <path d={`M20 ${y} C 300 ${y - 8}, 600 ${y + 8}, 950 ${y}`} fill="none" stroke={ink.soft} strokeWidth={4} strokeDasharray="28 18" strokeDashoffset={-(f - flowAt) * 6} strokeLinecap="round" />
              <Arrow x1={930} y1={y} x2={960} y2={y} color={ink.soft} w={4} />
            </g>
          ))
        : null}
      {/* organic soil */}
      {Array.from({length: 10}, (_, i) => {
        const x = 70 + i * 95 + hash(i) * 30;
        if (!kept(x)) return null;
        const s = tw(f, base(c, 'soil') + i * 3, 18, E.out);
        return <ellipse key={i} cx={x} cy={WALL_BOT - 8} rx={38 * s} ry={15 * s} fill={i % 3 ? ink.orange : ink.red} opacity={0.7 * soilP} style={{mixBlendMode: 'multiply'}} />;
      })}
      {/* matrix */}
      {mPath ? (
        <>
          <path d={mPath} fill={ink.sun} opacity={0.5} style={{mixBlendMode: 'multiply'}} />
          <path d={mPath} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="7 6" opacity={0.8 * grow} />
        </>
      ) : null}
      {/* bacteria */}
      {Array.from({length: 22}, (_, i) => {
        const x = 40 + i * 44 + hash(i + 7) * 20;
        if (!kept(x)) return null;
        const onTop = i % 6 === 5;
        const y = onTop ? WALL_TOP + 12 : WALL_BOT - 10 - hash(i + 3) * 22 * Math.max(0.4, grow);
        const o = tw(f, bacAt + i * 1.5, 10);
        return <Rod key={i} x={x} y={y} rot={hash(i + 11) * 120 - 60 + Math.sin((f + i * 9) / 14) * 4} o={o} />;
      })}
      {/* disinfectant can't get in: droplets bounce off the matrix */}
      {disAt != null && f >= disAt
        ? Array.from({length: 8}, (_, k) => {
            const x = 110 + k * 112;
            if (!kept(x)) return null;
            const t = (f - disAt - k * 7) % 56;
            if (f - disAt - k * 7 < 0 || f - disAt > 190) return null;
            const hit = matrixTop(x) - 12;
            const y = t < 28 ? mix(WALL_TOP + 20, hit, Math.pow(t / 28, 2)) : hit - 70 * Math.sin(((t - 28) / 28) * Math.PI) * (1 - (t - 28) / 56);
            const o = t < 28 ? 1 : 1 - (t - 28) / 28;
            return (
              <g key={k}>
                <Drop x={x + (t > 28 ? (t - 28) * (k % 2 ? 1.2 : -1.2) : 0)} y={y} r={10} o={o} />
                {t > 26 && t < 36 ? <path d={`M${x - 16} ${hit + 2} L${x - 26} ${hit - 8} M${x + 16} ${hit + 2} L${x + 26} ${hit - 8}`} stroke={ink.blue} strokeWidth={3} /> : null}
              </g>
            );
          })
        : null}
      {/* the brush: bristles scrub the wall and lift the biofilm away */}
      {brushAt != null && bx > -170 && bx < 1190 ? (
        <g>
          <path d={`M${bx - 900} 310 L${bx - 70} 310`} stroke={INK} strokeWidth={7} />
          {Array.from({length: 16}, (_, i) => {
            const x = bx - 70 + i * 5;
            return (
              <g key={i} stroke={INK} strokeWidth={2.4}>
                <path d={`M${x} 310 L${x - 8} ${WALL_TOP + 4}`} />
                <path d={`M${x} 310 L${x - 8} ${WALL_BOT - 4}`} />
              </g>
            );
          })}
          <path d={`M${bx - 70} 310 L${bx + 12} 310`} stroke={ink.sun} strokeWidth={9} strokeDasharray="5 4" />
          {Array.from({length: 7}, (_, i) => {
            const t = (f - brushAt + i * 5) % 30;
            return <ellipse key={i} cx={bx - 90 - t * 3} cy={WALL_BOT - 30 - t * 2 - i * 6} rx={9} ry={5} fill={i % 2 ? ink.sun : ink.orange} opacity={0.7 * (1 - t / 30)} />;
          })}
        </g>
      ) : null}
    </g>
  );
};

/* ======================================================================== leak test */
const LEAK_TUBE = 'M160 420 C 120 470 170 540 300 520 C 430 500 520 420 640 450 C 760 480 820 540 900 500';
const LeakArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const pressAt = c.at('tester');
  const gaugeAt = c.at('gauge');
  const breachAt = c.at('breach');
  const bubAt = c.at('bubbles') ?? breachAt;
  const up = pressAt != null ? tw(f, pressAt, 34, E.inOut) : 0;
  const fall = gaugeAt != null ? tw(f, gaugeAt + 6, 80, E.soft) : 0;
  const ang = -210 + 150 * up - 90 * fall;
  const rad = (ang * Math.PI) / 180;
  const wave = (y: number) => {
    const pts: string[] = [];
    for (let x = 44; x <= 956; x += 16) pts.push(`${x} ${(y + Math.sin(x / 38 + f / 9) * 3).toFixed(1)}`);
    return pts.join(' L');
  };
  return (
    <g>
      {/* basin + clean water */}
      <Sh d="M40 300 L960 300 L930 592 L70 592 Z" fill={ink.paperLight} p={draw(f, 0, 30)} />
      <path d={`M${wave(334)} L930 586 L72 586 Z`} fill={ink.blue} opacity={0.26 * tw(f, 16, 20)} style={{mixBlendMode: 'multiply'}} />
      <path d={`M${wave(334)}`} fill="none" stroke={ink.blue} strokeWidth={3} opacity={0.6 * tw(f, 16, 20)} />
      {/* scope, pressurised */}
      <Tube d="M430 254 C 430 330 250 330 160 420" p={draw(f, 3)} w={20} core={ink.paperShade} />
      <Tube d={LEAK_TUBE} p={draw(f, 4, 34)} w={24} core={up > 0 ? ink.paperLight : ink.paperLight} />
      {up > 0 ? <path d={LEAK_TUBE} fill="none" stroke={ink.sun} strokeWidth={8} opacity={0.5 * up} style={{mixBlendMode: 'multiply'}} /> : null}
      {/* breach */}
      {breachAt != null && f >= breachAt ? (
        <path d="M626 436 L634 446 L640 434 L648 446 L654 436" fill="none" stroke={ink.red} strokeWidth={4} strokeLinejoin="round" opacity={tw(f, breachAt, 8)} />
      ) : null}
      {bubAt != null && up > 0.5 && f >= bubAt
        ? Array.from({length: 12}, (_, i) => {
            const t = (f - bubAt + i * 11) % 44;
            const y = mix(430, 340, t / 44);
            const x = 642 + Math.sin((t + i * 13) / 6) * 8 + (i % 3) * 6 - 6;
            const r = 4 + (i % 4) * 1.6 + t * 0.06;
            return <circle key={i} cx={x} cy={y} r={r} fill={ink.paperLight} stroke={INK} strokeWidth={2} opacity={f - bubAt < 12 ? tw(f, bubAt, 12) : 1} />;
          })
        : null}
      {/* connector cap + hose + tester */}
      <Sh d={rect(398, 206, 64, 50, 8)} fill={ink.paperShade} p={draw(f, 2)} />
      <Tube d="M300 128 C 380 128 400 170 426 206" p={draw(f, 2)} w={12} core={ink.sun} />
      <Sh d={rect(40, 40, 262, 170, 14)} fill={ink.paperShade} p={draw(f, 1)} />
      <Sh d={circ(130, 122, 58)} fill={ink.paperLight} p={draw(f, 2)} />
      {Array.from({length: 11}, (_, i) => {
        const a = ((-210 + i * 24) * Math.PI) / 180;
        return <path key={i} d={`M${130 + Math.cos(a) * 44} ${122 + Math.sin(a) * 44} L${130 + Math.cos(a) * 52} ${122 + Math.sin(a) * 52}`} stroke={i > 7 ? ink.red : INK} strokeWidth={3} opacity={tw(f, 20 + i, 8)} />;
      })}
      <path d={`M130 122 L${130 + Math.cos(rad) * 44} ${122 + Math.sin(rad) * 44}`} stroke={ink.red} strokeWidth={5} strokeLinecap="round" opacity={tw(f, 26, 8)} />
      <circle cx={130} cy={122} r={7} fill={INK} opacity={tw(f, 26, 8)} />
      <Sh d={circ(244, 124, 32)} fill={ink.sun} p={draw(f, 3)} />
    </g>
  );
};

/* ======================================================================== duodenoscope elevator */
const ElevatorArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const elAt = c.at('elevator');
  // the elevator raises, drops and raises again (as it's worked during a procedure)
  const raise = elAt != null ? (f < elAt + 70 ? tw(f, elAt + 4, 18, E.inOut) - tw(f, elAt + 40, 16, E.inOut) + tw(f, elAt + 56, 14, E.inOut) : 1) : 0;
  const accAt = c.at('accessory');
  const acc = accAt != null ? tw(f, accAt, 34, E.inOut) : 0;
  const recAt = c.at('recess');
  const rec = recAt != null ? tw(f, recAt, 16) : 0;
  const body = 'M60 240 L600 240 L600 330 L790 330 L790 240 L810 240 Q900 240 900 335 Q900 430 810 430 L60 430';
  return (
    <g transform="translate(0 -110)">
      <path d={`${body} Z`} fill={ink.paperShade} opacity={0.9 * tw(f, 10, 20)} style={{mixBlendMode: 'multiply'}} />
      <Sh d={body} p={draw(f, 0, 34)} sw={5} />
      {[110, 170, 230, 290].map((x, i) => (
        <path key={i} d={`M${x} 242 Q${x + 10} 335 ${x} 428`} fill="none" stroke={INK} strokeWidth={2} opacity={0.45 * tw(f, 20 + i * 3, 10)} />
      ))}
      {/* accessory channel inside */}
      <path d="M60 300 L600 300" stroke={INK} strokeWidth={2.5} strokeDasharray="10 8" opacity={0.7 * tw(f, 26, 12)} />
      <path d="M60 318 L600 318" stroke={INK} strokeWidth={2.5} strokeDasharray="10 8" opacity={0.7 * tw(f, 26, 12)} />
      {/* optics on the side-viewing face */}
      <Sh d="M488 240 Q520 214 552 240" fill={ink.blue} p={draw(f, 3)} />
      <Sh d={rect(430, 232, 40, 8, 3)} fill={ink.sun} p={draw(f, 3)} sw={3} />
      {/* recess shading + trapped soil */}
      <path d={rect(602, 242, 186, 86)} fill={INK} opacity={0.08 * tw(f, 30, 12)} />
      {rec > 0 ? (
        <g>
          <path d={rect(598, 238, 196, 96, 6)} fill="none" stroke={ink.red} strokeWidth={4} strokeDasharray="10 7" opacity={rec * (0.6 + 0.4 * Math.sin(f / 5))} />
          {[
            [612, 322, 9],
            [632, 326, 6],
            [752, 322, 7],
            [778, 318, 10],
            [700, 326, 5],
            [606, 300, 5],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r * rec} fill={i % 2 ? ink.red : ink.orange} opacity={0.8} style={{mixBlendMode: 'multiply'}} />
          ))}
        </g>
      ) : null}
      {/* accessory (e.g. a catheter), directed upward by the elevator */}
      {acc > 0 ? (
        <path d="M60 309 L600 309 Q 690 309 712 262 L 760 140" fill="none" stroke={ink.orange} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - acc} />
      ) : null}
      {/* elevator lever */}
      <g transform={`translate(772 322) rotate(${38 * raise})`} opacity={tw(f, 34, 10)}>
        <path d="M0 8 L-126 4 Q-134 -1 -126 -8 L0 -16 Z" fill={ink.teal} opacity={0.75} transform="translate(3 2)" style={{mixBlendMode: 'multiply'}} />
        <path d="M0 8 L-126 4 Q-134 -1 -126 -8 L0 -16 Z" fill="none" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <circle r={7} fill={INK} />
      </g>
    </g>
  );
};

/* ======================================================================== drying & storage */
const spiral = (cx: number, cy: number) => {
  const pts: string[] = [];
  for (let t = 0; t <= Math.PI * 5.2; t += 0.12) {
    const r = 150 - t * 8;
    pts.push(`${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + 0.55 * r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
};
const DryingArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const alcAt = c.at('alcohol');
  const airAt = c.at('air');
  const front = alcAt != null ? mix(40, 520, tw(f, alcAt, 40, E.inOut)) : 0;
  const film = alcAt != null ? tw(f, alcAt, 12) * (airAt != null ? 1 - tw(f, airAt + 10, 40) : 1) : 0;
  const moistAt = base(c, 'moisture');
  const coilAt = c.at('coiled');
  const cabAt = c.at('cabinet');
  return (
    <g>
      {/* a channel, flushed then dried */}
      <Sh d={rect(40, 70, 460, 64, 32)} fill={ink.paperLight} p={draw(f, 0)} />
      {film > 0 ? <path d={rect(44, 74, Math.max(0, Math.min(452, front - 44)), 56, 28)} fill={ink.pink} opacity={0.45 * film} style={{mixBlendMode: 'multiply'}} /> : null}
      {[92, 150, 214, 280, 340, 404, 460].map((x, i) => <Drop key={i} x={x} y={114} r={8 + (i % 3) * 2} o={tw(f, 14 + i * 2, 10) * (x > front ? 1 : 0)} />)}
      {airAt != null && f >= airAt
        ? [88, 116].map((y, i) => (
            <path key={i} d={`M60 ${y} L480 ${y}`} stroke={INK} strokeWidth={3} strokeDasharray="22 16" strokeDashoffset={-(f - airAt) * 8} opacity={tw(f, airAt, 10) * (1 - tw(f, airAt + 110, 20))} />
          ))
        : null}
      {airAt != null ? <Arrow x1={500} y1={102} x2={540} y2={102} o={tw(f, airAt, 10)} w={4} /> : null}
      {/* coiled scope in a tray, fluid pooling in its loops */}
      <Sh d={rect(60, 270, 400, 300, 20)} fill={ink.paperShade} p={draw(f, 1)} fo={0.6} />
      <Tube d={spiral(260, 420)} p={draw(f, 2, 40)} w={18} />
      {coilAt != null ? <path d={spiral(260, 420)} fill="none" stroke={ink.red} strokeWidth={4} strokeDasharray="8 10" opacity={tw(f, coilAt, 12) * (0.6 + 0.4 * Math.sin(f / 6))} /> : null}
      {[150, 126, 102, 78].map((r, i) => (
        <g key={i}>
          <Drop x={260 + (i % 2 ? 10 : -10)} y={420 + 0.55 * r - 2} r={9} o={tw(f, moistAt + i * 4, 12)} />
          <Rod x={284 + (i % 2 ? 10 : -10)} y={420 + 0.55 * r - 16} rot={i * 40} s={0.8} o={c.at('moisture') != null ? tw(f, moistAt + 20 + i * 6, 12) : 0} />
          <Rod x={238 + (i % 2 ? 10 : -10)} y={420 + 0.55 * r - 12} rot={i * 70 + 20} s={0.7} o={c.at('moisture') != null ? tw(f, moistAt + 30 + i * 6, 12) : 0} />
        </g>
      ))}
      {/* drying cabinet: hanging vertically, uncoiled, valves off */}
      <Sh d={rect(570, 30, 400, 570, 10)} fill={ink.paperShade} p={draw(f, 3, 30)} />
      <Sh d={rect(592, 96, 356, 484, 4)} fill={ink.paperLight} p={draw(f, 4, 30)} sw={3} />
      <Sh d="M600 118 L940 118" p={draw(f, 5)} sw={5} />
      <g opacity={tw(f, 20, 12)}>
        <circle cx={770} cy={62} r={20} fill="none" stroke={INK} strokeWidth={3} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M770 62 L${770 + Math.cos(i * 1.57 + f / 5) * 16} ${62 + Math.sin(i * 1.57 + f / 5) * 16}`} stroke={INK} strokeWidth={3} />
        ))}
      </g>
      {[660, 770, 880].map((x, i) => (
        <g key={i}>
          <Sh d={rect(x - 24, 126, 48, 70, 10)} fill={ink.teal} fo={0.5} p={draw(f, 5 + i)} sw={3} />
          <Tube d={`M${x} 196 L${x} 560`} p={draw(f, 6 + i, 30)} w={16} />
        </g>
      ))}
      {cabAt != null
        ? [715, 825].flatMap((x) =>
            [0, 1, 2].map((k) => {
              const y = 180 + (((f - cabAt) * 2.4 + k * 120) % 360);
              return <Arrow key={`${x}-${k}`} x1={x} y1={y} x2={x} y2={y + 34} o={tw(f, cabAt, 12) * 0.8} color={ink.blue} />;
            }),
          )
        : null}
    </g>
  );
};

/* ======================================================================== automated reprocessor */
const PORTS = [230, 290, 350, 410];
const AerArt: React.FC<ArtCtx> = (c) => {
  const {f} = c;
  const fillAt = base(c, 'reprocessor');
  const level = tw(f, fillAt + 6, 50, E.inOut);
  const flowAt = c.at('connectors');
  const missAt = c.at('missing');
  const recAt = c.at('record');
  const paper = recAt != null ? tw(f, recAt, 40, E.out) : 0;
  return (
    <g>
      {/* machine */}
      <Sh d={rect(60, 170, 520, 410, 16)} fill={ink.paperShade} p={draw(f, 0, 30)} />
      <Sh d="M76 170 L140 70 L520 70 L564 170" fill={ink.paperShade} fo={0.5} p={draw(f, 1)} />
      <Sh d={rect(96, 196, 448, 184, 8)} fill={ink.paperLight} p={draw(f, 2)} />
      <path d={rect(100, 380 - 176 * level, 440, 176 * level, 4)} fill={ink.blue} opacity={0.28} style={{mixBlendMode: 'multiply'}} />
      <Tube d={(() => {
        const pts: string[] = [];
        for (let t = 0; t <= Math.PI * 4.2; t += 0.14) {
          const r = 150 - t * 9;
          pts.push(`${(320 + r * Math.cos(t)).toFixed(1)} ${(288 + 0.42 * r * Math.sin(t)).toFixed(1)}`);
        }
        return `M${pts.join(' L')}`;
      })()} p={draw(f, 3, 36)} w={14} />
      {/* display + printer */}
      <Sh d={rect(100, 414, 210, 76, 6)} fill={INK} fo={0.95} p={draw(f, 4)} />
      <Sh d={rect(340, 440, 180, 12, 4)} fill={INK} p={draw(f, 5)} sw={3} />
      {paper > 0 ? (
        <g>
          <path d={rect(356, 452, 148, 110 * paper)} fill={ink.paperLight} stroke={INK} strokeWidth={2} />
          {[0, 1, 2, 3].map((i) => (i * 24 + 20 < 110 * paper ? <path key={i} d={`M372 ${470 + i * 24} L${488 - (i % 2) * 30} ${470 + i * 24}`} stroke={INK} strokeWidth={3} opacity={0.6} /> : null))}
        </g>
      ) : null}
      {/* manifold ports */}
      {PORTS.map((y, i) => (
        <Sh key={i} d={rect(572, y - 11, 26, 22, 4)} fill={ink.sun} p={draw(f, 5)} sw={3} />
      ))}
      {/* scope control body with its channel ports */}
      <Sh d={rect(760, 160, 150, 320, 30)} fill={ink.paperLight} p={draw(f, 4, 30)} />
      {PORTS.map((y, i) => {
        const connected = i !== 2 || missAt == null;
        const perfused = flowAt != null && f >= flowAt && connected;
        return (
          <g key={i}>
            <path d={`M772 ${y} L${880 - i * 10} ${y + 60}`} stroke={perfused ? ink.blue : ink.faint} strokeWidth={4} strokeDasharray={perfused ? '10 6' : '4 8'} strokeDashoffset={perfused ? -(f - flowAt!) * 2 : 0} opacity={tw(f, 30, 12)} />
            <Sh d={circ(760, y, 13)} fill={ink.paperShade} p={draw(f, 6)} sw={3} />
          </g>
        );
      })}
      {/* connecting tubes — one left off */}
      {PORTS.map((y, i) => {
        const missing = i === 2 && missAt != null;
        const d = missing ? `M598 ${y} C 640 ${y + 50} 660 ${y + 120} 704 ${y + 132}` : `M598 ${y} C 652 ${y + 40} 700 ${y + 40} 747 ${y}`;
        const flowing = flowAt != null && f >= flowAt && !missing;
        return (
          <g key={i}>
            <Tube d={d} p={draw(f, 7 + i * 0.5)} w={13} core={flowing ? ink.paperLight : ink.paperLight} />
            {flowing ? <path d={d} fill="none" stroke={ink.blue} strokeWidth={5} strokeDasharray="12 10" strokeDashoffset={-(f - flowAt!) * 3} /> : null}
          </g>
        );
      })}
      {missAt != null && f >= missAt ? (
        <g>
          <circle cx={760} cy={350} r={24 + 4 * Math.sin(f / 4)} fill="none" stroke={ink.red} strokeWidth={4} opacity={tw(f, missAt, 10)} />
          <path d="M742 332 L778 368 M778 332 L742 368" stroke={ink.red} strokeWidth={4} opacity={tw(f, missAt + 6, 8)} />
        </g>
      ) : null}
    </g>
  );
};

const AerHtml: React.FC<ArtCtx> = ({f, at}) => {
  const recAt = at('record');
  if (recAt == null) return null;
  const o = tw(f, recAt, 10);
  return (
    <div style={{position: 'absolute', left: 118, top: 424, fontFamily: fonts.mono, fontSize: 22, lineHeight: '30px', opacity: o, whiteSpace: 'nowrap'}}>
      <div style={{color: ink.sun}}>CYCLE 1142</div>
      <div style={{color: '#7FD49A'}}>PASS · OP T-12</div>
    </div>
  );
};


export const ENDOSCOPY: Record<string, ArtFactory> = {
  scope: () => ({
    w: 1000,
    h: 620,
    anchors: {controlHead: [210, 210], valves: [214, 62], biopsyPort: [113, 326], insertionTube: [314, 563], distalTip: [934, 538], connector: [884, 152], channels: [470, 580]},
    C: ScopeArt,
  }),
  channels: () => ({
    w: 1000,
    h: 620,
    anchors: {suction: [440, 250], air: [620, 200], water: [700, 280], light: [420, 420], ccd: [700, 380], wires: [361, 469], sheath: [265, 400]},
    C: ChannelsArt,
  }),
  biofilm: () => ({
    w: 1000,
    h: 620,
    anchors: {wall: [860, 540], soil: [260, 492], bacteria: [600, 474], matrix: [420, 462], disinfectant: [680, 330], flow: [300, 270], brush: [520, 310]},
    C: BiofilmArt,
  }),
  leaktest: () => ({
    w: 1000,
    h: 620,
    anchors: {tester: [244, 124], gauge: [130, 122], sheath: [300, 520], breach: [640, 442], bubbles: [650, 360], connector: [430, 230]},
    C: LeakArt,
  }),
  elevator: () => ({
    w: 1000,
    h: 360,
    anchors: {tip: [880, 270], lens: [520, 122], elevator: [690, 204], accessory: [748, 60], recess: [616, 208]},
    C: ElevatorArt,
  }),
  drying: () => ({
    w: 1000,
    h: 620,
    anchors: {alcohol: [180, 102], air: [520, 102], moisture: [250, 500], coiled: [110, 420], cabinet: [770, 380]},
    C: DryingArt,
  }),
  aer: () => ({
    w: 1000,
    h: 620,
    anchors: {reprocessor: [320, 250], connectors: [672, 262], missing: [760, 350], record: [205, 452]},
    C: AerArt,
    Html: AerHtml,
  }),
};
