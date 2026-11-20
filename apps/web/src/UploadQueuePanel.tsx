import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileText, LoaderCircle, RefreshCcw, Trash2, X } from 'lucide-react';
import type { DocumentQueue, QueueStatus } from './useDocumentUploadQueue';

const copy = {
  pt: {
    heading: 'Seus envios', done: 'Concluídos', allDone: 'Todos os arquivos foram processados',
    clear: 'Limpar concluídos', cancel: 'Cancelar arquivo', retry: 'Tentar novamente',
    queued: 'Aguardando envio', uploading: 'Enviando arquivo',
    analyzing: 'Processando documento', complete: 'Concluído',
    failed: 'Não foi possível concluir. Tente novamente.', canceled: 'Cancelado',
    note: 'Após o envio, você pode fechar o aplicativo. O processamento continua normalmente.'
  },
  en: {
    heading: 'Your uploads', done: 'Completed', allDone: 'All files have been processed',
    clear: 'Clear completed', cancel: 'Cancel file', retry: 'Try again',
    queued: 'Waiting to upload', uploading: 'Uploading file',
    analyzing: 'Processing document', complete: 'Completed',
    failed: 'Could not finish. Please try again.', canceled: 'Canceled',
    note: 'After upload, you can close the app. Processing will continue.'
  }
};

export default function UploadQueuePanel({ queue, language }: { queue: DocumentQueue; language: 'pt' | 'en' }) {
  const [open, setOpen] = useState(true);
  if (!queue.items.length && !queue.notice) return null;
  const t = copy[language];
  const done = queue.items.filter(item => item.status === 'done').length;
  const settled = queue.items.filter(item => ['done', 'failed', 'canceled'].includes(item.status)).length;
  const active = queue.items.some(item => ['uploading', 'analyzing'].includes(item.status));
  const status: Record<QueueStatus, string> = {
    queued: t.queued, uploading: t.uploading,
    analyzing: t.analyzing, done: t.complete, failed: t.failed, canceled: t.canceled
  };
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={t.heading}>
    <button type="button" onClick={() => setOpen(value => !value)}
      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        {active ? <LoaderCircle size={19} className="animate-spin text-brand"/> : <FileText size={19} className="text-brand"/>}
        {t.heading}</span>
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        {done}/{queue.items.length} {t.done}
        {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
      </span>
    </button>
    <div className="h-1 w-full bg-slate-100" role="progressbar"
      aria-label={t.heading} aria-valuemin={0} aria-valuemax={queue.items.length || 1} aria-valuenow={settled}>
      <div className="h-full bg-brand transition-all duration-300" style={{ width: (settled / (queue.items.length || 1) * 100) + '%' }}/>
    </div>
    {open && <div className="space-y-3 p-4 sm:p-5">
      {queue.notice && <p role="status" className="flex items-start gap-2 text-xs text-amber-700">
        <AlertCircle size={16} className="shrink-0"/>{queue.notice}</p>}
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {queue.items.map(item => {
          const working = ['uploading', 'analyzing'].includes(item.status);
          return <div key={item.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            {item.status === 'done' ? <CheckCircle2 size={19} className="shrink-0 text-emerald-600"/>
              : item.status === 'failed' ? <AlertCircle size={19} className="shrink-0 text-red-500"/>
                : working ? <LoaderCircle size={19} className="shrink-0 animate-spin text-brand"/>
                  : <Clock3 size={19} className="shrink-0 text-slate-400"/>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800" title={item.file.name}>{item.file.name}</p>
              <p className={'mt-0.5 text-[11px] ' + (item.status === 'failed' ? 'text-red-600' : 'text-slate-500')}>
                {status[item.status]}
              </p>
            </div>
            {item.status === 'queued' && <button type="button" onClick={() => queue.cancel(item.id)}
              aria-label={t.cancel} title={t.cancel}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X size={17}/></button>}
            {item.status === 'failed' && <button type="button" onClick={() => queue.retry(item.id)}
              aria-label={t.retry} title={t.retry}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-brand hover:bg-indigo-50"><RefreshCcw size={17}/></button>}
          </div>;
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] leading-5 text-slate-400">{t.note}</p>
        {queue.items.some(item => ['done', 'canceled'].includes(item.status)) && <button type="button"
          onClick={queue.clearFinished}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:text-brand">
          <Trash2 size={14}/>{t.clear}
        </button>}
      </div>
    </div>}
  </section>;
}
