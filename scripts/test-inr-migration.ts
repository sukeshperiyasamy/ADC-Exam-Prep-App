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

  // Test 3: Existing database transactions integrity (informational on fresh DBs)
  console.log('\n--- Test Suite 3: Existing Historical Orders in DB ---');
  const existingOrders = await db.order.findMany({ where: { status: 'PAID' } });
  if (existingOrders.length === 0) {
    console.log(`ℹ [SKIP] No PAID orders in this database — historical-preservation checks need seeded orders.`);
  } else {
    assert(true, `Found ${existingOrders.length} existing completed order(s)`);
  }
  for (const o of existingOrders) {
    // Data-driven relabel guard: every order must render with its OWN stored
    // currency — INR with ₹, legacy currencies with their explicit label
    // (e.g. "SGD $"). A bare "$" or a currency mismatch means relabeling.
    const display = formatPrice(o.amount, o.currency);
    if (o.currency.toUpperCase() === 'INR') {
      assert(
        display.startsWith('₹'),
        `Order ${o.number ?? o.id} (INR) displays with ₹ (received: "${display}")`
      );
    } else {
      assert(
        !display.startsWith('₹') && !display.startsWith('$'),
        `Legacy order ${o.number ?? o.id} (${o.currency}) keeps its explicit legacy label (received: "${display}")`
      );
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

  // Test 8: SGD-label regression guard — scan src/ for currency labels outside
  // the legacy-formatting allowlist. New code must never introduce SGD display,
  // and historical formatters keep their explicit legacy labels.
  console.log('\n--- Test Suite 8: SGD Regression Guard (source scan) ---');
  const path = await import('node:path');
  const fsSync = await import('node:fs');
  const srcRoot = path.join(process.cwd(), 'src');
  const allowFiles = new Set(['utils.ts', 'handlebars.ts', 'layout.ts', 'hitpay.ts']);
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fp);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const rel = path.relative(srcRoot, fp).replaceAll('\\', '/');
      const lines = fsSync.readFileSync(fp, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/SGD/.test(line) && !/S\$\s*\d/.test(line)) return;
        const marked = /legacy|historical|disabled|INR-only|never relabel/i.test(line);
        const inAllow =
          allowFiles.has(rel.split('/').pop() ?? '') ||
          rel.includes('checkout/methods') ||
          rel.includes('payment-guide') ||
          rel.includes('paynow/create-order'); // the INR-only rejection guard itself
        if (!marked && !inAllow) {
          offenders.push(`src/${rel}:${i + 1}: ${line.trim().slice(0, 110)}`);
        }
      });
    }
  };
  walk(srcRoot);
  assert(
    offenders.length === 0,
    `No un-allowlisted SGD references in src (found: ${offenders.length === 0 ? 'none' : offenders.length})`
  );
  if (offenders.length > 0) {
    for (const o of offenders) console.error(`   ✗ ${o}`);
  }

  // Test 9: Schema ↔ Migrations consistency — schema.prisma must be fully
  // covered by versioned migrations (drift guard against bare `db push`).
  console.log('\n--- Test Suite 9: Schema ↔ Migrations Drift Guard ---');
  const { execSync } = await import('node:child_process');
  await db.$executeRawUnsafe('DROP DATABASE IF EXISTS shadow_inr_guard');
  await db.$executeRawUnsafe('CREATE DATABASE shadow_inr_guard');
  let drifted = false;
  let diffOutput = '';
  try {
    execSync(
      'npx prisma migrate diff --from-migrations prisma/migrations --shadow-database-url postgresql://postgres:postgres@127.0.0.1:55434/shadow_inr_guard --to-schema-datamodel prisma/schema.prisma --exit-code',
      { stdio: 'pipe', encoding: 'utf8' }
    );
  } catch (e: any) {
    drifted = true;
    diffOutput = `${e.stdout ?? ''}${e.stderr ?? ''}`.slice(0, 1500);
  }
  await db.$executeRawUnsafe('DROP DATABASE IF EXISTS shadow_inr_guard');
  assert(!drifted, `prisma/schema.prisma is fully covered by migrations (drift: ${drifted ? 'YES' : 'none'})`);
  if (drifted) console.error(`   ✗ drift SQL:\n${diffOutput}`);

  // Test 10: Per-currency revenue honesty — legacy SGD orders must never be
  // summed into INR headline totals, and revenueBy buckets stay per-currency.
  console.log('\n--- Test Suite 10: Per-Currency Revenue Honesty ---');
  const { paidOrdersIn, revenueBy } = await import('../src/lib/analytics');
  const wideRange = () => ({ from: new Date(Date.now() - 3650 * 864e5), to: new Date(Date.now() + 864e5) });
  let adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    adminUser = await db.user.create({
      data: { email: `rev-guard-${Date.now()}@test.local`, role: 'ADMIN', active: true, emailVerified: new Date() }
    });
  }
  const mkPaidOrder = (amount: number, currency: string) =>
    db.order.create({
      data: { userId: adminUser.id, status: 'PAID', amount, currency, provider: 'STRIPE', capturedAt: new Date() },
      select: { id: true }
    });
  const sgdOrder = await mkPaidOrder(4900, 'SGD');
  const before = await paidOrdersIn(wideRange());
  const inrOrder = await mkPaidOrder(149900, 'INR');
  const mid = await paidOrdersIn(wideRange());
  assert(
    mid.grossCents === before.grossCents + 149900,
    `INR order adds exactly ₹1,499 to INR gross (delta: ${mid.grossCents - before.grossCents})`
  );
  assert(mid.nonInrOrders >= 1, `legacy non-INR orders counted separately (${mid.nonInrOrders})`);
  const sgdBefore = (await revenueBy('tier', wideRange())).filter((b) => b.currency === 'SGD').reduce((s, b) => s + b.amount, 0);
  const inrBucketBefore = (await revenueBy('tier', wideRange())).filter((b) => b.currency === 'INR').reduce((s, b) => s + b.amount, 0);
  await db.order.delete({ where: { id: inrOrder.id } });
  await db.order.delete({ where: { id: sgdOrder.id } });
  const sgdAfter = (await revenueBy('tier', wideRange())).filter((b) => b.currency === 'SGD').reduce((s, b) => s + b.amount, 0);
  const inrBucketAfter = (await revenueBy('tier', wideRange())).filter((b) => b.currency === 'INR').reduce((s, b) => s + b.amount, 0);
  assert(
    sgdBefore === 4900 && sgdAfter === 0,
    `SGD order sits in an isolated SGD bucket (before: ${sgdBefore}, after cleanup: ${sgdAfter})`
  );
  assert(
    inrBucketBefore - inrBucketAfter === 149900,
    `INR bucket delta exactly ₹1,499 (delta: ${inrBucketBefore - inrBucketAfter})`
  );

  // Test 11: Server-action forms must not carry encType/method attributes
  // (React sets multipart automatically; manual attributes cause warnings).
  console.log('\n--- Test Suite 11: Server-Action Form Guard ---');
  const pathMod = await import('node:path');
  const formOffenders: string[] = [];
  const walkForms = (dir: string) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      const fp = pathMod.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkForms(fp);
        continue;
      }
      if (!/\.tsx$/.test(entry.name)) continue;
      const lines = fsSync.readFileSync(fp, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/<form/i.test(line) && /encType=/i.test(line)) {
          formOffenders.push(`src/${pathMod.relative(srcRoot, fp).replaceAll('\\', '/')}:${i + 1}`);
        }
      });
    }
  };
  walkForms(srcRoot);
  assert(formOffenders.length === 0, `No server-action form carries encType/method attributes (found: ${formOffenders.length === 0 ? 'none' : formOffenders.join(', ')})`);

  // Test 12: Live-DB ↔ schema drift guard — the database the app actually
  // connects to must match schema.prisma (catches wrong/stale DATABASE_URL
  // and databases drifted from the schema). Refuses non-local URLs.
  console.log('\n--- Test Suite 12: Live-DB ↔ Schema Drift Guard ---');
  const liveUrl = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(liveUrl)) {
    console.log('ℹ [SKIP] DATABASE_URL is not a local database — live drift check requires a local target.');
  } else {
    let liveDrift = false;
    let liveDiff = '';
    try {
      execSync(
        `npx prisma migrate diff --from-url "${liveUrl}" --to-schema-datamodel prisma/schema.prisma --exit-code`,
        { stdio: 'pipe', encoding: 'utf8' }
      );
    } catch (e: any) {
      liveDrift = true;
      liveDiff = `${e.stdout ?? ''}${e.stderr ?? ''}`.slice(0, 1500);
    }
    assert(!liveDrift, `Live database matches prisma/schema.prisma (drift: ${liveDrift ? 'YES' : 'none'})`);
    if (liveDrift) console.error(`   ✗ drift SQL:\n${liveDiff}`);
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
