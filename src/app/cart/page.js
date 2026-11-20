'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { useApp } from '@/context/StoreProvider';
import { inr, product, totals } from '@/lib/core';
import { applyCoupon, moveToCart, removeItem, saveForLater, setCartQty } from '@/lib/actions';
import { Photo } from '@/components/ui/Icon';

function Row({ it, saved }) {
  const p = product(it.pid);
  const commit = (e) => { if (+e.target.value !== it.qty) setCartQty(it.id, e.target.value); };
  return (
    <div className="card card-flat row" style={{ alignItems: 'flex-start' }}>
      <div style={{ width: 80, flex: 'none', borderRadius: 14 }} className="pd-art photo"><Photo id={p.id} alt={p.name} /></div>
      <div style={{ flex: 1, minWidth: 200 }}><strong><Link href={`/product/${it.pid}`}>{it.name}</Link></strong>
        <div className="muted small">{it.specs.join(' · ')}</div>
        <div className="small">{it.files.length ? `${it.files.length} design file(s) attached` : <span style={{ color: 'var(--warn)' }}>No design uploaded yet</span>}</div>
        <div className="row" style={{ marginTop: 6 }}>
          {saved ? <button className="btn-sm" onClick={() => moveToCart(it.id)}>Move to cart</button> : <>
            <label className="small">Qty <input key={it.qty} type="number" min={p.minQty} step={p.step} defaultValue={it.qty} style={{ width: 100 }}
              onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(e); }} /></label>
            <button className="btn-sm" onClick={() => saveForLater(it.id)}>Save for later</button></>}
          <button className="btn-sm" onClick={() => removeItem(it.id, saved)}>Remove</button>
        </div></div>
      <div style={{ fontWeight: 700 }}>{inr(it.total)}</div>
    </div>
  );
}

export default function Cart() {
  const { S } = useApp();
  const coupon = useRef(null);
  const t = totals(S.cart, S.coupon, 'standard');
  return (
    <div className="page"><h1>Your cart</h1>
      <div className="pd" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="stack">
          {S.cart.length ? S.cart.map((i) => <Row key={i.id} it={i} />) : <div className="card">Your cart is empty. <Link href="/products">Browse products</Link></div>}
          {S.saved.length > 0 && <><h2 className="mt">Saved for later</h2>{S.saved.map((i) => <Row key={i.id} it={i} saved />)}</>}
        </div>
        <div className="card price-box"><h2>Summary</h2>
          <div className="kv"><span>Products</span><span>{inr(t.sub)}</span></div>
          {t.disc > 0 && <div className="kv"><span>Coupon {t.coupon}</span><span>− {inr(t.disc)}</span></div>}
          <div className="kv"><span>GST {S.settings.gstPct}%</span><span>{inr(t.gst)}</span></div>
          <div className="kv"><span>Delivery (standard)</span><span>{t.delivery ? inr(t.delivery) : 'Free'}</span></div>
          <div className="kv total"><span>Total</span><span>{inr(t.total)}</span></div>
          <div className="row" style={{ marginTop: 12 }}><input id="couponIn" ref={coupon} placeholder="Coupon code" defaultValue={S.coupon} style={{ flex: 1 }} /><button onClick={() => applyCoupon(coupon.current.value)}>Apply</button></div>
          {t.couponMsg ? <div className="small" style={{ color: 'var(--bad)' }}>{t.couponMsg}</div> : <div className="small muted">Try WELCOME10</div>}
          <p className="small muted">Free standard delivery above {inr(S.settings.freeAbove, 0)}.</p>
          <Link className="btn btn-primary" href="/checkout" style={{ width: '100%', justifyContent: 'center' }} hidden={!S.cart.length}>Checkout</Link>
        </div>
      </div>
    </div>
  );
}
