import { z } from 'zod';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { setFigureApproved } from '@/lib/booklet/admin-actions';

const Body = z.object({ approved: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ fid: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { fid } = await params;
  return respond(async () => setFigureApproved(fid, Body.parse(await req.json()).approved, ctx.log));
}
