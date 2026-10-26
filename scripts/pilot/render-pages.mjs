// Renders PDF pages to PNG (the eTG PDF has no text layer, so every page is an image).
// Usage: node scripts/pilot/render-pages.mjs <pdf> <from> <to> <outDir> [scale]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const [pdfPath, from, to, outDir, scaleArg] = process.argv.slice(2);
const scale = Number(scaleArg || 2);
mkdirSync(outDir, { recursive: true });
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(pdfPath)), useSystemFonts: true }).promise;
for (let n = Number(from); n <= Number(to); n++) {
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, canvas }).promise;
  const file = path.join(outDir, `p${String(n).padStart(3, '0')}.png`);
  writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(file, canvas.width, 'x', canvas.height);
}
