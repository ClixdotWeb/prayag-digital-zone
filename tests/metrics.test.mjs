// Shared admin metrics: one definition each, used by Dashboard, Reports, Orders and Production.  Run:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../src/lib/metrics.js');
const DAY = M.DAY_MS;
const NOW = new Date(2026, 10, 27, 12, 0).getTime(); // 27 Nov 2026, noon local

const order = (id, status, extra = {}) => ({
  id, status, cancelled: false, createdAt: NOW - DAY, due: NOW + 2 * DAY, customer: { name: id, email: `${id}@x`, phone: '9000000000' },
  totals: { total: 1000 }, paid: 1000, payments: [{ id: 'p' + id, amount: 1000, at: NOW - DAY }], refunds: [], items: [{ name: 'Flyers', qty: 100, total: 847.46 }], ...extra,
});

test('status predicates: production = 3–6, open = 0–7, cancelled excluded', () => {
  const os = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => order('O' + s, s));
  os.push(order('X', 4, { cancelled: true }));
  assert.equal(os.filter(M.isInProduction).length, 4);
  assert.equal(os.filter(M.isOpen).length, 8);
  assert.equal(os.filter(M.isArtworkToCheck).length, 1);
  assert.equal(os.filter(M.isAwaitingApproval).length, 1);
  assert.equal(os.filter(M.isReadyToShip).length, 1);
  // The dashboard KPI and the production screen both use isInProduction, so they can never differ again.
  assert.deepEqual(M.pipeline(os).slice(3, 7), [1, 1, 1, 1]);
});

test('late: open orders past due; shipped and cancelled are never late', () => {
  assert.equal(M.isLate(order('a', 4, { due: NOW - 1 }), NOW), true);
  assert.equal(M.isLate(order('b', 8, { due: NOW - DAY }), NOW), false);
  assert.equal(M.isLate(order('c', 4, { due: NOW - DAY, cancelled: true }), NOW), false);
  assert.equal(M.isDueToday(order('d', 4, { due: NOW + 3600000 }), NOW), true);
  assert.equal(M.isDueToday(order('e', 4, { due: NOW - 3600000 }), NOW), false, 'already late, not "due today"');
});

test('balance: never negative, zero for cancelled', () => {
  assert.equal(M.balanceOf(order('a', 1, { paid: 400 })), 600);
  assert.equal(M.balanceOf(order('b', 1, { paid: 1200 })), 0);
  assert.equal(M.balanceOf(order('c', 1, { paid: 0, cancelled: true })), 0);
  assert.equal(M.balanceOutstanding([order('a', 1, { paid: 400 }), order('b', 1, { paid: 999.5 })]), 600.5);
});

test('periods: today / 7d / 30d / custom, and previous period of equal length', () => {
  const t = M.period('today', '', '', NOW);
  assert.equal(t.days, 1);
  assert.equal(t.start, M.startOfDay(NOW));
  assert.equal(t.prevEnd, t.start);
  const w = M.period('7d', '', '', NOW);
  assert.equal(w.days, 7);
  assert.equal(w.to, '2026-11-27');
  assert.equal(w.from, '2026-11-21');
  assert.equal(M.period('30d', '', '', NOW).days, 30);
  const c = M.period('custom', '2026-11-01', '2026-11-10', NOW);
  assert.equal(c.days, 10);
  assert.equal(c.prevStart, M.parseDay('2026-10-22'));
  assert.equal(M.period('custom', '2026-11-10', '2026-11-01', NOW).days, 10, 'swapped dates still work');
  assert.equal(M.period('nonsense', '', '', NOW).key, '7d');
});

test('revenue counts payments and refunds by their own date, not the order date', () => {
  const o = order('a', 3, { createdAt: NOW - 40 * DAY, payments: [{ amount: 500, at: NOW - 40 * DAY }, { amount: 500, at: NOW - DAY }], refunds: [{ amount: 100, at: NOW - 2 * DAY }] });
  const p = M.period('7d', '', '', NOW);
  assert.deepEqual(M.revenueBetween([o], p.start, p.end), { paid: 500, refunded: 100, net: 400 });
});

test('kpis: flow metrics compare with previous period, snapshot metrics do not depend on the range', () => {
  const S = {
    orders: [order('a', 4, { createdAt: NOW - DAY }), order('b', 1, { createdAt: NOW - 8 * DAY, due: NOW - DAY, paid: 0, payments: [] }), order('c', 2, { createdAt: NOW, cancelled: true })],
    quotes: [{ id: 'Q1', status: 'new', at: NOW - 2 * DAY }, { id: 'Q2', status: 'sent', at: NOW - 9 * DAY }],
    tickets: [{ id: 'T1', status: 'open', at: NOW - DAY }],
  };
  const k = M.kpis(S, M.period('7d', '', '', NOW), NOW);
  assert.equal(k.orders.value, 1); // cancelled order not counted
  assert.equal(k.orders.prev, 1);
  assert.equal(k.inProduction.value, 1);
  assert.equal(k.late.value, 1);
  assert.equal(k.balance.value, 1000);
  assert.equal(k.newQuotes.value, 1);
  assert.equal(k.newQuotes.waiting, 1);
  assert.equal(k.tickets.value, 1);
  const k30 = M.kpis(S, M.period('30d', '', '', NOW), NOW);
  assert.equal(k30.inProduction.value, k.inProduction.value);
  assert.equal(k30.balance.value, k.balance.value);
  assert.deepEqual(M.badges(S), { quotes: 1, support: 1, orders: 1 });
});

test('change: percentage vs previous, null when previous is zero', () => {
  assert.deepEqual(M.change(15, 10), { diff: 5, pct: 50, dir: 'up' });
  assert.deepEqual(M.change(0, 4), { diff: -4, pct: -100, dir: 'down' });
  assert.equal(M.change(3, 0).pct, null);
  assert.equal(M.change(2, 2).dir, 'flat');
});

test('needs action: late first, then due today, then later', () => {
  const S = {
    orders: [order('later', 1, { due: NOW + 5 * DAY }), order('late', 2, { due: NOW - DAY }), order('today', 7, { due: NOW + 3600000 }), order('bal', 4, { paid: 500 })],
    quotes: [{ id: 'Q1', name: 'Q', status: 'new', at: NOW - 2 * DAY }],
    tickets: [],
  };
  const rows = M.needsAction(S, NOW);
  assert.deepEqual(rows.map((r) => r.urgency), [...rows.map((r) => r.urgency)].sort());
  assert.equal(rows[0].urgency, 0);
  assert.ok(rows.some((r) => r.kind === 'balance' && r.amount === 500));
  assert.ok(rows.some((r) => r.kind === 'quote' && r.urgency === 0), 'quote older than a day is overdue');
  assert.equal(new Set(rows.map((r) => r.key)).size, rows.length, 'row keys are unique');
});

test('customer list merges by email, falls back to phone for walk-ins', () => {
  const a = order('a', 10), b = order('b', 10, { customer: { name: 'A again', email: 'a@x', phone: '1' } });
  const w = order('w', 1, { customer: { name: 'Walk-in', email: '', phone: '+91 98470 00000' }, paid: 200 });
  const list = M.customerList([a, b, w]);
  assert.equal(list.length, 2);
  assert.equal(list.find((c) => c.key === 'a@x').orders, 2);
  assert.equal(list.find((c) => c.name === 'Walk-in').balance, 800);
});
