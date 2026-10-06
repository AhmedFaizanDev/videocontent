import {Composition} from 'remotion';
import {Demo} from './Demo';
import timeline from './timeline.json';

export const Root = () => (
  <Composition id="LocationCheckDemo" component={Demo} durationInFrames={timeline.frames} fps={timeline.fps} width={1920} height={1080} />
);
