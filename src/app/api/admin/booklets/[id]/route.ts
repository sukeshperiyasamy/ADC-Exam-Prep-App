import { z } from 'zod';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { updateBooklet } from '@/lib/booklet/admin-actions';

const Body = z.object({
  title: z.string().max(200).optional(),
  publisher: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  licenseConfirmed: z.boolean().optional(),
  licenseNote: z.string().max(5000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { id } = await params;
  return respond(async () => updateBooklet(id, Body.parse(await req.json()), ctx.log));
}
