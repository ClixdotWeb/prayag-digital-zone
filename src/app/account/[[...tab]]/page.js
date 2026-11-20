'use client';
import Link from 'next/link';
import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/StoreProvider';
import { fileSize, fmtDate, fmtDT, inr } from '@/lib/core';
import { acceptQuote, downloadQuote, logout, reorder, saveProfile, submitTicket } from '@/lib/actions';
import { StatusPill } from '@/components/ui/Status';
import Login from '@/components/shop/Login';

const TABS = [['orders', 'Orders'], ['quotes', 'Quotations'], ['artwork', 'Saved artwork'], ['support', 'Support'], ['notifications', 'Notifications'], ['profile', 'Profile']];
const formData = (e) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)); };

function Account({ tab }) {
  const { S } = useApp();
  const sp = useSearchParams();
  if (!S.user) return <Login />;
  const orders = S.orders.filter((o) => o.customer.email === S.user.email).sort((a, b) => b.createdAt - a.createdAt);
  let body;
  if (tab === 'orders') {
    body = orders.length ? <div className="card olist">{orders.map((o) => (
      <div className="orow" key={o.id}>
        <div className="orow-top"><Link className="orow-items" href={`/track/${o.id}`}>{o.items.map((i) => i.name + ' × ' + i.qty).join(', ')}</Link><b>{inr(o.totals.total)}</b></div>
        <div className="orow-meta"><span className="muted">{o.id} · {fmtDate(o.createdAt)}</span><StatusPill o={o} />
          {o.status === 2 && !o.cancelled && <span className="orow-alert">Needs your approval</span>}</div>
        <div className="orow-acts"><Link href={`/track/${o.id}`}>Track</Link><Link href={`/invoice/${o.id}`}>Invoice</Link><button className="btn-link" onClick={() => reorder(o.id)}>Reorder</button></div>
      </div>))}</div> : <p>No orders yet. <Link href="/products">Start shopping</Link></p>;
  } else if (tab === 'quotes') {
    const qs = S.quotes.filter((q) => q.email === S.user.email);
    const qst = { new: ['Awaiting price', 's1'], sent: ['Quote sent', 's3'], accepted: ['Accepted', 's10'] };
    body = qs.length ? <div className="card olist">{qs.map((q) => {
      const [label, cls] = qst[q.status] || [q.status, ''];
      return (
        <div className="orow" key={q.id}>
          <div className="orow-top"><span className="orow-items">{q.product} × {q.qty}</span>{q.price ? <b>{inr(q.price)} <span className="muted small" style={{ fontWeight: 500 }}>+ GST</span></b> : null}</div>
          <div className="orow-meta"><span className="muted">{q.id} · {fmtDate(q.at)}</span><span className={`st ${cls}`}>{label}</span>
            {q.status === 'sent' && <span className="muted small">Valid until {fmtDate(q.validUntil)}</span>}</div>
          <p className="orow-note muted">{q.details}{q.adminNote && <><br /><span style={{ color: 'var(--ink-2)' }}>{q.adminNote}</span></>}</p>
          {q.status === 'sent' && <div className="orow-acts"><button className="btn-primary btn-sm" onClick={() => acceptQuote(q.id)}>Accept & place order</button><button className="btn-link" onClick={() => downloadQuote(q.id)}>Download quotation</button></div>}
          {q.orderId && <div className="orow-acts"><Link href={`/track/${q.orderId}`}>View order {q.orderId}</Link></div>}
        </div>);
    })}</div> : <p>No quotation requests. <Link href="/quote">Request a quote</Link></p>;
  } else if (tab === 'artwork') {
    const files = orders.flatMap((o) => o.items.flatMap((i) => i.files.filter((f) => !f.superseded).map((f) => ({ ...f, o: o.id, item: i.name }))));
    body = files.length ? <div className="card olist">{files.map((f) => (
      <div className="orow frow" key={f.id + f.o}>
        <span className="fbadge">{f.preview ? <img src={f.preview} alt="" /> : f.ext.toUpperCase()}</span>
        <div className="frow-main"><div className="orow-items">{f.name}</div>
          <div className="orow-meta"><span className="muted">{fileSize(f.size)} · v{f.version} · {f.item} · {f.o}</span></div></div>
        <Link className="frow-link" href={`/track/${f.o}`}>View order</Link>
      </div>))}</div> : <p>No saved artwork yet.</p>;
  } else if (tab === 'support') {
    const ts = S.tickets.filter((t) => t.email === S.user.email);
    body = <>
      {ts.length > 0 && <div className="card olist" style={{ marginBottom: 18 }}>{ts.slice().reverse().map((t) => (
        <div className="orow" key={t.id}>
          <div className="orow-top"><span className="orow-items">{t.subject}</span><span className={`st ${t.status === 'open' ? 's1' : 's10'}`}>{t.status === 'open' ? 'Open' : 'Closed'}</span></div>
          <div className="orow-meta"><span className="muted">{t.id} · {fmtDT(t.at)}{t.order ? ' · ' + t.order : ''}</span></div>
          <p className="orow-note" style={{ color: 'var(--ink-2)' }}>{t.msg}</p>
          {t.reply && <div className="treply"><b>Reply from {S.settings.company}</b>{t.reply}</div>}
        </div>))}</div>}
      <form id="ticketForm" className="card tform" onSubmit={(e) => { const fd = formData(e); e.currentTarget.reset(); submitTicket(fd); }}>
        <h3>New support ticket</h3>
        <div className="qgrid">
          <label className="field">Order (optional)<select name="order" defaultValue={sp.get('order') || ''}><option value="">None</option>{orders.map((o) => <option key={o.id}>{o.id}</option>)}</select></label>
          <label className="field">Subject<input name="subject" required placeholder="What do you need help with?" /></label>
          <label className="field qfull">Message<textarea name="msg" required rows="3" placeholder="Tell us a little more" /></label>
        </div>
        <button className="btn-primary" type="submit">Submit ticket</button>
      </form>
    </>;
  } else if (tab === 'notifications') {
    const ms = S.messages.filter((m) => m.email === S.user.email);
    body = ms.length ? <table><tbody>{ms.map((m, i) => <tr key={i}><td className="small muted" style={{ whiteSpace: 'nowrap' }}>{fmtDT(m.at)}</td><td>{m.text}</td><td className="small muted">{m.channels}</td></tr>)}</tbody></table> : <p>No notifications yet.</p>;
  } else {
    const u = S.user;
    body = (
      <form id="profileForm" className="card tform pform" onSubmit={(e) => saveProfile(formData(e))}>
        <h3>Your details</h3>
        <div className="qgrid">
          <label className="field">Name<input name="name" defaultValue={u.name} /></label>
          <label className="field">Mobile<input name="phone" type="tel" defaultValue={u.phone} /></label>
          <label className="field qfull">Email<input name="email" value={u.email} disabled readOnly /></label>
        </div>
        <h3 className="pform-sec">Saved address</h3>
        <div className="qgrid pgrid3">
          <label className="field qfull">Address<textarea name="address" rows="2" defaultValue={u.address || ''} /></label>
          <label className="field">City<input name="city" defaultValue={u.city || ''} /></label>
          <label className="field">State<input name="state" defaultValue={u.state || ''} /></label>
          <label className="field">PIN code<input name="pin" inputMode="numeric" defaultValue={u.pin || ''} /></label>
        </div>
        <div className="pform-acts"><button className="btn-primary" type="submit">Save changes</button><button type="button" className="btn-link pform-out" onClick={logout}>Sign out</button></div>
      </form>);
  }
  return (
    <div className="page dr-acct"><h1>Hello, {S.user.name}</h1>
      <nav className="tabs">{TABS.map(([k, l]) => <Link key={k} href={`/account/${k}`} className={k === tab ? 'active' : ''}>{l}</Link>)}</nav>{body}</div>
  );
}

export default function Page({ params }) {
  const { tab } = use(params);
  return <Suspense><Account tab={tab?.[0] || 'orders'} /></Suspense>;
}
