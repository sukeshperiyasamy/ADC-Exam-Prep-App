import type { Prisma, Tier } from '@prisma/client';

type OrderShape = {
  tier: Tier | null;
  examId: string | null;
  bundleId: string | null;
  bundle?: { items: { examId: string; tier: Tier }[] } | null;
};

/**
 * The (examId, tier) entitlements an order grants. Single source of truth for
 * both fulfillOrder (grant) and revokeOrderEntitlements (refund), so the two
 * can never disagree about what an order unlocked.
 */
export function orderEntitlementKeys(order: OrderShape): { examId: string; tier: Tier }[] {
  if (order.bundleId && order.bundle) {
    const grantAllItems = !order.tier || order.tier === 'VOUCHER';
    const items = grantAllItems ? order.bundle.items : order.bundle.items.filter((i) => i.tier === order.tier);
    return items.map((i) => ({ examId: i.examId, tier: i.tier }));
  }
  if (!order.examId || !order.tier) throw new Error('Order has neither bundleId nor examId+tier');
  const tiers: Tier[] = order.tier === 'BUNDLE' || order.tier === 'VOUCHER' ? ['PRACTICE', 'VOUCHER'] : [order.tier];
  return tiers.map((tier) => ({ examId: order.examId!, tier }));
}

export type RevokeResult = { revoked: string[]; keptCoveredByOtherOrder: string[]; keptVoucherIssued: string[] };

/**
 * Remove the access a fully refunded / reversed order granted.
 *  - An entitlement still covered by ANOTHER PAID order of the same user is kept.
 *  - A VOUCHER entitlement whose real exam voucher was already issued is kept
 *    (the code is out in the world) and reported so an admin can follow up.
 *  - ADMIN_GRANT entitlements are a different tier and are never touched.
 * Must run inside the transaction that changes the order's status.
 */
export async function revokeOrderEntitlements(tx: Prisma.TransactionClient, orderId: string): Promise<RevokeResult> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { bundle: { include: { items: true } } }
  });
  const keys = orderEntitlementKeys(order);
  const others = await tx.order.findMany({
    where: { userId: order.userId, status: 'PAID', id: { not: order.id } },
    include: { bundle: { include: { items: true } } }
  });
  const covered = new Set(others.flatMap((o) => orderEntitlementKeys(o).map((k) => `${k.examId}:${k.tier}`)));
  const out: RevokeResult = { revoked: [], keptCoveredByOtherOrder: [], keptVoucherIssued: [] };
  for (const k of keys) {
    const tag = `${k.examId}:${k.tier}`;
    if (covered.has(tag)) {
      out.keptCoveredByOtherOrder.push(tag);
      continue;
    }
    const ent = await tx.entitlement.findUnique({
      where: { userId_examId_tier: { userId: order.userId, examId: k.examId, tier: k.tier } },
      include: { delivery: true }
    });
    if (!ent) continue;
    if (ent.voucher || ent.delivery?.status === 'SENT' || ent.delivery?.voucherCode) {
      out.keptVoucherIssued.push(tag);
      continue;
    }
    await tx.entitlement.delete({ where: { id: ent.id } }); // VoucherDelivery cascades
    out.revoked.push(tag);
  }
  return out;
}
