import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import { getTeaserSize } from '@/lib/settings';
import { CatalogFilters } from './filters';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  Layers,
  Unlock,
  Check,
  Play,
  RotateCcw
} from 'lucide-react';

export default async function CatalogPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; domain?: string }>
}) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const selectedDomain = (sp.domain || '').trim();

  const [session, teaserLimit, bundleRaw, domainCountsRaw, totalPublishedQuestions] = await Promise.all([
    auth(),
    getTeaserSize(),
    db.bundle.findFirst({
      where: { published: true },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            exam: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    }),
    db.question.groupBy({
      by: ['domain'],
      where: { status: 'PUBLISHED' },
      _count: true
    }),
    db.question.count({
      where: { status: 'PUBLISHED' }
    })
  ]);

  const primaryItem = bundleRaw?.items[0];
  const primaryExam = primaryItem?.exam;
  const userId = (session?.user as any)?.id as string | undefined;

  // Re-use standard database entitlement verification with expiry handling
  const entitled = Boolean(
    userId &&
    primaryExam &&
    (await db.entitlement.findFirst({
      where: {
        userId,
        examId: primaryExam.id,
        tier: { in: ['PRACTICE', 'BUNDLE', 'VOUCHER', 'ADMIN_GRANT'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    }))
  );

  const domainStats = domainCountsRaw
    .map(d => ({
      domain: d.domain,
      count: d._count
    }))
    .sort((a, b) => b.count - a.count);

  const vendorSlug = primaryExam?.vendor.slug || 'adc';
  const examSlug = primaryExam?.slug || 'adc-written-examination-part-1';
  const bundleSlug = bundleRaw?.slug || 'adc-written-exam-prep-bundle';
  const bundlePriceFormatted = bundleRaw?.price ? formatPrice(bundleRaw.price) : '₹1,499';
  const examDuration = primaryExam?.durationMinutes || 180;
  const examQuestions = primaryExam?.questionCount || 60;
  const passingScore = primaryExam?.passingScore || 70;

  // Filter count if filter is active
  const filteredQuestionCount = (q || selectedDomain)
    ? await db.question.count({
        where: {
          status: 'PUBLISHED',
          ...(selectedDomain ? { domain: selectedDomain } : {}),
          ...(q
            ? {
                OR: [
                  { stem: { contains: q, mode: 'insensitive' } },
                  { domain: { contains: q, mode: 'insensitive' } },
                  { explanation: { contains: q, mode: 'insensitive' } }
                ]
              }
            : {})
        }
      })
    : totalPublishedQuestions;

  return (
    <div className="container-app py-8 md:py-12">
      {/* 01 · CLINICAL HEADER */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
          <Stethoscope className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
          <span>Independent ADC Part 1 Preparation Workspace</span>
        </div>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl md:text-4xl dark:text-white">
              ADC Practice Exams & Clinical Scenarios
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              Prepare for the Australian Dental Council Part 1 Written Examination with {totalPublishedQuestions} authentic
              scenario-based multiple-choice questions, timed mock exams, and in-depth rationales.
            </p>
          </div>

          {/* Candidate Entitlement Status Badge */}
          <div className="self-start md:self-auto">
            {entitled ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-900 dark:border-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
                <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
                <span className="font-semibold">Enrolled Candidate</span>
                <span className="text-brand-700 dark:text-brand-400">• Full Access Active</span>
              </div>
            ) : userId ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Signed In</span>
                <span className="text-slate-500">• Free Sample Mode</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Guest Mode</span>
                <span className="text-slate-500">• Free Sample Available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 02 · CLINICAL TOPIC SEARCH & DOMAIN PILLS */}
      <CatalogFilters
        q={q}
        selectedDomain={selectedDomain}
        domains={domainStats}
        totalQuestions={totalPublishedQuestions}
      />

      {/* Active Filter Notification Banner */}
      {(q || selectedDomain) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-2.5 text-xs text-brand-900 dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Filter active:</span>
            {selectedDomain && <span className="rounded bg-brand-200/60 px-2 py-0.5 font-medium dark:bg-brand-800/60">{selectedDomain}</span>}
            {q && <span>Matching &ldquo;{q}&rdquo;</span>}
            <span>— {filteredQuestionCount} questions found in bank</span>
          </div>
          <Link href="/practice-exams" className="font-semibold underline hover:text-brand-700 dark:hover:text-brand-300">
            Reset to all questions
          </Link>
        </div>
      )}

      {/* 03 · DUAL CARD ARCHITECTURE: FREE TEASER vs FULL BUNDLE */}
      <div className="mb-14 grid gap-6 lg:grid-cols-2">
        {/* CARD A: FREE PRACTICE TEASER */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Free Sample • Instant Access</span>
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {teaserLimit} Questions
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Diagnostic Practice Teaser
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Sample {teaserLimit} randomized scenario-based clinical questions with instant answer feedback and detailed rationales. Experience the computer-based exam interface without payment.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>{teaserLimit} authentic clinical scenario MCQs</strong> sampled from the pool</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Untimed practice mode:</strong> answers and explanations are shown after you finish the test</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>In-depth rationales citing Australian Therapeutic Guidelines standards</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>Zero payment or credit card required — starts instantly</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-5 dark:border-slate-800">
            <Link
              href={`/practice-exams/${vendorSlug}/${examSlug}/teaser`}
              className="btn-outline flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold shadow-sm"
            >
              <span>Start Free Practice Test ({teaserLimit} Qs)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* CARD B: COMPREHENSIVE ADC EXAMINATION BUNDLE */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-brand-600 bg-white p-6 shadow-md dark:border-brand-500 dark:bg-slate-900">
          {/* Popular Tag */}
          <div className="absolute -top-3 right-6 rounded-full bg-brand-700 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm dark:bg-brand-600">
            {entitled ? 'Your Access' : 'Complete Preparation'}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
                <BookOpen className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                <span>Full Examination Access</span>
              </span>
              <div className="text-right">
                {entitled ? (
                  <span className="text-sm font-bold text-brand-700 dark:text-brand-400">Purchased & Active</span>
                ) : (
                  <div>
                    <span className="text-xl font-extrabold text-slate-950 dark:text-white">{bundlePriceFormatted}</span>
                    <span className="block text-[11px] text-slate-500">one-time fee</span>
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              ADC Written Examination Comprehensive Prep Bundle
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Unrestricted access to the entire {totalPublishedQuestions}-question clinical pool, full {examQuestions}-question timed exam simulations ({examDuration} minutes, {passingScore}% pass standard), and domain analytics.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>All {totalPublishedQuestions} clinical scenario questions</strong> across 7 disciplines</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Timed Mock Exam Mode:</strong> {examQuestions} questions in {examDuration} minutes with live timer and flagging</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Practice Mode:</strong> untimed review with instant option-by-option rationale</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Domain Performance Analytics:</strong> diagnostic breakdown on candidate dashboard</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>7-day refund policy:</strong> eligible within 7 days if fewer than 10 questions answered (<Link href="/p/refund-policy" className="underline hover:text-brand-700 dark:hover:text-brand-300">details</Link>)</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-5 dark:border-slate-800">
            {entitled ? (
              <Link
                href={`/practice-exams/${vendorSlug}/${examSlug}`}
                className="btn-primary-grad flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold shadow-md"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Launch Mock Exam ({examQuestions} Questions)</span>
              </Link>
            ) : (
              <Link
                href={`/checkout/bundle/${bundleSlug}`}
                className="btn-primary-grad flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold shadow-md"
              >
                <span>Enroll in Complete Bundle — {bundlePriceFormatted}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 04 · QUESTION BANK DISTRIBUTION BY CLINICAL DISCIPLINE */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Question Bank Distribution by Clinical Discipline
            </h3>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              Verified clinical scenario counts across {domainStats.length} disciplines in the active {totalPublishedQuestions}-question pool.
            </p>
          </div>
          <span className="self-start text-xs font-semibold text-slate-500 sm:self-auto dark:text-slate-400">
            {totalPublishedQuestions} Total Scenarios
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {domainStats.map((d) => {
            const percentage = ((d.count / totalPublishedQuestions) * 100).toFixed(1);
            const isSelected = selectedDomain === d.domain;
            return (
              <Link
                key={d.domain}
                href={isSelected ? '/practice-exams' : `/practice-exams?domain=${encodeURIComponent(d.domain)}`}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50/80 shadow-sm dark:border-brand-500 dark:bg-brand-950/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-800 dark:text-brand-300">
                      {d.count} Questions
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {percentage}%
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                    {d.domain}
                  </h4>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span>{isSelected ? 'Selected' : 'Filter by specialty'}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 05 · TRUST & TRANSPARENCY BAR */}
      <div className="mt-12 grid gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Authentic Scenario Format
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Multi-step patient cases and clinical cluster questions mirroring the ADC examination style.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Timed & Untimed Modes
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Practise at your own pace with instant rationales or simulate 3-hour exam conditions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RotateCcw className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              7-Day Refund Policy
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Eligible within 7 days of purchase if you have answered fewer than 10 questions across all attempts. See our{' '}
              <Link href="/p/refund-policy" className="underline hover:text-brand-700 dark:hover:text-brand-300">
                Refund Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
