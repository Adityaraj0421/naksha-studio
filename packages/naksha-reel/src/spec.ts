import type {Spec} from './types';

// Default spec — used for the Remotion studio preview (no screenshots).
// At render time, bin/render.mjs overrides this with the live, normalized spec.
export const DEFAULT_SPEC: Spec = {
  hookTitle: '26 specialists. One screen.',
  hookSub: 'Not one AI voice — watch the whole design team work.',
  beforeTag: 'BEFORE',
  briefCaption: 'What your dev shipped, before the team got to it.',
  scenes: [
    {role: 'Creative Director', fn: 'Vision', accent: '#E8633A', caption: 'This screen has no hero — I make the one thing that matters impossible to miss.'},
    {role: 'UX Designer', fn: 'Flows', accent: '#4B96F3', caption: 'I cut the path to the action so nothing stands between intent and done.'},
    {role: 'UI Designer', fn: 'Visual', accent: '#F47240', caption: 'Real type scale, real spacing — the eye lands where it should, not everywhere.'},
    {role: 'Design System Lead', fn: 'Tokens', accent: '#3ECF8E', caption: 'Every color and gap snaps to a token on the 8px grid — one source of truth.'},
    {role: 'Content Designer', fn: 'Copy', accent: '#F5A623', caption: 'I rewrite the labels so every click is honest about what it does.'},
  ],
  revealCaption: 'Same screen. The whole team later.',
  endHeadline: 'Your turn to run the team.',
  endSub: '26 roles redesign your screen, live. One command.',
  endCommand: '/design-reel',
};
