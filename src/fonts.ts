/**
 * House fonts, loaded only from the repo (public/fonts, manifest src/fonts.gen.json — written by
 * scripts/vendor-fonts.mts). No network, no system fallback: a lesson renders identically on
 * a laptop and on a render server. Every face is loaded up front and the render waits for them.
 * scripts/lib/coverage.mts lets preflight prove every on-screen character has a house glyph.
 */
import React from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import FACES from './fonts.gen.json';

type Face = {family: string; weight: number; unicodeRange: string; file: string};
const faces = FACES as Face[];
const HEADING_FAMILIES = new Set(['Sora', 'Anek Devanagari', 'Anek Kannada']);

// Loading starts as soon as the module is imported (no time lost)…
const loaded: Promise<unknown> | null =
  typeof document !== 'undefined' && typeof FontFace !== 'undefined'
    ? Promise.all(
        faces.map((f) => {
          // heading faces are vendored at one (heaviest) weight and answer every weight request,
          // so a heading is Sora Heavy wherever it is set, whatever fontWeight a template asks for
          const weight = HEADING_FAMILIES.has(f.family) ? '100 900' : String(f.weight);
          const face = new FontFace(f.family, `url(${staticFile(f.file)}) format('woff2')`, {weight, style: 'normal', unicodeRange: f.unicodeRange, display: 'block'});
          (document.fonts as unknown as {add: (f: FontFace) => void}).add(face);
          return face.load();
        }),
      )
    : null;

/**
 * …but the render waits on a handle taken when the lesson mounts. A delayRender() taken at
 * module evaluation can be orphaned: Remotion's render entry evaluates a second copy of its
 * delay-render module (remotion/no-react) that resets the handle list, so continueRender()
 * no longer finds the handle and its timeout fails every render longer than the timeout.
 */
export const useHouseFonts = () => {
  const [handle] = React.useState(() => (loaded ? delayRender('house fonts') : null));
  React.useEffect(() => {
    if (handle == null || !loaded) return;
    loaded
      .then(() => continueRender(handle))
      // a missing font file must fail the render loudly, never fall back silently
      .catch((e) => cancelRender(new Error(`house fonts failed to load: ${e}`)));
  }, [handle]);
};

const q = (f: string) => `'${f}'`;
/** Fallbacks after the script faces: broad Latin/Greek/Cyrillic, symbols, math. */
const TAIL = [q('Noto Sans'), q('Noto Sans Symbols 2'), q('Noto Sans Math')].join(', ');
export const STACKS = {
  display: `${q('Sora')}, ${q('Anek Devanagari')}, ${q('Anek Kannada')}, ${TAIL}`,
  body: `${q('Noto Sans')}, ${q('Noto Sans Devanagari')}, ${q('Noto Sans Kannada')}, ${TAIL}`,
  mono: `${q('IBM Plex Mono')}, ${q('Noto Sans Devanagari')}, ${q('Noto Sans Kannada')}, ${TAIL}`,
};
