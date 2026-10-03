import type {PartMeta} from '../catalog.ts';

export default {
  chain: {
    layout: 'full',
    doc: 'Horizontal chain of n face-on rings (data.n 3-8, default 6), each joined to the next by a short edge-on link threaded through both ring walls, so it reads as a real chain; pale lavender with a darker outline by default; each ring hollow stays empty for an icon or label. anchors: l1..l8 (ring centres; beyond n sit on the last ring) all (above the chain centre) · events: l1..l8 (that ring fills with the MedSkills gradient #E0168A to #6E25A3 and glows; a joining link lights when both its rings are lit) all (quick left-to-right lighting wave, then one pulse of the whole chain)',
    anchors: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'all'],
    events: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'all'],
  },
} satisfies Record<string, PartMeta>;
