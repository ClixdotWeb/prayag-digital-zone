// Core logic (ported 1:1 from the prototype's core.js): helpers, pricing, demo data, status, uploads.
// The app state lives in `store.S`. Today it is saved in the browser (localStorage);
// later a Next.js backend can replace load()/save() and the functions in actions.js.
import { STAGES, PRODUCTS, SEED_COUPONS, MACHINES } from './data';

export const LS_KEY = 'printco-proto-v1';
export const DAY = 86400000;
export const ALLOWED_EXT = ['pdf', 'ai', 'psd', 'cdr', 'svg', 'png', 'jpg', 'jpeg', 'tif', 'tiff'];
export const MAX_FILE_MB = 100;

export const store = { S: null };

export const round2 = (n) => Math.round(n * 100) / 100;
export const inr = (n, dp = 2) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const fmtDate = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDT = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const uid = () => Math.random().toString(36).slice(2, 10);
export const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
export const fileSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

/* ---------- Change + toast events (the provider and Toasts component subscribe) ---------- */
const changeFns = new Set();
const toastFns = new Set();
export const onChange = (fn) => { changeFns.add(fn); return () => changeFns.delete(fn); };
export const onToast = (fn) => { toastFns.add(fn); return () => toastFns.delete(fn); };
export function toast(text, sub) { toastFns.forEach((fn) => fn({ id: uid(), text, sub })); }
/** Re-render the UI without saving (for in-memory UI state such as filters). */
export function rerender() { changeFns.forEach((fn) => fn()); }

/* ---------- Pricing ---------- */
export function product(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  return { ...p, ...((store.S && store.S.productEdits[id]) || {}) };
}
export function allProducts(includeInactive) {
  return PRODUCTS.map((p) => product(p.id)).filter((p) => includeInactive || p.active !== false);
}
export function defaultSel(p) {
  const sel = {};
  p.options.forEach((g) => { sel[g.key] = g.multi ? [] : 0; });
  return sel;
}
export function calc(p, sel, qty, custom) {
  let unit = p.base, mult = 1, flat = 0;
  for (const g of p.options) {
    const idxs = g.multi ? sel[g.key] || [] : [sel[g.key] ?? 0];
    for (const i of idxs) {
      const c = g.choices[i];
      if (!c) continue;
      if (c.custom) {
        const area = (+custom?.w || 0) * (+custom?.h || 0);
        const baseArea = c.customBase === 'A3' ? 297 * 420 : 210 * 297;
        mult *= Math.max(0.1, area / baseArea);
      }
      if (c.mult) mult *= c.mult;
      if (c.add) unit += c.add;
      if (c.flat) flat += c.flat;
    }
  }
  const r = qty / p.minQty;
  const tier = r >= 10 ? 0.7 : r >= 5 ? 0.8 : r >= 2.5 ? 0.9 : 1;
  const per = unit * mult * tier;
  return { per: round2(per), flat, tier, total: round2(per * qty + flat) };
}
/** Fixed quantity choices for a product (e.g. visiting cards: 100 / 200 / 500 / 1000 / 2000). */
export function qtyOptions(p) { return [1, 2, 5, 10, 20].map((m) => p.minQty * m); }
export function startPrice(p) { return calc(p, defaultSel(p), p.minQty).total; }
export function describe(p, sel, custom) {
  return p.options.map((g) => {
    if (g.multi) {
      const v = (sel[g.key] || []).map((i) => g.choices[i].label);
      return v.length ? `${g.label}: ${v.join(', ')}` : null;
    }
    const c = g.choices[sel[g.key] ?? 0];
    if (c.custom) return `${g.label}: Custom ${custom?.w} × ${custom?.h} mm`;
    return `${g.label}: ${c.label}`;
  }).filter(Boolean);
}
export function makeItem(pid, sel, qty, custom, files) {
  const p = product(pid);
  const pr = calc(p, sel, qty, custom);
  return {
    id: uid(), pid, name: p.name, sel: JSON.parse(JSON.stringify(sel)), qty, custom: custom ? { ...custom } : null,
    specs: describe(p, sel, custom), per: pr.per, flat: pr.flat, total: pr.total, files: files || [],
  };
}
export function repriceItem(it) {
  const p = product(it.pid);
  const pr = calc(p, it.sel, it.qty, it.custom);
  Object.assign(it, { per: pr.per, flat: pr.flat, total: pr.total });
}
export function couponCheck(code, sub) {
  const S = store.S;
  if (!code) return { ok: false };
  const c = S.coupons.find((x) => x.code.toUpperCase() === code.toUpperCase());
  if (!c) return { ok: false, msg: 'Coupon not found' };
  if (new Date(c.expires + 'T23:59:59') < new Date()) return { ok: false, msg: 'Coupon has expired' };
  if (c.used >= c.limit) return { ok: false, msg: 'Coupon usage limit reached' };
  if (sub < c.min) return { ok: false, msg: `Minimum order ${inr(c.min, 0)} for this coupon` };
  const disc = c.type === 'pct' ? round2((sub * c.value) / 100) : Math.min(c.value, sub);
  return { ok: true, coupon: c, disc };
}
export function totals(items, code, method) {
  const st = store.S.settings;
  const sub = round2(sum(items, (i) => i.total));
  const cc = couponCheck(code, sub);
  const disc = cc.ok ? cc.disc : 0;
  const taxable = round2(sub - disc);
  const gst = round2((taxable * st.gstPct) / 100);
  const delivery = method === 'pickup' ? 0 : method === 'express' ? st.expressFee : taxable >= st.freeAbove ? 0 : st.standardFee;
  return { sub, disc, coupon: cc.ok ? cc.coupon.code : null, couponMsg: code && !cc.ok ? cc.msg : null, taxable, gst, delivery, total: round2(taxable + gst + delivery) };
}

/* ---------- State: load / save (browser storage for now) ---------- */
/** Persist the state and re-render. Every mutation ends with save(). */
export function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store.S)); }
  catch { toast('Browser storage is full', 'Artwork previews were not saved.'); }
  rerender();
}
export function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      store.S = JSON.parse(raw);
      if (store.S.settings.company === 'PrintCo') store.S.settings.company = 'BRD';
      autoComplete();
      localStorage.setItem(LS_KEY, JSON.stringify(store.S));
      return;
    }
  } catch { /* fall through to demo data */ }
  store.S = seed();
  localStorage.setItem(LS_KEY, JSON.stringify(store.S));
}
export function resetDemo() { localStorage.removeItem(LS_KEY); store.S = seed(); save(); }

export const DEMO_USER = { name: 'Demo Customer', email: 'demo@example.com', phone: '+91 90000 00000', address: '2nd Floor, Mavoor Road', city: 'Kozhikode', state: 'Kerala', pin: '673004' };

export function seed() {
  const now = Date.now();
  const demo = { ...DEMO_USER };
  const S = {
    user: demo, role: 'customer', cart: [], saved: [], wishlist: ['brochures'], coupon: '',
    orders: [], quotes: [], tickets: [], messages: [], activity: [], productEdits: {},
    coupons: JSON.parse(JSON.stringify(SEED_COUPONS)), nextOrder: 1001, nextQuote: 501,
    settings: { company: 'BRD', gstin: '32ABCDE1234F1Z5', gstPct: 18, standardFee: 80, freeAbove: 1500, expressFee: 200, advancePct: 50,
      heroTitle: 'Print anything. Order in minutes.', heroText: 'Choose your product and paper, upload your design and pay online. Delivered across Kerala and India.' },
  };
  store.S = S;
  const cust = [
    demo,
    { name: 'Malabar Bakes', email: 'orders@malabarbakes.example', phone: '+91 90000 11111', address: 'SM Street', city: 'Kozhikode', state: 'Kerala', pin: '673001' },
    { name: 'Green Leaf Ayurveda', email: 'hello@greenleaf.example', phone: '+91 90000 22222', address: 'Ring Road', city: 'Malappuram', state: 'Kerala', pin: '676505' },
    { name: 'Anil Kumar', email: 'anil@example.com', phone: '+91 90000 33333', address: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
    { name: 'Calicut Dental Clinic', email: 'admin@cdc.example', phone: '+91 90000 44444', address: 'Nadakkavu', city: 'Kozhikode', state: 'Kerala', pin: '673011' },
  ];
  const mk = (c, lines, status, daysAgo, extra = {}) => {
    const items = lines.map(([pid, selPatch, qty]) => {
      const p = product(pid);
      const sel = { ...defaultSel(p), ...selPatch };
      return makeItem(pid, sel, qty, null, [{ id: uid(), name: `${pid}-artwork.pdf`, size: 2400000 + Math.round(Math.random() * 9e6), ext: 'pdf', version: 1, at: now - daysAgo * DAY }]);
    });
    const t = totals(items, '', 'standard');
    const created = now - daysAgo * DAY;
    const hist = [];
    for (let s = 0; s <= status; s++) hist.push({ s, at: created + s * (DAY / 3), by: STAGES[s].by });
    const maxDays = Math.max(...items.map((i) => product(i.pid).days));
    const o = {
      id: 'PO-' + S.nextOrder++, customer: { ...c }, items, totals: t, method: 'standard', notes: '', status, history: hist,
      createdAt: created, due: created + (maxDays + 1) * DAY, payments: [{ id: 'pay_' + uid(), amount: t.total, method: 'UPI', at: created + 60000 }],
      refunds: [], paid: t.total, operator: '', machine: '', prodNotes: '', courier: '', tracking: '', cancelled: false, ...extra,
    };
    S.orders.push(o);
    return o;
  };
  mk(cust[2], [['labels', { paper: 1 }, 2000], ['stickers', { finishing: [0] }, 500]], 10, 12, { courier: 'DTDC', tracking: 'D12345678' });
  mk(cust[0], [['visiting-cards', { paper: 4, lamination: 3, finishing: [1] }, 500]], 10, 9, { courier: 'India Post', tracking: 'EK123456789IN' });
  mk(cust[1], [['boxes', { size: 1, finishing: [0] }, 1000]], 6, 6, { operator: 'Fathima', machine: MACHINES[0], prodNotes: 'Use client-supplied Pantone 186C for logo.' });
  mk(cust[4], [['letterheads', {}, 500], ['visiting-cards', {}, 300]], 4, 4, { operator: 'Suresh', machine: MACHINES[1] });
  mk(cust[0], [['brochures', { gsm: 1, lamination: 1 }, 250]], 8, 5, { courier: 'DTDC', tracking: 'D98765432' });
  mk(cust[3], [['flyers', { size: 1 }, 1000]], 3, 3);
  mk(cust[0], [['posters', { gsm: 1 }, 20]], 2, 1);
  mk(cust[1], [['paper-bags', { size: 1 }, 500]], 1, 0);
  // A part-paid order
  const pp = mk(cust[4], [['booklets', { pages: 1, binding: 3 }, 100]], 1, 0);
  pp.paid = round2(pp.totals.total / 2);
  pp.payments[0].amount = pp.paid;
  pp.payments[0].note = 'Advance 50%';

  S.quotes.push(
    { id: 'Q-' + S.nextQuote++, name: 'Kasavu Textiles', email: 'buy@kasavu.example', phone: '+91 90000 55555', product: 'Paper bags with rope handle', qty: 5000, details: 'Large size, 2 colour print, kraft, rope handles. Need before Onam.', files: [], status: 'new', at: now - DAY / 2 },
    { id: 'Q-' + S.nextQuote++, name: demo.name, email: demo.email, phone: demo.phone, product: 'Wedding cards with foil + envelope', qty: 300, details: 'Square 6 × 6 in, gold foil, matching envelope.', files: [], status: 'sent', price: 21000, validUntil: now + 10 * DAY, adminNote: 'Includes envelopes and gold foiling on front. 7 working days.', at: now - 2 * DAY },
  );
  S.tickets.push({ id: 'T-1', email: demo.email, name: demo.name, subject: 'Change delivery address for PO-1005', msg: 'Please deliver to our new office.', status: 'open', at: now - DAY });
  S.activity.push({ at: now - DAY, who: 'System', what: 'Demo data created' });
  return S;
}

// Delivered orders auto-complete 3 days after delivery.
export function autoComplete() {
  store.S.orders.forEach((o) => {
    if (o.status === 9) {
      const d = o.history.find((h) => h.s === 9);
      if (d && Date.now() - d.at > 3 * DAY) setStatus(o, 10, 'Automatic', true, true);
    }
  });
}

/* ---------- Status, messages, activity ---------- */
const MSG_EVENTS = { 1: 'Payment received', 3: 'Artwork approved', 4: 'Printing started', 8: 'Order shipped', 9: 'Order delivered' };
export function setStatus(o, s, by, silent, noSave) {
  o.status = s;
  o.history.push({ s, at: Date.now(), by });
  log(by, `${o.id} → ${STAGES[s].name}`);
  if (MSG_EVENTS[s] && !silent) {
    let text = `${MSG_EVENTS[s]}: your order ${o.id}`;
    if (s === 8) text += ` was shipped via ${o.courier}, tracking ${o.tracking}`;
    notify(o.customer, text);
  }
  if (!noSave) save();
}
export function notify(to, text, alsoAdmin) {
  const S = store.S;
  S.messages.unshift({ at: Date.now(), to: to.name, email: to.email, channels: 'Email · SMS · WhatsApp', text });
  if (alsoAdmin) S.messages.unshift({ at: Date.now(), to: 'Admin', email: 'admin', channels: 'Email · WhatsApp', text });
  toast(text, `Sent to ${to.name} by email, SMS and WhatsApp`);
}
export function log(who, what) { store.S.activity.unshift({ at: Date.now(), who, what }); }

/* ---------- Artwork upload (browser only) ---------- */
function thumb(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 260, r = Math.min(1, max / Math.max(img.width || max, img.height || max));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((img.width || max) * r));
      c.height = Math.max(1, Math.round((img.height || max) * r));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}
/** Validates files and returns records (same rules as the prototype). Resolves to [] if none are valid. */
export async function readUploads(fileList) {
  const out = [];
  for (const f of Array.from(fileList || [])) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) { toast(`${f.name}: format not allowed`, 'Use PDF, AI, PSD, CDR, SVG, PNG, JPG or TIFF'); continue; }
    if (f.size > MAX_FILE_MB * 1048576) { toast(`${f.name}: file too large`, `Maximum ${MAX_FILE_MB} MB per file`); continue; }
    const rec = { id: uid(), name: f.name, size: f.size, ext, version: 1, at: Date.now() };
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) { try { rec.preview = await thumb(f); } catch { /* no preview */ } }
    else if (ext === 'pdf') rec.blobUrl = URL.createObjectURL(f); // session-only preview
    out.push(rec);
  }
  return out;
}
