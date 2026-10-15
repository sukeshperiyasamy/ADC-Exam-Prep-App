import { db } from '../src/lib/db';

async function purgeOldSiteData() {
  console.log('--- Starting Old Site Artifacts Purge ---');

  // 1. Delete bundle items for old bundles
  const oldBundleSlugs = [
    'tableau-tcda',
    'tableau-tds',
    'tableau-foundations',
    'oracle-oci-foundations'
  ];

  const oldBundles = await db.bundle.findMany({
    where: { slug: { in: oldBundleSlugs } },
    select: { id: true, slug: true, title: true }
  });
  console.log(`Found ${oldBundles.length} old bundles to remove:`, oldBundles.map(b => b.title));

  const deletedBundles = await db.bundle.deleteMany({
    where: { slug: { in: oldBundleSlugs } }
  });
  console.log(`Successfully deleted ${deletedBundles.count} old bundles.`);

  // 2. Delete Oracle exams and cascade their questions
  const oracleExams = await db.exam.findMany({
    where: { vendor: { slug: 'oracle' } },
    select: { id: true, code: true, title: true }
  });
  console.log(`Found ${oracleExams.length} Oracle exams to remove:`, oracleExams.map(e => e.code));

  const deletedExams = await db.exam.deleteMany({
    where: { vendor: { slug: 'oracle' } }
  });
  console.log(`Successfully deleted ${deletedExams.count} Oracle exams (and cascaded questions).`);

  // 3. Delete Oracle vendor
  const deletedVendors = await db.vendor.deleteMany({
    where: { slug: 'oracle' }
  });
  console.log(`Successfully deleted ${deletedVendors.count} old vendors.`);

  // 4. Verify what remains in the database
  const remainingVendors = await db.vendor.findMany({ select: { slug: true, name: true } });
  const remainingExams = await db.exam.findMany({ select: { code: true, title: true } });
  const remainingBundles = await db.bundle.findMany({ select: { slug: true, title: true } });
  const remainingQuestions = await db.question.count();

  console.log('\n--- Current Database State (Only ADC Data Remains) ---');
  console.log('Vendors:', remainingVendors);
  console.log('Exams:', remainingExams);
  console.log('Bundles:', remainingBundles);
  console.log(`Total Questions in DB: ${remainingQuestions}`);
}

purgeOldSiteData()
  .catch(console.error)
  .finally(() => db.$disconnect());
