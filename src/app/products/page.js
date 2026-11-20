'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/StoreProvider';
import { CATEGORIES } from '@/lib/data';
import { allProducts, inr, startPrice } from '@/lib/core';
import { session } from '@/lib/session';
import { clearFilters, setFilter } from '@/lib/actions';
import Icon from '@/components/ui/Icon';
import ProductTile from '@/components/ui/ProductTile';

const LAMS = ['Matte', 'Gloss', 'Velvet'];

function Products() {
  useApp();
  const sp = useSearchParams();
  const router = useRouter();
  const qCat = sp.get('cat'), qQ = sp.get('q');
  // ?cat= / ?q= in the URL set the filter (as #/products?cat= did in the prototype)
  useEffect(() => {
    if (qCat !== null) setFilter('cat', qCat);
    if (qQ !== null) setFilter('q', qQ);
  }, [qCat, qQ]);
  const f = session.shopFilter;
  const all = allProducts();
  const papers = [...new Set(all.flatMap((p) => (p.options.find((g) => g.key === 'paper')?.choices || []).map((c) => c.label)))];
  const maxStart = Math.ceil(Math.max(...all.map(startPrice)) / 100) * 100;
  const [rangeLbl, setRangeLbl] = useState(null);
  const has = (p, key, label) => (p.options.find((g) => g.key === key)?.choices || []).some((c) => c.label === label);
  const list = all.filter((p) =>
    (!f.cat || p.cat === f.cat) &&
    (!f.q || (p.name + ' ' + p.desc).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.paper.length || f.paper.some((x) => has(p, 'paper', x))) &&
    (!f.lam.length || f.lam.some((x) => has(p, 'lamination', x))) &&
    (!f.max || startPrice(p) <= f.max));
  const active = (f.q ? 1 : 0) + (f.cat ? 1 : 0) + (f.max ? 1 : 0) + f.paper.length + f.lam.length;
  const setAndClean = (k, v) => { setFilter(k, v); if (sp.toString()) router.replace('/products'); };
  const applyRange = (e) => { const v = +e.currentTarget.value; setRangeLbl(null); setFilter('max', v >= maxStart ? 0 : v); };

  return (
    <div className="page dr-shop"><div className="crumbs"><Link href="/">Home</Link> / Products</div>
      <div className="shop">
        <aside className="filters fpanel">
          <div className="fhead"><h2>Filters{active > 0 && <> <span className="fcount">{active}</span></>}</h2>
            {active > 0 && <button className="btn-link" onClick={clearFilters}>Clear all</button>}</div>

          <div className="fsearch"><Icon name="search" />
            <input key={'q' + f.q} type="search" defaultValue={f.q} placeholder="Search products" aria-label="Search products"
              onBlur={(e) => { if (e.target.value !== f.q) setAndClean('q', e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') setAndClean('q', e.currentTarget.value); }} /></div>

          <div className="fsec"><h3>Category</h3>
            <div className="fcats">
              <label className={`fcat ${!f.cat ? 'on' : ''}`}><input type="radio" name="fcat" value="" checked={!f.cat} onChange={() => setAndClean('cat', '')} /><span>All products</span><em>{all.length}</em></label>
              {CATEGORIES.map((c) => (
                <label key={c.id} className={`fcat ${f.cat === c.id ? 'on' : ''}`}><input type="radio" name="fcat" value={c.id} checked={f.cat === c.id} onChange={() => setAndClean('cat', c.id)} /><span>{c.name}</span><em>{all.filter((p) => p.cat === c.id).length}</em></label>
              ))}
            </div></div>

          <div className="fsec"><div className="row between"><h3>Starting price</h3>
            <span className="range-val">{rangeLbl ?? (f.max && f.max < maxStart ? 'Up to ' + inr(f.max, 0) : 'Any price')}</span></div>
            <input key={'max' + f.max} type="range" min="0" max={maxStart} step="100" defaultValue={f.max || maxStart} aria-label="Maximum starting price"
              onInput={(e) => { const v = +e.currentTarget.value; setRangeLbl(v >= maxStart ? 'Any price' : 'Up to ₹' + v.toLocaleString('en-IN')); }}
              onPointerUp={applyRange} onKeyUp={applyRange} />
            <div className="row between small muted"><span>₹0</span><span>{inr(maxStart, 0)}</span></div></div>

          <details className="fsec fold" open={f.paper.length > 0}><summary><h3>Paper / material{f.paper.length > 0 && ` (${f.paper.length})`}</h3></summary>
            <div className="fchips">{papers.map((x) => (
              <label key={x} className={`fchip ${f.paper.includes(x) ? 'on' : ''}`}><input type="checkbox" value={x} checked={f.paper.includes(x)} onChange={(e) => setFilter('paper', x, e.target.checked)} />{x}</label>
            ))}</div></details>

          <details className="fsec fold" open={f.lam.length > 0}><summary><h3>Lamination finish{f.lam.length > 0 && ` (${f.lam.length})`}</h3></summary>
            <div className="fchips">{LAMS.map((x) => (
              <label key={x} className={`fchip ${f.lam.includes(x) ? 'on' : ''}`}><input type="checkbox" value={x} checked={f.lam.includes(x)} onChange={(e) => setFilter('lam', x, e.target.checked)} />{x}</label>
            ))}</div></details>
        </aside>
        <section><div className="row between"><h1>Products</h1><span className="muted">{list.length} found</span></div>
          {list.length ? <div className="grid g3">{list.map((p) => <ProductTile key={p.id} p={p} />)}</div>
            : <div className="card">No products match these filters. <Link href="/quote">Ask for a custom quote</Link>.</div>}
        </section>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense><Products /></Suspense>; }
