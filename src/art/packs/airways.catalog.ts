import type {PartMeta} from '../catalog.ts';

export default {
  bronchiole: {
    doc: 'Small airway in cross-section (looking down the tube): smooth-muscle ring, mucosal lining, open lumen with air drifting through. anchors: muscle mucosa lumen mucus airflow · events: constrict (muscle ring tightens, whole airway squeezes inward, lumen narrows) inflame (lining swells, thickens, reddens) mucus (thick plugs appear on the lining, narrowing the lumen further) relieve (muscle relaxes, lumen reopens; inflame/mucus persist)',
    anchors: ['muscle', 'mucosa', 'lumen', 'mucus', 'airflow', 'constrict', 'inflame', 'relieve'],
    events: ['constrict', 'inflame', 'mucus', 'relieve'],
  },
  inhaler: {
    doc: 'Handheld metered-dose inhaler: metal canister inserted from the top of an L-shaped plastic actuator, mouthpiece to the side. anchors: canister mouthpiece mist puff · event: puff (canister pressed, mist sprays from the mouthpiece, then fades). data {tone?: "blue" | "brown"}',
    anchors: ['canister', 'mouthpiece', 'mist', 'puff'],
    events: ['puff'],
    data: {tone: '"blue" | "brown" — actuator body colour (reliever blue / preventer brown), default blue'},
  },
} satisfies Record<string, PartMeta>;
