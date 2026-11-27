'use client';
// Cart drawer, modal (simulated Razorpay / shipping label) and toasts — same markup as the prototype.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/context/StoreProvider';
import { inr, onToast, product, totals, toast } from '@/lib/core';
import { session, closeCart, closeModal } from '@/lib/session';
import { drawerRemove } from '@/lib/actions';
import Icon, { Photo } from './Icon';

export function CartDrawer() {
  const { S, ready } = useApp();
  const { open, justAdded } = session.cart;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) { const r = requestAnimationFrame(() => setShown(true)); document.body.classList.add('cd-lock'); return () => cancelAnimationFrame(r); }
    setShown(false); document.body.classList.remove('cd-lock');
  }, [open]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') closeCart(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  if (!ready) return null;
  const t = totals(S.cart, S.coupon, 'standard');
  const items = S.cart.slice().reverse();
  return (
    <div id="cartDrawer" className={`cd-wrap ${shown ? 'open' : ''}`}>
      <div className="cd-backdrop" onClick={closeCart} />
      <aside className="cd" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="cd-head">
          <h2>Your cart <span className="muted">({S.cart.length})</span></h2>
          <button className="cd-x" onClick={closeCart} aria-label="Close cart">×</button>
        </div>
        {justAdded && items.length > 0 && <div className="cd-added"><Icon name="check" /> Added to cart</div>}
        <div className="cd-body">
          {items.length ? items.map((it) => {
            const p = product(it.pid);
            return (
              <div className="cd-item" key={it.id}>
                <div className="cd-img">{p ? <Photo id={p.id} alt={it.name} /> : it.kind === 'print' && <span className="pr-cart-ico">{it.print.options.type === 'bw' ? 'B&W' : it.print.options.size}</span>}</div>
                <div className="cd-info">
                  <div className="cd-name">{it.name}</div>
                  <div className="cd-spec">{it.qty} {it.kind === 'print' ? 'prints' : 'pcs'} · {it.specs.slice(0, 2).map((x) => x.split(': ').pop()).join(' · ')}</div>
                  <b className="cd-price">{inr(it.total)}</b>
                </div>
                <button className="cd-rm" onClick={() => drawerRemove(it.id)} aria-label={`Remove ${it.name}`}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                </button>
              </div>
            );
          }) : <div className="cd-empty"><p>Your cart is empty.</p><Link className="btn btn-primary" href="/products" onClick={closeCart}>Browse products</Link></div>}
        </div>
        {items.length > 0 && (
          <div className="cd-foot">
            <div className="kv"><span>Subtotal</span><b>{inr(t.sub)}</b></div>
            <div className="muted small">GST and delivery are added at checkout.</div>
            <div className="cd-btns"><Link className="btn cd-btn" href="/cart" onClick={closeCart}>View cart</Link><Link className="btn btn-primary cd-btn" href="/checkout" onClick={closeCart}>Checkout</Link></div>
          </div>
        )}
      </aside>
    </div>
  );
}

function PayBox({ m }) {
  const { S } = useApp();
  const [method, setMethod] = useState('UPI');
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-box" role="dialog" aria-label="Payment">
      <div className="rzp-head"><div className="small" style={{ opacity: 0.8 }}>{S.settings.company} · {m.label}</div><div className="amt">{inr(m.amount)}</div>
        <div className="small" style={{ opacity: 0.7 }}>Razorpay test mode (simulated)</div></div>
      <div className="rzp-body" id="payBody">
        {busy ? <><div className="spinner" /><p style={{ textAlign: 'center' }}>Processing payment…</p></> : <>
          {['UPI', 'Card', 'Net banking', 'Wallet'].map((x) => (
            <label key={x} className={`pay-method ${method === x ? 'on' : ''}`}><input type="radio" name="pm" value={x} checked={method === x} onChange={() => setMethod(x)} /> {x}</label>
          ))}
          <div className="small muted" style={{ margin: '8px 0 14px' }}>{m.who?.phone || ''} · {m.who?.email || ''}</div>
          <div className="row">
            <button className="btn-primary" id="payGo" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setBusy(true); setTimeout(() => { closeModal(); m.onSuccess(method); }, 1200); }}>Pay {inr(m.amount)}</button>
            <button id="payCancel" onClick={() => { closeModal(); toast('Payment cancelled', 'Your order has not been placed'); }}>Cancel</button>
          </div>
        </>}
      </div>
    </div>
  );
}

function LabelBox({ orderId }) {
  const { S } = useApp();
  const o = S.orders.find((x) => x.id === orderId);
  const sh = o.shipping || o.customer;
  return (
    <div className="modal-box" style={{ padding: 20 }}>
      <div style={{ border: '2px dashed var(--ink)', padding: 16, fontFamily: 'monospace' }}>
        <strong>FROM:</strong> {S.settings.company}, Medical College Road, Kovoor, Kozhikode 673008 · Ph: 081130 33888<br /><br />
        <strong>TO:</strong> {o.customer.name}<br />{sh.address || ''}<br />{sh.city || ''}, {sh.state || ''} {sh.pin || ''}<br />Ph: {o.customer.phone}<br /><br />
        <strong>ORDER:</strong> {o.id} · {o.items.length} item(s)
      </div>
      <div className="row" style={{ marginTop: 12 }}><button className="btn-primary" onClick={() => window.print()}>Print</button><button onClick={closeModal}>Close</button></div>
    </div>
  );
}

export function Modal() {
  useApp();
  const m = session.modal;
  return (
    <div id="modal" className="modal" hidden={!m} onClick={(e) => { if (e.target.id === 'modal') closeModal(); }}>
      {m?.type === 'pay' && <PayBox key={m.label + m.amount} m={m} />}
      {m?.type === 'label' && <LabelBox orderId={m.orderId} />}
    </div>
  );
}

export function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => onToast((t) => {
    setList((l) => [...l, t]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 4200);
  }), []);
  return <div id="toasts" className="toasts" aria-live="polite">{list.map((t) => <div key={t.id} className="toast">{t.text}{t.sub && <small>{t.sub}</small>}</div>)}</div>;
}
