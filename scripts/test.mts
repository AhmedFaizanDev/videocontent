/**
 * The pipeline's own test suite — run before trusting any change to src/ or scripts/.
 *
 *   npm test                 all gates (≈3–5 min: renders fixture stills)
 *   npm test -- --fast       skip the fixture render stage
 *
 *   1 types      tsc over src/ and scripts/
 *   2 lint       no SVG text anywhere (render-only layout bug class)
 *   3 units      sync matcher, schedule, catalog, project defaults
 *   4 specs      every project validates with 0 errors
 *   5 fixtures   projects/fixtures (every scene type, every diagram at min/max) rendered
 *                with synthetic timings → review gate: no layout overflow; plus a short
 *                real render through the full encode path
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readdirSync, rmSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT, listProjects, loadProject, readTimings, specIds} from './lib/paths.mts';
import {writeFakeTimings} from './lib/fake-timings.mts';
import {matchPhrases, revealGroups, syncProblems} from '../src/sync.ts';
import {paceOf, retime, planTransitions, fitBreathe} from '../src/schedule.ts';
import {CATALOG, calloutsFor} from '../src/art/catalog.ts';
import {withDefaults, spoken} from '../src/project.ts';
import {speakTokens} from './lib/speak.mts';
import {numbersIn, pronunciationWatch, speechHazards, spellingProblems} from './lib/grounding.mts';
import {parseMermaid} from '../src/art/mermaid.ts';
import {compileScene, compileSpec, mergeSameWord, slotsFor} from '../src/compile.ts';
import {direct, varietyProblems} from '../src/director.ts';
import {fixSpec} from './lib/fix.mts';
import {simplify} from './lib/simplify.mts';
import {categorize} from './lib/categories.mts';
import {fullForms, respellings} from '../src/dictionary.ts';
import {revealTimes} from '../src/sync.ts';
import {uncovered} from './lib/coverage.mts';
import {camAt, driftAt, camFor, fitCam, placeLabel, resolve, screenWords, stageProblems} from '../src/stage.ts';

const fast = process.argv.includes('--fast');
let failed = 0;
const step = (name: string, fn: () => boolean | void) => {
  const t0 = Date.now();
  let ok = false;
  try {
    ok = fn() !== false;
  } catch (e) {
    console.log(`   ${(e as Error).message.split('\n').slice(0, 6).join('\n   ')}`);
  }
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
};
const sh = (cmd: string, args: string[], quiet = true) => {
  const r = spawnSync(cmd, args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  if (r.status !== 0 || !quiet) console.log((r.stdout + r.stderr).trim().split('\n').slice(-25).map((l) => '   ' + l).join('\n'));
  return r.status === 0;
};

step('1 types (tsc)', () => sh('npx', ['tsc', '--noEmit']));
step('2 lint: no SVG text', () => sh('node', ['scripts/lint-art.mts']));

step('3 units', () => {
  // matcher: in-order, substring ≥4, floor, misses
  // every on-screen character needs a vendored glyph (render servers have no reliable fallback)
  const cov = {name: 't', series: 's', lang: 'hi', brand: {signoff: 'x', episodeLabel: 'EP.'}};
  assert.deepEqual(uncovered({scenes: [{narration: 'रक्तचाप 120 → O₂ ✓ 🙂'}]}, cov), ['🙂'], 'glyph coverage');
  assert.equal(speakTokens('No pulse, no breathing. No. It is shockable. See No. 3.').map((t) => t.s).join(' '), 'No pulse, no breathing. No. It is shockable. See number 3.', '"no" is never read as "number"');
  assert.deepEqual(matchPhrases(['the', 'leak', 'test', 'then', 'brushing'], [['leak'], ['brush']]), [1, 4]);
  assert.deepEqual(matchPhrases(['brush', 'leak'], [['leak'], ['brush']]), [1, -1], 'order is enforced');
  assert.deepEqual(matchPhrases(['remove'], [['removable']]), [-1], '"remove" is not "removable"');
  assert.deepEqual(matchPhrases(['a', 'b', 'leak'], [['leak']], 3), [-1], 'floor respected');
  // intro ticks wait for the enumeration
  const intro: any = {type: 'intro', kicker: 'k', topic: 'Leak testing', subtitle: 's', learn: ['why leaks matter'], narration: 'Leak testing matters. Today we cover a lot of ground about it. By the end you will know why leaks matter.'};
  assert.equal(syncProblems(intro).length, 0);
  assert.equal(syncProblems({...intro, narration: 'Why leaks matter is our topic today. Nothing else here at all to see, honestly, none.'}).length, 1, 'learn word before the 40% floor must not count');
  // say overrides label words
  const steps: any = {type: 'steps', kicker: 'k', narration: 'First remove the caps.', steps: [{label: 'Removable parts', say: ['remove']}]};
  assert.equal(syncProblems(steps).length, 0);
  assert.equal(revealGroups(steps).steps.phrases[0][0], 'remove');
  // schedule
  const t = retime({id: 'x', fps: 30, totalDurationInFrames: 0, voice: {id: 'v', name: 'v'}, scenes: [0, 1, 2].map((i) => ({index: i + 1, type: i === 1 ? 'check' : 'steps', narration: '', audioFile: '', voDurationInSeconds: 1, voDurationInFrames: 30, leadFrames: 0, tailFrames: 0, durationInFrames: 0, startFrame: 0, captions: []})) as any});
  assert.equal(t.scenes[1].startFrame, t.scenes[0].startFrame + t.scenes[0].durationInFrames);
  assert.equal(t.totalDurationInFrames, t.scenes.reduce((n, s) => n + s.durationInFrames, 0));
  assert.deepEqual(planTransitions(['intro', 'check', 'answer', 'figure', 'figure', 'recap']).map((p) => p.kind), ['cut', 'flood', 'slide', 'portal', 'slide', 'zoomout']);
  // catalog: every diagram rejects bad data and derives callouts from items
  for (const [name, e] of Object.entries(CATALOG)) {
    assert.ok(e.doc && e.layout, `${name} documented`);
    if (e.callouts) assert.ok(e.check({}).length > 0, `${name} rejects empty data`);
    if (['cycle', 'flow', 'timeline', 'hub', 'stack', 'bars'].includes(name)) assert.equal(calloutsFor(name, {items: [{label: 'A'}, {label: 'B'}]})[1].anchor, 'i2');
  }
  // speakable narration: the voice hears words, captions keep the script
  const sp = (x: string) => speakTokens(x, {Purkinje: 'Pur-kin-jee'}).map((t) => t.s).join(' ');
  assert.equal(sp('Rate 60–100 beats, e.g., at rest.'), 'Rate 60 to 100 beats, for example, at rest.');
  assert.equal(sp('About 70% of Purkinje fibres.'), 'About 70 percent of Pur-kin-jee fibres.');
  assert.equal(sp("Let's compare A vs. B."), "Let's compare A versus B!");
  assert.equal(spoken('One. [pause] Two.'), 'One. Two.');
  // numbers: digits and spoken forms, split at punctuation
  assert.deepEqual(numbersIn('forty-four seventy-one; one hundred and twenty. four point nine, 5,000 mL'), [5000, 44, 71, 120, 4.9]);
  assert.ok(speechHazards('It reads 120/80 at 72bpm.', {}).length >= 2);
  assert.equal(spellingProblems([{where: 'x', text: 'fibres and fibers'}]).length, 1, 'mixed spelling is flagged');
  assert.equal(spellingProblems([{where: 'x', text: 'the fibers'}], 'en-GB').length, 1, 'US spelling in an en-GB project is flagged');
  assert.equal(calloutsFor('graph', {nodes: [{id: 'a', label: 'Alpha'}], steps: [{focus: 'a'}]})[0].label, 'Alpha');
  assert.equal(calloutsFor('trace', {segments: [{shape: 'flat'}, {shape: 'spike', label: 'R'}]})[0].anchor, 'i1');
  // timed sync on a real-looking word list
  const r = revealTimes(steps, [{w: 'first', start: 0}, {w: 'remove', start: 0.5}, {w: 'the', start: 0.8}, {w: 'caps', start: 1}], 1.2);
  assert.equal(r.steps[0].t, 0.5);
  // exact length: the holds are solved so the lesson is exactly N frames, whatever the narration
  const raw: any = {id: 'x', fps: 30, totalDurationInFrames: 0, voice: {id: 'v', name: 'v'}, scenes: ['intro', 'stage', 'check', 'recap'].map((type, i) => ({index: i + 1, type, narration: '', audioFile: '', voDurationInSeconds: 50, voDurationInFrames: 1500 + i * 37, leadFrames: 0, tailFrames: 0, durationInFrames: 0, startFrame: 0, captions: []}))};
  assert.equal(retime(raw, {breathe: 1.3, exactFrames: 9000}).totalDurationInFrames, 9000, 'exact total');
  assert.ok(Math.abs(fitBreathe(raw, 9000) - (9000 - raw.scenes.reduce((n: number, x: any) => n + x.voDurationInFrames, 0)) / (40 + 26 * 3 + 44 * 2 + 170 + 170)) < 1e-9);
  // stage: camera framing, chaining legs, label placement, validation, screen words
  {
    const view = {x: 0, y: 0, w: 1600, h: 800};
    const world: any = {w: 3200, h: 1600, layers: [{id: 'a', art: 'heart', at: [800, 800], h: 800}, {id: 'b', art: 'heart', at: [2800, 1200], h: 400, hidden: true}]};
    const info = () => ({w: 1000, h: 1000, anchors: {lv: [700, 600] as [number, number]}});
    const where = (t: string) => resolve(world, t, info);
    const fit = fitCam(world, view);
    assert.equal(fit.s, 0.5);
    const onA = camFor(world, view, {on: 'a'}, fit, where);
    assert.ok(Math.abs(onA.s - 800 / (800 * 1.33)) < 1e-9, 'a layer fills ~75% of the view');
    assert.ok(Math.abs(onA.cx - 1600 / 2 / onA.s) < 1e-9, 'near the edge the camera stops at the world boundary');
    const onB = camFor(world, view, {on: 'b', zoom: 4}, fit, where);
    assert.equal(onB.cx, 3200 - 1600 / 2 / 2, 'camera stays inside the world');
    assert.deepEqual(where('a.lv')!.pt, [400 + 0.7 * 800, 400 + 0.6 * 800]);
    const keys = [{f: 100, cam: onA}, {f: 110, cam: onB}];
    assert.deepEqual(camAt(0, fit, keys), fit);
    assert.deepEqual(camAt(1000, fit, keys), onB, 'lands on the last key');
    const mid = camAt(110, fit, keys);
    assert.ok(mid.s > fit.s && mid.s < onA.s, 'a leg interrupted mid-flight hands over from where it is');
    const lb = placeLabel([400, 400], 200, 50, [{x: 470, y: 294, w: 200, h: 50}], view);
    assert.ok(!(lb.x === 470 && lb.y === 294), 'label avoids a taken spot');
    assert.ok(placeLabel([1590, 20], 200, 50, [], view).x + 200 <= 1600, 'label stays inside the view');
    const art = (n: string) => (n === 'heart' ? ['lv', 'rv'] : null);
    const good: any = {world, beats: [{say: ['heart'], camera: {on: 'a'}, label: {on: 'a.lv', text: 'Left ventricle'}}, {say: ['second'], show: 'b', camera: 'overview'}]};
    assert.deepEqual(stageProblems(good, art), []);
    const bad: any = {world: {...world, layers: [...world.layers, {id: 'c', art: 'nope', at: [1, 1], h: 5}]}, beats: [{say: ['x']}, {say: ['y'], label: {on: 'a.zz', text: 'x'.repeat(40)}, show: 'a'}]};
    const ps = stageProblems(bad, art).join('\n');
    for (const m of ['unknown art "nope"', 'does nothing visible', 'no anchor "zz"', 'max 28', '"a" is not hidden', '"b" is hidden but no beat shows it']) assert.ok(ps.includes(m), `stage validation: ${m}`);
    assert.equal(screenWords('Two words', [{label: {on: 'a', text: 'one two'}, note: 'three four five'}, {camera: 'overview', label: {on: 'a', text: 'six'}}]), 2 + 5);
    assert.equal(syncProblems({type: 'stage', kicker: 'k', narration: 'The heart beats.', ...good} as any).length, 1, 'every beat must be heard');
  }
  // project defaults
  const p = withDefaults('demo', {name: 'Demo'});
  assert.equal(p.voice.name, 'en-IN-NeerjaNeural');
  // house standard v2: pronunciation, Mermaid flowcharts, tables
  assert.equal(speakTokens('Welcome to MedSkills.', p.lexicon).map((t) => t.s).join(' '), 'Welcome to Medd Skills.', 'house lexicon: MedSkills is said as the owner chose (audition 2026-10-04)');
  assert.equal(withDefaults('x', {lexicon: {MedSkills: 'Med-Skills'}}).lexicon.MedSkills, 'Med-Skills', 'project lexicon wins');
  assert.ok(speechHazards('Open PubMed today.', p.lexicon).some((m) => m.includes('run-together')), 'run-together names need a respelling');
  assert.equal(speechHazards('Welcome to MedSkills.', p.lexicon).length, 0, 'a lexicon entry clears it');
  assert.deepEqual(pronunciationWatch('Give amiodarone after the third shock; the fibres contract.', {}), ['amiodarone'], 'unknown technical words are listed; British spellings are not');
  {
    const g = parseMermaid('flowchart LR\n A([Start]) --> B{Pulse?}\n B -->|No| C[CPR]:::red\n B -- Yes --> D((Monitor))\n C -.-> D\n class D teal');
    assert.equal(g.direction, 'LR');
    assert.deepEqual(g.nodes.map((n) => [n.id, n.shape, n.tone ?? '']), [['A', 'pill', ''], ['B', 'decision', ''], ['C', 'box', 'red'], ['D', 'circle', 'teal']]);
    assert.deepEqual(g.edges!.map((e) => `${e.from}>${e.to}:${e.label ?? ''}${e.dashed ? ':dashed' : ''}`), ['A>B:', 'B>C:No', 'B>D:Yes', 'C>D::dashed']);
    assert.throws(() => parseMermaid('flowchart TD\n A --> '), /arrow without a target/);
    assert.equal(parseMermaid('flowchart LR\n A[Operate an AED; manual shock] --> B[x]; B --> C[y]').nodes[0].label, 'Operate an AED; manual shock', 'a ; inside a label is text, outside one ends a statement');
    assert.deepEqual(CATALOG.graph.check({mermaid: 'flowchart TD\n A[a] --> B[b]', steps: [{show: ['B']}]}), []);
    assert.ok(CATALOG.graph.anchors({mermaid: 'flowchart TD\n A[a] --> B[b]', steps: [{show: ['B']}]}).includes('s1'));
    const t = {columns: ['Drug', 'Dose'], rows: [['Epinephrine', '1 mg'], ['Amiodarone', '300 mg']]};
    assert.deepEqual(CATALOG.table.check(t), []);
    assert.ok(CATALOG.table.anchors(t).includes('r2c2'));
    assert.ok(CATALOG.table.check({columns: ['a', 'b'], rows: [['x']]}).some((m) => m.includes('must have 2 cells')));
  }
  assert.ok(p.pacing.sentencePause > 0 && p.pacing.breathe <= 1 && p.voice.wpm >= 120 && p.voice.wpm <= 150, 'house pacing is natural (measured ~128 wpm at +10%, little dead air)');
  // shorthand scenes compile to stages whose beats fire on words the narration speaks
  {
    const flow = compileScene({type: 'flow', kicker: 'k', narration: 'Arrest first. Then the rhythm decides. A shockable rhythm gets a shock.', mermaid: 'flowchart LR\n A([Arrest]) --> B{Rhythm?}\n B --> C[Shockable]', tour: true});
    assert.equal(flow.type, 'stage');
    assert.deepEqual(flow.beats.filter((b: any) => b.act).map((b: any) => [b.say[0], b.act]), [['arrest', 'chart.s1'], ['rhythm', 'chart.s2'], ['shockable', 'chart.s3']]);
    assert.ok(flow.beats.some((b: any) => b.camera === 'overview'), 'a tour ends on the overview');
    assert.equal(syncProblems(flow).length, 0, 'derived words are spoken in order');
    const tbl = compileScene({type: 'table', kicker: 'k', narration: 'Adults survive less often than children.', columns: ['Group', 'Survival'], rows: [['Adults', '23.6%'], ['Children', '45.2%']]});
    assert.deepEqual(tbl.beats.map((b: any) => b.act), ['tbl.r1', 'tbl.r2']);
    assert.equal(tbl.world.layers[0].fit, true);
    // recipes + the automatic frame (bulk scripts never write coordinates, intros or outros)
    const spec: any = compileSpec({scenes: [
      {type: 'opener', kicker: 'k', narration: 'Welcome here. The heart beats with an impulse.', title: 'T', art: 'heartExterior', act: ['conduction']},
      {type: 'explain', kicker: 'k', narration: 'The aorta leaves the heart. The right ventricle pumps to the lungs.', art: 'heartExterior', points: [{on: 'aorta', label: 'Aorta'}, {on: 'rv', label: 'Right ventricle'}]},
      {type: 'summary', kicker: 'k', narration: 'In short: electrical.', notes: [{say: ['electrical'], note: 'Electrical'}]},
    ] as any[]}, {ident: true, outro: 'Keep learning with MedSkills.'});
    assert.deepEqual(spec.scenes.map((x: any) => x.type), ['ident', 'stage', 'stage', 'stage', 'outro']);
    const ex = spec.scenes[2];
    assert.equal(ex.world.layers[0].fit, true);
    assert.deepEqual(ex.beats.map((b: any) => b.label?.text), ['Aorta', 'Right ventricle']);
    assert.equal(ex.beats[1].camera, 'overview', 'the last zoomed point pulls back');
    assert.equal(syncProblems(ex).length, 0);
    assert.equal(spec.scenes[1].beats[1].camera, 'overview', 'the opener act clears the title');
  }
  // compositions: 1–3 elements laid out in slots, each building on its own words, plus moves
  {
    const c = compileScene({type: 'scene', kicker: 'k', narration: 'The aorta carries blood. About 90% die. The table shows home and hospital.', elements: [
      {id: 'pct', kind: 'stat', value: 90, of: 100, display: '90%', label: 'die', say: ['90']},
      {id: 'heart', kind: 'art', art: 'heartExterior'},
    ], moves: [{focus: 'heart.aorta', label: {on: 'heart.aorta', text: 'Aorta'}, say: ['aorta']}]});
    assert.equal(c.type, 'stage');
    assert.deepEqual(c.world.layers.map((l: any) => [l.id, l.slot]), [['heart', 'ML'], ['pct', 'SR']], 'the illustration leads, the number sits beside it');
    assert.deepEqual(c.beats.map((b: any) => b.act ?? b.label?.text), ['Aorta', 'pct.count']);
    assert.ok(c.beats.every((b: any) => b._pos === undefined), 'positions are stripped');
    assert.equal(syncProblems(c).length, 0);
    const t = compileScene({type: 'scene', kicker: 'k', narration: 'Survival is higher in public places than at home, and highest for children in hospital.', elements: [
      {id: 'heart', kind: 'art', art: 'heartExterior'},
      {id: 'tb', kind: 'table', columns: ['Setting', 'Survival', 'Note'], rows: [['Public', '21.1%', 'x'], ['Home', '8.9%', 'y']], say: [['public'], ['home']]},
    ]});
    assert.deepEqual(t.world.layers.map((l: any) => l.slot), ['SR', 'ML'], 'a dense table takes the main slot');
    assert.deepEqual(t.beats.filter((b: any) => /\.r\d$/.test(b.act)).map((b: any) => b.act), ['tb.r1', 'tb.r2'], 'table rows retargeted to the element');
    assert.deepEqual(slotsFor(['flow', 'stat']), ['L', 'R']);
    assert.deepEqual(slotsFor(['art', 'stat', 'table'], undefined, true), ['MR', 'SLT', 'SLB'], 'mirrored');
    // the director: continuity, relation-based transitions, alternating drift
    const d = direct([
      {type: 'scene', elements: [{kind: 'art', art: 'h'}, {kind: 'stat'}]},
      {type: 'scene', elements: [{kind: 'art', art: 'h'}, {kind: 'table'}]},
      {type: 'scene', elements: [{kind: 'flow'}, {kind: 'stat'}]},
      {type: 'summary'},
    ]);
    assert.deepEqual(d.map((x: any) => x.mirror), [true, true, false, undefined], 'same illustration keeps its side; a new subject swaps');
    assert.deepEqual(d.map((x: any) => x.transition), [undefined, undefined, undefined, undefined], 'transitions stay the reference engine\'s');
    // the variety gate
    const same = Array.from({length: 6}, () => ({type: 'table'}));
    const v = varietyProblems(same);
    assert.ok(v.some((m) => m.includes('in a row')) && v.some((m) => m.includes('40 %')));
    const varied = [{type: 'explain'}, {type: 'scene', elements: [{kind: 'art'}, {kind: 'stat'}]}, {type: 'flow'}, {type: 'table'}, {type: 'scene', elements: [{kind: 'flow'}, {kind: 'stat'}]}, {type: 'explain'}];
    assert.deepEqual(varietyProblems(varied), []);
    assert.equal(driftAt(0, [], -1) > 1, true, 'reversed drift opens slightly in, never below the overview');
  }
  // self-healing: deterministic fixers, same-word beats, the fallback, failure categories
  {
    const broken = JSON.parse(readFileSync(join(ROOT, 'projects', 'fx-compose', 'broken', 'C02.json'), 'utf8'));
    const {spec: fixed, fixes} = fixSpec(broken);
    assert.ok(fixes.some((f) => f.what === 'CPR → cardiopulmonary resuscitation') && fixes.some((f) => f.kind === 'say'), 'abbreviation expanded, unspoken cue dropped');
    assert.ok(!/\bCPR\b/.test(fixed.scenes[2].narration));
    assert.deepEqual(fixSpec({scenes: [{narration: 'There were four separate chains.', notes: [{say: ['four separate'], note: 'x'}]}]}).spec.scenes[0].notes[0].say, ['four', 'separate'], 'phrase cues split');
    assert.ok(syncProblems(compileScene({type: 'scene', kicker: 'k', narration: 'Survival is 10.5% overall.', elements: [{id: 'b', kind: 'bars', items: [{label: 'All', value: 10.5, say: fixSpec({scenes: [{narration: 'Survival is 10.5% overall.', notes: [{say: ['10.5%'], note: 'x'}]}]}).spec.scenes[0].notes[0].say}]}]})).length === 0, 'a percentage cue is heard');
    const nb = compileScene({type: 'table', kicker: 'k', narration: 'Adults first. Children next. Survival differs by setting.', columns: ['G', 'S'], rows: [['Adults', '1'], ['Children', '2']], notes: [{note: 'Setting matters'}]});
    assert.equal(syncProblems(nb).length, 0, 'a note without a cue derives one from its text');
    const hq = compileScene({type: 'flow', kicker: 'k', narration: 'First, recognition. The chain of survival has links. Second, high-quality compressions. Third, defibrillation follows when the rhythm allows it and the pads are on.', mermaid: 'flowchart LR\n A[Recognition] --> B[High-quality CPR] --> C[Defibrillation]'});
    assert.equal(syncProblems(hq).length, 0, 'a hyphenated spoken word positions its cue where sync hears it');
    const tour = compileScene({type: 'table', kicker: 'k', narration: 'The left side pumps hard. The right side pumps gently to the lungs. The left wall is thicker than the right.', columns: ['Side', 'Serves'], rows: [['Left', 'Body'], ['Right', 'Lungs'], ['Septum', 'Both'], ['Apex', 'Tip']], say: [['left'], ['right']], tour: true});
    assert.equal(tour.beats[tour.beats.length - 1].camera, 'overview', 'a tour ends on the overview, at the end');
    assert.equal(fixSpec({scenes: [{narration: 'Give 30:2. Who decides?'}]}).spec.scenes[0].narration, 'Give 30 to 2. Who decides?', '"Who" is not WHO');
    assert.deepEqual(mergeSameWord([{_pos: 3, act: 'a.r1'}, {_pos: 3, act: 'b.count'}, {_pos: 5, note: 'n'}]), [{_pos: 3, act: ['a.r1', 'b.count']}, {_pos: 5, note: 'n'}]);
    assert.equal(mergeSameWord([{_pos: 3, camera: 'overview'}, {_pos: 3, camera: {on: 'x'}}]).length, 2, 'two camera moves never merge');
    const fb = simplify(broken.scenes[4]);
    assert.deepEqual(fb.elements.map((e: any) => e.kind), ['table'], 'a crowded composition falls back to its densest element');
    assert.ok(fb.moves.some((m: any) => m.note?.startsWith('45.2%')), "the dropped statistic survives as a note");
    assert.equal(simplify({type: 'scene', narration: 'x', elements: [{id: 'b', kind: 'bars', items: []}, {id: 's', kind: 'stat', value: 1}]}).elements[0].kind, 'bars', 'any element kind can stand alone');
    assert.equal(fb.narration, broken.scenes[4].narration, 'the fallback keeps the narration');
    assert.equal(categorize('❌ C01 layout: scene[4] (stage): text too small to read (19px < 22px'), 'tiny-text');
    assert.equal(categorize('❌ C01 timing: scene[2] (stage): ~9 s with nothing new on screen'), 'idle');
    assert.equal(respellings('en').MedSkills, 'Medd Skills', 'the lexicon derives from the dictionary');
    assert.equal(fullForms('en').CPR, 'cardiopulmonary resuscitation');
  }
  assert.equal(p.output.dir, 'demo');
  assert.equal(p.rules.sync, 'error');
});

step('4 specs: every project validates', () => listProjects().every((p) => sh('node', ['scripts/validate.mts', p])));
step('4b preflight (text stages) passes on fixtures', () => sh('node', ['scripts/preflight.mts', 'fixtures', '--no-render']));

if (!fast) {
  step('5a fixtures: stills + layout gate', () => {
    for (const id of specIds('fixtures')) writeFakeTimings('fixtures', id);
    return sh('node', ['scripts/review.mts', 'fixtures', '--out', 'iterations/test/fixtures'], false);
  });
  step('5b fixtures: full encode path (short clip)', () => {
    const out = join('iterations', 'test', 'clip');
    rmSync(join(ROOT, out), {recursive: true, force: true});
    // the clip runs longer than a deliberately short delayRender timeout: a handle that is never
    // cleared (e.g. the house-fonts handle orphaned when taken at module evaluation) fails it
    return sh('node', ['scripts/render.mts', 'fixtures', 'F02', '--out', out, '--frames', '0-599', '--timeout', '8000']) && existsSync(join(ROOT, out));
  });
  // a settled, static layout must still move (camera push + float): QA fails a ≥3 s frozen
  // picture, and a frozen stretch can only be seen in motion — so it is designed out, and this
  // renders 4 s of a definition scene after its last reveal to prove it (no still ≥1.5 s)
  step('5d motion: a settled scene never freezes', () => {
    const t = retime(readTimings('fixtures', 'F02'), paceOf(loadProject('fixtures')));
    const st = t.scenes.find((x) => x.type === 'definition')!;
    const from = st.startFrame + st.leadFrames + Math.round(st.voDurationInFrames * 0.9);
    const out = join('iterations', 'test', 'motion');
    rmSync(join(ROOT, out), {recursive: true, force: true});
    if (!sh('node', ['scripts/render.mts', 'fixtures', 'F02', '--out', out, '--frames', `${from}-${from + 120}`])) return false;
    const clip = readdirSync(join(ROOT, out)).find((f) => f.endsWith('.mp4'));
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', join(ROOT, out, clip!), '-vf', 'freezedetect=n=-60dB:d=1.5', '-an', '-f', 'null', '-'], {encoding: 'utf8'});
    return !/freeze_start/.test(r.stderr);
  });
  // the text audit must keep catching what used to need a human eye (a long word overflowing
  // a diagram box and colliding with its neighbour) — projects/audit-probe is built to fail
  // the art gates must pass the known-good library (no false alarms) — new parts are judged by them
  step('5e art gates pass the reference arts', () => sh('node', ['scripts/art.mts', 'check', 'person', 'vessel', 'gauge', 'heart']));
  step('5c text audit catches overflow + collision', () => {
    const r = spawnSync('node', ['scripts/preflight.mts', 'audit-probe'], {cwd: ROOT, encoding: 'utf8'});
    return r.status === 1 && /text overflows its box/.test(r.stdout) && /text collides/.test(r.stdout);
  });
}

console.log(failed ? `\n❌ ${failed} stage(s) failed` : '\n✅ pipeline healthy');
process.exit(failed ? 1 : 0);
