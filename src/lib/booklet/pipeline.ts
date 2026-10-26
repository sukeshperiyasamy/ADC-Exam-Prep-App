import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getJsonGenerator, generateJson, obj, arr, str, S, type JsonGenerator } from './gemini';
import { ChapterContent, PageExtract, VerifyResult, type PageExtractT } from './schemas';
import { saveContent, saveExtraction } from './store';
import { putFigure } from './figure-storage';

/**
 * Chapter conversion: PDF pages -> page images -> Gemini transcription
 * (+ figure boxes) -> cropped figures -> Gemini study content -> Gemini
 * fact-check against the transcription. Everything lands as DRAFT.
 *
 * Stages are idempotent: pages already transcribed and items already generated
 * are NOT regenerated unless `force` is set, so a failed/partial run resumes.
 */
export type PageRenderer = (pdfPath: string, pages: number[]) => Promise<Map<number, Buffer>>;

export const defaultRenderer: PageRenderer = async (pdfPath, pages) => {
  const [{ createCanvas }, pdfjs] = await Promise.all([
    import('@napi-rs/canvas'),
    import('pdfjs-dist/legacy/build/pdf.mjs')
  ]);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(pdfPath)), useSystemFonts: true }).promise;
  const out = new Map<number, Buffer>();
  for (const n of pages) {
    if (n < 1 || n > doc.numPages) throw new Error(`PDF has ${doc.numPages} pages; page ${n} is out of range`);
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvasContext: canvas.getContext('2d') as any, viewport: vp, canvas: canvas as any }).promise;
    out.set(n, canvas.toBuffer('image/png'));
  }
  return out;
};

const PAGE_PROMPT = `You are transcribing one page of a clinical dental textbook from an image.
Return JSON only:
- printedPage: the page number printed on the page (empty string if none).
- markdown: ALL body text in reading order as Markdown (headings as #/##/###, bullets as "- "). Exclude the logo, page number, and the content of tables and figures (tables/figures go in their own fields). Transcribe exactly; never add, infer, or "fix" clinical facts, doses or ages.
- tables: every table with a caption (or empty), header cells, one array per row (merge wrapped lines inside a cell with "; "), and any table notes in footnotes.
- figures: every figure, flowchart, diagram or photo (NOT tables, NOT the logo). label (e.g. "Figure 13.15"), caption, meaningful=true if it conveys clinical information, and box=[ymin,xmin,ymax,xmax] normalised 0-1000 around the whole figure including its title.
If the page continues a table from the previous page, still output its rows (use empty caption).`;

const pageSchema = obj({
  printedPage: str,
  markdown: str,
  tables: arr(obj({ caption: str, headers: arr(str), rows: arr(arr(str)), footnotes: str })),
  figures: arr(obj({ label: str, caption: str, meaningful: S('BOOLEAN'), box: arr(S('INTEGER')) }))
});

const pagesArr = arr(S('INTEGER'));
const contentSchema = obj({
  summary: str,
  notes: arr(obj({ heading: str, bullets: arr(str), pages: pagesArr })),
  keyConcepts: arr(obj({ point: str, pages: pagesArr })),
  tables: arr(obj({ title: str, headers: arr(str), rows: arr(arr(str)), pages: pagesArr })),
  flowchart: obj({ title: str, steps: arr(obj({ title: str, detail: str })), pages: pagesArr }),
  flashcards: arr(obj({ front: str, back: str, pages: pagesArr })),
  mcqs: arr(
    obj({
      stem: str,
      options: arr(obj({ id: str, text: str })),
      correct: arr(str),
      explanation: str,
      difficulty: S('INTEGER'),
      pages: pagesArr
    })
  )
});

const verifySchema = obj({
  issues: arr(obj({ item: str, problem: str, severity: S('STRING', { enum: ['high', 'medium', 'low'] }), suggestedFix: str }))
});

export function sourceBundle(
  pages: { pdfPage: number; printedPage: string | null; markdown: string }[],
  figures: { pdfPage: number; label: string; caption: string }[]
): string {
  return pages
    .sort((a, b) => a.pdfPage - b.pdfPage)
    .map((p) => {
      const f = figures
        .filter((x) => x.pdfPage === p.pdfPage)
        .map((x) => `FIGURE ${x.label}: ${x.caption}`)
        .join('\n');
      return `===== PDF PAGE ${p.pdfPage} (printed ${p.printedPage || '?'}) =====\n${p.markdown}\n\n${f}`;
    })
    .join('\n\n');
}

const genPrompt = (title: string, src: string) => `You are an exam-prep author for overseas-trained dentists sitting the Australian Dental Council (ADC) examination.
Using ONLY the source text below (chapter "${title}"), produce study content.

Rules:
- Every fact, dose, age limit, drug name and interval must be present in the source. Do not add outside knowledge. If unsure, omit it.
- Rewrite in simple, exam-focused language; do not copy long passages verbatim.
- "pages" = the PDF page numbers (the number in "PDF PAGE n") that support the item.
- summary: 4-6 sentences.
- notes: 5-8 sections following the chapter's own headings, short bullets.
- keyConcepts: 10-15 high-yield points.
- tables: reorganise comparisons into 2-4 tables. Keep source values exact.
- flowchart: one clinical workflow of 4-6 steps drawn from the source.
- flashcards: 20 cards, one fact each, answers under 25 words.
- mcqs: 10 single-best-answer questions, 4 options with ids "a".."d", correct = ["a"] etc., spread across the chapter, explanation cites the source fact, difficulty 1-5.

SOURCE
${src}`;

/** Crop the meaningful figures of one rendered page and store them privately. */
export async function cropFigures(chapterId: string, pdfPage: number, png: Buffer, figures: PageExtractT['figures']) {
  const out: { pdfPage: number; label: string; caption: string; storageKey: string }[] = [];
  const figs = figures.filter((f) => f.meaningful);
  if (!figs.length) return out;
  const sharp = (await import('sharp')).default;
  const meta = await sharp(png).metadata();
  const W = meta.width!;
  const H = meta.height!;
  for (const f of figs) {
    const [y0, x0, y1, x1] = f.box.map((v) => Math.min(1000, Math.max(0, v)));
    if (y1 <= y0 || x1 <= x0) continue;
    const left = Math.floor((x0 / 1000) * W);
    const top = Math.floor((y0 / 1000) * H);
    const webp = await sharp(png)
      .extract({
        left,
        top,
        width: Math.max(1, Math.min(W - left, Math.ceil(((x1 - x0) / 1000) * W))),
        height: Math.max(1, Math.min(H - top, Math.ceil(((y1 - y0) / 1000) * H)))
      })
      .webp({ quality: 85 })
      .toBuffer();
    out.push({ pdfPage, label: f.label, caption: f.caption, storageKey: await putFigure(`${chapterId}/${crypto.randomUUID()}.webp`, webp) });
  }
  return out;
}

export type PipelineDeps = { gen?: JsonGenerator; render?: PageRenderer; retryDelayMs?: number };
export type PipelineOptions = { force?: boolean };

const STALE_MS = 30 * 60_000;

async function setStage(chapterId: string, processStage: string) {
  await db.bookletChapter.update({ where: { id: chapterId }, data: { processStage } });
}

export async function processChapter(chapterId: string, opts: PipelineOptions = {}, deps: PipelineDeps = {}) {
  // Claim the chapter (prevents double-runs).
  const claimed = await db.bookletChapter.updateMany({
    where: {
      id: chapterId,
      OR: [{ processStatus: { not: 'PROCESSING' } }, { updatedAt: { lt: new Date(Date.now() - STALE_MS) } }]
    },
    data: { processStatus: 'PROCESSING', processStage: 'starting', processError: null }
  });
  if (claimed.count === 0) throw new Error('Chapter is already being processed');

  try {
    const ch = await db.bookletChapter.findUniqueOrThrow({ where: { id: chapterId }, include: { booklet: true } });
    const gen = deps.gen ?? (await getJsonGenerator());
    const wanted: number[] = [];
    for (let n = ch.pdfPageFrom; n <= ch.pdfPageTo; n++) wanted.push(n);

    // ---- stage 1+2: transcribe pages that are missing -----------------------
    const have = await db.bookletPage.findMany({ where: { chapterId }, select: { pdfPage: true } });
    const haveSet = new Set(have.map((p) => p.pdfPage));
    const missing = opts.force ? wanted : wanted.filter((n) => !haveSet.has(n));
    const newFigures: { pdfPage: number; label: string; caption: string; storageKey: string }[] = [];

    if (missing.length) {
      if (!ch.booklet.sourcePath) throw new Error('Booklet has no source PDF on the server (upload it first)');
      await setStage(chapterId, `rendering ${missing.length} page(s)`);
      const images = await (deps.render ?? defaultRenderer)(ch.booklet.sourcePath, missing);
      const extracted: Record<number, PageExtractT> = {};
      for (const n of missing) {
        await setStage(chapterId, `transcribing page ${n}`);
        const png = images.get(n)!;
        extracted[n] = await generateJson(
          gen,
          [{ text: PAGE_PROMPT }, { inlineData: { mimeType: 'image/png', data: png.toString('base64') } }],
          pageSchema,
          PageExtract,
          0,
          deps.retryDelayMs
        );
        newFigures.push(...(await cropFigures(chapterId, n, png, extracted[n].figures)));
      }
      await saveExtraction(chapterId, extracted, newFigures);
    }

    // ---- stage 3: study content ----------------------------------------------
    const existingItems = await db.bookletItem.count({ where: { chapterId } });
    let generated = false;
    const pageRows = await db.bookletPage.findMany({ where: { chapterId } });
    const figureRows = await db.bookletFigure.findMany({ where: { chapterId } });
    const src = sourceBundle(pageRows, figureRows);
    if (!pageRows.some((p) => p.markdown.trim())) throw new Error('No transcribed text — nothing to convert');

    if (opts.force || existingItems === 0) {
      await setStage(chapterId, 'generating study content');
      const content = await generateJson(gen, [{ text: genPrompt(ch.title, src) }], contentSchema, ChapterContent, 0.4, deps.retryDelayMs);
      await saveContent(chapterId, content, gen.model);
      generated = true;
    }

    // ---- stage 4: fact-check ----------------------------------------------------
    let verification = null as z.infer<typeof VerifyResult> | null;
    if (generated || !ch.verification) {
      await setStage(chapterId, 'fact-checking against source');
      const items = await db.bookletItem.findMany({ where: { chapterId }, select: { kind: true, data: true } });
      const qs = await db.question.findMany({ where: { bookletChapterId: chapterId }, select: { stem: true, options: true, correct: true, explanation: true } });
      verification = await generateJson(
        gen,
        [
          {
            text: `You are a clinical fact-checker. Compare the STUDY CONTENT against the SOURCE. List every statement, number (dose, age, minutes, concentration), drug name or MCQ answer in the study content that is NOT supported by, or contradicts, the source. For each: quote the item, explain the problem, rate severity (high = clinical/dose/age error or wrong MCQ key), and give a fix. Return an empty list if everything is supported.\n\nSOURCE\n${src}\n\nSTUDY CONTENT\n${JSON.stringify({ items, mcqs: qs })}`
          }
        ],
        verifySchema,
        VerifyResult,
        0,
        deps.retryDelayMs
      );
    }

    await db.bookletChapter.update({
      where: { id: chapterId },
      data: {
        processStatus: 'PROCESSED',
        processStage: 'done',
        processedAt: new Date(),
        model: gen.model,
        ...(verification
          ? { verification: { issues: verification.issues.map((i) => ({ ...i, resolved: false })) } }
          : {}),
        // Any fresh generation invalidates a prior approval.
        ...(generated ? { reviewStatus: 'DRAFT' as const, publishedAt: null } : {})
      }
    });
    return { transcribedPages: missing.length, figures: newFigures.length, generated, issues: verification?.issues.length ?? null };
  } catch (e: any) {
    await db.bookletChapter.update({
      where: { id: chapterId },
      data: { processStatus: 'FAILED', processError: String(e?.message ?? e).slice(0, 500) }
    });
    throw e;
  }
}
