/**
 * Narration → what the voice should actually say, token by token. Deterministic, so the
 * voice never has to guess: ranges, symbols, abbreviations and the project lexicon are
 * spelled out for the TTS, while captions and sync keep the narration exactly as written
 * (each spoken phrase maps back to the display token it came from).
 */

export type SpokenToken = {d: string; s: string};

/** Invitations and payoffs end on "!" so the neural voice lifts them (words unchanged). */
export const energize = (text: string) =>
  text.replace(/(?<=^|[.!?]\s+)((?:Let's|Let us|That's|Here's|And that's|Now let's|So let's)(?:[^.!?]|\.(?=\d)|(?<=\b(?:vs|e\.g|i\.e|etc|approx|no|Dr|Mr|Mrs|St))\.){0,90}?)(?<!\b(?:vs|e\.g|i\.e|approx|no|Dr|Mr|Mrs|St))\.(?=\s|$)/g, '$1!');

const ABBR: Record<string, string> = {
  'e.g.': 'for example',
  'i.e.': 'that is',
  'etc.': 'and so on',
  'vs.': 'versus',
  vs: 'versus',
  'approx.': 'approximately',
  'no.': 'number',
};
const SYM: [RegExp, string][] = [
  [/^(\d+(?:\.\d+)?)[–—-](\d+(?:\.\d+)?)$/, '$1 to $2'], // 60–100
  [/^(\d+(?:\.\d+)?)%$/, '$1 percent'],
  [/^~(\d)/, 'about $1'],
  [/^≈(\d)/, 'about $1'],
  [/^(\d+(?:\.\d+)?)[x×](\d+(?:\.\d+)?)$/, '$1 times $2'],
];
const WORD: Record<string, string> = {'&': 'and', '→': 'to', '×': 'times', '=': 'equals', '+': 'plus', '≈': 'about', '~': 'about', '%': 'percent', '/': 'or', '≥': 'at least', '≤': 'at most'};

/** Split punctuation off a token so rules see the core: "(60–100)," → ["(", "60–100", "),"]. */
const parts = (tok: string) => {
  const m = /^([("'“‘[]*)(.*?)([)"'”’\],.;:!?]*)$/.exec(tok)!;
  return [m[1], m[2], m[3]];
};

/**
 * `english` = false for Indic narration: only the lexicon applies — the English expansions
 * ("to", "percent", "for example") would be wrong mid-sentence, so preflight instead
 * requires such narration to be written out in words (grounding.speechHazards).
 */
export function speakTokens(narration: string, lexicon: Record<string, string> = {}, english = true): SpokenToken[] {
  const lex = Object.entries(lexicon).map(([k, v]) => [k.toLowerCase(), v] as const);
  return (english ? energize(narration) : narration)
    .split(/\s+/)
    .filter(Boolean)
    .map((d) => {
      if (/^\[pause\]$/i.test(d)) return {d, s: d};
      const [pre, core, rawPost] = parts(d);
      let post = rawPost;
      const lc = core.toLowerCase();
      let s = core;
      const hit = lex.find(([k]) => k === lc);
      if (hit) s = hit[1];
      else if (!english) s = core;
      else if (ABBR[lc] ?? ABBR[lc + '.']) {
        s = ABBR[lc] ?? ABBR[lc + '.'];
        // the abbreviation's own dot isn't a sentence end (except "etc." closing a sentence)
        if (post.startsWith('.') && lc !== 'etc') post = post.slice(1);
      }
      else if (WORD[core]) s = WORD[core];
      else for (const [re, rep] of SYM) if (re.test(core)) s = core.replace(re, rep);
      return {d, s: `${pre}${s}${post}`};
    });
}
