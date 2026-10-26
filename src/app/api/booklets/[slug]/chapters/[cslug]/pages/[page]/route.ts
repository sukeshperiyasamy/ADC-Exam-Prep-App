import { NextResponse } from 'next/server';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { decideAccess } from '@/lib/booklet/access';
import { resolveViewer } from '@/lib/booklet/queries';
import { defaultRenderer } from '@/lib/booklet/pipeline';

export const runtime = 'nodejs';

/**
 * Access-checked PDF page inspector.
 * Renders the requested physical PDF page from the private source PDF into WebP
 * and caches it on disk for instant repeated views.
 *
 * Enforces the same entitlement and publication rules as the chapter reader:
 * - Unauthenticated => 401
 * - Unpublished draft (non-admin) => 404
 * - Unentitled paid chapter => 403
 * - Missing source file or out-of-range page => 404
 */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string; cslug: string; page: string }> }
) {
  const { slug, cslug, page: pageStr } = await params;
  const pageNum = parseInt(pageStr, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return new NextResponse('Invalid page number', { status: 400 });
  }

  // 1. Fetch booklet and chapter
  const b = await db.booklet.findUnique({ where: { slug } });
  if (!b) return new NextResponse('Not found', { status: 404 });

  const c = await db.bookletChapter.findUnique({
    where: { bookletId_slug: { bookletId: b.id, slug: cslug } }
  });
  if (!c) return new NextResponse('Not found', { status: 404 });

  // 2. Access control check
  const session = await auth();
  const viewer = await resolveViewer(session, b.accessExamId);
  const d = decideAccess(b, c, viewer);
  if (!d.ok) {
    if (d.reason === 'login-required') return new NextResponse('Unauthorized', { status: 401 });
    if (d.reason === 'purchase-required') return new NextResponse('Purchase required', { status: 403 });
    return new NextResponse('Not found', { status: 404 });
  }

  // 3. Page boundary check for this chapter
  if (pageNum < c.pdfPageFrom || pageNum > c.pdfPageTo) {
    return new NextResponse('Page outside chapter range', { status: 404 });
  }

  // 4. Source PDF verification
  if (!b.sourcePath || !existsSync(b.sourcePath)) {
    return new NextResponse('Source PDF not available', { status: 404 });
  }

  // 5. Look up page metadata (printed page)
  const pageMeta = await db.bookletPage.findUnique({
    where: { chapterId_pdfPage: { chapterId: c.id, pdfPage: pageNum } },
    select: { printedPage: true }
  });

  // 6. Cache check & render
  const cacheDir = path.join(process.cwd(), 'uploads', 'booklet-pages-cache', b.id);
  const cacheFile = path.join(cacheDir, `page-${pageNum}.webp`);

  let imageBytes: Buffer;
  if (existsSync(cacheFile)) {
    imageBytes = await fs.readFile(cacheFile);
  } else {
    try {
      const rendered = await defaultRenderer(b.sourcePath, [pageNum]);
      const pngBuf = rendered.get(pageNum);
      if (!pngBuf) return new NextResponse('Could not render page', { status: 500 });

      imageBytes = await sharp(pngBuf).webp({ quality: 85 }).toBuffer();
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cacheFile, imageBytes);
    } catch (err: any) {
      console.error('Failed to render PDF page:', err);
      return new NextResponse('Page render error', { status: 500 });
    }
  }

  return new NextResponse(new Uint8Array(imageBytes), {
    headers: {
      'content-type': 'image/webp',
      'cache-control': 'private, max-age=3600',
      'x-pdf-page': String(pageNum),
      'x-printed-page': pageMeta?.printedPage || '',
      'x-content-type-options': 'nosniff'
    }
  });
}
