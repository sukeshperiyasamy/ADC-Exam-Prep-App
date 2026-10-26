import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from '@/lib/storage';

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file-required' }, { status: 400 });
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'unsupported-type' }, { status: 415 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'too-large' }, { status: 413 });

  const key = `uploads/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
  try {
    const url = await uploadImage(key, Buffer.from(await file.arrayBuffer()), file.type);
    await db.adminLog.create({
      data: { adminId: user.id, action: 'image.upload', targetType: 'Image', targetId: key, metadata: { url, size: file.size } }
    });
    return NextResponse.json({ url, key }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'upload-failed', message: e?.message }, { status: 500 });
  }
}
