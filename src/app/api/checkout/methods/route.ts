import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';

export async function GET() {
  const [paypal, hitpay, paynow, stripe, paypalClient] = await Promise.all([
    getSetting('PAYPAL_ENABLED'),
    getSetting('HITPAY_ENABLED'),
    getSetting('PAYNOW_ENABLED'),
    getSetting('STRIPE_ENABLED'),
    getSetting('PAYPAL_CLIENT_ID')
  ]);
  // PayPal historically had no enabled flag; treat empty as "on" if a client id
  // is configured so we don't regress existing deployments.
  const paypalOn = paypal === 'true' || (paypal === '' && !!paypalClient);
  return NextResponse.json({
    methods: [
      // All public catalogue prices and new checkout orders are denominated
      // exclusively in Indian Rupees (INR) so the displayed amount matches the charge.
      // Stripe is the authoritative provider supporting INR payments.
      // PayNow (SGD SGQR), HitPay, and PayPal do not process domestic INR and are disabled.
      { id: 'STRIPE', enabled: stripe === 'true' || stripe === '', currency: 'INR' },
      { id: 'PAYPAL', enabled: false, currency: 'INR' },
      { id: 'HITPAY', enabled: false, currency: 'INR' },
      { id: 'PAYNOW', enabled: false, currency: 'INR' }
    ],
    // The PayPal JS SDK needs the client id in the browser. It's a public
    // (non-secret) value; serving the admin-configured one here means the
    // dashboard setting actually takes effect instead of only the build-time
    // NEXT_PUBLIC_PAYPAL_CLIENT_ID env (which fell back to sandbox 'sb').
    paypalClientId: paypalClient || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || null
  });
}
