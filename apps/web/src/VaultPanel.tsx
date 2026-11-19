import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle, ArrowDownToLine, ArrowRight, CheckCircle2,
  FileImage, FilePlus2, FileText, FolderOpen, LoaderCircle,
  LockKeyhole, Search, ShieldCheck, Sparkles, Trash2, X
} from 'lucide-react';

type Language = 'pt' | 'en';
type Document = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | string;
  status: 'uploaded' | 'ready' | 'failed';
  merchant: string | null;
  documentDate: string | null;
  amountCents: string | number | null;
  currency?: string;
  createdAt: string;
};
type Result = { documents?: Document[]; document?: Document; error?: string; aiUsed?: boolean; note?: string };

const words = {
  pt: {
    title: 'Meus arquivos', intro: 'Aqui ficam os seus documentos reais, privados e vinculados à sua conta.',
    upload: 'Adicionar documento', drop: 'Escolha um PDF ou imagem', formats: 'PDF, JPG, PNG ou WebP · até 8 MB · máximo de 100 arquivos',
    processing: 'Enviando…', analyzeAfter: 'Analisar com IA depois do upload', aiConsent: 'Ao selecionar, autorizo o processamento do conteúdo pela Cloudflare Workers AI. A extração pode conter erros.',
    docs: 'Documentos armazenados', documentsCount: 'arquivos', empty: 'Nenhum documento enviado ainda.', emptySub: 'Adicione seu primeiro documento para começar.',
    query: 'Pesquisar por nome, estabelecimento ou texto', queryPlaceholder: 'Ex.: farmácia, supermercado, garantia',
    find: 'Buscar', all: 'Todos', reset: 'Limpar busca', aiQuestion: 'Pergunte à IA sobre seus documentos',
    aiPlaceholder: 'Ex.: notas da farmácia acima de 100 reais', askAI: 'Pesquisar com IA',
    searchAIInfo: 'A IA interpreta sua pergunta, mas os resultados vêm apenas dos seus documentos. A pergunta é enviada à Cloudflare AI.',
    searching: 'Pesquisando…', scanned: 'Analisado', pending: 'Ainda não analisado',
    analyze: 'Extrair dados com IA', analyzing: 'Extraindo…', download: 'Baixar original', preview: 'Visualizar arquivo',
    delete: 'Excluir', confirmDelete: 'Excluir permanentemente este documento? Esta ação não pode ser desfeita.',
    error: 'Não foi possível concluir a operação. Tente novamente.',
    unauthorized: 'Sessão inválida ou e-mail não confirmado. Faça login novamente.',
    aiLimit: 'Seu limite diário de IA foi atingido ou o serviço está indisponível. O arquivo continua salvo.',
    large: 'Arquivo muito grande. O limite é 8 MB.', type: 'Formato não aceito. Envie PDF, JPG, PNG ou WebP.',
    saved: 'Arquivo guardado com segurança.', extracted: 'Extração concluída. Confira as informações no arquivo original.',
    note: 'Valores extraídos por IA são sugestões e devem ser conferidos.', noResults: 'Nenhum documento encontrado.',
    merchant: 'Estabelecimento', amount: 'Valor', date: 'Data', format: 'Formato',
    source: 'Arquivo original', close: 'Fechar', selected: 'Detalhes do documento',
    personal: 'Privado · somente sua conta', noAI: 'A análise é opcional e pode ser feita depois.',
    billing: 'IA limitada a 8 operações por conta por dia, com limite global de proteção.',
    back: 'Voltar', aiFallback: 'A IA não conseguiu interpretar os filtros. Busca textual utilizada.',
    notYet: 'Ainda não foi possível identificar dados estruturados.',
    clear: 'Limpar', aiOn: 'Busca interpretada por IA', remove: 'Excluir documento',
    original: 'O arquivo original é preservado sem alterações.',
    confirmAI: 'Enviar este documento para análise pela Cloudflare Workers AI? Os resultados podem conter erros.',
    privacy: 'Privacidade e tratamento dos dados',
    betaWarning: 'Versão beta. Evite documentos altamente sensíveis até a revisão de segurança.'
  },
  en: {
    title: 'My files', intro: 'Your real, private documents are stored here and linked only to your account.',
    upload: 'Add a document', drop: 'Choose a PDF or image', formats: 'PDF, JPG, PNG, WebP · up to 8 MB · maximum 100 files',
    processing: 'Uploading…', analyzeAfter: 'Analyze with AI after upload', aiConsent: 'By selecting this, I authorize Cloudflare Workers AI to process the file content. Results may be inaccurate.',
    docs: 'Stored documents', documentsCount: 'files', empty: 'No documents uploaded yet.', emptySub: 'Add your first document to get started.',
    query: 'Search by name, merchant or extracted text', queryPlaceholder: 'e.g., pharmacy, supermarket, warranty',
    find: 'Search', all: 'All', reset: 'Clear search', aiQuestion: 'Ask AI about your documents',
    aiPlaceholder: 'e.g., pharmacy invoices over R$ 100', askAI: 'AI search',
    searchAIInfo: 'AI interprets your question, but matches come only from your documents. Your question is sent to Cloudflare AI.',
    searching: 'Searching…', scanned: 'Analyzed', pending: 'Not yet analyzed',
    analyze: 'Extract with AI', analyzing: 'Extracting…', download: 'Download original', preview: 'Preview file',
    delete: 'Delete', confirmDelete: 'Permanently delete this document? This cannot be undone.',
    error: 'Unable to complete the operation. Please retry.',
    unauthorized: 'Invalid session or unverified email. Sign in again.',
    aiLimit: 'Your daily AI quota has been reached or the service is unavailable. Your file remains saved.',
    large: 'File is too large. Maximum is 8 MB.', type: 'Unsupported file. Choose PDF, JPG, PNG or WebP.',
    saved: 'File stored securely.', extracted: 'Analysis finished. Please verify the information against the original.',
    note: 'AI-extracted values are suggestions that must be checked.', noResults: 'No documents found.',
    merchant: 'Merchant', amount: 'Amount', date: 'Date', format: 'Format',
    source: 'Original file', close: 'Close', selected: 'Document details',
    personal: 'Private · only your account', noAI: 'AI analysis is optional and can be done later.',
    billing: 'AI limited to 8 actions per account per day, with a global safeguard.',
    back: 'Back', aiFallback: 'AI could not interpret filters. Text search was used.',
    notYet: 'Structured fields have not been identified yet.',
    clear: 'Clear', aiOn: 'AI-interpreted search', remove: 'Delete document',
    original: 'The original file is preserved unchanged.',
    confirmAI: 'Send this document to Cloudflare Workers AI for analysis? Results may be inaccurate.',
    privacy: 'Privacy and data handling',
    betaWarning: 'Beta version. Avoid highly sensitive documents until the security review.'
  }
};
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function parse(response: Response): Promise<Result> {
  const result = await response.json().catch(() => ({}));
  return result && typeof result === 'object' ? result as Result : {};
}

export default function VaultPanel({ language, email }: { language: Language; email: string }) {
  const t = words[language];
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [busy, setBusy] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Document | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiSearch, setAiSearch] = useState(false);
  const [aiOptIn, setAiOptIn] = useState(false);
  const [mode, setMode] = useState<'all' | 'keyword' | 'ai'>('all');
  const [loading, setLoading] = useState(true);

  const date = (raw: string | null) => {
    if (!raw) return '—';
    const x = raw.slice(0, 10);
    const parts = x.split('-');
    return parts.length === 3 ? [parts[2], parts[1], parts[0]].join('/') : x;
  };
  const money = (cents: Document['amountCents']) =>
    cents === null || cents === undefined ? '—' : new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', {
      style: 'currency', currency: 'BRL'
    }).format(Number(cents) / 100);
  const size = (value: number | string) => (Number(value) / 1024 / 1024).toFixed(2) + ' MB';
  const fileLink = (id: string, download = false) => '/api/documents/' + encodeURIComponent(id) + '/file' + (download ? '?download=1' : '');

  const problem = (code?: string) => {
    if (code === 'unauthorized') return t.unauthorized;
    if (code === 'file_too_large_or_empty' || code === 'file_too_large_for_ai') return t.large;
    if (code === 'unsupported_file') return t.type;
    if (code === 'ai_daily_limit_or_unavailable' || code === 'ai_daily_limit') return t.aiLimit;
    return t.error;
  };
  async function refresh(q = '') {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/documents' + (q ? '?q=' + encodeURIComponent(q) : ''), {
        credentials: 'same-origin', cache: 'no-store'
      });
      const body = await parse(response);
      if (!response.ok) throw new Error(problem(body.error));
      setDocs(body.documents || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, [email]);

  async function analyze(id: string) {
    if (!aiOptIn && !window.confirm(t.confirmAI)) return;
    setWorkingId(id);
    setError('');
    try {
      const response = await fetch('/api/documents/' + id + '/analyze', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
        signal: AbortSignal.timeout(90000)
      });
      const body = await parse(response);
      if (!response.ok) throw new Error(problem(body.error));
      setMessage(t.extracted);
      await refresh();
      if (selected?.id === id && body.document) setSelected(body.document);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setWorkingId(null);
    }
  }

  async function upload(file: File) {
    if (busy) return;
    setError(''); setMessage('');
    if (!ALLOWED.has(file.type)) { setError(t.type); return; }
    if (!file.size || file.size > MAX_BYTES) { setError(t.large); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST', credentials: 'same-origin',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name)
        },
        body: file,
        signal: AbortSignal.timeout(90000)
      });
      const result = await parse(response);
      if (!response.ok || !result.document) throw new Error(problem(result.error));
      setMessage(t.saved);
      await refresh();
      if (aiOptIn) await analyze(result.document.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function remove(doc: Document) {
    if (!window.confirm(t.confirmDelete)) return;
    setWorkingId(doc.id); setError('');
    try {
      const response = await fetch('/api/documents/' + doc.id, { method: 'DELETE', credentials: 'same-origin' });
      const body = await parse(response);
      if (!response.ok) throw new Error(problem(body.error));
      setSelected(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally { setWorkingId(null); }
  }

  function searchText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode(search.trim() ? 'keyword' : 'all');
    void refresh(search.trim());
  }

  async function searchWithAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aiQuestion.trim() || aiSearch) return;
    setAiSearch(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion.trim() }),
        signal: AbortSignal.timeout(60000)
      });
      const body = await parse(response);
      if (!response.ok) throw new Error(problem(body.error));
      setDocs(body.documents || []);
      setMode('ai');
      setMessage(body.aiUsed ? t.aiOn : t.aiFallback);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally { setAiSearch(false); }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-brand"><ShieldCheck size={15}/>{t.personal}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{t.intro}</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
          {busy ? <LoaderCircle size={17} className="animate-spin"/> : <FilePlus2 size={17}/>}
          {busy ? t.processing : t.upload}
        </button>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      </div>
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19}/>{error}<button aria-label={t.clear} onClick={() => setError('')} className="ml-auto"><X size={18}/></button></div>}
      {message && <div role="status" className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700"><CheckCircle2 size={19}/>{message}<button aria-label={t.clear} onClick={() => setMessage('')} className="ml-auto"><X size={18}/></button></div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-brand"><LockKeyhole size={20}/></span>
            <div><h2 className="text-sm font-semibold">{t.drop}</h2><p className="text-xs text-slate-500">{t.formats}</p></div>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-brand hover:bg-indigo-50">{t.upload}</button>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={aiOptIn} onChange={e => setAiOptIn(e.target.checked)} className="mt-1 size-4 accent-indigo-600"/>
            <span><span className="block text-sm font-semibold text-slate-700">{t.analyzeAfter}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{t.aiConsent}</span></span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={searchText} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Search className="text-brand" size={20}/><h2 className="text-sm font-semibold">{t.query}</h2></div>
          <div className="mt-4 flex gap-2"><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.queryPlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand"/>
            <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">{t.find}</button>
          </div>
        </form>
        <form onSubmit={searchWithAI} className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
          <div className="flex items-center gap-2"><Sparkles className="text-brand" size={20}/><h2 className="text-sm font-semibold">{t.aiQuestion}</h2></div>
          <div className="mt-4 flex gap-2"><input value={aiQuestion} maxLength={220} onChange={e => setAiQuestion(e.target.value)} placeholder={t.aiPlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"/>
            <button type="submit" disabled={aiSearch || !aiQuestion.trim()} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {aiSearch ? <LoaderCircle size={16} className="animate-spin"/> : <ArrowRight size={16}/>}
              <span className="hidden sm:inline">{t.askAI}</span>
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.searchAIInfo}</p>
        </form>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">{t.docs}</h2><p className="text-xs text-slate-500">{docs.length} {t.documentsCount}</p></div>
          {mode !== 'all' && <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand" onClick={() => {setSearch('');setAiQuestion('');setMode('all');void refresh();}}>{t.reset}<X size={14}/></button>}
        </div>
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><LoaderCircle size={26} className="mx-auto animate-spin text-brand"/></div>
          : docs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <FolderOpen size={32} className="mx-auto text-indigo-300"/><h3 className="mt-4 font-semibold">{mode === 'all' ? t.empty : t.noResults}</h3><p className="mt-1 text-sm text-slate-500">{mode === 'all' ? t.emptySub : ''}</p></div>
            : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {docs.map((doc, index) => (
                <div key={doc.id} className={'flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:px-5 ' + (index ? 'border-t border-slate-100' : '')}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand">{doc.mimeType === 'application/pdf' ? <FileText size={21}/> : <FileImage size={21}/>}</span>
                  <button onClick={() => setSelected(doc)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-slate-800 hover:text-brand">{doc.filename}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{doc.merchant || date(doc.createdAt)} · {size(doc.sizeBytes)}</span>
                    <span className={'mt-1 inline-block text-[11px] font-medium ' + (doc.status === 'ready' ? 'text-emerald-600' : 'text-slate-400')}>{doc.status === 'ready' ? t.scanned : t.pending}</span>
                  </button>
                  <span className="shrink-0 text-right text-sm font-semibold">{money(doc.amountCents)}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button title={t.analyze} aria-label={t.analyze} disabled={!!workingId || busy} onClick={() => void analyze(doc.id)} className="rounded-lg p-2 text-brand transition hover:bg-indigo-50 disabled:opacity-40">
                      {workingId === doc.id ? <LoaderCircle size={19} className="animate-spin"/> : <Sparkles size={19}/>}
                    </button>
                    <a href={fileLink(doc.id, true)} title={t.download} aria-label={t.download} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-50"><ArrowDownToLine size={19}/></a>
                    <button title={t.delete} aria-label={t.delete} disabled={!!workingId} onClick={() => void remove(doc)} className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 disabled:opacity-40"><Trash2 size={19}/></button>
                  </div>
                </div>
              ))}
            </div>}
        <p className="mt-4 text-xs leading-relaxed text-slate-400">{t.note} {t.original} {t.billing}</p>
        <p className="mt-2 text-xs font-medium text-amber-700">{t.betaWarning}</p>
        <a className="mt-2 inline-block text-xs font-semibold text-brand underline" href={language === 'pt' ? 'https://github.com/gabrielduclos/arqvo/blob/main/PRIVACY.pt-BR.md' : 'https://github.com/gabrielduclos/arqvo/blob/main/PRIVACY.md'} target="_blank" rel="noreferrer">{t.privacy}</a>
      </div>

      {selected && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={e => {if (e.target === e.currentTarget) setSelected(null);}}>
        <div role="dialog" aria-modal="true" aria-label={t.selected} className="max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-[26px] bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-brand">{t.personal}</span><button aria-label={t.close} onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
          <div className="mt-5 flex h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
            {selected.mimeType.startsWith('image/') ? <img className="h-full w-full object-contain" alt={selected.filename} src={fileLink(selected.id)}/>
              : <><FileText size={42} className="text-brand"/><span className="mt-3 text-xs text-slate-500">PDF</span></>}
          </div>
          <h2 className="mt-5 break-words text-lg font-semibold">{selected.filename}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
            <div><p className="text-xs text-slate-500">{t.merchant}</p><p className="mt-1 font-semibold">{selected.merchant || '—'}</p></div>
            <div><p className="text-xs text-slate-500">{t.amount}</p><p className="mt-1 font-semibold">{money(selected.amountCents)}</p></div>
            <div><p className="text-xs text-slate-500">{t.date}</p><p className="mt-1 font-semibold">{date(selected.documentDate)}</p></div>
            <div><p className="text-xs text-slate-500">{t.format}</p><p className="mt-1 font-semibold">{selected.mimeType.split('/')[1]?.toUpperCase()}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={fileLink(selected.id, true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white"><ArrowDownToLine size={17}/>{t.download}</a>
            <button onClick={() => void analyze(selected.id)} disabled={!!workingId} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-3 text-sm font-semibold text-brand disabled:opacity-50"><Sparkles size={16}/>{workingId === selected.id ? t.analyzing : t.analyze}</button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{t.note} {t.noAI}</p>
        </div>
      </div>}
    </section>
  );
}
