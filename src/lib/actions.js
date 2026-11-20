// Every operation that changes data, ported from the prototype's app.js / shop.js.
// Today they change the in-browser state (store.S) and call save().
// When the Next.js backend is built, these become calls to API routes / server actions —
// the pages and components do not need to change.
import { STAGES } from './data';
import {
  store, DAY, DEMO_USER, inr, round2, uid, sum, product, defaultSel, makeItem, repriceItem, totals,
  save, rerender, resetDemo, setStatus, notify, log, toast,
} from './core';
import { session, navigate, openCart, closeCart, openPay } from './session';

const S = () => store.S;
const findOrder = (id) => S().orders.find((o) => o.id === id);

/* ---------- Product configurator ---------- */
export function initCfg(p) {
  if (!session.cfg || session.cfg.pid !== p.id) session.cfg = { pid: p.id, sel: defaultSel(p), qty: p.minQty, custom: { w: 210, h: 297 }, files: [] };
  return session.cfg;
}
export function pickOption(p, key, i) {
  const cfg = session.cfg;
  const g = p.options.find((x) => x.key === key);
  if (g.multi) {
    const arr = cfg.sel[g.key] || [];
    cfg.sel[g.key] = arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i];
  } else cfg.sel[g.key] = i;
  rerender();
}
export function setCfg(field, value) {
  if (field === 'qty') session.cfg.qty = value; else session.cfg.custom[field] = +value;
  rerender();
}
export function addCfgFiles(recs) { session.cfg.files.push(...recs); toast(`${recs.length} file(s) uploaded`); rerender(); }
export function removeCfgFile(id) { session.cfg.files = session.cfg.files.filter((f) => f.id !== id); rerender(); }
function addCfgToCart() {
  const cfg = session.cfg;
  const p = product(cfg.pid);
  const custom = p.options.some((g) => !g.multi && g.choices[cfg.sel[g.key]]?.custom) ? cfg.custom : null;
  S().cart.push(makeItem(cfg.pid, cfg.sel, Math.max(p.minQty, parseInt(cfg.qty, 10) || p.minQty), custom, cfg.files));
  session.cfg = null;
  save();
}
export function addToCart() { addCfgToCart(); openCart(true); }
export function buyNow() { addCfgToCart(); navigate('/cart'); }

/* ---------- Cart, wishlist ---------- */
export function quickAdd(pid) {
  const p = product(pid);
  S().cart.push(makeItem(p.id, defaultSel(p), p.minQty, null, []));
  save();
  openCart(true);
}
export function drawerRemove(id) { S().cart = S().cart.filter((i) => i.id !== id); save(); }
export function toggleWish(id) {
  const w = S().wishlist;
  S().wishlist = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
  save();
}
function moveItem(from, to, id) {
  const i = from.findIndex((x) => x.id === id);
  if (i > -1) to.push(from.splice(i, 1)[0]);
  save();
}
export function saveForLater(id) { moveItem(S().cart, S().saved, id); }
export function moveToCart(id) { moveItem(S().saved, S().cart, id); }
export function removeItem(id, saved) { const k = saved ? 'saved' : 'cart'; S()[k] = S()[k].filter((i) => i.id !== id); save(); }
export function setCartQty(id, value) {
  const it = S().cart.find((i) => i.id === id);
  const p = product(it.pid);
  it.qty = Math.max(p.minQty, parseInt(value, 10) || p.minQty);
  repriceItem(it); save();
}
export function applyCoupon(code) {
  S().coupon = code.trim().toUpperCase(); save();
  const t = totals(S().cart, S().coupon, 'standard');
  if (t.coupon) toast(`Coupon ${t.coupon} applied`, `You save ${inr(t.disc)}`);
}

/* ---------- Product filters ---------- */
export function setFilter(k, value, checked) {
  const f = session.shopFilter;
  if (k === 'paper' || k === 'lam') f[k] = checked ? [...f[k], value] : f[k].filter((x) => x !== value);
  else f[k] = value;
  rerender();
}
export function clearFilters() { session.shopFilter = { q: '', cat: '', paper: [], lam: [], max: 0 }; navigate('/products'); rerender(); }

/* ---------- Checkout ---------- */
export function setCheckoutMethod(m) { session.checkoutMethod = m; rerender(); }
export function submitCheckout(fd) {
  const st = S().settings;
  const t = totals(S().cart, S().coupon, session.checkoutMethod);
  const billing = { address: fd.b_address, city: fd.b_city, state: fd.b_state, pin: fd.b_pin };
  const shipping = fd.same ? billing : { address: fd.s_address, city: fd.s_city, state: fd.s_state, pin: fd.s_pin };
  const payNow = fd.part ? round2((t.total * st.advancePct) / 100) : t.total;
  openPay(payNow, `${S().cart.length} item(s)`, fd, (method) => {
    const customer = { name: fd.name, email: fd.email, phone: fd.phone, gstin: fd.gstin, ...billing };
    if (!S().user) S().user = customer;
    const days = Math.max(...S().cart.map((i) => product(i.pid).days));
    const now = Date.now();
    const o = {
      id: 'PO-' + S().nextOrder++, customer, billing, shipping, items: S().cart, totals: t, method: session.checkoutMethod, notes: fd.notes,
      status: 0, history: [{ s: 0, at: now, by: 'Automatic' }], createdAt: now, due: now + (days + 1) * DAY,
      payments: [{ id: 'pay_' + uid(), amount: payNow, method, at: now, note: fd.part ? `Advance ${st.advancePct}%` : '' }],
      refunds: [], paid: payNow, operator: '', machine: '', prodNotes: '', courier: '', tracking: '', cancelled: false,
    };
    S().orders.push(o);
    if (t.coupon) S().coupons.find((c) => c.code === t.coupon).used++;
    notify(customer, `Order ${o.id} confirmed — invoice attached`, true);
    setStatus(o, 1, 'Automatic', true);
    S().messages.unshift({ at: Date.now(), to: 'Admin', email: 'admin', channels: 'Email · WhatsApp', text: `Payment ${inr(payNow)} received for ${o.id}` });
    S().cart = []; S().coupon = '';
    save();
    navigate('/order/' + o.id);
  });
}

/* ---------- Order tracking (customer) ---------- */
export function approveDesign(id) { setStatus(findOrder(id), 3, 'Customer'); }
export function payBalance(id) {
  const o = findOrder(id);
  const due = round2(o.totals.total - o.paid);
  openPay(due, `Order ${o.id}`, o.customer, (method) => {
    o.payments.push({ id: 'pay_' + uid(), amount: due, method, at: Date.now(), note: o.paid ? 'Balance' : '' });
    o.paid = o.totals.total;
    if (o.status === 0) setStatus(o, 1, 'Automatic');
    else { notify(o.customer, `Payment ${inr(due)} received for ${o.id}`, true); save(); }
    log('Customer', `${o.id} paid ${inr(due)}`);
    save();
  });
}
export function reorder(id) {
  const o = findOrder(id);
  const items = o.items.filter((i) => i.pid && product(i.pid));
  items.forEach((i) => { const n = JSON.parse(JSON.stringify(i)); n.id = uid(); repriceItem(n); S().cart.push(n); });
  save();
  toast(`${items.length} item(s) added to cart`, 'Same options and artwork as ' + o.id);
  navigate('/cart');
}
/** kind: 'add' | 'replace' */
export function orderArtwork(kind, orderId, idx, recs, fileId) {
  const o = findOrder(orderId);
  const it = o.items[+idx];
  if (kind === 'replace') {
    const old = it.files.find((f) => f.id === fileId);
    old.superseded = true;
    recs[0].version = old.version + 1;
    it.files.push(recs[0]);
    log('Customer', `${o.id}: replaced ${old.name} with ${recs[0].name} (v${recs[0].version})`);
  } else {
    it.files.push(...recs);
    log('Customer', `${o.id}: added ${recs.length} file(s)`);
  }
  if (o.status === 2) setStatus(o, 1, 'Customer (new artwork)');
  toast('Artwork updated', 'Our team will check the new file before printing');
  save();
}

/* ---------- Quotations ---------- */
export function acceptQuote(id, byAdmin) {
  const q = S().quotes.find((x) => x.id === id);
  const gst = round2((q.price * S().settings.gstPct) / 100);
  const t = { sub: q.price, disc: 0, coupon: null, taxable: q.price, gst, delivery: 0, total: round2(q.price + gst) };
  const now = Date.now();
  const u = S().user;
  const cust = { name: q.name, email: q.email, phone: q.phone, ...(u && u.email === q.email ? { address: u.address, city: u.city, state: u.state, pin: u.pin } : {}) };
  const o = {
    id: 'PO-' + S().nextOrder++, customer: cust, items: [{ id: uid(), pid: null, name: q.product, qty: q.qty, specs: [q.details], per: round2(q.price / q.qty), flat: 0, total: q.price, files: q.files || [] }],
    totals: t, method: 'standard', notes: `From quotation ${q.id}`, status: 0, history: [{ s: 0, at: now, by: byAdmin ? 'Admin' : 'Customer' }],
    createdAt: now, due: now + 8 * DAY, payments: [], refunds: [], paid: 0, operator: '', machine: '', prodNotes: '', courier: '', tracking: '', cancelled: false,
  };
  S().orders.push(o);
  q.status = 'accepted'; q.orderId = o.id;
  log(byAdmin ? 'Admin' : 'Customer', `${q.id} accepted → ${o.id}`);
  notify(cust, `Quotation ${q.id} accepted. Order ${o.id} created`, true);
  save();
  if (!byAdmin) navigate('/track/' + o.id);
}
export function downloadQuote(id) { toast(`Quotation ${id} PDF`, 'Generated as PDF in the live system'); }
export function downloadFile(name) { toast(`Download: ${name}`, 'Live system downloads the original full-quality file through a private, expiring link'); }
export function addQuoteFiles(recs) { session.quoteFiles.push(...recs); rerender(); }
export function removeQuoteFile(id) { session.quoteFiles = session.quoteFiles.filter((f) => f.id !== id); rerender(); }
/** Returns the new quote id. */
export function submitQuote(fd) {
  const q = { id: 'Q-' + S().nextQuote++, name: fd.name, email: fd.email, phone: fd.phone, product: fd.product, qty: +fd.qty, details: fd.details, files: session.quoteFiles, status: 'new', at: Date.now() };
  S().quotes.push(q); session.quoteFiles = [];
  S().messages.unshift({ at: Date.now(), to: 'Admin', email: 'admin', channels: 'Email · WhatsApp', text: `New quote request ${q.id} from ${q.name}` });
  log('Customer', `Quote request ${q.id}`); save();
  return q.id;
}

/* ---------- Account ---------- */
export function demoLogin() { S().user = { ...DEMO_USER }; save(); navigate('/account'); }
export function login(fd) {
  const isNew = !S().orders.some((o) => o.customer.email === fd.email);
  S().user = { name: fd.name, email: fd.email, phone: fd.phone };
  if (isNew) notify(S().user, `Welcome to ${S().settings.company}! Your account is ready`);
  save(); navigate('/account');
}
export function logout() { S().user = null; save(); navigate('/'); }
export function saveProfile(fd) { Object.assign(S().user, fd); save(); toast('Profile saved'); }
export function submitTicket(fd) {
  const u = S().user;
  S().tickets.push({ id: 'T-' + (S().tickets.length + 1), email: u.email, name: u.name, order: fd.order, subject: fd.subject, msg: fd.msg, status: 'open', at: Date.now() });
  log('Customer', `Ticket: ${fd.subject}`); save(); toast('Ticket submitted', 'We will reply soon');
}
export function subscribe() { toast('Subscribed!', 'You will get our offers by email'); }

/* ---------- Admin ---------- */
export function resetAll() { if (confirm('Reset all demo data?')) { resetDemo(); session.cfg = null; toast('Demo data reset'); } }
export function exportCsv() {
  const head = ['Order', 'Date', 'Customer', 'Phone', 'Items', 'Subtotal', 'Discount', 'GST', 'Delivery', 'Total', 'Paid', 'Status'];
  const rows = S().orders.map((o) => [o.id, new Date(o.createdAt).toISOString().slice(0, 10), o.customer.name, o.customer.phone,
    o.items.map((i) => `${i.name} x ${i.qty}`).join('; '), o.totals.sub, o.totals.disc, o.totals.gst, o.totals.delivery, o.totals.total, o.paid,
    o.cancelled ? 'Cancelled' : STAGES[o.status].name]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
export function setAdminFilter(v) { session.adminFilter = v; rerender(); }
export function adminMarkPaid(id) {
  const o = findOrder(id);
  const amt = round2(o.totals.total - o.paid);
  o.payments.push({ id: 'cash_' + uid(), amount: amt, method: 'Offline / bank transfer', at: Date.now() });
  o.paid = o.totals.total;
  setStatus(o, 1, 'Admin');
}
export function adminNext(id) { const o = findOrder(id); setStatus(o, o.status + 1, 'Admin'); }
export function adminSetStatus(id, s) { const o = findOrder(id); if (s !== o.status) setStatus(o, s, 'Admin'); }
export function cancelOrder(id) {
  const o = findOrder(id);
  if (!confirm(`Cancel ${o.id}? Record any refund separately.`)) return;
  o.cancelled = true; log('Admin', `${o.id} cancelled`); notify(o.customer, `Order ${o.id} has been cancelled`); save();
}
export function recordRefund(id) {
  const o = findOrder(id);
  const max = round2(o.paid - sum(o.refunds, (r) => r.amount));
  const amt = parseFloat(prompt(`Refund amount (max ${max})`, max));
  if (!amt || amt <= 0 || amt > max) return;
  const reason = prompt('Reason for refund', 'Customer cancelled') || 'Refund';
  o.refunds.push({ id: 'rfnd_' + uid(), amount: amt, reason, at: Date.now() });
  log('Admin', `${o.id} refund ${inr(amt)} (${reason})`);
  notify(o.customer, `Refund of ${inr(amt)} processed for ${o.id}`);
  save();
}
export function shipOrder(id, fd) {
  const o = findOrder(id);
  o.courier = fd.courier; o.tracking = fd.tracking;
  setStatus(o, 8, 'Admin');
}
export function sendQuotation(id, fd) {
  const q = S().quotes.find((x) => x.id === id);
  Object.assign(q, { status: 'sent', price: +fd.price, validUntil: Date.now() + (+fd.days || 15) * DAY, adminNote: fd.note });
  log('Admin', `Quotation ${q.id} sent: ${inr(q.price)}`);
  notify({ name: q.name, email: q.email }, `Quotation ${q.id}: ${inr(q.price)} + GST. Accept online from your account`);
  save();
}
export function editProduct(pid, field, value) {
  const ed = (S().productEdits[pid] ||= {});
  ed[field] = value;
  log('Admin', `${pid}: ${field} → ${ed[field]}`);
  save(); toast('Product updated');
}
export function createCoupon(fd) {
  S().coupons.push({ code: fd.code.toUpperCase(), type: fd.type, value: +fd.value, min: +fd.min, expires: fd.expires, limit: +fd.limit, used: 0 });
  log('Admin', `Coupon ${fd.code.toUpperCase()} created`); save();
}
export function deleteCoupon(i) { const c = S().coupons.splice(i, 1)[0]; log('Admin', `Coupon ${c.code} deleted`); save(); }
export function replyTicket(id, reply) {
  const t = S().tickets.find((x) => x.id === id);
  t.reply = reply; t.status = 'closed';
  log('Admin', `Replied to ${t.id}`); notify({ name: t.name, email: t.email }, `Reply to your ticket ${t.id}`); save();
}
export function saveSettings(fd) {
  for (const [k, v] of Object.entries(fd)) S().settings[k] = ['gstPct', 'standardFee', 'freeAbove', 'expressFee', 'advancePct'].includes(k) ? +v : v;
  log('Admin', 'Settings updated'); save(); toast('Settings saved');
}

/* ---------- Production ---------- */
export function prodUpdate(id, field, value) {
  const o = findOrder(id);
  o[field] = field === 'due' ? new Date(value + 'T18:00:00').getTime() : value;
  log('Production', `${o.id}: ${field} updated`);
  save(); if (field === 'prodNotes') toast('Note saved');
}
export function prodNext(id) {
  const o = findOrder(id);
  if (o.status === 3 && !o.operator) { toast('Assign an operator first'); return; }
  setStatus(o, o.status + 1, 'Production' + (o.operator ? ` (${o.operator})` : ''));
}

export { closeCart };
