'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { CATEGORIES } from '@/lib/data';
import { calc, inr, MAX_FILE_MB, product, qtyOptions, round2 } from '@/lib/core';
import { addCfgFiles, addToCart, buyNow, initCfg, pickOption, removeCfgFile, setCfg, toggleWish } from '@/lib/actions';
import { HeartIcon, Photo } from '@/components/ui/Icon';
import { Drop, FileCard } from '@/components/ui/Files';
import NotFoundCard from '@/components/shop/NotFound';

function Price({ p, cfg, S }) {
  const qty = Math.max(0, parseInt(cfg.qty, 10) || 0);
  if (qty < p.minQty) return (
    <div className="ps-price" id="pricebox">
      <p className="price-wait">Choose your options and quantity to see your price.</p>
      <div className="ps-btns"><button className="btn-primary" disabled>Add to cart</button><button disabled>Buy now</button></div>
    </div>
  );
  const pr = calc(p, cfg.sel, qty, cfg.custom);
  const gst = round2((pr.total * S.settings.gstPct) / 100);
  return (
    <div className="ps-price" id="pricebox">
      <div className="ps-total"><span>Your price</span><b className="price-big">{inr(pr.total)}</b></div>
      <p className="muted small">{qty.toLocaleString('en-IN')} pcs · {inr(pr.per)} per piece{pr.flat > 0 ? ` · includes ${inr(pr.flat)} setup` : ''} · + {inr(gst)} GST at checkout</p>
      <div className="ps-btns"><button className="btn-primary" onClick={addToCart}>Add to cart</button><button onClick={buyNow}>Buy now</button></div>
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
    <div className="page dr-pd ps"><div className="crumbs"><Link href="/">Home</Link> / <Link href={`/products?cat=${p.cat}`}>{CATEGORIES.find((c) => c.id === p.cat).name}</Link> / {p.name}</div>
      <div className="ps-grid">
        {/* Left: photo + about */}
        <div className="ps-left">
          <div className="pd-art photo ps-photo">
            <Photo id={p.id} alt={p.name} />
            <button type="button" className={`wish-btn ${wished ? 'on' : ''}`} onClick={() => toggleWish(p.id)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={wished}><HeartIcon filled={wished} size={22} /></button>
          </div>
          <h1>{p.name}</h1>
          <p className="ps-desc">{p.desc}</p>
          <ul className="ps-specs">{p.specs.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="muted small">Ready in {p.days} working days after design approval · Minimum {p.minQty} pcs</p>
          <div className="ps-links">
            <Link href={`/quote?product=${encodeURIComponent(p.name)}`}>Get a bulk quote</Link>
            <Link href="/samples">Paper samples</Link>
          </div>
        </div>

        {/* Right: one simple card — options → quantity → design → price */}
        <div className="ps-card">
          <h2>Choose your options</h2>
          {p.options.map((g) => {
            const isCustom = !g.multi && g.choices[cfg.sel[g.key]]?.custom;
            return (
              <div className="ps-opt" key={g.key}>
                <div className="ps-lbl">{g.label}{g.multi && <span className="muted"> · optional</span>}</div>
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
          <div className="ps-opt">
            <div className="ps-lbl">Quantity</div>
            <div className="chips">{qtyOptions(p).map((q) => (
              <button key={q} className={`chip ${+cfg.qty === q ? 'on' : ''}`} aria-pressed={+cfg.qty === q} onClick={() => setCfg('qty', q)}>{q.toLocaleString('en-IN')}</button>
            ))}</div>
            <p className="muted small ps-note">Need a different quantity? <Link href={`/quote?product=${encodeURIComponent(p.name)}`}>Ask for a quote</Link></p>
          </div>
          <div className="ps-opt">
            <div className="ps-lbl">Your design <span className="muted">· you can also upload later</span></div>
            <Drop className="drop up-simple" onFiles={addCfgFiles} accept=".pdf,.ai,.psd,.cdr,.svg,.png,.jpg,.jpeg,.tif,.tiff">
              <span className="up-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></svg></span>
              <span className="up-txt"><b>Drop files or browse</b><small>PDF, AI, PSD, CDR, PNG, JPG · up to {MAX_FILE_MB} MB</small></span>
              <span className="up-btn">Browse</span>
            </Drop>
            {cfg.files.length > 0 && <div className="files" id="cfgFiles">{cfg.files.map((f) => <FileCard key={f.id} f={f} onRemove={() => removeCfgFile(f.id)} />)}</div>}
          </div>
          <Price p={p} cfg={cfg} S={S} />
        </div>
      </div>
    </div>
  );
}
