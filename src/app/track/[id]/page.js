'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { fmtDate, inr } from '@/lib/core';
import { approveDesign, payBalance, reorder } from '@/lib/actions';
import { StatusPill, Timeline } from '@/components/ui/Status';
import { ItemFiles } from '@/components/ui/Files';
import NotFoundCard from '@/components/shop/NotFound';

export default function Track({ params }) {
  const { id } = use(params);
  const { S } = useApp();
  const o = S.orders.find((x) => x.id === id);
  if (!o) return <NotFoundCard />;
  const due = o.totals.total - o.paid;
  return (
    <div className="page"><div className="crumbs"><Link href="/account">My account</Link> / {o.id}</div>
      <div className="row between"><h1>Order {o.id}</h1><StatusPill o={o} /></div>
      {o.status === 2 && !o.cancelled && (
        <div className="notice warn" style={{ marginBottom: 16 }}><strong>Your design is ready for approval.</strong> We&apos;ve checked your artwork. Please review the files below and approve so we can start printing.
          <div className="row" style={{ marginTop: 8 }}><button className="btn-primary" onClick={() => approveDesign(o.id)}>Approve design</button><span className="muted small">Need a change? Replace the file below.</span></div></div>
      )}
      {due > 0.009 && !o.cancelled && <div className="notice warn" style={{ marginBottom: 16 }}>Balance due: <strong>{inr(due)}</strong> <button className="btn-primary btn-sm" onClick={() => payBalance(o.id)}>Pay balance</button></div>}
      <div className="pd">
        <div className="card"><h2>Tracking</h2>{o.cancelled && <p className="st bad">This order was cancelled</p>}<Timeline o={o} />
          {o.tracking && <p><strong>{o.courier}</strong> · Tracking no. {o.tracking}</p>}
          <p className="muted small">Expected ready by {fmtDate(o.due)}</p></div>
        <div className="stack">
          {o.items.map((it, idx) => (
            <div className="card" key={it.id}><div className="row between"><strong>{it.name} × {it.qty}</strong><span>{inr(it.total)}</span></div>
              <div className="muted small">{it.specs.join(' · ')}</div><h3 style={{ marginTop: 12 }}>Design files</h3><ItemFiles o={o} it={it} idx={idx} mode="customer" /></div>
          ))}
          <div className="card"><div className="kv"><span>Total (incl. GST & delivery)</span><strong>{inr(o.totals.total)}</strong></div><div className="kv"><span>Paid</span><span>{inr(o.paid)}</span></div>
            <div className="row" style={{ marginTop: 10 }}><Link className="btn" href={`/invoice/${o.id}`}>Invoice</Link><button onClick={() => reorder(o.id)}>Reorder</button><Link className="btn" href={`/account/support?order=${o.id}`}>Get help</Link></div></div>
        </div>
      </div>
    </div>
  );
}
