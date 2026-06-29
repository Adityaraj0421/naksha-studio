import React from 'react';
import {AbsoluteFill, Sequence, Img, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C} from './theme';
import {INTER, JBMONO} from './fonts';
import {NakshaMark} from './NakshaMark';
import {RoleCard, Caption} from './ui';
import type {ReelProps, Spec} from './types';

// ---- timeline (30fps) ----
export const FPS = 30;
export const HOOK = 105;
export const BEFORE = 105;
export const ROLE = 120;
export const REVEAL = 120;
export const END = 120;

export const totalFrames = (spec: Spec, hasBefore: boolean) =>
  HOOK + (hasBefore ? BEFORE : 0) + ROLE * spec.scenes.length + REVEAL + END;

const layoutFor = (W: number, H: number) => {
  const landscape = W >= H;
  return landscape
    ? {landscape, pageBox: {x: 70, y: H * 0.08, w: W * 0.5, h: H * 0.84}, role: {cx: W * 0.76, cy: H * 0.36}, caption: {cx: W * 0.76, top: H * 0.46, maxW: W * 0.42}, mark: 180}
    : {landscape, pageBox: {x: 60, y: 90, w: W - 120, h: H * 0.58}, role: {cx: W / 2, cy: H * 0.70}, caption: {cx: W / 2, top: H * 0.75, maxW: W - 110}, mark: 230};
};

const Bg: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(120% 90% at 50% 12%, ${C.navy600} 0%, ${C.navy800} 70%, ${C.navy900} 100%)`}} />
);

const Watermark: React.FC = () => (
  <div style={{position: 'absolute', left: 46, top: 44, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.92}}>
    <NakshaMark size={34} />
    <span style={{fontFamily: INTER, fontSize: 22, fontWeight: 700, letterSpacing: '0.18em', color: C.text200}}>NAKSHA</span>
  </div>
);

// A rounded "device" card holding the page screenshot (object-fit contain),
// or a brand backdrop when no screenshot is available (abstract fallback).
const PageCard: React.FC<{box: {x: number; y: number; w: number; h: number}; src: string; zoom?: number; pan?: number}> = ({box, src, zoom = 1, pan = 0}) => (
  <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.navy700, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {src ? (
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${zoom}) translateY(${pan}px)`}} />
      ) : (
        <div style={{color: C.text500, fontFamily: JBMONO, fontSize: 26}}>naksha</div>
      )}
    </div>
  </div>
);

const Hook: React.FC<{spec: Spec; layout: ReturnType<typeof layoutFor>; W: number}> = ({spec, layout, W}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tIn = spring({frame: frame - 16, fps, durationInFrames: 22, config: {damping: 18}});
  const opTitle = interpolate(frame, [16, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opSub = interpolate(frame, [30, 44], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
      <div style={{transform: `translateY(${interpolate(tIn, [0, 1], [30, 0])}px)`, marginBottom: 50}}>
        <NakshaMark size={layout.mark} glow />
      </div>
      <div style={{opacity: opTitle, fontFamily: INTER, fontSize: layout.landscape ? 80 : 74, fontWeight: 800, color: C.text100, letterSpacing: '-0.03em', lineHeight: 1.08, maxWidth: W * 0.84, padding: '0 50px'}}>{spec.hookTitle}</div>
      <div style={{opacity: opSub, marginTop: 26, fontFamily: INTER, fontSize: layout.landscape ? 34 : 36, fontWeight: 500, color: C.orange300, maxWidth: W * 0.8, padding: '0 50px'}}>{spec.hookSub}</div>
    </AbsoluteFill>
  );
};

const BeforeBrief: React.FC<{spec: Spec; img: string; layout: ReturnType<typeof layoutFor>}> = ({spec, img, layout}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: op}}>
      <PageCard box={layout.pageBox} src={img} />
      <div style={{position: 'absolute', left: layout.pageBox.x + 8, top: layout.pageBox.y - 6, fontFamily: JBMONO, fontSize: 24, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', background: C.error, borderRadius: 8, padding: '7px 14px', transform: 'rotate(-3deg)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'}}>{spec.beforeTag}</div>
      <Caption text={spec.briefCaption} cx={layout.caption.cx} top={layout.caption.top} maxWidth={layout.caption.maxW} />
      {!layout.landscape ? <Watermark /> : null}
    </AbsoluteFill>
  );
};

const RoleScene: React.FC<{scene: Spec['scenes'][number]; img: string; layout: ReturnType<typeof layoutFor>}> = ({scene, img, layout}) => {
  const frame = useCurrentFrame();
  // gentle Ken Burns on the page so the static screenshot has life
  const zoom = interpolate(frame, [0, ROLE], [1.02, 1.07], {extrapolateRight: 'clamp'});
  const pan = interpolate(frame, [0, ROLE], [10, -10], {extrapolateRight: 'clamp'});
  const ringOp = interpolate(frame, [6, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <PageCard box={layout.pageBox} src={img} zoom={zoom} pan={pan} />
      {/* accent edge glow keyed to the active role */}
      <div style={{position: 'absolute', left: layout.pageBox.x, top: layout.pageBox.y, width: layout.pageBox.w, height: layout.pageBox.h, borderRadius: 22, boxShadow: `inset 0 0 0 3px ${scene.accent}, 0 0 50px ${scene.accent}55`, opacity: ringOp, pointerEvents: 'none'}} />
      <RoleCard role={scene.role} fn={scene.fn} accent={scene.accent} cx={layout.role.cx} cy={layout.role.cy} />
      <Caption text={scene.caption} cx={layout.caption.cx} top={layout.caption.top} maxWidth={layout.caption.maxW} accent={scene.accent} />
      {!layout.landscape ? <Watermark /> : null}
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{spec: Spec; before: string; after: string; layout: ReturnType<typeof layoutFor>}> = ({spec, before, after, layout}) => {
  const frame = useCurrentFrame();
  const hasBefore = !!before;
  const p = interpolate(frame, [12, 78], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const settle = spring({frame, fps: FPS, durationInFrames: 40, config: {damping: 16}});
  return (
    <AbsoluteFill>
      {hasBefore ? (
        <>
          <PageCard box={layout.pageBox} src={before} />
          <div style={{position: 'absolute', left: layout.pageBox.x, top: layout.pageBox.y, width: layout.pageBox.w, height: layout.pageBox.h, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}}>
            <PageCard box={{x: 0, y: 0, w: layout.pageBox.w, h: layout.pageBox.h}} src={after} />
          </div>
          <div style={{position: 'absolute', left: layout.pageBox.x + layout.pageBox.w * p, top: layout.pageBox.y, width: 5, height: layout.pageBox.h, background: '#fff', boxShadow: '0 0 26px #fff', transform: 'translateX(-2px)'}} />
          <div style={{position: 'absolute', left: layout.pageBox.x + 12, top: layout.pageBox.y + 12, fontFamily: JBMONO, fontSize: 20, fontWeight: 700, color: '#111', background: '#fff', borderRadius: 6, padding: '5px 11px', opacity: 1 - p}}>BEFORE</div>
          <div style={{position: 'absolute', left: layout.pageBox.x + layout.pageBox.w - 96, top: layout.pageBox.y + 12, fontFamily: JBMONO, fontSize: 20, fontWeight: 700, color: '#fff', background: C.orange500, borderRadius: 6, padding: '5px 11px', opacity: p}}>AFTER</div>
        </>
      ) : (
        <PageCard box={layout.pageBox} src={after} zoom={interpolate(settle, [0, 1], [1.08, 1.0])} />
      )}
      <Caption text={spec.revealCaption} cx={layout.caption.cx} top={layout.caption.top} maxWidth={layout.caption.maxW} />
      {!layout.landscape ? <Watermark /> : null}
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{spec: Spec; layout: ReturnType<typeof layoutFor>; W: number}> = ({spec, layout, W}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - 6, fps, durationInFrames: 24, config: {damping: 18}});
  const opH = interpolate(frame, [18, 32], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opCmd = interpolate(frame, [34, 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cmdPulse = 1 + 0.015 * Math.sin(frame * 0.18);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
      <div style={{transform: `scale(${interpolate(enter, [0, 1], [0.86, 1])})`, opacity: enter, marginBottom: 34}}>
        <NakshaMark size={layout.landscape ? 140 : 170} glow />
      </div>
      <div style={{opacity: enter, fontFamily: INTER, fontSize: 30, fontWeight: 700, letterSpacing: '0.2em', color: C.text200, marginBottom: 40}}>NAKSHA</div>
      <div style={{opacity: opH, fontFamily: INTER, fontSize: layout.landscape ? 70 : 72, fontWeight: 800, color: C.text100, letterSpacing: '-0.03em', maxWidth: W * 0.82, lineHeight: 1.1, padding: '0 40px'}}>{spec.endHeadline}</div>
      <div style={{opacity: opH, fontFamily: INTER, fontSize: 32, color: C.text300, marginTop: 22, maxWidth: W * 0.78, padding: '0 40px'}}>{spec.endSub}</div>
      <div style={{opacity: opCmd, transform: `scale(${cmdPulse})`, marginTop: 44, fontFamily: JBMONO, fontSize: layout.landscape ? 44 : 52, fontWeight: 700, color: '#fff', background: C.orange500, borderRadius: 14, padding: '18px 34px', boxShadow: `0 0 50px ${C.orange500}66`}}>{spec.endCommand}</div>
      <div style={{opacity: opCmd, marginTop: 30, fontFamily: INTER, fontSize: 22, color: C.text500, letterSpacing: '0.04em'}}>produced by naksha · a re-enactment</div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = ({spec, beforeImage, afterImage}) => {
  const {width: W, height: H} = useVideoConfig();
  const layout = layoutFor(W, H);
  const hasBefore = !!beforeImage;
  const seqs: React.ReactNode[] = [];
  let at = 0;
  seqs.push(<Sequence key="hook" from={at} durationInFrames={HOOK}><Hook spec={spec} layout={layout} W={W} /></Sequence>);
  at += HOOK;
  if (hasBefore) {
    seqs.push(<Sequence key="before" from={at} durationInFrames={BEFORE}><BeforeBrief spec={spec} img={beforeImage} layout={layout} /></Sequence>);
    at += BEFORE;
  }
  spec.scenes.forEach((scene, i) => {
    seqs.push(<Sequence key={'role' + i} from={at} durationInFrames={ROLE}><RoleScene scene={scene} img={afterImage} layout={layout} /></Sequence>);
    at += ROLE;
  });
  seqs.push(<Sequence key="reveal" from={at} durationInFrames={REVEAL}><Reveal spec={spec} before={beforeImage} after={afterImage} layout={layout} /></Sequence>);
  at += REVEAL;
  seqs.push(<Sequence key="end" from={at} durationInFrames={END}><EndCard spec={spec} layout={layout} W={W} /></Sequence>);
  return (
    <AbsoluteFill style={{backgroundColor: C.navy600}}>
      <Bg />
      {seqs}
    </AbsoluteFill>
  );
};
