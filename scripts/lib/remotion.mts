/** Shared Remotion plumbing for render/review/QA scripts: one bundle, props-driven compositions. */
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {ROOT, loadProject, readSpec, readTimings} from './paths.mts';

let served: Promise<string> | null = null;
export const serve = () => (served ??= bundle({entryPoint: join(ROOT, 'src', 'index.ts'), onProgress: () => {}}));
/** A bundle where some modules are swapped for others (absolute path → absolute path): the art gates bundle a draft pack this way without touching shared files. */
export const serveWith = (alias: Record<string, string>) =>
  bundle({entryPoint: join(ROOT, 'src', 'index.ts'), onProgress: () => {}, webpackOverride: (c) => ({...c, resolve: {...c.resolve, alias: {...(c.resolve?.alias as object), ...alias}}})});

/** The "Lesson" composition sized for one video, plus the props to render it with. */
export async function lesson(project: string, id: string, timings?: unknown) {
  const serveUrl = await serve();
  const inputProps = {project: loadProject(project), spec: readSpec(project, id), timings: timings ?? readTimings(project, id)};
  const composition = await selectComposition({serveUrl, id: 'Lesson', inputProps});
  return {serveUrl, composition, inputProps};
}

/**
 * Stills for gates (preflight, review, qa, storyboard) share ONE headless browser and retry
 * once: launching a browser per still is slow and, over ~100 stills, eventually times out.
 */
let browser: ReturnType<typeof openBrowser> | null = null;
const shared = () => (browser ??= openBrowser('chrome'));
/**
 * With `audit`, the still is rendered with the text audit on (src/templates/audit.tsx) and its
 * findings are returned as readable messages (text overflowing its box, text colliding).
 */
export async function still(opts: {serveUrl: string; composition: any; inputProps: any; output: string; frame: number; audit?: boolean; onLog?: (text: string) => void}): Promise<string[]> {
  const {audit, onLog, ...o} = opts;
  for (let attempt = 1; ; attempt++) {
    const found: string[] = [];
    try {
      await renderStill({
        ...o,
        // stills render the resolved composition's props (calculateMetadata output), so the flag goes there
        composition: audit ? {...o.composition, props: {...o.composition.props, audit: true}} : o.composition,
        imageFormat: 'png',
        logLevel: 'error',
        puppeteerInstance: await shared(),
        timeoutInMilliseconds: 120000,
        onBrowserLog: (log) => {
          onLog?.(log.text);
          const m = /^\[audit\] (.*)$/.exec(log.text);
          if (!m) return;
          const h = JSON.parse(m[1]);
          found.push(h.kind === 'clipped' ? `text cut off by its picture's box: "${h.text}" — it is larger than the space it is drawn in` : h.kind === 'tiny' ? `text too small to read (${h.px}px < 22px on the frame): "${h.text}" — give it a bigger slot, fewer elements, or shorter content` : h.kind === 'overflow' ? `text overflows its box: "${h.text}"` : h.kind === 'overlap' ? `stage layers overlap: "${h.text}" × "${h.other}" — move them apart in the world` : `text collides: "${h.text}" × "${h.other}"`);
        },
      });
      return [...new Set(found)];
    } catch (e) {
      if (attempt === 2) throw e;
      browser = null; // a wedged browser is replaced
    }
  }
}
export const closeBrowser = async () => {
  if (browser) await (await browser).close({silent: true});
  browser = null;
};
