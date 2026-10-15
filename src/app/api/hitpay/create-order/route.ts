import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({
    error: 'provider_not_supported',
    message: 'ADC Exam Prep accepts payments exclusively in INR. HitPay does not support INR payments. Please choose Card via Stripe.'
  }, { status: 400 });
}
