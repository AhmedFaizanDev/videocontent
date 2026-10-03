import type {PartMeta} from '../catalog.ts';

export default {
  ecgmonitor: {
    layout: 'full',
    doc: 'Bedside patient monitor: navy screen, glowing green ECG trace drawn by a moving pen that erases ahead, rate digits, pulsing heart icon. Default sinus rhythm ~75/min; data {rhythm?: vf|flatline|rosc} opens already in that rhythm (a scene continuing an arrest). anchors: screen trace rate heart vf flatline shock rosc · events (later wins): vf (ventricular fibrillation: chaotic squiggle, rate dashes, red screen edge) flatline (asystole: flat line, rate 0, dimmed) shock (white-blue flash and one tall spike) rosc (sinus rhythm returns, rate shown, heart beats)',
    anchors: ['screen', 'trace', 'rate', 'heart', 'vf', 'flatline', 'shock', 'rosc'],
    events: ['vf', 'flatline', 'shock', 'rosc'],
  },
  aed: {
    doc: 'Automated external defibrillator: bright green case with handle, small screen with charge bar, big lightning-bolt shock button, two electrode pads on cables. No text or brand. anchors: device button screen pads charge shock · events: pads (pads slide out on their cables) charge (button glow pulses faster, charge bar fills) shock (button flashes, energy bursts along both cables to the pads)',
    anchors: ['device', 'button', 'screen', 'pads', 'charge', 'shock'],
    events: ['pads', 'charge', 'shock'],
  },
} satisfies Record<string, PartMeta>;
