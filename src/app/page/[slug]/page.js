'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import Icon, { Photo } from '@/components/ui/Icon';
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
      <section className="ab-hero"><Photo id="hero" alt="Colour swatches for printing" />
        <div className="ab-hero-text"><div className="crumbs"><Link href="/">Home</Link> / {t}</div><h1>{t}</h1></div>
      </section>
      <section className="ab-body">
        <h2>Online printing and packaging from <span className="hl">Kozhikode</span></h2>
        <p className="lead">Order any time, track every step, delivered across India.</p>
        <ul className="ab-points">{POINTS.map(([b, s]) => <li key={b}><span className="tick"><Icon name="check" /></span><span><b>{b}</b><span className="muted"> — {s}</span></span></li>)}</ul>
        <p className="ab-contact muted">Mavoor Road, Kozhikode, Kerala 673004 · Mon–Sat 9:30 am – 7:00 pm · <a href="tel:+910000000000">+91 00000 00000</a> · <a href="mailto:hello@brd.example">hello@brd.example</a></p>
        <div className="row ab-cta"><Link className="btn btn-primary" href="/products">Browse products</Link><Link className="btn" href="/quote">Get a bulk quote</Link></div>
        {note}
      </section>
    </div>
  );
}
