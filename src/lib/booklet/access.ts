/**
 * Pure access rules for booklet content. Kept free of DB/React imports so the
 * rules can be unit-tested (scripts/test-booklet-unit.ts).
 */
export type BookletLike = { status: string; licenseConfirmed: boolean; accessExamId: string | null };
export type ChapterLike = { publishedAt: Date | null; isFreePreview: boolean; reviewStatus: string };

export type Viewer = { userId?: string; isAdmin: boolean; hasEntitlement: boolean };

/** Is the chapter visible to students at all (published + clinically approved)?
 * Licensing is deliberately NOT a visibility gate here: it is a publication
 * safeguard enforced by chapterPublishBlockers, and revoking it via the admin
 * API reverts the booklet to DRAFT (admin-actions.updateBooklet). */
export function isChapterLive(b: BookletLike, c: ChapterLike): boolean {
  return b.status === 'PUBLISHED' && c.reviewStatus === 'APPROVED' && c.publishedAt !== null;
}

export type AccessDecision =
  | { ok: true; reason: 'admin' | 'entitled' | 'free-preview' }
  | { ok: false; reason: 'unpublished' | 'login-required' | 'purchase-required' };

/**
 * Admins can see everything (for preview). Students need the chapter to be
 * live AND either a free-preview chapter (signed in) or an entitlement.
 * Unpublished content returns `unpublished` so callers 404 rather than leak.
 */
export function decideAccess(b: BookletLike, c: ChapterLike, v: Viewer): AccessDecision {
  if (v.isAdmin) return { ok: true, reason: 'admin' };
  if (!isChapterLive(b, c)) return { ok: false, reason: 'unpublished' };
  if (!v.userId) return { ok: false, reason: 'login-required' };
  if (c.isFreePreview) return { ok: true, reason: 'free-preview' };
  if (v.hasEntitlement) return { ok: true, reason: 'entitled' };
  return { ok: false, reason: 'purchase-required' };
}

export type PublishBlocker = string;

/** Everything that must be true before a chapter may be published. */
export function chapterPublishBlockers(
  b: { licenseConfirmed: boolean; accessExamId: string | null },
  c: {
    processStatus: string;
    reviewStatus: string;
    reviewerName: string | null;
    approvedItemCount: number;
    draftItemCount: number;
    publishedMcqCount: number;
    highSeverityIssues: number;
  }
): PublishBlocker[] {
  const out: string[] = [];
  if (!b.licenseConfirmed) out.push('Copyright/licensing for this booklet is not confirmed.');
  if (c.processStatus !== 'PROCESSED') out.push('Chapter has not been processed successfully.');
  if (c.reviewStatus !== 'APPROVED') out.push('Chapter has not been approved by a clinical reviewer.');
  if (!c.reviewerName?.trim()) out.push('Clinical reviewer name is missing.');
  if (c.draftItemCount > 0) out.push(`${c.draftItemCount} study item(s) are still DRAFT — approve or reject each.`);
  if (c.approvedItemCount + c.publishedMcqCount === 0) out.push('Chapter has no approved content.');
  if (c.highSeverityIssues > 0) out.push(`${c.highSeverityIssues} high-severity fact-check issue(s) are unresolved.`);
  return out;
}

/** Parse a "58-65" / "58–65" page range string. */
export function parsePageRange(s: string): { from: number; to: number } | null {
  const m = s.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) return null;
  const from = Number(m[1]);
  const to = Number(m[2]);
  return from >= 1 && to >= from ? { from, to } : null;
}
