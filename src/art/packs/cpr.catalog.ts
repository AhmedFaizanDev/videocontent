import type {PartMeta} from '../catalog.ts';

export default {
  cpr: {
    doc: 'Chest compressions, side view: patient lying flat (head left, eyes closed), rescuer\'s straight arms from above with interlocked hands on the centre of the chest. Still by default. anchors: hands chest sternum heart compress stop · events: compress (rhythmic push and full recoil about every 16 frames ≈ 110/min, depth arrow, red heart pulse on each push) stop (compressions cease, hands rest)',
    anchors: ['hands', 'chest', 'sternum', 'heart', 'compress', 'stop'],
    events: ['compress', 'stop'],
  },
  timer: {
    doc: 'Stopwatch countdown ring with digits 3:00 in the centre (digits only). anchors: ring digits start stop · events: start (real-time countdown, 30 frames = 1 s, arc shrinks, colour teal → amber → red) stop (freezes, ring turns green). data {secs?: start seconds, default 180}',
    anchors: ['ring', 'digits', 'start', 'stop'],
    events: ['start', 'stop'],
    data: {secs: 'number — starting seconds, default 180'},
  },
} satisfies Record<string, PartMeta>;
