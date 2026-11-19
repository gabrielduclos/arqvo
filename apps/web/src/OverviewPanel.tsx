import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CircleCheck, FileImage, FileText, FolderOpen, LoaderCircle, RefreshCw, Sparkles, Wallet } from 'lucide-react';

type Language = 'pt' | 'en';
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
    tag: 'Painel de documentos', title: 'Visão geral', subtitle: 'Um resumo dos seus documentos armazenados, atualizado com dados reais da sua conta.',
    documents: 'Documentos', identified: 'Dados identificados', incomplete: 'Pendentes ou parciais',
    amount: 'Valores identificados', amountNote: 'Soma dos valores reconhecidos; não representa necessariamente seus gastos.',
    thisMonth: 'Arquivos enviados neste mês', recent: 'Documentos recentes', noDocs: 'Você ainda não adicionou documentos.',
    noDocsDescription: 'Envie seu primeiro comprovante, recibo ou nota fiscal para começar.',
    add: 'Adicionar documento', seeAll: 'Ver documentos', retry: 'Tentar novamente', failed: 'Não foi possível carregar seu resumo.',
    identifiedHint: 'Com metadados reconhecidos', incompleteHint: 'Sem informações suficientes', month: 'Este mês',
    fieldNone: 'Dados ainda não identificados', processed: 'Dados identificados', partial: 'Identificação parcial', pending: 'Aguardando análise',
    privacy: 'Somente documentos da sua conta são incluídos neste painel.',
    ai: 'Extração automática', aiDesc: 'Ao enviar um arquivo na seção Documentos, a IA tenta reconhecer estabelecimento, data e valor.'
  },
  en: {
    tag: 'Documents dashboard', title: 'Overview', subtitle: 'A summary of your own stored documents, calculated from actual account data.',
    documents: 'Documents', identified: 'Data identified', incomplete: 'Pending or partial',
    amount: 'Identified amounts', amountNote: 'Sum of recognized amounts; not necessarily your actual spending.',
    thisMonth: 'Files added this month', recent: 'Recent documents', noDocs: 'No documents yet.',
    noDocsDescription: 'Add your first receipt, invoice or payment record to get started.',
    add: 'Add document', seeAll: 'Browse documents', retry: 'Try again', failed: 'Could not load your document summary.',
    identifiedHint: 'With recognized metadata', incompleteHint: 'Without sufficient details', month: 'This month',
    fieldNone: 'Data not yet identified', processed: 'Data identified', partial: 'Partial identification', pending: 'Waiting for analysis',
    privacy: 'This overview only includes documents owned by your account.',
    ai: 'Automatic extraction', aiDesc: 'When you upload a file in Documents, AI attempts to recognize the merchant, date and amount.'
  }
};

export default function OverviewPanel({ language, onOpenDocuments }: {
  language: Language;
  onOpenDocuments: () => void;
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

  return <section className="space-y-8">
    <div className="relative overflow-hidden rounded-[28px] bg-[#201d42] px-7 py-9 text-white sm:px-10 sm:py-12">
      <div className="absolute -right-12 -top-24 size-64 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden="true"/>
      <div className="absolute -bottom-24 right-28 size-56 rounded-full bg-violet-400/20 blur-3xl" aria-hidden="true"/>
      <div className="relative z-10 max-w-[590px]">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"><Sparkles size={14}/>{t.tag}</span>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-[44px]">{t.title}</h1>
        <p className="mt-4 max-w-[460px] text-sm leading-relaxed text-indigo-100/85 sm:text-base">{t.subtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button onClick={onOpenDocuments} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#28224c] transition hover:bg-indigo-50"><FolderOpen size={17}/>{t.seeAll}</button>
          <button onClick={onOpenDocuments} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><ArrowRight size={17}/>{t.add}</button>
        </div>
      </div>
    </div>

    {loading ? <div role="status" className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle className="animate-spin text-brand" size={27}/></div>
      : error ? <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-600">{t.failed}</p><button onClick={() => setReload(v => v + 1)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"><RefreshCw size={15}/>{t.retry}</button></div>
      : <>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t.documents, value: String(docs.length).padStart(2, '0'), hint: t.privacy, icon: FileText },
            { label: t.thisMonth, value: String(overview.countThisMonth).padStart(2, '0'), hint: t.month, icon: CalendarDays },
            { label: t.identified, value: String(overview.identified).padStart(2, '0'), hint: t.identifiedHint, icon: CircleCheck }
          ].map(({label, value, hint, icon: Icon}) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-brand"><Icon size={20}/></span>
            <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p>
          </div>)}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-brand"><Wallet size={20}/></span>
              <div><h2 className="text-sm font-semibold">{t.amount}</h2><p className="mt-1 text-xs text-slate-400">{overview.valuedCount} / {docs.length} {t.documents.toLowerCase()} · {overview.partial} {t.incomplete.toLowerCase()}</p></div>
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{money.format(overview.cents / 100)}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.amountNote}</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand"><Sparkles size={20}/></span>
            <h2 className="mt-4 text-sm font-semibold">{t.ai}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t.aiDesc}</p>
            <button onClick={onOpenDocuments} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">{t.seeAll}<ArrowRight size={16}/></button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold">{t.recent}</h2>
            <button onClick={onOpenDocuments} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">{t.seeAll}<ArrowRight size={16}/></button>
          </div>
          {!docs.length ? <div className="px-6 py-14 text-center">
            <FolderOpen className="mx-auto text-indigo-300" size={35}/>
            <h3 className="mt-3 text-sm font-semibold">{t.noDocs}</h3>
            <p className="mt-1 text-sm text-slate-500">{t.noDocsDescription}</p>
          </div> : docs.slice(0, 5).map((doc, i) => <button key={doc.id} onClick={onOpenDocuments}
            className={'flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-indigo-50/60 ' + (i ? 'border-t border-slate-100' : '')}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand">{doc.mimeType === 'application/pdf' ? <FileText size={21}/> : <FileImage size={21}/>}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{doc.filename}</span><span className="mt-1 block truncate text-xs text-slate-500">{doc.merchant || date(doc.createdAt)}</span></span>
            <span className={'hidden shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold sm:inline-flex ' + status(doc).tone}>{status(doc).text}</span>
            <span className="shrink-0 text-right text-sm font-semibold">{doc.amountCents === null || doc.amountCents === undefined ? '—' : money.format(Number(doc.amountCents) / 100)}</span>
            <ArrowRight size={17} className="shrink-0 text-slate-300"/>
          </button>)}
        </div>
        <p className="text-xs text-slate-400">{t.privacy}</p>
      </>}
  </section>;
}
