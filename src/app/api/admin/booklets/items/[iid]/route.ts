import { z } from 'zod';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { editItem } from '@/lib/booklet/admin-actions';

const Body = z.object({
  data: z.unknown().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']).optional(),
  pages: z.array(z.number().int()).optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ iid: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { iid } = await params;
  return respond(async () => editItem(iid, Body.parse(await req.json()), ctx.log));
}
