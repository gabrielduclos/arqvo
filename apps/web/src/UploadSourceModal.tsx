import { useEffect, useRef } from 'react';
import { Camera, FolderOpen, Images, ScanLine, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

type Language = 'pt' | 'en';
export type UploadSource = 'camera' | 'gallery' | 'file' | 'scanner';

const copy = {
  pt: {
    heading: 'Adicionar documento',
    description: 'De onde deseja selecionar o documento?',
    scanner: 'Scanner · Criar PDF', scannerDetail: 'Digitalizar várias páginas em um único documento',
    camera: 'Câmera', cameraDetail: 'Fotografar um documento agora',
    gallery: 'Galeria', galleryDetail: 'Selecionar várias imagens para processamento em fila',
    file: 'Arquivo', fileDetail: 'Selecionar PDFs ou imagens dos arquivos',
    close: 'Fechar'
  },
  en: {
    heading: 'Add a document',
    description: 'Where would you like to select it from?',
    scanner: 'Scanner · Create PDF', scannerDetail: 'Scan multiple pages into a single document',
    camera: 'Camera', cameraDetail: 'Take a photo of the document',
    gallery: 'Photo library', galleryDetail: 'Select multiple images for queued processing',
    file: 'Files', fileDetail: 'Choose PDFs or images from your files',
    close: 'Close'
  }
};

export default function UploadSourceModal({
  language, onSelect, onClose
}: {
  language: Language;
  onSelect: (source: UploadSource) => void;
  onClose: () => void;
}) {
  const t = copy[language];
  const reducedMotion = useReducedMotion();
  const firstOption = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', keyDown);
    firstOption.current?.focus();
    return () => document.removeEventListener('keydown', keyDown);
  }, [onClose]);

  return <motion.div key="upload-source"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section role="dialog" aria-modal="true" aria-labelledby="arqvo-upload-source-title"
      aria-describedby="arqvo-upload-source-description"
      initial={reducedMotion ? {} : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? {} : { opacity: 0, y: 16 }}
      transition={{ duration: reducedMotion ? 0 : .22, ease: 'easeOut' }}
      className="w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-[26px] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="arqvo-upload-source-title" className="text-lg font-semibold text-ink sm:text-xl">{t.heading}</h2>
          <p id="arqvo-upload-source-description" className="mt-1 text-sm text-slate-500">{t.description}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.close}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100">
          <X size={20}/>
        </button>
      </div>
      <div className="space-y-2.5">
        {([
          { key: 'scanner', title: t.scanner, subtitle: t.scannerDetail, Icon: ScanLine },
          { key: 'camera', title: t.camera, subtitle: t.cameraDetail, Icon: Camera },
          { key: 'gallery', title: t.gallery, subtitle: t.galleryDetail, Icon: Images },
          { key: 'file', title: t.file, subtitle: t.fileDetail, Icon: FolderOpen }
        ] as const).map(({key, title, subtitle, Icon}, index) => (
          <button key={key} type="button" ref={index === 0 ? firstOption : undefined}
            onClick={() => onSelect(key)}
            className="flex min-h-[76px] w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-brand-soft">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon size={22} strokeWidth={1.9} aria-hidden="true"/>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    </motion.section>
  </motion.div>;
}
