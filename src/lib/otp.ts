import argon2 from 'argon2';
import { db } from './db';
import { sendOTPEmail } from './mail';
import { rateLimit } from './ratelimit';

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'RESET' | 'TEASER_GATE';

export async function issueOtp(email: string, purpose: OtpPurpose, ip: string) {
  const isDevOrDemo =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_TEST_PAYMENTS === 'true' ||
    (process.env.SMTP_HOST || '').includes('localhost');

  const ipLimit = isDevOrDemo ? 100 : 5;
  const emailLimit = isDevOrDemo ? 50 : 3;

  // 5/hour/IP (in-memory, best-effort per serverless instance), 3/hour/email.
  const ipRl = rateLimit(`otp:ip:${ip}`, ipLimit, 60 * 60_000);
  if (!ipRl.ok) return { ok: false as const, error: 'Too many requests, try later' };
  const emailRl = rateLimit(`otp:email:${email}`, emailLimit, 60 * 60_000);
  if (!emailRl.ok) return { ok: false as const, error: 'Too many codes sent to this email' };

  // Authoritative per-email cap counted from the database — unlike the
  // in-memory limiter it survives instance restarts and is shared across
  // serverless instances.
  const normalizedEmail = email.toLowerCase().trim();
  const recentCount = await db.otpCode.count({
    where: { email: normalizedEmail, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } }
  });
  if (recentCount >= emailLimit) {
    return { ok: false as const, error: 'Too many codes sent to this email' };
  }

  // Invalidate any prior unconsumed codes for this email+purpose so only
  // the newest code is ever valid. Caps the brute-force surface to one
  // 6-digit code at a time, not N live codes accumulating. (Teaser-audit M2.)
  await db.otpCode.updateMany({
    where: { email: email.toLowerCase().trim(), purpose, consumed: false },
    data: { consumed: true }
  });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const otp = await db.otpCode.create({
    data: {
      email: email.toLowerCase().trim(),
      codeHash: await argon2.hash(code),
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60_000)
    }
  });

  try {
    await sendOTPEmail(email, code, purpose);
  } catch (err: any) {
    console.warn(`[OTP] Email delivery failed (${err?.message || err}).`);
    console.log(`\n======================================================\n[DEV/DEMO OTP CODE]\nRecipient: ${email}\nPurpose: ${purpose}\nCode: ${code}\n======================================================\n`);

    if (isDevOrDemo) {
      return { ok: true as const, devCode: code };
    }

    await db.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    return { ok: false as const, error: 'Could not send the email code. Please try again later.', deliveryFailed: true as const };
  }
  return { ok: true as const, devCode: isDevOrDemo ? code : undefined };
}

export async function verifyOtp(email: string, code: string, purpose: OtpPurpose) {
  const normalizedEmail = email.toLowerCase().trim();
  // Cap guesses per target email (10/hour) at the library level so the cap
  // covers BOTH the /api/otp/verify route and the NextAuth otp provider
  // (lib/auth.ts), which does not pass through that route's limiter. With a
  // single live 6-digit code this makes brute force impractical.
  if (!rateLimit(`otp-verify:email:${normalizedEmail}`, 10, 3_600_000).ok) return false;
  const otp = await db.otpCode.findFirst({
    where: { email: normalizedEmail, purpose, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
  if (!otp) return false;
  const ok = await argon2.verify(otp.codeHash, code);
  if (!ok) return false;
  await db.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}
