import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flag,
  HelpCircle,
  Layers,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TimerReset
} from 'lucide-react';

const FAQS = [
  {
    q: 'Is this platform affiliated with the Australian Dental Council?',
    a: 'No. ADC Exam Prep is an independent preparation platform. We are not affiliated with, approved by, or endorsed by the Australian Dental Council (ADC). All study materials are created independently to help dental candidates prepare for their examinations.'
  },
  {
    q: 'What content is included in the ADC Written Exam Prep Bundle?',
    a: 'The bundle includes 187 vetted clinical scenario questions organized into full-length simulated mock exams and topical practice sets. Questions mirror the domains evaluated in the ADC Part 1 Written Examination, including Periodontics, Restorative Dentistry, Endodontics, Oral Surgery, Prosthodontics, Orthodontics, Pediatric Dentistry, and Infection Control.'
  },
  {
    q: 'How do Practice Mode and Timed Exam Mode differ?',
    a: 'In Practice Mode, you receive immediate feedback and full clinical rationales after answering each question, making it ideal for self-paced study. In Timed Exam Mode, you take a full 60-question simulated test with an active countdown timer, question-flagging tools, and an end-of-test performance breakdown.'
  },
  {
    q: 'Is my progress and attempt history saved?',
    a: 'Yes. Every attempt, answer choice, time spent, and domain score is automatically saved to your candidate account dashboard. You can revisit completed attempts, review explanations, and re-attempt exams anytime.'
  },
  {
    q: 'What is the price, and are there recurring subscriptions?',
    a: 'Access to the complete ADC Written Examination Prep Bundle is ₹1,499 (INR) as a one-time purchase. There are no recurring subscriptions or hidden maintenance fees. Payments are securely processed via Stripe with support for Indian cards, UPI, and net banking.'
  },
  {
    q: 'What is the refund policy?',
    a: 'We offer a 7-day refund guarantee from the date of purchase if you are not satisfied with the preparation platform, provided you have completed fewer than two full exam attempts. Contact support@adcexamprep.com with your order details for assistance.'
  }
];

export default function HomePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a }
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* 01 · HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-brand-50/40 via-white to-white py-12 md:py-20 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-900/20" />
        <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 rounded-full bg-cyan-100/40 blur-3xl dark:bg-cyan-900/10" />

        <div className="container-app relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Hero Left: Copy & CTAs */}
          <div className="flex flex-col items-start">
            {/* Pill Kicker */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3.5 py-1.5 text-xs font-semibold text-brand-800 shadow-sm dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
              <Stethoscope className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>Independent ADC preparation</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.15] dark:text-white">
              Practise clinical scenarios.{' '}
              <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-cyan-600 bg-clip-text text-transparent dark:from-brand-300 dark:to-cyan-300">
                Prepare with purpose.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              Build your dental exam preparation routine with structured practice questions, timed mock tests,
              in-depth answer explanations, and progress review in one focused workspace.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href="/practice-exams"
                className="btn-primary-grad inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold shadow-md sm:w-auto"
              >
                <span>Explore Mock Tests</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary inline-flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm sm:w-auto"
              >
                <span>How It Works</span>
              </a>
            </div>

            {/* Direct Search Input */}
            <form
              action="/practice-exams"
              className="mt-6 flex w-full max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
            >
              <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" />
              <input
                name="q"
                type="search"
                aria-label="Search clinical scenarios or dental domains"
                placeholder="Search clinical topics (e.g., Periodontics, TMJ, Endodontics)..."
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button type="submit" className="btn-primary px-3.5 py-1.5 text-xs font-medium">
                Search
              </button>
            </form>

            {/* 4 Feature Value Pillars */}
            <div className="mt-8 grid w-full grid-cols-2 gap-3 pt-6 border-t border-slate-200/80 sm:grid-cols-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>Clinical practice</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>Timed mock tests</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>Answer explanations</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>Progress review</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Authentic Exam Interface Preview */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-700/80 dark:bg-slate-900">
              {/* Interface Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    ADC Part 1 Simulation
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    <Clock className="h-3.5 w-3.5" />
                    <span>01:58:24</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Flag className="h-3 w-3" />
                    <span>Flag</span>
                  </div>
                </div>
              </div>

              {/* Interface Body */}
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wide">
                    Question 1 of 60
                  </span>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                    Periodontics & Oral Surgery
                  </span>
                </div>

                {/* Question Stem */}
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                  <strong className="text-brand-800 dark:text-brand-300">Clinical Scenario:</strong> A 34-year-old male
                  reports with a complaint of clicking in his left temporomandibular joint on wide opening. Examination
                  demonstrates a 42 mm mouth opening with a reciprocal click at 25 mm. No jaw locking, limitation, or
                  crepitus is present. What is the most appropriate initial management?
                </p>

                {/* Interactive Options Preview */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 font-semibold text-[10px]">
                      A
                    </span>
                    <span>Immediate bilateral joint arthrocentesis and lavage</span>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border-2 border-brand-500 bg-brand-50/70 p-2.5 text-slate-900 dark:border-brand-500 dark:bg-brand-950/60 dark:text-slate-100 shadow-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-[10px] text-white">
                      B
                    </span>
                    <div className="flex-1">
                      <span className="font-semibold">Reassurance, soft diet, and conservative stabilization splint evaluation</span>
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> Recommended
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 font-semibold text-[10px]">
                      C
                    </span>
                    <span>Prescription of high-dose systemic opioids</span>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 font-semibold text-[10px]">
                      D
                    </span>
                    <span>Immediate surgical eminectomy</span>
                  </div>
                </div>

                {/* Explanation Callout */}
                <div className="mt-4 rounded-xl border border-brand-200/90 bg-brand-50/60 p-3.5 text-xs text-slate-700 dark:border-brand-800/80 dark:bg-brand-950/40 dark:text-slate-200">
                  <div className="flex items-center gap-1.5 font-semibold text-brand-800 dark:text-brand-300 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                    <span>Clinical Explanation</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
                    Anterior disc displacement with reduction presents with reciprocal clicking without limitation of
                    opening. Primary initial management is conservative: patient education, avoiding excessive opening,
                    a soft diet, and a stabilization splint.
                  </p>
                </div>

                {/* Controls Preview */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                  <span className="text-slate-500">Attempt saved automatically</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Previous
                    </span>
                    <span className="rounded bg-brand-600 px-3 py-1 font-semibold text-white">
                      Next →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02 · FEATURE HIGHLIGHTS */}
      <section className="container-app py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">
            Purpose-Built Dental Workspace
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Everything you need for focused clinical practice
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Every feature is designed around the demands of the Australian Dental Council Part 1 Written Examination,
            enabling you to build diagnostic reasoning and pacing.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1 */}
          <div className="card flex flex-col p-6 transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
              Clinical Scenarios
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 flex-1">
              Practise realistic, multi-step case scenarios covering diagnosis, treatment sequencing, and radiography
              interpretation across restorative, endodontics, periodontics, and oral surgery.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
              187 Vetted Questions
            </div>
          </div>

          {/* Feature 2 */}
          <div className="card flex flex-col p-6 transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
              <TimerReset className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
              Timed Mock Tests
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 flex-1">
              Experience authentic exam pacing with full 60-question timed simulations, active countdown clocks, and
              the ability to flag questions to revisit before final submission.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              60 Qs / Simulation
            </div>
          </div>

          {/* Feature 3 */}
          <div className="card flex flex-col p-6 transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
              Answer Explanations
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 flex-1">
              Reinforce clinical principles with detailed rationales for every question, explaining why the correct
              option is indicated and why other choices are clinically inappropriate.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              Option-by-Option Reasoning
            </div>
          </div>

          {/* Feature 4 */}
          <div className="card flex flex-col p-6 transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
              Progress & Analytics
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 flex-1">
              Review saved attempts on your candidate dashboard, track performance domain by domain, and identify
              which dental specialties require additional revision.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
              Saved Attempt History
            </div>
          </div>
        </div>
      </section>

      {/* 03 · HOW IT WORKS */}
      <section id="how-it-works" className="border-y border-slate-200/80 bg-slate-50/60 py-16 md:py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">
              Step-by-Step Flow
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              See how your preparation works
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              A structured four-step cycle that turns clinical practice into measurable exam readiness.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-3xl font-black text-brand-200 dark:text-brand-900/70">01</span>
              <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
                Choose a Mock Test
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Browse our curated mock examination sets aligned with the ADC Part 1 Written Examination syllabus.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-3xl font-black text-brand-200 dark:text-brand-900/70">02</span>
              <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
                Complete Clinical Cases
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Select untimed Practice Mode for instant explanations or Timed Exam Mode to simulate test-day conditions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-3xl font-black text-brand-200 dark:text-brand-900/70">03</span>
              <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
                Review Rationales
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Study in-depth clinical rationales for each option to understand the underlying clinical evidence.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-3xl font-black text-brand-200 dark:text-brand-900/70">04</span>
              <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
                Identify Weak Areas
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Use domain-by-domain score reports on your candidate dashboard to target revision before sitting the exam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 04 · FEATURED PREPARATION BUNDLE & PRICING */}
      <section id="pricing" className="container-app py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Lock className="h-3 w-3" /> Transparent INR Pricing · No Subscriptions
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            ADC Written Examination Prep Bundle
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Get complete, unrestricted access to the entire ADC Part 1 question bank, timed mock test simulations,
            and personal performance tracking.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mx-auto mt-10 max-w-3xl rounded-3xl border-2 border-brand-500/80 bg-white p-6 shadow-xl sm:p-10 dark:border-brand-600 dark:bg-slate-900">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
                Full Question Bank Access
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-950 sm:text-2xl dark:text-white">
                ADC Written Examination Comprehensive Prep Bundle
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                Complete preparation package for candidates sitting the Australian Dental Council Part 1 Written Examination.
              </p>
            </div>

            {/* Price Display */}
            <div className="shrink-0 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800 sm:text-right">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">One-Time Fee</span>
              <div className="mt-1 flex items-baseline justify-center sm:justify-end gap-1">
                <span className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">₹1,499</span>
                <span className="text-xs font-semibold text-slate-500">INR</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                Single payment · No recurring fees
              </span>
            </div>
          </div>

          {/* Included Features Checklist */}
          <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              What is included
            </h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>187 vetted</strong> clinical scenario questions</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>60-question</strong> full-length timed mock tests</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Practice Mode</strong> with immediate answers</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>In-depth rationales</strong> for every option</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Domain-level analytics</strong> across dental fields</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Saved attempt history</strong> in candidate dashboard</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>Instant activation</strong> upon checkout</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span><strong>7-day money-back</strong> refund policy</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/checkout/bundle/adc-written-exam-prep-bundle"
              className="btn-primary-grad flex-1 py-3.5 text-center text-base font-semibold shadow-md"
            >
              Get Full Access — ₹1,499
            </Link>
            <Link
              href="/practice-exams/australian-dental-council/adc-written-examination-part-1"
              className="btn-outline py-3.5 text-center text-sm font-semibold"
            >
              View Exam Details
            </Link>
          </div>

          {/* Trust Guarantee Footnote */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure INR Checkout via Stripe
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Cards, UPI & Netbanking
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-600" /> 7-Day Money-Back Guarantee
            </span>
          </div>
        </div>
      </section>

      {/* 05 · TRUST & INDEPENDENCE CALLOUT */}
      <section className="border-y border-slate-200/80 bg-brand-50/50 py-12 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="container-app">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-brand-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start dark:border-brand-900/80 dark:bg-slate-900">
            <div className="rounded-xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">
                Independent Dental Exam Preparation Platform
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                ADC Exam Prep is an independent educational resource and is not affiliated with, authorized, or
                endorsed by the Australian Dental Council. Practice materials are designed around published syllabus
                domains to support self-directed study and do not guarantee examination outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 06 · FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="container-app py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <HelpCircle className="h-3.5 w-3.5" /> Frequently Asked Questions
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Answers for dental candidates
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Everything you need to know about our practice materials, modes, pricing, and access terms.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm open:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:open:border-brand-700"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-slate-950 sm:text-base dark:text-white">
                <span>{faq.q}</span>
                <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 group-open:text-brand-600" />
              </summary>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
