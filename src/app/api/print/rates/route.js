// GET /api/print/rates — current rate card (paise). PUT — save a new one (needs header x-admin-key = PRINT_ADMIN_KEY).
import { checkAdminKey, errorResponse, readRates, writeRates } from '@/server/print-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { return Response.json(await readRates(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { return errorResponse(e); }
}
export async function PUT(req) {
  try {
    checkAdminKey(req.headers.get('x-admin-key'));
    return Response.json(await writeRates(await req.json()));
  } catch (e) { return errorResponse(e); }
}
