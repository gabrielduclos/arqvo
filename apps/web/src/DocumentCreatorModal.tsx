import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowDown, ArrowUp, Camera, FileText, Images, LoaderCircle, ScanLine, Trash2, X } from 'lucide-react';
import DocumentScannerModal from './DocumentScannerModal';

type Page = { id: string; image: Blob; url: string; text: string; confidence: number };
type Language = 'pt' | 'en';
type Props = { language: Language; onClose: () => void; onCreate: (file: File, scan: { text: string; confidence: number }) => void };
const supported = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PAGES = 15;
const MAX_BYTES = 20 * 1024 * 1024;
const messages = {
  pt: { heading: 'Scanner de documentos', details: 'Fotografe ou importe as páginas. Ajuste o recorte de cada uma e gere um único PDF.',
    camera: 'Fotografar página', gallery: 'Adicionar imagens', name: 'Nome do documento', page: 'Página', pages: 'páginas',
    empty: 'Adicione a primeira página.', create: 'Gerar PDF e adicionar à fila', creating: 'Gerando documento…',
    close: 'Fechar', up: 'Mover para cima', down: 'Mover para baixo', remove: 'Remover página',
    limit: 'O limite é de 15 páginas.', fileType: 'Envie imagens JPG, PNG ou WebP.',
    large: 'O PDF ultrapassou 20 MB. Remova algumas páginas.', error: 'Falha ao gerar PDF. Tente novamente.' },
  en: { heading: 'Document scanner', details: 'Photograph or import pages. Adjust each crop and create one PDF.',
    camera: 'Take page photo', gallery: 'Add images', name: 'Document name', page: 'Page', pages: 'pages',
    empty: 'Add your first page.', create: 'Create PDF and add to queue', creating: 'Creating document…',
    close: 'Close', up: 'Move up', down: 'Move down', remove: 'Remove page',
    limit: 'Maximum 15 pages.', fileType: 'Choose JPG, PNG or WebP images.',
    large: 'PDF exceeds 20 MB. Remove some pages.', error: 'Could not create PDF. Try again.' }
};

export default function DocumentCreatorModal({ language, onClose, onCreate }: Props) {
  const t = messages[language];
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const livePages = useRef<Page[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [active, setActive] = useState<File | null>(null);
  const [name, setName] = useState(language === 'pt' ? 'Documento digitalizado' : 'Scanned document');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { livePages.current = pages; }, [pages]);
  useEffect(() => () => livePages.current.forEach(page => URL.revokeObjectURL(page.url)), []);
  useEffect(() => {
    if (!active && pending.length && !creating) {
      setActive(pending[0]);
      setPending(current => current.slice(1));
    }
  }, [active, pending, creating]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !active && !creating) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, creating, onClose]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!selected.length) return;
    if (selected.some(file => !supported.has(file.type))) { setError(t.fileType); return; }
    if (pages.length + pending.length + Number(!!active) + selected.length > MAX_PAGES) { setError(t.limit); return; }
    setError('');
    setPending(current => [...current, ...selected]);
  }
  function addPage(image: Blob, text: string, confidence: number) {
    setPages(current => [...current, { id: crypto.randomUUID(), image, url: URL.createObjectURL(image), text, confidence }]);
    setActive(null);
  }
  function remove(id: string) {
    setPages(current => {
      const found = current.find(page => page.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return current.filter(page => page.id !== id);
    });
  }
  function move(index: number, offset: number) {
    setPages(current => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  async function generate() {
    if (!pages.length || creating || active || pending.length) return;
    setCreating(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      for (const page of pages) {
        const image = await pdf.embedJpg(await page.image.arrayBuffer());
        const landscape = image.width > image.height;
        const width = landscape ? 841.89 : 595.28, height = landscape ? 595.28 : 841.89;
        const scale = Math.min((width - 36) / image.width, (height - 36) / image.height);
        const scaledWidth = image.width * scale, scaledHeight = image.height * scale;
        pdf.addPage([width, height]).drawImage(image, {
          x: (width - scaledWidth) / 2, y: (height - scaledHeight) / 2,
          width: scaledWidth, height: scaledHeight
        });
      }
      const bytes = await pdf.save({ useObjectStreams: true });
      if (bytes.byteLength > MAX_BYTES) { setError(t.large); return; }
      const filename = (name.trim() || 'Documento digitalizado')
        .replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 180) + '.pdf';
      const file = new File([new Uint8Array(bytes)], filename, { type: 'application/pdf' });
      const text = pages.map((page, index) => 'Página ' + (index + 1) + '\n' + page.text).join('\n\n').slice(0, 25000);
      const confidences = pages.filter(page => page.text.trim()).map(page => page.confidence);
      const confidence = confidences.length
        ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length) : 0;
      onCreate(file, { text, confidence });
    } catch { setError(t.error); }
    finally { setCreating(false); }
  }

  return <>
    <div className="fixed inset-0 z-[82] flex items-end justify-center bg-slate-950/65 sm:items-center sm:p-5"
      onMouseDown={event => { if (event.target === event.currentTarget && !creating && !active) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={t.heading}
        className="flex max-h-[97dvh] w-full max-w-[650px] flex-col overflow-hidden rounded-t-[27px] bg-white shadow-2xl sm:max-h-[93dvh] sm:rounded-[27px]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ScanLine size={21} className="text-brand"/>{t.heading}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t.details}</p></div>
          <button type="button" disabled={creating} onClick={onClose} aria-label={t.close}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 disabled:opacity-40"><X size={20}/></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={creating || pages.length + pending.length + Number(!!active) >= MAX_PAGES}
              onClick={() => cameraRef.current?.click()}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-brand disabled:opacity-40">
              <Camera size={20}/>{t.camera}</button>
            <button type="button" disabled={creating || pages.length + pending.length + Number(!!active) >= MAX_PAGES}
              onClick={() => galleryRef.current?.click()}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-40">
              <Images size={20}/>{t.gallery}</button>
            <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={pick}/>
            <input ref={galleryRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={pick}/>
          </div>
          <label className="block text-xs font-semibold text-slate-600">{t.name}
            <input type="text" value={name} onChange={event => setName(event.target.value)} maxLength={180} disabled={creating}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-brand"/></label>
          {!pages.length ? <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-slate-500">
            <FileText size={32} className="mx-auto mb-3 text-indigo-300"/><p className="text-sm">{t.empty}</p></div>
            : <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">{pages.length} {t.pages}</p>
              {pages.map((page, index) => <div key={page.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                <img src={page.url} alt={t.page + ' ' + (index + 1)} className="size-16 shrink-0 rounded-lg bg-slate-50 object-contain"/>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.page} {index + 1}</p>
                  <p className="mt-1 text-xs text-slate-500">{page.text.trim() ? 'OCR ✓' : 'OCR —'}</p>
                </div>
                <button type="button" aria-label={t.up} disabled={index === 0 || creating}
                  onClick={() => move(index, -1)} className="flex size-9 items-center justify-center text-slate-500 disabled:opacity-30">
                  <ArrowUp size={17}/></button>
                <button type="button" aria-label={t.down} disabled={index === pages.length - 1 || creating}
                  onClick={() => move(index, 1)} className="flex size-9 items-center justify-center text-slate-500 disabled:opacity-30">
                  <ArrowDown size={17}/></button>
                <button type="button" aria-label={t.remove} disabled={creating} onClick={() => remove(page.id)}
                  className="flex size-9 items-center justify-center text-red-500 disabled:opacity-30"><Trash2 size={17}/></button>
              </div>)}
            </div>}
          {pending.length > 0 && <p role="status" className="text-xs text-slate-500">{pending.length} {t.pages} aguardando ajuste</p>}
          {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-slate-100 px-5 py-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          <button type="button" disabled={!pages.length || creating || !!active || !!pending.length}
            onClick={() => void generate()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
            {creating ? <LoaderCircle size={18} className="animate-spin"/> : <FileText size={18}/>}
            {creating ? t.creating : t.create}
          </button>
        </div>
      </section>
    </div>
    {active && <DocumentScannerModal key={active.name + active.lastModified} file={active}
      language={language} onClose={() => setActive(null)} onPage={addPage}/>}
  </>;
}
