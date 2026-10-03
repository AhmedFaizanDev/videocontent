import type {PartMeta} from '../catalog.ts';

export default {
  heartAnterior: {
    layout: 'side',
    doc: 'The heart in anterior view, drawn as in an anatomy atlas (shaded tissue, not a symbol): right atrium + auricle, right ventricle (most of the front), left ventricle (left border, apex), left auricle, ascending aorta and arch with its three branches, pulmonary trunk + left pulmonary artery, superior and inferior venae cavae, epicardial fat with the right coronary and anterior interventricular (LAD) arteries. Beats in sinus rhythm by default (data {state?: vf|stop|compress|rosc} opens already in that state) with blood leaving through the aorta and pulmonary trunk. anchors: aorta pulmonary svc ivc ra rv lv la apex lad rca · events (latest wins): vf (ventricular fibrillation: quivers without contracting, surface ripples, output stops) stop (motionless and dusky: no output) compress (chest compressions squeeze it ~110/min, blood pushed out with each) rosc (sinus beat and output return)',
    anchors: ['aorta', 'pulmonary', 'svc', 'ivc', 'ra', 'rv', 'lv', 'la', 'apex', 'lad', 'rca', 'vf', 'stop', 'compress', 'rosc'],
    events: ['vf', 'stop', 'compress', 'rosc'],
  },
} satisfies Record<string, PartMeta>;
