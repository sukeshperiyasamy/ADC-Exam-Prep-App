'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, X, ZoomIn, ZoomOut, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

export interface PdfSourceCitationProps {
  bookletSlug: string;
  chapterSlug: string;
  bookletTitle: string;
  chapterTitle: string;
  pages: number[];
  printedPages?: Record<number, string | null>;
  className?: string;
}

export function PdfSourceCitation({
  bookletSlug,
  chapterSlug,
  bookletTitle,
  chapterTitle,
  pages,
  printedPages = {},
  className
}: PdfSourceCitationProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!pages || pages.length === 0) return null;

  const citationText = `PDF p. ${pages
    .map((p) => (printedPages[p] ? `${p} (printed ${printedPages[p]})` : `${p}`))
    .join(', ')}`;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={className || 'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60'}
        title="Inspect original source page in PDF"
        aria-label={`View ${citationText} in source PDF`}
      >
        <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{citationText}</span>
      </button>

      {isOpen && (
        <PdfSourceModal
          bookletSlug={bookletSlug}
          chapterSlug={chapterSlug}
          bookletTitle={bookletTitle}
          chapterTitle={chapterTitle}
          pages={pages}
          printedPages={printedPages}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

interface PdfSourceModalProps {
  bookletSlug: string;
  chapterSlug: string;
  bookletTitle: string;
  chapterTitle: string;
  pages: number[];
  printedPages: Record<number, string | null>;
  onClose: () => void;
}

export function PdfSourceModal({
  bookletSlug,
  chapterSlug,
  bookletTitle,
  chapterTitle,
  pages,
  printedPages,
  onClose
}: PdfSourceModalProps) {
  const [selectedPage, setSelectedPage] = useState<number>(pages[0]);
  const [zoom, setZoom] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleKeyDown]);

  const imageUrl = `/api/booklets/${encodeURIComponent(bookletSlug)}/chapters/${encodeURIComponent(chapterSlug)}/pages/${selectedPage}?v=${reloadKey}`;

  const printedNum = printedPages[selectedPage];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl h-[92vh] rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Original Source PDF
              </span>
              <span className="text-xs text-slate-500 truncate" title={bookletTitle}>
                {bookletTitle}
              </span>
            </div>
            <h2 id="pdf-modal-title" className="mt-1 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {chapterTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {pages.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg dark:bg-slate-700/60" role="tablist">
                {pages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={selectedPage === p}
                    onClick={() => {
                      if (selectedPage !== p) {
                        setSelectedPage(p);
                        setIsLoading(true);
                        setHasError(false);
                      }
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedPage === p
                        ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Page {p}
                    {printedPages[p] ? ` (${printedPages[p]})` : ''}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
              aria-label="Close PDF viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 font-medium">
            <span>Physical PDF Page: <strong className="text-slate-900 dark:text-slate-100">{selectedPage}</strong></span>
            {printedNum && (
              <>
                <span>·</span>
                <span>Printed Page: <strong className="text-slate-900 dark:text-slate-100">{printedNum}</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-mono">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(250, z + 25))}
              className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 ml-1"
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Viewer content area */}
        <div className="relative flex-1 overflow-auto bg-slate-100/80 dark:bg-slate-950 p-4 flex justify-center items-start">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">Loading original source page…</p>
            </div>
          )}

          {hasError ? (
            <div className="my-auto max-w-sm rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <h3 className="mt-2 text-sm font-semibold text-red-900 dark:text-red-300">Source page unavailable</h3>
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                The original source PDF page could not be loaded. Please ensure the source file is available on the server and that your account has entitlement.
              </p>
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                  setReloadKey((k) => k + 1);
                }}
                className="btn-outline mt-4 text-xs"
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              className="transition-transform duration-150 origin-top shadow-md rounded bg-white dark:bg-slate-900"
              style={{ width: `${zoom}%`, maxWidth: zoom > 100 ? 'none' : '100%' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Source PDF page ${selectedPage}${printedNum ? ` (printed ${printedNum})` : ''}`}
                className="w-full h-auto rounded object-contain border border-slate-200 dark:border-slate-800"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 hidden sm:block">
            Official curriculum reference · Verified by Australian Dental Council guidelines
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary-grad ml-auto text-xs px-4 py-2"
          >
            Close & Return to Study
          </button>
        </div>
      </div>
    </div>
  );
}
