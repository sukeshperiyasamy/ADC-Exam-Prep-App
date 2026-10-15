import { db } from '../src/lib/db';

async function main() {
  const companyName = process.env.COMPANY_NAME || 'ADC Exam Preparation Institute';
  const companyAddress = process.env.COMPANY_ADDRESS || '123 Dental Practice Way, Suite 400, Sydney, NSW 2000';
  const companyEmail = process.env.COMPANY_EMAIL || 'support@adcexamprep.com';
  const companyTel = process.env.COMPANY_TEL || '+61 2 9000 0000';

  const aboutHtml = [
    '<p style="margin:0 0 16px;line-height:1.7;font-size:1.1rem;color:#0f766e;font-weight:600">Prepare with confidence for the Australian Dental Council (ADC) examination.</p>',
    '<p style="margin:0 0 14px;line-height:1.7">ADC Exam Prep is a dedicated exam preparation environment designed to assist dental candidates preparing for the ADC Part 1 Written Examination. Our platform provides high-yield clinical scenarios, structured practice questions, and full-length simulated mock exams to reinforce clinical judgement and core competencies.</p>',
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Our Mission</h2>',
    '<p style="margin:0 0 14px;line-height:1.7">To make high-quality, clinical-based dental examination preparation accessible, rigorous, and relevant. Every practice item is crafted around published blueprint clusters and accompanied by comprehensive explanations so you understand the diagnostic and therapeutic reasoning behind every answer.</p>',
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">What We Provide</h2>',
    '<ul style="margin:0 0 16px;padding-left:24px;line-height:1.8">',
    '<li><strong>Blueprint-Aligned Questions:</strong> Practice items covering Restorative Dentistry, Periodontics, Endodontics, Oral Surgery, Orthodontics, Pediatric Dentistry, Pharmacology, and Infection Control.</li>',
    '<li><strong>Detailed Rationales:</strong> Clear explanations for both correct and incorrect options to turn every question into a learning opportunity.</li>',
    '<li><strong>Timed Simulation & Practice Modes:</strong> Replicate actual test conditions under timed mode or study at your own pace with instant answers in practice mode.</li>',
    '<li><strong>Domain Performance Breakdown:</strong> Track your progress across individual clinical disciplines to focus your revision where it matters most.</li>',
    '</ul>',
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Who We Are</h2>',
    `<p style="margin:0 0 14px;line-height:1.7"><strong>${companyName}</strong> is an independent educational initiative dedicated to providing dental examination candidates with high-quality study materials and interactive self-assessment tools. (This is an independent preparation service and is not affiliated with or endorsed by the Australian Dental Council).</p>`,
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Contact & Inquiries</h2>',
    `<p style="margin:0 0 14px;line-height:1.7">Email: <a href="mailto:${companyEmail}" style="color:#0f766e;text-decoration:underline">${companyEmail}</a><br>Tel: ${companyTel}<br>Address: ${companyAddress}</p>`
  ].join('');

  const supportHtml = [
    '<p style="margin:0 0 16px;line-height:1.7">Our candidate support team is available to help with practice test access, technical questions, account inquiries, and feedback on study materials.</p>',
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Contact Support</h2>',
    `<p style="margin:0 0 14px;line-height:1.7">Email <a href="mailto:${companyEmail}" style="color:#0f766e;text-decoration:underline">${companyEmail}</a>. Our team typically replies within one business day.</p>`,
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Include These Details</h2>',
    '<p style="margin:0 0 14px;line-height:1.7">When reaching out, please include your registered account email, test session code or question ID (if applicable), and a brief description of the issue. Do not email passwords or payment card details.</p>',
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Access & Study Materials</h2>',
    '<p style="margin:0 0 14px;line-height:1.7">All mock tests and practice question banks unlock immediately in your candidate dashboard upon enrollment or account creation.</p>',
    '<h2 style="margin:28px 0 10px;font-size:1.3rem;font-weight:700">Organization & Location</h2>',
    `<p style="margin:0 0 14px;line-height:1.7"><strong>${companyName}</strong><br>${companyAddress}<br>Tel: ${companyTel}<br>Support Email: <a href="mailto:${companyEmail}" style="color:#0f766e;text-decoration:underline">${companyEmail}</a></p>`
  ].join('');

  // Upsert about-us
  await db.page.upsert({
    where: { slug: 'about-us' },
    update: {
      title: 'About ADC Exam Prep',
      excerpt: 'Comprehensive preparation resources for the Australian Dental Council (ADC) examination.',
      bodyHtml: aboutHtml,
      published: true,
      showInFooter: true,
      footerGroup: 'legal'
    },
    create: {
      slug: 'about-us',
      title: 'About ADC Exam Prep',
      excerpt: 'Comprehensive preparation resources for the Australian Dental Council (ADC) examination.',
      bodyHtml: aboutHtml,
      published: true,
      showInFooter: true,
      footerGroup: 'legal',
      position: 5
    }
  });

  // Upsert support
  await db.page.upsert({
    where: { slug: 'support' },
    update: {
      title: 'Contact & Support',
      excerpt: 'Get help with exam access, technical questions, account assistance, or preparation materials.',
      bodyHtml: supportHtml,
      published: true,
      showInFooter: true,
      footerGroup: 'company'
    },
    create: {
      slug: 'support',
      title: 'Contact & Support',
      excerpt: 'Get help with exam access, technical questions, account assistance, or preparation materials.',
      bodyHtml: supportHtml,
      published: true,
      showInFooter: true,
      footerGroup: 'company',
      position: 25
    }
  });

  console.log('SUCCESS: Successfully updated about-us and support pages in database');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
