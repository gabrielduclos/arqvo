import { useRef, useState } from 'react';
import { FULL_CROP, readScan, scanPreview } from './documentScanner';

export type LocalScan = { text: string; confidence: number };
export type QueueStatus = 'queued' | 'scanning' | 'uploading' | 'analyzing' | 'done' | 'failed' | 'canceled';
export type QueueEntry = {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  scan?: LocalScan;
  documentId?: string;
  error?: string;
  signature: string;
};
const MAX_SIZE = 20 * 1024 * 1024;
const VALID_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_QUEUE = 30;
const signature = (file: File) => [file.name, file.size, file.type, file.lastModified].join(':');

export function useDocumentUploadQueue(
  language: 'pt' | 'en',
  onDocumentUploaded: () => void,
  translateError: (code?: string) => string
) {
  const [items, setItems] = useState<QueueEntry[]>([]);
  const [notice, setNotice] = useState('');
  const live = useRef<QueueEntry[]>([]);
  const running = useRef(false);
  const onUploadedRef = useRef(onDocumentUploaded);
  const errorRef = useRef(translateError);
  onUploadedRef.current = onDocumentUploaded;
  errorRef.current = translateError;

  function mutate(update: (current: QueueEntry[]) => QueueEntry[]) {
    live.current = update(live.current);
    setItems(live.current);
  }
  function patch(id: string, values: Partial<QueueEntry>) {
    mutate(current => current.map(entry => entry.id === id ? { ...entry, ...values } : entry));
  }
  async function jsonResponse(response: Response) {
    return response.json().catch(() => ({})) as Promise<{ document?: {id: string}; error?: string }>;
  }

  async function process() {
    if (running.current) return;
    running.current = true;
    try {
      while (true) {
        const next = live.current.find(entry => entry.status === 'queued');
        if (!next) break;
        const { id, file } = next;
        let documentId = next.documentId;
        let scan = next.scan;
        try {
          if (!scan && file.type.startsWith('image/')) {
            patch(id, { status: 'scanning', progress: 0 });
            try {
              const preview = await scanPreview(file, { rotation: 0, enhance: true, crop: FULL_CROP });
              const extracted = await readScan(file, {
                rotation: 0, enhance: true, crop: preview.suggestedCrop ?? FULL_CROP
              }, percentage => patch(id, { progress: percentage }));
              scan = { text: extracted.text, confidence: extracted.confidence };
            } catch {
              // On-device OCR is optional: AI vision can still read an uploaded photo.
              scan = { text: '', confidence: 0 };
            }
            patch(id, { scan, progress: 100 });
          }

          if (!documentId) {
            patch(id, { status: 'uploading', progress: 0 });
            const response = await fetch('/api/documents', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
              body: file, signal: AbortSignal.timeout(90000)
            });
            const body = await jsonResponse(response);
            if (!response.ok || !body.document?.id) throw new Error(errorRef.current(body.error));
            documentId = body.document.id;
            patch(id, { documentId });
            onUploadedRef.current();
          }

          patch(id, { status: 'analyzing', progress: 0 });
          const endpoint = '/api/documents/' + encodeURIComponent(documentId) + (scan ? '/scan' : '/analyze');
          let analysis: Response | null = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            analysis = await fetch(endpoint, {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(scan ?? {}), signal: AbortSignal.timeout(90000)
            });
            if (analysis.ok || ![502, 503, 504].includes(analysis.status)) break;
          }
          if (!analysis) throw new Error(errorRef.current());
          const result = await jsonResponse(analysis);
          if (!analysis.ok) throw new Error(errorRef.current(result.error));
          patch(id, { status: 'done', progress: 100, error: undefined });
          onUploadedRef.current();
        } catch (cause) {
          patch(id, { status: 'failed', error: cause instanceof Error ? cause.message : errorRef.current() });
          if (documentId) onUploadedRef.current();
        }
      }
    } finally {
      running.current = false;
      if (live.current.some(entry => entry.status === 'queued')) void process();
    }
  }

  function enqueue(files: File[], scan?: LocalScan) {
    let invalid = 0, duplicates = 0, accepted = 0;
    const added: QueueEntry[] = [];
    const existing = new Set(live.current.filter(entry => entry.status !== 'canceled').map(entry => entry.signature));
    for (const file of files) {
      if (!VALID_TYPES.has(file.type) || file.size < 1 || file.size > MAX_SIZE) { invalid++; continue; }
      const identity = signature(file);
      if (existing.has(identity)) { duplicates++; continue; }
      if (live.current.filter(entry => entry.status !== 'canceled').length + added.length >= MAX_QUEUE) {
        invalid++; continue;
      }
      existing.add(identity);
      added.push({ id: crypto.randomUUID(), file, signature: identity, scan, status: 'queued', progress: 0 });
      accepted++;
    }
    if (added.length) {
      mutate(current => [...current, ...added]);
      void process();
    }
    const messages = language === 'pt'
      ? [duplicates && duplicates + ' arquivo(s) duplicado(s) ignorado(s).', invalid && invalid + ' arquivo(s) inválido(s), grandes ou acima do limite da fila.']
      : [duplicates && duplicates + ' duplicate file(s) skipped.', invalid && invalid + ' invalid, oversized, or over-limit file(s).'];
    setNotice(messages.filter(Boolean).join(' '));
    return { accepted, duplicates, invalid };
  }

  function cancel(id: string) {
    const entry = live.current.find(item => item.id === id);
    if (entry?.status === 'queued') patch(id, { status: 'canceled' });
  }
  function retry(id: string) {
    const entry = live.current.find(item => item.id === id);
    if (entry?.status !== 'failed') return;
    patch(id, { status: 'queued', error: undefined, progress: 0 });
    void process();
  }
  function clearFinished() {
    mutate(current => current.filter(item => !['done', 'canceled'].includes(item.status)));
    setNotice('');
  }

  return { items, notice, enqueue, cancel, retry, clearFinished };
}

export type DocumentQueue = ReturnType<typeof useDocumentUploadQueue>;
