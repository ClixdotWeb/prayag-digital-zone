'use client';
import Link from 'next/link';
import { useApp } from '@/context/StoreProvider';
import { product } from '@/lib/core';
import ProductTile from '@/components/ui/ProductTile';

export default function Wishlist() {
  const { S } = useApp();
  const ps = S.wishlist.map(product).filter(Boolean);
  return (
    <div className="page"><div className="row between" style={{ marginBottom: 18 }}><h1 style={{ margin: 0 }}>Wishlist</h1><span className="muted">{ps.length} saved</span></div>
      {ps.length ? <div className="grid g4">{ps.map((p) => <ProductTile key={p.id} p={p} />)}</div>
        : <div className="card" style={{ textAlign: 'center', padding: 36 }}><p style={{ margin: '0 0 14px' }}>Your wishlist is empty. Tap the ♡ on any product to save it here.</p><Link className="btn btn-primary" href="/products">Browse products</Link></div>}
    </div>
  );
}
