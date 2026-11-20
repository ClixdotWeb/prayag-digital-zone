'use client';
// Admin panel tabs (ported from the prototype's admin.js). Each export renders one tab.
import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES, OPERATORS, STAGES } from '@/lib/data';
import { allProducts, fmtDate, fmtDT, inr, startPrice, store, sum } from '@/lib/core';
import { session, openLabel } from '@/lib/session';
import {
  acceptQuote, adminMarkPaid, adminNext, adminSetStatus, cancelOrder, createCoupon, deleteCoupon, editProduct, exportCsv,
  recordRefund, replyTicket, saveSettings, sendQuotation, setAdminFilter, shipOrder,
} from '@/lib/actions';
import { StatusPill, Timeline } from '@/components/ui/Status';
import { FileCard, ItemFiles } from '@/components/ui/Files';
import NotFoundCard from '@/components/shop/NotFound';
import OrderTable from './OrderTable';

const S = () => store.S;
const isToday = (t) => new Date(t).toDateString() === new Date().toDateString();
export const live = () => S().orders.filter((o) => !o.cancelled);
const formData = (e) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)); };
const Stat = ({ v, children }) => <div className="stat"><div className="v">{v}</div><div className="l">{children}</div></div>;

export function Dashboard() {
  const os = live();
  const today = os.filter((o) => isToday(o.createdAt));
  const monthRev = sum(S().orders.filter((o) => new Date(o.createdAt).getMonth() === new Date().getMonth()), (o) => o.paid);
  const pending = os.filter((o) => o.status >= 1 && o.status <= 7);
  const newQ = S().quotes.filter((q) => q.status === 'new');
  const late = pending.filter((o) => o.due < Date.now());
  const attention = [
    ['Artwork to check', os.filter((o) => o.status === 1)],
    ['Waiting for customer approval', os.filter((o) => o.status === 2)],
    ['Ready to ship', os.filter((o) => o.status === 7)],
    ['Balance payment due', os.filter((o) => o.paid + 0.009 < o.totals.total)],
  ];
  return <>
    <div className="grid g4">
      <Stat v={today.length}>Orders today</Stat>
      <Stat v={inr(sum(today, (o) => o.paid), 0)}>Revenue today</Stat>
      <Stat v={inr(monthRev, 0)}>Received this month</Stat>
      <Stat v={pending.length}>Jobs in progress{late.length > 0 && <> · <span style={{ color: 'var(--bad)' }}>{late.length} late</span></>}</Stat>
      <Stat v={newQ.length}><Link href="/admin/quotes">New enquiries</Link></Stat>
      <Stat v={S().tickets.filter((t) => t.status === 'open').length}><Link href="/admin/support">Open tickets</Link></Stat>
    </div>
    <div className="grid g2 mt">{attention.map(([t, l]) => (
      <div className="card" key={t}><h3>{t} <span className="badge">{l.length}</span></h3>
        {l.length ? l.map((o) => <div className="kv" key={o.id}><Link href={`/admin/order/${o.id}`}>{o.id} · {o.customer.name}</Link><span className="small muted">{fmtDate(o.due)}</span></div>) : <p className="muted small">All clear.</p>}</div>
    ))}</div>
    <h2 className="mt">Recent orders</h2><OrderTable list={[...S().orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)} />
  </>;
}

export function Orders() {
  const f = session.adminFilter;
  const filters = [['active', 'In progress'], ['all', 'All'], ...STAGES.map((s, i) => [String(i), s.name]), ['cancelled', 'Cancelled']];
  let list = [...S().orders].sort((a, b) => b.createdAt - a.createdAt);
  if (f === 'active') list = list.filter((o) => !o.cancelled && o.status < 10);
  else if (f === 'cancelled') list = list.filter((o) => o.cancelled);
  else if (f !== 'all') list = list.filter((o) => !o.cancelled && o.status === +f);
  return <>
    <div className="row" style={{ marginBottom: 12 }}><label className="small">Show <select value={f} onChange={(e) => setAdminFilter(e.target.value)} style={{ width: 'auto' }}>{filters.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button className="btn-sm" onClick={exportCsv}>Export orders (CSV)</button></div>
    <OrderTable list={list} />
  </>;
}

export function OrderDetail({ id }) {
  const o = S().orders.find((x) => x.id === id);
  const [manual, setManual] = useState(o ? o.status : 0);
  if (!o) return <NotFoundCard />;
  let action;
  if (o.cancelled) action = <p className="st bad">Cancelled</p>;
  else if (o.status === 0) action = <><p>Waiting for payment.</p><button onClick={() => adminMarkPaid(o.id)}>Mark payment received (offline)</button></>;
  else if (o.status === 1) action = <><p>Check the artwork for size, bleed, resolution and spelling.</p><button className="btn-primary" onClick={() => adminNext(o.id)}>Artwork OK → send proof to customer</button></>;
  else if (o.status === 2) action = <><p>Waiting for the customer to approve the design.</p><button onClick={() => adminNext(o.id)}>Approve on customer&apos;s behalf (phone/WhatsApp)</button></>;
  else if (o.status >= 3 && o.status <= 6) action = <><p>With production team: <strong>{STAGES[o.status].name}</strong>.</p><Link className="btn" href="/production">Open production screen</Link></>;
  else if (o.status === 7) action = (
    <form id="shipForm" className="stack" onSubmit={(e) => shipOrder(o.id, formData(e))}>
      {o.paid + 0.009 < o.totals.total && <div className="notice warn">Balance {inr(o.totals.total - o.paid)} not yet paid.</div>}
      <div className="row"><label className="field" style={{ flex: 1 }}>Courier<select name="courier" required>{['DTDC', 'Professional Couriers', 'India Post', 'Blue Dart', 'Delhivery', 'Store pickup'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field" style={{ flex: 1 }}>Tracking number<input name="tracking" required /></label></div>
      <div className="row"><button className="btn-primary" type="submit">Mark shipped & notify customer</button><button type="button" onClick={() => openLabel(o.id)}>Print shipping label</button></div>
    </form>);
  else if (o.status === 8) action = <><p>Shipped via {o.courier} · {o.tracking}</p><button className="btn-primary" onClick={() => adminNext(o.id)}>Mark delivered</button><p className="small muted">Courier API (automatic updates) is a later phase.</p></>;
  else if (o.status === 9) action = <><p>Delivered. Auto-completes 3 days after delivery.</p><button onClick={() => adminNext(o.id)}>Complete now</button></>;
  else action = <p>Completed.</p>;
  const refunded = sum(o.refunds, (r) => r.amount);
  const ship = o.shipping || o.customer;
  return <>
    <div className="crumbs"><Link href="/admin/orders">Orders</Link> / {o.id}</div>
    <div className="row between"><h2>{o.id} · {o.customer.name}</h2><StatusPill o={o} /></div>
    <div className="pd">
      <div className="stack">
        <div className="card"><h3>Next step</h3>{action}
          <details style={{ marginTop: 12 }}><summary className="small">Set any status manually</summary>
            <div className="row" style={{ marginTop: 8 }}><select id="manualStatus" value={manual} onChange={(e) => setManual(+e.target.value)} style={{ width: 'auto' }}>{STAGES.map((s, i) => <option key={i} value={i}>{s.name}</option>)}</select>
              <button className="btn-sm" onClick={() => adminSetStatus(o.id, manual)}>Update</button></div></details></div>
        {o.items.map((it, idx) => (
          <div className="card" key={it.id}><div className="row between"><strong>{it.name} × {it.qty}</strong><span>{inr(it.total)}</span></div>
            <div className="muted small">{it.specs.join(' · ')}</div><h3 style={{ marginTop: 12 }}>Artwork</h3><ItemFiles o={o} it={it} idx={idx} mode="admin" /></div>
        ))}
        <div className="card"><h3>Customer</h3><p>{o.customer.name}<br />{o.customer.phone} · {o.customer.email}<br />
          <span className="muted">Ship to: {ship.address || ''}, {ship.city || ''}, {ship.state || ''} {ship.pin || ''}</span></p>
          {o.notes && <p className="notice">Customer note: {o.notes}</p>}
          <p className="small">Delivery: {o.method} · Operator: {o.operator || '—'} · Machine: {o.machine || '—'}</p>
          {o.prodNotes && <p className="small">Production notes: {o.prodNotes}</p>}</div>
      </div>
      <div className="stack">
        <div className="card"><h3>Tracking</h3><Timeline o={o} /></div>
        <div className="card"><h3>Payment</h3>
          <div className="kv"><span>Order total</span><span>{inr(o.totals.total)}</span></div>
          {o.payments.map((p) => <div className="kv small" key={p.id}><span>{fmtDT(p.at)} · {p.method} {p.note ? '(' + p.note + ')' : ''}</span><span>{inr(p.amount)}</span></div>)}
          {o.refunds.map((r) => <div className="kv small" key={r.id} style={{ color: 'var(--bad)' }}><span>{fmtDT(r.at)} · Refund: {r.reason}</span><span>− {inr(r.amount)}</span></div>)}
          <div className="kv total"><span>Balance due</span><span>{inr(Math.max(0, o.totals.total - o.paid))}</span></div>
          <div className="row" style={{ marginTop: 10 }}><Link className="btn btn-sm" href={`/invoice/${o.id}`}>Invoice</Link>
            {!o.cancelled && <button className="btn-sm" onClick={() => cancelOrder(o.id)}>Cancel order</button>}
            {o.paid - refunded > 0 && <button className="btn-sm" onClick={() => recordRefund(o.id)}>Record refund</button>}</div></div>
      </div>
    </div>
  </>;
}

export function Quotes() {
  const qs = [...S().quotes].sort((a, b) => b.at - a.at);
  if (!qs.length) return <p>No quote requests.</p>;
  return qs.map((q) => (
    <div className="card" style={{ marginBottom: 12 }} key={q.id}>
      <div className="row between"><h3 style={{ margin: 0 }}>{q.id} · {q.product} × {q.qty}</h3><span className="st">{q.status}</span></div>
      <div className="small muted">{fmtDT(q.at)} · {q.name} · {q.phone} · {q.email}</div><p>{q.details}</p>
      {q.files?.length > 0 && <div className="files">{q.files.map((f) => <FileCard key={f.id} f={f} />)}</div>}
      {q.status === 'new' && (
        <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={(e) => sendQuotation(q.id, formData(e))}>
          <label className="field">Price (₹, before GST)<input name="price" type="number" min="1" required /></label>
          <label className="field">Valid for (days)<input name="days" type="number" defaultValue="15" min="1" style={{ width: 90 }} /></label>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>Note to customer<input name="note" placeholder="What's included, delivery time" /></label>
          <button className="btn-primary" type="submit">Send quotation</button></form>)}
      {q.status === 'sent' && <p>Quoted <strong>{inr(q.price)}</strong> + GST, valid until {fmtDate(q.validUntil)}. Waiting for customer. <button className="btn-sm" onClick={() => acceptQuote(q.id, true)}>Convert to order now</button></p>}
      {q.orderId && <p>Converted to order <Link href={`/admin/order/${q.orderId}`}>{q.orderId}</Link></p>}
    </div>
  ));
}

export function Products() {
  // Saves on leaving the box or Enter (like the prototype's change event), so typing is not interrupted.
  const num = (p, field, step, min, w) => {
    const commit = (e) => { if (+e.target.value !== p[field]) editProduct(p.id, field, +e.target.value); };
    return <input type="number" step={step} min={min} defaultValue={p[field]} key={field + p[field]} style={{ width: w }}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(e); }} />;
  };
  return <>
    <p className="muted">Edit base price per piece, minimum quantity and production time. Option prices and quantity tiers are set per product (shown on the product page). GST: {S().settings.gstPct}%.</p>
    <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th className="num">Base ₹/pc</th><th className="num">Min qty</th><th className="num">Days</th><th className="num">Starts at</th><th>Popular</th><th>Live</th></tr></thead><tbody>
      {allProducts(true).map((p) => (
        <tr key={p.id}><td><Link href={`/product/${p.id}`}>{p.name}</Link></td><td>{CATEGORIES.find((c) => c.id === p.cat).name}</td>
          <td className="num">{num(p, 'base', '0.1', '0', 90)}</td><td className="num">{num(p, 'minQty', undefined, '1', 90)}</td><td className="num">{num(p, 'days', undefined, '1', 70)}</td>
          <td className="num">{inr(startPrice(p), 0)}</td>
          <td><input type="checkbox" checked={!!p.popular} onChange={(e) => editProduct(p.id, 'popular', e.target.checked)} /></td>
          <td><input type="checkbox" checked={p.active !== false} onChange={(e) => editProduct(p.id, 'active', e.target.checked)} /></td></tr>
      ))}
    </tbody></table></div><p className="small muted">Adding new products, photos, option groups and sub-categories is part of the full build.</p>
  </>;
}

export function Coupons() {
  return <>
    <div className="table-wrap"><table><thead><tr><th>Code</th><th>Discount</th><th className="num">Min order</th><th>Valid until</th><th className="num">Used / limit</th><th></th></tr></thead><tbody>
      {S().coupons.map((c, i) => <tr key={c.code + i}><td><strong>{c.code}</strong></td><td>{c.type === 'pct' ? c.value + '%' : inr(c.value, 0)}</td><td className="num">{inr(c.min, 0)}</td><td>{fmtDate(c.expires)}</td><td className="num">{c.used} / {c.limit}</td><td><button className="btn-sm" onClick={() => deleteCoupon(i)}>Delete</button></td></tr>)}
    </tbody></table></div>
    <form id="couponForm" className="card row mt" style={{ alignItems: 'flex-end' }} onSubmit={(e) => { const fd = formData(e); e.currentTarget.reset(); createCoupon(fd); }}>
      <label className="field">Code<input name="code" required style={{ textTransform: 'uppercase' }} /></label>
      <label className="field">Type<select name="type"><option value="pct">Percent</option><option value="flat">Flat ₹</option></select></label>
      <label className="field">Value<input name="value" type="number" min="1" required style={{ width: 90 }} /></label>
      <label className="field">Min order ₹<input name="min" type="number" min="0" defaultValue="0" style={{ width: 110 }} /></label>
      <label className="field">Valid until<input name="expires" type="date" required /></label>
      <label className="field">Usage limit<input name="limit" type="number" min="1" defaultValue="100" style={{ width: 90 }} /></label>
      <button className="btn-primary" type="submit">Create coupon</button></form>
  </>;
}

export function Payments() {
  const rows = S().orders.flatMap((o) => [...o.payments.map((p) => ({ ...p, o, kind: 'Payment' })), ...o.refunds.map((r) => ({ ...r, o, kind: 'Refund', method: r.reason }))]).sort((a, b) => b.at - a.at);
  return <>
    <div className="grid g4"><Stat v={inr(sum(rows.filter((r) => r.kind === 'Payment'), (r) => r.amount), 0)}>Total received</Stat>
      <Stat v={inr(sum(rows.filter((r) => r.kind === 'Refund'), (r) => r.amount), 0)}>Refunded</Stat>
      <Stat v={inr(sum(live(), (o) => Math.max(0, o.totals.total - o.paid)), 0)}>Balance outstanding</Stat></div>
    <div className="table-wrap mt"><table><thead><tr><th>Date</th><th>Type</th><th>Order</th><th>Customer</th><th>Method / reason</th><th>Ref</th><th className="num">Amount</th></tr></thead><tbody>
      {rows.map((r, i) => <tr key={(r.id || '') + i}><td>{fmtDT(r.at)}</td><td>{r.kind}</td><td><Link href={`/admin/order/${r.o.id}`}>{r.o.id}</Link></td><td>{r.o.customer.name}</td><td>{r.method} {r.note ? '· ' + r.note : ''}</td><td className="small muted">{r.id || ''}</td>
        <td className="num" style={r.kind === 'Refund' ? { color: 'var(--bad)' } : undefined}>{r.kind === 'Refund' ? '− ' : ''}{inr(r.amount)}</td></tr>)}
    </tbody></table></div>
  </>;
}

function customers() {
  const map = {};
  S().orders.forEach((o) => {
    const c = (map[o.customer.email] ||= { ...o.customer, orders: 0, spent: 0, last: 0 });
    c.orders++; c.spent += o.paid; c.last = Math.max(c.last, o.createdAt);
  });
  return Object.values(map).sort((a, b) => b.spent - a.spent);
}
export function Customers() {
  return (
    <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th></tr></thead><tbody>
      {customers().map((c) => <tr key={c.email}><td><strong>{c.name}</strong></td><td>{c.phone}<br /><span className="small muted">{c.email}</span></td><td className="small">{c.city || ''}, {c.state || ''}</td><td className="num">{c.orders}</td><td className="num">{inr(c.spent, 0)}</td><td>{fmtDate(c.last)}</td></tr>)}
    </tbody></table></div>
  );
}

export function Support() {
  const ts = S().tickets.slice().reverse();
  if (!ts.length) return <p>No tickets.</p>;
  return ts.map((t) => (
    <div className="card" style={{ marginBottom: 10 }} key={t.id}>
      <div className="row between"><strong>{t.id} · {t.subject}</strong><span className="st">{t.status}</span></div>
      <div className="small muted">{t.name} · {fmtDT(t.at)}{t.order ? ' · ' + t.order : ''}</div><p>{t.msg}</p>
      {t.reply ? <p className="notice">Reply: {t.reply}</p>
        : <form className="row" onSubmit={(e) => replyTicket(t.id, formData(e).reply)}><input name="reply" placeholder="Reply to customer" required style={{ flex: 1 }} /><button className="btn-primary" type="submit">Reply & close</button></form>}
    </div>
  ));
}

export function Reports() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const rev = days.map((d) => sum(S().orders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString()), (o) => o.paid));
  const max = Math.max(1, ...rev);
  const prod = {};
  S().orders.filter((o) => !o.cancelled).forEach((o) => o.items.forEach((i) => { const r = (prod[i.name] ||= { qty: 0, rev: 0, n: 0 }); r.qty += i.qty; r.rev += i.total; r.n++; }));
  const top = Object.entries(prod).sort((a, b) => b[1].rev - a[1].rev);
  const counts = STAGES.map((s, i) => [s.name, live().filter((o) => o.status === i).length]);
  const os = S().orders;
  return <>
    <div className="grid g4">
      <Stat v={os.length}>Total orders</Stat><Stat v={live().filter((o) => o.status < 10).length}>Pending</Stat>
      <Stat v={os.filter((o) => o.cancelled).length}>Cancelled</Stat>
      <Stat v={inr(sum(os, (o) => o.paid) - sum(os, (o) => sum(o.refunds, (r) => r.amount)), 0)}>Net revenue</Stat></div>
    <div className="grid g2 mt">
      <div className="card"><h3>Revenue received, last 7 days</h3><div className="bars">{rev.map((v, i) => <div key={i}><b>{v ? inr(v / 1000, 1) + 'k' : ''}</b><i style={{ height: `${(v / max) * 100}%` }} />{days[i].toLocaleDateString('en-IN', { weekday: 'short' })}</div>)}</div></div>
      <div className="card"><h3>Production status</h3>{counts.map(([n, c]) => <div className="kv" key={n}><span>{n}</span><span>{c}</span></div>)}</div>
      <div className="card"><h3>Top selling products</h3><table><thead><tr><th>Product</th><th className="num">Orders</th><th className="num">Pieces</th><th className="num">Sales</th></tr></thead><tbody>
        {top.map(([n, r]) => <tr key={n}><td>{n}</td><td className="num">{r.n}</td><td className="num">{r.qty.toLocaleString('en-IN')}</td><td className="num">{inr(r.rev, 0)}</td></tr>)}</tbody></table></div>
      <div className="card"><h3>Top customers</h3>{customers().slice(0, 6).map((c) => <div className="kv" key={c.email}><span>{c.name}</span><span>{inr(c.spent, 0)}</span></div>)}</div>
    </div><p className="mt"><button onClick={exportCsv}>Download orders report (CSV)</button></p>
  </>;
}

export function Messages() {
  return <>
    <p className="muted">Automatic email, SMS and WhatsApp messages. In the prototype they are logged here instead of being sent.</p>
    <div className="table-wrap"><table><thead><tr><th>Time</th><th>To</th><th>Message</th><th>Channels</th></tr></thead><tbody>
      {S().messages.length ? S().messages.map((m, i) => <tr key={i}><td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDT(m.at)}</td><td>{m.to}</td><td>{m.text}</td><td className="small muted">{m.channels}</td></tr>)
        : <tr><td colSpan="4" className="muted">No messages yet. Place an order or change a status.</td></tr>}
    </tbody></table></div>
  </>;
}

const ROLE_ROWS = [
  ['Owner / Admin', 'Everything'],
  ['Front office', 'Orders, quotations, customers, support. No reports or settings.'],
  ['Accounts', 'Payments, refunds, invoices, reports.'],
  ['Production', 'Production screen only: jobs, artwork download, status. No prices or customer contact details.'],
];
export function Users() {
  return <>
    <p className="muted">Each staff login is given a role. Use &quot;View as&quot; at the top right to see the Production role.</p>
    <table><thead><tr><th>Role</th><th>Can see</th></tr></thead><tbody>{ROLE_ROWS.map(([r, d]) => <tr key={r}><td><strong>{r}</strong></td><td>{d}</td></tr>)}</tbody></table>
    <h3 className="mt">Staff</h3><table><tbody>{OPERATORS.map((n) => <tr key={n}><td>{n}</td><td>Production</td></tr>)}<tr><td>Owner</td><td>Owner / Admin</td></tr></tbody></table>
  </>;
}

export function Activity() {
  return <>
    <p className="muted">Who changed what, for disputes and accountability.</p>
    <table><tbody>{S().activity.slice(0, 200).map((a, i) => <tr key={i}><td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDT(a.at)}</td><td>{a.who}</td><td>{a.what}</td></tr>)}</tbody></table>
  </>;
}

export function Settings() {
  const s = S().settings;
  return (
    <form id="settingsForm" className="grid g2" onSubmit={(e) => saveSettings(formData(e))}>
      <div className="card stack"><h3>Home page banner</h3>
        <label className="field">Headline<input name="heroTitle" defaultValue={s.heroTitle} /></label>
        <label className="field">Text<textarea name="heroText" defaultValue={s.heroText} /></label></div>
      <div className="card stack"><h3>Company & tax</h3>
        <label className="field">Company name<input name="company" defaultValue={s.company} /></label>
        <label className="field">GSTIN<input name="gstin" defaultValue={s.gstin} /></label>
        <label className="field">GST %<input name="gstPct" type="number" defaultValue={s.gstPct} /></label></div>
      <div className="card stack"><h3>Delivery charges</h3>
        <label className="field">Standard courier ₹<input name="standardFee" type="number" defaultValue={s.standardFee} /></label>
        <label className="field">Free standard delivery above ₹<input name="freeAbove" type="number" defaultValue={s.freeAbove} /></label>
        <label className="field">Express courier ₹<input name="expressFee" type="number" defaultValue={s.expressFee} /></label></div>
      <div className="card stack"><h3>Payments</h3>
        <label className="field">Advance % for part payment<input name="advancePct" type="number" min="10" max="90" defaultValue={s.advancePct} /></label>
        <p className="small muted">Razorpay keys are entered here in the live system.</p>
        <button className="btn-primary" type="submit">Save settings</button></div>
    </form>
  );
}
