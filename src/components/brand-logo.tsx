import type { SVGProps } from 'react';

export interface BrandLogoProps {
  /** 'full' includes wordmark text; 'mark' is icon-only */
  variant?: 'full' | 'mark';
  /** Preset sizing */
  size?: 'sm' | 'md' | 'lg';
  /** Extra class names */
  className?: string;
  /** Hide subtitle on desktop */
  hideSubtitle?: boolean;
}

/**
 * Custom vector logo mark combining a stylised molar tooth
 * with an integrated clinical checkmark.
 */
export function ToothCheckmarkIcon({ className = 'h-8 w-8', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="navTealGrad" x1="180" y1="310" x2="340" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>

      {/* Molar Tooth Silhouette with light/dark adaptive fill */}
      <path
        d="M152 72
           C102 72 82 122 82 176
           C82 240 98 290 114 344
           C126 384 144 440 172 440
           C194 440 206 398 220 348
           C232 305 244 286 256 286
           C268 286 280 305 292 348
           C306 398 318 440 340 440
           C368 440 386 384 398 344
           C414 290 430 240 430 176
           C430 122 410 72 360 72
           C322 72 292 98 256 122
           C220 98 190 72 152 72 Z"
        className="fill-slate-950 dark:fill-white transition-colors duration-200"
      />

      {/* Subtle developmental groove */}
      <path
        d="M165 112 C195 112 226 128 256 150 C286 128 317 112 347 112"
        className="stroke-slate-300 dark:stroke-slate-700"
        strokeWidth="14"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />

      {/* Knockout Underlay matching background */}
      <path
        d="M182 248 L236 304 L342 168"
        className="stroke-white dark:stroke-slate-950 transition-colors duration-200"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Precision Checkmark in Clinical Teal */}
      <path
        d="M182 248 L236 304 L342 168"
        stroke="url(#navTealGrad)"
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Standard brand logo component for navigation, headers, footers, and auth pages.
 */
export function BrandLogo({
  variant = 'full',
  size = 'md',
  className = '',
  hideSubtitle = false
}: BrandLogoProps) {
  const iconSizeClass = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8 sm:h-9 sm:w-9',
    lg: 'h-10 w-10 sm:h-12 sm:w-12'
  }[size];

  const textSizeClass = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl md:text-2xl'
  }[size];

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center shrink-0 ${className}`}>
        <ToothCheckmarkIcon className={iconSizeClass} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${className}`}>
      <ToothCheckmarkIcon className={`${iconSizeClass} shrink-0`} />
      <div className="flex flex-col min-w-0">
        <span
          className={`font-extrabold tracking-tight text-slate-950 dark:text-white leading-tight whitespace-nowrap ${textSizeClass}`}
        >
          ADC<span className="hidden min-[420px]:inline font-bold text-slate-800 dark:text-slate-100"> Exam Prep</span>
        </span>
        {!hideSubtitle && (
          <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-400 leading-none mt-0.5">
            Dental Examination
          </span>
        )}
      </div>
    </div>
  );
}
