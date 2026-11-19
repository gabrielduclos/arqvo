import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, CircleCheck, FileImage, FileText, FolderOpen, LoaderCircle, RefreshCw, Wallet } from 'lucide-react';

type Language = 'pt' | 'en';
type DocumentView = 'all' | 'month' | 'identified';
type Document = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | string;
  status: string;
  hasExtractedText?: boolean;
  merchant: string | null;
  documentDate: string | null;
  amountCents: string | number | null;
  createdAt: string;
};
const labels = {
  pt: {
    title: 'Visão geral', subtitle: 'Um resumo dos seus documentos armazenados, atualizado com dados reais da sua conta.',
    documents: 'Documentos', documentsShort: 'Total', identified: 'Dados identificados', identifiedShort: 'Identificados', incomplete: 'Pendentes ou parciais',
    amount: 'Valores identificados', amountNote: 'Soma dos valores reconhecidos; não representa necessariamente seus gastos.',
    thisMonth: 'Arquivos enviados neste mês', thisMonthShort: 'Este mês', filterHint: 'Ver documentos filtrados', recent: 'Documentos recentes', noDocs: 'Você ainda não adicionou documentos.',
    noDocsDescription: 'Envie seu primeiro comprovante, recibo ou nota fiscal para começar.',
    seeAll: 'Ver documentos', retry: 'Tentar novamente', failed: 'Não foi possível carregar seu resumo.',
    identifiedHint: 'Com metadados reconhecidos', incompleteHint: 'Sem informações suficientes', month: 'Este mês',
    fieldNone: 'Dados ainda não identificados', processed: 'Dados identificados', partial: 'Identificação parcial', pending: 'Aguardando análise',
    privacy: 'Somente documentos da sua conta são incluídos neste painel.',

  },
  en: {
    title: 'Overview', subtitle: 'A summary of your own stored documents, calculated from actual account data.',
    documents: 'Documents', documentsShort: 'Total', identified: 'Data identified', identifiedShort: 'Identified', incomplete: 'Pending or partial',
    amount: 'Identified amounts', amountNote: 'Sum of recognized amounts; not necessarily your actual spending.',
    thisMonth: 'Files added this month', thisMonthShort: 'This month', filterHint: 'Show filtered documents', recent: 'Recent documents', noDocs: 'No documents yet.',
    noDocsDescription: 'Add your first receipt, invoice or payment record to get started.',
    add: 'Add document', seeAll: 'Browse documents', retry: 'Try again', failed: 'Could not load your document summary.',
    identifiedHint: 'With recognized metadata', incompleteHint: 'Without sufficient details', month: 'This month',
    fieldNone: 'Data not yet identified', processed: 'Data identified', partial: 'Partial identification', pending: 'Waiting for analysis',
    privacy: 'This overview only includes documents owned by your account.',

  }
};

export default function OverviewPanel({ language, onOpenDocuments }: {
  language: Language;
  onOpenDocuments: (view?: DocumentView) => void;
}) {
  const t = labels[language];
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    fetch('/api/documents', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('documents_unavailable'); return response.json(); })
      .then(body => {
        if (!controller.signal.aborted) {
          setDocs(Array.isArray(body.documents) ? body.documents : []);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const overview = useMemo(() => {
    const today = new Date();
    const month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const identified = docs.filter(d => d.status === 'ready').length;
    const partial = docs.filter(d => d.status !== 'ready').length;
    const countThisMonth = docs.filter(d => typeof d.createdAt === 'string' && d.createdAt.slice(0, 7) === month).length;
    const valued = docs.filter(d => d.amountCents !== null && d.amountCents !== undefined && Number.isFinite(Number(d.amountCents)));
    const cents = valued.reduce((sum, d) => sum + Number(d.amountCents), 0);
    return { identified, partial, countThisMonth, valuedCount: valued.length, cents };
  }, [docs]);

  const money = new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: 'BRL' });
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.valueOf())
      ? new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
      : '—';
  };
  const status = (doc: Document) => {
    if (doc.status === 'ready') return { text: t.processed, tone: 'text-emerald-700 bg-emerald-50' };
    if (doc.merchant || doc.documentDate || doc.amountCents != null) return { text: t.partial, tone: 'text-amber-700 bg-amber-50' };
    if (doc.hasExtractedText) return { text: t.fieldNone, tone: 'text-amber-700 bg-amber-50' };
    return { text: t.pending, tone: 'text-slate-500 bg-slate-100' };
  };

  return <section className="space-y-5 sm:space-y-7">
    <header className="pb-1">
      <h1 className="text-[27px] font-semibold tracking-tight text-ink sm:text-3xl">{t.title}</h1>
    </header>

    {loading ? <div role="status" className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle className="animate-spin text-brand" size={27}/></div>
      : error ? <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-600">{t.failed}</p><button onClick={() => setReload(v => v + 1)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"><RefreshCw size={15}/>{t.retry}</button></div>
      : <>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: t.documents, short: t.documentsShort, value: String(docs.length).padStart(2, '0'), hint: t.privacy, icon: FileText, view: 'all' },
            { label: t.thisMonth, short: t.thisMonthShort, value: String(overview.countThisMonth).padStart(2, '0'), hint: t.month, icon: CalendarDays, view: 'month' },
            { label: t.identified, short: t.identifiedShort, value: String(overview.identified).padStart(2, '0'), hint: t.identifiedHint, icon: CircleCheck, view: 'identified' }
          ].map(({label, short, value, hint, icon: Icon, view}) => (
            <button type="button" key={view} onClick={() => onOpenDocuments(view as DocumentView)}
              aria-label={label + ': ' + value + '. ' + t.filterHint}
              title={hint}
              className="group flex min-h-[135px] min-w-0 flex-col items-start rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors transition-transform hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] sm:min-h-[160px] sm:p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand sm:size-10"><Icon size={19}/></span>
              <span className="mt-3 block min-h-8 text-[11px] font-medium leading-4 text-slate-500 sm:mt-4 sm:min-h-0 sm:text-sm">
                <span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span>
              </span>
              <span className="mt-1 flex w-full items-center justify-between gap-1 text-[25px] font-semibold leading-none tracking-tight tabular-nums text-ink sm:mt-2 sm:text-3xl">
                {value}<ArrowUpRight size={15} className="shrink-0 text-indigo-300 transition-colors group-hover:text-brand" aria-hidden="true"/>
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-brand"><Wallet size={20}/></span>
            <div><h2 className="text-sm font-semibold">{t.amount}</h2><p className="mt-1 text-xs text-slate-400">{overview.valuedCount} / {docs.length} {t.documents.toLowerCase()} · {overview.partial} {t.incomplete.toLowerCase()}</p></div>
          </div>
          <p className="mt-4 break-words text-[28px] font-semibold tracking-tight tabular-nums sm:text-3xl">{money.format(overview.cents / 100)}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.amountNote}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
            <h2 className="text-lg font-semibold">{t.recent}</h2>
            <button onClick={() => onOpenDocuments('all')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">{t.seeAll}<ArrowRight size={16}/></button>
          </div>
          {!docs.length ? <div className="px-5 py-12 text-center sm:px-6 sm:py-14">
            <FolderOpen className="mx-auto text-indigo-300" size={35}/>
            <h3 className="mt-3 text-sm font-semibold">{t.noDocs}</h3>
            <p className="mt-1 text-sm text-slate-500">{t.noDocsDescription}</p>
          </div> : docs.slice(0, 5).map((doc, i) => <button key={doc.id} onClick={() => onOpenDocuments('all')}
            className={'flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition sm:gap-4 sm:px-5 hover:bg-indigo-50/60 ' + (i ? 'border-t border-slate-100' : '')}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand">{doc.mimeType === 'application/pdf' ? <FileText size={21}/> : <FileImage size={21}/>}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{doc.filename}</span><span className="mt-1 block truncate text-xs text-slate-500">{doc.merchant || date(doc.createdAt)}</span></span>
            <span className={'hidden shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold sm:inline-flex ' + status(doc).tone}>{status(doc).text}</span>
            <span className="max-w-[95px] shrink-0 text-right text-xs font-semibold tabular-nums sm:max-w-none sm:text-sm">{doc.amountCents === null || doc.amountCents === undefined ? '—' : money.format(Number(doc.amountCents) / 100)}</span>
            <ArrowRight size={17} className="hidden shrink-0 text-slate-300 sm:block"/>
          </button>)}
        </div>
        <p className="text-xs text-slate-400">{t.privacy}</p>
      </>}
  </section>;
}
