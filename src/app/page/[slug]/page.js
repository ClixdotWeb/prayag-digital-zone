'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import Icon, { Photo } from '@/components/ui/Icon';
import Machines from '@/components/ui/Machines';
import NotFoundCard from '@/components/shop/NotFound';

const PAGES = { about: 'About us', services: 'Services', contact: 'Contact us', faq: 'FAQ', privacy: 'Privacy policy', terms: 'Terms & conditions', refund: 'Refund policy', blog: 'Blog', careers: 'Careers' };
const POINTS = [['Instant prices', 'No waiting for a quote'], ['Artwork checked', 'Approve before we print'], ['Pay securely', 'UPI, cards, net banking, wallets'], ['Live tracking', 'From printing to doorstep']];

export default function InfoPage({ params }) {
  const { slug } = use(params);
  useApp();
  const t = PAGES[slug];
  if (!t) return <NotFoundCard />;
  const note = <div className="pnote"><Icon name="pointer" /><span>This page&apos;s text is edited by the business from the admin panel, with no developer needed. <span className="muted">Placeholder content for the prototype.</span></span></div>;
  if (slug !== 'about') {
    return <div className="page"><div className="pbanner"><div className="crumbs"><Link href="/">Home</Link> / {t}</div><h1>{t}</h1></div><div className="card pcard">{note}</div></div>;
  }
  return (
    <div className="page dr-about">
      <section className="ab-hero"><Photo id="about-hero" alt="Freshly printed posters on the cutting table" />
        <div className="ab-hero-text"><div className="crumbs"><Link href="/">Home</Link> / {t}</div><h1>{t}</h1></div>
      </section>
      <section className="ab-body">
        <h2>Printing and binding from <span className="hl">Kozhikode</span></h2>
        <p className="lead">Order any time, track every step, delivered across India.</p>
        <ul className="ab-points">{POINTS.map(([b, s]) => <li key={b}><span className="tick"><Icon name="check" /></span><span><b>{b}</b><span className="muted"> — {s}</span></span></li>)}</ul>
        <p className="ab-contact muted">Prayag Digital Zone, Medical College Road, Kovoor, Kozhikode 673008, Kerala · Mon–Sat 9:30 am – 7:00 pm · <a href="tel:+918113033888">081130 33888</a> · <a href="tel:+919495222288">094952 22288</a> · <a href="mailto:hello@brd.example">hello@brd.example</a></p>
        <div className="row ab-cta"><Link className="btn btn-primary" href="/products">Browse products</Link><Link className="btn" href="/quote">Get a bulk quote</Link></div>
        {note}
      </section>
      <Machines className="ab-mc" />
    </div>
  );
}
