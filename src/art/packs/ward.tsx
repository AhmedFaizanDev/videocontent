/**
 * Pack `ward`: a hospital bay at night (muted palette for a dark stage).
 *   ward  anchors: bed patient face chest iv window curtain panel alarm calm
 *         events: alarm (red beacon pulse + red light on wall/bed/blanket, face pales) calm (night restored)
 */
import React from 'react';
import {clamp01, hash, mix, tw} from '../../motion';
import {draw, fillIn, type ArtCtx, type ArtFactory} from '../kit';
import {Form} from './circulation';

type P = [number, number];
const N = {
  wall: '#18294A', wallDark: '#0F1B34', wallLine: '#2E4670', floor: '#0E182C', floorLine: '#22365A',
  skin: '#E9B99A', skinDark: '#C99A7C', hair: '#2E2530',
  blanket: '#3F7C8C', blanketDark: '#26505E', blanketHi: '#5FA0AE',
  gown: '#8DB4C6', gownDark: '#567D93',
  sheet: '#CBD9E6', sheetDark: '#8CA2BB', mattress: '#3A4F73', mattressDark: '#22324F',
  steel: '#8FA3BD', steelDark: '#55688A', steelLight: '#B9C8DC',
  curtain: '#2F6474', curtainDark: '#1E4553', curtainHi: '#3F7C8C',
  sky1: '#070D24', sky2: '#1E3B66', moon: '#F3E7BE', moonDark: '#C9B780',
  warm: '#FFC879', red: '#E5484D', redDark: '#A3202E',
  fluid: '#9ED6E2', fluidDark: '#5FA3B5',
};
const hx = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixc = (a: string, b: string, p: number) => {
  const A = hx(a), B = hx(b);
  return `rgb(${A.map((v, i) => Math.round(mix(v, B[i], p))).join(',')})`;
};
const g = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));

const ward: ArtFactory = () => {
  const surf = (x: number) => (x < 820 ? 420 - 0.53 * (820 - x) : 420);
  const hgt = (x: number, l = 0) => 36 + 18 * g(x, 785, 55) + 8 * g(x, 910, 50) + 14 * g(x, 1040, 55) + 22 * g(x, 1195, 45) + l;
  const top0 = (x: number) => surf(x) - hgt(x);
  const anchors: Record<string, P> = {
    bed: [1100, 470], patient: [960, top0(960) + 24], face: [729, 275], chest: [782, top0(782) + 18], iv: [1000, 200],
    window: [260, 240], curtain: [1440, 330], panel: [700, 150], alarm: [1130, 130], calm: [545, 150],
  };
  const C_: React.FC<ArtCtx> = (c) => {
    const {f} = c;
    const tA = c.at('alarm');
    const tC = c.at('calm');
    const up = tA != null && f >= tA ? tw(f, tA, 24) : 0;
    const down = tC != null && f >= tC && (tA == null || tC > tA) ? tw(f, tC, 40) : 0;
    const alarm = up * (1 - down);
    const calmK = down;
    const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * ((f - (tA ?? 0)) % 15)) / 15 - Math.PI / 2);
    const swing = alarm * (0.15 + 0.75 * pulse); // 0.15..0.9 while alarming
    const b = 0.5 + 0.5 * Math.sin(f / 26);
    const lift = (x: number) => b * 7 * g(x, 790, 90) + b * 2;
    const topY = (x: number) => surf(x) - hgt(x, lift(x));
    const pts: P[] = [];
    for (let x = 832; x <= 1236; x += 22) pts.push([x, topY(x)]);
    pts.push([1244, topY(1236) + 14]);
    const edge = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1].toFixed(1)}`).join(' ');
    const bot: string[] = [];
    for (let x = 1244; x >= 832; x -= 46) bot.push(`L${x} ${(surf(x) + 40).toFixed(1)}`);
    const blanket = `${edge} ${bot.join(' ')} Z`;
    const skin = mixc(N.skin, '#F7E9E2', alarm * 0.9);
    const skinDark = mixc(N.skinDark, '#D9BDAE', alarm * 0.9);
    const HEAD = 'M-6 -48 C30 -52 46 -32 45 -12 L57 8 Q57 13 47 14 L48 22 Q50 26 46 28 Q48 34 44 38 Q38 52 14 52 C-30 54 -56 30 -52 -8 C-50 -34 -30 -46 -6 -48 Z';
    const headT = 'translate(700 280) rotate(-62) scale(1.02)';
    const dropT = (f % 40) / 40;
    const sway = Math.sin(f / 70) * 2;
    // curtain: gathered toward the right end
    const cx: number[] = [];
    for (let x = 1334; x < 1528; x += x < 1430 ? 34 : 17) cx.push(x);
    const cb = (x: number) => 562 + 8 * Math.sin(x / 14) + sway * ((x - 1334) / 200);
    const curtainPath = `M1334 62 H1530 V${cb(1530)} ` + Array.from({length: 12}, (_, i) => `L${1530 - (i + 1) * 16.4} ${cb(1530 - (i + 1) * 16.4)}`).join(' ') + ' Z';
    const gownP = (() => { let t = ''; for (let x = 724; x <= 832; x += 12) t += `${t ? 'L' : 'M'}${x} ${topY(x).toFixed(1)} `; return `${t}L832 420 L724 ${surf(724)} Z`; })();
    const hand: P = [934, topY(934) - 8];
    const elbow: P = [850, topY(850) - 14];
    const shoulderA: P = [790, topY(790) - 6];
    const beacon: P = [1130, 130];
    return (
      <g>
        <defs>
          <linearGradient id="wd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={N.sky1} /><stop offset="1" stopColor={N.sky2} /></linearGradient>
          <linearGradient id="wd-shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8DB4E8" stopOpacity="0.16" /><stop offset="1" stopColor="#8DB4E8" stopOpacity="0" /></linearGradient>
          <radialGradient id="wd-warm"><stop offset="0" stopColor="#FFB85C" stopOpacity="0.85" /><stop offset="1" stopColor="#FFB85C" stopOpacity="0" /></radialGradient>
          <radialGradient id="wd-red"><stop offset="0" stopColor="#FF2A45" stopOpacity="1" /><stop offset="1" stopColor="#FF2A45" stopOpacity="0" /></radialGradient>
          <radialGradient id="wd-core"><stop offset="0" stopColor="#FFF3E0" /><stop offset="0.4" stopColor="#FF6A6E" /><stop offset="1" stopColor="#FF2A45" stopOpacity="0" /></radialGradient>
          <radialGradient id="wd-vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.45" /></radialGradient>
          <clipPath id="wd-room"><rect x={30} y={30} width={1540} height={640} rx={14} /></clipPath>
        </defs>
        <g clipPath="url(#wd-room)">
          <rect x={30} y={30} width={1540} height={580} fill={N.wall} opacity={fillIn(f, 0)} />
          <rect x={30} y={400} width={1540} height={6} fill={N.wallLine} opacity={0.5 * fillIn(f, 0)} />
          <rect x={30} y={584} width={1540} height={26} fill={N.wallDark} opacity={fillIn(f, 0)} />
          <rect x={30} y={574} width={1540} height={10} fill="#000" opacity={0.18 * fillIn(f, 0)} />
          <rect x={30} y={610} width={1540} height={60} fill={N.floor} opacity={fillIn(f, 0)} />
          <rect x={30} y={610} width={1540} height={4} fill={N.floorLine} opacity={fillIn(f, 0)} />
          <path d="M96 400 H424 L900 610 H560 Z" fill="url(#wd-shaft)" opacity={fillIn(f, 2)} />
          {/* window light pool on the floor */}
          <path d="M190 614 H500 L600 668 H250 Z" fill="#8DB4E8" opacity={0.12 * fillIn(f, 2)} />
          <ellipse cx={920} cy={620} rx={380} ry={16} fill="#000" opacity={0.32 * fillIn(f, 3)} />
        </g>

        {/* window */}
        <Form d="M90 80 H430 V400 H90 Z" fill="url(#wd-sky)" stroke={N.wallLine} f={f} i={1} sw={5} />
        <g opacity={fillIn(f, 2)}>
          {Array.from({length: 14}, (_, k) => (
            <circle key={k} cx={110 + hash(k) * 300} cy={96 + hash(k + 40) * 130} r={2.2 + hash(k + 9) * 1.6} fill="#fff" opacity={0.45 + 0.4 * Math.sin(f / 30 + k * 2)} />
          ))}
          <path d="M340 122 A36 36 0 1 0 340 194 A30 30 0 0 1 340 122 Z" fill={N.moon} stroke={N.moonDark} strokeWidth={3} strokeLinejoin="round" />
          <path d="M94 400 V330 H140 V300 H190 V344 H232 V318 H280 V350 H330 V296 H376 V336 H426 V400 Z" fill="#0F1D3A" />
          {[[150, 312], [160, 332], [200, 356], [248, 332], [296, 366], [344, 312], [350, 340], [392, 350]].map(([x, y], k) => (
            <rect key={k} x={x} y={y} width={7} height={9} fill={N.warm} opacity={0.55 + 0.3 * Math.sin(f / 50 + k)} />
          ))}
        </g>
        <path d="M260 80 V400 M90 240 H430" stroke={N.steel} strokeWidth={8} opacity={0.85 * fillIn(f, 2)} />
        <Form d="M78 400 H442 V418 H78 Z" fill={N.steel} stroke={N.steelDark} f={f} i={2} sw={4} />

        {/* headwall: rail + medical gas panel */}
        <Form d="M592 214 H808 V226 H592 Z" fill={N.steel} stroke={N.steelDark} f={f} i={3} sw={3} />
        <Form d="M612 86 H788 Q796 86 796 94 V198 Q796 206 788 206 H612 Q604 206 604 198 V94 Q604 86 612 86 Z" fill="#2F4770" stroke={N.steelDark} f={f} i={3} sw={4} />
        <g opacity={fillIn(f, 4)}>
          {[[640, '#5E8C7A', '#34584A'], [700, '#B59A4A', '#6E5C22']].map(([x, fl, st], k) => (
            <g key={k}>
              <rect x={Number(x) - 22} y={110} width={44} height={44} rx={10} fill="#22365A" stroke={N.steelDark} strokeWidth={3} />
              <circle cx={Number(x)} cy={132} r={15} fill={fl as string} stroke={st as string} strokeWidth={4} />
              <circle cx={Number(x)} cy={132} r={5} fill="#0F1B34" />
              <rect x={Number(x) - 7} y={158} width={14} height={14} rx={3} fill={fl as string} stroke={st as string} strokeWidth={3} />
            </g>
          ))}
          <rect x={750} y={106} width={22} height={78} rx={8} fill="#D5E4EE" fillOpacity={0.6} stroke={N.steelLight} strokeWidth={3} />
          <circle cx={761} cy={158 - 14 * (0.5 + 0.5 * Math.sin(f / 40))} r={5} fill="#5E8C7A" />
          <rect x={620} y={182} width={120} height={12} rx={5} fill="#22365A" stroke={N.steelDark} strokeWidth={3} />
        </g>
        {/* wall reading lamp (warm, brighter after calm) */}
        <Form d="M518 120 H572 L582 162 H508 Z" fill="#3A4F73" stroke={N.steelDark} f={f} i={3} sw={4} />
        <ellipse cx={545} cy={164} rx={32} ry={7} fill={N.warm} opacity={0.4 + 0.6 * calmK} />
        <path d="M545 120 V100" stroke={N.steelDark} strokeWidth={5} opacity={fillIn(f, 3)} />
        {/* warm night-light pool reaching the bed (base dim, wide after calm) */}
        <ellipse cx={690} cy={290} rx={430} ry={300} fill="url(#wd-warm)" opacity={fillIn(f, 6) * (0.12 + 0.7 * calmK) * (1 - alarm)} />

        {/* alarm beacon: lamp housing on the wall */}
        <Form d="M1096 158 H1164 V172 H1096 Z" fill={N.steel} stroke={N.steelDark} f={f} i={4} sw={3} />
        <Form d="M1100 158 Q1100 94 1130 94 Q1160 94 1160 158 Z" fill={mixc('#2B1822', '#FF5A62', swing)} stroke={N.redDark} f={f} i={4} sw={4} />

        {/* locker beside the bed */}
        <Form d="M452 440 H552 V578 H452 Z" fill="#34496D" stroke="#1E2E4C" f={f} i={5} sw={4} />
        <g opacity={fillIn(f, 6)}>
          <rect x={452} y={432} width={100} height={12} rx={4} fill={N.steel} stroke={N.steelDark} strokeWidth={3} />
          <path d="M456 494 H548 M456 536 H548" stroke="#1E2E4C" strokeWidth={4} />
          <rect x={486} y={466} width={32} height={6} rx={3} fill={N.steelLight} />
          <rect x={486} y={510} width={32} height={6} rx={3} fill={N.steelLight} />
          <rect x={470} y={578} width={64} height={10} fill="#1E2E4C" />
          <rect x={470} y={398} width={24} height={34} rx={7} fill={N.fluid} fillOpacity={0.55} stroke={N.fluidDark} strokeWidth={3} />
          <rect x={506} y={410} width={30} height={22} rx={4} fill={N.sheet} stroke={N.sheetDark} strokeWidth={3} />
        </g>

        {/* bed */}
        <g opacity={fillIn(f, 6)}>
          {[620, 1210].map((x) => (
            <g key={x}>
              <rect x={x - 7} y={484} width={14} height={86} fill={N.steelDark} />
              <circle cx={x} cy={584} r={20} fill="#22324F" stroke={N.steelDark} strokeWidth={5} />
              <circle cx={x} cy={584} r={6} fill={N.steel} />
            </g>
          ))}
          <path d="M880 476 L662 364" stroke={N.steelDark} strokeWidth={9} strokeLinecap="round" />
        </g>
        <Form d="M566 290 Q566 282 574 282 H584 Q592 282 592 290 V540 Q592 548 584 548 H574 Q566 548 566 540 Z" fill="#46597E" stroke={N.steelDark} f={f} i={6} sw={4} />
        <Form d="M1236 376 Q1236 368 1244 368 H1254 Q1262 368 1262 376 V520 Q1262 528 1254 528 H1244 Q1236 528 1236 520 Z" fill="#46597E" stroke={N.steelDark} f={f} i={6} sw={4} />
        <Form d="M590 458 H1240 V486 H590 Z" fill={N.steel} stroke={N.steelDark} f={f} i={7} sw={4} />
        <Form d="M600 303 L820 420 H1240 V458 H820 L600 341 Z" fill="#4C6A9C" stroke={N.mattressDark} f={f} i={7} sw={4} />
        <path d="M606 304 L822 419 H1236" fill="none" stroke="#8FB0DC" strokeWidth={4} strokeLinecap="round" opacity={0.7 * fillIn(f, 7)} />
        <path d="M820 420 V458" stroke={N.mattressDark} strokeWidth={3} opacity={0.5 * fillIn(f, 7)} />
        <circle cx={820} cy={440} r={6} fill={N.steelDark} opacity={fillIn(f, 7)} />

        {/* pillow + patient */}
        <g opacity={fillIn(f, 8)}>
          <g transform="translate(664 337) rotate(28)">
            <path d="M-88 0 Q-96 -30 -60 -36 Q0 -46 66 -36 Q98 -30 88 0 Z" fill={N.sheet} stroke={N.sheetDark} strokeWidth={4} strokeLinejoin="round" />
          </g>
        </g>
        <g opacity={fillIn(f, 9)}>
          <g transform={headT}>
            <path d="M-26 34 H22 V96 H-26 Z" fill={skin} stroke={skinDark} strokeWidth={3} strokeLinejoin="round" />
            <path d={HEAD} fill={skin} stroke={skinDark} strokeWidth={3} strokeLinejoin="round" />
            <path d="M-6 -48 C-30 -46 -50 -34 -52 -8 C-54 10 -44 26 -30 34 C-32 10 -20 -14 10 -26 C26 -34 36 -30 42 -22 C40 -40 20 -52 -6 -48 Z" fill={N.hair} />
            <circle cx={-6} cy={6} r={9} fill={skin} stroke={skinDark} strokeWidth={3} />
            <path d="M22 -6 Q30 1 38 -6" stroke={N.hair} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            <path d="M22 -17 Q31 -22 41 -16" stroke={N.hair} strokeWidth={3.4} strokeLinecap="round" fill="none" opacity={0.8} />
            <path d="M47 23 Q43 26 41 24" stroke={skinDark} strokeWidth={3} strokeLinecap="round" fill="none" />
            <ellipse cx={22} cy={22} rx={9} ry={6} fill="#E58A8A" opacity={0.3 * (1 - alarm)} />
          </g>
          <path d={gownP} fill={N.gown} stroke={N.gownDark} strokeWidth={4} strokeLinejoin="round" />
          <path d={`M748 ${topY(748) + 4} Q770 ${topY(770) + 26} 800 ${topY(800) + 40}`} stroke={N.gownDark} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.7} />
        </g>

        {/* blanket (breathes) */}
        <g opacity={fillIn(f, 10)}>
          <path d={blanket} fill={N.blanket} stroke={N.blanketDark} strokeWidth={5} strokeLinejoin="round" />
          {[1000, 1120].map((x) => (
            <path key={x} d={`M${x} ${topY(x) + 14} Q${x + 12} ${(topY(x) + 440) / 2} ${x + 4} 444`} stroke={N.blanketDark} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55} />
          ))}
          <path d={`M900 ${topY(900) + 12} Q912 ${(topY(900) + 440) / 2} 904 444`} stroke={N.blanketDark} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55} />
          <path d={`M832 ${topY(832) - 2} ` + [850, 870, 890].map((x) => `L${x} ${topY(x) - 2}`).join(' ') + ` L890 ${topY(890) + 20} ` + [870, 850, 832].map((x) => `L${x} ${topY(x) + 20}`).join(' ') + ' Z'} fill={N.sheet} stroke={N.sheetDark} strokeWidth={3} strokeLinejoin="round" />
        </g>
        {/* near arm on the blanket: gown sleeve, forearm, hand, cannula */}
        <g opacity={fillIn(f, 11)}>
          <path d={`M${shoulderA[0]} ${shoulderA[1]} L${elbow[0]} ${elbow[1]}`} stroke={N.gownDark} strokeWidth={44} strokeLinecap="round" />
          <path d={`M${shoulderA[0]} ${shoulderA[1]} L${elbow[0]} ${elbow[1]}`} stroke={N.gown} strokeWidth={36} strokeLinecap="round" />
          <path d={`M${elbow[0] + 10} ${elbow[1] + 2} L${hand[0] - 10} ${hand[1]}`} stroke={skinDark} strokeWidth={28} strokeLinecap="round" />
          <path d={`M${elbow[0] + 10} ${elbow[1] + 2} L${hand[0] - 10} ${hand[1]}`} stroke={skin} strokeWidth={21} strokeLinecap="round" />
          <ellipse cx={hand[0] + 14} cy={hand[1] + 2} rx={26} ry={15} fill={skin} stroke={skinDark} strokeWidth={3} />
          <path d={`M${hand[0] + 6} ${hand[1] - 10} Q${hand[0] + 24} ${hand[1] - 22} ${hand[0] + 34} ${hand[1] - 8}`} stroke={skinDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          <rect x={hand[0] - 12} y={hand[1] - 12} width={24} height={10} rx={3} fill="#EAF1F8" stroke={N.sheetDark} strokeWidth={2.5} />
          <rect x={hand[0] - 4} y={hand[1] - 18} width={8} height={8} rx={2} fill="#6FA8C8" />
        </g>

        {/* IV pole: in front of the bed, base on the floor */}
        <g opacity={fillIn(f, 12)}>
          <path d="M1000 100 V596" stroke={N.steelDark} strokeWidth={12} strokeLinecap="round" />
          <path d="M1000 100 V596" stroke={N.steel} strokeWidth={6} strokeLinecap="round" />
          <path d="M964 106 H1036" stroke={N.steelDark} strokeWidth={8} strokeLinecap="round" />
          <path d="M920 600 H1080" stroke={N.steelDark} strokeWidth={10} strokeLinecap="round" />
          <path d="M1000 596 L930 618 M1000 596 L1070 618" stroke={N.steelDark} strokeWidth={6} strokeLinecap="round" />
          <circle cx={924} cy={620} r={9} fill={N.floorLine} stroke={N.steelDark} strokeWidth={3} />
          <circle cx={1076} cy={620} r={9} fill={N.floorLine} stroke={N.steelDark} strokeWidth={3} />
          <path d={`M1000 292 C 1000 330 962 ${330 + 0} ${hand[0] + 4} ${hand[1] - 6}`} stroke={N.fluidDark} strokeWidth={6} strokeLinecap="round" fill="none" />
          <path d={`M1000 292 C 1000 330 962 ${330 + 0} ${hand[0] + 4} ${hand[1] - 6}`} stroke={N.fluid} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          <path d="M976 138 H1024 Q1034 138 1034 150 V232 Q1034 262 1000 266 Q966 262 966 232 V150 Q966 138 976 138 Z" fill="#6E93AD" fillOpacity={0.35} stroke={N.fluidDark} strokeWidth={4} strokeLinejoin="round" />
          <path d="M971 176 H1029 V232 Q1029 258 1000 262 Q971 258 971 232 Z" fill={N.fluid} opacity={0.75} />
          <circle cx={1000} cy={152} r={6} fill="none" stroke={N.fluidDark} strokeWidth={3} />
          <rect x={988} y={266} width={24} height={34} rx={8} fill={N.fluid} fillOpacity={0.5} stroke={N.fluidDark} strokeWidth={3.5} />
          <circle cx={1000} cy={272 + dropT * 22} r={3.4} fill={N.fluid} opacity={1 - dropT * 0.4} />
        </g>

        {/* privacy curtain: near, larger, gathered end, rail + rings */}
        <g opacity={fillIn(f, 13)}>
          <path d="M1200 52 H1540" stroke={N.steelDark} strokeWidth={7} strokeLinecap="round" />
          <circle cx={1540} cy={52} r={6} fill={N.steelDark} />
          <path d={curtainPath} fill={N.curtain} stroke={N.curtainDark} strokeWidth={5} strokeLinejoin="round" />
          {cx.map((x, k) => (
            <g key={k}>
              <path d={`M${x + 8} 66 Q${x + 2} 300 ${x + 8} ${cb(x + 8) - 4}`} stroke={N.curtainDark} strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.55} />
              <path d={`M${x + 18} 66 Q${x + 13} 300 ${x + 18} ${cb(x + 18) - 4}`} stroke={N.curtainHi} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.4} />
            </g>
          ))}
          <rect x={1334} y={62} width={196} height={58} fill={N.curtainHi} opacity={0.5} />
          <path d="M1334 120 H1530" stroke={N.curtainDark} strokeWidth={4} />
          {Array.from({length: 11}, (_, k) => (
            <circle key={k} cx={1346 + k * 17.6} cy={58} r={5} fill="none" stroke={N.steelLight} strokeWidth={3} />
          ))}
        </g>

        {/* lighting: the alarm's red, then the calm's warmth */}
        <g>
          <rect x={30} y={30} width={1540} height={640} rx={14} fill="url(#wd-vig)" opacity={fillIn(f, 0)} />
          {alarm > 0 ? (
            <g clipPath="url(#wd-room)">
              <rect x={30} y={30} width={1540} height={640} fill="#FF5A70" opacity={0} />
              <rect x={30} y={30} width={1540} height={640} fill="#E11D48" opacity={alarm * (0.12 + 0.08 * swing)} />
              <circle cx={beacon[0]} cy={beacon[1]} r={1000} fill="url(#wd-red)" opacity={alarm * (0.12 + 0.2 * swing)} />
              <path d={blanket} fill="#FF2A45" opacity={alarm * (0.12 + 0.2 * swing)} />
              <path d="M600 303 L820 420 H1240 V458 H820 L600 341 Z" fill="#FF2A45" opacity={alarm * (0.1 + 0.15 * swing)} />
              <path d={edge} fill="none" stroke="#FF5468" strokeWidth={5} strokeLinecap="round" opacity={alarm * (0.3 + 0.7 * swing)} />
              <path d="M606 304 L822 419 H1236" fill="none" stroke="#FF5468" strokeWidth={5} strokeLinecap="round" opacity={alarm * (0.3 + 0.7 * swing)} />
              {/* rim light on the profile */}
              <g transform={headT}><path d={HEAD} fill="none" stroke="#FF5468" strokeWidth={3.4} opacity={alarm * (0.4 + 0.6 * swing)} /></g>
              {/* beacon: halo, rays, bright core */}
              <circle cx={beacon[0]} cy={beacon[1]} r={110 + 80 * swing} fill="url(#wd-red)" opacity={0.2 + 0.7 * swing} />
              {Array.from({length: 8}, (_, k) => (
                <path key={k} d={`M${beacon[0]} ${beacon[1]} L${beacon[0] + 240} ${beacon[1] - 26} L${beacon[0] + 240} ${beacon[1] + 26} Z`} fill="#FF4A5A" opacity={alarm * 0.22 * swing} transform={`rotate(${k * 45 + f * 4} ${beacon[0]} ${beacon[1]})`} />
              ))}
              <circle cx={beacon[0]} cy={beacon[1] + 14} r={34 + 10 * swing} fill="url(#wd-core)" opacity={0.3 + 0.7 * swing} />
            </g>
          ) : null}
          {calmK > 0 || 1 ? (
            <g clipPath="url(#wd-room)">
              <path d={blanket} fill="#FFB050" opacity={0.2 * calmK * (1 - alarm)} />
              <g transform={headT}>
                <path d={HEAD} fill="#FFB050" opacity={0.25 * calmK * (1 - alarm)} />
              </g>
            </g>
          ) : null}
        </g>
        <rect x={30} y={30} width={1540} height={640} rx={14} fill="none" stroke={N.wallLine} strokeWidth={4} opacity={0.8 * fillIn(f, 0)} />
      </g>
    );
  };
  return {w: 1600, h: 700, layout: 'full', anchors, C: C_};
};

export default {ward} as Record<string, ArtFactory>;
