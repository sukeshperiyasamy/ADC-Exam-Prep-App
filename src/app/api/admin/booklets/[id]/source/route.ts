import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { db } from '@/lib/db';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { BookletError } from '@/lib/booklet/admin-actions';

export const runtime = 'nodejs';
const MAX_BYTES = 300 * 1024 * 1024;

/**
 * Stream the source PDF to a PRIVATE server directory (uploads/booklets/).
 * It is never uploaded to the public R2 bucket and never served back.
 * Body = raw PDF bytes.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { id } = await params;
  return respond(async () => {
    const b = await db.booklet.findUnique({ where: { id } });
    if (!b) throw new BookletError('Booklet not found', 404);
    if (!req.body) throw new BookletError('Empty body');
    const len = Number(req.headers.get('content-length') || 0);
    if (len > MAX_BYTES) throw new BookletError('PDF too large (300 MB max)', 413);
    const dir = path.join(process.cwd(), 'uploads', 'booklets');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${b.id}.pdf`);
    const tmp = `${file}.part`;
    let size = 0;
    const src = Readable.fromWeb(req.body as any);
    src.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BYTES) src.destroy(new Error('too-large'));
    });
    try {
      await pipeline(src, createWriteStream(tmp));
    } catch {
      await fs.rm(tmp, { force: true });
      throw new BookletError('Upload failed or exceeded the size limit', 413);
    }
    const head = Buffer.alloc(5);
    const fh = await fs.open(tmp, 'r');
    await fh.read(head, 0, 5, 0);
    await fh.close();
    if (head.toString('latin1') !== '%PDF-') {
      await fs.rm(tmp, { force: true });
      throw new BookletError('File is not a PDF', 415);
    }
    await fs.rename(tmp, file);
    let totalPages: number | null = null;
    try {
      const { PDFDocument } = await import('pdf-lib');
      totalPages = (await PDFDocument.load(await fs.readFile(file), { updateMetadata: false, ignoreEncryption: true })).getPageCount();
    } catch {
      /* page count is optional */
    }
    await db.booklet.update({ where: { id }, data: { sourcePath: file, totalPages } });
    await ctx.log('booklet.source.upload', 'Booklet', id, { bytes: size, totalPages });
    return { ok: true, bytes: size, totalPages };
  }, 201);
}
