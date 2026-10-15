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
  const [company, footerPages] = await Promise.all([safeCompany(), safeFooterPages()]);

  const pageBySlug = new Map(footerPages.map((p) => [p.slug, p]));
  const usefulLinks = [
    { href: '/practice-exams', label: 'Browse exams' },
    ...Object.entries(USEFUL_LINK_FALLBACKS).map(([slug, fallback]) => ({
      href: `/p/${slug}`,
      label: pageBySlug.get(slug)?.title ?? fallback
    }))
  ];

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-app grid grid-cols-1 gap-x-8 gap-y-10 py-12 sm:grid-cols-2 md:grid-cols-12">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-4">
          <div className="mb-3 flex items-center gap-2">
            <Image src="/logo-mark.png" alt="ADC Exam Prep Demo" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
            <span className="text-base font-semibold text-slate-900 dark:text-white">ADC Exam Prep Demo</span>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Prepare with confidence for your dental exams.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            A focused practice environment for dental clinical scenarios, mock tests, and review.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            This is an independent demonstration interface and does not imply Australian Dental Council endorsement.
          </p>
        </div>

        {/* Useful Links */}
        <nav className="md:col-span-2" aria-label="Footer">
          <FooterHeading>Useful Links</FooterHeading>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {usefulLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Company */}
        <div className="md:col-span-3">
          <FooterHeading>Company</FooterHeading>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="font-medium text-slate-700 dark:text-slate-300">{company.name}</li>
            {company.address && <Contact icon={MapPin}>{company.address}</Contact>}
            {company.email && (
              <Contact icon={Mail} href={`mailto:${company.email}`}>
                {company.email}
              </Contact>
            )}
            {company.tel && (
              <Contact icon={Phone} href={`tel:${company.tel.replace(/\s+/g, '')}`}>
                {displayPhone(company.tel)}
              </Contact>
            )}
          </ul>
        </div>

        {/* Legal */}
        <div className="md:col-span-3">
          <FooterHeading>Legal</FooterHeading>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Demo content is provided for learning and product evaluation. This platform is independent and is not an
            official ADC website or examination service.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Single-line copyright bar removed per request.
 */
export async function PersistentCopyright() {
  return null;
}
