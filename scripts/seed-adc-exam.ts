import { db } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('--- Starting ADC Exam & Questions Seeding ---');

  // 1. Ensure Vendor exists
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
  console.log('Vendor upserted:', vendor.id, vendor.name);

  // 2. Ensure ADC Exam exists
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
  console.log('ADC Exam upserted:', exam.id, exam.title);

  // 3. Ensure ADC Bundle exists
  const bundle = await db.bundle.upsert({
    where: { slug: 'adc-written-exam-prep-bundle' },
    update: {
      title: 'ADC Written Examination Comprehensive Prep Bundle',
      description: 'Full access to 180+ authentic Australian Dental Council clinical cluster questions, scenario breakdowns, and timed mock exam simulations.',
      price: 4900, // $49.00
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
  console.log('Bundle upserted:', bundle.id, bundle.title);

  // 4. Ensure BundleItem links Exam to Bundle
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
    console.log('BundleItem linked ADC Exam to Bundle');
  }

  // 5. Load questions from adc-questions.json
  const questionsPath = path.join(__dirname, 'adc-questions.json');
  const rawQuestions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
  console.log(`Loaded ${rawQuestions.length} questions from ${questionsPath}`);

  // Delete existing questions for this exam to ensure fresh, clean import
  const deleted = await db.question.deleteMany({
    where: { examId: exam.id }
  });
  console.log(`Cleared ${deleted.count} existing questions for exam ${exam.code}`);

  // Insert questions in batches
  let insertedCount = 0;
  for (const q of rawQuestions) {
    await db.question.create({
      data: {
        examId: exam.id,
        stem: q.stem,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        domain: q.domain,
        difficulty: q.difficulty || 3,
        type: q.type || 'SINGLE',
        status: 'PUBLISHED',
        isTeaser: Boolean(q.isTeaser),
        references: q.references || [],
        generatedBy: 'client-1.docx-import'
      }
    });
    insertedCount++;
  }

  console.log(`Successfully imported ${insertedCount} questions into Neon database for ADC Part 1!`);

  // Verify questions count
  const countInDb = await db.question.count({
    where: { examId: exam.id }
  });
  const teaserCount = await db.question.count({
    where: { examId: exam.id, isTeaser: true }
  });
  console.log(`Verification: Total questions in DB = ${countInDb}, Teaser questions = ${teaserCount}`);
}

main()
  .then(() => {
    console.log('ADC Exam seeding completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ADC Exam seeding failed:', err);
    process.exit(1);
  });
