'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { fmtDate, inr, sum } from '@/lib/core';
import NotFoundCard from '@/components/shop/NotFound';

export default function Invoice({ params }) {
  const { id } = use(params);
  const { S } = useApp();
  const o = S.orders.find((x) => x.id === id);
  if (!o) return <NotFoundCard />;
  const st = S.settings, t = o.totals;
  const intra = (o.shipping?.state || o.customer.state || 'Kerala').toLowerCase() === 'kerala';
  return (
    <div className="page"><div className="row no-print" style={{ marginBottom: 12 }}><button onClick={() => window.print()}>Print / Save PDF</button><Link className="btn" href={`/track/${o.id}`}>Back to order</Link></div>
      <div className="invoice">
        <div className="row between"><div><h2 style={{ margin: 0 }}>{st.company}</h2><div className="small">Mavoor Road, Kozhikode, Kerala 673004<br />GSTIN {st.gstin}</div></div>
          <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0 }}>TAX INVOICE</h2><div className="small">INV-{o.id.slice(3)} · {fmtDate(o.createdAt)}<br />Order {o.id}</div></div></div>
        <hr /><div className="small"><strong>Bill to:</strong> {o.customer.name}{o.customer.gstin ? ` · GSTIN ${o.customer.gstin}` : ''}<br />{o.customer.address || ''}, {o.customer.city || ''}, {o.customer.state || ''} {o.customer.pin || ''}<br />{o.customer.phone} · {o.customer.email}</div>
        <table style={{ marginTop: 16 }}><thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead><tbody>
          {o.items.map((i) => <tr key={i.id}><td>{i.name}<div className="small" style={{ color: '#666' }}>{i.specs.join(' · ')}</div></td><td className="num">{i.qty}</td>
            <td className="num">{inr(i.per)}{i.flat ? <div className="small">+ setup {inr(i.flat)}</div> : null}</td><td className="num">{inr(i.total)}</td></tr>)}
        </tbody></table>
        <div style={{ maxWidth: 320, marginLeft: 'auto', marginTop: 10 }}>
          <div className="kv"><span>Subtotal</span><span>{inr(t.sub)}</span></div>
          {t.disc > 0 && <div className="kv"><span>Discount ({t.coupon})</span><span>− {inr(t.disc)}</span></div>}
          {intra ? <><div className="kv"><span>CGST {st.gstPct / 2}%</span><span>{inr(t.gst / 2)}</span></div><div className="kv"><span>SGST {st.gstPct / 2}%</span><span>{inr(t.gst / 2)}</span></div></>
            : <div className="kv"><span>IGST {st.gstPct}%</span><span>{inr(t.gst)}</span></div>}
          <div className="kv"><span>Delivery</span><span>{inr(t.delivery)}</span></div>
          <div className="kv total"><span>Total</span><span>{inr(t.total)}</span></div>
          <div className="kv"><span>Paid</span><span>{inr(o.paid)}</span></div>
          {o.refunds.length > 0 && <div className="kv"><span>Refunded</span><span>{inr(sum(o.refunds, (r) => r.amount))}</span></div>}
        </div>
        <p className="small" style={{ color: '#666', marginTop: 24 }}>This is a computer-generated invoice from the prototype. HSN/SAC codes per product will be added in the live system.</p>
      </div>
    </div>
  );
}
