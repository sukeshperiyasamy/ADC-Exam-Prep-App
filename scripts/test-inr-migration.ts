import { formatPrice } from '../src/lib/utils';
import { db } from '../src/lib/db';

async function runTests() {
  console.log('=== STARTING INR PAYMENTS MIGRATION ACCEPTANCE TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${desc}`);
      failed++;
    }
  }

  // Test 1: Indian Rupee formatting
  console.log('--- Test Suite 1: INR Formatting ---');
  assert(formatPrice(149900) === '₹1,499', `formatPrice(149900) === "₹1,499" (received: "${formatPrice(149900)}")`);
  assert(formatPrice(149900, 'INR') === '₹1,499', `formatPrice(149900, 'INR') === "₹1,499" (received: "${formatPrice(149900, 'INR')}")`);
  assert(formatPrice(149950, 'INR') === '₹1,499.50', `formatPrice(149950, 'INR') === "₹1,499.50" (received: "${formatPrice(149950, 'INR')}")`);
  assert(formatPrice(0) === 'Free', `formatPrice(0) === "Free" (received: "${formatPrice(0)}")`);

  // Test 2: Historical transactions formatting preserved
  console.log('\n--- Test Suite 2: Historical Currency Preservation ---');
  assert(formatPrice(4900, 'SGD') === 'SGD $49.00', `formatPrice(4900, 'SGD') === "SGD $49.00" (received: "${formatPrice(4900, 'SGD')}")`);
  assert(formatPrice(2900, 'USD') === '$29.00', `formatPrice(2900, 'USD') === "$29.00" (received: "${formatPrice(2900, 'USD')}")`);

  // Test 3: Existing database transactions integrity
  console.log('\n--- Test Suite 3: Existing Historical Orders in DB ---');
  const existingOrders = await db.order.findMany({ where: { status: 'PAID' } });
  assert(existingOrders.length > 0, `Found ${existingOrders.length} existing completed order(s)`);
  for (const o of existingOrders) {
    if (o.number === 'ORD-000001') {
      assert(o.currency === 'SGD', `Historical order ORD-000001 currency preserved as SGD (actual: ${o.currency})`);
      assert(o.amount === 4900, `Historical order ORD-000001 amount preserved as 4900 cents (actual: ${o.amount})`);
    }
  }

  // Test 4: ADC Exam Bundle authoritative price in DB
  console.log('\n--- Test Suite 4: Authoritative INR Product Pricing ---');
  const bundle = await db.bundle.findUnique({ where: { slug: 'adc-written-exam-prep-bundle' } });
  assert(!!bundle, 'ADC Written Exam Prep Bundle exists');
  assert(bundle?.price === 149900, `Bundle price is 149900 paise (₹1,499) (actual: ${bundle?.price})`);
  assert(formatPrice(bundle?.price ?? 0) === '₹1,499', `Bundle price formats to ₹1,499`);

  // Test 5: Verify Payment Methods API returns INR
  console.log('\n--- Test Suite 5: Checkout Methods Denomination ---');
  const { GET: getMethods } = await import('../src/app/api/checkout/methods/route');
  const methodsRes = await getMethods();
  const methodsData = await methodsRes.json();
  const stripeMethod = methodsData.methods.find((m: any) => m.id === 'STRIPE');
  const paynowMethod = methodsData.methods.find((m: any) => m.id === 'PAYNOW');
  const hitpayMethod = methodsData.methods.find((m: any) => m.id === 'HITPAY');
  const paypalMethod = methodsData.methods.find((m: any) => m.id === 'PAYPAL');

  assert(stripeMethod?.currency === 'INR', `Stripe method is denominated in INR`);
  assert(stripeMethod?.enabled === true, `Stripe method is enabled for INR`);
  assert(paynowMethod?.enabled === false, `PayNow is disabled for INR (SGQR only supports SGD)`);
  assert(hitpayMethod?.enabled === false, `HitPay is disabled for INR`);
  assert(paypalMethod?.enabled === false, `PayPal is disabled for INR`);

  // Test 6: Rejection of non-INR order creation
  console.log('\n--- Test Suite 6: Non-INR Providers Rejected Server-side ---');
  const { POST: postPayNow } = await import('../src/app/api/paynow/create-order/route');
  const paynowRes = await postPayNow();
  assert(paynowRes.status === 400, `PayNow order creation rejected with 400 (status: ${paynowRes.status})`);

  const { POST: postHitPay } = await import('../src/app/api/hitpay/create-order/route');
  const hitpayRes = await postHitPay();
  assert(hitpayRes.status === 400, `HitPay order creation rejected with 400 (status: ${hitpayRes.status})`);

  const { POST: postPayPal } = await import('../src/app/api/paypal/create-bundle-order/route');
  const paypalRes = await postPayPal();
  assert(paypalRes.status === 400, `PayPal order creation rejected with 400 (status: ${paypalRes.status})`);

  // Test 7: Stripe Webhook Currency and Amount Validation
  console.log('\n--- Test Suite 7: Webhook Signature, Currency & Amount Verification ---');
  const { POST: postStripeWebhook } = await import('../src/app/api/stripe/webhook/route');
  
  // Unsigned webhook must be rejected with 400
  const unsignedRes = await postStripeWebhook(new Request('http://localhost:3040/api/stripe/webhook', {
    method: 'POST',
    body: JSON.stringify({ id: 'evt_test_1', type: 'checkout.session.completed' })
  }));
  assert(unsignedRes.status === 400, `Unsigned Stripe webhook rejected with 400 (status: ${unsignedRes.status})`);

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
