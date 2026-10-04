/**
 * Is unattended (headless) generation ready on this Mac?
 *   node scripts/headless-check.mts
 * Checks, with one tiny call each: the Claude Code binary, the login, schema-constrained answers
 * (the writer), image reading (the visual judge) and the Opus model (playbook authoring).
 * The login itself is the owner's one-time action — this script never signs in. Two ways:
 *   1. run the binary printed below once in a terminal and type /login, or
 *   2. for a machine that runs unattended for weeks: run "<binary> setup-token", and put the
 *      token it prints in the shell environment as CLAUDE_CODE_OAUTH_TOKEN (e.g. ~/.zshrc —
 *      never in the repository).
 */
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/paths.mts';
import {callModel, cli, claudeBin} from './lib/llm.mts';

const bin = claudeBin();
console.log(`binary: ${bin}${existsSync(bin) ? '' : '  ❌ not found — install Claude Code or set CLAUDE_BIN'}`);
const probe = (label: string, call: Parameters<typeof callModel>[0]) => {
  const out = callModel(call);
  console.log(`${out ? '✅' : '❌'} ${label}`);
  return !!out;
};
const okSchema = {type: 'object', properties: {ok: {type: 'boolean'}}, required: ['ok']};
const base = {project: 'smoke', tag: {id: 'headless-check', role: 'probe'}, system: 'Answer with ok: true.', schema: okSchema};
if (!probe('logged in · schema answers (Sonnet — the writer, editor, repairs)', {...base, user: 'Say ok.'})) {
  console.log(`\nNot ready: headless Claude is not logged in. One-time, in a terminal:\n  "${bin}"\nthen type /login (or use setup-token — see the header of this script). Until then the batch\nwrites job files for a Claude session to run (agent mode).`);
  process.exit(1);
}
mkdirSync(join(ROOT, 'iterations', 'batch-cwd'), {recursive: true});
const img = join(ROOT, 'iterations', 'visuals', 'fx-trial-cssd', 'flexibleEndoscope', 'grid.png');
if (existsSync(img)) probe('image reading (the visual judge)', {...base, system: 'Read the image; answer ok: true if it shows an object.', user: 'Look at the image.', images: [img]});
probe('Opus (playbook authoring)', {...base, user: 'Say ok.', model: 'opus'});
writeFileSync(join(ROOT, 'iterations', 'headless-ready'), new Date().toISOString());
console.log(`\n✅ headless ready (cli.ok=${cli.ok}): node scripts/batch.mts <project> all runs unattended.`);
