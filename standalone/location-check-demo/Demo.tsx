import React from 'react';
import {
  AbsoluteFill,
  Audio,
  cancelRender,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import timeline from './timeline.json';

// ---------- Look: the app's own "survey sheet" identity ----------
const C = {
  paper: '#eef1ec',
  raised: '#f8faf7',
  ink: '#1d2b27',
  soft: '#56645f',
  rule: '#c7d0ca',
  contour: '#9a5b2e',
  survey: '#d9531e',
  pursue: '#2e7650',
  review: '#9a640f',
  pass: '#b23a2a',
  hatchLine: '#8f9a94',
};
const HATCH = `repeating-linear-gradient(135deg, ${C.hatchLine} 0 3px, transparent 3px 14px)`;
const DISPLAY = "'Archivo', sans-serif";
const BODY = "'Public Sans', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const asset = (name: string) => staticFile(`location-check-demo/${name}`);

// Fonts are vendored in public/ so every render is identical and offline-safe. Loading starts at import;
// the render handle is taken on mount (same pattern and reason as src/fonts.ts: a module-level
// delayRender can be orphaned on long renders).
const fontsLoaded = Promise.all(
  [
    new FontFace('Archivo', `url(${asset('fonts/archivo.woff2')})`, {weight: '500 800', stretch: '62% 125%'}),
    new FontFace('Public Sans', `url(${asset('fonts/publicsans.woff2')})`, {weight: '400 700'}),
    new FontFace('IBM Plex Mono', `url(${asset('fonts/plexmono-400.woff2')})`, {weight: '400'}),
    new FontFace('IBM Plex Mono', `url(${asset('fonts/plexmono-500.woff2')})`, {weight: '500'}),
  ].map((f) => {
    document.fonts.add(f);
    return f.load();
  }),
);

const useFonts = () => {
  const [handle] = React.useState(() => delayRender('demo fonts'));
  React.useEffect(() => {
    fontsLoaded.then(() => continueRender(handle)).catch((e) => cancelRender(new Error(`fonts failed to load: ${e}`)));
  }, [handle]);
};

// ---------- Timeline helpers ----------
type Scene = (typeof timeline.scenes)[number];
const scene = (id: string) => timeline.scenes.find((s) => s.id === id) as Scene;
/** Frame (relative to the scene) where the caption line containing `phrase` starts. */
const cue = (s: Scene, phrase: string) => {
  const c = s.captions.find((x) => x.text.includes(phrase));
  if (!c) throw new Error(`no caption with "${phrase}" in ${s.id}`);
  return c.from - s.from;
};
const ease = Easing.bezier(0.33, 0, 0.2, 1);
const appear = (frame: number, at: number, len = 14) =>
  interpolate(frame, [at, at + len], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// ---------- Camera over a real screenshot ----------
// Rects are [x, y, w, h] in the 1200-px-wide preview coordinates I measured on; captures are 3200 px wide.
type Rect = [number, number, number, number];
const K = 3200 / 1200;
type Key = {at: number; r: Rect; dur?: number};

function cameraRect(keys: Key[], frame: number): Rect {
  let r = keys[0].r;
  for (const k of keys.slice(1)) {
    if (frame < k.at) break;
    const t = interpolate(frame, [k.at, k.at + (k.dur ?? 28)], [0, 1], {extrapolateRight: 'clamp', easing: ease});
    r = r.map((v, i) => v + (k.r[i] - v) * t) as Rect;
  }
  return r;
}

const Shot: React.FC<{src: string; keys: Key[]; children?: React.ReactNode}> = ({src, keys, children}) => {
  const frame = useCurrentFrame();
  const [x, y, w, hh] = cameraRect(keys, frame).map((v) => v * K);
  const s = Math.min(1920 / w, 1080 / hh);
  return (
    <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: 3200,
          transformOrigin: '0 0',
          transform: `translate(${960 - (x + w / 2) * s}px, ${540 - (y + hh / 2) * s}px) scale(${s})`,
        }}
      >
        <Img src={asset(src)} style={{width: 3200, display: 'block'}} />{/* natural height: captures differ */}
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** A survey-orange ring drawn in screenshot space, so it moves with the camera. */
const Ring: React.FC<{r: Rect; at: number; until?: number; label?: string; side?: 'top' | 'bottom' | 'right'}> = ({r, at, until = 1e9, label, side = 'top'}) => {
  const frame = useCurrentFrame();
  const o = appear(frame, at) * (1 - appear(frame, until, 10));
  if (o <= 0) return null;
  const [x, y, w, h] = r.map((v) => v * K);
  const grow = interpolate(appear(frame, at, 16), [0, 1], [1.12, 1]);
  const pos: React.CSSProperties =
    side === 'top' ? {left: 0, bottom: '100%', marginBottom: 14} : side === 'bottom' ? {left: 0, top: '100%', marginTop: 14} : {left: '100%', top: 0, marginLeft: 18};
  return (
    <div style={{position: 'absolute', left: x - 10, top: y - 10, width: w + 20, height: h + 20, opacity: o, transform: `scale(${grow})`}}>
      <div style={{position: 'absolute', inset: 0, border: `6px solid ${C.survey}`, borderRadius: 10}} />
      {label && (
        <div style={{position: 'absolute', ...pos, whiteSpace: 'nowrap', background: C.survey, color: '#fff', font: `700 34px ${BODY}`, padding: '10px 18px', borderRadius: 6}}>
          {label}
        </div>
      )}
    </div>
  );
};

// ---------- Shared pieces ----------
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const all = timeline.scenes.flatMap((s) => s.captions);
  const c = all.find((x) => frame >= x.from && frame < x.to + 6);
  if (!c) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(29,43,39,0.9)', color: '#fff', font: `600 38px/1.3 ${BODY}`, padding: '12px 26px', borderRadius: 8, maxWidth: 1500, textAlign: 'center'}}>
        {c.text}
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{font: `700 26px ${DISPLAY}`, fontStretch: '112%', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.soft, ...style}}>{children}</div>
);

const Wordmark: React.FC<{size?: number}> = ({size = 40}) => (
  <div style={{font: `800 ${size}px/1 ${DISPLAY}`, fontStretch: '125%', letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink}}>Location Check</div>
);

const Swatch: React.FC<{missing?: boolean; w?: number; h?: number}> = ({missing, w = 64, h = 22}) => (
  <div style={{width: w, height: h, border: `2px solid ${C.ink}`, background: missing ? `${HATCH}, ${C.raised}` : C.contour}} />
);

const Card: React.FC<{style?: React.CSSProperties; children: React.ReactNode}> = ({style, children}) => (
  <div style={{background: C.raised, border: `2px solid ${C.ink}`, borderRadius: 6, boxShadow: '0 18px 40px rgba(29,43,39,0.18)', ...style}}>{children}</div>
);

const FadeIn: React.FC<{at: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, dy = 24, children, style}) => {
  const frame = useCurrentFrame();
  const o = appear(frame, at, 16);
  return <div style={{opacity: o, transform: `translateY(${(1 - o) * dy}px)`, ...style}}>{children}</div>;
};

// ---------- Scenes ----------
function Hook() {
  const s = scene('hook');
  const frame = useCurrentFrame();
  const shrink = appear(frame, cue(s, 'Today'), 24);
  const blankAt = cue(s, 'And when');
  const pulse = 0.5 + 0.5 * Math.sin((frame - blankAt) / 5);
  const problems = [
    {at: cue(s, 'Today'), big: '20 min', small: 'per location, by hand', tag: 'Slow'},
    {at: cue(s, 'each one.') + 40, big: 'In heads', small: 'rules nobody wrote down', tag: 'Inconsistent'},
    {at: blankAt, big: 'Blank or 0', small: 'when a website is down', tag: 'Fragile'},
  ];
  return (
    <AbsoluteFill style={{background: C.paper, padding: '110px 140px'}}>
      <div style={{transform: `translateY(${-shrink * 40}px) scale(${1 - shrink * 0.32})`, transformOrigin: '0 0'}}>
        <FadeIn at={4}>
          <Eyebrow>The question an ops team keeps asking</Eyebrow>
        </FadeIn>
        <FadeIn at={cue(s, 'is this')}>
          <div style={{font: `800 118px/1.02 ${DISPLAY}`, fontStretch: '110%', color: C.ink, marginTop: 22, maxWidth: 1500}}>
            Is this location worth pursuing?
          </div>
        </FadeIn>
      </div>
      <div style={{position: 'absolute', left: 140, right: 140, top: 430, display: 'flex', gap: 40}}>
        {problems.map((p) => (
          <FadeIn key={p.tag} at={p.at} style={{flex: 1}}>
            <Card style={{padding: '30px 34px', height: 250}}>
              <Eyebrow style={{color: C.survey}}>{p.tag}</Eyebrow>
              <div style={{font: `800 64px/1.1 ${DISPLAY}`, fontStretch: '115%', color: C.ink, marginTop: 18}}>{p.big}</div>
              <div style={{font: `500 30px ${BODY}`, color: C.soft, marginTop: 10}}>{p.small}</div>
            </Card>
          </FadeIn>
        ))}
      </div>
      {/* The fragile spreadsheet: is that 0 real, or a source that was down? */}
      <FadeIn at={cue(s, 'slips in')} style={{position: 'absolute', left: 140, top: 735, display: 'flex', alignItems: 'center', gap: 28}}>
        {[
          ['Elevation', '5,238 ft'],
          ['Avg temp', '13.7 °C'],
          ['Rainfall', '0'],
        ].map(([k, v], i) => (
          <div key={k} style={{border: `2px solid ${C.ink}`, background: C.raised, width: 300}}>
            <div style={{font: `600 22px ${BODY}`, color: C.soft, padding: '8px 14px', borderBottom: `1px solid ${C.rule}`}}>{k}</div>
            <div
              style={{
                font: `500 40px ${MONO}`,
                padding: '10px 14px',
                color: i === 2 ? C.pass : C.ink,
                background: i === 2 ? `rgba(178,58,42,${0.08 + 0.12 * pulse})` : undefined,
              }}
            >
              {v}
            </div>
          </div>
        ))}
        <div style={{font: `700 40px ${DISPLAY}`, fontStretch: '110%', color: C.pass, maxWidth: 420, lineHeight: 1.15}}>Real zero, or missing data?</div>
      </FadeIn>
    </AbsoluteFill>
  );
}

function Submit() {
  const s = scene('submit');
  const title = cue(s, 'Enter');
  const pending = cue(s, 'coordinates.');
  const frame = useCurrentFrame();
  const titleOut = appear(frame, title - 8, 12);
  return (
    <AbsoluteFill>
      <Sequence from={title - 8} layout="none">
        <Sequence durationInFrames={pending - title + 8} layout="none">
          <Shot src="02_form_filled.png" keys={[{at: 0, r: [0, 0, 620, 349]}, {at: 6, r: [0, 64, 440, 247], dur: 36}]}>
            <Ring r={[18, 112, 250, 140]} at={20} label="Label + US address" side="right" />
          </Shot>
        </Sequence>
        <Sequence from={pending - title + 8} layout="none">
          <Shot src="03_pending.png" keys={[{at: 0, r: [0, 64, 300, 240]}, {at: 0, r: [300, 70, 700, 394], dur: 34}]}>
            <Ring r={[315, 206, 390, 36]} at={30} label="1 · finds the point" side="right" />
            <Ring r={[315, 249, 390, 79]} at={cue(s, 'asks two') - pending} label="2 · both at once, 15 s deadline each" side="right" />
          </Shot>
        </Sequence>
      </Sequence>
      <AbsoluteFill style={{background: C.paper, opacity: 1 - titleOut, justifyContent: 'center', alignItems: 'center', gap: 34}}>
        <Wordmark size={96} />
        <div style={{font: `500 40px ${BODY}`, color: C.soft}}>answers it in seconds, with written rules</div>
        <div style={{display: 'flex', gap: 40, alignItems: 'center', font: `500 28px ${BODY}`, color: C.soft}}>
          <Swatch /> points scored <Swatch missing /> not measured, never 0
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Result() {
  const s = scene('result');
  const factors = cue(s, 'Every factor');
  const rules = cue(s, 'and its source.') + 30;
  return (
    <AbsoluteFill>
      <Shot
        src="04_result.png"
        keys={[
          {at: 0, r: [290, 64, 790, 444]},
          {at: factors, r: [300, 440, 760, 230]},
        ]}
      >
        <Ring r={[315, 198, 403, 224]} at={10} until={factors} label="the point" side="top" />
        <Ring r={[730, 195, 310, 135]} at={45} until={factors} label="score + verdict" side="top" />
        <Ring r={[580, 475, 120, 160]} at={factors + 20} label="raw value" side="top" />
        <Ring r={[775, 475, 265, 160]} at={factors + 50} label="points" side="top" />
        <Ring r={[312, 495, 205, 140]} at={factors + 80} label="source" side="bottom" />
      </Shot>
      <FadeIn at={rules} style={{position: 'absolute', right: 90, top: 90}}>
        <Card style={{padding: '22px 28px', width: 760}}>
          <div style={{font: `500 24px ${MONO}`, color: C.soft}}>backend/scoring.py · the only place rules live</div>
          <pre style={{margin: '14px 0 0', font: `500 25px/1.5 ${MONO}`, color: C.ink}}>
            {`"elevation_ft": {
    "max_points": 40,
    "bands": [(10, 10), (5000, 40),
              (8000, 25), (None, 10)],
},`}
          </pre>
        </Card>
      </FadeIn>
    </AbsoluteFill>
  );
}

function Honest() {
  const s = scene('honest');
  const frame = useCurrentFrame();
  const broken = cue(s, 'Here, the');
  const shot = cue(s, 'purpose.');
  const row = cue(s, 'elevation is marked');
  const never = cue(s, 'Never zero');
  const score = cue(s, 'And no guessing');
  const verdict = cue(s, 'no verdict, only');
  const stamp = spring({frame: frame - never - 18, fps: 30, config: {damping: 12, mass: 0.6}});
  const stampOut = appear(frame, score - 4, 10);
  return (
    <AbsoluteFill>
      <Sequence from={shot} layout="none">
        <Shot
          src="08_broken_usgs.png"
          keys={[
            {at: 0, r: [290, 64, 790, 444]},
            {at: row - shot, r: [300, 440, 760, 120]},
            {at: score - shot, r: [700, 185, 370, 208]},
          ]}
        >
          <Ring r={[312, 478, 725, 58]} at={row - shot + 24} until={score - shot} label="Not measured · the reason is shown" side="top" />
          <Ring r={[735, 196, 145, 62]} at={score - shot + 30} until={verdict - shot} label="no score: not 0, and not a guess" side="bottom" />
          <Ring r={[735, 302, 268, 50]} at={verdict - shot + 10} label="only what was measured: 45 of 60 points" side="top" />
        </Shot>
      </Sequence>
      {/* Opening card: what was broken */}
      <AbsoluteFill style={{background: C.paper, opacity: 1 - appear(frame, shot - 6, 12), padding: '150px 160px'}}>
        <FadeIn at={2}>
          <Eyebrow style={{color: C.survey}}>The part that matters</Eyebrow>
          <div style={{font: `800 96px/1.05 ${DISPLAY}`, fontStretch: '110%', color: C.ink, marginTop: 18}}>Break a source on purpose.</div>
        </FadeIn>
        <FadeIn at={broken} style={{marginTop: 60}}>
          <Card style={{padding: '30px 36px', display: 'inline-block'}}>
            <div style={{font: `500 26px ${MONO}`, color: C.soft}}>backend/sources.py</div>
            <div style={{font: `500 40px ${MONO}`, color: C.ink, marginTop: 12}}>
              USGS_URL = "https://epqs.nationalmap.gov/<span style={{color: C.pass, fontWeight: 500}}>BROKEN</span>"
            </div>
          </Card>
        </FadeIn>
      </AbsoluteFill>
      {/* "Never zero" stamp */}
      {frame >= never + 18 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 1 - stampOut}}>
          <div
            style={{
              transform: `rotate(-8deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
              opacity: Math.min(1, stamp * 1.5),
              border: `10px solid ${C.survey}`,
              color: C.survey,
              background: 'rgba(248,250,247,0.94)',
              font: `800 150px/1 ${DISPLAY}`,
              fontStretch: '120%',
              padding: '24px 60px',
              borderRadius: 14,
              letterSpacing: '0.04em',
            }}
          >
            NEVER 0
          </div>
        </AbsoluteFill>
      )}
      <Sequence from={never + 18} durationInFrames={30}>
        <Audio src={staticFile('audio/sfx/stamp.wav')} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
}

function Retry() {
  const s = scene('retry');
  const second = cue(s, 'guessed.') + 30;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={second} layout="none">
        <Shot src="09_typo.png" keys={[{at: 0, r: [290, 64, 790, 444]}, {at: 4, r: [300, 140, 760, 300], dur: 30}]}>
          <Ring r={[508, 160, 168, 26]} at={20} label="address not found: nothing guessed" side="right" />
        </Shot>
      </Sequence>
      <Sequence from={second} layout="none">
        <Shot src="07_pacific_retry_full.png" keys={[{at: 0, r: [300, 360, 760, 420]}, {at: 50, r: [300, 640, 760, 150], dur: 34}]}>
          <Ring r={[736, 363, 84, 30]} at={8} until={60} label="Fetch again" side="right" />
          <Ring r={[315, 702, 720, 64]} at={70} label="every fetch is kept" side="top" />
        </Shot>
      </Sequence>
    </AbsoluteFill>
  );
}

function Tested() {
  const s = scene('tested');
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, s.frames], [0, 1], {easing: ease});
  const keys: Key[] = [{at: 0, r: [0, 0, 1200, 750]}, {at: 0, r: [390, 110, 760, 428], dur: s.frames}];
  const stats = [
    {at: 10, big: '34', small: 'real places: addresses, extremes, oceans, other countries'},
    {at: cue(s, 'Denali. An') + 20, big: '0', small: 'scoring disagreements with an independent checker'},
    {at: cue(s, 'sometimes hangs'), big: '1 retry', small: 'Open-Meteo sometimes hangs; one quick retry fixed every case'},
  ];
  return (
    <AbsoluteFill>
      <Shot src="11_stress_map.png" keys={keys}>
        {[
          {r: [620, 391, 14, 14] as Rect, t: 'Death Valley · −276 ft'},
          {r: [445, 174, 14, 14] as Rect, t: 'Denali · 20,167 ft'},
          {r: [502, 430, 14, 14] as Rect, t: 'Mid-Pacific · no elevation'},
        ].map((p, i) => (
          <div key={p.t} style={{position: 'absolute', left: p.r[0] * K - 6, top: p.r[1] * K - 6, opacity: appear(frame, 30 + i * 25)}}>
            <div style={{width: 50, height: 50, border: `6px solid ${C.survey}`, borderRadius: '50%'}} />
            <div style={{position: 'absolute', left: 64, top: 2, whiteSpace: 'nowrap', background: C.ink, color: '#fff', font: `600 30px ${BODY}`, padding: '6px 14px', borderRadius: 5}}>
              {p.t}
            </div>
          </div>
        ))}
      </Shot>
      <div style={{position: 'absolute', right: 70, top: 70, width: 560, display: 'flex', flexDirection: 'column', gap: 22, opacity: 0.2 + 0.8 * Math.min(1, z * 6)}}>
        {stats.map((st) => (
          <FadeIn key={st.big} at={st.at}>
            <Card style={{padding: '20px 26px'}}>
              <div style={{font: `800 64px/1 ${DISPLAY}`, fontStretch: '115%', color: C.ink}}>{st.big}</div>
              <div style={{font: `500 26px/1.3 ${BODY}`, color: C.soft, marginTop: 8}}>{st.small}</div>
            </Card>
          </FadeIn>
        ))}
        <FadeIn at={40}>
          <div style={{display: 'flex', gap: 20, font: `600 24px ${BODY}`, color: C.ink, background: 'rgba(248,250,247,0.92)', padding: '12px 16px', borderRadius: 6, flexWrap: 'wrap'}}>
            {[
              ['Pursue', C.pursue],
              ['Review', C.review],
              ['Pass', C.pass],
            ].map(([t, c]) => (
              <span key={t} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <span style={{width: 18, height: 18, borderRadius: '50%', background: c}} />
                {t}
              </span>
            ))}
            <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{width: 16, height: 16, borderRadius: '50%', border: `3px dashed ${C.soft}`}} />
              Insufficient data
            </span>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function Run() {
  const s = scene('run');
  const frame = useCurrentFrame();
  const lines = [
    {at: 6, text: '$ docker compose up --build', color: C.ink},
    {at: 40, text: '  ✔ backend   ✔ frontend', color: C.pursue},
    {at: cue(s, 'localhost'), text: '  → open http://localhost:8080', color: C.survey},
    {at: cue(s, 'localhost') + 45, text: '$ docker compose run --rm backend pytest', color: C.ink},
    {at: cue(s, 'localhost') + 80, text: '  30 passed in 1.0s', color: C.pursue},
  ];
  const typed = (l: (typeof lines)[number]) => {
    const n = Math.floor(interpolate(frame, [l.at, l.at + 22], [0, l.text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    return l.text.startsWith('$') ? l.text.slice(0, n) : frame >= l.at ? l.text : '';
  };
  return (
    <AbsoluteFill style={{background: C.paper, padding: '110px 120px', flexDirection: 'row', gap: 80, alignItems: 'flex-start'}}>
      <div style={{flex: 1}}>
        <Eyebrow>Run it · one command</Eyebrow>
        <div style={{marginTop: 26, background: C.ink, borderRadius: 10, padding: '34px 40px', minHeight: 420, boxShadow: '0 18px 40px rgba(29,43,39,0.25)'}}>
          {lines.map((l) => (
            <div key={l.text} style={{font: `500 34px/1.75 ${MONO}`, color: l.color === C.ink ? '#e9efe9' : l.color, whiteSpace: 'pre'}}>
              {typed(l)}
            </div>
          ))}
        </div>
        <FadeIn at={cue(s, 'localhost') + 100}>
          <div style={{font: `500 28px ${BODY}`, color: C.soft, marginTop: 24}}>No Docker? The README has the plain Python + Node steps too.</div>
        </FadeIn>
      </div>
      <FadeIn at={20} style={{width: 330}}>
        <Eyebrow style={{marginBottom: 20}}>Works on a phone</Eyebrow>
        <div style={{border: `10px solid ${C.ink}`, borderRadius: 44, overflow: 'hidden', boxShadow: '0 18px 40px rgba(29,43,39,0.25)', height: 680}}>
          <Img src={asset('10_mobile.png')} style={{width: '100%', display: 'block'}} />
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
}

function Close() {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = appear(frame, durationInFrames - 20, 20);
  return (
    <AbsoluteFill style={{background: C.paper, justifyContent: 'center', alignItems: 'center', opacity: 1 - out}}>
      <FadeIn at={2}>
        <Wordmark size={110} />
      </FadeIn>
      <FadeIn at={40} style={{marginTop: 34}}>
        <div style={{font: `700 52px ${DISPLAY}`, fontStretch: '110%', color: C.ink, textAlign: 'center'}}>Same rules, every time.</div>
      </FadeIn>
      <FadeIn at={75} style={{marginTop: 16, display: 'flex', alignItems: 'center', gap: 24}}>
        <Swatch missing w={110} h={38} />
        <div style={{font: `700 52px ${DISPLAY}`, fontStretch: '110%', color: C.survey}}>Missing is never zero.</div>
      </FadeIn>
      <div style={{position: 'absolute', bottom: 150, font: `400 20px ${BODY}`, color: C.soft, textAlign: 'center', lineHeight: 1.6}}>
        FastAPI · SQLite · React · US Census Geocoder · USGS Elevation Point Query · Open-Meteo · map data © OpenStreetMap contributors
        <br />
        Music: “Deliberate Thought” by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0
      </div>
    </AbsoluteFill>
  );
}

const SCENES: Record<string, React.FC> = {hook: Hook, submit: Submit, result: Result, honest: Honest, retry: Retry, tested: Tested, run: Run, close: Close};

export const Demo: React.FC = () => {
  useFonts();
  const total = timeline.frames;
  const music = (f: number) => interpolate(f, [0, 30, total - 60, total], [0, 0.09, 0.09, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.paper}}>
      {timeline.scenes.map((s) => {
        const Body = SCENES[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <SceneFade frames={s.frames}>
              <Body />
            </SceneFade>
            <Sequence from={s.voiceFrom - s.from} name={`${s.id} voice`}>
              <Audio src={staticFile(s.audio)} />
            </Sequence>
          </Sequence>
        );
      })}
      <Audio src={staticFile('audio/music/deliberate-thought.mp3')} volume={music} />
      <Captions />
    </AbsoluteFill>
  );
};

const SceneFade: React.FC<{frames: number; children: React.ReactNode}> = ({frames, children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10, frames - 6, frames], [0, 1, 1, 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};
