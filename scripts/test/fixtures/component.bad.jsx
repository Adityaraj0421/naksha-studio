export function Card({ go, a, b }) {
  return (
    <div className="card" onClick={() => a > b && go()}>
      <img src="/hero.png" />
    </div>
  );
}
