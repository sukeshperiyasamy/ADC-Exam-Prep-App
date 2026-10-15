'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { UserMenu } from './user-menu';
import { ThemeToggle } from './theme-toggle';
import { BookOpen, HelpCircle, Info, LifeBuoy, Menu, Search, X } from 'lucide-react';

export function Nav() {
  const pathname = usePathname() || '/';
  const inBackend = pathname.startsWith('/admin-dashboard') || pathname.startsWith('/user-dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile navigation drawer upon route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className="flex h-16 sm:h-20 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 md:gap-3 font-semibold tracking-tight min-w-0"
          aria-label="ADC Exam Prep home"
        >
          <Logo />
        </Link>

        {/* Desktop Navigation Links (>= md) */}
        {!inBackend && (
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/practice-exams" className="btn-ghost">Mock Tests</Link>
            <Link href="/p/about-us" className="btn-ghost">About Us</Link>
            <Link href="/#faq" className="btn-ghost">FAQ</Link>
            <Link href="/p/support" className="btn-ghost">Support</Link>
          </nav>
        )}

        {/* Right Action Elements */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {!inBackend && (
            <Link
              href="/practice-exams"
              className="btn-ghost inline-flex h-9 w-9 items-center justify-center p-0 md:hidden"
              aria-label="Search exams"
              title="Search exams"
            >
              <Search className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </Link>
          )}

          <UserMenu />

          <div className="ml-1 sm:ml-2 border-l border-slate-200 pl-1 sm:pl-2.5 dark:border-slate-800">
            <ThemeToggle />
          </div>

          {/* Mobile hamburger menu toggle */}
          {!inBackend && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="btn-ghost inline-flex h-9 w-9 items-center justify-center p-0 md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              ) : (
                <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {!inBackend && mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <nav className="flex flex-col space-y-1">
            <Link
              href="/practice-exams"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              Mock Tests
            </Link>
            <Link
              href="/p/about-us"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Info className="h-4 w-4 text-slate-500" />
              About Us
            </Link>
            <Link
              href="/#faq"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <HelpCircle className="h-4 w-4 text-slate-500" />
              FAQ
            </Link>
            <Link
              href="/p/support"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LifeBuoy className="h-4 w-4 text-slate-500" />
              Contact & Support
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 min-w-0">
      <Image
        src="/logo-mark.png"
        alt="ADC Exam Prep"
        width={40}
        height={40}
        className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 object-contain"
        priority
      />
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base md:text-lg whitespace-nowrap">
          ADC Exam Prep
        </span>
        <span className="hidden md:inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Demo
        </span>
      </div>
    </div>
  );
}
