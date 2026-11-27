// Server-only logic for instant printing: rate card storage, file checks + page counting,
// file storage, and signed quotes. Used by the /api/print/* routes and by the tests.
// Relative imports (not "@/") so plain `node --test` can load it.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { calculatePrice, PRINT_MAX_MB, PRINT_TYPES, validateRates } from '../lib/print-pricing.js';

const ratesFile = () => process.env.PRINT_RATES_FILE || path.join(process.cwd(), 'data', 'print-rates.json');
const uploadDir = () => process.env.PRINT_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'print');
const QUOTE_TTL_MS = 24 * 60 * 60 * 1000;

export class PrintError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

/* ---------- Rate card ---------- */
export async function readRates() {
  return JSON.parse(await fs.readFile(ratesFile(), 'utf8'));
}
export async function writeRates(next) {
  const errs = validateRates(next);
  if (errs.length) throw new PrintError('bad_rates', errs.join('; '));
  const current = await readRates();
  const out = { ...current, bw: next.bw, colour: next.colour, placeholder: next.placeholder !== false, updatedAt: new Date().toISOString() };
  const tmp = ratesFile() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(out, null, 2) + '\n');
  await fs.rename(tmp, ratesFile());
  return out;
}
export function checkAdminKey(given) {
  const key = process.env.PRINT_ADMIN_KEY;
  if (!key) throw new PrintError('no_admin_key', 'Rate editing is switched off: set PRINT_ADMIN_KEY in .env.local and restart the server.', 503);
  const a = Buffer.from(String(given || '')), b = Buffer.from(key);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new PrintError('bad_admin_key', 'Wrong admin key.', 401);
}

/* ---------- Files: type check, page count, storage ---------- */
const MAGIC = {
  pdf: (b) => b.subarray(0, 1024).includes(Buffer.from('%PDF-')),
  png: (b) => b.length > 8 && b.readUInt32BE(0) === 0x89504e47,
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
};

/** Returns the page count. Throws PrintError with a customer-friendly message. */
export async function countPages(buf, ext) {
  const kind = ext === 'jpeg' ? 'jpg' : ext;
  if (!MAGIC[kind]) throw new PrintError('unsupported', 'This file type is not supported. Upload a PDF, JPG or PNG.');
  if (!MAGIC[kind](buf)) throw new PrintError('mismatch', `This file is not a real ${kind.toUpperCase()} — it may be renamed or damaged. Please export it again.`);
  if (kind !== 'pdf') return 1;
  let n;
  try {
    // pdf-lib opens some damaged files without complaint and only fails when reading pages — keep both in the try.
    n = (await PDFDocument.load(buf, { updateMetadata: false })).getPageCount();
  } catch (e) {
    if (e?.constructor?.name === 'EncryptedPDFError' || /encrypt/i.test(e?.message || '')) {
      throw new PrintError('encrypted', 'This PDF is password-protected. Remove the password, save it again and re-upload.');
    }
    throw new PrintError('corrupt', 'This PDF looks damaged or incomplete. Please export it again and re-upload.');
  }
  if (!n) throw new PrintError('corrupt', 'This PDF has no pages. Please check the file and re-upload.');
  return n;
}

const ID_RE = /^[0-9a-f-]{36}$/;
export async function saveFile(name, buf) {
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (!PRINT_TYPES.includes(ext)) throw new PrintError('unsupported', 'This file type is not supported. Upload a PDF, JPG or PNG.');
  if (buf.length > PRINT_MAX_MB * 1048576) throw new PrintError('too_large', `This file is larger than ${PRINT_MAX_MB} MB. Please compress it or split it into smaller files.`, 413);
  if (!buf.length) throw new PrintError('empty', 'This file is empty.');
  const pages = await countPages(buf, ext);
  const id = crypto.randomUUID();
  const meta = { id, name: String(name).slice(0, 200), size: buf.length, ext, pages, at: Date.now() };
  await fs.mkdir(uploadDir(), { recursive: true });
  await fs.writeFile(path.join(uploadDir(), `${id}.${ext}`), buf);
  await fs.writeFile(path.join(uploadDir(), `${id}.json`), JSON.stringify(meta));
  return meta;
}
export async function getFileMeta(id) {
  if (!ID_RE.test(String(id))) throw new PrintError('bad_file', 'Unknown file.', 404);
  try { return JSON.parse(await fs.readFile(path.join(uploadDir(), `${id}.json`), 'utf8')); }
  catch { throw new PrintError('bad_file', 'This uploaded file was not found. Please upload it again.', 404); }
}
export async function readFileBytes(id) {
  const meta = await getFileMeta(id);
  return { meta, buf: await fs.readFile(path.join(uploadDir(), `${meta.id}.${meta.ext}`)) };
}

/* ---------- Signed quotes ---------- */
let devSecret;
function secret() {
  if (process.env.PRINT_QUOTE_SECRET) return process.env.PRINT_QUOTE_SECRET;
  if (process.env.NODE_ENV === 'production') throw new PrintError('no_secret', 'Server is missing PRINT_QUOTE_SECRET.', 500);
  devSecret ||= crypto.randomBytes(32).toString('hex');
  return devSecret;
}
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

/** Recomputes the price from the server's stored files + current rates. Never uses client page counts or amounts. */
export async function priceOnServer(input) {
  const fileIds = Array.isArray(input.fileIds) ? input.fileIds.slice(0, 50) : [];
  const metas = [];
  for (const id of fileIds) metas.push(await getFileMeta(id));
  const opts = { type: input.type, side: input.side, size: input.size, gsm: input.gsm, copies: input.copies, manualQty: input.manualQty, pageCounts: metas.map((m) => m.pages) };
  const price = calculatePrice(opts, await readRates());
  if (!price.ok) throw new PrintError('bad_options', price.error);
  return { price, metas, fileIds };
}

export async function makeQuote(input) {
  const { price, metas, fileIds } = await priceOnServer(input);
  const payload = { v: 1, opts: price.options, fileIds, quantity: price.quantity, total: price.total, exp: Date.now() + QUOTE_TTL_MS };
  const body = b64(JSON.stringify(payload));
  return { price, files: metas, token: `${body}.${sign(body)}` };
}

/** Checks a quote token and the amount the browser claims. Returns { ok, total } or { ok:false, reason, message, total? }. */
export async function verifyQuote(token, claimedTotal) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return { ok: false, reason: 'tampered', message: 'This print job could not be verified. Please add it to the cart again.' };
  const good = Buffer.from(sign(body)), got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return { ok: false, reason: 'tampered', message: 'This print job could not be verified. Please add it to the cart again.' };
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp < Date.now()) return { ok: false, reason: 'expired', message: 'This price has expired. Please add the print job to the cart again.' };
  if (!Number.isInteger(claimedTotal) || claimedTotal !== payload.total) return { ok: false, reason: 'tampered', message: 'The price in your cart does not match our price. Please add the print job again.' };
  let fresh;
  try { fresh = await priceOnServer({ ...payload.opts, fileIds: payload.fileIds }); }
  catch (e) { return { ok: false, reason: 'invalid', message: e.message }; }
  if (fresh.price.total !== payload.total) return { ok: false, reason: 'price_changed', total: fresh.price.total, message: 'Our print rates have changed since you added this job. Please check the new price.' };
  return { ok: true, total: payload.total };
}

/** Turns any thrown error into a JSON Response. */
export function errorResponse(e) {
  if (e instanceof PrintError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
  console.error('[print]', e);
  return Response.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}
