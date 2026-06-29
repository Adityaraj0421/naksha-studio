import React from 'react';
import {useCurrentFrame, spring, useVideoConfig} from 'remotion';
import {C} from './theme';

// 3x3 bindu grid. Grid coords (col,row) 0..2.
// corners = full orange, edges = ghost, center = bindu (semi).
const DOTS: {x: number; y: number; o: number; order: number}[] = [
  {x: 0, y: 0, o: 1, order: 0},
  {x: 2, y: 0, o: 1, order: 1},
  {x: 0, y: 2, o: 1, order: 2},
  {x: 2, y: 2, o: 1, order: 3},
  {x: 1, y: 0, o: 0.12, order: 4},
  {x: 0, y: 1, o: 0.12, order: 5},
  {x: 2, y: 1, o: 0.12, order: 6},
  {x: 1, y: 2, o: 0.12, order: 7},
  {x: 1, y: 1, o: 0.45, order: 8},
];

export const NakshaMark: React.FC<{
  size: number;
  startFrame?: number;
  glow?: boolean;
}> = ({size, startFrame = 0, glow = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = size / 3;
  const r = unit * 0.42;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{filter: glow ? `drop-shadow(0 0 ${size * 0.18}px rgba(232,99,58,0.55))` : 'none'}}
    >
      {DOTS.map((d, i) => {
        const appear = spring({
          frame: frame - startFrame - d.order * 3,
          fps,
          config: {damping: 12, stiffness: 180, mass: 0.6},
          durationInFrames: 22,
        });
        const cx = unit / 2 + d.x * unit;
        const cy = unit / 2 + d.y * unit;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r * appear}
            fill={C.orange500}
            fillOpacity={d.o}
          />
        );
      })}
    </svg>
  );
};
