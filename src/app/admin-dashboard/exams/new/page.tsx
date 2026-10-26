import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

async function createExam(formData: FormData) {
  'use server';
  const session = await auth();
  const createdById = (session?.user as any)?.id as string | undefined;
  const vendorId = String(formData.get('vendorId'));
  const code = String(formData.get('code') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const slug = String(formData.get('slug') || '').trim().toLowerCase();
  const description = String(formData.get('description') || '');
  const level = String(formData.get('level') || 'Associate');
  const durationMinutes = Number(formData.get('durationMinutes') || 90);
  const passingScore = Number(formData.get('passingScore') || 70);
  const questionCount = Number(formData.get('questionCount') || 60);
  const infoUrlRaw = String(formData.get('infoUrl') || '').trim();
  const infoUrl = infoUrlRaw ? infoUrlRaw : null;
  const labelRaw = String(formData.get('label') || '').trim();
  const label = labelRaw ? labelRaw : null;
  // Preserve the optional blueprint field for existing callers, but keep
  // AI authoring controls out of the ADC demo interface.
  let domains: { name: string; weight: number }[] = [];
  const domainsJson = String(formData.get('domainsJson') || '').trim();
  if (domainsJson) {
    try {
      const parsed = JSON.parse(domainsJson);
      if (Array.isArray(parsed)) domains = parsed;
    } catch {
      /* ignore — keep empty */
    }
  }
  if (!vendorId || !code || !slug || !title) return;
  const created = await db.exam.create({
    data: {
      vendorId, code, title, slug, description, level,
      durationMinutes, passingScore, questionCount, infoUrl, label,
      domains,
      published: false,
      createdById
    }
  });
  revalidatePath('/admin-dashboard/exams');
  redirect(`/admin-dashboard/exams/${created.id}/author`);
}

export default async function NewExamPage() {
  const vendors = await db.vendor.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create Exam</h1>
        <Link href="/admin-dashboard/exams" className="btn-ghost text-sm">← Back to list</Link>
      </div>

      <form data-create-exam action={createExam} className="card grid gap-3 p-4 md:grid-cols-3">
        <Field label="Content source" className="md:col-span-1">
          <select name="vendorId" required className="input">
            <option value="">Select source…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Exam code">
          <input name="code" placeholder="e.g. ADC-MOCK-01" className="input" required />
        </Field>
        <Field label="Slug">
          <input name="slug" placeholder="adc-mock-test-01" className="input" required />
        </Field>

        <Field label="Exam title" className="md:col-span-3">
          <input name="title" placeholder="Exam title" className="input" required />
        </Field>

        <Field label="Level">
          <select name="level" defaultValue="Associate" className="input">
            <option>Foundational</option>
            <option>Associate</option>
            <option>Professional</option>
            <option>Specialty</option>
          </select>
        </Field>
        <Field label="Duration (min)">
          <input name="durationMinutes" type="number" defaultValue={90} className="input" />
        </Field>
        <Field label="Pass %">
          <input name="passingScore" type="number" defaultValue={70} className="input" />
        </Field>

        <Field label="Questions per exam">
          <input name="questionCount" type="number" defaultValue={60} className="input" />
        </Field>
        <Field label="Source URL (optional)" className="md:col-span-2">
          <input name="infoUrl" type="url" placeholder="https://source.example/reference" className="input" />
        </Field>
        <Field label="Label (optional)">
          <input name="label" placeholder="e.g. Practice Exam 1" className="input" />
        </Field>
        <Field label="Description" className="md:col-span-3">
          <input name="description" placeholder="Description" className="input" />
        </Field>

        <div className="md:col-span-3 flex gap-2">
          <button className="btn-primary">Create exam</button>
          <Link href="/admin-dashboard/exams" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm ${className || ''}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
