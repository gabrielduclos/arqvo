// Browser-only scanner: the original File is never modified or transmitted to the OCR library.
// OCR runs in the user's browser; Tesseract downloads its engine/language data on first use.
export type ScanCrop = { x: number; y: number; width: number; height: number };
export type ScanOptions = { rotation: number; enhance: boolean; crop: ScanCrop };
export type ScanResult = { text: string; confidence: number };
export const FULL_CROP: ScanCrop = { x: 0, y: 0, width: 1, height: 1 };

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { /* Use an HTML image on browsers that do not support ImageBitmap decoding. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rotatedCanvas(source: CanvasImageSource, width: number, height: number, rotation: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const sideways = (rotation % 180) !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  return canvas;
}

async function renderImage(file: File, options: ScanOptions, maxSide: number, crop = true): Promise<HTMLCanvasElement> {
  const image = await decodeImage(file);
  try {
    const rotated = rotatedCanvas(image, image.width, image.height, options.rotation, maxSide);
    const bounds = crop ? options.crop : FULL_CROP;
    const x = Math.min(rotated.width - 1, Math.max(0, Math.floor(bounds.x * rotated.width)));
    const y = Math.min(rotated.height - 1, Math.max(0, Math.floor(bounds.y * rotated.height)));
    const w = Math.max(1, Math.min(rotated.width - x, Math.round(bounds.width * rotated.width)));
    const h = Math.max(1, Math.min(rotated.height - y, Math.round(bounds.height * rotated.height)));
    const output = document.createElement('canvas');
    output.width = w;
    output.height = h;
    const ctx = output.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('canvas_unavailable');
    if (options.enhance) ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.08)';
    ctx.drawImage(rotated, x, y, w, h, 0, 0, w, h);
    return output;
  } finally {
    if ('close' in image && typeof image.close === 'function') image.close();
  }
}

export async function scanPreview(file: File, options: ScanOptions): Promise<string> {
  const canvas = await renderImage(file, options, 1100, false);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function readScan(
  file: File, options: ScanOptions, onProgress: (percentage: number) => void
): Promise<ScanResult> {
  const canvas = await renderImage(file, options, 2600);
  // Lazy-load so ordinary navigation does not download the OCR engine.
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por+eng', 1, {
    logger: event => {
      if (event.status === 'recognizing text') {
        onProgress(Math.min(100, Math.max(0, Math.round(event.progress * 100))));
      }
    }
  });
  try {
    const { data } = await worker.recognize(canvas);
    return { text: data.text.trim().slice(0, 25000), confidence: Math.round(data.confidence) };
  } finally {
    await worker.terminate();
  }
}
