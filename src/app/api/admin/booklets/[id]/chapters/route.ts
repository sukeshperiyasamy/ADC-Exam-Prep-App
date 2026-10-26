import { z } from 'zod';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { addChapter } from '@/lib/booklet/admin-actions';

const Body = z.object({
  title: z.string().min(1).max(200),
  pdfPageFrom: z.coerce.number().int().min(1),
  pdfPageTo: z.coerce.number().int().min(1),
  isFreePreview: z.boolean().optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { id } = await params;
  return respond(async () => addChapter(id, Body.parse(await req.json()), ctx.log), 201);
}
