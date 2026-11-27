// Instant print pricing engine — pure functions, no imports, no I/O.
// Runs in the browser (instant price), on the server (verification) and in tests.
// All money is in PAISE (integers). Rates come from data/print-rates.json, never from UI code.

export const PRINT_MAX_MB = 50;
export const PRINT_TYPES = ['pdf', 'jpg', 'jpeg', 'png'];
export const SIZES = ['A4', 'A3'];
export const GSMS = [100, 130, 170, 300];
export const SIDES = ['single', 'double'];
export const MAX_COPIES = 10000;
export const MAX_QTY = 1000000;

/** Slab label, e.g. [1,100,500,1000] index 1 → "100–499". */
export function slabLabel(slabs, i) {
  return i < slabs.length - 1 ? `${slabs[i]}–${slabs[i + 1] - 1}` : `${slabs[i]}+`;
}

/** Index of the slab that `qty` falls in (slabs are ascending minimums, first is 1). */
export function slabIndex(slabs, qty) {
  let s = 0;
  for (let i = 0; i < slabs.length; i++) if (qty >= slabs[i]) s = i;
  return s;
}

/**
 * Flat slab pricing with a "never pay more for less" cap:
 * total = min( qty × rate[current slab], min over every higher slab k of slabMin[k] × rate[k] ).
 * Within a slab the first term rises and the caps are constant, so totals never decrease as qty rises.
 */
export function slabTotal(slabs, rates, qty) {
  const s = slabIndex(slabs, qty);
  let total = qty * rates[s];
  let cappedBy = null;
  for (let k = s + 1; k < slabs.length; k++) {
    const cap = slabs[k] * rates[k];
    if (cap < total) { total = cap; cappedBy = k; }
  }
  return { slab: s, rate: rates[s], total, cappedBy };
}

/** Picks the slab table and rate row for the options. Throws on anything not in the rate card. */
export function rateRow(rates, o) {
  if (o.type === 'bw') {
    const row = rates.bw?.rates?.[o.side];
    if (!row) throw new Error('No B&W rate for this side');
    return { slabs: rates.bw.slabs, row };
  }
  if (o.type === 'colour') {
    const slabs = rates.colour?.slabs?.[o.size];
    const row = rates.colour?.rates?.[o.size]?.[String(o.gsm)]?.[o.side];
    if (!slabs || !row) throw new Error(`No colour rate for ${o.size} ${o.gsm} GSM ${o.side} side`);
    return { slabs, row };
  }
  throw new Error('Unknown print type');
}

const isInt = (n) => Number.isInteger(n);

/** Validates and normalises the options. Returns { ok, error, o }. */
export function normalise(options) {
  const o = { ...options };
  if (!['bw', 'colour'].includes(o.type)) return { ok: false, error: 'Choose B&W or Colour printing.' };
  if (!SIDES.includes(o.side)) return { ok: false, error: 'Choose single or double side.' };
  if (o.type === 'bw') { o.size = 'A4'; o.gsm = null; }
  else {
    if (!SIZES.includes(o.size)) return { ok: false, error: 'Choose A4 or A3.' };
    o.gsm = Number(o.gsm);
    if (!GSMS.includes(o.gsm)) return { ok: false, error: 'Choose a paper thickness (GSM).' };
  }
  o.pageCounts = (o.pageCounts || []).map(Number);
  if (o.pageCounts.some((p) => !isInt(p) || p < 1)) return { ok: false, error: 'Page count must be a whole number of at least 1.' };
  o.copies = Number(o.copies);
  if (o.pageCounts.length) {
    if (!isInt(o.copies) || o.copies < 1 || o.copies > MAX_COPIES) return { ok: false, error: `Copies must be between 1 and ${MAX_COPIES.toLocaleString('en-IN')}.` };
  } else {
    if (o.type !== 'colour') return { ok: false, error: 'Upload a file to see the price.' };
    o.manualQty = Number(o.manualQty);
    if (!isInt(o.manualQty) || o.manualQty < 1) return { ok: false, error: 'Upload a file or enter a quantity.' };
    o.copies = 1;
  }
  return { ok: true, o };
}

/**
 * calculatePrice(options, rates)
 * options: { type: 'bw'|'colour', side: 'single'|'double', size?: 'A4'|'A3', gsm?: 100|130|170|300,
 *            pageCounts: number[] (one per uploaded file), copies: number, manualQty?: number (colour, no file) }
 * Charged per printed side. Returns amounts in paise:
 *   { ok, quantity, pages, copies, sheets, ratePerUnit, total, effectiveRate, slab, slabLabel, capped, nextSlabHint }
 */
export function calculatePrice(options, rates) {
  const n = normalise(options);
  if (!n.ok) return { ok: false, error: n.error };
  const o = n.o;
  const manual = !o.pageCounts.length;
  const pages = manual ? o.manualQty : o.pageCounts.reduce((a, b) => a + b, 0);
  const quantity = pages * o.copies; // printed sides
  if (quantity > MAX_QTY) return { ok: false, error: 'That is a very large order — please ask us for a bulk quote.' };
  // Sheets: double side is counted per file (an odd page count leaves the last back blank).
  const perCopySheets = manual
    ? (o.side === 'double' ? Math.ceil(pages / 2) : pages)
    : o.pageCounts.reduce((a, p) => a + (o.side === 'double' ? Math.ceil(p / 2) : p), 0);
  const sheets = perCopySheets * o.copies;

  let slabs, row;
  try { ({ slabs, row } = rateRow(rates, o)); } catch (e) { return { ok: false, error: e.message }; }
  const r = slabTotal(slabs, row, quantity);

  let nextSlabHint = null;
  const nx = r.slab + 1;
  if (nx < slabs.length && row[nx] < r.rate) {
    nextSlabHint = { addQty: slabs[nx] - quantity, atQty: slabs[nx], ratePerUnit: row[nx] };
  }
  return {
    ok: true, quantity, pages, copies: o.copies, sheets, manual,
    ratePerUnit: r.rate, total: r.total, effectiveRate: Math.round(r.total / quantity),
    slab: r.slab, slabLabel: slabLabel(slabs, r.slab), capped: r.cappedBy !== null,
    cappedAt: r.cappedBy !== null ? slabs[r.cappedBy] : null, nextSlabHint,
    options: { type: o.type, side: o.side, size: o.size, gsm: o.gsm, copies: o.copies, manualQty: manual ? o.manualQty : null },
  };
}

/** Checks a rate card's shape: every row is positive integer paise and matches its slab list. */
export function validateRates(rates) {
  const errs = [];
  const checkSlabs = (s, name) => {
    if (!Array.isArray(s) || s[0] !== 1 || s.some((v, i) => !isInt(v) || (i && v <= s[i - 1]))) errs.push(`${name}: slabs must start at 1 and go up`);
  };
  const checkRow = (row, len, name) => {
    if (!Array.isArray(row) || row.length !== len || row.some((v) => !isInt(v) || v <= 0)) errs.push(`${name}: needs ${len} rates, each a positive whole number of paise`);
  };
  checkSlabs(rates?.bw?.slabs, 'B&W');
  for (const side of SIDES) checkRow(rates?.bw?.rates?.[side], rates?.bw?.slabs?.length, `B&W ${side}`);
  for (const size of SIZES) {
    checkSlabs(rates?.colour?.slabs?.[size], `Colour ${size}`);
    for (const g of GSMS) for (const side of SIDES) checkRow(rates?.colour?.rates?.[size]?.[g]?.[side], rates?.colour?.slabs?.[size]?.length, `Colour ${size} ${g} GSM ${side}`);
  }
  return errs;
}

/** Display helpers */
export const rupees = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function describePrint(o) {
  const side = o.side === 'double' ? 'Double side' : 'Single side';
  return o.type === 'bw' ? ['A4', 'Black & white', side] : [o.size, `${o.gsm} GSM`, 'Colour', side];
}
