'use client';
// Service card: no fixed price and no "Add to cart" — the price depends on the options the customer chooses.
import Link from 'next/link';
import { store } from '@/lib/core';
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
        <div className="muted small">From {p.minQty} pcs · Ready in {p.days} working days</div>
        <Link className="add-btn" href={`/product/${p.id}`}>Choose options &amp; get price</Link>
      </div>
    </div>
  );
}
