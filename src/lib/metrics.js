// Shared business metrics — the ONE place where "late", "in production", "revenue" etc. are defined.
// Used by the admin Dashboard, Reports, Orders filters, sidebar badges and the Production screen,
// so the same number shows the same value on every page. Pure functions, no imports (tested in tests/metrics.test.mjs).

export const DAY_MS = 86400000;

/* ---------- Order status numbers (index into STAGES in data.js) ---------- */
export const ST = { PLACED: 0, PAID: 1, ARTWORK_OK: 2, APPROVED: 3, PRINTING: 4, FINISHING: 5, QC: 6, PACKED: 7, SHIPPED: 8, DELIVERED: 9, COMPLETED: 10 };

const r2 = (n) => Math.round(n * 100) / 100;
const sumOf = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

/* ---------- Order predicates ---------- */
/** Not cancelled. */
export const isLive = (o) => !o.cancelled;
/** Still with us: not cancelled and not yet shipped (status 0–7). */
export const isOpen = (o) => !o.cancelled && o.status <= ST.PACKED;
/** Waiting for the first payment (status 0). */
export const isAwaitingPayment = (o) => !o.cancelled && o.status === ST.PLACED;
/** Paid, artwork not checked yet (status 1). */
export const isArtworkToCheck = (o) => !o.cancelled && o.status === ST.PAID;
/** Proof sent, waiting for the customer to approve (status 2). */
export const isAwaitingApproval = (o) => !o.cancelled && o.status === ST.ARTWORK_OK;
/** On the print floor: design approved → printing → finishing → quality check (status 3–6). Same as the Production job queue. */
export const isInProduction = (o) => !o.cancelled && o.status >= ST.APPROVED && o.status <= ST.QC;
/** Packed, waiting to be shipped or collected (status 7). */
export const isReadyToShip = (o) => !o.cancelled && o.status === ST.PACKED;
/** Open order whose due date has passed. */
export const isLate = (o, now = Date.now()) => isOpen(o) && o.due < now;
/** Open order due today (and not already late). */
export const isDueToday = (o, now = Date.now()) => isOpen(o) && !isLate(o, now) && sameDay(o.due, now);
/** Amount still to collect. Cancelled orders owe nothing. */
export const balanceOf = (o) => (o.cancelled ? 0 : Math.max(0, r2(o.totals.total - o.paid)));
export const hasBalance = (o) => balanceOf(o) > 0.009;
export const refundedOf = (o) => r2(sumOf(o.refunds || [], (r) => r.amount));

/** Named order lists — used by Orders filters (?status=<key>), KPI links and badges. */
export const ORDER_QUEUES = {
  open: { label: 'Open (not shipped)', test: isOpen },
  payment: { label: 'Awaiting payment', test: isAwaitingPayment },
  artwork: { label: 'Artwork to check', test: isArtworkToCheck },
  approval: { label: 'Awaiting customer approval', test: isAwaitingApproval },
  production: { label: 'In production', test: isInProduction },
  ready: { label: 'Ready to ship', test: isReadyToShip },
  late: { label: 'Late', test: (o) => isLate(o) },
  today: { label: 'Due today', test: (o) => isDueToday(o) },
  balance: { label: 'Balance due', test: hasBalance },
  shipped: { label: 'Shipped / delivered', test: (o) => !o.cancelled && (o.status === ST.SHIPPED || o.status === ST.DELIVERED) },
  completed: { label: 'Completed', test: (o) => !o.cancelled && o.status === ST.COMPLETED },
  live: { label: 'All except cancelled', test: isLive },
  cancelled: { label: 'Cancelled', test: (o) => !!o.cancelled },
  all: { label: 'All orders', test: () => true },
};

/* ---------- Quotes and tickets ---------- */
/** We aim to reply to a new quote request or support ticket within 1 day; after that it counts as late. */
export const REPLY_WITHIN_MS = DAY_MS;
export const isNewQuote = (q) => q.status === 'new';
export const isOpenTicket = (t) => t.status === 'open';
export const replyDue = (x) => x.at + REPLY_WITHIN_MS;

/* ---------- Dates and periods ---------- */
export const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const sameDay = (a, b) => startOfDay(a) === startOfDay(b);
/** "2026-11-27" (local) → timestamp at local midnight. */
export const parseDay = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
/** timestamp → "2026-11-27" (local). */
export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };

export const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['custom', 'Custom']];

/**
 * A period [start, end) plus the previous period of the same length, for comparisons.
 * key: 'today' | '7d' | '30d' | 'custom' (from/to are "YYYY-MM-DD", inclusive).
 */
export function period(key = '7d', from, to, now = Date.now()) {
  const today = startOfDay(now);
  let start, end;
  if (key === 'custom' && from && to) {
    start = parseDay(from); end = addDays(parseDay(to), 1);
    if (end <= start) [start, end] = [parseDay(to), addDays(parseDay(from), 1)];
  } else if (key === 'today') { start = today; end = addDays(today, 1); }
  else if (key === '30d') { start = addDays(today, -29); end = addDays(today, 1); }
  else { key = '7d'; start = addDays(today, -6); end = addDays(today, 1); } // unknown key or custom without dates
  const days = Math.round((end - start) / DAY_MS);
  return { key, start, end, days, prevStart: addDays(start, -days), prevEnd: start, from: dayKey(start), to: dayKey(end - 1) };
}
const inRange = (t, a, b) => t >= a && t < b;

/* ---------- Money ---------- */
/** Revenue received in [a, b): payments dated in the range minus refunds dated in the range (by payment date, not order date). */
export function revenueBetween(orders, a, b) {
  let paid = 0, refunded = 0;
  for (const o of orders) {
    for (const p of o.payments || []) if (inRange(p.at, a, b)) paid += p.amount;
    for (const r of o.refunds || []) if (inRange(r.at, a, b)) refunded += r.amount;
  }
  return { paid: r2(paid), refunded: r2(refunded), net: r2(paid - refunded) };
}
/** Balance outstanding right now, across all non-cancelled orders. */
export const balanceOutstanding = (orders) => r2(sumOf(orders, balanceOf));

/* ---------- Counts ---------- */
/** Orders placed in [a, b), not cancelled. */
export const ordersPlaced = (orders, a, b) => orders.filter((o) => !o.cancelled && inRange(o.createdAt, a, b));
export const countBy = (list, test) => list.filter(test).length;

/** Every KPI shown on the Dashboard / Reports for one period. Flow metrics have `prev` for comparison; snapshot metrics are "right now". */
export function kpis(S, p, now = Date.now()) {
  const os = S.orders;
  const cur = ordersPlaced(os, p.start, p.end), prev = ordersPlaced(os, p.prevStart, p.prevEnd);
  const rev = revenueBetween(os, p.start, p.end), revPrev = revenueBetween(os, p.prevStart, p.prevEnd);
  return {
    orders: { value: cur.length, prev: prev.length },
    sales: { value: r2(sumOf(cur, (o) => o.totals.total)), prev: r2(sumOf(prev, (o) => o.totals.total)) },
    revenue: { value: rev.net, prev: revPrev.net, paid: rev.paid, refunded: rev.refunded },
    balance: { value: balanceOutstanding(os), count: countBy(os, hasBalance) },
    inProduction: { value: countBy(os, isInProduction) },
    late: { value: countBy(os, (o) => isLate(o, now)), today: countBy(os, (o) => isDueToday(o, now)) },
    newQuotes: { value: S.quotes.filter((q) => inRange(q.at, p.start, p.end)).length, prev: S.quotes.filter((q) => inRange(q.at, p.prevStart, p.prevEnd)).length, waiting: countBy(S.quotes, isNewQuote) },
    tickets: { value: countBy(S.tickets, isOpenTicket), raised: S.tickets.filter((t) => inRange(t.at, p.start, p.end)).length, prev: S.tickets.filter((t) => inRange(t.at, p.prevStart, p.prevEnd)).length },
    cancelled: { value: os.filter((o) => o.cancelled && inRange(o.createdAt, p.start, p.end)).length },
    avgOrder: { value: cur.length ? r2(sumOf(cur, (o) => o.totals.total) / cur.length) : 0 },
  };
}

/** Change vs previous period: { diff, pct (null when prev is 0), dir: 'up'|'down'|'flat' }. */
export function change(value, prev) {
  const diff = r2(value - prev);
  return { diff, pct: prev ? Math.round((diff / prev) * 100) : null, dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
}

/** Sidebar badges: things waiting for someone. */
export const badges = (S) => ({
  quotes: countBy(S.quotes, isNewQuote),
  support: countBy(S.tickets, isOpenTicket),
  orders: countBy(S.orders, isArtworkToCheck),
});

/** Live orders per status 0–9 (completed and cancelled left out) — the production pipeline. */
export const pipeline = (orders) => Array.from({ length: 10 }, (_, s) => countBy(orders, (o) => !o.cancelled && o.status === s));

/** Revenue received per day in the period (for Today, the last 7 days so the chart has a shape). */
export function revenueByDay(orders, p) {
  const start = p.days < 2 ? addDays(p.start, -6) : p.start;
  const out = [];
  for (let t = start; t < p.end; t = addDays(t, 1)) out.push({ day: t, value: revenueBetween(orders, t, addDays(t, 1)).net });
  return out;
}

/** Orders placed in the period, grouped into the stages a shop owner thinks in. */
export const STATUS_GROUPS = [
  ['Awaiting payment', 'payment', isAwaitingPayment],
  ['Artwork & approval', 'artwork', (o) => isArtworkToCheck(o) || isAwaitingApproval(o)],
  ['In production', 'production', isInProduction],
  ['Ready to ship', 'ready', isReadyToShip],
  ['Shipped / delivered', 'shipped', (o) => !o.cancelled && (o.status === ST.SHIPPED || o.status === ST.DELIVERED)],
  ['Completed', 'completed', (o) => !o.cancelled && o.status === ST.COMPLETED],
  ['Cancelled', 'cancelled', (o) => !!o.cancelled],
];
export const ordersByStatus = (orders, p) => {
  const list = orders.filter((o) => inRange(o.createdAt, p.start, p.end));
  return STATUS_GROUPS.map(([label, key, test]) => ({ label, key, value: countBy(list, test) }));
};

/** Top products & services by sales (item totals) for orders placed in the period, not cancelled. */
export function topItems(orders, p, n = 6) {
  const m = {};
  for (const o of ordersPlaced(orders, p.start, p.end)) {
    for (const i of o.items) { const r = (m[i.name] ||= { name: i.name, qty: 0, sales: 0, orders: 0 }); r.qty += i.qty; r.sales = r2(r.sales + i.total); r.orders++; }
  }
  return Object.values(m).sort((a, b) => b.sales - a.sales).slice(0, n);
}

/** One entry per customer (email, or phone for walk-ins without email). */
export function customerList(orders) {
  const m = {};
  for (const o of orders) {
    const key = (o.customer.email || o.customer.phone || o.customer.name || '').toLowerCase();
    const c = (m[key] ||= { ...o.customer, key, orders: 0, spent: 0, balance: 0, last: 0 });
    c.orders++; c.spent = r2(c.spent + o.paid - refundedOf(o)); c.balance = r2(c.balance + balanceOf(o)); c.last = Math.max(c.last, o.createdAt);
  }
  return Object.values(m).sort((a, b) => b.spent - a.spent);
}

/**
 * "Needs action" list: one row per thing someone must do, late first, then due today, then the rest by due time.
 * kind: artwork | approval | ready | balance | quote | ticket
 */
export function needsAction(S, now = Date.now()) {
  const rows = [];
  for (const o of S.orders) {
    if (o.cancelled) continue;
    const base = { id: o.id, order: o, who: o.customer.name, due: o.due };
    if (isArtworkToCheck(o)) rows.push({ ...base, kind: 'artwork', label: 'Artwork to check' });
    else if (isAwaitingApproval(o)) rows.push({ ...base, kind: 'approval', label: 'Awaiting customer approval' });
    else if (isReadyToShip(o)) rows.push({ ...base, kind: 'ready', label: 'Ready to ship' });
    if (hasBalance(o)) rows.push({ ...base, key: o.id + '-bal', kind: 'balance', label: `Balance due`, amount: balanceOf(o) });
  }
  for (const q of S.quotes) if (isNewQuote(q)) rows.push({ id: q.id, quote: q, who: q.name, due: replyDue(q), kind: 'quote', label: 'New quote request' });
  for (const t of S.tickets) if (isOpenTicket(t)) rows.push({ id: t.id, ticket: t, who: t.name, due: replyDue(t), kind: 'ticket', label: `Open ticket: ${t.subject}` });
  const today0 = startOfDay(now), today1 = addDays(today0, 1);
  for (const r of rows) {
    r.key ||= r.id + '-' + r.kind;
    r.urgency = r.due < now ? 0 : r.due < today1 ? 1 : 2; // 0 late, 1 due today, 2 later
  }
  return rows.sort((a, b) => a.urgency - b.urgency || a.due - b.due);
}
