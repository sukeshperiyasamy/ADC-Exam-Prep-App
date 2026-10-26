import { z } from 'zod';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { editQuestion } from '@/lib/booklet/admin-actions';

const Body = z.object({ mcq: z.unknown().optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ qid: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { qid } = await params;
  return respond(async () => editQuestion(qid, Body.parse(await req.json()), ctx.log));
}
