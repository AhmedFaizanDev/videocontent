/**
 * JSON Schema for a bulk lesson script (docs/SCRIPT_BRIEF.md): only recipe scenes and compositions, so the writer
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

// a composition (docs/SCRIPT_BRIEF.md "Compositions"): 1–3 elements on one screen + teaching moves
const item = {type: 'object', additionalProperties: false, properties: {label: str(30), note: str(90), when: str(12), value: {type: 'number'}, display: str(12), say: words}, required: ['label']};
const element = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {type: 'string', pattern: '^[a-z][a-zA-Z0-9]{0,15}$'},
    kind: {enum: ['art', 'flow', 'table', 'stat', 'bars', 'timeline', 'cycle', 'hub', 'stack']},
    art: str(40), data: {type: 'object'},
    mermaid: str(900),
    columns: {type: 'array', minItems: 2, maxItems: 4, items: {type: 'string', maxLength: 40}}, rows: {type: 'array', minItems: 2, maxItems: 6, items: {type: 'array', items: {type: 'string', maxLength: 60}}}, bars: {type: 'array', items: {type: 'integer'}},
    value: {type: 'number'}, of: {type: 'integer'}, display: str(12), label: str(48), tone: {enum: ['red', 'blue', 'teal', 'green', 'ink']}, unit: str(16), center: str(22),
    items: {type: 'array', minItems: 2, maxItems: 8, items: item},
    say: {anyOf: [words, {type: 'array', items: words}]},
  },
  required: ['id', 'kind'],
};
const move = {type: 'object', additionalProperties: false, properties: {say: words, reveal: {anyOf: [str(16), {type: 'array', items: str(16)}]}, focus: str(40), zoom: {type: 'number'}, back: {type: 'boolean'}, label: {type: 'object', additionalProperties: false, properties: {on: str(40), text: str(28)}, required: ['on', 'text']}, act: {anyOf: [str(40), {type: 'array', items: str(40)}]}, note: str(90), pulse: str(40)}};

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
          scene('scene', {layout: {enum: ['auto', 'halves', 'main']}, elements: {type: 'array', minItems: 1, maxItems: 3, items: element}, moves: {type: 'array', maxItems: 8, items: move}}, ['elements']),
          scene('summary', {art: str(40), act: {type: 'array', items: str(30)}, notes: {type: 'array', minItems: 1, maxItems: 4, items: note}}, ['notes']),
        ],
      },
    },
  },
  required: ['id', 'title', 'outputFilename', 'module', 'scenes'],
};
