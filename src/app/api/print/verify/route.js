// POST /api/print/verify — { items: [{ token, total }] } → checked before payment. Rejects tampered or outdated prices.
import { errorResponse, verifyQuote } from '@/server/print-server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { items } = await req.json();
    const results = [];
    for (const it of (Array.isArray(items) ? items : []).slice(0, 100)) results.push(await verifyQuote(it.token, it.total));
    return Response.json({ ok: results.every((r) => r.ok), results }, { status: results.every((r) => r.ok) ? 200 : 409 });
  } catch (e) { return errorResponse(e); }
}
