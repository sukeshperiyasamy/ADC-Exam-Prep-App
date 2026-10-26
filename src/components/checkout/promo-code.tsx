'use client';
import { useState } from 'react';
import { Tag, X, Loader2 } from 'lucide-react';

export type PromoApplied = {
  code: string;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
};

export function PromoCodeInput({
  examId,
  bundleId,
  tier,
  onApply,
  onClear
}: {
  examId?: string;
  bundleId?: string;
  tier?: string;
  onApply: (a: PromoApplied) => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState('');
  const [applied, setApplied] = useState<PromoApplied | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');

  async function apply() {
    const code = value.trim();
    if (!code) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, examId, bundleId, tier })
      });
      const d = await r.json();
      if (!d.ok) {
        setErr(d.message || 'This promo code cannot be applied.');
        return;
      }
      const next: PromoApplied = {
        code: d.code,
        discountCents: d.discountCents,
        subtotalCents: d.subtotalCents,
        totalCents: d.totalCents
      };
      setApplied(next);
      onApply(next);
    } catch {
      setErr('Could not check the code right now.');
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setApplied(null);
    setValue('');
    setErr('');
    onClear();
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[12px] dark:border-green-900 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
          <span className="font-medium text-green-800 dark:text-green-200">{applied.code}</span>
          <span className="text-green-700 dark:text-green-300">
            −${(applied.discountCents / 100).toFixed(2)} applied
          </span>
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label="Remove promo code"
          className="icon-btn"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          placeholder="Promo code"
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
          className="input-sm"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !value.trim()}
          className="btn-sm-outline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
          Apply
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}
