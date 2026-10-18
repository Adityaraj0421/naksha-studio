import { Img } from 'remotion';
export function Card({ go, src, ...rest }) {
  return (
    <button type="button" className="card" onClick={() => go()}>
      <Img src={src} />
      <img {...rest} />
      <img src="/logo.svg" alt="" />
    </button>
  );
}
