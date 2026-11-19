import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Check, FileSearch, SlidersHorizontal, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { categoryOptions, type DocumentCategoryCode } from './documentCategories';

export type DocumentFilterValues = {
  merchant: string;
  category: DocumentCategoryCode | 'all';
  type: 'all' | 'pdf' | 'image';
  analysis: 'all' | 'ready' | 'partial' | 'text_only' | 'pending' | 'failed';
  dateBy: 'document' | 'uploaded';
  dateFrom: string;
  dateTo: string;
  amountFrom: string;
  amountTo: string;
  sort: 'newest' | 'oldest' | 'document_newest' | 'document_oldest' |
    'amount_high' | 'amount_low' | 'merchant';
};

export const emptyDocumentFilters: DocumentFilterValues = {
  merchant: '', category: 'all', type: 'all', analysis: 'all', dateBy: 'document',
  dateFrom: '', dateTo: '', amountFrom: '', amountTo: '', sort: 'newest'
};

function moneyCents(raw: string): number | null {
  const text = raw.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!text) return null;
  // 1.234,56 / 1234,56 / 1234.56 / 1.234 / 1234
  let integer: string;
  let fraction = '';
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) {
    const [whole, decimal = ''] = text.split(',');
    integer = whole.replace(/\./g, '');
    fraction = decimal;
  } else if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) {
    const [whole, decimal = ''] = text.split(/[.,]/);
    integer = whole;
    fraction = decimal;
  } else {
    return NaN;
  }
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents <= 100000000000 ? cents : NaN;
}

export function countDocumentFilters(filters: DocumentFilterValues): number {
  return Number(Boolean(filters.merchant.trim())) + Number(filters.category !== 'all') + Number(filters.type !== 'all') +
    Number(filters.analysis !== 'all') + Number(Boolean(filters.dateFrom || filters.dateTo)) +
    Number(Boolean(filters.amountFrom || filters.amountTo)) + Number(filters.sort !== 'newest');
}

export function validateDocumentFilters(filters: DocumentFilterValues): 'amount' | 'range' | null {
  const minimum = moneyCents(filters.amountFrom);
  const maximum = moneyCents(filters.amountTo);
  if (Number.isNaN(minimum) || Number.isNaN(maximum)) return 'amount';
  if ((minimum !== null && maximum !== null && minimum > maximum) ||
      (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo)) return 'range';
  return null;
}

export function buildDocumentQuery(filters: DocumentFilterValues, query = ''): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim().slice(0, 160));
  if (filters.merchant.trim()) params.set('merchant', filters.merchant.trim().slice(0, 150));
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.type !== 'all') params.set('type', filters.type);
  if (filters.analysis !== 'all') params.set('analysis', filters.analysis);
  if (filters.dateFrom) params.set(filters.dateBy === 'document' ? 'dateStart' : 'uploadStart', filters.dateFrom);
  if (filters.dateTo) params.set(filters.dateBy === 'document' ? 'dateEnd' : 'uploadEnd', filters.dateTo);
  const minimum = moneyCents(filters.amountFrom);
  const maximum = moneyCents(filters.amountTo);
  if (minimum !== null && !Number.isNaN(minimum)) params.set('amountMin', String(minimum));
  if (maximum !== null && !Number.isNaN(maximum)) params.set('amountMax', String(maximum));
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  return params;
}

const labels = {
  pt: {
    title: 'Filtrar documentos', subtitle: 'Combine os critérios para encontrar o documento certo.',
    merchant: 'Estabelecimento', merchantExample: 'Ex.: farmácia, mercado...',
    category: 'Categoria da compra', categoryAll: 'Todas as categorias',
    type: 'Tipo de arquivo', typeAll: 'Todos', pdf: 'PDF', image: 'Imagens',
    analysis: 'Situação da análise', analysisAll: 'Todas', ready: 'Dados identificados',
    partial: 'Dados parciais', text_only: 'Somente texto extraído', pending: 'Aguardando análise', failed: 'Falhou',
    date: 'Período', byDocument: 'Data do documento', byUpload: 'Data do envio',
    from: 'De', to: 'Até', amount: 'Valor (R$)', min: 'Mínimo', max: 'Máximo',
    amountHelp: 'Use valores em reais, por exemplo 50,00 ou 1.250,90.',
    sort: 'Ordenar por', newest: 'Enviados recentemente', oldest: 'Enviados há mais tempo',
    document_newest: 'Data do documento: mais recente', document_oldest: 'Data do documento: mais antiga',
    amount_high: 'Maior valor', amount_low: 'Menor valor', merchantSort: 'Estabelecimento (A–Z)',
    clear: 'Limpar filtros', apply: 'Aplicar filtros', close: 'Fechar filtros',
    amountError: 'Informe valores válidos em reais.', rangeError: 'O valor ou a data inicial não pode superar o final.'
  },
  en: {
    title: 'Filter documents', subtitle: 'Combine criteria to find the right document.',
    merchant: 'Merchant', merchantExample: 'e.g. pharmacy, grocery...',
    category: 'Purchase category', categoryAll: 'All categories',
    type: 'File type', typeAll: 'All', pdf: 'PDF', image: 'Images',
    analysis: 'Analysis status', analysisAll: 'Any', ready: 'Data identified',
    partial: 'Partial data', text_only: 'Text only', pending: 'Awaiting analysis', failed: 'Failed',
    date: 'Date range', byDocument: 'Document date', byUpload: 'Upload date',
    from: 'From', to: 'To', amount: 'Amount (BRL)', min: 'Minimum', max: 'Maximum',
    amountHelp: 'Enter Brazilian reais, e.g. 50,00 or 1.250,90.',
    sort: 'Sort by', newest: 'Newest upload', oldest: 'Oldest upload',
    document_newest: 'Document date: newest', document_oldest: 'Document date: oldest',
    amount_high: 'Highest amount', amount_low: 'Lowest amount', merchantSort: 'Merchant (A–Z)',
    clear: 'Clear filters', apply: 'Apply filters', close: 'Close filters',
    amountError: 'Enter a valid amount in Brazilian reais.', rangeError: 'Start value or date cannot exceed the end.'
  }
};

export default function DocumentFilters({
  language, value, onApply, onClose
}: {
  language: 'pt' | 'en';
  value: DocumentFilterValues;
  onApply: (filters: DocumentFilterValues) => void;
  onClose: () => void;
}) {
  const t = labels[language];
  const [draft, setDraft] = useState<DocumentFilterValues>(value);
  const [error, setError] = useState<null | 'amount' | 'range'>(null);
  const reducedMotion = useReducedMotion();
  const update = <K extends keyof DocumentFilterValues>(key: K, next: DocumentFilterValues[K]) => {
    setDraft(old => ({ ...old, [key]: next })); setError(null);
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateDocumentFilters(draft);
    if (invalid) { setError(invalid); return; }
    onApply(draft);
  };
  const input = 'min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 sm:text-sm';
  const legend = 'mb-2 block text-xs font-semibold text-slate-600';

  return <motion.div
    className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section
      role="dialog" aria-modal="true" aria-labelledby="arqvo-filter-title"
      initial={reducedMotion ? {} : { y: 36, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={reducedMotion ? {} : { y: 22, opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : .2 }}
      className="flex max-h-[94dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:max-h-[88dvh] sm:rounded-[26px]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-brand"><SlidersHorizontal size={18}/>
            <h2 id="arqvo-filter-title" className="text-lg font-semibold text-ink">{t.title}</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.close}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
          <X size={20}/>
        </button>
      </div>
      <form onSubmit={apply} className="flex min-h-0 flex-1 flex-col" id="arqvo-document-filters">
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <div>
            <label htmlFor="arqvo-merchant" className={legend}>{t.merchant}</label>
            <input id="arqvo-merchant" value={draft.merchant} maxLength={150} placeholder={t.merchantExample}
              className={input} onChange={e => update('merchant', e.target.value)}/>
          </div>
          <div>
            <label htmlFor="arqvo-category" className={legend}>{t.category}</label>
            <select id="arqvo-category" value={draft.category}
              onChange={e => update('category', e.target.value as DocumentFilterValues['category'])}
              className={input}>
              <option value="all">{t.categoryAll}</option>
              {categoryOptions(language).map(item =>
                <option key={item.value} value={item.value}>{item.label}</option>
              )}
            </select>
          </div>
          <div>
            <p className={legend}>{t.type}</p>
            <div className="grid grid-cols-3 gap-2">
              {([['all', t.typeAll], ['pdf', t.pdf], ['image', t.image]] as const).map(([key,label]) =>
                <button type="button" key={key} onClick={() => update('type', key)}
                  aria-pressed={draft.type === key}
                  className={'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ' +
                    (draft.type === key ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-500 hover:border-indigo-200')}>
                  {draft.type === key && <Check size={14}/>} {label}
                </button>)}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="arqvo-analysis" className={legend}>{t.analysis}</label>
              <select id="arqvo-analysis" value={draft.analysis} onChange={e => update('analysis', e.target.value as DocumentFilterValues['analysis'])} className={input}>
                <option value="all">{t.analysisAll}</option>
                <option value="ready">{t.ready}</option>
                <option value="partial">{t.partial}</option>
                <option value="text_only">{t.text_only}</option>
                <option value="pending">{t.pending}</option>
                <option value="failed">{t.failed}</option>
              </select>
            </div>
            <div>
              <label htmlFor="arqvo-sort" className={legend}>{t.sort}</label>
              <select id="arqvo-sort" value={draft.sort} onChange={e => update('sort', e.target.value as DocumentFilterValues['sort'])} className={input}>
                <option value="newest">{t.newest}</option>
                <option value="oldest">{t.oldest}</option>
                <option value="document_newest">{t.document_newest}</option>
                <option value="document_oldest">{t.document_oldest}</option>
                <option value="amount_high">{t.amount_high}</option>
                <option value="amount_low">{t.amount_low}</option>
                <option value="merchant">{t.merchantSort}</option>
              </select>
            </div>
          </div>
          <div>
            <p className={legend}><CalendarDays size={14} className="mr-1 inline"/> {t.date}</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {([['document', t.byDocument], ['uploaded', t.byUpload]] as const).map(([key,label]) =>
                <button type="button" key={key} onClick={() => update('dateBy', key)}
                  aria-pressed={draft.dateBy === key}
                  className={'min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ' +
                    (draft.dateBy === key ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-600')}>
                  {label}
                </button>)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="arqvo-date-start" className={legend}>{t.from}</label>
                <input id="arqvo-date-start" type="date" value={draft.dateFrom} className={input}
                  onChange={e => update('dateFrom', e.target.value)}/></div>
              <div><label htmlFor="arqvo-date-end" className={legend}>{t.to}</label>
                <input id="arqvo-date-end" type="date" value={draft.dateTo} className={input}
                  onChange={e => update('dateTo', e.target.value)}/></div>
            </div>
          </div>
          <div>
            <p className={legend}>{t.amount}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="arqvo-amount-from" className={legend}>{t.min}</label>
                <input id="arqvo-amount-from" type="text" inputMode="decimal" value={draft.amountFrom}
                  placeholder="0,00" className={input} onChange={e => update('amountFrom', e.target.value)} /></div>
              <div><label htmlFor="arqvo-amount-to" className={legend}>{t.max}</label>
                <input id="arqvo-amount-to" type="text" inputMode="decimal" value={draft.amountTo}
                  placeholder="500,00" className={input} onChange={e => update('amountTo', e.target.value)} /></div>
            </div>
            <p className="mt-2 text-xs text-slate-400">{t.amountHelp}</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === 'amount' ? t.amountError : t.rangeError}
          </p>}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <button type="button" onClick={() => { setDraft({ ...emptyDocumentFilters }); setError(null); }}
            className="min-h-12 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-600">
            {t.clear}
          </button>
          <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white">
            <FileSearch size={16}/>{t.apply}
          </button>
        </div>
      </form>
    </motion.section>
  </motion.div>;
}
