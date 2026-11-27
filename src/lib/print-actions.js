// Browser side of instant printing: talks to /api/print/*, puts verified print jobs in the cart,
// and re-checks them with the server before payment.
import { store, save, toast, uid } from './core';
import { navigate, openCart } from './session';
import { describePrint, PRINT_MAX_MB, PRINT_TYPES } from './print-pricing';

export const PRINT_DAYS = 1; // production days for print jobs (used for the order due date)

async function api(url, opts) {
  let res;
  try { res = await fetch(url, opts); } catch { throw new Error('Could not reach the server. Check your connection and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.results) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const fetchRates = () => api('/api/print/rates', { cache: 'no-store' });

/** Quick browser check before uploading (the server checks again). Returns an error message or null. */
export function precheck(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (!PRINT_TYPES.includes(ext)) return 'This file type is not supported. Upload a PDF, JPG or PNG.';
  if (f.size > PRINT_MAX_MB * 1048576) return `This file is larger than ${PRINT_MAX_MB} MB. Please compress it or split it into smaller files.`;
  if (!f.size) return 'This file is empty.';
  return null;
}

/** Uploads one file; the server counts the pages. Resolves to { id, name, size, ext, pages, url }. */
export async function uploadPrintFile(f) {
  const fd = new FormData();
  fd.append('file', f);
  return (await api('/api/print/files', { method: 'POST', body: fd })).file;
}

/** Gets the server price + signed token and adds the job to the cart. */
export async function addPrintToCart(options, files, then = 'drawer') {
  const q = await api('/api/print/quote', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...options, fileIds: files.map((f) => f.id) }),
  });
  const p = q.price;
  const o = p.options;
  const specs = [...describePrint(o), p.manual ? `${p.quantity.toLocaleString('en-IN')} prints` : `${p.pages} page(s) × ${p.copies} cop${p.copies === 1 ? 'y' : 'ies'}`, `${p.sheets.toLocaleString('en-IN')} sheets`];
  store.S.cart.push({
    id: uid(), kind: 'print', pid: null,
    name: o.type === 'bw' ? 'B&W A4 printing' : `Colour printing ${o.size}`,
    qty: p.quantity, specs, per: p.effectiveRate / 100, flat: 0, total: p.total / 100, totalPaise: p.total,
    files: q.files.map((m) => ({ id: m.id, name: m.name, size: m.size, ext: m.ext, pages: m.pages, version: 1, at: m.at, url: `/api/print/files/${m.id}` })),
    print: { options: o, quote: p, token: q.token },
  });
  save();
  if (then === 'cart') navigate('/cart'); else openCart(true);
}

/**
 * Re-checks every print job in the cart with the server. Returns true when all prices are confirmed.
 * Outdated prices are updated in the cart (customer sees the new price before paying); tampered jobs are removed.
 */
export async function verifyPrintJobs() {
  const jobs = store.S.cart.filter((i) => i.kind === 'print');
  if (!jobs.length) return true;
  let data;
  try {
    data = await api('/api/print/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: jobs.map((j) => ({ token: j.print.token, total: Math.round(j.totalPaise ?? j.total * 100) })) }),
    });
  } catch (e) { toast('Could not confirm print prices', e.message); return false; }
  if (data.ok) return true;
  data.results.forEach((r, i) => {
    if (r.ok) return;
    const j = jobs[i];
    if (r.reason === 'price_changed') {
      toast('Print price updated', r.message);
      store.S.cart = store.S.cart.filter((x) => x.id !== j.id);
      // Re-quote with the current rates so the cart shows the right amount.
      addPrintToCart(j.print.options, j.files, 'cart').catch((e) => toast('Please add the print job again', e.message));
    } else {
      toast('Print job removed from cart', r.message);
      store.S.cart = store.S.cart.filter((x) => x.id !== j.id);
    }
  });
  save();
  return false;
}
