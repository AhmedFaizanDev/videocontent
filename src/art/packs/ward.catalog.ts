import type {PartMeta} from '../catalog.ts';

export default {
  ward: {
    doc: 'A quiet hospital bay at night, side view: window with night sky and crescent moon, wall oxygen/suction panel, hospital bed with a patient asleep in profile under a breathing blanket, IV pole with drip bag and line to the arm, privacy curtain. Muted night palette. anchors: bed patient face chest iv window curtain panel alarm calm · events: alarm (red beacon pulses ~2/s, red light washes wall, bed and blanket, the face goes pale) calm (red fades, warm night light returns, colour returns)',
    anchors: ['bed', 'patient', 'face', 'chest', 'iv', 'window', 'curtain', 'panel', 'alarm', 'calm'],
    events: ['alarm', 'calm'],
  },
} satisfies Record<string, PartMeta>;
