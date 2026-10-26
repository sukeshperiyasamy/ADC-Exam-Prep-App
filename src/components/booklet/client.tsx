'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

/** Starts a booklet MCQ attempt (chapter practice / timed mock) and opens the existing exam runner. */
export function StartAttemptButton(props: {
  slug: string;
  kind: 'chapter' | 'mock';
  chapterId?: string;
  mode?: 'PRACTICE' | 'EXAM';
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className={props.className ?? 'btn-primary-grad'}
        onClick={async () => {
          setBusy(true);
          setErr('');
          const r = await post(`/api/booklets/${props.slug}/attempts`, { kind: props.kind, chapterId: props.chapterId, mode: props.mode });
          if (r.ok) return router.push(`/exam/${r.j.attemptId}`);
          setBusy(false);
          setErr(
            r.status === 402 ? 'This content needs an active purchase.' :
            r.status === 401 ? 'Please sign in again.' :
            r.j?.error || 'Could not start. Please try again.'
          );
        }}
      >
        {busy ? 'Starting…' : props.label}
      </button>
      {err && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}

/** Marks a study mode as visited/completed (drives chapter progress). */
export function ModeCompleteButton({ chapterId, mode, done }: { chapterId: string; mode: string; done: boolean }) {
  const [isDone, setDone] = useState(done);
  const [err, setErr] = useState('');
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="button"
        className={isDone ? 'btn-outline' : 'btn-primary-grad'}
        onClick={async () => {
          setErr('');
          const r = await post(`/api/booklets/chapters/${chapterId}/progress`, { mode, completed: true });
          if (r.ok) setDone(true);
          else setErr('Could not save progress. Check your connection and retry.');
        }}
      >
        {isDone ? '✓ Completed' : 'Mark this section complete'}
      </button>
      {err && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{err}</span>}
    </div>
  );
}

export function BookmarkButton(props: { chapterId: string; itemId: string; label: string; pdfPage?: number; initial: boolean }) {
  const [on, setOn] = useState(props.initial);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Remove bookmark' : 'Add bookmark'}
      className="text-slate-400 hover:text-amber-500"
      onClick={async () => {
        const next = !on;
        setOn(next);
        const r = await post(`/api/booklets/chapters/${props.chapterId}/bookmarks`, {
          itemId: props.itemId, label: props.label, pdfPage: props.pdfPage, remove: !next
        });
        if (!r.ok) setOn(!next);
      }}
    >
      {on ? <BookmarkCheck className="h-4 w-4 text-amber-500" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}

/** Flip-card deck with keyboard support and a "still learning" shuffle. */
export function FlashcardDeck({ cards, onFinish }: { cards: { id: string; front: string; back: string; pages: number[] }[]; onFinish?: () => void }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const finished = useRef(false);
  const card = cards[order[i]];

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlip((f) => !f); }
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  function go(d: number) {
    setFlip(false);
    setI((x) => Math.min(order.length - 1, Math.max(0, x + d)));
  }
  if (!cards.length) return <p className="text-sm text-slate-500 dark:text-slate-400">No flashcards have been published for this chapter yet.</p>;
  if (known.size === cards.length && !finished.current) {
    finished.current = true;
    onFinish?.();
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Card {i + 1} of {order.length} · {known.size}/{cards.length} known</span>
        <button type="button" className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200" onClick={() => { setOrder([...order].sort(() => Math.random() - 0.5)); setI(0); setFlip(false); }}>
          <RotateCcw className="h-3 w-3" /> Shuffle
        </button>
      </div>
      <button
        type="button"
        onClick={() => setFlip((f) => !f)}
        aria-label={flip ? 'Show question side' : 'Show answer side'}
        className="card flex min-h-[220px] w-full items-center justify-center p-6 text-center text-lg"
      >
        <span>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">{flip ? 'Answer' : 'Question'}</span>
          {flip ? card.back : card.front}
          {flip && card.pages.length > 0 && <span className="mt-3 block text-xs text-slate-400">PDF p. {card.pages.join(', ')}</span>}
        </span>
      </button>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" className="btn-outline" onClick={() => go(-1)} disabled={i === 0}><ChevronLeft className="h-4 w-4" /> Prev</button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setKnown((k) => { const n = new Set(k); n.has(card.id) ? n.delete(card.id) : n.add(card.id); return n; })}
        >
          {known.has(card.id) ? '✓ Known' : 'Mark known'}
        </button>
        <button type="button" className="btn-primary" onClick={() => go(1)} disabled={i === order.length - 1}>Next <ChevronRight className="h-4 w-4" /></button>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">Space flips · ← → navigate</p>
    </div>
  );
}

export { PdfSourceCitation, PdfSourceModal } from './source-inspector';
