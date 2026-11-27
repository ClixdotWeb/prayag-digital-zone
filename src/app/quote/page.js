'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/StoreProvider';
import { session } from '@/lib/session';
import { CATEGORIES } from '@/lib/data';
import { allProducts } from '@/lib/core';
import { addQuoteFiles, removeQuoteFile, submitQuote } from '@/lib/actions';
import Icon from '@/components/ui/Icon';
import { Drop, FileCard } from '@/components/ui/Files';

const OTHER = '__other';

function Quote() {
  const { S } = useApp();
  const sp = useSearchParams();
  const [done, setDone] = useState(null);
  const u = S.user || {};
  const all = allProducts();
  // ?product= may be a product id (new links) or a product name (older links); anything else goes to "Something else".
  const want = sp.get('product') || '';
  const match = all.find((p) => p.id === want || p.name.toLowerCase() === want.toLowerCase());
  const [choice, setChoice] = useState(match ? match.name : want ? OTHER : '');
  const submit = (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    if (fd.product === OTHER) fd.product = (fd.productOther || '').trim() || 'Something else';
    delete fd.productOther;
    setDone(submitQuote(fd));
  };
  return (
    <div className="page"><div className="card qsimple">
      {done ? <>
        <h1>Thank you!</h1><p>Your request <strong>{done}</strong> has been received. We&apos;ll send the quotation by email and WhatsApp, and you can accept it online from your account.</p><Link className="btn" href="/">Back to home</Link>
      </> : <>
        <h1>Request a quotation</h1>
        <p className="muted">For bulk orders, special sizes, services priced on request or anything not on the website. We usually reply within a working day.</p>
        <form id="quoteForm" className="qgrid" onSubmit={submit}>
          <label className="field">Name / company<input name="name" required defaultValue={u.name || ''} /></label>
          <label className="field">Mobile<input name="phone" type="tel" required defaultValue={u.phone || ''} /></label>
          <label className="field qfull">Email<input name="email" type="email" required defaultValue={u.email || ''} /></label>
          <label className="field">What do you need printed?
            <select name="product" required value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="" disabled>Choose a product or service</option>
              {CATEGORIES.map((c) => {
                const ps = all.filter((p) => p.cat === c.id);
                return ps.length ? <optgroup key={c.id} label={c.name}>{ps.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</optgroup> : null;
              })}
              <option value={OTHER}>Something else</option>
            </select>
          </label>
          <label className="field">Quantity<input name="qty" type="number" min="1" required defaultValue={sp.get('qty') || ''} /></label>
          {choice === OTHER && <label className="field qfull">Tell us what you need<input name="productOther" required defaultValue={match ? '' : want} /></label>}
          <label className="field qfull">Details (size, paper, finish, deadline)<textarea name="details" required rows="5" defaultValue={sp.get('details') || ''} /></label>
          <Drop className="drop qdrop qfull" onFiles={addQuoteFiles} allow={['pdf', 'ai', 'psd', 'cdr', 'svg', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'xlsx', 'xls', 'csv', 'zip']}><Icon name="upload" /><span><strong>Attach artwork, data sheet or reference</strong> <span className="muted">(optional)</span></span></Drop>
          <div className="files qfull" id="quoteFiles">{session.quoteFiles.map((f) => <FileCard key={f.id} f={f} onRemove={() => removeQuoteFile(f.id)} />)}</div>
          <label className="check qfull"><input type="checkbox" required /> I&apos;m not a robot (captcha placeholder)</label>
          <button className="btn-primary qsubmit qfull" type="submit">Send request</button>
        </form>
      </>}
    </div></div>
  );
}

export default function Page() { return <Suspense><Quote /></Suspense>; }
