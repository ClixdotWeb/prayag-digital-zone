'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '@/context/StoreProvider';
import { inr, round2, totals } from '@/lib/core';
import { session } from '@/lib/session';
import { setCheckoutMethod, submitCheckout } from '@/lib/actions';

function Address({ pfx, v = {}, required = true }) {
  return <>
    <label className="field">Address<textarea name={`${pfx}address`} required={required} defaultValue={v.address || ''} /></label>
    <div className="row"><label className="field" style={{ flex: 1 }}>City<input name={`${pfx}city`} required={required} defaultValue={v.city || ''} /></label>
      <label className="field" style={{ flex: 1 }}>State<input name={`${pfx}state`} required={required} defaultValue={v.state || 'Kerala'} /></label>
      <label className="field" style={{ flex: 1 }}>PIN code<input name={`${pfx}pin`} required={required} pattern="[0-9]{6}" defaultValue={v.pin || ''} /></label></div>
  </>;
}

export default function Checkout() {
  const { S } = useApp();
  const [same, setSame] = useState(true);
  if (!S.cart.length) return <div className="page"><div className="card">Your cart is empty. <Link href="/products">Browse products</Link></div></div>;
  const u = S.user || {};
  const method = session.checkoutMethod;
  const t = totals(S.cart, S.coupon, method);
  const st = S.settings;
  const methods = [['standard', `Standard courier (2–4 days after printing) — ${t.taxable >= st.freeAbove ? 'Free' : inr(st.standardFee, 0)}`],
    ['express', `Express courier (next day after printing) — ${inr(st.expressFee, 0)}`], ['pickup', 'Pick up from our store — Free']];
  return (
    <div className="page"><h1>Checkout</h1>
      <form id="checkoutForm" className="pd" style={{ gridTemplateColumns: '1.6fr 1fr' }} onSubmit={(e) => { e.preventDefault(); submitCheckout(Object.fromEntries(new FormData(e.currentTarget))); }}>
        <div className="stack">
          <div className="card stack"><h2>Contact</h2>
            <div className="row"><label className="field" style={{ flex: 1 }}>Full name / company<input name="name" required defaultValue={u.name || ''} /></label>
              <label className="field" style={{ flex: 1 }}>Mobile<input name="phone" required defaultValue={u.phone || ''} /></label></div>
            <label className="field">Email<input name="email" type="email" required defaultValue={u.email || ''} /></label>
            <label className="field">GSTIN (optional, for business invoice)<input name="gstin" placeholder="32XXXXX0000X1Z5" /></label>
          </div>
          <div className="card stack"><h2>Billing address</h2><Address pfx="b_" v={u} /></div>
          <div className="card stack"><h2>Delivery</h2>
            <label className="check"><input type="checkbox" name="same" checked={same} onChange={(e) => setSame(e.target.checked)} /> Deliver to billing address</label>
            <div id="shipAddr" className={`stack${same ? ' hidden' : ''}`}><Address pfx="s_" required={!same} /></div>
            <div className="stack">
              {methods.map(([v, l]) => <label key={v} className="check"><input type="radio" name="method" value={v} checked={method === v} onChange={() => setCheckoutMethod(v)} /> {l}</label>)}
            </div>
            <label className="field">Order notes<textarea name="notes" placeholder="Anything we should know about this job" /></label>
          </div>
        </div>
        <div className="card price-box"><h2>Order summary</h2>
          {S.cart.map((i) => <div className="kv" key={i.id}><span>{i.name} × {i.qty}</span><span>{inr(i.total)}</span></div>)}
          {t.disc > 0 && <div className="kv"><span>Coupon {t.coupon}</span><span>− {inr(t.disc)}</span></div>}
          <div className="kv"><span>GST {st.gstPct}%</span><span>{inr(t.gst)}</span></div>
          <div className="kv"><span>Delivery</span><span>{t.delivery ? inr(t.delivery) : 'Free'}</span></div>
          <div className="kv total"><span>Total</span><span>{inr(t.total)}</span></div>
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" name="part" /> Pay {st.advancePct}% advance now ({inr(round2((t.total * st.advancePct) / 100))}), balance before dispatch</label>
          <button className="btn-accent" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>Pay securely</button>
          <p className="small muted">UPI, cards, net banking and wallets through Razorpay. Card details are never stored on this website.</p>
        </div>
      </form>
    </div>
  );
}
