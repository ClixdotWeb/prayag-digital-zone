// Instant print: pricing engine + server checks.  Run:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

// Isolated rate file + upload folder for the server tests (never touches the real ones).
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'print-test-'));
const REAL_RATES = JSON.parse(fs.readFileSync(new URL('../data/print-rates.json', import.meta.url), 'utf8'));
process.env.PRINT_RATES_FILE = path.join(tmp, 'rates.json');
process.env.PRINT_UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.PRINT_QUOTE_SECRET = 'test-secret';
fs.writeFileSync(process.env.PRINT_RATES_FILE, JSON.stringify(REAL_RATES));

const P = await import('../src/lib/print-pricing.js');
const SV = await import('../src/server/print-server.js');

// Fixed rate card for exact-number tests (paise per printed side).
const R = {
  bw: { slabs: [1, 100, 500, 1000], rates: { single: [200, 150, 120, 100], double: [150, 120, 100, 80] } },
  colour: {
    slabs: { A4: [1, 100, 500, 1000], A3: [1, 50, 100, 500, 1000] },
    rates: {
      A4: Object.fromEntries(P.GSMS.map((g) => [g, { single: [1000, 800, 700, 600], double: [900, 700, 600, 500] }])),
      A3: Object.fromEntries(P.GSMS.map((g) => [g, { single: [2500, 2200, 2000, 1800, 1600], double: [2300, 2000, 1800, 1600, 1400] }])),
    },
  },
};
const bw = (pages, copies = 1, side = 'single') => P.calculatePrice({ type: 'bw', side, pageCounts: Array.isArray(pages) ? pages : [pages], copies }, R);

/* ---------- Slab boundaries ---------- */
test('B&W slab boundaries 99/100, 499/500, 999/1000 pick the right slab rate', () => {
  const cases = [[99, 0, 200], [100, 1, 150], [499, 1, 150], [500, 2, 120], [999, 2, 120], [1000, 3, 100]];
  for (const [q, slab, rate] of cases) {
    const r = bw(q);
    assert.equal(r.ok, true);
    assert.equal(r.slab, slab, `qty ${q} slab`);
    assert.equal(r.ratePerUnit, rate, `qty ${q} rate`);
  }
});

test('flat slab pricing: whole quantity charged at its slab rate', () => {
  assert.equal(bw(50).total, 50 * 200);
  assert.equal(bw(100).total, 100 * 150);
  assert.equal(bw(600).total, 600 * 120);
  assert.equal(bw(1200).total, 1200 * 100);
});

test('cap: 99 prints never cost more than 100 prints', () => {
  // 99 × ₹2.00 = ₹198 > 100 × ₹1.50 = ₹150 → charged ₹150
  const r99 = bw(99), r100 = bw(100);
  assert.equal(r99.total, 15000);
  assert.equal(r99.capped, true);
  assert.equal(r99.cappedAt, 100);
  assert.ok(r99.total <= r100.total);
  assert.equal(bw(499).total, Math.min(499 * 150, 500 * 120, 1000 * 100));
  assert.equal(bw(999).total, Math.min(999 * 120, 1000 * 100));
});

test('A3 colour slabs 49/50 and 99/100', () => {
  const a3 = (q) => P.calculatePrice({ type: 'colour', size: 'A3', gsm: 300, side: 'single', manualQty: q }, R);
  assert.equal(a3(49).slab, 0); assert.equal(a3(50).slab, 1);
  assert.equal(a3(99).slab, 1); assert.equal(a3(100).slab, 2);
  assert.equal(a3(50).ratePerUnit, 2200);
  assert.ok(a3(49).total <= a3(50).total);
});

/* ---------- Double side, sheets ---------- */
test('double side with odd page counts', () => {
  const r = bw(9, 2, 'double');
  assert.equal(r.quantity, 18); // printed sides = pages × copies
  assert.equal(r.sheets, 10);   // ceil(9/2) × 2
  assert.equal(r.ratePerUnit, 150);
  assert.equal(bw(1, 3, 'double').sheets, 3);
  assert.equal(bw(7, 1, 'single').sheets, 7);
});

test('multiple files: sheets counted per file in double side', () => {
  const r = bw([3, 5], 2, 'double');
  assert.equal(r.pages, 8);
  assert.equal(r.quantity, 16);
  assert.equal(r.sheets, (2 + 3) * 2);
});

/* ---------- Totals never decrease ---------- */
function assertNonDecreasing(rates, make, label, max = 2500) {
  let prev = -1;
  for (let q = 1; q <= max; q++) {
    const r = P.calculatePrice(make(q), rates);
    assert.equal(r.ok, true, `${label} q=${q}: ${r.error}`);
    assert.ok(Number.isInteger(r.total), `${label} q=${q} total must be whole paise`);
    assert.ok(r.total >= prev, `${label}: total dropped at q=${q} (${prev} → ${r.total})`);
    prev = r.total;
  }
}
test('totals never decrease as quantity rises (every rate row in data/print-rates.json)', () => {
  for (const side of P.SIDES) assertNonDecreasing(REAL_RATES, (q) => ({ type: 'bw', side, pageCounts: [q], copies: 1 }), `bw ${side}`);
  for (const size of P.SIZES) for (const gsm of P.GSMS) for (const side of P.SIDES) {
    assertNonDecreasing(REAL_RATES, (q) => ({ type: 'colour', size, gsm, side, manualQty: q }), `colour ${size} ${gsm} ${side}`, 1200);
  }
});
test('totals never decrease even with awkward rate cards (random + rising rates)', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < 40; t++) {
    const row = [0, 0, 0, 0].map(() => 1 + Math.floor(rnd() * 500));
    const rates = { ...R, bw: { slabs: [1, 100, 500, 1000], rates: { single: row, double: row } } };
    assertNonDecreasing(rates, (q) => ({ type: 'bw', side: 'single', pageCounts: [q], copies: 1 }), `random card ${row}`, 1100);
  }
});

/* ---------- Hint + validation ---------- */
test('next slab hint', () => {
  const r = bw(88);
  assert.deepEqual(r.nextSlabHint, { addQty: 12, atQty: 100, ratePerUnit: 150 });
  assert.equal(bw(1500).nextSlabHint, null);
});
test('bad options give clear errors', () => {
  assert.equal(bw(5, 0).ok, false);
  assert.equal(P.calculatePrice({ type: 'bw', side: 'single', pageCounts: [], copies: 1 }, R).ok, false);
  assert.equal(P.calculatePrice({ type: 'colour', size: 'A4', gsm: 120, side: 'single', manualQty: 5 }, R).ok, false);
  assert.equal(P.calculatePrice({ type: 'colour', size: 'A5', gsm: 130, side: 'single', manualQty: 5 }, R).ok, false);
  assert.equal(bw(2.5).ok, false);
});
test('the rate file in data/ is valid and marked as placeholder', () => {
  assert.deepEqual(P.validateRates(REAL_RATES), []);
  assert.equal(REAL_RATES.placeholder, true);
});

/* ---------- Server: files ---------- */
async function pdf(pages) {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) d.addPage([595, 842]);
  return Buffer.from(await d.save({ useObjectStreams: false }));
}
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

test('server counts PDF pages; images count as 1 page', async () => {
  assert.equal((await SV.saveFile('doc.pdf', await pdf(3))).pages, 3);
  assert.equal((await SV.saveFile('photo.png', PNG)).pages, 1);
});
test('server rejects password-protected, corrupt, unsupported, renamed and oversized files', async () => {
  const enc = (await pdf(2)).toString('latin1').replace('trailer\n<<', 'trailer\n<<\n/Encrypt 1 0 R');
  await assert.rejects(SV.saveFile('locked.pdf', Buffer.from(enc, 'latin1')), { code: 'encrypted' });
  await assert.rejects(SV.saveFile('broken.pdf', Buffer.from('%PDF-1.7\nthis is not a real pdf')), { code: 'corrupt' });
  await assert.rejects(SV.saveFile('notes.txt', Buffer.from('hello')), { code: 'unsupported' });
  await assert.rejects(SV.saveFile('fake.pdf', PNG), { code: 'mismatch' });
  await assert.rejects(SV.saveFile('huge.pdf', Buffer.alloc((P.PRINT_MAX_MB + 1) * 1048576)), { code: 'too_large' });
});

/* ---------- Server: quotes ---------- */
test('server uses its own page count, not the browser\'s', async () => {
  const f = await SV.saveFile('five.pdf', await pdf(5));
  const q = await SV.makeQuote({ type: 'bw', side: 'single', copies: 2, fileIds: [f.id], pageCounts: [1], total: 1 });
  assert.equal(q.price.pages, 5);
  assert.equal(q.price.quantity, 10);
  assert.equal(q.price.total, 10 * REAL_RATES.bw.rates.single[0]);
});
test('server accepts a genuine price and rejects a tampered one', async () => {
  const f = await SV.saveFile('three.pdf', await pdf(3));
  const q = await SV.makeQuote({ type: 'colour', size: 'A3', gsm: 300, side: 'double', copies: 4, fileIds: [f.id] });
  assert.deepEqual(await SV.verifyQuote(q.token, q.price.total), { ok: true, total: q.price.total });
  // 1. Browser sends a lower amount
  assert.equal((await SV.verifyQuote(q.token, q.price.total - 100)).reason, 'tampered');
  assert.equal((await SV.verifyQuote(q.token, q.price.total / 100)).reason, 'tampered');
  // 2. Browser edits the signed quote itself
  const [body, sig] = q.token.split('.');
  const forged = JSON.parse(Buffer.from(body, 'base64url').toString());
  forged.total = 100;
  const forgedToken = Buffer.from(JSON.stringify(forged)).toString('base64url') + '.' + sig;
  assert.equal((await SV.verifyQuote(forgedToken, 100)).reason, 'tampered');
  // 3. Garbage token
  assert.equal((await SV.verifyQuote('nonsense', 100)).reason, 'tampered');
});
test('server flags a quote when the rates change before payment', async () => {
  const f = await SV.saveFile('one.pdf', await pdf(1));
  const q = await SV.makeQuote({ type: 'bw', side: 'single', copies: 1, fileIds: [f.id] });
  const raised = JSON.parse(JSON.stringify(REAL_RATES));
  raised.bw.rates.single = raised.bw.rates.single.map((v) => v + 50);
  await SV.writeRates(raised);
  const v = await SV.verifyQuote(q.token, q.price.total);
  assert.equal(v.reason, 'price_changed');
  assert.equal(v.total, q.price.total + 50);
  await SV.writeRates(REAL_RATES);
});
test('admin key is required to save rates', () => {
  process.env.PRINT_ADMIN_KEY = 'right-key';
  assert.throws(() => SV.checkAdminKey('wrong'), { code: 'bad_admin_key' });
  assert.doesNotThrow(() => SV.checkAdminKey('right-key'));
});
