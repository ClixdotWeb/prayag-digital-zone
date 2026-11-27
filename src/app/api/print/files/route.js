// POST /api/print/files — upload one file (field "file"). Checks type/size, counts pages on the server, stores it.
import { PRINT_MAX_MB } from '@/lib/print-pricing';
import { errorResponse, PrintError, saveFile } from '@/server/print-server';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const len = Number(req.headers.get('content-length') || 0);
    if (len > (PRINT_MAX_MB + 1) * 1048576) throw new PrintError('too_large', `This file is larger than ${PRINT_MAX_MB} MB. Please compress it or split it into smaller files.`, 413);
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') throw new PrintError('no_file', 'No file received.');
    const meta = await saveFile(file.name, Buffer.from(await file.arrayBuffer()));
    return Response.json({ file: { ...meta, url: `/api/print/files/${meta.id}` } });
  } catch (e) { return errorResponse(e); }
}
