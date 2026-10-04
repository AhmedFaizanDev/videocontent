import type {PartMeta} from '../catalog.ts';

export default {
  leakTest: {
    layout: 'side',
    doc: 'Leak test: flexible endoscope immersed in a water basin, umbilical connected by hose to a hand leak tester (bulb + pressure gauge); pressure builds then holds. anchors: basin leakTester gauge controlBody insertionTube breach · events: bubbles (a stream of bubbles rises from the breach in the sheath; gauge pressure falls)',
    anchors: ['basin', 'leakTester', 'gauge', 'controlBody', 'insertionTube', 'breach', 'bubbles'],
    events: ['bubbles'],
  },
  endoscopeReprocessor: {
    layout: 'side',
    doc: 'Automated endoscope reprocessor: cabinet with glass lid open, scope coiled in the basin, three colour-coded channel connector tubes from the basin manifold to the scope ports, control panel. anchors: machine lid basin scope connectors controlPanel · events: flush (fluid pulses along the connector tubes, basin churns, panel goes green)',
    anchors: ['machine', 'lid', 'basin', 'scope', 'connectors', 'controlPanel', 'flush'],
    events: ['flush'],
  },
  dryingCabinet: {
    layout: 'side',
    doc: 'Drying/storage cabinet with glass door and filtered fan unit; three endoscopes hang vertical and uncoiled from a rail, valves removed (empty ports). removed valves in a tray below. anchors: cabinet door scope hanger airflow valves · events: airflow (filtered air drifts down past the hanging scopes)',
    anchors: ['cabinet', 'door', 'scope', 'hanger', 'airflow', 'valves'],
    events: ['airflow'],
  },
} satisfies Record<string, PartMeta>;
