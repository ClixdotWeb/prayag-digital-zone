'use client';
// "Our machines" gallery. Drop real photos into public/img/machines/<id>.jpg — until then a placeholder shows.
import { useState } from 'react';

export const MACHINES = [
  { id: 'colour-press', name: 'Colour production press', desc: 'Sharp, consistent digital colour for cards, brochures and posters.' },
  { id: 'lamination', name: 'Lamination', desc: 'Gloss and matt lamination that protects and finishes your prints.' },
  { id: 'cutting', name: 'Cutting', desc: 'Precise trimming so every piece comes out exact.' },
  { id: 'digital-press', name: 'Digital printing & copying', desc: 'Fast short runs, copies and finished booklets.' },
];

function Shot({ m }) {
  const [missing, setMissing] = useState(false);
  if (missing) return (
    <div className="mc-ph" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></svg>
      <span>Photo coming soon</span>
    </div>
  );
  return <img src={`/img/machines/${m.id}.jpg`} alt={m.name} loading="lazy" onError={() => setMissing(true)} />;
}

export default function Machines({ className = '' }) {
  return (
    <section className={`mc ${className}`}>
      <div className="mc-head">
        <h2>Our machines</h2>
        <p>Every job is printed, bound and finished in our own press in Kozhikode, so quality and timing stay in our hands.</p>
      </div>
      <div className="mc-grid">
        {MACHINES.map((m) => (
          <figure className="mc-card" key={m.id}>
            <div className="mc-img"><Shot m={m} /></div>
            <figcaption><b>{m.name}</b><span>{m.desc}</span></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
