/**
 * One-chapter pilot: eTG PDF pages -> Gemini -> study content as JSON files.
 * NO database writes. Images are cropped to local files only (no R2 upload).
 *
 *   npx tsx scripts/pilot/etg-pilot.ts            # defaults: Local anaesthetics, pages 58-65
 *   npx tsx scripts/pilot/etg-pilot.ts --from 58 --to 65 --name local-anaesthetics
 *
 * Calls Gemini through Vertex AI using Application Default Credentials
 * (run `gcloud auth application-default login` once). Needs GOOGLE_CLOUD_PROJECT and
 * GOOGLE_CLOUD_LOCATION in .env; GEMINI_MODEL is optional. The eTG PDF has
 * no text layer, so every page is rendered to an image and read by Gemini.
 * Stages are cached under out/<name>/ so a failed run resumes where it stopped.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import sharp from 'sharp';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GoogleGenAI } from '@google/genai';

// ---- config ---------------------------------------------------------------
function loadEnv() {
  try {
    for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  } catch {}
}
loadEnv();
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const PDF = arg('pdf', 'docs/books/eTG 2025.pdf');
const FROM = Number(arg('from', '58'));
const TO = Number(arg('to', '65'));
const NAME = arg('name', 'local-anaesthetics');
const TITLE = arg('title', 'Local anaesthetics in dentistry');
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
if (!PROJECT) throw new Error('GOOGLE_CLOUD_PROJECT missing');
const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION || 'global' });
const OUT = path.join('scripts', 'pilot', 'out', NAME);
mkdirSync(path.join(OUT, 'images'), { recursive: true });

// ---- Gemini helper ---------------------------------------------------------
type Schema = Record<string, unknown>;
const S = (type: string, extra: Schema = {}): Schema => ({ type, ...extra });
const obj = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema =>
  S('OBJECT', { properties, required });
const arr = (items: Schema): Schema => S('ARRAY', { items });
const str = S('STRING');

async function gemini<T>(parts: unknown[], schema: Schema, zod: z.ZodType<T>, temperature = 0.2): Promise<T> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let text = '';
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: parts as any }],
        config: { responseMimeType: 'application/json', responseSchema: schema as any, temperature }
      });
      text = res.text ?? '';
    } catch (e: any) {
      const status = Number(e?.status ?? e?.code ?? 0);
      if (status === 429 || status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new Error(`Gemini (Vertex) error ${status || ''}: ${String(e?.message ?? e).slice(0, 400)}`);
    }
    try {
      return zod.parse(JSON.parse(text));
    } catch (e) {
      if (attempt === 4) throw new Error(`Bad JSON from Gemini: ${(e as Error).message}
${text.slice(0, 400)}`);
    }
  }
  throw new Error('Gemini retries exhausted');
}

// ---- stage 1: render pages ---------------------------------------------------
async function renderPages(): Promise<Map<number, Buffer>> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true }).promise;
  const pages = new Map<number, Buffer>();
  for (let n = FROM; n <= TO; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvasContext: canvas.getContext('2d') as any, viewport: vp, canvas: canvas as any }).promise;
    pages.set(n, canvas.toBuffer('image/png'));
  }
  return pages;
}

// ---- stage 2: per-page extraction --------------------------------------------
const PageSchema = z.object({
  printedPage: z.string(),
  markdown: z.string(),
  tables: z.array(
    z.object({ caption: z.string(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), footnotes: z.string() })
  ),
  figures: z.array(
    z.object({
      label: z.string(),
      caption: z.string(),
      meaningful: z.boolean(),
      box: z.array(z.number()).length(4) // [ymin, xmin, ymax, xmax], 0-1000
    })
  )
});
type PageData = z.infer<typeof PageSchema>;
const pageJsonSchema = obj({
  printedPage: str,
  markdown: str,
  tables: arr(obj({ caption: str, headers: arr(str), rows: arr(arr(str)), footnotes: str })),
  figures: arr(obj({ label: str, caption: str, meaningful: S('BOOLEAN'), box: arr(S('INTEGER')) }))
});
const PAGE_PROMPT = `You are transcribing one page of a clinical guideline (Therapeutic Guidelines, dental) from an image.
Return JSON only:
- printedPage: the page number printed on the page (empty string if none).
- markdown: ALL body text in reading order as Markdown (headings as #/##/###, bullets as "- "). Exclude the logo, page number, and the content of tables and figures (tables/figures go in their own fields). Transcribe exactly; never add, infer, or "fix" clinical facts, doses or ages.
- tables: every table with a caption (e.g. "Table 13.8 ..." or empty), header cells, one array per row (merge wrapped lines inside a cell with "; "), and any table notes (NB1, NB2...) in footnotes.
- figures: every figure, flowchart, diagram or photo (NOT tables, NOT the logo). label (e.g. "Figure 13.15"), caption, meaningful=true if it conveys clinical information, and box=[ymin,xmin,ymax,xmax] normalised 0-1000 around the whole figure including its title.
If the page continues a table from the previous page, still output its rows (use empty caption).`;

async function extractPages(pages: Map<number, Buffer>): Promise<Record<number, PageData>> {
  const cache = path.join(OUT, 'pages.json');
  const done: Record<number, PageData> = existsSync(cache) ? JSON.parse(readFileSync(cache, 'utf8')) : {};
  for (const [n, png] of pages) {
    if (done[n]) continue;
    console.log(`  page ${n}: extracting...`);
    done[n] = await gemini(
      [{ text: PAGE_PROMPT }, { inlineData: { mimeType: 'image/png', data: png.toString('base64') } }],
      pageJsonSchema,
      PageSchema,
      0
    );
    writeFileSync(cache, JSON.stringify(done, null, 2));
  }
  return done;
}

// ---- stage 3: crop figures ---------------------------------------------------
async function cropFigures(pages: Map<number, Buffer>, data: Record<number, PageData>) {
  const assets: { file: string; page: number; label: string; caption: string }[] = [];
  for (const [n, png] of pages) {
    const figs = data[n].figures.filter((f) => f.meaningful);
    for (let i = 0; i < figs.length; i++) {
      const [y0, x0, y1, x1] = figs[i].box.map((v) => Math.min(1000, Math.max(0, v)));
      if (y1 <= y0 || x1 <= x0) continue;
      const meta = await sharp(png).metadata();
      const W = meta.width!;
      const H = meta.height!;
      const left = Math.floor((x0 / 1000) * W);
      const top = Math.floor((y0 / 1000) * H);
      const file = `images/p${n}-fig${i + 1}.webp`;
      await sharp(png)
        .extract({
          left,
          top,
          width: Math.max(1, Math.min(W - left, Math.ceil(((x1 - x0) / 1000) * W))),
          height: Math.max(1, Math.min(H - top, Math.ceil(((y1 - y0) / 1000) * H)))
        })
        .webp({ quality: 85 })
        .toFile(path.join(OUT, file));
      assets.push({ file, page: n, label: figs[i].label, caption: figs[i].caption });
    }
  }
  return assets;
}

// ---- stage 4: study content ---------------------------------------------------
const Page = z.number().int();
const Content = z.object({
  summary: z.string(),
  notes: z.array(z.object({ heading: z.string(), bullets: z.array(z.string()), pages: z.array(Page) })),
  keyConcepts: z.array(z.object({ point: z.string(), pages: z.array(Page) })),
  tables: z.array(z.object({ title: z.string(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), pages: z.array(Page) })),
  flowchart: z.object({ title: z.string(), steps: z.array(z.object({ title: z.string(), detail: z.string() })), pages: z.array(Page) }),
  flashcards: z.array(z.object({ front: z.string(), back: z.string(), pages: z.array(Page) })),
  mcqs: z.array(
    z.object({
      stem: z.string(),
      options: z.array(z.object({ id: z.string(), text: z.string() })),
      correct: z.array(z.string()),
      explanation: z.string(),
      difficulty: z.number().int(),
      pages: z.array(Page)
    })
  )
});
type ContentT = z.infer<typeof Content>;
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

function sourceBundle(data: Record<number, PageData>, assets: { page: number; label: string; caption: string }[]) {
  return Object.entries(data)
    .map(([n, p]) => {
      const tables = p.tables
        .map((t) => `TABLE ${t.caption}\n${[t.headers, ...t.rows].map((r) => r.join(' | ')).join('\n')}\n${t.footnotes}`)
        .join('\n\n');
      const figs = assets
        .filter((a) => a.page === Number(n))
        .map((a) => `FIGURE ${a.label}: ${a.caption}`)
        .join('\n');
      return `===== PDF PAGE ${n} (printed ${p.printedPage || '?'}) =====\n${p.markdown}\n\n${tables}\n\n${figs}`;
    })
    .join('\n\n');
}

const GEN_PROMPT = (src: string) => `You are an exam-prep author for overseas dentists sitting the Australian Dental Council exam.
Using ONLY the source text below (Therapeutic Guidelines chapter "${TITLE}"), produce study content.

Rules:
- Every fact, dose, age limit, drug name and interval must be present in the source. Do not add outside knowledge. If unsure, omit it.
- Rewrite in simple, exam-focused language; do not copy long passages verbatim.
- "pages" = the PDF page numbers (the number in "PDF PAGE n") that support the item.
- summary: 4-6 sentences.
- notes: 5-8 sections following the chapter's own headings, short bullets.
- keyConcepts: 10-15 high-yield points.
- tables: reorganise comparisons into 2-4 tables (e.g. preparations by duration; maximum doses; contraindication/caution by condition). Use the source tables where applicable and keep their values exact.
- flowchart: one clinical workflow of 4-6 steps drawn from the source.
- flashcards: 20 cards, one fact each, answers under 25 words.
- mcqs: 10 single-best-answer questions, 4 options with ids "a".."d", correct = ["a"] etc., spread across the chapter, explanation says why the answer is right and cites the source fact, difficulty 1-5.

SOURCE
${src}`;

// ---- stage 5: verification ------------------------------------------------------
const Verify = z.object({
  issues: z.array(
    z.object({ item: z.string(), problem: z.string(), severity: z.enum(['high', 'medium', 'low']), suggestedFix: z.string() })
  )
});
const verifySchema = obj({
  issues: arr(
    obj({ item: str, problem: str, severity: S('STRING', { enum: ['high', 'medium', 'low'] }), suggestedFix: str })
  )
});

// ---- main -----------------------------------------------------------------------
(async () => {
  console.log(`Model ${MODEL}; pages ${FROM}-${TO}; out ${OUT}`);
  console.log('1/5 rendering pages');
  const pages = await renderPages();
  console.log('2/5 extracting pages');
  const data = await extractPages(pages);
  console.log('3/5 cropping figures');
  const assets = await cropFigures(pages, data);
  writeFileSync(path.join(OUT, 'assets.json'), JSON.stringify(assets, null, 2));
  const src = sourceBundle(data, assets);
  writeFileSync(path.join(OUT, 'source.md'), src);

  console.log('4/5 generating study content');
  const contentFile = path.join(OUT, 'content.json');
  let content: ContentT;
  if (existsSync(contentFile)) content = JSON.parse(readFileSync(contentFile, 'utf8'));
  else {
    content = await gemini([{ text: GEN_PROMPT(src) }], contentSchema, Content, 0.4);
    writeFileSync(contentFile, JSON.stringify({ chapter: TITLE, pdfPages: [FROM, TO], assets, ...content }, null, 2));
  }

  console.log('5/5 verifying against source');
  const verify = await gemini(
    [
      {
        text: `You are a clinical fact-checker. Compare the STUDY CONTENT against the SOURCE. List every statement, number (dose, age, minutes, concentration), drug name or MCQ answer in the study content that is NOT supported by, or contradicts, the source. For each: quote the item, explain the problem, rate severity (high = clinical/dose/age error or wrong MCQ key), and give a fix. Return an empty list if everything is supported.\n\nSOURCE\n${src}\n\nSTUDY CONTENT\n${JSON.stringify(content)}`
      }
    ],
    verifySchema,
    Verify,
    0
  );
  writeFileSync(path.join(OUT, 'verification.json'), JSON.stringify(verify, null, 2));

  console.log('\nDone.');
  console.log(
    `  notes ${content.notes.length}, key concepts ${content.keyConcepts.length}, tables ${content.tables.length}, ` +
      `flashcards ${content.flashcards.length}, MCQs ${content.mcqs.length}, figures ${assets.length}`
  );
  console.log(`  verification issues: ${verify.issues.length} (high: ${verify.issues.filter((i) => i.severity === 'high').length})`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
