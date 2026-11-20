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

// Suggest a crop only if a large, clearly contrasting page stands out from
// the corner background. On ambiguous images leave the full frame intact.
function suggestDocumentCrop(canvas: HTMLCanvasElement): ScanCrop | null {
  // Downsample for a cheap, on-device page segmentation pass. A white receipt
  // against a desk is normally one contiguous, high-luminance region. We
  // deliberately abstain when the document and background are too similar.
  const w = canvas.width, h = canvas.height;
  if (w < 90 || h < 90) return null;
  const scale = Math.min(1, 200 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(canvas, 0, 0, sw, sh);
  const pixels = ctx.getImageData(0, 0, sw, sh).data;
  const rgb = (x: number, y: number): [number, number, number] => {
    const i = (Math.min(sh - 1, y) * sw + Math.min(sw - 1, x)) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };
  const corners = [
    rgb(2, 2), rgb(sw - 3, 2), rgb(2, sh - 3), rgb(sw - 3, sh - 3)
  ];
  // Median resists stray objects in a corner of the photograph.
  const background = [0, 1, 2].map(channel =>
    corners.map(color => color[channel]).sort((a, b) => a - b).slice(1, 3)
      .reduce((a, b) => a + b, 0) / 2
  );
  const brightness = (r: number, g: number, b: number) => r * .299 + g * .587 + b * .114;
  const baseLight = brightness(background[0], background[1], background[2]);
  const minimumLight = Math.max(145, baseLight + 28);
  const mask = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const [r, g, b] = rgb(x, y);
      const difference = (Math.abs(r - background[0]) + Math.abs(g - background[1]) + Math.abs(b - background[2])) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness(r, g, b) >= minimumLight && difference >= 33 && chroma < 115) {
        mask[y * sw + x] = 1;
      }
    }
  }

  // Choose the largest contiguous page-like component, rather than bounding
  // every visually different pixel (which often includes the desk itself).
  const seen = new Uint8Array(sw * sh);
  let best: { minX: number; minY: number; maxX: number; maxY: number; area: number; score: number } | null = null;
  const directions = [-1, 1, -sw, sw];
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index] || seen[index]) continue;
    const todo: number[] = [index];
    seen[index] = 1;
    let head = 0, minX = sw, minY = sh, maxX = 0, maxY = 0, area = 0;
    while (head < todo.length) {
      const current = todo[head++];
      const x = current % sw;
      const y = Math.floor(current / sw);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      area++;
      for (const direction of directions) {
        if (direction === -1 && x === 0 || direction === 1 && x === sw - 1 ||
            direction === -sw && y === 0 || direction === sw && y === sh - 1) continue;
        const neighbor = current + direction;
        if (mask[neighbor] && !seen[neighbor]) {
          seen[neighbor] = 1;
          todo.push(neighbor);
        }
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const frameArea = bw * bh;
    if (bw < sw * .30 || bh < sh * .30 || frameArea < sw * sh * .09 ||
        frameArea > sw * sh * .95 || area / frameArea < .22) continue;
    const centerX = (minX + maxX) / 2 / sw;
    const centerY = (minY + maxY) / 2 / sh;
    const centrality = Math.max(.2, 1 - Math.abs(centerX - .5) - Math.abs(centerY - .5));
    const score = area * centrality;
    if (!best || score > best.score) best = { minX, minY, maxX, maxY, area, score };
  }
  if (!best) return null;
  const bounds = best as { minX: number; minY: number; maxX: number; maxY: number };
  const padX = Math.max(2, Math.round(sw * .014));
  const padY = Math.max(2, Math.round(sh * .014));
  const left = Math.max(0, bounds.minX - padX) / sw;
  const top = Math.max(0, bounds.minY - padY) / sh;
  const right = Math.min(sw, bounds.maxX + padX + 1) / sw;
  const bottom = Math.min(sh, bounds.maxY + padY + 1) / sh;
  if (right - left > .97 && bottom - top > .97) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export async function scanPreview(file: File, options: ScanOptions): Promise<{ src: string; suggestedCrop: ScanCrop | null }> {
  const canvas = await renderImage(file, options, 1100, false);
  return { src: canvas.toDataURL('image/jpeg', 0.82), suggestedCrop: suggestDocumentCrop(canvas) };
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
