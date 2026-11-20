'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/StoreProvider';
import { session } from '@/lib/session';
import { addQuoteFiles, removeQuoteFile, submitQuote } from '@/lib/actions';
import Icon from '@/components/ui/Icon';
import { Drop, FileCard } from '@/components/ui/Files';

function Quote() {
  const { S } = useApp();
  const sp = useSearchParams();
  const [done, setDone] = useState(null);
  const u = S.user || {};
  return (
    <div className="page"><div className="card qsimple">
      {done ? <>
        <h1>Thank you!</h1><p>Your request <strong>{done}</strong> has been received. We&apos;ll send the quotation by email and WhatsApp, and you can accept it online from your account.</p><Link className="btn" href="/">Back to home</Link>
      </> : <>
        <h1>Request a quotation</h1>
        <p className="muted">For bulk orders, special sizes or anything not on the website. We usually reply within a working day.</p>
        <form id="quoteForm" className="qgrid" onSubmit={(e) => { e.preventDefault(); setDone(submitQuote(Object.fromEntries(new FormData(e.currentTarget)))); }}>
          <label className="field">Name / company<input name="name" required defaultValue={u.name || ''} /></label>
          <label className="field">Mobile<input name="phone" type="tel" required defaultValue={u.phone || ''} /></label>
          <label className="field qfull">Email<input name="email" type="email" required defaultValue={u.email || ''} /></label>
          <label className="field">What do you need printed?<input name="product" required defaultValue={sp.get('product') || ''} /></label>
          <label className="field">Quantity<input name="qty" type="number" min="1" required /></label>
          <label className="field qfull">Details (size, paper, finish, deadline)<textarea name="details" required rows="4" /></label>
          <Drop className="drop qdrop qfull" onFiles={addQuoteFiles}><Icon name="upload" /><span><strong>Attach artwork or reference</strong> <span className="muted">(optional)</span></span></Drop>
          <div className="files qfull" id="quoteFiles">{session.quoteFiles.map((f) => <FileCard key={f.id} f={f} onRemove={() => removeQuoteFile(f.id)} />)}</div>
          <label className="check qfull"><input type="checkbox" required /> I&apos;m not a robot (captcha placeholder)</label>
          <button className="btn-primary qsubmit qfull" type="submit">Send request</button>
        </form>
      </>}
    </div></div>
  );
}

export default function Page() { return <Suspense><Quote /></Suspense>; }
