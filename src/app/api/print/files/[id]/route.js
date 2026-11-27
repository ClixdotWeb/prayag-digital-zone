// GET /api/print/files/<id> — download an uploaded print file (ids are random UUIDs).
import { errorResponse, readFileBytes } from '@/server/print-server';

export const runtime = 'nodejs';
const TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { meta, buf } = await readFileBytes(id);
    return new Response(buf, { headers: {
      'Content-Type': TYPES[meta.ext] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      'Cache-Control': 'private, no-store',
    } });
  } catch (e) { return errorResponse(e); }
}
