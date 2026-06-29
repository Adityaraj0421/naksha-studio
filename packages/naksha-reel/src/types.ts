// Reel spec — what the composition renders. Produced by bin/render.mjs from
// the (normalized) beats the /design-reel extraction pass returns.
export type Scene = {
  role: string;   // canonical role name
  fn: string;     // canonical one-word function (Vision|Flows|Visual|Tokens|Copy|Research|Motion|Strategy)
  accent: string; // hex, fixed per role
  caption: string;
};

export type Spec = {
  hookTitle: string;
  hookSub: string;
  beforeTag: string;
  briefCaption: string;
  scenes: Scene[];
  revealCaption: string;
  endHeadline: string;
  endSub: string;
  endCommand: string;
};

export type ReelProps = {
  spec: Spec;
  // data URIs (or empty). beforeImage present => redesign wipe; absent => create/after-only.
  beforeImage: string;
  afterImage: string;
};
