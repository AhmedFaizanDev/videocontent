/** A gate error line (validate/preflight/QA) → its failure category, for repairs and the benchmark. */
const RULES: [RegExp, string][] = [
  [/too small to read/, 'tiny-text'],
  [/overflows its box|overflow|cut off/, 'overflow'],
  [/collides|overlap/, 'collision'],
  [/variety:/, 'variety'],
  [/nothing new on screen|static/, 'idle'],
  [/sync|is spoken|never heard/, 'sync'],
  [/abbreviation/, 'abbreviation'],
  [/not in source|grounding|ungrounded/, 'grounding'],
  [/pronunciation|misread|spell|run-together|symbol|units|fraction/, 'speech'],
  [/estimated|narration can't fill|length/, 'length'],
  [/has no anchor|unknown art|no event|needs \d|must have|missing|invalid JSON/, 'schema'],
  [/layout|render failed/, 'layout'],
  [/QA|black|silence|frozen/, 'qa'],
];
export const categorize = (line: string): string => RULES.find(([re]) => re.test(line))?.[1] ?? 'other';
