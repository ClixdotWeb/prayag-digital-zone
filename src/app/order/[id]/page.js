'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { inr } from '@/lib/core';
import NotFoundCard from '@/components/shop/NotFound';

export default function OrderDone({ params }) {
  const { id } = use(params);
  const { S } = useApp();
  const o = S.orders.find((x) => x.id === id);
  if (!o) return <NotFoundCard />;
  return (
    <div className="page"><div className="card" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 44, color: 'var(--ok)' }}>✓</div><h1>Thank you! Order {o.id} is confirmed</h1>
      <p>We received {inr(o.paid)}{o.paid < o.totals.total ? ` (advance). Balance ${inr(o.totals.total - o.paid)} is due before dispatch` : ''}. A confirmation and invoice have been sent by email, SMS and WhatsApp.</p>
      <p className="muted">Next: our team checks your artwork and asks you to approve it before printing.</p>
      <div className="row" style={{ justifyContent: 'center' }}><Link className="btn btn-primary" href={`/track/${o.id}`}>Track order</Link><Link className="btn" href={`/invoice/${o.id}`}>View invoice</Link><Link className="btn" href="/products">Continue shopping</Link></div>
    </div></div>
  );
}
