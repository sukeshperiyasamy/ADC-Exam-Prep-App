'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  position: number;
  published: boolean;
};

export default function FaqAdminClient({ initial }: { initial: FaqRow[] }) {
  const [rows, setRows] = useState<FaqRow[]>(initial);

  async function addBlank() {
    const response = await fetch('/api/admin/faqs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: 'New question',
        answer: 'Answer goes here…',
        position: rows.length,
        published: false
      })
    });
    const data = await response.json();
    if (data.ok) setRows((current) => [...current, data.item]);
  }

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex-1">
          <div className="text-sm font-medium">Manage demo FAQs</div>
          <div className="text-[11px] text-slate-500">Add and review answers manually before publishing them on the public site.</div>
        </div>
        <button type="button" onClick={addBlank} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Plus className="h-3.5 w-3.5" /> Add FAQ
        </button>
      </div>

      {rows.map((row) => (
        <FaqEditor
          key={row.id}
          row={row}
          onUpdate={(updated) => setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)))}
          onDelete={(id) => setRows((current) => current.filter((item) => item.id !== id))}
        />
      ))}
      {rows.length === 0 && <p className="text-sm text-slate-500">No FAQs yet. Add one when approved copy is ready.</p>}
    </div>
  );
}

function FaqEditor({ row, onUpdate, onDelete }: { row: FaqRow; onUpdate: (row: FaqRow) => void; onDelete: (id: string) => void }) {
  const [question, setQuestion] = useState(row.question);
  const [answer, setAnswer] = useState(row.answer);
  const [position, setPosition] = useState(row.position);
  const [published, setPublished] = useState(row.published);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');
    const response = await fetch(`/api/admin/faqs/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, answer, position, published })
    });
    setSaving(false);
    const data = await response.json().catch(() => ({}));
    if (data.ok) {
      onUpdate(data.item);
      setMessage('Saved.');
      setTimeout(() => setMessage(''), 1500);
    } else {
      setMessage('Save failed.');
    }
  }

  async function remove() {
    if (!confirm(`Delete FAQ "${question}"?`)) return;
    const response = await fetch(`/api/admin/faqs/${row.id}`, { method: 'DELETE' });
    if (response.ok) onDelete(row.id);
  }

  return (
    <div className="card space-y-2 p-3">
      <input value={question} onChange={(event) => setQuestion(event.target.value)} className="input-sm" />
      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={3} className="w-full rounded-md border border-slate-200 bg-white p-2 text-[12px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" value={position} onChange={(event) => setPosition(Number(event.target.value) || 0)} className="input-sm w-20" />
        <label className="inline-flex items-center gap-1 text-[11px]"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Published</label>
        <button type="button" onClick={save} disabled={saving} className="ml-auto inline-flex h-7 items-center rounded-md bg-brand-700 px-3 text-[11px] font-medium text-white hover:bg-brand-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={remove} className="inline-flex h-7 items-center gap-1 rounded text-[11px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-3 w-3" /> Delete</button>
        {message && <span className="text-[11px] text-slate-500">{message}</span>}
      </div>
    </div>
  );
}
