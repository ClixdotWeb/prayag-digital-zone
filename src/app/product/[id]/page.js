'use client';
import Link from 'next/link';
import { use } from 'react';
import { useApp } from '@/context/StoreProvider';
import { CATEGORIES } from '@/lib/data';
import { calc, inr, isChoice, MAX_FILE_MB, needsQuote, priced, product, qtyOptions, round2, visible } from '@/lib/core';
import { addCfgFiles, addSlotFiles, addToCart, buyNow, initCfg, pickOption, removeCfgFile, removeSlotFile, requestQuote, setCfg, setDim, setField, toggleWish } from '@/lib/actions';
import { HeartIcon, Photo } from '@/components/ui/Icon';
import { Drop, FileCard } from '@/components/ui/Files';
import NotFoundCard from '@/components/shop/NotFound';

const UploadIcon = () => <span className="up-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></svg></span>;

function Price({ p, cfg, S }) {
  // Quote-only product, or a chosen option without a rate yet → no price, no Add to cart.
  if (needsQuote(p, cfg.sel)) return (
    <div className="ps-price ps-quote" id="pricebox">
      <div className="ps-total"><span>Price</span><b className="price-q">On request</b></div>
      <p className="muted small">{priced(p) ? 'The option you picked is priced on request.' : 'This service is priced on request.'} Send your options and we will reply with a quote, usually within a working day.</p>
      <div className="ps-btns"><button className="btn-primary" onClick={() => requestQuote(p)}>Get a quote</button></div>
    </div>
  );
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

/** One option group: choice chips, or a text / number / size / upload field. */
function Field({ p, g, cfg }) {
  if (isChoice(g)) {
    const isCustom = !g.multi && g.choices[cfg.sel[g.key]]?.custom;
    return (
      <div className="ps-opt">
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
  }
  const v = cfg.fields[g.key];
  if (g.type === 'text') return (
    <label className="ps-opt ps-field"><span className="ps-lbl">{g.label}</span>
      {g.multiline ? <textarea rows="3" value={v || ''} placeholder={g.placeholder} onChange={(e) => setField(g.key, e.target.value)} />
        : <input value={v || ''} placeholder={g.placeholder} onChange={(e) => setField(g.key, e.target.value)} />}
    </label>
  );
  if (g.type === 'number') return (
    <label className="ps-opt ps-field"><span className="ps-lbl">{g.label}</span>
      <input type="number" inputMode="numeric" min={g.min || 1} value={v || ''} placeholder={g.placeholder} onChange={(e) => setField(g.key, e.target.value)} style={{ maxWidth: 220 }} />
    </label>
  );
  if (g.type === 'dims') return (
    <div className="ps-opt"><div className="ps-lbl">{g.label} <span className="muted">· in {g.unit}</span></div>
      <div className="row ps-dims">
        <label className="field">Width<input type="number" inputMode="decimal" min="0" step="any" value={v?.w || ''} onChange={(e) => setDim(g.key, 'w', e.target.value)} /></label>
        <span aria-hidden="true">×</span>
        <label className="field">Height<input type="number" inputMode="decimal" min="0" step="any" value={v?.h || ''} onChange={(e) => setDim(g.key, 'h', e.target.value)} /></label>
      </div>
    </div>
  );
  if (g.type === 'upload') {
    const files = cfg.slots[g.key] || [];
    return (
      <div className="ps-opt"><div className="ps-lbl">{g.label}{g.hint && <span className="muted"> · {g.hint}</span>}</div>
        <Drop className="drop up-simple" allow={g.allow} accept={g.allow.map((x) => '.' + x).join(',')} onFiles={(r) => addSlotFiles(g.key, r)}>
          <UploadIcon />
          <span className="up-txt"><b>Drop file or browse</b><small>{g.allow.map((x) => x.toUpperCase()).join(', ')} · up to {MAX_FILE_MB} MB</small></span>
          <span className="up-btn">Upload</span>
        </Drop>
        {files.length > 0 && <div className="files">{files.map((f) => <FileCard key={f.id} f={f} onRemove={() => removeSlotFile(g.key, f.id)} />)}</div>}
      </div>
    );
  }
  return null;
}

export default function ProductPage({ params }) {
  const { id } = use(params);
  const { S } = useApp();
  const p = product(id);
  if (!p || p.active === false) return <NotFoundCard />;
  const cfg = initCfg(p);
  const wished = S.wishlist.includes(id);
  const quoteOnly = !priced(p);
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
          {quoteOnly
            ? <p className="muted small">Price and delivery time are confirmed in your quote.</p>
            : <p className="muted small">{p.days ? `Ready in ${p.days} working day${p.days === 1 ? '' : 's'} after design approval` : 'Delivery time confirmed after your order'} · Minimum {p.minQty} {p.minQty === 1 ? 'piece' : 'pcs'}</p>}
          <div className="ps-links">
            <Link href={`/quote?product=${encodeURIComponent(p.id)}`}>Get a bulk quote</Link>
            <Link href="/samples">Paper samples</Link>
          </div>
        </div>

        {/* Right: one simple card — options → quantity → design → price (or quote) */}
        <div className="ps-card">
          <h2>Choose your options</h2>
          {p.options.filter((g) => visible(g, cfg.sel)).map((g) => <Field key={g.key} p={p} g={g} cfg={cfg} />)}
          <div className="ps-opt">
            <div className="ps-lbl">{quoteOnly ? 'Quantity / copies' : 'Quantity'}</div>
            {quoteOnly
              ? <input className="ps-qty" type="number" inputMode="numeric" min="1" placeholder="How many?" aria-label="Quantity" value={cfg.qty} onChange={(e) => setCfg('qty', e.target.value)} />
              : <div className="chips">{qtyOptions(p).map((q) => (
                <button key={q} className={`chip ${+cfg.qty === q ? 'on' : ''}`} aria-pressed={+cfg.qty === q} onClick={() => setCfg('qty', q)}>{q.toLocaleString('en-IN')}</button>
              ))}</div>}
            {!quoteOnly && <p className="muted small ps-note">Need a different quantity? <Link href={`/quote?product=${encodeURIComponent(p.id)}`}>Ask for a quote</Link></p>}
          </div>
          <div className="ps-opt">
            <div className="ps-lbl">{quoteOnly ? 'Your file / artwork' : 'Your design'} <span className="muted">· you can also upload later</span></div>
            <Drop className="drop up-simple" onFiles={addCfgFiles} accept=".pdf,.ai,.psd,.cdr,.svg,.png,.jpg,.jpeg,.tif,.tiff">
              <UploadIcon />
              <span className="up-txt"><b>Drop files or browse</b><small>PDF, AI, PSD, CDR, PNG, JPG · up to {MAX_FILE_MB} MB</small></span>
              <span className="up-btn">Upload</span>
            </Drop>
            {cfg.files.length > 0 && <div className="files" id="cfgFiles">{cfg.files.map((f) => <FileCard key={f.id} f={f} onRemove={() => removeCfgFile(f.id)} />)}</div>}
          </div>
          <Price p={p} cfg={cfg} S={S} />
        </div>
      </div>
    </div>
  );
}
