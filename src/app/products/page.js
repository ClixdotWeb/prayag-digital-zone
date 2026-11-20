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
const SORTS = [['default', 'Default'], ['asc', 'Price: Low to High'], ['desc', 'Price: High to Low']];

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
  const [sheet, setSheet] = useState(false); // phone: Filter & Sort bottom sheet
  const [sort, setSort] = useState('default');
  useEffect(() => {
    document.body.classList.toggle('cd-lock', sheet);
    return () => document.body.classList.remove('cd-lock');
  }, [sheet]);
  const has = (p, key, label) => (p.options.find((g) => g.key === key)?.choices || []).some((c) => c.label === label);
  const list = all.filter((p) =>
    (!f.cat || p.cat === f.cat) &&
    (!f.q || (p.name + ' ' + p.desc).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.paper.length || f.paper.some((x) => has(p, 'paper', x))) &&
    (!f.lam.length || f.lam.some((x) => has(p, 'lamination', x))) &&
    (!f.max || startPrice(p) <= f.max));
  if (sort === 'asc') list.sort((a, b) => startPrice(a) - startPrice(b));
  else if (sort === 'desc') list.sort((a, b) => startPrice(b) - startPrice(a));
  const active = (f.q ? 1 : 0) + (f.cat ? 1 : 0) + (f.max ? 1 : 0) + f.paper.length + f.lam.length;
  const setAndClean = (k, v) => { setFilter(k, v); if (sp.toString()) router.replace('/products'); };
  const applyRange = (e) => { const v = +e.currentTarget.value; setRangeLbl(null); setFilter('max', v >= maxStart ? 0 : v); };
  const priceLabel = rangeLbl ?? (f.max && f.max < maxStart ? 'Up to ' + inr(f.max, 0) : 'Any price');
  const onSlide = (e) => { const v = +e.currentTarget.value; setRangeLbl(v >= maxStart ? 'Any price' : 'Up to ₹' + v.toLocaleString('en-IN')); };
  const chip = (on, cls) => `fs-chip${on ? ' ' + cls : ''}`;

  return (
    <div className="page dr-shop"><div className="crumbs"><Link href="/">Home</Link> / Products</div>
      <div className="shop">
        {/* Desktop sidebar */}
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

          <div className="fsec"><div className="row between"><h3>Starting price</h3><span className="range-val">{priceLabel}</span></div>
            <input key={'max' + f.max} type="range" min="0" max={maxStart} step="100" defaultValue={f.max || maxStart} aria-label="Maximum starting price"
              onInput={onSlide} onPointerUp={applyRange} onKeyUp={applyRange} />
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

        <section>
          <div className="row between"><h1>Products</h1><span className="muted">{list.length} found</span></div>
          {/* Phone: Filter button + category chips */}
          <div className="fs-bar">
            <button type="button" className="fs-filter" onClick={() => setSheet(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h10M4 12h4M12 12h8M4 18h12" /><circle cx="17" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="19" cy="18" r="2" /></svg>
              Filter{active > 0 && <span className="fs-count">{active}</span>}
            </button>
            <span className="fs-div" />
            <button type="button" className={chip(!f.cat, 'on')} onClick={() => setAndClean('cat', '')}>All</button>
            {CATEGORIES.map((c) => <button key={c.id} type="button" className={chip(f.cat === c.id, 'on')} onClick={() => setAndClean('cat', c.id)}>{c.name}</button>)}
          </div>
          {list.length ? <div className="grid g3">{list.map((p) => <ProductTile key={p.id} p={p} />)}</div>
            : <div className="card">No products match these filters. <Link href="/quote">Ask for a custom quote</Link>.</div>}
        </section>
      </div>

      {/* Phone: Filter & Sort bottom sheet */}
      <div className={`fs-wrap${sheet ? ' open' : ''}`} aria-hidden={!sheet}>
        <div className="fs-backdrop" onClick={() => setSheet(false)} />
        <div className="fs-sheet" role="dialog" aria-modal="true" aria-label="Filter and sort">
          <div className="fs-handle" />
          <div className="fs-head">
            <h2>Filter &amp; Sort <span>({list.length} items)</span></h2>
            <button type="button" className="fs-x" aria-label="Close" onClick={() => setSheet(false)}>×</button>
          </div>
          <div className="fs-body">
            <h3>Sort by</h3>
            <div className="fs-chips">{SORTS.map(([k, l]) => <button key={k} type="button" className={chip(sort === k, 'dark')} onClick={() => setSort(k)}>{l}</button>)}</div>
            <h3>Categories</h3>
            <div className="fs-chips">
              <button type="button" className={chip(!f.cat, 'dark')} onClick={() => setAndClean('cat', '')}>All products</button>
              {CATEGORIES.map((c) => <button key={c.id} type="button" className={chip(f.cat === c.id, 'dark')} onClick={() => setAndClean('cat', c.id)}>{c.name}</button>)}
            </div>
            <div className="fs-row"><h3>Max price</h3><b>{priceLabel}</b></div>
            <input key={'smax' + f.max} type="range" min="0" max={maxStart} step="100" defaultValue={f.max || maxStart} aria-label="Maximum starting price"
              onInput={onSlide} onPointerUp={applyRange} onKeyUp={applyRange} />
            <h3>Paper / material</h3>
            <div className="fs-chips">{papers.map((x) => <button key={x} type="button" className={chip(f.paper.includes(x), 'dark')} onClick={() => setFilter('paper', x, !f.paper.includes(x))}>{x}</button>)}</div>
            <h3>Lamination finish</h3>
            <div className="fs-chips">{LAMS.map((x) => <button key={x} type="button" className={chip(f.lam.includes(x), 'dark')} onClick={() => setFilter('lam', x, !f.lam.includes(x))}>{x}</button>)}</div>
          </div>
          <div className="fs-foot">
            <button type="button" className="fs-reset" onClick={() => { setSort('default'); clearFilters(); }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
              Reset
            </button>
            <button type="button" className="fs-show" onClick={() => { setSheet(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              Show {list.length} Result{list.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense><Products /></Suspense>; }
