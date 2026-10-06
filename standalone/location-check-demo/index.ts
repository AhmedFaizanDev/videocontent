// Standalone entry point: a product demo for the Location Check take-home, built on this repo's Remotion
// install, Edge TTS helper and music. It does not touch the lesson pipeline (src/).
//   node standalone/location-check-demo/voice.mts        # narration + timeline.json
//   npx remotion studio standalone/location-check-demo/index.ts
//   npx remotion render standalone/location-check-demo/index.ts LocationCheckDemo output/LocationCheck/LocationCheck_Demo.mp4
import {registerRoot} from 'remotion';
import {Root} from './Root';

registerRoot(Root);
