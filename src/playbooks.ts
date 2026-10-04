/**
 * Playbooks — the creative capital: how a picture TEACHES, written once (by the strongest model,
 * from the reference lessons) and reused by every lesson. A playbook is a choreography, not
 * animation code: an ordered set of moments, each a beat the renderer already knows how to play
 * (an illustration's state, regions, labels with correct anatomy, a camera move), waiting for the
 * word in the narration that fires it.
 *
 * The writer picks a playbook and writes narration that walks through its moments, naming each
 * moment's cue (or letting the compiler find it from the moment's hint words):
 *   {"type": "play", "play": "heart.failure", "kicker", "narration",
 *    "cues"?: {"quiver": ["quiver"], …}, "skip"?: ["regions"], "notes"?: [{say, note}]}
 * Optional moments the narration never reaches are left out; required ones must be spoken.
 * Variety comes from which playbooks a lesson uses, in what order, which optional moments it
 * plays, and the narration — the drawing and its choreography stay reference quality.
 *
 * Generic data plays (flow.*, table.*) are named teaching intents over the flowchart and table
 * treatments: the writer supplies the content, the play sets how it is taught.
 *
 * Add a playbook when a subject's asset is imported (scripts/find-assets.mts) — once per subject.
 */
import type {Beat} from './stage';
import {VECTOR_MANIFESTS} from './art/vector/manifests.gen.ts';
import {DRAWN_PLAYBOOKS} from './art/playbooks.gen.ts';

export type Moment = {
  slot: string;
  /** words the narration is likely to use for this moment (the compiler looks for them in order) */
  hint: string[];
  /** what happens: beat verbs with targets relative to the art ("aorta", not "art.aorta") */
  beat: Partial<Beat>;
  optional?: boolean;
};
export type ArtPlay = {id: string; art: string; teaches: string; moments: Moment[]; data?: any};
export type DataPlay = {id: string; kind: 'flow' | 'table'; teaches: string; preset: Record<string, any>};

const L = (on: string, text: string) => ({on, text});

export const ART_PLAYS: ArtPlay[] = [
  {
    id: 'heart.beat',
    art: 'heartExterior',
    teaches: 'the normal heart as a pump: an electrical impulse spreads, atria then ventricles contract, blood leaves by the great vessels (an opener or a "how it normally works" scene)',
    moments: [
      {slot: 'impulse', hint: ['impulse', 'electrical', 'signal', 'beat'], beat: {act: 'conduction', camera: 'overview'}},
      {slot: 'atria', hint: ['atria', 'atrium'], beat: {act: 'atria'}, optional: true},
      {slot: 'ventricles', hint: ['ventricles', 'ventricle', 'contract', 'sequence'], beat: {act: 'ventricles'}, optional: true},
      {slot: 'vessels', hint: ['aorta', 'pulmonary', 'pushing', 'vessels'], beat: {label: [L('aorta', 'Aorta'), L('pulmonary', 'Pulmonary trunk')]}},
    ],
  },
  {
    id: 'heart.failure',
    art: 'heartExterior',
    teaches: 'how the pump fails in cardiac arrest: ventricular fibrillation — fibres fire out of step, the ventricles quiver, no blood is ejected, output falls to zero',
    moments: [
      {slot: 'regions', hint: ['ventricles', 'ventricle', 'chambers'], beat: {act: ['rvRegion', 'lvRegion']}, optional: true},
      {slot: 'quiver', hint: ['quiver', 'quivers', 'fibrillation', 'chaotic'], beat: {act: 'vf', camera: {on: 'rv', zoom: 1.35}, label: [L('rv', 'Right ventricle'), L('lv', 'Left ventricle')]}},
      {slot: 'noOutput', hint: ['zero', 'output', 'ejects', 'pulse'], beat: {camera: 'overview', label: L('aorta', 'No output')}},
      {slot: 'stop', hint: ['asystole', 'stops', 'still', 'flat'], beat: {act: 'stop'}, optional: true},
    ],
  },
  {
    id: 'heart.compressions',
    art: 'heartExterior',
    teaches: 'what chest compressions do: squeeze the heart between sternum and spine and push blood to the body and the lungs until the heart is restarted',
    moments: [
      {slot: 'squeeze', hint: ['squeeze', 'compress', 'compressions', 'push'], beat: {act: 'compress', label: [L('aorta', 'To the body'), L('pulmonary', 'To the lungs')]}},
      {slot: 'brain', hint: ['brain', 'flow', 'circulation'], beat: {camera: {on: 'aorta', zoom: 1.3}}, optional: true},
      {slot: 'back', hint: ['restarted', 'until', 'shock', 'defibrillator'], beat: {camera: 'overview'}, optional: true},
    ],
  },
  {
    id: 'heart.recovery',
    art: 'heartExterior',
    teaches: 'return of spontaneous circulation: the heart beats on its own again and output returns (a recovery moment or the summary)',
    moments: [{slot: 'rosc', hint: ['return', 'restarts', 'restored', 'summarise', 'recovery', 'own'], beat: {act: 'rosc'}}],
  },
  {
    id: 'heart.conduction',
    art: 'heartExterior',
    teaches: "the heart's electrical conduction: the sinoatrial node fires, the atria contract, the atrioventricular node delays, the impulse runs down the septum to the Purkinje fibres and the ventricles contract",
    moments: [
      {slot: 'sa', hint: ['sinoatrial', 'pacemaker', 'fires'], beat: {act: 'conduction', camera: {on: 'sa', zoom: 1.6}, label: L('sa', 'Sinoatrial node')}},
      {slot: 'atria', hint: ['atria', 'atrium'], beat: {act: 'atria'}, optional: true},
      {slot: 'av', hint: ['atrioventricular', 'delay', 'pause'], beat: {camera: {on: 'av', zoom: 1.6}, label: L('av', 'Atrioventricular node')}},
      {slot: 'bundle', hint: ['bundle', 'septum', 'branches'], beat: {camera: {on: 'septum', zoom: 1.4}, label: L('septum', 'Bundle branches')}, optional: true},
      {slot: 'purkinje', hint: ['purkinje', 'fibres', 'apex'], beat: {label: L('purkinje', 'Purkinje fibres')}, optional: true},
      {slot: 'ventricles', hint: ['ventricles', 'contract', 'together'], beat: {act: ['conduction', 'ventricles'], camera: 'overview'}},
    ],
  },
  {
    id: 'heart.cycle',
    art: 'heartExterior',
    teaches: 'one cardiac cycle: the atria contract and fill the ventricles, the ventricles contract and eject into the aorta and pulmonary trunk, then the heart relaxes and refills',
    moments: [
      {slot: 'atria', hint: ['atria', 'atrial', 'atrium'], beat: {act: 'atria', label: [L('ra', 'Right atrium'), L('la', 'Left atrium')]}},
      {slot: 'ventricles', hint: ['ventricles', 'ventricular', 'systole'], beat: {act: 'ventricles', label: [L('rv', 'Right ventricle'), L('lv', 'Left ventricle')]}},
      {slot: 'eject', hint: ['eject', 'ejected', 'aorta', 'pumped'], beat: {label: [L('aorta', 'Aorta'), L('pulmonary', 'Pulmonary trunk')], camera: {on: 'aorta', zoom: 1.3}}},
      {slot: 'relax', hint: ['relax', 'relaxes', 'diastole', 'refill', 'fill'], beat: {camera: 'overview'}, optional: true},
    ],
  },
  {
    id: 'heart.coronary',
    art: 'heartExterior',
    teaches: "the heart's own blood supply: the coronary arteries on its surface feed the muscle; a blocked artery starves the muscle it supplies (ischaemia, then infarction)",
    moments: [
      {slot: 'arteries', hint: ['coronary', 'arteries', 'supply'], beat: {label: [L('rca', 'Right coronary artery'), L('lad', 'Left anterior descending')], camera: {on: 'lad', zoom: 1.3}}},
      {slot: 'block', hint: ['blocked', 'blockage', 'block', 'occluded'], beat: {label: L('lad', 'Blocked'), pulse: 'lad'}},
      {slot: 'muscle', hint: ['muscle', 'starved', 'ischaemia', 'ischaemic', 'infarction'], beat: {act: 'lvRegion', camera: {on: 'lv', zoom: 1.3}}},
      {slot: 'whole', hint: ['arrest', 'rhythm', 'whole', 'pump'], beat: {camera: 'overview'}, optional: true},
    ],
  },
  {
    id: 'heart.anatomy',
    art: 'heartExterior',
    teaches: 'the heart part by part: chambers and great vessels named on the picture as they are explained',
    moments: [
      {slot: 'ra', hint: ['right atrium'], beat: {camera: {on: 'ra', zoom: 1.4}, label: L('ra', 'Right atrium')}, optional: true},
      {slot: 'rv', hint: ['right ventricle'], beat: {camera: {on: 'rv', zoom: 1.4}, label: L('rv', 'Right ventricle')}, optional: true},
      {slot: 'lv', hint: ['left ventricle'], beat: {camera: {on: 'lv', zoom: 1.4}, label: L('lv', 'Left ventricle')}, optional: true},
      {slot: 'aorta', hint: ['aorta'], beat: {camera: {on: 'aorta', zoom: 1.4}, label: L('aorta', 'Aorta')}, optional: true},
      {slot: 'pulmonary', hint: ['pulmonary'], beat: {camera: {on: 'pulmonary', zoom: 1.4}, label: L('pulmonary', 'Pulmonary trunk')}, optional: true},
      {slot: 'whole', hint: ['together', 'whole', 'pump'], beat: {camera: 'overview'}, optional: true},
    ],
  },
];

/** Generic teaching intents for data screens (from the reference: its decision chart, chain tour, comparison and scale tables). */
export const DATA_PLAYS: DataPlay[] = [
  {id: 'flow.decision', kind: 'flow', teaches: 'a decision with branches (a rhythm decides the treatment; if/then): the chart grows branch by branch, the camera follows each path. Mermaid TD or LR with a {decision?} node; narrate one branch to its end before the next', preset: {tour: true, zoom: 1.6}},
  {id: 'flow.chain', kind: 'flow', teaches: 'an ordered sequence of steps or links (a chain, a procedure): left to right, toured link by link, ending on the whole chain. Mermaid LR, 4–7 nodes', preset: {tour: true}},
  {id: 'flow.cause', kind: 'flow', teaches: 'a short cause → effect mechanism (3–5 nodes) seen whole: no tour, each node and its connector appear as spoken. Mermaid LR', preset: {tour: false}},
  {id: 'table.compare', kind: 'table', teaches: 'two or three things compared point by point (arrest vs heart attack): rows by aspect, cells appear as each side is spoken', preset: {}},
  {id: 'table.scale', kind: 'table', teaches: 'numbers across settings or groups (survival by setting): numeric column grows as bars and counts up; with 4+ rows the camera tours them', preset: {}},
  {id: 'table.update', kind: 'table', teaches: 'what changed between two versions (2020 → 2025): the newest column is highlighted when the change is named', preset: {}},
];

/** Playbooks that ship with an imported asset (its manifest's `playbooks`, authored once when it was acquired). */
const FROM_ASSETS: ArtPlay[] = Object.values(VECTOR_MANIFESTS as Record<string, any>).flatMap((m) => (m.playbooks ?? []).map((p: Omit<ArtPlay, 'art'>) => ({...p, art: m.key})));
/** …and those of drawn (code) art, from assets/playbooks/ — the same system, the same reuse. */
const FROM_DRAWN: ArtPlay[] = Object.entries(DRAWN_PLAYBOOKS).flatMap(([art, ps]) => ps.map((p: Omit<ArtPlay, 'art'>) => ({...p, art})));
export const ALL_ART_PLAYS: ArtPlay[] = [...ART_PLAYS, ...FROM_ASSETS, ...FROM_DRAWN];

export const PLAYS: Record<string, ArtPlay | DataPlay> = Object.fromEntries([...ALL_ART_PLAYS, ...DATA_PLAYS].map((p) => [p.id, p]));
export const isArtPlay = (p: ArtPlay | DataPlay): p is ArtPlay => 'moments' in p;
