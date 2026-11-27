// POST /api/print/quote — { type, side, size, gsm, copies, manualQty, fileIds } → server price + signed token.
// Page counts come from the files stored on the server; any amount sent by the browser is ignored.
import { errorResponse, makeQuote } from '@/server/print-server';

export const runtime = 'nodejs';

export async function POST(req) {
  try { return Response.json(await makeQuote(await req.json())); }
  catch (e) { return errorResponse(e); }
}
