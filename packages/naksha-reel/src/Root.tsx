import React from 'react';
import {Composition} from 'remotion';
import {Reel, FPS, totalFrames} from './Reel';
import {DEFAULT_SPEC} from './spec';
import type {ReelProps} from './types';

const calc = ({props}: {props: ReelProps}) => ({
  durationInFrames: totalFrames(props.spec, !!props.beforeImage),
});

const defaults: ReelProps = {spec: DEFAULT_SPEC, beforeImage: '', afterImage: ''};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Reel9x16" component={Reel} fps={FPS} width={1080} height={1920} defaultProps={defaults} calculateMetadata={calc} />
    <Composition id="Reel16x9" component={Reel} fps={FPS} width={1920} height={1080} defaultProps={defaults} calculateMetadata={calc} />
  </>
);
