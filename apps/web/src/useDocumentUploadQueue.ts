import { useEffect, useRef, useState } from 'react';
import { prepareScanImage, type ScanOptions } from './documentScanner';

export type QueueStatus = 'queued' | 'uploading' | 'analyzing' | 'done' | 'failed' | 'canceled';
export type QueueEntry = {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  documentId?: string;
  error?: string;
  signature: string;
  scanOptions?: ScanOptions;
};
type RemoteJob = {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  error?: string;
  updatedAt: string;
};
const MAX_SIZE = 20 * 1024 * 1024;
const VALID_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_QUEUE = 30;
const REMEMBER_MS = 2 * 24 * 60 * 60 * 1000;
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
  const controllers = useRef(new Map<string, AbortController>());
  const cancelRequested = useRef(new Set<string>());
  const hidden = useRef(new Set<string>());
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
  async function responseBody(response: Response) {
    return response.json().catch(() => ({})) as Promise<{
      document?: { id: string };
      queued?: boolean;
      error?: string;
    }>;
  }

  async function pollJobs() {
    try {
      const response = await fetch('/api/document-jobs', {
        credentials: 'same-origin', cache: 'no-store'
      });
      if (!response.ok) return;
      const data = await response.json() as { jobs?: RemoteJob[] };
      const recent = (Array.isArray(data.jobs) ? data.jobs : []).filter(job =>
        job && typeof job.id === 'string' && typeof job.filename === 'string' &&
        typeof job.updatedAt === 'string' &&
        Date.now() - new Date(job.updatedAt).getTime() < REMEMBER_MS &&
        !hidden.current.has(job.id)
      );
      let completed = false;
      mutate(current => {
        const next = [...current];
        for (const job of recent) {
          const status: QueueStatus =
            job.status === 'done' ? 'done' :
            job.status === 'failed' ? 'failed' : 'analyzing';
          const index = next.findIndex(entry => entry.documentId === job.id);
          if (index >= 0 && cancelRequested.current.has(next[index].id)) continue;
          if (index >= 0 && next[index].status === 'canceled') continue;
          if (index >= 0) {
            const entry = next[index];
            if (entry.status === 'done' && status === 'done') continue;
            if (entry.status !== 'done' && status === 'done') completed = true;
            next[index] = {
              ...entry, status, progress: status === 'done' ? 100 : 0,
              error: status === 'failed' ? (job.error || errorRef.current()) : undefined
            };
          } else {
            // The queue is reconstructed after reload. The original is already
            // saved in R2; we do not need the browser to retain its File object.
            next.push({
              id: 'cloud-' + job.id, documentId: job.id,
              file: new File([], job.filename), status, progress: status === 'done' ? 100 : 0,
              error: status === 'failed' ? (job.error || errorRef.current()) : undefined,
              signature: 'cloud-' + job.id
            });
            if (status === 'done') completed = true;
          }
        }
        return next;
      });
      if (completed) onUploadedRef.current();
    } catch { /* The account and files remain available if polling is offline. */ }
  }

  useEffect(() => {
    void pollJobs();
    const timer = setInterval(() => { void pollJobs(); }, 8000);
    return () => clearInterval(timer);
  }, []);

  async function process() {
    if (running.current) return;
    running.current = true;
    try {
      while (true) {
        const next = live.current.find(entry => entry.status === 'queued' && !entry.documentId);
        if (!next) break;
        const { id, file } = next;
        const controller = new AbortController();
        controllers.current.set(id, controller);
        try {
          if (cancelRequested.current.has(id)) continue;
          // The browser only transfers the file. Cloudflare Queues performs
          // OCR, field extraction and persistence after upload, even offline.
          patch(id, { status: 'uploading', progress: 0 });
          // When a user adjusted a photo, upload a separate cropped OCR image
          // together with the unchanged original. This makes the manual crop
          // effective in the cloud without losing the original document.
          let uploadBody: BodyInit = file;
          const headers: Record<string, string> = {
            'X-File-Name': encodeURIComponent(file.name)
          };
          if (next.scanOptions && file.type.startsWith('image/')) {
            try {
              const prepared = await prepareScanImage(file, next.scanOptions);
              if (prepared.size > 0 && prepared.size < 6 * 1024 * 1024) {
                const parts = new FormData();
                parts.append('original', file, file.name);
                parts.append('ocr', prepared, 'scan.jpg');
                uploadBody = parts;
              } else {
                headers['Content-Type'] = file.type;
              }
            } catch {
              headers['Content-Type'] = file.type;
            }
          } else {
            headers['Content-Type'] = file.type;
          }
          if (cancelRequested.current.has(id)) continue;
          const response = await fetch('/api/documents', {
            method: 'POST', credentials: 'same-origin',
            headers: { ...headers, 'X-Upload-Id': id },
            body: uploadBody, signal: controller.signal
          });
          const body = await responseBody(response);
          if (!response.ok || !body.document?.id) throw new Error(errorRef.current(body.error));
          if (cancelRequested.current.has(id)) {
            // The response may arrive at exactly the same moment as Cancel.
            // The server's cancellation marker prevents queue consumption.
            await fetch('/api/documents/' + body.document.id + '/cancel', {
              method: 'POST', credentials: 'same-origin'
            }).catch(() => {});
            continue;
          }
          patch(id, {
            documentId: body.document.id,
            status: body.queued ? 'analyzing' : 'failed',
            error: body.queued ? undefined :
              language === 'pt' ? 'Arquivo salvo, mas a fila não foi iniciada. Toque em tentar novamente.' :
                'File saved but queue was not started. Tap to retry.'
          });
          onUploadedRef.current();
          void pollJobs();
        } catch (cause) {
          if (!cancelRequested.current.has(id)) {
            patch(id, { status: 'failed', error: cause instanceof Error ? cause.message : errorRef.current() });
          }
        } finally {
          controllers.current.delete(id);
        }
      }
    } finally {
      running.current = false;
      if (live.current.some(entry => entry.status === 'queued' && !entry.documentId)) void process();
    }
  }

  function enqueue(files: File[], _scan?: unknown, scanOptions?: ScanOptions) {
    let invalid = 0, duplicates = 0;
    const added: QueueEntry[] = [];
    const existing = new Set(live.current.filter(item => item.status !== 'canceled').map(item => item.signature));
    const active = live.current.filter(item => item.status === 'queued' || item.status === 'uploading').length;
    for (const file of files) {
      if (!VALID_TYPES.has(file.type) || file.size < 1 || file.size > MAX_SIZE) { invalid++; continue; }
      const identity = signature(file);
      if (existing.has(identity)) { duplicates++; continue; }
      if (active + added.length >= MAX_QUEUE) { invalid++; continue; }
      existing.add(identity);
      added.push({
        id: crypto.randomUUID(), file, signature: identity,
        status: 'queued', progress: 0, scanOptions
      });
    }
    if (added.length) {
      mutate(current => [...current, ...added]);
      void process();
    }
    const messages = language === 'pt'
      ? [duplicates && duplicates + ' arquivo(s) duplicado(s) ignorado(s).', invalid && invalid + ' arquivo(s) inválido(s), grandes ou acima do limite da fila.']
      : [duplicates && duplicates + ' duplicate file(s) skipped.', invalid && invalid + ' invalid, oversized or over-limit file(s).'];
    setNotice(messages.filter(Boolean).join(' '));
    return { accepted: added.length, duplicates, invalid };
  }

  async function cancel(id: string) {
    const entry = live.current.find(item => item.id === id);
    if (!entry || !['queued', 'uploading', 'analyzing'].includes(entry.status)) return;
    if (cancelRequested.current.has(id)) return;
    cancelRequested.current.add(id);
    const previousStatus = entry.status;
    patch(id, { status: 'canceled', error: undefined });
    if (entry.documentId) hidden.current.add(entry.documentId);
    controllers.current.get(id)?.abort();
    if (previousStatus === 'queued' && !entry.documentId) return;
    try {
      if (entry.documentId) {
        const response = await fetch('/api/documents/' + entry.documentId + '/cancel', {
          method: 'POST', credentials: 'same-origin'
        });
        if (response.status === 409) {
          // A completed job cannot be canceled. Reconcile it from the server.
          cancelRequested.current.delete(id);
          hidden.current.delete(entry.documentId);
          patch(id, { status: 'done', progress: 100 });
          return;
        }
        if (!response.ok) throw new Error('cancel_failed');
      } else {
        // A file upload may still be committing on the edge despite Abort.
        // Persist the cancellation before the server enqueues any processing.
        const response = await fetch('/api/uploads/' + id + '/cancel', {
          method: 'POST', credentials: 'same-origin'
        });
        if (!response.ok) throw new Error('cancel_failed');
      }
      onUploadedRef.current();
    } catch {
      cancelRequested.current.delete(id);
      if (entry.documentId) hidden.current.delete(entry.documentId);
      patch(id, {
        status: 'failed',
        error: language === 'pt' ? 'Não foi possível cancelar. Tente novamente.' :
          'Could not cancel. Please retry.'
      });
    }
  }
  async function retry(id: string) {
    const entry = live.current.find(item => item.id === id);
    if (entry?.status !== 'failed') return;
    if (!entry.documentId) {
      patch(id, { status: 'queued', error: undefined, progress: 0 });
      void process();
      return;
    }
    patch(id, { status: 'analyzing', error: undefined, progress: 0 });
    try {
      const response = await fetch('/api/documents/' + entry.documentId + '/queue', {
        method: 'POST', credentials: 'same-origin'
      });
      if (!response.ok) {
        const body = await responseBody(response);
        throw new Error(errorRef.current(body.error));
      }
      void pollJobs();
    } catch (cause) {
      patch(id, { status: 'failed', error: cause instanceof Error ? cause.message : errorRef.current() });
    }
  }
  function clearFinished() {
    for (const entry of live.current) {
      if (entry.documentId && ['done', 'canceled'].includes(entry.status)) hidden.current.add(entry.documentId);
    }
    mutate(current => current.filter(item => !['done', 'canceled'].includes(item.status)));
    setNotice('');
  }

  return { items, notice, enqueue, cancel, retry, clearFinished };
}

export type DocumentQueue = ReturnType<typeof useDocumentUploadQueue>;
