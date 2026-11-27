'use client';
// /print — instant price calculator with file upload (B&W A4, and Colour A4 / A3 Express).
// Prices come from the server's rate card; the same pricing function runs here (instant) and on the server (verified).
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fileSize, toast } from '@/lib/core';
import { calculatePrice, GSMS, PRINT_MAX_MB, rupees } from '@/lib/print-pricing';
import { addPrintToCart, fetchRates, precheck, uploadPrintFile } from '@/lib/print-actions';

const TABS = [['bw', 'B&W A4'], ['colour', 'Colour · A3 Express']];

function Chips({ value, options, onPick, label }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={v} type="button" className={`chip ${value === v ? 'on' : ''}`} aria-pressed={value === v} onClick={() => onPick(v)}>{l}</button>)}
    </div>
  );
}

function Stepper({ value, onChange, label, min = 1 }) {
  const n = parseInt(value, 10) || 0;
  return (
    <div className="pr-step">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(String(Math.max(min, n - 1)))}>−</button>
      <input type="number" inputMode="numeric" min={min} value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(String(n + 1))}>+</button>
    </div>
  );
}

export default function PrintPage() {
  const [rates, setRates] = useState(null);
  const [rateErr, setRateErr] = useState('');
  const [type, setType] = useState('bw');
  const [side, setSide] = useState('single');
  const [size, setSize] = useState('A4');
  const [gsm, setGsm] = useState(130);
  const [copies, setCopies] = useState('1');
  const [manualQty, setManualQty] = useState('');
  const [files, setFiles] = useState([]); // { key, name, size, status: 'uploading'|'ok'|'error', error?, meta? }
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => { fetchRates().then(setRates).catch((e) => setRateErr(e.message)); }, []);

  const ready = files.filter((f) => f.status === 'ok');
  const uploading = files.some((f) => f.status === 'uploading');
  const options = { type, side, size, gsm, copies: parseInt(copies, 10), manualQty: parseInt(manualQty, 10), pageCounts: ready.map((f) => f.meta.pages) };
  const hasInput = ready.length > 0 || (type === 'colour' && manualQty !== '');
  const price = useMemo(() => (rates && hasInput ? calculatePrice(options, rates) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rates, type, side, size, gsm, copies, manualQty, files]);

  const take = (list) => {
    for (const f of Array.from(list || [])) {
      const key = Math.random().toString(36).slice(2);
      const bad = precheck(f);
      setFiles((fs) => [...fs, { key, name: f.name, size: f.size, status: bad ? 'error' : 'uploading', error: bad || undefined }]);
      if (bad) continue;
      uploadPrintFile(f)
        .then((meta) => setFiles((fs) => fs.map((x) => (x.key === key ? { ...x, status: 'ok', meta } : x))))
        .catch((e) => setFiles((fs) => fs.map((x) => (x.key === key ? { ...x, status: 'error', error: e.message } : x))));
    }
  };
  const removeFile = (key) => setFiles((fs) => fs.filter((x) => x.key !== key));

  const add = async (then) => {
    setBusy(true);
    try {
      await addPrintToCart({ type, side, size, gsm, copies: options.copies, manualQty: ready.length ? null : options.manualQty }, ready.map((f) => f.meta), then);
      setFiles([]); setCopies('1'); setManualQty('');
    } catch (e) { toast('Could not add to cart', e.message); }
    setBusy(false);
  };

  const canOrder = price?.ok && !uploading && !busy;
  const hint = price?.ok && price.nextSlabHint;

  return (
    <div className="page pr">
      <div className="crumbs"><Link href="/">Home</Link> / Print now</div>
      <h1>Print now</h1>
      <p className="pr-lead">Upload your file, pick your options and see the price instantly.</p>

      <div className="pr-tabs" role="tablist" aria-label="Print type">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={type === k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}
      </div>

      <div className="pr-grid">
        <div className="ps-card pr-card">
          <div className="ps-opt">
            <div className="ps-lbl">Your files <span className="muted">· PDF, JPG or PNG · up to {PRINT_MAX_MB} MB each</span></div>
            <label className={`drop up-simple${over ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}>
              <span className="up-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></svg></span>
              <span className="up-txt"><b>Drop files or browse</b><small>We count the pages for you. Images count as 1 page.</small></span>
              <span className="up-btn">Upload</span>
              <input type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
            </label>
            {files.length > 0 && (
              <ul className="pr-files">
                {files.map((f) => (
                  <li key={f.key} className={f.status}>
                    <span className="pr-fext">{(f.name.split('.').pop() || '').slice(0, 4).toUpperCase()}</span>
                    <span className="pr-fname"><b title={f.name}>{f.name}</b>
                      <small>{f.status === 'uploading' ? 'Uploading and counting pages…' : f.status === 'error' ? f.error : `${f.meta.pages} page${f.meta.pages === 1 ? '' : 's'} · ${fileSize(f.size)}`}</small>
                    </span>
                    {f.status === 'ok' && <span className="pr-pages">{f.meta.pages}<small>pg</small></span>}
                    <button type="button" className="pr-x" onClick={() => removeFile(f.key)} aria-label={`Remove ${f.name}`}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {type === 'colour' && <>
            <div className="ps-opt">
              <div className="ps-lbl">Paper size</div>
              <Chips label="Paper size" value={size} onPick={setSize} options={[['A4', 'A4'], ['A3', 'A3 Express']]} />
            </div>
            <div className="ps-opt">
              <div className="ps-lbl">Paper thickness</div>
              <Chips label="Paper thickness" value={gsm} onPick={setGsm} options={GSMS.map((g) => [g, `${g} GSM`])} />
            </div>
          </>}

          <div className="ps-opt">
            <div className="ps-lbl">Sides</div>
            <Chips label="Sides" value={side} onPick={setSide} options={[['single', 'Single side'], ['double', 'Double side']]} />
          </div>

          {ready.length > 0 || type === 'bw' ? (
            <div className="ps-opt pr-last">
              <div className="ps-lbl">Copies <span className="muted">· of every file</span></div>
              <Stepper label="copies" value={copies} onChange={setCopies} />
            </div>
          ) : (
            <div className="ps-opt pr-last">
              <div className="ps-lbl">Quantity <span className="muted">· number of prints, if you have no file yet</span></div>
              <Stepper label="prints" value={manualQty} onChange={setManualQty} />
            </div>
          )}
        </div>

        <aside className="ps-card pr-price" aria-live="polite">
          <h2>Your price</h2>
          {rates?.placeholder && <p className="pr-sample">Sample rates — final prices coming soon</p>}
          {rateErr ? <p className="pr-err">{rateErr}</p>
            : !rates ? <p className="price-wait">Loading prices…</p>
            : !price ? <p className="price-wait">{type === 'colour' ? 'Upload a file or enter a quantity to see your price.' : 'Upload a file to see your price.'}</p>
            : !price.ok ? <p className="pr-err">{price.error}</p>
            : <>
              <dl className="pr-break">
                {price.manual ? <div><dt>Prints</dt><dd>{price.quantity.toLocaleString('en-IN')}</dd></div> : <>
                  <div><dt>Pages</dt><dd>{price.pages.toLocaleString('en-IN')}</dd></div>
                  <div><dt>Copies</dt><dd>× {price.copies.toLocaleString('en-IN')}</dd></div>
                  <div><dt>Printed sides</dt><dd>{price.quantity.toLocaleString('en-IN')}</dd></div>
                </>}
                <div><dt>Sheets of paper</dt><dd>{price.sheets.toLocaleString('en-IN')}</dd></div>
                <div><dt>Rate <small>({price.slabLabel} prints)</small></dt><dd>{rupees(price.ratePerUnit)} / print</dd></div>
              </dl>
              {price.capped && <p className="pr-note">You pay the {price.cappedAt.toLocaleString('en-IN')}-print price, which is lower here.</p>}
              <div className="ps-total"><span>Total</span><b className="price-big">{rupees(price.total)}</b></div>
              <p className="muted small">+ GST at checkout</p>
              {hint && <p className="pr-hint">Add <b>{hint.addQty.toLocaleString('en-IN')}</b> more print{hint.addQty === 1 ? '' : 's'} to get <b>{rupees(hint.ratePerUnit)}</b> per print</p>}
            </>}
          <div className="ps-btns">
            <button className="btn-primary" disabled={!canOrder} onClick={() => add('drawer')}>{busy ? 'Checking price…' : 'Add to cart'}</button>
            <button disabled={!canOrder} onClick={() => add('cart')}>Buy now</button>
          </div>
          {uploading && <p className="muted small">Waiting for uploads to finish…</p>}
        </aside>
      </div>
    </div>
  );
}
