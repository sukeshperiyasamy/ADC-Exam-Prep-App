/**
 * OTP abuse-protection regression tests (local DB, no external calls).
 *
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/adc_local npx tsx scripts/test-otp-rate-limit.ts
 *
 * Covers:
 *  1. Verify brute-force cap — after 10 failed attempts, even the CORRECT
 *     code is rejected (guards the NextAuth otp provider path too).
 *  2. DB-backed per-email request cap — issueOtp refuses when the hourly
 *     OtpCode count for the email is exhausted (survives instance restarts).
 */
import assert from 'node:assert/strict';
import argon2 from 'argon2';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:55434/adc_local';
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;

let passed = 0;
let failed = 0;
const t = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}\n    ${e?.message ?? e}`);
    process.exitCode = 1;
  }
};

async function main() {
  const { db } = await import('../src/lib/db');
  const { issueOtp, verifyOtp } = await import('../src/lib/otp');
  const log = () => {};

  console.log('OTP verify brute-force cap');
  await t('after 10 failed attempts the correct code is rejected (rate-limited)', async () => {
    const email = `otp-guard-${Date.now()}@test.local`;
    const issued = await issueOtp(email, 'LOGIN', 'smoke-test-ip');
    assert.equal(issued.ok, true, 'issueOtp should succeed for a fresh email');
    if (!issued.devCode) {
      console.log('    ℹ skipped: email delivery succeeded so the code is not observable in dev');
      await db.otpCode.deleteMany({ where: { email } });
      return;
    }
    for (let i = 0; i < 10; i++) {
      assert.equal(await verifyOtp(email, '000000', 'LOGIN'), false, `wrong attempt ${i + 1} must fail`);
    }
    // The budget is exhausted — even the CORRECT code must now be rejected.
    assert.equal(await verifyOtp(email, issued.devCode, 'LOGIN'), false, 'correct code must be rate-limited');
    await db.otpCode.deleteMany({ where: { email } });
  });

  console.log('OTP per-email request cap (DB-backed)');
  await t('issueOtp refuses when the hourly OtpCode count for the email is exhausted', async () => {
    const email = `otp-cap-${Date.now()}@test.local`;
    const hash = await argon2.hash('000000');
    await db.otpCode.createMany({
      data: Array.from({ length: 50 }, () => ({
        email,
        codeHash: hash,
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + 10 * 60_000)
      }))
    });
    const before = await db.otpCode.count({ where: { email } });
    assert.equal(before, 50, 'fixture rows created');
    const result = await issueOtp(email, 'LOGIN', 'cap-test-ip');
    assert.equal(result.ok, false, 'issueOtp must refuse');
    assert.match(result.error ?? '', /Too many codes sent/);
    const after = await db.otpCode.count({ where: { email } });
    assert.equal(after, 50, 'no additional code row may be created beyond the cap');
    await db.otpCode.deleteMany({ where: { email } });
  });

  await t('fresh emails can still request codes (cap does not over-block)', async () => {
    const email = `otp-fresh-${Date.now()}@test.local`;
    const result = await issueOtp(email, 'LOGIN', 'fresh-ip');
    assert.equal(result.ok, true, 'fresh email should pass all caps');
    await db.otpCode.deleteMany({ where: { email } });
  });

  await db.$disconnect();
  console.log(`\n${passed} passed${failed ? `, ${failed} FAILED` : ''}`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
