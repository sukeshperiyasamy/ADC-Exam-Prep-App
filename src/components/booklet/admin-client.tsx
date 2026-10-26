'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Res = { ok: boolean; status: number; j: any };
async function call(method: string, url: string, body?: unknown, raw?: BodyInit, headers?: Record<string, string>): Promise<Res> {
  try {
    const r = await fetch(url, {
      method,
      headers: raw ? headers : { 'content-type': 'application/json' },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
    });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, j: { error: 'Network error — check your connection and retry.' } };
  }
}
const errText = (r: Res) => [r.j?.error, ...(r.j?.blockers ?? [])].filter(Boolean).join(' • ') || `Request failed (${r.status})`;

/** Button that calls an admin endpoint, shows any error/blocker list, then refreshes the page. */
export function ApiButton(props: {
  method?: string;
  url: string;
  body?: unknown;
  label: string;
  confirm?: string;
  className?: string;
  onDone?: (r: Res) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={busy}
        className={props.className ?? 'btn-outline'}
        onClick={async () => {
          if (props.confirm && !window.confirm(props.confirm)) return;
          setBusy(true);
          setErr('');
          const r = await call(props.method ?? 'POST', props.url, props.body);
          setBusy(false);
          if (!r.ok) return setErr(errText(r));
          props.onDone?.(r);
          router.refresh();
        }}
      >
        {busy ? '…' : props.label}
      </button>
      {err && <span role="alert" className="mt-1 max-w-sm text-xs text-red-600">{err}</span>}
    </span>
  );
}

export function CreateBookletForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [err, setErr] = useState('');
  return (
    <form
      className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        const r = await call('POST', '/api/admin/booklets', { title, publisher });
        if (!r.ok) return setErr(errText(r));
        router.push(`/admin-dashboard/booklets/${r.j.id}`);
      }}
    >
      <input className="input" placeholder="Booklet title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" placeholder="Publisher / source (optional)" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
      <button className="btn-primary">Create draft</button>
      {err && <p role="alert" className="text-xs text-red-600 sm:col-span-3">{err}</p>}
    </form>
  );
}

export function BookletMetaForm(props: { id: string; title: string; publisher: string; description: string; licenseConfirmed: boolean; licenseNote: string; status: string }) {
  const router = useRouter();
  const [f, setF] = useState(props);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(true);
  const isDirtyRef = useRef(false);
  const lastPropsRef = useRef(props);

  useEffect(() => {
    if (props.id !== lastPropsRef.current.id) {
      setF(props);
      isDirtyRef.current = false;
      lastPropsRef.current = props;
    } else if (!isDirtyRef.current) {
      setF(props);
      lastPropsRef.current = props;
    }
  }, [props]);

  function updateField<K extends keyof typeof props>(key: K, value: (typeof props)[K]) {
    isDirtyRef.current = true;
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function save(extra: object = {}) {
    setMsg('');
    const r = await call('PATCH', `/api/admin/booklets/${props.id}`, {
      title: f.title,
      publisher: f.publisher,
      description: f.description,
      licenseNote: f.licenseNote,
      licenseConfirmed: f.licenseConfirmed,
      ...extra
    });
    setOk(r.ok);
    setMsg(r.ok ? 'Saved' : errText(r));
    if (r.ok) {
      isDirtyRef.current = false;
      router.refresh();
    }
  }
  return (
    <div className="card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Title<input className="input mt-1 w-full" value={f.title} onChange={(e) => updateField('title', e.target.value)} /></label>
        <label className="text-sm">Publisher<input className="input mt-1 w-full" value={f.publisher} onChange={(e) => updateField('publisher', e.target.value)} /></label>
      </div>
      <label className="block text-sm">Description (shown to students)<textarea className="input mt-1 w-full" rows={2} value={f.description} onChange={(e) => updateField('description', e.target.value)} /></label>
      <fieldset className="rounded-md border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20">
        <legend className="px-1 text-sm font-semibold">Copyright / licensing (blocks paid publication)</legend>
        <label className="block text-sm">Licence or permission details (who granted it, scope, date, reference)
          <textarea className="input mt-1 w-full" rows={2} value={f.licenseNote} onChange={(e) => updateField('licenseNote', e.target.value)} />
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.licenseConfirmed} onChange={(e) => updateField('licenseConfirmed', e.target.checked)} />
          I confirm we hold the rights to convert and publish this material
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => save()}>Save details</button>
        {f.status !== 'PUBLISHED' ? (
          <ApiButton method="PATCH" url={`/api/admin/booklets/${props.id}`} body={{ status: 'PUBLISHED' }} label="Publish booklet" confirm="Make this booklet visible to students (only chapters that are individually published appear)?" className="btn-outline" />
        ) : (
          <ApiButton method="PATCH" url={`/api/admin/booklets/${props.id}`} body={{ status: 'DRAFT' }} label="Unpublish booklet" confirm="Take the whole booklet offline?" />
        )}
        {msg && <span role="status" className={`text-xs ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</span>}
      </div>
    </div>
  );
}

export function SourceUpload({ id, hasSource, totalPages }: { id: string; hasSource: boolean; totalPages: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <div className="card p-4">
      <h3 className="font-semibold">Source PDF</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {hasSource ? `Stored privately on the server${totalPages ? ` · ${totalPages} pages` : ''}.` : 'Not uploaded yet.'} The PDF is never published or placed in public storage.
      </p>
      <input
        type="file"
        accept="application/pdf"
        disabled={busy}
        className="input mt-2"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setMsg('Uploading…');
          const r = await call('POST', `/api/admin/booklets/${id}/source`, undefined, file, { 'content-type': 'application/pdf' });
          setBusy(false);
          setMsg(r.ok ? `Uploaded (${r.j.totalPages ?? '?'} pages)` : errText(r));
          if (r.ok) router.refresh();
        }}
      />
      {msg && <p role="status" className="mt-1 text-xs">{msg}</p>}
    </div>
  );
}

export function AddChapterForm({ id }: { id: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [free, setFree] = useState(false);
  const [err, setErr] = useState('');
  return (
    <form
      className="card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        const r = await call('POST', `/api/admin/booklets/${id}/chapters`, { title, pdfPageFrom: Number(from), pdfPageTo: Number(to), isFreePreview: free });
        if (!r.ok) return setErr(errText(r));
        setTitle(''); setFrom(''); setTo('');
        router.refresh();
      }}
    >
      <input className="input" placeholder="Chapter title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" type="number" min={1} placeholder="PDF page from" value={from} onChange={(e) => setFrom(e.target.value)} required />
      <input className="input" type="number" min={1} placeholder="PDF page to" value={to} onChange={(e) => setTo(e.target.value)} required />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> Free preview</label>
      <button className="btn-primary">Add chapter</button>
      {err && <p role="alert" className="text-xs text-red-600 sm:col-span-5">{err}</p>}
    </form>
  );
}

/** Starts conversion and polls chapter status until it settles. */
export function ProcessPanel(props: { chapterId: string; status: string; stage: string | null; error: string | null; published: boolean }) {
  const router = useRouter();
  const [st, setSt] = useState({ status: props.status, stage: props.stage, error: props.error });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (st.status !== 'PROCESSING') return;
    const t = setInterval(async () => {
      const r = await call('GET', `/api/admin/booklets/chapters/${props.chapterId}`);
      if (r.ok) {
        setSt({ status: r.j.processStatus, stage: r.j.processStage, error: r.j.processError });
        if (r.j.processStatus !== 'PROCESSING') { clearInterval(t); router.refresh(); }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [st.status, props.chapterId, router]);
  const start = async (force: boolean) => {
    setErr('');
    const r = await call('POST', `/api/admin/booklets/chapters/${props.chapterId}`, { action: 'process', force });
    if (!r.ok) return setErr(errText(r));
    setSt({ status: 'PROCESSING', stage: 'starting', error: null });
  };
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Conversion: <span className={st.status === 'FAILED' ? 'text-red-600' : st.status === 'PROCESSED' ? 'text-green-700' : ''}>{st.status}</span></div>
          {st.status === 'PROCESSING' && <div className="text-xs text-slate-500 dark:text-slate-400" role="status">{st.stage}…</div>}
          {st.status === 'FAILED' && <div className="text-xs text-red-600" role="alert">{st.error}</div>}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={st.status === 'PROCESSING' || props.published} onClick={() => start(false)}>
            {st.status === 'PROCESSED' ? 'Run missing stages' : st.status === 'FAILED' ? 'Retry (resumes)' : 'Convert with Gemini'}
          </button>
          {st.status === 'PROCESSED' && (
            <button className="btn-outline" disabled={props.published} onClick={() => window.confirm('Regenerate ALL study content? Reviewed (approved/rejected) items are kept; drafts are replaced and approval resets.') && start(true)}>Regenerate</button>
          )}
        </div>
      </div>
      {props.published && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Unpublish the chapter before converting again.</p>}
      {err && <p role="alert" className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export function ImportPanel({ chapterId, disabled }: { chapterId: string; disabled: boolean }) {
  const router = useRouter();
  const [txt, setTxt] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(true);
  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-semibold">Import converted content (JSON from scripts/pilot)</summary>
      <textarea className="input mt-3 w-full font-mono text-xs" rows={6} placeholder='{"summary": "...", "notes": [...], "keyConcepts": [...], "tables": [...], "flashcards": [...], "mcqs": [...]}' value={txt} onChange={(e) => setTxt(e.target.value)} />
      <div className="mt-2 flex items-center gap-3">
        <button
          className="btn-outline"
          disabled={disabled || !txt.trim()}
          onClick={async () => {
            let content: unknown;
            try { content = JSON.parse(txt); } catch { setOk(false); return setMsg('Not valid JSON'); }
            const r = await call('POST', `/api/admin/booklets/chapters/${chapterId}`, { action: 'import', content });
            setOk(r.ok);
            setMsg(r.ok ? `Imported ${r.j.items} items, ${r.j.mcqs} MCQs as DRAFT` : errText(r));
            if (r.ok) { setTxt(''); router.refresh(); }
          }}
        >Import as DRAFT</button>
        {msg && <span role="status" className={`text-xs ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</span>}
      </div>
    </details>
  );
}

/** Edit one item's JSON data inline, and approve / reject / reset it. */
export function ItemRow(props: { id: string; kind: string; status: string; summary: string; data: unknown; pages: number[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState(JSON.stringify(props.data, null, 2));
  const [err, setErr] = useState('');
  const set = async (status: string) => {
    setErr('');
    const r = await call('PATCH', `/api/admin/booklets/items/${props.id}`, { status });
    r.ok ? router.refresh() : setErr(errText(r));
  };
  const color = props.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : props.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <li className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="badge mr-2">{props.kind}</span>
          <span className={`badge mr-2 ${color}`}>{props.status}</span>
          <span>{props.summary}</span>
          {props.pages.length > 0 && <span className="ml-2 text-xs text-slate-400">PDF p. {props.pages.join(', ')}</span>}
        </div>
        <div className="flex shrink-0 gap-1 text-xs">
          <button className="btn-outline px-2 py-1" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</button>
          <button className="btn-outline px-2 py-1" onClick={() => set('APPROVED')} disabled={props.status === 'APPROVED'}>Approve</button>
          <button className="btn-outline px-2 py-1" onClick={() => set('REJECTED')} disabled={props.status === 'REJECTED'}>Reject</button>
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <textarea className="input w-full font-mono text-xs" rows={8} value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="Item JSON" />
          <button
            className="btn-primary mt-2"
            onClick={async () => {
              setErr('');
              let data: unknown;
              try { data = JSON.parse(txt); } catch { return setErr('Not valid JSON'); }
              const r = await call('PATCH', `/api/admin/booklets/items/${props.id}`, { data });
              r.ok ? (setOpen(false), router.refresh()) : setErr(errText(r));
            }}
          >Save edit</button>
        </div>
      )}
      {err && <p role="alert" className="mt-1 text-xs text-red-600">{err}</p>}
    </li>
  );
}

export function McqRow(props: { id: string; status: string; mcq: { stem: string; options: { id: string; text: string }[]; correct: string[]; explanation: string; difficulty: number; pages: number[] } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState(JSON.stringify(props.mcq, null, 2));
  const [err, setErr] = useState('');
  const set = async (status: string) => {
    setErr('');
    const r = await call('PATCH', `/api/admin/booklets/questions/${props.id}`, { status });
    r.ok ? router.refresh() : setErr(errText(r));
  };
  const color = props.status === 'PUBLISHED' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : props.status === 'ARCHIVED' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <li className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`badge mr-2 ${color}`}>{props.status === 'PUBLISHED' ? 'APPROVED' : props.status}</span>
          <span className="font-medium">{props.mcq.stem}</span>
          <ul className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {props.mcq.options.map((o) => <li key={o.id}>{props.mcq.correct.includes(o.id) ? '✓' : '○'} {o.id.toUpperCase()}. {o.text}</li>)}
          </ul>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{props.mcq.explanation} {props.mcq.pages.length > 0 && `(PDF p. ${props.mcq.pages.join(', ')})`}</p>
        </div>
        <div className="flex shrink-0 gap-1 text-xs">
          <button className="btn-outline px-2 py-1" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</button>
          <button className="btn-outline px-2 py-1" onClick={() => set('PUBLISHED')} disabled={props.status === 'PUBLISHED'}>Approve</button>
          <button className="btn-outline px-2 py-1" onClick={() => set('ARCHIVED')} disabled={props.status === 'ARCHIVED'}>Reject</button>
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <textarea className="input w-full font-mono text-xs" rows={12} value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="Question JSON" />
          <button
            className="btn-primary mt-2"
            onClick={async () => {
              setErr('');
              let mcq: unknown;
              try { mcq = JSON.parse(txt); } catch { return setErr('Not valid JSON'); }
              const r = await call('PATCH', `/api/admin/booklets/questions/${props.id}`, { mcq });
              r.ok ? (setOpen(false), router.refresh()) : setErr(errText(r));
            }}
          >Save edit</button>
        </div>
      )}
      {err && <p role="alert" className="mt-1 text-xs text-red-600">{err}</p>}
    </li>
  );
}

export function FigureRow({ id, label, caption, pdfPage, approved }: { id: string; label: string; caption: string; pdfPage: number; approved: boolean }) {
  const router = useRouter();
  return (
    <li className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/booklets/figures/${id}`} alt={caption || label} className="h-24 w-32 shrink-0 rounded border object-contain" loading="lazy" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{label} <span className="text-xs text-slate-400">PDF p. {pdfPage}</span></div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{caption}</div>
      </div>
      <button className="btn-outline px-2 py-1 text-xs" onClick={async () => { const r = await call('PATCH', `/api/admin/booklets/figures/${id}`, { approved: !approved }); if (r.ok) router.refresh(); }}>
        {approved ? 'Approved ✓ (undo)' : 'Approve figure'}
      </button>
    </li>
  );
}

export function ReviewPanel(props: { chapterId: string; reviewStatus: string; reviewerName: string; published: boolean; blockers: string[]; issues: { item: string; problem: string; severity: string; suggestedFix: string; resolved?: boolean }[] }) {
  const [name, setName] = useState(props.reviewerName);
  const [note, setNote] = useState('');
  const [resolved, setResolved] = useState<number[]>([]);
  const url = `/api/admin/booklets/chapters/${props.chapterId}`;
  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Review &amp; publish</h3>
        <span className="badge">{props.reviewStatus}</span>
        {props.published && <span className="badge bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300">LIVE</span>}
      </div>

      {props.issues.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold">AI fact-check findings ({props.issues.filter((i) => !i.resolved).length} open)</h4>
          <ul className="mt-2 space-y-2">
            {props.issues.map((i, n) => (
              <li key={n} className={`rounded-md border p-2 text-xs ${i.severity === 'high' ? 'border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-700'} ${i.resolved ? 'opacity-50' : ''}`}>
                <b className="uppercase">{i.severity}</b> — {i.item}<br />
                <span className="text-slate-600">{i.problem}</span><br />
                <span className="text-slate-500 dark:text-slate-400">Suggested: {i.suggestedFix}</span>
                {!i.resolved && (
                  <label className="mt-1 flex items-center gap-1"><input type="checkbox" checked={resolved.includes(n)} onChange={(e) => setResolved(e.target.checked ? [...resolved, n] : resolved.filter((x) => x !== n))} /> Resolved by reviewer (fixed or judged incorrect)</label>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <ApiButton url={url} body={{ action: 'bulk', status: 'APPROVED' }} label="Approve all drafts" confirm="Approve every DRAFT item and question in this chapter? Only do this after reading them." />
        <ApiButton url={url} body={{ action: 'review', review: 'submit' }} label="Submit for clinical review" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">Qualified clinical reviewer (name &amp; registration)
          <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr A. Smith, AHPRA DEN0001234567" />
        </label>
        <label className="text-sm">Reviewer note<input className="input mt-1 w-full" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <ApiButton url={url} body={{ action: 'review', review: 'approve', reviewerName: name, note, resolveIssueIndexes: resolved }} label="Record clinical approval" className="btn-primary" />
        <ApiButton url={url} body={{ action: 'review', review: 'revert' }} label="Revert to draft" />
      </div>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
        {props.blockers.length > 0 && (
          <ul className="mb-2 list-disc pl-5 text-xs text-amber-800 dark:text-amber-300">
            {props.blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
        {props.published ? (
          <ApiButton url={url} body={{ action: 'publish', publish: false }} label="Unpublish chapter" />
        ) : (
          <ApiButton url={url} body={{ action: 'publish', publish: true }} label="Publish chapter" className="btn-primary-grad" confirm="Publish this chapter to students? It must be licensed and clinically reviewed." />
        )}
      </div>
    </div>
  );
}
