import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Check, Crop, LoaderCircle, RotateCw, ScanLine, Sparkles, X } from 'lucide-react';
import { FULL_CROP, readScan, scanPreview, type ScanCrop } from './documentScanner';

type Language = 'pt' | 'en';
type Props = {
  file: File;
  language: Language;
  onClose: () => void;
  onScanned: (text: string, confidence: number) => void;
};

const labels = {
  pt: {
    title: 'Digitalizar documento',
    help: 'O recorte é sugerido automaticamente quando possível. Arraste para ajustar; o original será preservado.',
    crop: 'Recortar', clear: 'Remover corte', rotate: 'Girar 90°', enhance: 'Melhorar leitura',
    save: 'Digitalizar e salvar', cancel: 'Cancelar',
    reading: 'Reconhecendo texto no dispositivo…',
    preparing: 'Preparando imagem…',
    fallback: 'OCR local indisponível. O Arqvo tentará a leitura por IA depois de salvar.',
    close: 'Fechar'
  },
  en: {
    title: 'Scan document',
    help: 'A crop is suggested automatically when possible. Drag to adjust it; the original file is preserved.',
    crop: 'Crop', clear: 'Clear crop', rotate: 'Rotate 90°', enhance: 'Improve readability',
    save: 'Scan and save', cancel: 'Cancel',
    reading: 'Recognizing text on your device…',
    preparing: 'Preparing image…',
    fallback: 'Local OCR unavailable. Arqvo will try AI extraction after saving.',
    close: 'Close'
  }
};

export default function DocumentScannerModal({ file, language, onClose, onScanned }: Props) {
  const t = labels[language];
  const [rotation, setRotation] = useState(0);
  const [enhance, setEnhance] = useState(true);
  const [crop, setCrop] = useState<ScanCrop>(FULL_CROP);
  const [preview, setPreview] = useState('');
  const [processing, setProcessing] = useState(false);
  const [percentage, setPercentage] = useState(0);
  const [error, setError] = useState('');
  const selectionStart = useRef<{x: number; y: number} | null>(null);

  useEffect(() => {
    let active = true;
    void scanPreview(file, { rotation, enhance, crop: FULL_CROP })
      .then(result => {
        if (active) { setPreview(result.src); setCrop(result.suggestedCrop ?? FULL_CROP); }
      })
      .catch(() => { if (active) setError(t.fallback); });
    return () => { active = false; };
  }, [file, rotation, enhance]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processing) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, processing]);

  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function beginCrop(event: PointerEvent<HTMLDivElement>) {
    if (processing || !preview) return;
    const start = point(event);
    selectionStart.current = start;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCrop({ x: start.x, y: start.y, width: 0, height: 0 });
  }

  function updateCrop(event: PointerEvent<HTMLDivElement>) {
    if (!selectionStart.current) return;
    const start = selectionStart.current;
    const end = point(event);
    setCrop({
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y)
    });
  }

  function finishCrop(event: PointerEvent<HTMLDivElement>) {
    if (!selectionStart.current) return;
    updateCrop(event);
    const start = selectionStart.current;
    const end = point(event);
    selectionStart.current = null;
    if (Math.abs(start.x - end.x) < 0.04 || Math.abs(start.y - end.y) < 0.04) setCrop(FULL_CROP);
  }

  async function scan() {
    if (processing) return;
    setProcessing(true);
    setError('');
    setPercentage(0);
    try {
      const result = await readScan(file, { rotation, enhance, crop }, setPercentage);
      onScanned(result.text, result.confidence);
    } catch {
      onScanned('', 0);
    } finally {
      setProcessing(false);
    }
  }

  const isCropped = crop.x > 0 || crop.y > 0 || crop.width < 1 || crop.height < 1;
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-5"
    onMouseDown={event => { if (event.target === event.currentTarget && !processing) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={t.title}
      className="flex max-h-[98dvh] w-full max-w-[650px] flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:max-h-[95dvh] sm:rounded-[26px]">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><ScanLine size={20} className="text-brand"/>{t.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.help}</p>
        </div>
        <button type="button" disabled={processing} onClick={onClose} aria-label={t.close}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20}/></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 text-center sm:p-5">
        {preview ? <div className="relative inline-flex max-w-full select-none shadow-lg">
          <img src={preview} className="block max-h-[53dvh] max-w-full object-contain" alt={file.name} draggable={false}/>
          <div className="absolute inset-0 cursor-crosshair touch-none"
            aria-label={t.crop}
            onPointerDown={beginCrop} onPointerMove={updateCrop} onPointerUp={finishCrop} onPointerCancel={finishCrop}>
            {isCropped && <div className="pointer-events-none absolute border-2 border-indigo-500 bg-indigo-500/10 ring-1 ring-white"
              style={{ left: crop.x * 100 + '%', top: crop.y * 100 + '%',
                width: crop.width * 100 + '%', height: crop.height * 100 + '%' }}/>}
          </div>
        </div> : <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
          {error || <><LoaderCircle size={18} className="mr-2 animate-spin"/>{t.preparing}</>}
        </div>}
      </div>
      <div className="shrink-0 space-y-3 border-t border-slate-100 px-5 py-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={processing} onClick={() => {
            setRotation(value => (value + 90) % 360); setCrop(FULL_CROP);
          }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">
            <RotateCw size={16}/>{t.rotate}
          </button>
          <button type="button" disabled={!isCropped || processing} onClick={() => setCrop(FULL_CROP)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">
            <Crop size={16}/>{t.clear}
          </button>
          <button type="button" aria-pressed={enhance} disabled={processing} onClick={() => setEnhance(v => !v)}
            className={'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold disabled:opacity-40 ' +
              (enhance ? 'border-indigo-200 bg-indigo-50 text-brand' : 'border-slate-200 text-slate-700')}>
            {enhance ? <Check size={16}/> : <Sparkles size={16}/>} {t.enhance}
          </button>
        </div>
        {processing && <div role="status" className="text-sm text-brand">
          <div className="mb-1 flex justify-between"><span>{t.reading}</span><span>{percentage}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full bg-brand transition-all" style={{ width: percentage + '%' }}/>
          </div>
        </div>}
        {error && <p role="alert" className="text-xs text-amber-700">{error}</p>}
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button type="button" disabled={processing} onClick={onClose}
            className="min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40">{t.cancel}</button>
          <button type="button" disabled={processing} onClick={() => void scan()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">
            {processing ? <LoaderCircle size={18} className="animate-spin"/> : <ScanLine size={18}/>}
            {processing ? t.reading : t.save}
          </button>
        </div>
      </div>
    </section>
  </div>;
}
