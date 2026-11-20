'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { CATEGORIES } from '@/lib/data';
import { calc, inr, MAX_FILE_MB, product, round2 } from '@/lib/core';
import { addCfgFiles, addToCart, buyNow, initCfg, pickOption, removeCfgFile, setCfg, toggleWish } from '@/lib/actions';
import { Photo } from '@/components/ui/Icon';
import { Drop, FileCard } from '@/components/ui/Files';
import NotFoundCard from '@/components/shop/NotFound';

function PriceBox({ p, cfg, S }) {
  const qty = Math.max(0, parseInt(cfg.qty, 10) || 0);
  const ok = qty >= p.minQty;
  const pr = calc(p, cfg.sel, qty || p.minQty, cfg.custom);
  const gst = round2((pr.total * S.settings.gstPct) / 100);
  return (
    <div className="card price-box" id="pricebox">
      <div className="muted small">Your price</div>
      <div className="price-big">{ok ? inr(pr.total) : '—'}</div>
      <div className="muted small">{ok ? `${inr(pr.per)} per piece × ${qty}` : `Minimum quantity is ${p.minQty}`}{pr.tier < 1 ? ` · ${Math.round((1 - pr.tier) * 100)}% bulk discount applied` : ''}</div>
      {pr.flat > 0 && <div className="kv"><span>One-time setup (included)</span><span>{inr(pr.flat)}</span></div>}
      <div className="kv"><span>GST {S.settings.gstPct}% (added at checkout)</span><span>{ok ? inr(gst) : '—'}</span></div>
      <div className="row" style={{ marginTop: 12 }}><button className="btn-primary" onClick={addToCart} disabled={!ok}>Add to cart</button><button onClick={buyNow} disabled={!ok}>Buy now</button></div>
    </div>
  );
}

export default function ProductPage({ params }) {
  const { id } = use(params);
  const { S } = useApp();
  const p = product(id);
  if (!p || p.active === false) return <NotFoundCard />;
  const cfg = initCfg(p);
  const wished = S.wishlist.includes(id);
  return (
    <div className="page dr-pd"><div className="crumbs"><Link href="/">Home</Link> / <Link href={`/products?cat=${p.cat}`}>{CATEGORIES.find((c) => c.id === p.cat).name}</Link> / {p.name}</div>
      <div className="pd">
        <div className="stack">
          <div className="pd-art photo"><Photo id={p.id} alt={p.name} /></div>
          <div className="card"><h1>{p.name}</h1><p>{p.desc}</p>
            <ul>{p.specs.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="muted small">Production time: {p.days} working days after design approval · Minimum {p.minQty} pcs</p>
            <div className="row"><button onClick={() => toggleWish(p.id)}>{wished ? '♥ In wishlist' : '♡ Add to wishlist'}</button>
              <Link className="btn" href={`/quote?product=${encodeURIComponent(p.name)}`}>Bulk / unusual job? Get a quote</Link><Link className="btn" href="/samples">Paper samples & templates</Link></div>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h2>Choose your options</h2>
            {p.options.map((g) => {
              const isCustom = !g.multi && g.choices[cfg.sel[g.key]]?.custom;
              return (
                <div className="opt-group" key={g.key}><div className="lbl">{g.label}{g.multi && <> <span className="muted">(choose any)</span></>}</div>
                  <div className="chips">{g.choices.map((c, i) => {
                    const on = g.multi ? (cfg.sel[g.key] || []).includes(i) : cfg.sel[g.key] === i;
                    return <button key={c.label} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pickOption(p, g.key, i)}>{c.label}</button>;
                  })}</div>
                  {isCustom && <div className="row" style={{ marginTop: 8 }}>
                    <label className="field" style={{ flex: 1 }}>Width (mm)<input type="number" min="50" max="1500" value={cfg.custom.w} onChange={(e) => setCfg('w', e.target.value)} /></label>
                    <label className="field" style={{ flex: 1 }}>Height (mm)<input type="number" min="50" max="1500" value={cfg.custom.h} onChange={(e) => setCfg('h', e.target.value)} /></label></div>}
                </div>
              );
            })}
            <div className="opt-group"><div className="lbl">Quantity</div>
              <input type="number" min={p.minQty} step={p.step} value={cfg.qty} onChange={(e) => setCfg('qty', e.target.value)} style={{ maxWidth: 180 }} />
              <div className="tiers"><span>{p.minQty}+ base rate</span><span>{p.minQty * 2.5}+ save 10%</span><span>{p.minQty * 5}+ save 20%</span><span>{p.minQty * 10}+ save 30%</span></div>
            </div>
          </div>
          <div className="card">
            <h2>Upload your design</h2>
            <Drop onFiles={addCfgFiles} accept=".pdf,.ai,.psd,.cdr,.svg,.png,.jpg,.jpeg,.tif,.tiff">
              <strong>Drag & drop files here</strong> or <span style={{ color: 'var(--brand)' }}>browse</span>
              <div className="muted small">PDF, AI, PSD, CDR, SVG, PNG, JPG, TIFF · up to {MAX_FILE_MB} MB each · several files allowed</div>
            </Drop>
            <div className="files" id="cfgFiles">{cfg.files.map((f) => <FileCard key={f.id} f={f} onRemove={() => removeCfgFile(f.id)} />)}</div>
            <p className="muted small">No design yet? You can upload it later from your account before we start printing.</p>
          </div>
          <PriceBox p={p} cfg={cfg} S={S} />
        </div>
      </div>
    </div>
  );
}
