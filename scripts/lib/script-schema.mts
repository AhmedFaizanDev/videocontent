/**
 * JSON Schema for a lesson script (docs/SCRIPT_BRIEF.md): playbooks, illustrations explained part
 * by part, flowcharts, tables, opener and summary — nothing the compiler would have to guess.
 */
import {PLAYS} from '../../src/playbooks.ts';

const str = (max?: number) => ({type: 'string', minLength: 1, ...(max ? {maxLength: max} : {})});
const words = {type: 'array', items: str(40), minItems: 1, maxItems: 3};
const scene = (type: string, props: Record<string, any>, required: string[]) => ({
  type: 'object',
  additionalProperties: false,
  properties: {type: {const: type}, kicker: str(28), narration: str(1200), ...props},
  required: ['type', 'kicker', 'narration', ...required],
});
const notes = {type: 'array', maxItems: 3, items: {type: 'object', additionalProperties: false, properties: {say: words, note: str(90)}, required: ['say', 'note']}};
const flow = {mermaid: str(900), steps: {type: 'array', items: {type: 'object', additionalProperties: false, properties: {show: {type: 'array', items: str(12)}, focus: str(12), say: words}}}};
const table = {
  columns: {type: 'array', minItems: 2, maxItems: 4, items: {type: 'string', maxLength: 40}},
  rows: {type: 'array', minItems: 2, maxItems: 6, items: {type: 'array', items: {type: 'string', maxLength: 60}}},
  say: {type: 'array', items: words},
  bars: {type: 'array', items: {type: 'integer'}},
  highlight: {type: 'array', items: {type: 'object', additionalProperties: false, properties: {say: words, col: {type: 'integer'}}, required: ['say', 'col']}},
};

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
      minItems: 5,
      maxItems: 24,
      items: {
        anyOf: [
          scene('opener', {title: str(60), art: str(40), act: {type: 'array', items: str(30)}, notes}, ['title']),
          scene('play', {play: {enum: Object.keys(PLAYS)}, cues: {type: 'object', additionalProperties: words}, labels: {type: 'object', additionalProperties: {type: 'string'}}, skip: {type: 'array', items: str(20)}, notes, ...flow, ...table}, ['play']),
          scene('explain', {art: str(40), points: {type: 'array', minItems: 2, maxItems: 8, items: {type: 'object', additionalProperties: false, properties: {on: str(30), label: str(28), act: str(30), note: str(90), say: words}}}}, ['art', 'points']),
          scene('flow', {...flow, notes}, ['mermaid']),
          scene('table', {...table, notes}, ['columns', 'rows']),
          scene('summary', {art: str(40), act: {type: 'array', items: str(30)}, notes: {...notes, minItems: 2}}, ['notes']),
        ],
      },
    },
    // depth beyond the client's material: each added fact with its authoritative source (→ source/added/<id>.md)
    added: {type: 'array', maxItems: 30, items: {type: 'object', additionalProperties: false, properties: {fact: str(300), source: str(160)}, required: ['fact', 'source']}},
  },
  required: ['id', 'title', 'outputFilename', 'module', 'scenes'],
};
