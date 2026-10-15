import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Mail, Phone } from 'lucide-react';
import { getCompanyInfo } from '@/lib/settings';
import { getFooterPages } from '@/lib/pages';


function displayPhone(value: string): string {
  const compact = value.replace(/\s+/g, '');
  const singapore = compact.match(/^\+65(\d{4})(\d{4})$/);
  return singapore ? `+65 ${singapore[1]} ${singapore[2]}` : value;
}

// Useful Links resolve their titles from CMS footer pages, falling back to
// these labels (and preserving this order) when a page row is missing.
const USEFUL_LINK_FALLBACKS: Record<string, string> = {
  'how-it-works': 'How it works',
  'about-us': 'About Us',
  'support': 'Support',
  'privacy-policy': 'Privacy',
  'refund-policy': 'Refund Policy'
};

const linkClass = 'hover:text-slate-900 hover:underline dark:hover:text-slate-100';

async function safeCompany() {
  try {
    return await getCompanyInfo();
  } catch {
    return { name: 'ADC Exam Prep Demo', shortName: 'ADC Exam Prep Demo', uen: '', address: '', email: '', tel: '', website: '' };
  }
}

async function safeFooterPages() {
  try {
    return await getFooterPages();
  } catch {
    return [] as Awaited<ReturnType<typeof getFooterPages>>;
  }
}

function FooterHeading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h4 className={`text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white ${className}`}>
      {children}
    </h4>
  );
}


/** One contact row: leading icon + optional link. External links open in a new tab. */
function Contact({
  icon: Icon,
  href,
  children
}: {
  icon: ComponentType<{ className?: string }>;
  href?: string;
  children: ReactNode;
}) {
  const external = href?.startsWith('http');
  return (
    <li className="leading-relaxed">
      {href ? (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={`inline-flex items-start gap-2 rounded-sm underline decoration-slate-400/60 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${linkClass}`}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>{children}</span>
        </a>
      ) : (
        <span className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>{children}</span>
        </span>
      )}
    </li>
  );
}

/**
 * Full public-site footer with brand / links / company / legal columns.
 * Rendered on marketing surfaces (homepage, /practice-exams/*, etc.) — admin
 * and app-shell routes hide it via <FooterGate>. The compact "© 2026 …" line
 * lives in <PersistentCopyright> and is shown on every page.
 */
export async function Footer() {
  const company = await safeCompany();

  // Filter out any placeholder address/phone
  const hasRealAddress = company.address && !company.address.toLowerCase().includes('healthcare practice way');
  const hasRealTel = company.tel && !company.tel.includes('9000 0000');
  const email = company.email || 'support@adcexamprep.com';

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3">
          {/* Column 1: About */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <Image
                src="/logo-mark.png"
                alt="ADC Exam Prep"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                ADC Exam Prep
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              An independent dental exam preparation workspace providing structured clinical scenario practice,
              timed mock tests, and detailed answer explanations for ADC candidates.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <Contact icon={Mail} href={`mailto:${email}`}>
                {email}
              </Contact>
              {hasRealTel && (
                <Contact icon={Phone} href={`tel:${company.tel.replace(/\s+/g, '')}`}>
                  {displayPhone(company.tel)}
                </Contact>
              )}
              {hasRealAddress && <Contact icon={MapPin}>{company.address}</Contact>}
            </div>
          </div>

          {/* Column 2: Platform */}
          <nav aria-label="Platform navigation">
            <FooterHeading>Platform</FooterHeading>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/practice-exams" className={linkClass}>
                  Mock Tests
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className={linkClass}>
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className={linkClass}>
                  Preparation Bundle (₹1,499)
                </Link>
              </li>
              <li>
                <Link href="/#faq" className={linkClass}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/user-dashboard" className={linkClass}>
                  Candidate Dashboard
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 3: Support & Legal */}
          <nav aria-label="Support and legal links">
            <FooterHeading>Support & Legal</FooterHeading>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/p/support" className={linkClass}>
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/p/privacy-policy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/p/refund-policy" className={linkClass}>
                  Refund Policy (7 Days)
                </Link>
              </li>
              <li>
                <Link href="/p/terms-of-service" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/p/about-us" className={linkClass}>
                  About ADC Exam Prep
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Independence Disclaimer & Copyright Bar */}
        <div className="mt-10 border-t border-slate-200/80 pt-6 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-3xl">
            This is an independent exam-preparation platform and is not affiliated with or endorsed by the
            Australian Dental Council. Practice materials are for educational purposes and do not guarantee
            examination outcomes.
          </p>
          <p className="mt-3 shrink-0 sm:mt-0 font-medium">
            © {new Date().getFullYear()} ADC Exam Prep. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export async function PersistentCopyright() {
  return null;
}
