import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Check, Crop, Hand, LoaderCircle, RotateCw, ScanLine, Search, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';
import { FULL_CROP, scanPreview, type ScanCrop, type ScanOptions } from './documentScanner';

type Language = 'pt' | 'en';
type Props = {
  file: File;
  language: Language;
  onClose: () => void;
  onConfirm: (options: ScanOptions) => void;
};
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Mode = Handle | 'move' | 'new' | 'pan';
type Position = { x: number; y: number };
type Drag = { mode: Mode; start: Position; initial: ScanCrop; pan: Position };
type Lens = { x: number; y: number; point: Position; width: number; height: number };

const handles: { key: Handle; x: number; y: number; pt: string; en: string }[] = [
  { key: 'nw', x: 0, y: 0, pt: 'Canto superior esquerdo', en: 'Top left corner' },
  { key: 'n', x: .5, y: 0, pt: 'Borda superior', en: 'Top edge' },
  { key: 'ne', x: 1, y: 0, pt: 'Canto superior direito', en: 'Top right corner' },
  { key: 'e', x: 1, y: .5, pt: 'Borda direita', en: 'Right edge' },
  { key: 'se', x: 1, y: 1, pt: 'Canto inferior direito', en: 'Bottom right corner' },
  { key: 's', x: .5, y: 1, pt: 'Borda inferior', en: 'Bottom edge' },
  { key: 'sw', x: 0, y: 1, pt: 'Canto inferior esquerdo', en: 'Bottom left corner' },
  { key: 'w', x: 0, y: .5, pt: 'Borda esquerda', en: 'Left edge' }
];

const labels = {
  pt: {
    title: 'Digitalizar documento',
    help: 'Arraste as bolinhas para ajustar as bordas. Arraste dentro do quadro para movê-lo.',
    crop: 'Ajustar recorte', full: 'Imagem inteira', rotate: 'Girar 90°',
    enhance: 'Melhorar leitura', save: 'Digitalizar e salvar', cancel: 'Cancelar',
    reading: 'Reconhecendo texto no dispositivo…', preparing: 'Preparando imagem…',
    fallback: 'Não foi possível preparar a prévia. O original permanece intacto.',
    close: 'Fechar', zoom: 'Ampliar imagem', move: 'Mover imagem',
    detected: 'Documento detectado automaticamente. Confira as bordas.',
    notDetected: 'Não foi possível detectar as bordas com segurança. Ajuste manualmente.',
    detectAgain: 'Detectar documento', original: 'Imagem original'
  },
  en: {
    title: 'Scan document',
    help: 'Drag the round handles to adjust the edges. Drag inside the frame to move it.',
    crop: 'Adjust crop', full: 'Full image', rotate: 'Rotate 90°',
    enhance: 'Improve readability', save: 'Scan and save', cancel: 'Cancel',
    reading: 'Recognizing text on your device…', preparing: 'Preparing image…',
    fallback: 'Could not prepare the preview. Your original remains unchanged.',
    close: 'Close', zoom: 'Zoom image', move: 'Move image',
    detected: 'Document automatically detected. Check the edges.',
    notDetected: 'Could not reliably detect the edges. Adjust them manually.',
    detectAgain: 'Detect document', original: 'Original image'
  }
};

const minSize = .075;
const clamp = (value: number, lower: number, upper: number) => Math.min(upper, Math.max(lower, value));

function resizeCrop(initial: ScanCrop, handle: Handle, dx: number, dy: number): ScanCrop {
  let left = initial.x;
  let top = initial.y;
  let right = initial.x + initial.width;
  let bottom = initial.y + initial.height;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - minSize);
  if (handle.includes('e')) right = clamp(right + dx, left + minSize, 1);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - minSize);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + minSize, 1);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export default function DocumentScannerModal({ file, language, onClose, onConfirm }: Props) {
  const t = labels[language];
  const [rotation, setRotation] = useState(0);
  const [enhance, setEnhance] = useState(true);
  const [crop, setCrop] = useState<ScanCrop>(FULL_CROP);
  const [suggestion, setSuggestion] = useState<ScanCrop | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const [lens, setLens] = useState<Lens | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const keepSelectionRef = useRef(false);

  useEffect(() => {
    let active = true;
    const preserveSelection = keepSelectionRef.current;
    keepSelectionRef.current = false;
    setError('');
    void scanPreview(file, { rotation, enhance, crop: FULL_CROP })
      .then(result => {
        if (!active) return;
        setPreview(result.src);
        setSuggestion(result.suggestedCrop);
        if (!preserveSelection) setCrop(result.suggestedCrop ?? FULL_CROP);
      })
      .catch(() => { if (active) setError(t.fallback); });
    return () => { active = false; };
  }, [file, rotation, enhance]);

  useEffect(() => {
    const keyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [onClose]);

  function point(clientX: number, clientY: number): Position {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1)
    };
  }
  function clampPan(next: Position): Position {
    const editor = editorRef.current;
    if (!editor) return next;
    const maxX = Math.max(0, (zoom - 1) * editor.offsetWidth / 2);
    const maxY = Math.max(0, (zoom - 1) * editor.offsetHeight / 2);
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }
  function startDrag(event: PointerEvent<HTMLElement>, mode: Mode) {
    if (!preview || dragRef.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    const editor = editorRef.current;
    if (!editor) return;
    dragRef.current = {
      mode, start: mode === 'pan' ? { x: event.clientX, y: event.clientY } : point(event.clientX, event.clientY),
      initial: crop, pan
    };
    editor.setPointerCapture(event.pointerId);
    if (mode !== 'pan' && mode !== 'move') updateLens(event);
  }
  function backgroundDown(event: PointerEvent<HTMLDivElement>) {
    if (panMode && zoom > 1) return startDrag(event, 'pan');
    const p = point(event.clientX, event.clientY);
    const inside = p.x >= crop.x && p.x <= crop.x + crop.width &&
      p.y >= crop.y && p.y <= crop.y + crop.height;
    startDrag(event, inside ? 'move' : 'new');
  }
  function updateLens(event: PointerEvent<HTMLElement>) {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setLens({
      x: clamp(event.clientX + 22, 8, window.innerWidth - 116),
      y: clamp(event.clientY - 138, 8, window.innerHeight - 116),
      point: point(event.clientX, event.clientY),
      width: editorRef.current?.offsetWidth || rect.width,
      height: editorRef.current?.offsetHeight || rect.height
    });
  }
  function dragging(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    if (drag.mode === 'pan') {
      setPan(clampPan({
        x: drag.pan.x + event.clientX - drag.start.x,
        y: drag.pan.y + event.clientY - drag.start.y
      }));
      return;
    }
    const now = point(event.clientX, event.clientY);
    const dx = now.x - drag.start.x;
    const dy = now.y - drag.start.y;
    if (drag.mode === 'move') {
      setCrop({
        ...drag.initial,
        x: clamp(drag.initial.x + dx, 0, 1 - drag.initial.width),
        y: clamp(drag.initial.y + dy, 0, 1 - drag.initial.height)
      });
    } else if (drag.mode === 'new') {
      const left = Math.min(drag.start.x, now.x);
      const top = Math.min(drag.start.y, now.y);
      setCrop({
        x: left, y: top,
        width: Math.max(.005, Math.abs(now.x - drag.start.x)),
        height: Math.max(.005, Math.abs(now.y - drag.start.y))
      });
    } else {
      setCrop(resizeCrop(drag.initial, drag.mode, dx, dy));
    }
    if (drag.mode !== 'move') updateLens(event);
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === 'new') {
      const now = point(event.clientX, event.clientY);
      if (Math.abs(now.x - drag.start.x) < minSize || Math.abs(now.y - drag.start.y) < minSize) {
        setCrop(drag.initial);
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setLens(null);
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, handle: Handle) {
    const dx = event.key === 'ArrowLeft' ? -.01 : event.key === 'ArrowRight' ? .01 : 0;
    const dy = event.key === 'ArrowUp' ? -.01 : event.key === 'ArrowDown' ? .01 : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    setCrop(previous => resizeCrop(previous, handle, dx, dy));
  }
  function changeZoom(next: number) {
    setZoom(next);
    setPan({ x: 0, y: 0 });
    if (next === 1) setPanMode(false);
  }
  function scan() {
    // All expensive work happens in the visible queue, after this modal closes.
    onConfirm({ rotation, enhance, crop });
  }

  const cropChanged = crop.x > .001 || crop.y > .001 ||
    crop.width < .999 || crop.height < .999;
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-5"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={t.title}
      className="flex max-h-[98dvh] w-full max-w-[690px] flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:max-h-[95dvh] sm:rounded-[26px]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ScanLine size={20} className="text-brand"/>{t.title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.help}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.close}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20}/></button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-900 p-3 text-center sm:p-5">
        {preview ? <div className="relative inline-block max-w-full overflow-hidden rounded-xl bg-slate-800 align-middle shadow-lg"
          style={{ touchAction: 'none' }}>
          <div ref={editorRef} className="relative inline-block max-w-full select-none"
            style={{ transformOrigin: 'center center',
              transform: 'translate(' + pan.x + 'px, ' + pan.y + 'px) scale(' + zoom + ')' }}>
            <img src={preview} alt={file.name} draggable={false}
              className="block max-h-[51dvh] max-w-full select-none object-contain"/>
            <div className={'absolute inset-0 touch-none ' + (panMode && zoom > 1 ? 'cursor-grab' : 'cursor-crosshair')}
              onPointerDown={backgroundDown}
              onPointerMove={dragging}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}>
              <div className="pointer-events-none absolute border-2 border-indigo-300"
                style={{
                  left: crop.x * 100 + '%', top: crop.y * 100 + '%',
                  width: crop.width * 100 + '%', height: crop.height * 100 + '%',
                  boxShadow: '0 0 0 9999px rgba(6, 12, 26, 0.52)'
                }}>
                <div className="absolute inset-0 border border-white/80"/>
                <div className="absolute inset-y-0 left-1/3 border-l border-white/45"/>
                <div className="absolute inset-y-0 left-2/3 border-l border-white/45"/>
                <div className="absolute inset-x-0 top-1/3 border-t border-white/45"/>
                <div className="absolute inset-x-0 top-2/3 border-t border-white/45"/>
              </div>
              {handles.map(handle => <button type="button" key={handle.key}
                disabled={panMode}
                aria-label={handle[language]}
                title={handle[language]}
                onPointerDown={event => startDrag(event, handle.key)}
                onKeyDown={event => handleKey(event, handle.key)}
                className="absolute z-10 flex size-10 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none"
                style={{
                  left: (crop.x + crop.width * handle.x) * 100 + '%',
                  top: (crop.y + crop.height * handle.y) * 100 + '%',
                  cursor: handle.key + '-resize'
                }}>
                <span className="size-3.5 rounded-full border-[2.5px] border-indigo-600 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.75)] ring-1 ring-white"/>
              </button>)}
            </div>
          </div>
        </div> : <div className="flex min-h-44 items-center justify-center text-sm text-slate-200">
          {error || <><LoaderCircle size={18} className="mr-2 animate-spin"/>{t.preparing}</>}
        </div>}
      </div>

      <div className="shrink-0 space-y-3 border-t border-slate-100 px-5 py-3.5 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        {preview && <p className="text-xs text-slate-500" role="status">
          {suggestion ? <Check size={14} className="mr-1 inline text-emerald-600"/> : <Crop size={14} className="mr-1 inline"/>}
          {suggestion ? t.detected : t.notDetected}
        </p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!suggestion} onClick={() => {
            if (suggestion) { setCrop(suggestion); changeZoom(1); }
          }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-indigo-300 disabled:opacity-40">
            <Search size={16}/>{t.detectAgain}
          </button>
          <button type="button" disabled={!cropChanged} onClick={() => setCrop(FULL_CROP)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-indigo-300 disabled:opacity-40">
            <Crop size={16}/>{t.full}
          </button>
          <button type="button" onClick={() => {
            setRotation(value => (value + 90) % 360);
            setCrop(FULL_CROP);
            changeZoom(1);
          }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-indigo-300 disabled:opacity-40">
            <RotateCw size={16}/>{t.rotate}
          </button>
          <button type="button" aria-pressed={enhance} onClick={() => {
            keepSelectionRef.current = true;
            setEnhance(value => !value);
          }} className={'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold disabled:opacity-40 ' +
            (enhance ? 'border-indigo-200 bg-indigo-50 text-brand' : 'border-slate-200 text-slate-700')}>
            {enhance ? <Check size={16}/> : <Sparkles size={16}/>} {t.enhance}
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
          <ZoomOut size={17} className="shrink-0 text-slate-500"/>
          <input type="range" aria-label={t.zoom} min={1} max={3} step={.1} value={zoom}
            onChange={event => changeZoom(Number(event.target.value))}
            className="min-w-0 flex-1 accent-indigo-600"/>
          <ZoomIn size={17} className="shrink-0 text-slate-500"/>
          <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
          <button type="button" disabled={zoom === 1} aria-pressed={panMode}
            onClick={() => setPanMode(value => !value)}
            aria-label={t.move} title={t.move}
            className={'flex size-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-40 ' +
              (panMode ? 'bg-indigo-100 text-brand' : 'bg-white text-slate-500')}>
            <Hand size={18}/>
          </button>
        </div>
        {error && <p role="alert" className="text-xs text-amber-700">{error}</p>}
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button type="button" onClick={onClose}
            className="min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40">{t.cancel}</button>
          <button type="button" disabled={!preview} onClick={scan}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">
            <ScanLine size={18}/>{t.save}
          </button>
        </div>
      </div>
      {lens && preview && <div className="pointer-events-none fixed z-[120] size-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        aria-hidden="true"
        style={{
          left: lens.x, top: lens.y,
          backgroundImage: 'url("' + preview + '")',
          backgroundRepeat: 'no-repeat',
          backgroundSize: lens.width * 2.8 + 'px ' + lens.height * 2.8 + 'px',
          backgroundPosition: (56 - lens.point.x * lens.width * 2.8) + 'px ' +
            (56 - lens.point.y * lens.height * 2.8) + 'px'
        }}>
        <div className="absolute left-1/2 top-0 h-full border-l border-indigo-600/80"/>
        <div className="absolute left-0 top-1/2 w-full border-t border-indigo-600/80"/>
        <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-700 bg-white"/>
      </div>}
    </section>
  </div>;
}
