import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({
    error: 'provider_not_supported',
    message: 'ADC Exam Prep accepts payments exclusively in INR. PayNow only supports SGD payments in Singapore. Please choose Card via Stripe.'
  }, { status: 400 });
}
