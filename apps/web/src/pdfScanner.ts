/**
 * Read PDF pages locally before cloud classification.
 * Text PDFs are read from their embedded text layer; image-only pages use OCR
 * rendered inside the browser. The original PDF is never modified.
 */
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ScanResult } from './documentScanner';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_TEXT = 25000;
const PDF_RENDER_SIDE = 2200;

export async function readPdfScan(
  file: File,
  onProgress: (percentage: number) => void
): Promise<ScanResult> {
  const loading = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true
  });
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null;
  try {
    const pdf = await loading.promise;
    const pages = Math.max(1, pdf.numPages);
    const collected: string[] = [];
    let ocrConfidence = 0;
    let ocrPages = 0;
    for (let index = 1; index <= pages; index++) {
      if (collected.join('\n').length >= MAX_TEXT) break;
      const page = await pdf.getPage(index);
      try {
        const content = await page.getTextContent();
        const nativeText = content.items.map(item => 'str' in item ? item.str : '').join(' ').trim();
        let pageText = nativeText;
        // Image-based PDFs have little or no selectable text. OCR the page,
        // while preserving any native text where useful for proper names.
        if (nativeText.length < 100) {
          const viewportAtOne = page.getViewport({ scale: 1 });
          const scale = Math.min(2, PDF_RENDER_SIDE / Math.max(viewportAtOne.width, viewportAtOne.height));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('pdf_canvas_unavailable');
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (!worker) {
            const { createWorker } = await import('tesseract.js');
            worker = await createWorker('por+eng', 1, {
              logger: event => {
                if (event.status === 'recognizing text') {
                  onProgress(Math.min(99, Math.round(((index - 1) + event.progress) / pages * 100)));
                }
              }
            });
          }
          const { data } = await worker.recognize(canvas);
          const ocrText = data.text.trim();
          pageText = nativeText.length >= 15 ? nativeText + '\n' + ocrText : ocrText;
          if (ocrText) {
            ocrConfidence += data.confidence;
            ocrPages++;
          }
          canvas.width = 0;
          canvas.height = 0;
        }
        if (pageText) collected.push('Página ' + index + '\n' + pageText);
        onProgress(Math.round(index / pages * 100));
      } finally {
        page.cleanup();
      }
    }
    await pdf.destroy();
    const text = collected.join('\n\n').slice(0, MAX_TEXT).trim();
    const confidence = ocrPages ? Math.round(ocrConfidence / ocrPages) : text.length >= 30 ? 95 : 0;
    return { text, confidence };
  } finally {
    if (worker) await worker.terminate();
    await loading.destroy().catch(() => {});
  }
}
