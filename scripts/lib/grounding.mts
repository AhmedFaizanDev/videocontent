/**
 * Source grounding and language checks — the "is it true, and is it said right?" layer.
 *
 *   corpus      every file in projects/<p>/source/ (PDF via pdftotext, .txt, .md). For
 *               general-knowledge projects, write source/reference-notes.md: the facts
 *               the lessons may state, with citations. The corpus is the fact ledger.
 *   numbers     every factual number a lesson states (digits or spoken words, in narration
 *               and on screen) must appear in the corpus. Worked-example, code and
 *               pseudocode scenes are illustrative and exempt; small counts (≤12) are too.
 *   terms       on-screen technical labels should use the source's vocabulary.
 *   spelling    one spelling system per project (en-GB / en-US), no mixing.
 *   speech      things the voice would say wrong even after src/../speak.mts normalises.
 */
import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {projectDir} from './paths.mts';
import {spoken} from '../../src/project.ts';
import {speakTokens} from './speak.mts';
import {isAbbr} from '../../src/lang.ts';

/* ------------------------------------------------------------------ corpus */
export function corpus(project: string): {text: string; files: string[]} {
  const dir = join(projectDir(project), 'source');
  if (!existsSync(dir)) return {text: '', files: []};
  const cache = join(dir, '.text');
  const files: string[] = [];
  let text = '';
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (f.startsWith('.')) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(md|txt)$/i.test(f)) (text += '\n' + readFileSync(p, 'utf8')), files.push(p);
      else if (/\.pdf$/i.test(f)) {
        mkdirSync(cache, {recursive: true});
        const out = join(cache, f.replace(/\.pdf$/i, `.${Math.round(statSync(p).mtimeMs)}.txt`));
        if (!existsSync(out)) writeFileSync(out, execFileSync('pdftotext', ['-enc', 'UTF-8', p, '-'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}));
        text += '\n' + readFileSync(out, 'utf8');
        files.push(p);
      }
    }
  };
  walk(dir);
  return {text: text.toLowerCase().replace(/[–—−]/g, '-').replace(/\s+/g, ' '), files};
}

/* ------------------------------------------------------------------ numbers */
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const SCALE: Record<string, number> = {hundred: 100, thousand: 1000, million: 1e6, billion: 1e9};
const isNumWord = (w: string) => w in UNITS || w in TENS || w in SCALE;

/** Every number in a text: digit literals and spoken forms ("one hundred and twenty", "four point nine"). */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  const t = text.toLowerCase().replace(/[–—−]/g, '-');
  for (const m of t.matchAll(/(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.])\d+(?:\.\d+)?/g)) out.push(Number(m[0].replace(/,/g, '')));
  // punctuation ends a spoken number ("…twenty; two thousand…" is two numbers)
  const toks = t.replace(/[.,;:!?()]/g, ' | ').split(/[^a-z|]+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (!(isNumWord(w) || (w === 'a' && toks[i + 1] in SCALE))) continue;
    let total = 0;
    let cur = 0;
    let j = i;
    let any = false;
    for (; j < toks.length; j++) {
      const x = toks[j];
      // "forty-four seventy-one" is two numbers: a tens or unit word can't follow a filled slot
      if ((x in TENS && cur % 100 !== 0) || (x in UNITS && cur % 10 !== 0) || (x in UNITS && UNITS[x] >= 10 && cur % 100 !== 0)) break;
      if (x in UNITS) (cur += UNITS[x]), (any = true);
      else if (x in TENS) (cur += TENS[x]), (any = true);
      else if (x === 'a' && toks[j + 1] in SCALE && !any) cur = 1;
      else if (x === 'hundred') (cur = (cur || 1) * 100), (any = true);
      else if (x in SCALE) (total += (cur || 1) * SCALE[x]), (cur = 0), (any = true);
      else if (x === 'and' && any && (isNumWord(toks[j + 1]) ?? false)) continue;
      else break;
    }
    let value = total + cur;
    if (toks[j] === 'point' && toks[j + 1] in UNITS) {
      let dec = '';
      for (j = j + 1; j < toks.length && toks[j] in UNITS && UNITS[toks[j]] < 10; j++) dec += String(UNITS[toks[j]]);
      value = Number(`${value}.${dec}`);
    }
    if (any) out.push(value);
    i = Math.max(i, j - 1);
  }
  return out;
}

/** Numbers that carry facts: not small counts. */
const factual = (n: number) => !Number.isInteger(n) || n > 12;

/* ------------------------------------------------------------------ what a lesson asserts */
type Claim = {where: string; text: string; exempt?: boolean};
const EXEMPT = new Set(['example', 'pseudocode', 'code']);
export function claimsOf(spec: any): Claim[] {
  const out: Claim[] = [];
  const add = (where: string, v: unknown, exempt = false) => {
    // colour codes in drawing data (#23398F) aren't claims
    if (typeof v === 'string' && v.trim()) !/^#[0-9a-f]{3,8}$/i.test(v.trim()) && out.push({where, text: v, exempt});
    else if (Array.isArray(v)) v.forEach((x, i) => add(`${where}[${i}]`, x, exempt));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!['anchor', 'say', 'icon', 'color', 'tone', 'shape', 'id', 'from', 'to', 'group', 'src', 'art', 'type', 'kicker', 'points'].includes(k)) add(`${where}.${k}`, x, exempt);
  };
  (spec.scenes ?? []).forEach((s: any, i: number) => {
    const ex = EXEMPT.has(s?.type);
    add(`scene[${i}] (${s?.type}) narration`, spoken(s?.narration ?? ''), ex);
    const {type: _t, kicker: _k, narration: _n, ...rest} = s ?? {};
    add(`scene[${i}] (${s?.type})`, rest, ex);
  });
  return out;
}

export function ungroundedNumbers(spec: any, corpusText: string) {
  const have = new Set(numbersIn(corpusText).map(String));
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const c of claimsOf(spec)) {
    if (c.exempt) continue;
    for (const n of numbersIn(c.text).filter(factual)) {
      const key = `${n}@${c.where.split(' ')[0]}`;
      if (!have.has(String(n)) && !seen.has(key)) {
        seen.add(key);
        bad.push(`${c.where}: "${n}" is not in the source — cite it in source/ or remove it`);
      }
    }
  }
  return bad;
}

const STOP = new Set('about above after again against their there these those which while where would could should other every through between under into from with your this that than then them they what when were have been being does doing because before during each more most only over same some such very just also the and for are was not but you all any can had her his its our out who why how'.split(' '));
/** On-screen technical labels whose words the source never uses. */
export function unknownTerms(spec: any, corpusText: string) {
  const labels: {where: string; text: string}[] = [];
  (spec.scenes ?? []).forEach((s: any, i: number) => {
    if (EXEMPT.has(s?.type)) return;
    if (s?.type === 'definition' && s.term) labels.push({where: `scene[${i}] term`, text: s.term});
    for (const c of s?.callouts ?? []) labels.push({where: `scene[${i}] callout`, text: c.label});
    for (const it of s?.data?.items ?? []) labels.push({where: `scene[${i}] item`, text: it.label});
    for (const n of s?.data?.nodes ?? []) labels.push({where: `scene[${i}] node`, text: n.label});
  });
  const out: string[] = [];
  for (const l of labels) {
    const words = l.text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !STOP.has(w));
    const missing = words.filter((w) => !corpusText.includes(w.slice(0, Math.max(5, w.length - 2))));
    if (words.length && missing.length / words.length > 0.5) out.push(`${l.where} "${l.text}": ${missing.join(', ')} not found in the source`);
  }
  return out;
}

/* ------------------------------------------------------------------ spelling */
const PAIRS: [string, string][] = [
  ['color', 'colour'], ['fiber', 'fibre'], ['center', 'centre'], ['liter', 'litre'], ['steriliz', 'sterilis'], ['organiz', 'organis'],
  ['recogniz', 'recognis'], ['analyz', 'analys'], ['behavior', 'behaviour'], ['favor', 'favour'], ['hemoglobin', 'haemoglobin'],
  ['anemi', 'anaemi'], ['edema', 'oedema'], ['esophag', 'oesophag'], ['pediatric', 'paediatric'], ['estrogen', 'oestrogen'],
  ['orthoped', 'orthopaed'], ['tumor', 'tumour'], ['humor', 'humour'], ['fetus', 'foetus'], ['leukemi', 'leukaemi'],
  ['diarrhea', 'diarrhoea'], ['anesthe', 'anaesthe'], ['ischemi', 'ischaemi'], ['gray', 'grey'], ['defense', 'defence'],
  ['catalog ', 'catalogue'], ['aluminum', 'aluminium'], ['optimiz', 'optimis'], ['minimiz', 'minimis'], ['maximiz', 'maximis'],
];
export function spellingProblems(texts: {where: string; text: string}[], system?: 'en-GB' | 'en-US') {
  const out: string[] = [];
  const found = {us: new Map<string, string>(), gb: new Map<string, string>()};
  for (const {where, text} of texts)
    for (const w of text
      // a capitalised word mid-sentence is a proper noun (World Health Organization): its spelling is its own
      .replace(/(?<![.!?]\s*|^\s*)\b[A-Z][a-z]+/g, ' ')
      .toLowerCase()
      .split(/[^a-z]+/))
      for (const [us, gb] of PAIRS) {
        if (w.startsWith(us.trim()) && !w.startsWith(gb)) found.us.set(w, where);
        if (w.startsWith(gb)) found.gb.set(w, where);
      }
  const flag = (m: Map<string, string>, want: string) => [...m].forEach(([w, where]) => out.push(`${where}: "${w}" — project spelling is ${want}`));
  if (system === 'en-GB') flag(found.us, 'en-GB');
  else if (system === 'en-US') flag(found.gb, 'en-US');
  else if (found.us.size && found.gb.size) out.push(`mixed spelling systems: US ${[...found.us.keys()].slice(0, 4).join(', ')} vs UK ${[...found.gb.keys()].slice(0, 4).join(', ')} — set style.spelling in project.json`);
  return out;
}

/* ------------------------------------------------------------------ speech */
let DICT: Set<string> | null = null;
const dict = () => {
  if (DICT) return DICT;
  try {
    DICT = new Set(readFileSync('/usr/share/dict/words', 'utf8').split('\n').map((w) => w.toLowerCase()));
  } catch {
    DICT = new Set();
  }
  return DICT;
};
const known = (w0: string): boolean => {
  const d = dict();
  if (!d.size || d.has(w0)) return true;
  // British → American spellings the 1934 dictionary knows (fibre→fiber, -isation→-ization, -our→-or)
  const us = w0.replace(/isation/, 'ization').replace(/is(e|ed|es|ing)$/, 'iz$1').replace(/our(s)?$/, 'or$1').replace(/([^aeiou])re(s)?$/, '$1er$2').replace(/oe/, 'e').replace(/ae/, 'e');
  if (us !== w0 && known(us)) return true;
  const w = w0;
  for (const [suf, rep] of [['ies', 'y'], ['es', ''], ['s', ''], ['ed', ''], ['ed', 'e'], ['ing', ''], ['ing', 'e'], ['ly', ''], ['al', ''], ['est', ''], ['est', 'e'], ['er', ''], ['er', 'e'], ['ier', 'y'], ['iest', 'y'], ['ation', 'ate'], ['ation', ''], ['ic', '']] as const)
    if (w.endsWith(suf) && d.has(w.slice(0, -suf.length) + rep)) return true;
  return false;
};
/**
 * English words the dictionary doesn't know (drug names, Latin anatomy, eponyms): the Indian
 * English voice may guess wrong. Audition each once (scripts/say.mts); if it's right, add it to
 * the lexicon as itself ("amiodarone": "amiodarone") — that marks it reviewed — else respell it.
 */
/** A known word in an inflected form (omitted → omit, identified → identify, multiplied → multiply, coordinators → coordinator). */
const knownForm = (w: string): boolean =>
  known(w) ||
  [/ies$/, /ied$/, /ers?$/, /ors?$/, /ings?$/, /ed$/, /es$/, /s$/, /ly$/, /ion$/].some((suf) => {
    if (!suf.test(w)) return false;
    const stem = w.replace(suf, '');
    return [stem, stem + 'e', stem + 'y', stem.replace(/(.)\1$/, '$1'), stem + 'ion', stem + 'ate'].some((s) => s.length >= 3 && known(s));
  });
export function pronunciationWatch(narration: string, lexicon: Record<string, string>): string[] {
  const lex = new Set(Object.keys(lexicon).map((k) => k.toLowerCase()));
  const out = new Set<string>();
  for (const tok of narration.split(/\s+/)) {
    const w = tok.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').replace(/['’]s$/, '');
    if (w.length < 7 || !/^[A-Za-z-]+$/.test(w) || /^[A-Z]/.test(w) && !/[a-z]/.test(w)) continue;
    if (w.split('-').every((p) => !p || knownForm(p.toLowerCase())) || lex.has(w.toLowerCase())) continue;
    out.add(w);
  }
  return [...out];
}

const UNIT_ABBR = /^(\d+(?:\.\d+)?)?(mL|ml|mmHg|bpm|kg|mg|g|cm|mm|km|L|s|ms|°C|°F|kcal|µm|nm)$/;
export function speechHazards(narration: string, lexicon: Record<string, string>, english = true) {
  const out: string[] = [];
  const toks = speakTokens(narration, lexicon, english);
  // Indic narration: ranges, percentages and symbols have no safe automatic reading
  if (!english)
    toks.forEach(({d, s}) => {
      if (/[%–—&+=→×~≈/]/.test(s.replace(/^[—–]$/, ''))) out.push(`"${d}" — write ranges, percentages and symbols out in words in this language`);
    });
  toks.forEach(({d, s}, i) => {
    const core = s.replace(/^[("'“‘[]+|[)"'”’\],.;:!?]+$/g, '');
    if (/[→≥≤±×÷≈~^_=*#@<>{}|\\]/.test(core)) out.push(`"${d}" has a symbol the voice may skip or misread — write it in words`);
    if (UNIT_ABBR.test(core) && (UNIT_ABBR.exec(core)![1] || /^\d/.test(toks[i - 1]?.s ?? ''))) out.push(`"${d}" — write units out ("millilitres", "beats per minute") or add them to project.json lexicon`);
    if (/^\d+[A-Za-z]+$/.test(core) && !/^\d+(st|nd|rd|th|s)$/.test(core)) out.push(`"${d}" — separate the number from its unit, in words`);
    if (/\d\/\d/.test(core)) out.push(`"${d}" — say fractions and ratios in words ("120 over 80")`);
    // the voice spells abbreviations letter by letter: narration speaks the full form
    // (the abbreviation stays on screen, emphasised); a lexicon entry is the explicit override
    if (isAbbr(core) && !Object.keys(lexicon).some((k) => k.toLowerCase() === core.toLowerCase())) out.push(`"${d}" is an abbreviation the voice would spell out letter by letter — say its full form in the narration (keep "${core}" on screen)`);
    // run-together names (MedSkills, PubMed, BioRender): the voice guesses where the words split,
    // and the Indian English voice guesses wrong — they need a lexicon respelling (src/lexicon.ts)
    if (d === s && /^[A-Z]?[a-z]+[A-Z][A-Za-z]*$/.test(core)) out.push(`"${d}" is a run-together name the voice may mispronounce — add a respelling to src/lexicon.ts (house) or project.json lexicon; audition with: node scripts/say.mts <project> "${core}"`);
  });
  return out;
}
