'use client';
// Service card: no fixed price and no "Add to cart" — the price depends on the options the customer chooses.
import Link from 'next/link';
import { priced, store } from '@/lib/core';
import { toggleWish } from '@/lib/actions';
import { HeartIcon, Photo } from './Icon';

export default function ProductTile({ p }) {
  const wished = store.S.wishlist.includes(p.id);
  return (
    <div className="tile">
      <div className="art photo">
        <Link href={`/product/${p.id}`} aria-label={p.name}><Photo id={p.id} alt={p.name} /></Link>
        <button className={`wish-btn ${wished ? 'on' : ''}`} onClick={() => toggleWish(p.id)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={wished}>
          <HeartIcon filled={wished} />
        </button>
      </div>
      <div className="body">
        <Link className="name" href={`/product/${p.id}`}>{p.name}</Link>
        {priced(p)
          ? <div className="muted small">From {p.minQty} {p.minQty === 1 ? 'piece' : 'pcs'}{p.days ? ` · Ready in ${p.days} working day${p.days === 1 ? '' : 's'}` : ''}</div>
          : <div className="muted small"><span className="q-badge">Price on request</span></div>}
        <Link className="add-btn" href={`/product/${p.id}`}>{priced(p) ? 'Choose options & get price' : 'Choose options & get a quote'}</Link>
      </div>
    </div>
  );
}
