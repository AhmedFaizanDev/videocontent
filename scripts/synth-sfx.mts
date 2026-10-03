/**
 * Cinematic sound design, synthesised in-house (ffmpeg aevalsrc): no third-party samples, so
 * nothing to license. Writes public/audio/sfx/<name>.wav (48 kHz stereo, like the rest).
 *
 *   node scripts/synth-sfx.mts            (re-run after changing a recipe)
 *
 *   heartbeat  lub-dub, low and warm                 beep      bedside-monitor QRS beep
 *   flatline   the asystole tone (3.5 s)             charge    defibrillator charging whine
 *   shock      defibrillation discharge: thump + crack   boom  low cinematic hit
 *   whoosh     air sweep for camera moves            riser     tonal swell into a reveal
 *   sting      logo sting: soft bell chord          drone     dark low pad under a cold open (8 s)
 *   alarm      monitor crisis alarm (two-tone ×3)   thud      one chest compression
 */
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';

const R = 48000;
// each recipe: duration (s) and an aevalsrc expression in t (seconds); mono, duplicated to stereo
const env = (a: number, d: number) => `(1-exp(-t*${a}))*exp(-t*${d})`;
const RECIPES: Record<string, {dur: number; expr: string; filter?: string}> = {
  heartbeat: {dur: 0.9, expr: `0.9*sin(2*PI*52*t)*exp(-t*16)*lt(t,0.25) + 0.7*sin(2*PI*60*(t-0.26))*exp(-(t-0.26)*18)*gte(t,0.26) + 0.25*sin(2*PI*110*t)*exp(-t*40)`, filter: 'lowpass=f=220'},
  beep: {dur: 0.16, expr: `0.35*sin(2*PI*960*t)*(1-exp(-t*400))*exp(-t*9)`},
  flatline: {dur: 3.5, expr: `0.28*sin(2*PI*960*t)*(1-exp(-t*60))*if(gt(t,3.2),(3.5-t)/0.3,1)`},
  charge: {dur: 1.7, expr: `0.22*sin(2*PI*(420*t+1100*t*t/1.7))*(0.3+0.7*t/1.7)*(1+0.25*sin(2*PI*14*t))`},
  shock: {dur: 1.0, expr: `0.9*sin(2*PI*48*t)*exp(-t*7) + 0.5*(random(0)*2-1)*exp(-t*38) + 0.25*sin(2*PI*1800*t)*exp(-t*60)`, filter: 'lowpass=f=5000'},
  boom: {dur: 2.0, expr: `0.95*sin(2*PI*38*t+2*sin(2*PI*3*t))*${env(80, 2.2)} + 0.3*(random(0)*2-1)*exp(-t*30)`, filter: 'lowpass=f=900'},
  whoosh: {dur: 0.9, expr: `0.5*(random(0)*2-1)*sin(PI*t/0.9)^2`, filter: 'bandpass=f=900:width_type=o:w=1.4,volume=1.6'},
  riser: {dur: 2.2, expr: `(0.12*sin(2*PI*(220*t+30*t*t))+0.09*sin(2*PI*(330*t+45*t*t))+0.07*sin(2*PI*(440*t+60*t*t)))*(t/2.2)^1.6`},
  sting: {dur: 3.2, expr: `(0.2*sin(2*PI*523.25*t)+0.16*sin(2*PI*659.25*t)+0.14*sin(2*PI*783.99*t)+0.1*sin(2*PI*1046.5*t)+0.05*sin(2*PI*2093*t))*${env(120, 1.3)}`},
  // bedside-monitor crisis alarm: a two-tone triple (high-low) that repeats
  alarm: {dur: 1.8, expr: `0.3*(sin(2*PI*988*t)*lt(mod(t,0.6),0.15)+sin(2*PI*784*t)*gte(mod(t,0.6),0.15)*lt(mod(t,0.6),0.3))*(1-exp(-mod(t,0.15)*300))`},
  // a single chest compression: a soft low thud
  thud: {dur: 0.3, expr: `0.8*sin(2*PI*62*t)*exp(-t*22) + 0.15*(random(0)*2-1)*exp(-t*90)`, filter: 'lowpass=f=400'},
  drone: {dur: 8, expr: `(0.16*sin(2*PI*55*t)+0.1*sin(2*PI*82.5*t)+0.07*sin(2*PI*110.4*t))*(0.75+0.25*sin(2*PI*0.25*t))*min(1,t/1.5)*min(1,(8-t)/1.5)`, filter: 'lowpass=f=600'},
};

for (const [name, r] of Object.entries(RECIPES)) {
  const out = join(ROOT, 'public', 'audio', 'sfx', `${name}.wav`);
  const af = [r.filter, 'aformat=channel_layouts=stereo', 'alimiter=limit=0.9'].filter(Boolean).join(',');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc='${r.expr}':s=${R}:d=${r.dur}`, '-af', af, '-ar', String(R), out]);
  console.log(`  ${name}.wav  ${r.dur}s`);
}
