import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C} from './theme';
import {INTER, JBMONO} from './fonts';

// Scale a fixed-size content block to fit a box, centered.
export const Frame: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  cw: number;
  ch: number;
  children: React.ReactNode;
}> = ({x, y, w, h, cw, ch, children}) => {
  const scale = Math.min(w / cw, h / ch);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: cw,
          height: ch,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const FunctionBadge: React.FC<{label: string; accent: string}> = ({label, accent}) => (
  <span
    style={{
      fontFamily: JBMONO,
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: accent,
      background: `${accent}1F`,
      border: `1px solid ${accent}55`,
      borderRadius: 8,
      padding: '6px 14px',
    }}
  >
    {label}
  </span>
);

// Lower-third role identity, self-animating from its sequence start.
export const RoleCard: React.FC<{
  role: string;
  fn: string;
  accent: string;
  cx: number;
  cy: number;
}> = ({role, fn, accent, cx, cy}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 16, stiffness: 140, mass: 0.7}, durationInFrames: 20});
  const dx = interpolate(enter, [0, 1], [-70, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) translateX(${dx}px)`,
        opacity: enter,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: 'rgba(8,8,18,0.66)',
        border: `1px solid ${C.border}`,
        borderRadius: 999,
        padding: '14px 26px 14px 18px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{width: 14, height: 14, borderRadius: 999, background: accent, boxShadow: `0 0 16px ${accent}`}} />
      <span style={{fontFamily: INTER, fontSize: 32, fontWeight: 700, color: C.text100, letterSpacing: '-0.01em'}}>{role}</span>
      <FunctionBadge label={fn} accent={accent} />
    </div>
  );
};

// Big caption band, self-animating.
export const Caption: React.FC<{
  text: string;
  cx: number;
  top: number;
  maxWidth: number;
  accent?: string;
}> = ({text, cx, top, maxWidth, accent = C.orange500}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 9], [0, 1], {extrapolateRight: 'clamp'});
  const rise = interpolate(frame, [0, 12], [22, 0], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top,
        transform: `translate(-50%, 0) translateY(${rise}px)`,
        opacity: op,
        width: maxWidth,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontFamily: INTER,
          fontSize: 46,
          fontWeight: 600,
          lineHeight: 1.28,
          color: C.text100,
          letterSpacing: '-0.015em',
          background: 'rgba(8,8,18,0.5)',
          borderRadius: 18,
          padding: '20px 26px',
          boxShadow: `inset 0 0 0 1px ${accent}22`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
