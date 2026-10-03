/**
 * JSON Schema for a bulk lesson script (docs/SCRIPT_BRIEF.md): only recipe scenes, so the writer
 * cannot produce coordinates, raw stages or anything the compiler would have to guess.
 */
const str = (max?: number) => ({type: 'string', minLength: 1, ...(max ? {maxLength: max} : {})});
const words = {type: 'array', items: str(40), minItems: 1, maxItems: 3};
const base = {kicker: str(28), narration: str(1200)};
const scene = (type: string, props: Record<string, any>, required: string[]) => ({
  type: 'object',
  additionalProperties: false,
  properties: {type: {const: type}, ...base, ...props},
  required: ['type', 'kicker', 'narration', ...required],
});
const note = {type: 'object', additionalProperties: false, properties: {say: words, note: str(90)}, required: ['say', 'note']};

export const SCRIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: str(12),
    title: str(80),
    outputFilename: {type: 'string', pattern: '^[A-Za-z0-9_.-]+\\.mp4$'},
    module: str(60),
    scenes: {
      type: 'array',
      minItems: 4,
      maxItems: 12,
      items: {
        anyOf: [
          scene('opener', {title: str(60), art: str(40), act: {type: 'array', items: str(30)}}, ['title']),
          scene('explain', {art: str(40), data: {type: 'object'}, points: {type: 'array', minItems: 1, maxItems: 8, items: {type: 'object', additionalProperties: false, properties: {on: str(30), label: str(28), act: str(30), note: str(90), say: words, zoom: {anyOf: [{type: 'number'}, {const: false}]}}}}}, ['art', 'points']),
          scene('flow', {mermaid: str(900), tour: {type: 'boolean'}, steps: {type: 'array', items: {type: 'object', additionalProperties: false, properties: {show: {type: 'array', items: str(12)}, focus: str(12), say: words}}}, notes: {type: 'array', items: note}}, ['mermaid']),
          scene('table', {columns: {type: 'array', minItems: 2, maxItems: 4, items: {type: 'string', maxLength: 40}}, rows: {type: 'array', minItems: 2, maxItems: 6, items: {type: 'array', items: {type: 'string', maxLength: 60}}}, say: {type: 'array', items: words}, bars: {type: 'array', items: {type: 'integer'}}, highlight: {type: 'array', items: {type: 'object', additionalProperties: false, properties: {say: words, col: {type: 'integer'}}, required: ['say', 'col']}}, notes: {type: 'array', items: note}}, ['columns', 'rows']),
          scene('summary', {art: str(40), act: {type: 'array', items: str(30)}, notes: {type: 'array', minItems: 1, maxItems: 4, items: note}}, ['notes']),
        ],
      },
    },
  },
  required: ['id', 'title', 'outputFilename', 'module', 'scenes'],
};
