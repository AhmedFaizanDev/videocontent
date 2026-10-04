import type {PartMeta} from '../catalog.ts';

export default {
  channelCutaway: {
    doc: 'Flexible endoscope insertion-tube segment: cross-section face (sheath, suction/biopsy channel, air and water channels, light guides, angulation wires) and a longitudinal cut of the suction channel. anchors: sheath suctionChannel airChannel waterChannel channelWall biofilm brush brushHead · events: biofilm (a layer grows on the channel wall) brush (a matched brush travels through and scrubs the layer off)',
    anchors: ['sheath', 'suctionChannel', 'airChannel', 'waterChannel', 'channelWall', 'biofilm', 'brush', 'brushHead'],
    events: ['biofilm', 'brush'],
  },
  duodenoscopeTip: {
    doc: 'Side-viewing duodenoscope distal tip in profile: objective lens and light window on the side face, accessory channel ending at its outlet in the narrow elevator recess, elevator lever lowered. anchors: distalTip lens channelOutlet elevator elevatorRecess raise · events: raise (the elevator lifts)',
    anchors: ['distalTip', 'lens', 'channelOutlet', 'elevator', 'elevatorRecess', 'raise'],
    events: ['raise'],
  },
} satisfies Record<string, PartMeta>;
