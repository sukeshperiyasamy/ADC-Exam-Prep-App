import { db } from './db';

export type PageDefault = {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  showInFooter: boolean;
  footerGroup: 'legal' | 'company' | null;
  position: number;
};

const PARA = (s: string) => `<p style="margin:0 0 12px;line-height:1.7">${s}</p>`;
const HEADING = (s: string) => `<h2 style="margin:24px 0 8px;font-size:1.25rem;font-weight:600">${s}</h2>`;

export const DEFAULT_PAGES: PageDefault[] = [
  {
    slug: 'about-us',
    title: 'About ADC Exam Prep',
    excerpt: 'Prepare with confidence for your Australian Dental Council examination — our mission, how we work, and exam preparation resources.',
    showInFooter: true,
    footerGroup: 'legal',
    position: 5,
    bodyHtml: [
      PARA('<strong>Prepare with confidence for the ADC Examination.</strong>'),
      PARA('ADC Exam Prep exists to help dental professionals pass the Australian Dental Council examination with confidence. We believe the right way to prepare is with high-yield clinical scenarios and questions that mirror the real exam in format, difficulty, and domain distribution, while reinforcing core clinical principles with comprehensive explanations.'),
      HEADING('Our mission'),
      PARA('Make high-quality dental examination preparation accessible, rigorous, and reliable. Every practice question is crafted around ADC blueprint domains and paired with clear clinical explanations and references so you understand the underlying rationale.'),
      HEADING('What we provide'),
      PARA('We provide full-length simulated mock exams and topical practice tests covering all key areas evaluated in the ADC Part 1 Written Examination, including Restorative Dentistry, Periodontics, Endodontics, Oral Surgery, Orthodontics, Pediatric Dentistry, and Infection Control.'),
      HEADING('Key features'),
      PARA('<strong>Blueprint-aligned clinical MCQs.</strong> Questions designed to evaluate diagnosis, treatment planning, and clinical decision making.'),
      PARA('<strong>Detailed rationales.</strong> In-depth explanations clarifying correct and incorrect options for every question.'),
      PARA('<strong>Simulated Exam & Practice Modes.</strong> Timed simulations replicate official exam conditions, while practice mode provides immediate feedback for effective revision.'),
      HEADING('Who we are'),
      PARA('[Organization Overview: Add your company, institution, or initiative background here. Example: ADC Exam Prep is an independent dental education and exam preparation platform dedicated to assisting international dental practitioners.]'),
      HEADING('Get in touch'),
      PARA('Email: <a href="mailto:[support@yourdomain.com]" style="color:#0f766e;text-decoration:underline">[support@yourdomain.com]</a><br>Tel: [Contact Phone Number, e.g. +1 234 567 8900]<br>Address: [Physical Business Address / Location, City, Country]')
    ].join('')
  },
  {
    slug: 'how-it-works',
    title: 'How it works',
    excerpt: 'How to study with our practice exams.',
    showInFooter: true,
    footerGroup: 'company',
    position: 10,
    bodyHtml: [
      PARA('Our practice exams are designed to mirror the structure, difficulty, and topic weighting of the real certification.'),
      HEADING('1. Try {{TEASER_N}} questions free'),
      PARA('Every exam ships with a free teaser. No credit card required.'),
      HEADING('2. Practice mode'),
      PARA('See the correct answer and an explanation immediately after each question. Build your understanding.'),
      HEADING('3. Exam mode'),
      PARA('Timed simulation that matches the real test duration. Get a per-domain breakdown of your score.'),
      HEADING('4. Voucher option'),
      PARA('Some exams include a discounted real-exam voucher delivered within 3-5 business days. Use it at the certification vendor to book your test.')
    ].join('')
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    excerpt: 'Terms governing use of our service.',
    showInFooter: true,
    footerGroup: 'legal',
    position: 10,
    bodyHtml: [
      PARA('By accessing or using this platform you agree to these terms.'),
      HEADING('Accounts'),
      PARA('You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.'),
      HEADING('Content'),
      PARA('All practice questions, explanations, and supplementary materials are our original work, protected by copyright. You may use them for personal exam preparation only — redistribution or resale is prohibited.'),
      HEADING('Vouchers'),
      PARA('Exam vouchers are issued by third-party certification bodies. Voucher delivery times depend on inventory availability and typically take 3-5 business days.'),
      HEADING('Limitation of liability'),
      PARA('We provide practice materials on an "as is" basis. We do not guarantee a passing score on any real certification exam.'),
      PARA('<em>Last updated: this date should be edited via the admin Pages dashboard.</em>')
    ].join('')
  },
  {
    slug: 'support',
    title: 'Contact & Support',
    excerpt: 'Get help with exam access, billing, vouchers, refunds, or question content.',
    showInFooter: true,
    footerGroup: 'company',
    position: 25,
    bodyHtml: [
      PARA('Our support team helps with practice-exam access, billing, account access, and question-content inquiries.'),
      HEADING('Contact support'),
      PARA('Email <a href="mailto:[support@yourdomain.com]" style="color:#0f766e;text-decoration:underline">[support@yourdomain.com]</a>. We typically reply within one business day.'),
      HEADING('Include these details'),
      PARA('Please include your account email, order number (if applicable), exam code, and a short description of the issue. Do not email passwords or payment-card details.'),
      HEADING('Access delivery'),
      PARA('Practice test access unlocks immediately in your account dashboard after enrollment or purchase.'),
      HEADING('Refunds'),
      PARA('See our <a href="/p/refund-policy" style="color:#0f766e;text-decoration:underline">Refund Policy</a> for eligibility and processing times.'),
      HEADING('Company / Organization Details'),
      PARA('[Legal Business / Institution Name]<br>[Business Address, City, Postal Code, Country]<br>Tel: [Contact Phone Number, e.g. +1 234 567 8900]')
    ].join('')
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    excerpt: 'How we collect and handle your data.',
    showInFooter: true,
    footerGroup: 'legal',
    position: 20,
    bodyHtml: [
      PARA('We collect only the information needed to deliver our service: your email, name, and exam progress.'),
      HEADING('What we collect'),
      PARA('Account: email, name, optional password.<br>Purchases: billing details, order history, payment provider transaction id (we never store card numbers).<br>Usage: questions answered, mock test scores, and performance analytics.'),
      HEADING('What we don\'t do'),
      PARA('We do not sell your personal data. We do not run third-party advertising trackers on your account pages.'),
      HEADING('Your rights'),
      PARA('You may request deletion of your account and associated data at any time by emailing <a href="mailto:[support@yourdomain.com]" style="color:#0f766e;text-decoration:underline">[support@yourdomain.com]</a>.')
    ].join('')
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    excerpt: 'When and how refunds are issued.',
    showInFooter: true,
    footerGroup: 'legal',
    position: 30,
    bodyHtml: [
      PARA('We want you to be confident in your preparation materials.'),
      HEADING('Practice exams & mock tests'),
      PARA('Full refund within 7 days of purchase if you have answered fewer than {{TEASER_N}} questions across all attempts. Email <a href="mailto:[support@yourdomain.com]" style="color:#0f766e;text-decoration:underline">[support@yourdomain.com]</a> with your order details.'),
      HEADING('How to request'),
      PARA('Reply to your order confirmation email or contact <a href="mailto:[support@yourdomain.com]" style="color:#0f766e;text-decoration:underline">[support@yourdomain.com]</a> directly. Approved refunds are returned to the original payment method within 5-10 business days.')
    ].join('')
  }
];

// Idempotently seeds the default pages. Creates a row only if the slug
// doesn't exist — never overwrites admin edits.
export async function seedDefaultPages(): Promise<{ created: string[]; skipped: string[] }> {
  const existing = await db.page.findMany({ select: { slug: true } });
  const have = new Set(existing.map((r) => r.slug));
  const created: string[] = [];
  const skipped: string[] = [];
  for (const p of DEFAULT_PAGES) {
    if (have.has(p.slug)) {
      skipped.push(p.slug);
      continue;
    }
    await db.page.create({
      data: {
        slug: p.slug,
        title: p.title,
        bodyHtml: p.bodyHtml,
        excerpt: p.excerpt,
        showInFooter: p.showInFooter,
        footerGroup: p.footerGroup,
        position: p.position,
        published: true
      }
    });
    created.push(p.slug);
  }
  return { created, skipped };
}

export async function getFooterPages() {
  return db.page.findMany({
    where: { published: true, showInFooter: true },
    select: { slug: true, title: true, footerGroup: true, position: true },
    orderBy: [{ footerGroup: 'asc' }, { position: 'asc' }, { title: 'asc' }]
  });
}
