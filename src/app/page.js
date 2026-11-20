'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { useApp } from '@/context/StoreProvider';
import { allProducts } from '@/lib/core';
import Icon, { Photo } from '@/components/ui/Icon';
import ProductTile from '@/components/ui/ProductTile';

const FAQS = [
  ['What file formats do you accept?', 'PDF, AI, PSD, CDR, SVG, PNG, JPG and TIFF, up to 100 MB each. A print-ready PDF at 300 DPI with 3 mm bleed gives the best result.'],
  ['Will someone check my artwork before printing?', 'Yes. Our team checks every file, and nothing is printed until you approve the design.'],
  ['How long does delivery take?', 'Production time is shown on every product. Standard courier adds 2–4 days within Kerala. Express and store pickup are also available.'],
  ['Can I get a GST invoice?', 'Yes. A GST invoice is generated automatically after payment and you can download it from your account.'],
];
const USP = [['tag', 'Instant prices', 'No waiting for a quote'], ['check', 'Artwork checked', 'Approve before we print'],
  ['shield', 'Pay securely', 'UPI, cards, net banking, wallets'], ['truck', 'Live tracking', 'From printing to doorstep']];
const TESTI = [
  ['“Ordered 1,000 visiting cards at night and they were at the shop in three days. The velvet lamination feels premium.”', 'Restaurant owner, Kozhikode', '#e31e24'],
  ['“The proof approval step saved us from a typo on 5,000 labels.”', 'Ayurveda brand, Malappuram', '#18a06a'],
];
const Chevron = ({ left }) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={left ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>;

export default function Home() {
  const { S } = useApp();
  const st = S.settings;
  const popular = allProducts().filter((p) => p.popular);
  const car = useRef(null);
  const scroll = (d) => car.current?.scrollBy({ left: d * car.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <>
      {/* Hero: centred headline + pill buttons, product cards fanned along the bottom */}
      <section className="dr-hero">
        <div className="wrap dr-copy">
          <h1>{(() => { const i = st.heroTitle.indexOf('. '); return i > -1 ? <>{st.heroTitle.slice(0, i + 1)}<br />{st.heroTitle.slice(i + 2)}</> : st.heroTitle; })()}</h1>
          <p className="lead">{st.heroText}</p>
          <div className="dr-btns">
            <Link className="dr-pill dr-dark" href="/products">Browse products</Link>
            <Link className="dr-pill dr-light" href="/quote">Get a bulk quote</Link>
          </div>
        </div>
        <div className="dr-fan">
          {allProducts().slice(0, 7).map((p, i) => (
            <Link key={p.id} href={`/product/${p.id}`} className={`dr-card dr-c${i}`} aria-label={p.name}><Photo id={p.id} alt={p.name} /></Link>
          ))}
        </div>
      </section>


      {/* The four promises */}
      <section className="wrap sx-usp">
        {USP.map(([i, b, s]) => <div key={b}><span className="sx-usp-ico"><Icon name={i} /></span><span><b>{b}</b><span>{s}</span></span></div>)}
      </section>

      {/* Popular products carousel (styled to match the hero) */}
      <section className="wrap sx-sec dr-pop">
        <div className="dr-pop-head">
          <h2>Popular products</h2>
          <div className="dr-pop-ctl">
            <Link className="dr-pop-all" href="/products">View all</Link>
            <button className="dr-round" type="button" aria-label="Previous" onClick={() => scroll(-1)}><Chevron left /></button>
            <button className="dr-round" type="button" aria-label="Next" onClick={() => scroll(1)}><Chevron /></button>
          </div>
        </div>
        <div className="sx-car" ref={car}>{popular.map((p) => <ProductTile key={p.id} p={p} />)}</div>
      </section>

      {/* Mosaic: testimonials + contact tile */}
      <section className="wrap sx-sec dr-testi">
        <div className="dr-pop-head"><h2>What customers say</h2></div>
        <div className="sx-mosaic">
          {TESTI.map(([q, who, c]) => (
            <div className="sx-quote" key={who}><div className="stars">★★★★★</div><p>{q}</p>
              <div className="who"><span className="av" style={{ background: c }}>{who[0]}</span><span>— {who}</span></div></div>
          ))}
          <div className="sx-tile-big">
            <Photo id="hero" alt="" />
            <div className="sx-tile-lbl">
              <h3>Visit or call us</h3>
              <p>BRD, Mavoor Road, Kozhikode, Kerala · Mon–Sat 9:30–7:00 · +91 00000 00000 · hello@brd.example</p>
              <a className="btn sx-btn-y" href="https://wa.me/910000000000" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="wrap sx-sec sx-faq dr-faq">
        <div className="dr-faq-head"><h2>FAQ</h2></div>
        <div className="faq-list">{FAQS.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>
    </>
  );
}
