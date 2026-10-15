import { db } from '../src/lib/db';

async function main() {
  const newHtml = [
    '<p style="margin:0 0 12px;line-height:1.7">Our support team helps with practice-exam access, billing, account access, and question-content inquiries.</p>',
    '<h2 style="margin:24px 0 8px;font-size:1.25rem;font-weight:600">Contact support</h2>',
    '<p style="margin:0 0 12px;line-height:1.7">Email <a href="mailto:[support@yourdomain.com]" style="color:#0f766e;text-decoration:underline">[support@yourdomain.com]</a>. We typically reply within one business day.</p>',
    '<h2 style="margin:24px 0 8px;font-size:1.25rem;font-weight:600">Include these details</h2>',
    '<p style="margin:0 0 12px;line-height:1.7">Please include your account email, order number (if applicable), exam code, and a short description of the issue. Do not email passwords or payment-card details.</p>',
    '<h2 style="margin:24px 0 8px;font-size:1.25rem;font-weight:600">Access delivery</h2>',
    '<p style="margin:0 0 12px;line-height:1.7">Practice test access unlocks immediately in your account dashboard after enrollment or purchase.</p>',
    '<h2 style="margin:24px 0 8px;font-size:1.25rem;font-weight:600">Refunds</h2>',
    '<p style="margin:0 0 12px;line-height:1.7">See our <a href="/p/refund-policy" style="color:#0f766e;text-decoration:underline">Refund Policy</a> for eligibility and processing times.</p>',
    '<h2 style="margin:24px 0 8px;font-size:1.25rem;font-weight:600">Company / Organization Details</h2>',
    '<p style="margin:0 0 12px;line-height:1.7">[Legal Business / Institution Name]<br>[Business Address, City, Postal Code, Country]<br>Tel: [Contact Phone Number, e.g. +1 234 567 8900]</p>'
  ].join('');

  await db.page.updateMany({
    where: { slug: 'support' },
    data: { bodyHtml: newHtml }
  });
  console.log('SUCCESS: Updated support page in database');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
