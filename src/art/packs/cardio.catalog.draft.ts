import type {PartMeta} from '../catalog.ts';

export default {
  heartSection: {
    layout: 'side',
    doc: 'The heart in frontal section, drawn as a textbook ink plate (house style): cut myocardium (LV wall thicker), four chambers opened, tricuspid and mitral valves with chordae tendineae and papillary muscles, interventricular septum, SVC/IVC, aortic arch + 3 branches, pulmonary trunk and arteries, pulmonary veins. Beats gently by default (AV valves close in systole). anchors: svc ivc aorta pt lpa rpa pv ra rv la lv septum tricuspid mitral apex sa av wall · events: flowRight (inked arrows: deoxygenated blood through the right heart to the lungs) flowLeft (oxygenated blood through the left heart to the aorta) conduction (impulse SA node → AV node → bundle of His → branches) ra rv la lv (that chamber picked out) vf (ventricles quiver, no flow) stop (motionless) compress (squeezed ~110/min) rosc (beat returns). data {state?: vf|stop|compress|rosc, still?: true}',
    anchors: ['svc', 'ivc', 'aorta', 'pt', 'lpa', 'rpa', 'pv', 'ra', 'rv', 'la', 'lv', 'septum', 'tricuspid', 'mitral', 'apex', 'sa', 'av', 'wall', 'flowRight', 'flowLeft', 'conduction', 'vf', 'stop', 'compress', 'rosc'],
    events: ['flowRight', 'flowLeft', 'conduction', 'ra', 'rv', 'la', 'lv', 'vf', 'stop', 'compress', 'rosc'],
  },
} satisfies Record<string, PartMeta>;
