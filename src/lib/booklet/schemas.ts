import { z } from 'zod';

const Pages = z.array(z.number().int().positive()).default([]);

export const NoteData = z.object({ heading: z.string().min(1), bullets: z.array(z.string()).min(1) });
export const KeyConceptData = z.object({ point: z.string().min(1) });
export const TableData = z.object({
  title: z.string().min(1),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});
export const FlowchartData = z.object({
  title: z.string().min(1),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })).min(1)
});
export const FlashcardData = z.object({ front: z.string().min(1), back: z.string().min(1) });
export const SummaryData = z.object({ text: z.string().min(1) });

export const ITEM_DATA = {
  SUMMARY: SummaryData,
  NOTE: NoteData,
  KEY_CONCEPT: KeyConceptData,
  TABLE: TableData,
  FLOWCHART: FlowchartData,
  FLASHCARD: FlashcardData
} as const;
export type ItemKind = keyof typeof ITEM_DATA;

/** Validate the `data` JSON of a BookletItem for its kind. Throws ZodError. */
export function parseItemData(kind: ItemKind, data: unknown) {
  return ITEM_DATA[kind].parse(data);
}

export const McqData = z
  .object({
    stem: z.string().min(1),
    options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2).max(8),
    correct: z.array(z.string()).min(1),
    explanation: z.string().min(1),
    difficulty: z.number().int().min(1).max(5).default(3),
    pages: Pages
  })
  .superRefine((q, ctx) => {
    const ids = new Set(q.options.map((o) => o.id));
    if (ids.size !== q.options.length) ctx.addIssue({ code: 'custom', message: 'duplicate option ids' });
    if (!q.correct.every((c) => ids.has(c))) ctx.addIssue({ code: 'custom', message: 'correct id not in options' });
  });
export type McqT = z.infer<typeof McqData>;

/** Shape produced by Gemini (and by scripts/pilot content.json). */
export const ChapterContent = z.object({
  summary: z.string(),
  notes: z.array(NoteData.extend({ pages: Pages })),
  keyConcepts: z.array(KeyConceptData.extend({ pages: Pages })),
  tables: z.array(TableData.extend({ pages: Pages })),
  flowchart: FlowchartData.extend({ pages: Pages }).nullable().optional(),
  flowcharts: z.array(FlowchartData.extend({ pages: Pages })).optional(),
  flashcards: z.array(FlashcardData.extend({ pages: Pages })),
  // Validated one-by-one in saveContent so a single bad MCQ is dropped, not the whole chapter.
  mcqs: z.array(z.unknown())
});
export type ChapterContentT = z.infer<typeof ChapterContent>;

export const PageExtract = z.object({
  printedPage: z.string(),
  markdown: z.string(),
  tables: z.array(
    z.object({ caption: z.string(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), footnotes: z.string() })
  ),
  figures: z.array(
    z.object({ label: z.string(), caption: z.string(), meaningful: z.boolean(), box: z.array(z.number()).length(4) })
  )
});
export type PageExtractT = z.infer<typeof PageExtract>;

export const VerifyResult = z.object({
  issues: z.array(
    z.object({
      item: z.string(),
      problem: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      suggestedFix: z.string()
    })
  )
});
export type VerifyResultT = z.infer<typeof VerifyResult>;
