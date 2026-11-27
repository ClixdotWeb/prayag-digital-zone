'use client';
// Admin pages. Each export renders one page inside AdminShell. All counts and money come from lib/metrics.js
// so Dashboard, Reports, Orders and Production always agree. Role checks (lib/roles.js) hide what a role may not use.
import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES, OPERATORS, STAGES } from '@/lib/data';
import { allProducts, DEFAULT_TIERS, fmtDate, fmtDT, isChoice, money, priced, product as getProduct, startPrice, store } from '@/lib/core';
import { openLabel } from '@/lib/session';
import {
  acceptQuote, adminMarkPaid, adminNext, adminRecordPayment, adminSetStatus, cancelOrder, createCoupon, deleteCoupon, downloadCsv, editProduct, exportCsv,
  recordRefund, replyTicket, resetAll, saveSettings, sendQuotation, shipOrder,
} from '@/lib/actions';
import {
  balanceOf, customerList, isLate, isNewQuote, isOpenTicket, kpis, needsAction, ORDER_QUEUES, ordersByStatus, ordersPlaced, pipeline, refundedOf,
  replyDue, revenueBetween, balanceOutstanding, revenueByDay, topItems,
} from '@/lib/metrics';
import { can, canOpen, STAFF_ROLES } from '@/lib/roles';
import { StatusPill, Timeline } from '@/components/ui/Status';
import { FileCard, ItemFiles } from '@/components/ui/Files';
import NotFoundCard from '@/components/shop/NotFound';
import OrderTable, { DueCell } from './OrderTable';
import PrintJob, { isPrintJob } from './PrintJob';
import { BarList, ColumnChart } from './Charts';
import { DataList, Empty, Kpi, PageHead, RangePicker, rangeQuery, TypeToConfirm, useRange } from './ui';

const S = () => store.S;
/** Orders that are not cancelled (kept for older imports). */
export const live = () => S().orders.filter((o) => !o.cancelled);
const formData = (e) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)); };
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const shortDay = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/* =====================================================================
   Dashboard
   ===================================================================== */
const URGENCY = ['Late', 'Today', ''];
function NextAction({ r }) {
  switch (r.kind) {
    case 'artwork': return can('editOrders') && <button type="button" className="btn-sm btn-primary" onClick={() => adminNext(r.id)}>Artwork OK → send proof</button>;
    case 'approval': return can('editOrders') && <button type="button" className="btn-sm" onClick={() => adminNext(r.id)}>Customer approved</button>;
    case 'ready': return can('editOrders') && <Link className="btn btn-sm" href={`/admin/order/${r.id}#ship`}>Ship…</Link>;
    case 'balance': return can('takePayment') && <button type="button" className="btn-sm" onClick={() => adminRecordPayment(r.id)}>Record {money(r.amount)}</button>;
    case 'quote': return <Link className="btn btn-sm" href={`/admin/quotes?q=${r.id}`}>Send quote</Link>;
    case 'ticket': return <Link className="btn btn-sm" href={`/admin/support?q=${r.id}`}>Reply</Link>;
    default: return null;
  }
}
const visibleFor = (r) => (r.kind === 'quote' ? canOpen('quotes') : r.kind === 'ticket' ? canOpen('support') : r.kind === 'balance' ? (can('takePayment') || can('finance')) : canOpen('order'));

function NeedsAction() {
  const [all, setAll] = useState(false);
  const rows = needsAction(S()).filter(visibleFor);
  const shown = all ? rows : rows.slice(0, 6);
  return (
    <section className="card na">
      <div className="card-h"><h2>Needs action <span className="badge">{rows.length}</span></h2><span className="small muted">Late first, then due today</span></div>
      {!rows.length ? <Empty>All clear — nothing is waiting.</Empty> : <ul className="na-list">
        {shown.map((r) => (
          <li key={r.key} className={`na-row u${r.urgency}`}>
            <span className={`na-when u${r.urgency}`}>{URGENCY[r.urgency] || shortDay(r.due)}</span>
            <span className="na-what"><b>{r.label}</b>
              <span className="small muted">{r.order || r.kind === 'balance' ? <Link href={`/admin/order/${r.id}`}>{r.id}</Link> : r.id} · {r.who}{r.order ? ` · due ${fmtDate(r.due)}` : ` · reply by ${fmtDT(r.due)}`}</span></span>
            <span className="na-act"><NextAction r={r} /></span>
          </li>
        ))}
      </ul>}
      {rows.length > 6 && <button type="button" className="btn-sm na-more" onClick={() => setAll((a) => !a)}>{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
    </section>
  );
}

function Pipeline() {
  const counts = pipeline(S().orders);
  return (
    <section className="card">
      <div className="card-h"><h2>Production pipeline</h2><span className="small muted">Open orders by stage, right now</span></div>
      <ol className="pipe">{counts.map((n, s) => (
        <li key={s}><Link href={`/admin/orders?status=stage-${s}`} className={`pipe-step${n ? '' : ' zero'}${s >= 3 && s <= 6 ? ' prod' : ''}`}>
          <b>{n}</b><span>{STAGES[s].name}</span></Link></li>
      ))}</ol>
      <p className="small muted">Highlighted steps (Design approved → Quality check) are the “Jobs in production” on the dashboard and production screen.</p>
    </section>
  );
}

function KpiGrid({ p, k, report }) {
  const fin = can('finance');
  const rq = rangeQuery(p);
  const dq = `from=${p.from}&to=${p.to}`;
  return (
    <div className="kpis">
      <Kpi label="Orders placed" value={k.orders.value} prev={k.orders.prev} p={p} fmt={num} href={`/admin/orders?status=live&${dq}`} />
      {fin && <Kpi label="Revenue received" value={k.revenue.value} prev={k.revenue.prev} p={p} fmt={money} href={`/admin/payments?${rq}`}
        sub={k.revenue.refunded ? `after ${money(k.revenue.refunded)} refunds` : undefined} />}
      {fin && report && <Kpi label="Order value (sales)" value={k.sales.value} prev={k.sales.prev} p={p} fmt={money} href={`/admin/orders?status=live&${dq}`} />}
      {fin && report && <Kpi label="Average order" value={k.avgOrder.value} fmt={money} />}
      {fin && <Kpi label="Balance outstanding" value={k.balance.value} fmt={money} href="/admin/orders?status=balance" sub={`${k.balance.count} order${k.balance.count === 1 ? '' : 's'} · right now`} />}
      <Kpi label="Jobs in production" value={k.inProduction.value} fmt={num} href="/admin/orders?status=production" sub="Approved → quality check · right now" />
      <Kpi label="Late orders" value={k.late.value} fmt={num} href="/admin/orders?status=late" tone={k.late.value ? 'alert' : ''} sub={`${k.late.today} more due today`} />
      {report && <Kpi label="Cancelled" value={k.cancelled.value} fmt={num} href={`/admin/orders?status=cancelled&${dq}`} sub="placed in this period" />}
      {canOpen('quotes') && <Kpi label="New quote requests" value={k.newQuotes.value} prev={k.newQuotes.prev} p={p} fmt={num} good="up" href="/admin/quotes?status=new" sub={`${k.newQuotes.waiting} waiting for a reply`} />}
      {canOpen('support') && <Kpi label="Open tickets" value={k.tickets.value} fmt={num} href="/admin/support" tone={k.tickets.value ? 'warn' : ''} sub={`${k.tickets.raised} raised in this period`} />}
    </div>
  );
}

function ChartsRow({ p }) {
  const rev = revenueByDay(S().orders, p);
  const status = ordersByStatus(S().orders, p);
  const top = topItems(S().orders, p);
  const dq = `from=${p.from}&to=${p.to}`;
  return (
    <div className="adm-grid charts">
      {can('finance') && <section className="card span2"><div className="card-h"><h2>Revenue received</h2><span className="small muted">Per day{p.days < 2 ? ', last 7 days' : ''} · payments minus refunds</span></div>
        <ColumnChart data={rev.map((d) => ({ value: d.value, label: rev.length > 10 ? shortDay(d.day) : new Date(d.day).toLocaleDateString('en-IN', { weekday: 'short' }), tip: fmtDate(d.day) }))}
          fmt={money} empty="No payments received in this period." /></section>}
      <section className="card"><div className="card-h"><h2>Orders by status</h2><span className="small muted">Orders placed in this period</span></div>
        <BarList rows={status.filter((s) => s.value || s.key !== 'cancelled').map((s) => ({ label: s.label, value: s.value, href: `/admin/orders?status=${s.key}&${dq}` }))}
          fmt={num} head={['Status', 'Orders']} empty="No orders placed in this period." /></section>
      <section className="card"><div className="card-h"><h2>Top products &amp; services</h2><span className="small muted">By order value, this period</span></div>
        <BarList rows={top.map((t) => ({ label: t.name, value: t.sales, sub: `${t.orders} order${t.orders === 1 ? '' : 's'} · ${num(t.qty)} pcs` }))}
          fmt={money} head={['Product / service', 'Sales']} empty="No sales in this period." /></section>
    </div>
  );
}

/** Dashboard: kept deliberately simple for daily use — 4 numbers, what needs doing, latest orders.
 *  Charts, pipeline and the full KPI set are on Reports. */
export function Dashboard() {
  const p = useRange('today');
  const k = kpis(S(), p);
  const recent = [...S().orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const waiting = k.newQuotes.waiting + k.tickets.value;
  return <>
    <RangePicker def="today" />
    <div className="kpis kpis-4">
      <Kpi label="Orders placed" value={k.orders.value} prev={k.orders.prev} p={p} fmt={num} href={`/admin/orders?status=live&from=${p.from}&to=${p.to}`} />
      {can('finance')
        ? <Kpi label="Revenue received" value={k.revenue.value} prev={k.revenue.prev} p={p} fmt={money} href={`/admin/payments?${rangeQuery(p)}`} />
        : <Kpi label="Waiting for a reply" value={waiting} fmt={num} href={canOpen('quotes') ? '/admin/quotes?status=new' : '/admin/support'} tone={waiting ? 'warn' : ''} />}
      <Kpi label="In production" value={k.inProduction.value} fmt={num} href="/admin/orders?status=production" />
      <Kpi label="Late orders" value={k.late.value} fmt={num} href="/admin/orders?status=late" tone={k.late.value ? 'alert' : ''} />
    </div>
    <NeedsAction />
    <section className="mt">
      <div className="card-h"><h2>Recent orders</h2><Link href="/admin/orders?status=all" className="small">All orders →</Link></div>
      <OrderTable list={recent} cols={can('prices') ? 'full' : 'prod'} empty="No orders yet." />
    </section>
    {can('finance') && <p className="small muted mt">Charts, production pipeline and more figures are in <Link href={`/admin/reports?${rangeQuery(p)}`}>Reports</Link>.</p>}
  </>;
}

/* =====================================================================
   Orders
   ===================================================================== */
const STATUS_OPTIONS = [
  ['open', 'Open (not shipped)'], ['all', 'All orders'], ['live', 'All except cancelled'],
  ['late', 'Late'], ['today', 'Due today'], ['payment', 'Awaiting payment'], ['artwork', 'Artwork to check'], ['approval', 'Awaiting customer approval'],
  ['production', 'In production'], ['ready', 'Ready to ship'], ['shipped', 'Shipped / delivered'], ['completed', 'Completed'], ['balance', 'Balance due'], ['cancelled', 'Cancelled'],
  ...STAGES.map((s, i) => [`stage-${i}`, `Stage: ${s.name}`]),
];
const statusTest = (o, v) => (v.startsWith('stage-') ? !o.cancelled && o.status === +v.slice(6) : (ORDER_QUEUES[v] || ORDER_QUEUES.all).test(o));

export function Orders() {
  const showMoney = can('prices');
  const columns = [
    { key: 'id', label: 'Order', value: (o) => +o.id.replace(/\D/g, ''), csv: (o) => o.id, render: (o) => <Link href={`/admin/order/${o.id}`}><strong>{o.id}</strong></Link> },
    { key: 'placed', label: 'Placed', value: (o) => o.createdAt, render: (o) => fmtDate(o.createdAt) },
    { key: 'customer', label: 'Customer', value: (o) => o.customer.name, render: (o) => <>{o.customer.name}{can('contacts') && <div className="small muted">{o.customer.phone}</div>}</> },
    { key: 'items', label: 'Items', render: (o) => o.items.map((i, k) => <div key={i.id} className={k ? 'small' : ''}>{i.name} × {num(i.qty)}</div>) },
    ...(showMoney ? [
      { key: 'total', label: 'Total', num: true, value: (o) => o.totals.total, render: (o) => money(o.totals.total) },
      { key: 'balance', label: 'Balance', num: true, value: balanceOf, render: (o) => (balanceOf(o) > 0.009 ? <span className="bal-due">{money(balanceOf(o))}</span> : <span className="muted">Paid</span>) },
    ] : []),
    { key: 'status', label: 'Status', value: (o) => (o.cancelled ? -1 : o.status), render: (o) => <StatusPill o={o} /> },
    { key: 'due', label: 'Due', value: (o) => o.due, render: (o) => <DueCell o={o} /> },
  ];
  return <DataList rows={S().orders} columns={columns} defSort="placed:desc" rowClass={(o) => (isLate(o) ? 'late' : '')}
    search={(o) => `${o.id} ${o.customer.name} ${o.customer.phone} ${o.customer.email} ${o.items.map((i) => i.name).join(' ')}`} searchLabel="Search order no, customer, phone, product"
    filters={[
      { key: 'status', label: 'Status', def: 'open', options: STATUS_OPTIONS, test: statusTest },
      ...(showMoney ? [{ key: 'pay', label: 'Payment', def: '', options: [['', 'Any'], ['paid', 'Paid in full'], ['balance', 'Balance due'], ['unpaid', 'Nothing paid']],
        test: (o, v) => (v === 'paid' ? balanceOf(o) <= 0.009 && !o.cancelled : v === 'balance' ? balanceOf(o) > 0.009 : o.paid <= 0 && !o.cancelled) }] : []),
    ]}
    date={(o) => o.createdAt} csv={showMoney ? { custom: (list) => exportCsv(list) } : undefined} empty="No orders yet." />;
}

/* =====================================================================
   Order detail
   ===================================================================== */
export function OrderDetail({ id }) {
  const o = S().orders.find((x) => x.id === id);
  const [manual, setManual] = useState(o ? o.status : 0);
  if (!o) return <><PageHead title="Order not found" /><NotFoundCard /></>;
  const edit = can('editOrders');
  const showMoney = can('prices');
  const bal = balanceOf(o);
  let action;
  if (o.cancelled) action = <p className="st bad">Cancelled</p>;
  else if (o.status === 0) action = <><p>Waiting for payment{showMoney ? ` of ${money(o.totals.total - o.paid)}` : ''}.</p>{can('takePayment') && <button type="button" onClick={() => adminMarkPaid(o.id)}>Mark payment received (offline)</button>}</>;
  else if (o.status === 1) action = <><p>Check the artwork for size, bleed, resolution and spelling.</p>{edit && <button type="button" className="btn-primary" onClick={() => adminNext(o.id)}>Artwork OK → send proof to customer</button>}</>;
  else if (o.status === 2) action = <><p>Waiting for the customer to approve the design.</p>{edit && <button type="button" onClick={() => adminNext(o.id)}>Approve on customer&apos;s behalf (phone/WhatsApp)</button>}</>;
  else if (o.status >= 3 && o.status <= 6) action = <><p>With production team: <strong>{STAGES[o.status].name}</strong>.</p>{can('production') && <Link className="btn" href="/production">Open production screen</Link>}</>;
  else if (o.status === 7) action = edit ? (
    <form id="ship" className="stack" onSubmit={(e) => shipOrder(o.id, formData(e))}>
      {bal > 0.009 && <div className="notice warn">Balance {money(bal)} not yet paid.</div>}
      <div className="row"><label className="field" style={{ flex: 1 }}>Courier<select name="courier" required>{['DTDC', 'Professional Couriers', 'India Post', 'Blue Dart', 'Delhivery', 'Store pickup'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field" style={{ flex: 1 }}>Tracking number<input name="tracking" required /></label></div>
      <div className="row"><button className="btn-primary" type="submit">Mark shipped & notify customer</button><button type="button" onClick={() => openLabel(o.id)}>Print shipping label</button></div>
    </form>) : <p>Packed and ready to ship.</p>;
  else if (o.status === 8) action = <><p>Shipped via {o.courier} · {o.tracking}</p>{edit && <button type="button" className="btn-primary" onClick={() => adminNext(o.id)}>Mark delivered</button>}<p className="small muted">Courier API (automatic updates) is a later phase.</p></>;
  else if (o.status === 9) action = <><p>Delivered. Auto-completes 3 days after delivery.</p>{edit && <button type="button" onClick={() => adminNext(o.id)}>Complete now</button>}</>;
  else action = <p>Completed.</p>;
  const refunded = refundedOf(o);
  const ship = o.shipping || o.customer;
  const addr = [ship.address, ship.city, ship.state, ship.pin].filter(Boolean).join(', ');
  return <>
    <div className="crumbs"><Link href="/admin/orders">Orders</Link> / {o.id}</div>
    <PageHead title={`${o.id} · ${o.customer.name}`} sub={`Placed ${fmtDT(o.createdAt)}${o.source === 'walk-in' ? ' · walk-in' : ''}`}><StatusPill o={o} /></PageHead>
    {isLate(o) && <div className="notice late-notice">Late — was due {fmtDate(o.due)}.</div>}
    <div className="pd">
      <div className="stack">
        <div className="card"><h3>Next step</h3>{action}
          {edit && <details style={{ marginTop: 12 }}><summary className="small">Set any status manually</summary>
            <div className="row" style={{ marginTop: 8 }}><select aria-label="Status" value={manual} onChange={(e) => setManual(+e.target.value)} style={{ width: 'auto' }}>{STAGES.map((s, i) => <option key={i} value={i}>{s.name}</option>)}</select>
              <button type="button" className="btn-sm" onClick={() => adminSetStatus(o.id, manual)}>Update</button></div></details>}</div>
        {o.items.map((it, idx) => (
          <div className="card" key={it.id}><div className="row between"><strong>{it.name}{isPrintJob(it) ? '' : ` × ${num(it.qty)}`}</strong>{showMoney && <span>{money(it.total)}</span>}</div>
            {isPrintJob(it) ? <><span className="pj-tag">Print Now</span><PrintJob it={it} showMoney={showMoney} /></>
              : <><div className="muted small">{it.specs.join(' · ')}</div><h3 style={{ marginTop: 12 }}>Artwork</h3><ItemFiles o={o} it={it} idx={idx} mode="admin" /></>}</div>
        ))}
        <div className="card"><h3>Customer</h3><p>{o.customer.name}{can('contacts') && <><br />{[o.customer.phone, o.customer.email].filter(Boolean).join(' · ')}<br />
          {addr && <span className="muted">Ship to: {addr}</span>}</>}</p>
          {o.notes && <p className="notice">Customer note: {o.notes}</p>}
          <p className="small">Delivery: {o.method} · Due {fmtDate(o.due)} · Operator: {o.operator || '—'} · Machine: {o.machine || '—'}</p>
          {o.prodNotes && <p className="small">Production notes: {o.prodNotes}</p>}</div>
      </div>
      <div className="stack">
        <div className="card"><h3>Tracking</h3><Timeline o={o} /></div>
        {showMoney && <div className="card"><h3>Payment</h3>
          <div className="kv"><span>Order total</span><span>{money(o.totals.total)}</span></div>
          {o.payments.map((p) => <div className="kv small" key={p.id}><span>{fmtDT(p.at)} · {p.method} {p.note ? '(' + p.note + ')' : ''}</span><span>{money(p.amount)}</span></div>)}
          {o.refunds.map((r) => <div className="kv small" key={r.id} style={{ color: 'var(--bad)' }}><span>{fmtDT(r.at)} · Refund: {r.reason}</span><span>− {money(r.amount)}</span></div>)}
          <div className="kv total"><span>Balance due</span><span>{money(bal)}</span></div>
          <div className="row" style={{ marginTop: 10 }}><Link className="btn btn-sm" href={`/invoice/${o.id}`}>Invoice</Link>
            {bal > 0.009 && o.status > 0 && can('takePayment') && <button type="button" className="btn-sm" onClick={() => adminRecordPayment(o.id)}>Record balance payment</button>}
            {!o.cancelled && edit && <button type="button" className="btn-sm" onClick={() => cancelOrder(o.id)}>Cancel order</button>}
            {o.paid - refunded > 0 && can('refund') && <button type="button" className="btn-sm" onClick={() => recordRefund(o.id)}>Record refund</button>}</div></div>}
      </div>
    </div>
  </>;
}

/* =====================================================================
   Quotations
   ===================================================================== */
function QuoteCard({ q }) {
  const overdue = isNewQuote(q) && replyDue(q) < Date.now();
  return (
    <div className={`card qcard${overdue ? ' late' : ''}`}>
      <div className="row between"><h3 style={{ margin: 0 }}>{q.id} · {q.product} × {num(q.qty)}</h3><span className="row" style={{ gap: 6 }}>{overdue && <span className="late-tag">Reply overdue</span>}<span className="st">{q.status}</span></span></div>
      <div className="small muted">{fmtDT(q.at)} · {q.name} · {q.phone} · {q.email}</div><p style={{ whiteSpace: 'pre-line' }}>{q.details}</p>
      {q.files?.length > 0 && <div className="files">{q.files.map((f) => <FileCard key={f.id} f={f} />)}</div>}
      {q.status === 'new' && (
        <form className="row qform" onSubmit={(e) => sendQuotation(q.id, formData(e))}>
          <label className="field">Price (₹, before GST)<input name="price" type="number" min="1" step="0.01" required /></label>
          <label className="field">Valid for (days)<input name="days" type="number" defaultValue="15" min="1" /></label>
          <label className="field qnote">Note to customer<input name="note" placeholder="What's included, delivery time" /></label>
          <button className="btn-primary" type="submit">Send quotation</button></form>)}
      {q.status === 'sent' && <p>Quoted <strong>{money(q.price)}</strong> + GST, valid until {fmtDate(q.validUntil)}. Waiting for customer. <button type="button" className="btn-sm" onClick={() => acceptQuote(q.id, true)}>Convert to order now</button></p>}
      {q.orderId && <p>Converted to order <Link href={`/admin/order/${q.orderId}`}>{q.orderId}</Link></p>}
    </div>
  );
}
export function Quotes() {
  return <DataList rows={S().quotes} rowKey={(q) => q.id} defSort="at:desc" renderCard={(q) => <QuoteCard q={q} />} empty="No quote requests yet."
    columns={[{ key: 'at', label: 'Received', value: (q) => q.at, csv: (q) => fmtDT(q.at) }, { key: 'id', label: 'Quote', value: (q) => q.id }, { key: 'name', label: 'Customer', value: (q) => q.name },
      { key: 'phone', label: 'Phone', value: (q) => q.phone, sort: false }, { key: 'product', label: 'Product', value: (q) => q.product }, { key: 'qty', label: 'Qty', value: (q) => q.qty },
      { key: 'status', label: 'Status', value: (q) => q.status, sort: false }, { key: 'price', label: 'Price (before GST)', value: (q) => q.price || 0 }]}
    search={(q) => `${q.id} ${q.name} ${q.phone} ${q.email} ${q.product} ${q.details}`} searchLabel="Search quote no, customer, phone, product"
    filters={[{ key: 'status', label: 'Status', def: '', options: [['', 'All'], ['new', 'New (needs reply)'], ['sent', 'Sent'], ['accepted', 'Accepted']], test: (q, v) => q.status === v }]}
    date={(q) => q.at} csv={{ name: 'quotations' }} />;
}

/* =====================================================================
   Products & pricing (unchanged behaviour)
   ===================================================================== */
export function Products() {
  // Saves on leaving the box or Enter (like the prototype's change event), so typing is not interrupted.
  const numIn = (p, field, step, min, w) => {
    const commit = (e) => { const v = e.target.value === '' ? null : +e.target.value; if (v !== (p[field] ?? null)) editProduct(p.id, field, v); };
    return <input type="number" step={step} min={min} defaultValue={p[field] ?? ''} key={field + p[field]} style={{ width: w }} placeholder={field === 'base' ? 'Quote' : ''} aria-label={`${p.name} ${field}`}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(e); }} />;
  };
  // Discount tiers as "2.5:10, 5:20, 10:30" = 10% off from 2.5× the minimum quantity, 20% from 5×, 30% from 10×.
  const tierText = (t) => [...(t || DEFAULT_TIERS)].sort((a, b) => a[0] - b[0]).map(([m, f]) => `${m}:${Math.round((1 - f) * 100)}`).join(', ');
  const saveTiers = (p, text) => {
    const t = text.split(',').map((s) => s.split(':').map((x) => parseFloat(x))).filter(([m, off]) => m > 0 && off >= 0 && off < 100).map(([m, off]) => [m, Math.round((1 - off / 100) * 1000) / 1000]);
    if (tierText(t) !== tierText(p.tiers)) editProduct(p.id, 'tiers', t);
  };
  const quoteChoices = allProducts(true).flatMap((p) => getProduct(p.id).options.filter(isChoice).flatMap((g) => g.choices
    .map((c, i) => ({ p, g, c, i, price: p.choicePrices?.[g.key]?.[i] })).filter((x) => x.c.quote || x.price > 0)));
  const priceChoice = (p, key, i, value) => {
    const cp = JSON.parse(JSON.stringify(p.choicePrices || {}));
    (cp[key] ||= {})[i] = Math.max(0, +value || 0);
    editProduct(p.id, 'choicePrices', cp);
  };
  return <>
    <p className="muted">Edit base price per piece, minimum quantity, production time and quantity discounts. <b>Leave the base price empty for “Quote only”</b> — the product then shows “Get a quote” instead of a price; enter a price to turn on instant pricing. GST: {S().settings.gstPct}%.</p>
    <div className="table-wrap scroll-x"><table><thead><tr><th>Product</th><th>Category</th><th className="num">Base ₹/pc</th><th className="num">Min qty</th><th className="num">Days</th><th>Discounts <span className="muted small">(× min : % off)</span></th><th className="num">Starts at</th><th>Popular</th><th>Live</th></tr></thead><tbody>
      {allProducts(true).map((p) => (
        <tr key={p.id}><td><Link href={`/product/${p.id}`}>{p.name}</Link></td><td>{CATEGORIES.find((c) => c.id === p.cat).name}</td>
          <td className="num">{numIn(p, 'base', '0.1', '0', 90)}</td><td className="num">{numIn(p, 'minQty', undefined, '1', 90)}</td><td className="num">{numIn(p, 'days', undefined, '1', 70)}</td>
          <td><input defaultValue={tierText(p.tiers)} key={'t' + tierText(p.tiers)} style={{ width: 150 }} aria-label={`${p.name} discounts`}
            onBlur={(e) => saveTiers(p, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveTiers(p, e.target.value); }} /></td>
          <td className="num">{priced(p) ? money(startPrice(p)) : <span className="q-badge">Quote only</span>}</td>
          <td><input type="checkbox" aria-label={`${p.name} popular`} checked={!!p.popular} onChange={(e) => editProduct(p.id, 'popular', e.target.checked)} /></td>
          <td><input type="checkbox" aria-label={`${p.name} live`} checked={p.active !== false} onChange={(e) => editProduct(p.id, 'active', e.target.checked)} /></td></tr>
      ))}
    </tbody></table></div>
    {quoteChoices.length > 0 && <>
      <h2 className="mt">Options priced on request</h2>
      <p className="muted small">These choices show “Get a quote” until you enter a price (₹ added per piece). Enter 0 to go back to quote.</p>
      <div className="table-wrap scroll-x"><table><thead><tr><th>Product</th><th>Option</th><th>Choice</th><th className="num">₹ added / pc</th></tr></thead><tbody>
        {quoteChoices.map(({ p, g, c, i, price }) => (
          <tr key={p.id + g.key + i}><td>{p.name}</td><td>{g.label}</td><td>{c.label}</td>
            <td className="num"><input type="number" min="0" step="0.1" defaultValue={price || ''} placeholder="Quote" key={'cp' + price} style={{ width: 90 }} aria-label={`${p.name} ${c.label} price`}
              onBlur={(e) => { if ((+e.target.value || 0) !== (price || 0)) priceChoice(p, g.key, i, e.target.value); }} /></td></tr>
        ))}
      </tbody></table></div></>}
    <p className="small muted">Adding new products, photos, option groups and sub-categories is part of the full build.</p>
  </>;
}

/* =====================================================================
   Coupons
   ===================================================================== */
export function Coupons() {
  const cs = S().coupons;
  return <>
    {cs.length ? <div className="table-wrap"><table className="rt"><thead><tr><th>Code</th><th>Discount</th><th className="num">Min order</th><th>Valid until</th><th className="num">Used / limit</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {cs.map((c, i) => <tr key={c.code + i}><td data-label="Code"><strong>{c.code}</strong></td><td data-label="Discount">{c.type === 'pct' ? c.value + '%' : money(c.value)}</td><td data-label="Min order" className="num">{money(c.min)}</td>
        <td data-label="Valid until">{fmtDate(c.expires + 'T23:59:59')}</td><td data-label="Used / limit" className="num">{c.used} / {c.limit}</td>
        <td data-label=""><button type="button" className="btn-sm" onClick={() => { if (confirm(`Delete coupon ${c.code}?`)) deleteCoupon(i); }}>Delete</button></td></tr>)}
    </tbody></table></div> : <Empty>No coupons yet. Create one below.</Empty>}
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

/* =====================================================================
   Payments
   ===================================================================== */
export function Payments() {
  const p = useRange('30d');
  const all = S().orders.flatMap((o) => [...o.payments.map((x) => ({ ...x, o, kind: 'Payment' })), ...o.refunds.map((r) => ({ ...r, o, kind: 'Refund', method: r.reason }))]);
  const rows = all.filter((r) => r.at >= p.start && r.at < p.end);
  const rev = revenueBetween(S().orders, p.start, p.end);
  return <>
    <RangePicker def="30d" />
    <div className="kpis">
      <Kpi label="Received" value={rev.paid} fmt={money} />
      <Kpi label="Refunded" value={rev.refunded} fmt={money} />
      <Kpi label="Revenue received (net)" value={rev.net} fmt={money} sub="Same figure as the dashboard" />
      <Kpi label="Balance outstanding" value={balanceOutstanding(S().orders)} fmt={money} href="/admin/orders?status=balance" sub="All orders · right now" />
    </div>
    <DataList rows={rows} rowKey={(r) => r.id + r.kind + r.at} defSort="at:desc"
      columns={[
        { key: 'at', label: 'Date', value: (r) => r.at, csv: (r) => fmtDT(r.at), render: (r) => fmtDT(r.at) },
        { key: 'kind', label: 'Type', value: (r) => r.kind, sort: false },
        { key: 'order', label: 'Order', value: (r) => r.o.id, render: (r) => <Link href={`/admin/order/${r.o.id}`}>{r.o.id}</Link> },
        { key: 'customer', label: 'Customer', value: (r) => r.o.customer.name },
        { key: 'method', label: 'Method / reason', value: (r) => `${r.method}${r.note ? ' · ' + r.note : ''}`, sort: false },
        { key: 'ref', label: 'Ref', value: (r) => r.id || '', sort: false, render: (r) => <span className="small muted">{r.id || ''}</span> },
        { key: 'amount', label: 'Amount', num: true, value: (r) => (r.kind === 'Refund' ? -r.amount : r.amount), render: (r) => <span className={r.kind === 'Refund' ? 'neg' : ''}>{r.kind === 'Refund' ? '− ' : ''}{money(r.amount)}</span> },
      ]}
      search={(r) => `${r.o.id} ${r.o.customer.name} ${r.o.customer.phone} ${r.id} ${r.method}`} searchLabel="Search order, customer, reference"
      filters={[{ key: 'type', label: 'Type', def: '', options: [['', 'All'], ['Payment', 'Payments'], ['Refund', 'Refunds']], test: (r, v) => r.kind === v }]}
      csv={{ name: 'payments' }} empty="No payments or refunds in this period." />
  </>;
}

/* =====================================================================
   Customers
   ===================================================================== */
export function Customers() {
  const showMoney = can('prices');
  return <DataList rows={customerList(S().orders)} rowKey={(c) => c.key} defSort="spent:desc"
    columns={[
      { key: 'name', label: 'Customer', value: (c) => c.name, render: (c) => <Link href={`/admin/orders?status=all&q=${encodeURIComponent(c.phone || c.name)}`}><strong>{c.name}</strong></Link> },
      ...(can('contacts') ? [{ key: 'phone', label: 'Phone', value: (c) => c.phone || '', sort: false }, { key: 'email', label: 'Email', value: (c) => c.email || '', sort: false, render: (c) => <span className="small">{c.email || '—'}</span> }] : []),
      { key: 'city', label: 'City', value: (c) => [c.city, c.state].filter(Boolean).join(', ') || '—', sort: false },
      { key: 'orders', label: 'Orders', num: true, value: (c) => c.orders },
      ...(showMoney ? [{ key: 'spent', label: 'Paid (net)', num: true, value: (c) => c.spent, render: (c) => money(c.spent) },
        { key: 'balance', label: 'Balance', num: true, value: (c) => c.balance, render: (c) => (c.balance > 0.009 ? <span className="bal-due">{money(c.balance)}</span> : '—') }] : []),
      { key: 'last', label: 'Last order', value: (c) => c.last, csv: (c) => fmtDate(c.last), render: (c) => fmtDate(c.last) },
    ]}
    search={(c) => `${c.name} ${c.phone} ${c.email} ${c.city}`} searchLabel="Search name, phone, email, city" csv={{ name: 'customers' }} empty="No customers yet." />;
}

/* =====================================================================
   Support
   ===================================================================== */
function TicketCard({ t }) {
  const overdue = isOpenTicket(t) && replyDue(t) < Date.now();
  return (
    <div className={`card${overdue ? ' late' : ''}`}>
      <div className="row between"><strong>{t.id} · {t.subject}</strong><span className="row" style={{ gap: 6 }}>{overdue && <span className="late-tag">Reply overdue</span>}<span className="st">{t.status}</span></span></div>
      <div className="small muted">{t.name} · {fmtDT(t.at)}{t.order ? <> · <Link href={`/admin/order/${t.order}`}>{t.order}</Link></> : ''}</div><p>{t.msg}</p>
      {t.reply ? <p className="notice">Reply: {t.reply}</p>
        : <form className="row" onSubmit={(e) => replyTicket(t.id, formData(e).reply)}><input name="reply" aria-label={`Reply to ${t.id}`} placeholder="Reply to customer" required style={{ flex: 1, minWidth: 200 }} /><button className="btn-primary" type="submit">Reply & close</button></form>}
    </div>
  );
}
export function Support() {
  return <DataList rows={S().tickets} rowKey={(t) => t.id} defSort="at:desc" renderCard={(t) => <TicketCard t={t} />} empty="No support tickets."
    columns={[{ key: 'at', label: 'Raised', value: (t) => t.at, csv: (t) => fmtDT(t.at) }, { key: 'id', label: 'Ticket', value: (t) => t.id }, { key: 'name', label: 'Customer', value: (t) => t.name },
      { key: 'subject', label: 'Subject', value: (t) => t.subject, sort: false }, { key: 'status', label: 'Status', value: (t) => t.status, sort: false }]}
    search={(t) => `${t.id} ${t.name} ${t.email} ${t.subject} ${t.order || ''}`} searchLabel="Search ticket, customer, order"
    filters={[{ key: 'status', label: 'Status', def: 'open', options: [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']], test: (t, v) => v === 'all' || t.status === v }]}
    csv={{ name: 'tickets' }} />;
}

/* =====================================================================
   Reports
   ===================================================================== */
export function Reports() {
  const p = useRange('30d');
  const k = kpis(S(), p);
  const placed = S().orders.filter((o) => o.createdAt >= p.start && o.createdAt < p.end);
  const custs = customerList(ordersPlaced(S().orders, p.start, p.end)).slice(0, 6);
  const exportPayments = () => downloadCsv('payments', ['Date', 'Type', 'Order', 'Customer', 'Method / reason', 'Ref', 'Amount'],
    S().orders.flatMap((o) => [...o.payments.map((x) => [x.at, 'Payment', o.id, o.customer.name, x.method, x.id, x.amount]), ...o.refunds.map((r) => [r.at, 'Refund', o.id, o.customer.name, r.reason, r.id, -r.amount])])
      .filter((r) => r[0] >= p.start && r[0] < p.end).sort((a, b) => a[0] - b[0]).map((r) => [fmtDT(r[0]), ...r.slice(1)]));
  return <>
    <RangePicker def="30d" />
    <KpiGrid p={p} k={k} report />
    <ChartsRow p={p} />
    <div className="adm-grid two">
      <Pipeline />
      <section className="card"><div className="card-h"><h2>Top customers</h2><span className="small muted">Paid (net) on orders placed in this period</span></div>
        <BarList rows={custs.map((c) => ({ label: c.name, value: c.spent, sub: `${c.orders} order${c.orders === 1 ? '' : 's'}` }))} fmt={money} head={['Customer', 'Paid (net)']} empty="No customers in this period." /></section>
    </div>
    <div className="row mt">
      <button type="button" onClick={() => exportCsv(placed)} disabled={!placed.length}>Download orders in period (CSV, {placed.length})</button>
      <button type="button" onClick={exportPayments}>Download payments in period (CSV)</button>
    </div>
  </>;
}

/* =====================================================================
   Messages, staff, activity, settings
   ===================================================================== */
export function Messages() {
  return <>
    <p className="muted">Automatic email, SMS and WhatsApp messages. In the prototype they are logged here instead of being sent.</p>
    <DataList rows={S().messages.map((m, i) => ({ ...m, i }))} rowKey={(m) => m.i} defSort="at:desc"
      columns={[{ key: 'at', label: 'Time', value: (m) => m.at, csv: (m) => fmtDT(m.at), render: (m) => <span className="nowrap">{fmtDT(m.at)}</span> },
        { key: 'to', label: 'To', value: (m) => m.to }, { key: 'text', label: 'Message', value: (m) => m.text, sort: false }, { key: 'ch', label: 'Channels', value: (m) => m.channels, sort: false, render: (m) => <span className="small muted">{m.channels}</span> }]}
      search={(m) => `${m.to} ${m.email} ${m.text}`} searchLabel="Search recipient or message" csv={{ name: 'messages' }} empty="No messages yet. Place an order or change a status." />
  </>;
}

const ROLE_ROWS = [
  ['owner', 'Everything, including settings, prices, staff and the production screen.'],
  ['front', 'Dashboard (no revenue figures), orders, walk-in orders, quotations, customers, support.'],
  ['accounts', 'Dashboard, payments, refunds, invoices, reports, customers. Can view orders but not change their status.'],
  ['production', 'Production screen only: jobs, artwork download, operator, machine, status. No prices or customer contact details.'],
];
export function Users() {
  return <>
    <div className="notice warn">Prototype: the role is chosen in “View as” and kept in this browser. Menus and page blocking are for convenience, not security — real staff logins and server checks are needed before going live.</div>
    <h2 className="mt">Roles</h2>
    <div className="table-wrap"><table className="rt"><thead><tr><th>Role</th><th>Can use</th></tr></thead><tbody>{ROLE_ROWS.map(([r, d]) => <tr key={r}><td data-label="Role"><strong>{STAFF_ROLES[r].label}</strong></td><td data-label="Can use">{d}</td></tr>)}</tbody></table></div>
    <h2 className="mt">Staff</h2>
    <div className="table-wrap"><table className="rt"><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody>
      <tr><td data-label="Name">Owner</td><td data-label="Role">Owner</td></tr>
      {OPERATORS.map((n) => <tr key={n}><td data-label="Name">{n}</td><td data-label="Role">Production</td></tr>)}
    </tbody></table></div>
    <p className="small muted">Adding staff logins and assigning roles is part of the full build.</p>
  </>;
}

export function Activity() {
  return <>
    <p className="muted">Who changed what, for disputes and accountability.</p>
    <DataList rows={S().activity.map((a, i) => ({ ...a, i }))} rowKey={(a) => a.i} defSort="at:desc" pageSize={50}
      columns={[{ key: 'at', label: 'Time', value: (a) => a.at, csv: (a) => fmtDT(a.at), render: (a) => <span className="nowrap">{fmtDT(a.at)}</span> },
        { key: 'who', label: 'Who', value: (a) => a.who }, { key: 'what', label: 'What', value: (a) => a.what, sort: false }]}
      search={(a) => `${a.who} ${a.what}`} searchLabel="Search who or what (e.g. PO-1004)" date={(a) => a.at} csv={{ name: 'activity' }} empty="No activity yet." />
  </>;
}

export function Settings() {
  const s = S().settings;
  return <>
    <form id="settingsForm" className="adm-grid two" onSubmit={(e) => saveSettings(formData(e))}>
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
    <section className="card danger-zone mt">
      <h3>Demo data</h3>
      <TypeToConfirm word="RESET" label="Type RESET to confirm" button="Reset demo data" onConfirm={resetAll}>
        <p className="small">Deletes every order, quotation, ticket, message, coupon change, product edit and setting saved in this browser, and loads the demo data again. This cannot be undone.</p>
      </TypeToConfirm>
    </section>
  </>;
}
