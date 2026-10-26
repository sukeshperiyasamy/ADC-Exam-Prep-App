import { z } from 'zod';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { createBooklet } from '@/lib/booklet/admin-actions';

const Body = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(60).optional(),
  publisher: z.string().max(200).optional(),
  description: z.string().max(5000).optional()
});

export async function POST(req: Request) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  return respond(async () => createBooklet(Body.parse(await req.json()), ctx.log), 201);
}
