import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSetting } from '@/lib/settings';

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function r2PrivateConfigured(): Promise<boolean> {
  const keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const;
  return (await Promise.all(keys.map((k) => getSetting(k)))).every(Boolean);
}

async function r2() {
  const [accountId, accessKeyId, secretAccessKey, bucket, publicUrl] = await Promise.all([
    getSetting('R2_ACCOUNT_ID'),
    getSetting('R2_ACCESS_KEY_ID'),
    getSetting('R2_SECRET_ACCESS_KEY'),
    getSetting('R2_BUCKET'),
    getSetting('R2_PUBLIC_URL')
  ]);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error('R2 image storage is not configured (Admin → Settings → Image Storage)');
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });
  return { client, bucket, publicUrl: publicUrl.replace(/\/+$/, '') };
}

export async function uploadImage(key: string, body: Buffer, contentType: string): Promise<string> {
  const { client, bucket, publicUrl } = await r2();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return `${publicUrl}/${key}`;
}

/**
 * Private object access via the S3 API (signed requests) — does NOT use or
 * need R2_PUBLIC_URL, so it works with a bucket that has public access off.
 * Used for study-booklet figures that must only be served after an access check.
 */
export async function putPrivateObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = await r2Private();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'private, no-store' }));
}

export async function getPrivateObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  const { client, bucket } = await r2Private();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return { body: Buffer.from(await res.Body!.transformToByteArray()), contentType: res.ContentType || 'application/octet-stream' };
  } catch (e: any) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

export async function deletePrivateObject(key: string): Promise<void> {
  const { client, bucket } = await r2Private();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function r2Private() {
  const [accountId, accessKeyId, secretAccessKey, bucket] = await Promise.all([
    getSetting('R2_ACCOUNT_ID'), getSetting('R2_ACCESS_KEY_ID'), getSetting('R2_SECRET_ACCESS_KEY'), getSetting('R2_BUCKET')
  ]);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error('R2 storage is not configured (Admin → Settings → Image Storage)');
  return {
    client: new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } }),
    bucket
  };
}

export async function deleteImage(key: string): Promise<void> {
  const { client, bucket } = await r2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
