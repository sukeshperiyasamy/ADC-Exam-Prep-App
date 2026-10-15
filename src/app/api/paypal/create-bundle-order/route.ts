import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    error: 'provider_not_supported',
    message: 'ADC Exam Prep operates exclusively in INR (₹). PayPal does not support domestic INR transactions. Please choose Card via Stripe.'
  }, { status: 400 });
}
