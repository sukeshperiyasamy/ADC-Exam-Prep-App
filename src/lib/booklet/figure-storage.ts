import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getSetting } from '@/lib/settings';
import { r2PrivateConfigured, putPrivateObject, getPrivateObject, deletePrivateObject } from '@/lib/storage';

/**
 * Booklet figures are copyrighted source material until a licence is
 * confirmed, so they are NEVER written to the public image bucket path and
 * are only served through /api/booklets/figures/[id] (publication +
 * entitlement checked).
 *
 * BOOKLET_FIGURE_STORAGE:
 *   "local" (default) – private directory on the server (uploads/booklet-figures)
 *   "r2"              – R2 via signed S3 requests. Use a bucket with public
 *                       access DISABLED; R2_PUBLIC_URL is not used.
 */
const LOCAL_DIR = path.join(process.cwd(), 'uploads', 'booklet-figures');

async function shouldUseR2(): Promise<boolean> {
  return (await getSetting('BOOKLET_FIGURE_STORAGE')) === 'r2' && (await r2PrivateConfigured());
}

export async function putFigure(key: string, webp: Buffer): Promise<string> {
  if (await shouldUseR2()) {
    await putPrivateObject(`booklet-figures/${key}`, webp, 'image/webp');
    return `r2:booklet-figures/${key}`;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, webp);
  return `local:${key}`;
}

export async function getFigure(storageKey: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (storageKey.startsWith('local:')) {
    // Guard against path traversal from a tampered DB value.
    const file = path.resolve(LOCAL_DIR, storageKey.slice(6));
    if (!file.startsWith(path.resolve(LOCAL_DIR) + path.sep)) return null;
    try {
      return { body: await fs.readFile(file), contentType: 'image/webp' };
    } catch {
      return null;
    }
  }
  if (storageKey.startsWith('r2:')) {
    const key = storageKey.slice(3);
    if (!key.startsWith('booklet-figures/')) return null;
    return getPrivateObject(key);
  }
  return null;
}

export async function removeFigure(storageKey: string): Promise<void> {
  try {
    if (storageKey.startsWith('local:')) await fs.rm(path.join(LOCAL_DIR, storageKey.slice(6)), { force: true });
    else if (storageKey.startsWith('r2:') && storageKey.slice(3).startsWith('booklet-figures/')) await deletePrivateObject(storageKey.slice(3));
  } catch {
    /* best effort */
  }
}
