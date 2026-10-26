-- Cashfree payment provider + gateway lifecycle columns + payment audit trail.
-- Additive only. Enum values use IF NOT EXISTS because 'STRIPE' was added to
-- the schema without a migration (pre-existing drift): some databases already
-- have it, others (fresh installs) do not.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'STRIPE';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'CASHFREE';

-- AlterTable (currency default INR: also pre-existing schema drift; idempotent)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "disputeStatus" TEXT,
ADD COLUMN IF NOT EXISTS "providerExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "providerSessionId" TEXT,
ADD COLUMN IF NOT EXISTS "providerStatus" TEXT,
ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3),
ALTER COLUMN "currency" SET DEFAULT 'INR';

-- CreateTable
CREATE TABLE "PaymentStateChange" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentStateChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentStateChange_orderId_createdAt_idx" ON "PaymentStateChange"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentStateChange" ADD CONSTRAINT "PaymentStateChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
