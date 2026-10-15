import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

async function main() {
  console.log('--- Seeding ADC Exam Prep Application ---');

  // 1. Admin Users
  const adminEmail = process.env.ADMIN_EMAIL || 'sukeshperiyasamy@gmail.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const passwordHash = await argon2.hash(adminPass);

  await db.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      active: true,
      emailVerified: new Date(),
      passwordHash
    },
    create: {
      email: adminEmail,
      name: 'Sukesh Periyasamy',
      role: Role.ADMIN,
      active: true,
      emailVerified: new Date(),
      passwordHash
    }
  });
  console.log(`✓ Admin user configured: ${adminEmail}`);

  // 2. Australian Dental Council Vendor
  const vendor = await db.vendor.upsert({
    where: { slug: 'adc' },
    update: {
      name: 'Australian Dental Council',
      description: 'Australian Dental Council (ADC) examination preparation resources, blueprints, and scenario-based mock exams.'
    },
    create: {
      slug: 'adc',
      name: 'Australian Dental Council',
      description: 'Australian Dental Council (ADC) examination preparation resources, blueprints, and scenario-based mock exams.'
    }
  });
  console.log(`✓ Vendor configured: ${vendor.name}`);

  // 3. ADC Exam
  const examDomains = [
    { name: 'Periodontics, Oral Surgery & Pain Management', weight: 28 },
    { name: 'Medical Conditions & Emergencies', weight: 20 },
    { name: 'Diagnosis & Oral Pathology', weight: 15 },
    { name: 'Paediatric Dentistry, Trauma & Orthodontics', weight: 15 },
    { name: 'Professional Practice & Ethics', weight: 10 },
    { name: 'Infection Control & Safety', weight: 8 },
    { name: 'Restorative Dentistry & Endodontics', weight: 4 }
  ];

  const exam = await db.exam.upsert({
    where: { slug: 'adc-written-examination-part-1' },
    update: {
      code: 'ADC-PART1',
      title: 'ADC Written Examination (Part 1) — Clinical Scenario Practice Exam',
      description: 'Authentic scenario-based practice questions from Australian Dental Council examination clusters. Includes comprehensive clinical rationales, per-domain performance breakdown, and timed exam simulation mode.',
      level: 'Professional',
      durationMinutes: 180,
      passingScore: 70,
      questionCount: 60,
      domains: examDomains,
      published: true,
      metaTitle: 'ADC Written Examination (Part 1) Practice Exams & Scenario Mock Tests',
      metaDescription: 'Prepare for the Australian Dental Council (ADC) Written Examination with authentic clinical cluster questions, instant scoring, and detailed rationales.'
    },
    create: {
      vendorId: vendor.id,
      code: 'ADC-PART1',
      slug: 'adc-written-examination-part-1',
      title: 'ADC Written Examination (Part 1) — Clinical Scenario Practice Exam',
      description: 'Authentic scenario-based practice questions from Australian Dental Council examination clusters. Includes comprehensive clinical rationales, per-domain performance breakdown, and timed exam simulation mode.',
      level: 'Professional',
      durationMinutes: 180,
      passingScore: 70,
      questionCount: 60,
      domains: examDomains,
      published: true,
      metaTitle: 'ADC Written Examination (Part 1) Practice Exams & Scenario Mock Tests',
      metaDescription: 'Prepare for the Australian Dental Council (ADC) Written Examination with authentic clinical cluster questions, instant scoring, and detailed rationales.'
    }
  });
  console.log(`✓ Exam configured: ${exam.title}`);

  // 4. ADC Bundle
  const bundle = await db.bundle.upsert({
    where: { slug: 'adc-written-exam-prep-bundle' },
    update: {
      title: 'ADC Written Examination Comprehensive Prep Bundle',
      description: 'Full access to 180+ authentic Australian Dental Council clinical cluster questions, scenario breakdowns, and timed mock exam simulations.',
      price: 4900,
      published: true
    },
    create: {
      slug: 'adc-written-exam-prep-bundle',
      title: 'ADC Written Examination Comprehensive Prep Bundle',
      description: 'Full access to 180+ authentic Australian Dental Council clinical cluster questions, scenario breakdowns, and timed mock exam simulations.',
      price: 4900,
      published: true
    }
  });
  console.log(`✓ Bundle configured: ${bundle.title}`);

  // 5. Link Exam to Bundle
  const existingItem = await db.bundleItem.findFirst({
    where: { bundleId: bundle.id, examId: exam.id, tier: 'PRACTICE' }
  });
  if (!existingItem) {
    await db.bundleItem.create({
      data: {
        bundleId: bundle.id,
        examId: exam.id,
        tier: 'PRACTICE',
        position: 0
      }
    });
  }

  // 6. Ensure Questions are loaded if adc-questions.json exists
  const jsonPath = path.join(__dirname, '../scripts/adc-questions.json');
  if (fs.existsSync(jsonPath)) {
    const questions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const count = await db.question.count({ where: { examId: exam.id } });
    if (count === 0) {
      console.log(`Importing ${questions.length} ADC questions...`);
      for (const q of questions) {
        await db.question.create({
          data: {
            examId: exam.id,
            domain: q.domain,
            difficulty: q.difficulty,
            type: q.type,
            stem: q.stem,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation,
            references: q.references,
            status: 'PUBLISHED',
            generatedBy: 'client-1.docx-import',
            isTeaser: !!q.isTeaser
          }
        });
      }
      console.log(`✓ Imported ${questions.length} questions into ADC exam.`);
    } else {
      console.log(`✓ Questions already seeded (${count} questions present).`);
    }
  }

  console.log('--- ADC Seed Finished Successfully ---');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
