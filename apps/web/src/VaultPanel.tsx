import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle, ArrowDownToLine, CheckCircle2,
  FileImage, FilePlus2, FileText, FolderOpen, LoaderCircle,
  Info, Pencil, Search, SlidersHorizontal, Sparkles, Trash2, X
} from 'lucide-react';
import DocumentFilters, {
  type DocumentFilterValues, emptyDocumentFilters, buildDocumentQuery, countDocumentFilters
} from './DocumentFilters';
import { categoryLabel, categoryOptions } from './documentCategories';
import UploadSourceModal, { type UploadSource } from './UploadSourceModal';
import DocumentScannerModal from './DocumentScannerModal';
import DocumentCreatorModal from './DocumentCreatorModal';
import UploadQueuePanel from './UploadQueuePanel';
import { useDocumentUploadQueue } from './useDocumentUploadQueue';

type Language = 'pt' | 'en';
type DocumentView = 'all' | 'month' | 'identified';

function presetFilters(view: DocumentView): DocumentFilterValues {
  const filters = { ...emptyDocumentFilters };
  if (view === 'identified') filters.analysis = 'ready';
  if (view === 'month') {
    const now = new Date();
    const year = now.getUTCFullYear(), month = now.getUTCMonth();
    filters.dateBy = 'uploaded';
    filters.dateFrom = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    filters.dateTo = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  }
  return filters;
}
type Document = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | string;
  status: 'uploaded' | 'ready' | 'failed';
  hasExtractedText?: boolean;
  merchant: string | null;
  category?: string | null;
  subcategory?: string | null;
  documentDate: string | null;
  amountCents: string | number | null;
  currency?: string;
  createdAt: string;
};
type Result = { documents?: Document[]; document?: Document; error?: string; aiUsed?: boolean; note?: string; extractionState?: 'structured' | 'partial' | 'text_only' };

const words = {
  pt: {
    title: 'Documentos', intro: 'Envie, encontre, visualize e baixe seus documentos.',
    upload: 'Adicionar documento', drop: 'Escolha um PDF ou imagem', formats: 'PDF, JPG, PNG ou WebP · até 20 MB · máximo de 100 arquivos',
    uploadInfo: 'Informações do envio', uploadInfoHint: 'Formatos, limites e digitalização local',
    processing: 'Enviando e digitalizando…', analyzeAfter: 'Scanner e extração automática', aiConsent: 'Fotos da câmera e imagens carregadas são digitalizadas com OCR no próprio dispositivo. A IA é utilizada apenas quando faltar informação ou para documentos sem OCR local, como PDFs. O arquivo original permanece preservado.',
    docs: 'Documentos armazenados', documentsCount: 'arquivos', empty: 'Nenhum documento enviado ainda.', emptySub: 'Adicione seu primeiro documento para começar.',
    query: 'Pesquisar por nome, estabelecimento ou texto', queryPlaceholder: 'Ex.: farmácia, supermercado, garantia',
    find: 'Buscar', searchAndFilters: 'Busca e filtros', reset: 'Limpar busca', filters: 'Filtros', activeFilters: 'Filtros ativos', invalidFilters: 'Confira os filtros selecionados.',
    searching: 'Pesquisando…', scanned: 'Dados identificados', pending: 'Aguardando análise', partial: 'Dados parciais', textOnly: 'Texto extraído, sem dados identificados', extracting: 'Reconhecendo informações…', noFields: 'O texto foi extraído, mas a IA não conseguiu identificar estabelecimento, data ou valor. Você pode tentar novamente.', partialFields: 'Extração parcial: confira e complete os dados pelo documento original.',
    analyze: 'Extrair dados com IA', analyzing: 'Extraindo…', download: 'Baixar original', preview: 'Visualizar arquivo',
    delete: 'Excluir', confirmDelete: 'Excluir permanentemente este documento? Esta ação não pode ser desfeita.',
    error: 'Não foi possível concluir a operação. Tente novamente.',
    unauthorized: 'Sessão inválida ou e-mail não confirmado. Faça login novamente.',
    aiLimit: 'A IA está temporariamente indisponível. O arquivo continua salvo.',
    large: 'Arquivo muito grande. O limite é 20 MB.', type: 'Formato não aceito. Envie PDF, JPG, PNG ou WebP.',
    saved: 'Arquivo salvo. Analisando o texto reconhecido…', localSaved: 'Digitalização local concluída. Confira os dados reconhecidos.', extracted: 'Dados identificados. Confira as informações no documento original.',
    note: 'Valores extraídos por IA são sugestões e devem ser conferidos.', noResults: 'Nenhum documento encontrado.',
    merchant: 'Estabelecimento', category: 'Categoria', subcategory: 'Subcategoria', amount: 'Valor', date: 'Data', format: 'Formato',
    editMetadata: 'Corrigir dados', saveMetadata: 'Salvar alterações', cancelEdit: 'Cancelar', savedMetadata: 'Informações atualizadas. Suas correções serão mantidas mesmo após nova análise.', unknownCategory: 'Não classificado',
    source: 'Arquivo original', close: 'Fechar', selected: 'Detalhes do documento', ocrText: 'Texto reconhecido na nota fiscal', ocrEmpty: 'Nenhum texto legível; tente uma foto mais nítida.',
    noAI: 'A análise acontece após o upload; você pode tentar novamente se faltarem informações.',
    billing: 'A IA pode consumir recursos da Cloudflare; os resultados devem ser conferidos.',
    notYet: 'Ainda não foi possível identificar dados estruturados.', clear: 'Fechar aviso',
    original: 'O arquivo original é preservado sem alterações.',
    confirmAI: 'Enviar este documento para análise pela Cloudflare Workers AI? Os resultados podem conter erros.',
    privacy: 'Privacidade e tratamento dos dados',
    betaWarning: 'Versão beta. Evite documentos altamente sensíveis até a revisão de segurança.'
  },
  en: {
    title: 'Documents', intro: 'Upload, search, preview and download your documents.',
    upload: 'Add a document', drop: 'Choose a PDF or image', formats: 'PDF, JPG, PNG, WebP · up to 20 MB · maximum 100 files',
    uploadInfo: 'Upload information', uploadInfoHint: 'Formats, limits and local scanning',
    processing: 'Uploading and scanning…', analyzeAfter: 'Scan and automatic extraction', aiConsent: 'Camera photos and uploaded images are scanned with on-device OCR. AI is used only if more details are needed, or for files without local OCR such as PDFs. Your original file remains preserved.',
    docs: 'Stored documents', documentsCount: 'files', empty: 'No documents uploaded yet.', emptySub: 'Add your first document to get started.',
    query: 'Search by name, merchant or extracted text', queryPlaceholder: 'e.g., pharmacy, supermarket, warranty',
    find: 'Search', searchAndFilters: 'Search and filters', reset: 'Clear search', filters: 'Filters', activeFilters: 'Active filters', invalidFilters: 'Check the selected filters.',
    searching: 'Searching…', scanned: 'Data identified', pending: 'Waiting for analysis', partial: 'Partial data', textOnly: 'Text extracted, details not identified', extracting: 'Recognizing details…', noFields: 'Text was extracted, but the AI could not identify a merchant, date or amount. You can try again.', partialFields: 'Partial extraction: check the original for missing details.',
    analyze: 'Extract with AI', analyzing: 'Extracting…', download: 'Download original', preview: 'Preview file',
    delete: 'Delete', confirmDelete: 'Permanently delete this document? This cannot be undone.',
    error: 'Unable to complete the operation. Please retry.',
    unauthorized: 'Invalid session or unverified email. Sign in again.',
    aiLimit: 'AI is temporarily unavailable. Your file remains saved.',
    large: 'File is too large. Maximum is 20 MB.', type: 'Unsupported file. Choose PDF, JPG, PNG or WebP.',
    saved: 'File saved. Processing recognized text…', localSaved: 'Local scan completed. Review the recognized details.', extracted: 'Details identified. Check the information against the original.',
    note: 'AI-extracted values are suggestions that must be checked.', noResults: 'No documents found.',
    merchant: 'Merchant', category: 'Category', subcategory: 'Subcategory', amount: 'Amount', date: 'Date', format: 'Format',
    editMetadata: 'Correct details', saveMetadata: 'Save changes', cancelEdit: 'Cancel', savedMetadata: 'Details updated. Your corrections are retained after future AI analysis.', unknownCategory: 'Uncategorized',
    source: 'Original file', close: 'Close', selected: 'Document details', ocrText: 'Recognized invoice text', ocrEmpty: 'No readable text; try a sharper photo.',
    noAI: 'Analysis starts after upload. Retry if details are missing.',
    billing: 'AI processing uses Cloudflare resources; always verify extracted values.',
    notYet: 'Structured fields have not been identified yet.', clear: 'Dismiss notice',
    original: 'The original file is preserved unchanged.',
    confirmAI: 'Send this document to Cloudflare Workers AI for analysis? Results may be inaccurate.',
    privacy: 'Privacy and data handling',
    betaWarning: 'Beta version. Avoid highly sensitive documents until the security review.'
  }
};
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function parse(response: Response): Promise<Result> {
  const result = await response.json().catch(() => ({}));
  return result && typeof result === 'object' ? result as Result : {};
}

export default function VaultPanel({ language, email, initialView = 'all' }: { language: Language; email: string; initialView?: DocumentView }) {
  const t = words[language];
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [filters, setFilters] = useState<DocumentFilterValues>(() => presetFilters(initialView));
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadInfo, setShowUploadInfo] = useState(false);
  const [showUploadSource, setShowUploadSource] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [showDocumentCreator, setShowDocumentCreator] = useState(false);
  const requestSequence = useRef(0);
  const reducedMotion = useReducedMotion();
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Document | null>(null);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [metadataDraft, setMetadataDraft] = useState({ merchant: '', category: '', subcategory: '' });
  const [detailText, setDetailText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'all' | 'keyword'>(initialView === 'all' ? 'all' : 'keyword');
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
  const listedDocs = docs;
  const activeFilters = countDocumentFilters(filters);
  const fileLink = (id: string, download = false) => '/api/documents/' + encodeURIComponent(id) + '/file' + (download ? '?download=1' : '');

  const problem = (code?: string) => {
    if (code === 'unauthorized') return t.unauthorized;
    if (code === 'file_too_large_or_empty' || code === 'file_too_large_for_ai') return t.large;
    if (code === 'unsupported_file') return t.type;
    if (code === 'invalid_filters') return t.invalidFilters;
    if (code === 'ai_daily_limit_or_unavailable' || code === 'ai_daily_limit') return t.aiLimit;
    return t.error;
  };
  async function refresh(q = search.trim(), nextFilters = filters) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');
    try {
      const query = buildDocumentQuery(nextFilters, q).toString();
      const response = await fetch('/api/documents' + (query ? '?' + query : ''), {
        credentials: 'same-origin', cache: 'no-store'
      });
      const body = await parse(response);
      if (!response.ok) throw new Error(problem(body.error));
      if (requestId === requestSequence.current) setDocs(body.documents || []);
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : t.error);
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }
  const queue = useDocumentUploadQueue(language, () => { void refresh(); }, problem);
  const busy = queue.items.some(item => ['scanning', 'uploading', 'analyzing'].includes(item.status));

  useEffect(() => {
    const next = presetFilters(initialView);
    setFilters(next);
    setMode(initialView === 'all' ? 'all' : 'keyword');
    setSearch('');
    void refresh('', next);
  }, [email, initialView]);

  function applyFilters(next: DocumentFilterValues) {
    setFilters(next);
    setShowFilters(false);
    const active = countDocumentFilters(next) > 0 || search.trim().length > 0;
    setMode(active ? 'keyword' : 'all');
    void refresh(search.trim(), next);
  }

  function clearAllFilters() {
    const cleared = { ...emptyDocumentFilters };
    setFilters(cleared);
    setSearch('');
    setMode('all');
    setShowFilters(false);
    void refresh('', cleared);
  }

  useEffect(() => {
    setEditingMetadata(false);
    setMetadataDraft({
      merchant: selected?.merchant || '',
      category: selected?.category || '',
      subcategory: selected?.subcategory || ''
    });
  }, [selected?.id, selected?.merchant, selected?.category, selected?.subcategory]);

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || savingMetadata) return;
    setSavingMetadata(true);
    setError('');
    try {
      const response = await fetch('/api/documents/' + selected.id + '/metadata', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadataDraft),
        signal: AbortSignal.timeout(45000)
      });
      const body = await parse(response);
      if (!response.ok || !body.document) throw new Error(problem(body.error));
      setSelected(old => old && old.id === selected.id ? { ...old, ...body.document } : old);
      setDocs(old => old.map(doc => doc.id === selected.id ? { ...doc, ...body.document } : doc));
      setEditingMetadata(false);
      setMessage(t.savedMetadata);
      void refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setSavingMetadata(false);
    }
  }

  useEffect(() => {
    setDetailText(null);
    if (!selected) return;
    const controller = new AbortController();
    fetch('/api/documents/' + selected.id, {
      credentials: 'same-origin', cache: 'no-store', signal: controller.signal
    }).then(r => r.ok ? r.json() : null)
      .then(body => {
        if (!controller.signal.aborted) setDetailText(
          typeof body?.document?.extractedText === 'string' ? body.document.extractedText : ''
        );
      }).catch(() => {});
    return () => controller.abort();
  }, [selected?.id, selected?.status]);


  async function analyze(id: string, automatic = false, localScan?: { text: string; confidence: number }) {
    if (!automatic && !window.confirm(t.confirmAI)) return;
    setWorkingId(id);
    setError('');
    setMessage(t.extracting);
    try {
      const response = await fetch('/api/documents/' + id + (localScan ? '/scan' : '/analyze'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localScan ?? {}),
        signal: AbortSignal.timeout(90000)
      });
      const body = await parse(response);
      if (!response.ok) throw new Error(problem(body.error));
      setMessage(localScan && !body.aiUsed && body.extractionState === 'structured' ? t.localSaved
        : body.extractionState === 'structured' ? t.extracted
        : body.extractionState === 'partial' ? t.partialFields : t.noFields);
      await refresh();
      if (selected?.id === id && body.document) setSelected(body.document);
    } catch (cause) {
      setMessage('');
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setWorkingId(null);
    }
  }

  function chooseUploadSource(source: UploadSource) {
    // Picker calls must happen within the user's click, particularly on iOS Safari.
    if (source === 'scanner') {
      setShowUploadSource(false);
      setShowDocumentCreator(true);
      return;
    }
    const input = source === 'camera' ? cameraRef.current :
      source === 'gallery' ? galleryRef.current : fileRef.current;
    input?.click();
    setShowUploadSource(false);
  }

  function onFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!selectedFiles.length) return;
    if (selectedFiles.length === 1 && selectedFiles[0].type.startsWith('image/')) {
      const file = selectedFiles[0];
      if (!ALLOWED.has(file.type) || !file.size || file.size > MAX_BYTES) {
        setError(!ALLOWED.has(file.type) ? t.type : t.large);
        return;
      }
      setScanFile(file);
    } else {
      queue.enqueue(selectedFiles);
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
    setMode(search.trim() || activeFilters ? 'keyword' : 'all');
    void refresh(search.trim(), filters);
  }


  return (
    <section className="min-w-0 space-y-5 sm:space-y-7">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[29px] font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
            <button type="button" aria-label={t.uploadInfo} title={t.uploadInfoHint}
              onClick={() => setShowUploadInfo(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <Info size={20} aria-hidden="true"/>
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">{t.intro}</p>
        </div>
        <button type="button" onClick={() => setShowUploadSource(true)}
          aria-haspopup="dialog"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto">
          <FilePlus2 size={17}/>{t.upload}
        </button>
        {/* The three native pickers remain mounted outside the dialog. The
            initial selection is ours; the OS handles capture and file access. */}
        <input ref={cameraRef} type="file" className="hidden" tabIndex={-1}
          aria-label={language === 'pt' ? 'Fotografar documento' : 'Take a document photo'}
          accept="image/*" capture="environment" onChange={onFilePicked}/>
        <input ref={galleryRef} type="file" className="hidden" tabIndex={-1}
          aria-label={language === 'pt' ? 'Escolher imagem da galeria' : 'Choose photo from gallery'}
          accept="image/jpeg,image/png,image/webp" multiple onChange={onFilePicked}/>
        <input ref={fileRef} type="file" className="hidden" tabIndex={-1}
          aria-label={language === 'pt' ? 'Selecionar arquivo' : 'Choose file'}
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          multiple onChange={onFilePicked}/>
      </div>
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19}/>{error}<button aria-label={t.clear} onClick={() => setError('')} className="ml-auto"><X size={18}/></button></div>}
      {message && <div role="status" className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700"><CheckCircle2 size={19}/>{message}<button aria-label={t.clear} onClick={() => setMessage('')} className="ml-auto"><X size={18}/></button></div>}
      <UploadQueuePanel queue={queue} language={language}/>

      <div className="flex flex-wrap items-center justify-between gap-2" aria-label={t.searchAndFilters}>
        <h2 className="text-sm font-semibold text-ink">{t.searchAndFilters}</h2>
        <div className="flex items-center gap-2">
          {(mode !== 'all' || activeFilters > 0) && <button type="button"
            className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-slate-500 hover:text-brand"
            onClick={clearAllFilters}>{t.reset}<X size={14}/></button>}
          <button type="button" onClick={() => setShowFilters(true)}
            aria-label={t.filters} aria-haspopup="dialog"
            className={'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ' +
              (activeFilters ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200')}>
            <SlidersHorizontal size={17}/>{t.filters}
            {activeFilters > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] text-white"
              aria-label={t.activeFilters}>{activeFilters}</span>}
          </button>
        </div>
      </div>
      <form onSubmit={searchText} role="search"
        className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="arqvo-document-search" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Search size={19} className="text-brand" aria-hidden="true"/>{t.query}
        </label>
        <div className="mt-3 flex min-w-0 gap-2">
          <input id="arqvo-document-search" type="search" value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t.queryPlaceholder}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm"/>
          <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">{t.find}</button>
        </div>
      </form>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t.docs}</h2>
          <p className="text-xs text-slate-500">{listedDocs.length} {t.documentsCount}</p>
        </div>
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><LoaderCircle size={26} className="mx-auto animate-spin text-brand"/></div>
          : listedDocs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <FolderOpen size={32} className="mx-auto text-indigo-300"/><h3 className="mt-4 font-semibold">{mode === 'all' && !activeFilters ? t.empty : t.noResults}</h3><p className="mt-1 text-sm text-slate-500">{mode === 'all' && !activeFilters ? t.emptySub : ''}</p></div>
            : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {listedDocs.map((doc, index) => (
                <div key={doc.id} className={'min-w-0 px-4 py-4 sm:flex sm:items-center sm:gap-4 sm:px-5 ' + (index ? 'border-t border-slate-100' : '')}>
                  <div className="flex min-w-0 items-start gap-3 sm:flex-1">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand">
                      {doc.mimeType === 'application/pdf' ? <FileText size={21}/> : <FileImage size={21}/>}
                    </span>
                    <button onClick={() => setSelected(doc)} className="min-w-0 flex-1 py-0.5 text-left">
                      <span className="block truncate text-sm font-semibold text-slate-800 hover:text-brand">{doc.filename}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{doc.merchant || date(doc.createdAt)} · {size(doc.sizeBytes)}</span>
                      {doc.category && <span className="mt-1 block truncate text-[11px] font-semibold text-brand">
                        {categoryLabel(doc.category, language)}
                        {doc.subcategory ? ' · ' + doc.subcategory : ''}
                      </span>}
                      <span className={'mt-1.5 inline-block text-[11px] font-medium ' +
                        (doc.status === 'ready' ? 'text-emerald-600' : doc.hasExtractedText ? 'text-amber-700' : 'text-slate-400')}>
                        {workingId === doc.id ? t.extracting : doc.status === 'ready' ? t.scanned
                          : doc.merchant || doc.documentDate || doc.amountCents != null ? t.partial
                          : doc.hasExtractedText ? t.textOnly : t.pending}
                      </span>
                    </button>
                    <span className="max-w-24 shrink-0 pt-1 text-right text-xs font-semibold tabular-nums text-slate-800 sm:hidden">
                      {money(doc.amountCents)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2 sm:mt-0 sm:gap-2 sm:border-0 sm:pt-0">
                    <span className="mr-2 hidden shrink-0 text-right text-sm font-semibold tabular-nums sm:block">{money(doc.amountCents)}</span>
                    <button title={t.analyze} aria-label={t.analyze} disabled={!!workingId || busy}
                      onClick={() => void analyze(doc.id)} className="flex size-11 items-center justify-center rounded-xl text-brand transition hover:bg-indigo-50 disabled:opacity-40">
                      {workingId === doc.id ? <LoaderCircle size={19} className="animate-spin"/> : <Sparkles size={19}/>}
                    </button>
                    <a href={fileLink(doc.id, true)} title={t.download} aria-label={t.download}
                      className="flex size-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50">
                      <ArrowDownToLine size={19}/>
                    </a>
                    <button title={t.delete} aria-label={t.delete} disabled={!!workingId}
                      onClick={() => void remove(doc)} className="flex size-11 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50 disabled:opacity-40">
                      <Trash2 size={19}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>}
        <p className="mt-4 text-xs leading-relaxed text-slate-400">{t.note} {t.original} {t.billing}</p>
        <p className="mt-2 text-xs font-medium text-amber-700">{t.betaWarning}</p>
        <a className="mt-2 inline-block text-xs font-semibold text-brand underline" href={language === 'pt' ? 'https://github.com/gabrielduclos/arqvo/blob/main/PRIVACY.pt-BR.md' : 'https://github.com/gabrielduclos/arqvo/blob/main/PRIVACY.md'} target="_blank" rel="noreferrer">{t.privacy}</a>
      </div>

      <AnimatePresence>
        {scanFile && <DocumentScannerModal key="document-scanner" file={scanFile}
          language={language} onClose={() => setScanFile(null)}
          onScanned={(text, confidence) => {
            const original = scanFile;
            setScanFile(null);
            if (original) queue.enqueue([original], { text, confidence });
          }}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showDocumentCreator && <DocumentCreatorModal language={language}
          onClose={() => setShowDocumentCreator(false)}
          onCreate={(file, scan) => {
            setShowDocumentCreator(false);
            queue.enqueue([file], scan);
          }}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showUploadSource && <UploadSourceModal key="choose-upload-source" language={language}
          onSelect={chooseUploadSource} onClose={() => setShowUploadSource(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showFilters && <DocumentFilters key="document-filters" language={language} value={filters}
          onApply={applyFilters} onClose={() => setShowFilters(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showUploadInfo && <motion.div
          key="upload-info" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"
          onMouseDown={event => { if (event.target === event.currentTarget) setShowUploadInfo(false); }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="arqvo-upload-info-title"
            initial={reducedMotion ? {} : {opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}} exit={reducedMotion ? {} : {opacity: 0, y: 18}}
            className="w-full max-w-[460px] rounded-t-[26px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-[26px] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-brand">
                <Info size={22}/>
                <h2 id="arqvo-upload-info-title" className="text-lg font-semibold text-ink">{t.uploadInfo}</h2>
              </div>
              <button type="button" aria-label={t.close} onClick={() => setShowUploadInfo(false)}
                className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
                <X size={20}/>
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
              <div><p className="font-semibold text-ink">{t.drop}</p><p className="mt-1">{t.formats}</p></div>
              <div className="border-t border-slate-100 pt-4">
                <p className="flex items-center gap-2 font-semibold text-ink"><Sparkles size={17} className="text-brand"/>{t.analyzeAfter}</p>
                <p className="mt-1">{t.aiConsent}</p>
              </div>
            </div>
          </motion.section>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
      {selected && <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-3"
        initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
        onMouseDown={e => {if (e.target === e.currentTarget) setSelected(null);}}>
        <motion.div role="dialog" aria-modal="true" aria-label={t.selected} className="max-h-[92dvh] w-full max-w-[540px] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl sm:max-h-[90vh] sm:rounded-[26px] sm:p-8"
          initial={reducedMotion ? {} : {opacity: 0, y: 30}} animate={{opacity: 1, y: 0}} exit={reducedMotion ? {} : {opacity: 0, y: 20}}>
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-brand">{t.selected}</span><button aria-label={t.close} onClick={() => setSelected(null)} className="flex size-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
          <div className="mt-4 flex h-56 flex-col items-center justify-center sm:mt-5 sm:h-48 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
            {selected.mimeType.startsWith('image/') ? <img className="h-full w-full object-contain" alt={selected.filename} src={fileLink(selected.id)}/>
              : <><FileText size={42} className="text-brand"/><span className="mt-3 text-xs text-slate-500">PDF</span></>}
          </div>
          <h2 className="mt-5 break-words text-lg font-semibold">{selected.filename}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
            <div><p className="text-xs text-slate-500">{t.merchant}</p><p className="mt-1 font-semibold">{selected.merchant || '—'}</p></div>
            <div><p className="text-xs text-slate-500">{t.amount}</p><p className="mt-1 font-semibold">{money(selected.amountCents)}</p></div>
            <div className="min-w-0"><p className="text-xs text-slate-500">{t.date}</p><p className="mt-1 font-semibold">{date(selected.documentDate)}</p></div>
            <div className="min-w-0"><p className="text-xs text-slate-500">{t.category}</p>
              <p className="mt-1 font-semibold">{categoryLabel(selected.category, language)}</p>
              {selected.subcategory && <p className="mt-1 break-words text-xs text-slate-500">{selected.subcategory}</p>}
            </div>
            <div><p className="text-xs text-slate-500">{t.format}</p><p className="mt-1 font-semibold">{selected.mimeType.split('/')[1]?.toUpperCase()}</p></div>
          </div>
          <div className="mt-4">
            <button type="button" onClick={() => setEditingMetadata(value => !value)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">
              <Pencil size={16}/>{editingMetadata ? t.cancelEdit : t.editMetadata}
            </button>
          </div>
          {editingMetadata && <form onSubmit={saveMetadata} className="mt-3 space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <label className="block text-xs font-semibold text-slate-600" htmlFor="arqvo-edit-merchant">{t.merchant}</label>
            <input id="arqvo-edit-merchant" type="text" maxLength={160}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-brand"
              value={metadataDraft.merchant}
              onChange={e => setMetadataDraft(d => ({...d, merchant:e.target.value}))}/>
            <label className="block text-xs font-semibold text-slate-600" htmlFor="arqvo-edit-category">{t.category}</label>
            <select id="arqvo-edit-category" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-brand"
              value={metadataDraft.category}
              onChange={e => setMetadataDraft(d => ({...d, category:e.target.value, subcategory:e.target.value ? d.subcategory : ''}))}>
              <option value="">{t.unknownCategory}</option>
              {categoryOptions(language).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <label className="block text-xs font-semibold text-slate-600" htmlFor="arqvo-edit-subcategory">{t.subcategory}</label>
            <input id="arqvo-edit-subcategory" type="text" maxLength={80}
              disabled={!metadataDraft.category}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-brand disabled:opacity-50"
              value={metadataDraft.subcategory}
              onChange={e => setMetadataDraft(d => ({...d, subcategory:e.target.value}))}/>
            <button type="submit" disabled={savingMetadata}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {savingMetadata ? t.processing : t.saveMetadata}
            </button>
          </form>}
          <details className="mt-5 rounded-xl border border-slate-200 p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">{t.ocrText}</summary>
            <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{detailText === null ? '…' : detailText || t.ocrEmpty}</pre>
          </details>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={fileLink(selected.id, true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white"><ArrowDownToLine size={17}/>{t.download}</a>
            <button onClick={() => void analyze(selected.id)} disabled={!!workingId} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-3 text-sm font-semibold text-brand disabled:opacity-50"><Sparkles size={16}/>{workingId === selected.id ? t.analyzing : t.analyze}</button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{t.note} {t.noAI}</p>
        </motion.div>
      </motion.div>}
      </AnimatePresence>
    </section>
  );
}
