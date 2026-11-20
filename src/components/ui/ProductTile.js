'use client';
import Link from 'next/link';
import { inr, startPrice, store } from '@/lib/core';
import { quickAdd, toggleWish } from '@/lib/actions';
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
        <div className="price">{inr(startPrice(p), 0)}</div>
        <div className="muted small">{p.minQty} pcs from · Ready in {p.days} working days</div>
        <button className="add-btn" onClick={() => quickAdd(p.id)}>Add to cart</button>
      </div>
    </div>
  );
}
