import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import AuthPanel, { type AuthStatus } from './AuthPanel';
import VaultPanel from './VaultPanel';
import {
  Archive, ArrowDownToLine, ArrowRight, CalendarDays, CheckCircle2,
  ChevronDown, FileImage, FileText, FolderOpen, LayoutDashboard, LockKeyhole,
  Menu, Plus, ReceiptText, Search, ShieldCheck, Sparkles,
  X
} from 'lucide-react';

type Language = 'pt' | 'en';
type Category = 'all' | 'invoice' | 'receipt' | 'payment';
type View = 'dashboard' | 'documents' | 'vault';
type ExampleDoc = {
  id: string;
  merchant: string;
  titlePT: string;
  titleEN: string;
  kind: Exclude<Category, 'all'>;
  date: string;
  cents: number;
  format: 'PDF' | 'JPG';
};

const docs: ExampleDoc[] = [
  { id: '1', merchant: 'Mercado Central', titlePT: 'Compra do mês', titleEN: 'Grocery shopping', kind: 'invoice', date: '2026-11-15', cents: 24890, format: 'PDF' },
  { id: '2', merchant: 'Farmácia Bem Estar', titlePT: 'Medicamentos', titleEN: 'Pharmacy purchase', kind: 'receipt', date: '2026-11-12', cents: 6840, format: 'JPG' },
  { id: '3', merchant: 'Energia Paulista', titlePT: 'Conta de energia', titleEN: 'Electricity bill', kind: 'payment', date: '2026-11-08', cents: 18735, format: 'PDF' },
  { id: '4', merchant: 'Oficina Norte', titlePT: 'Manutenção preventiva', titleEN: 'Preventive maintenance', kind: 'invoice', date: '2026-10-24', cents: 35000, format: 'PDF' },
  { id: '5', merchant: 'Livraria Aurora', titlePT: 'Compra de livros', titleEN: 'Book purchase', kind: 'receipt', date: '2026-10-18', cents: 8990, format: 'JPG' },
];

const dictionary = {
  pt: {
    navHome: 'Visão geral', navDocs: 'Documentos', yourSpace: 'Seu espaço',
    prototype: 'Protótipo público', product: 'Organização inteligente',
    hello: 'Tudo em seu lugar.', intro: 'Seus comprovantes, recibos e notas fiscais em um só lugar — prontos para encontrar quando você precisar.',
    highlight: 'Encontre qualquer documento, sem complicação.',
    subtitle: 'Uma experiência pensada para transformar documentos espalhados em informações fáceis de localizar.',
    newDocument: 'Adicionar documento', search: 'Pesquisar documentos', searchHint: 'Ex.: farmácia, R$ 350, energia...',
    examples: 'Documentos de demonstração', samples: 'Dados fictícios, apenas para explorar a interface.',
    all: 'Todos', invoice: 'Notas fiscais', receipt: 'Recibos', payment: 'Comprovantes',
    latest: 'Documentos recentes', seeAll: 'Ver todos', merchant: 'Estabelecimento', date: 'Data',
    amount: 'Valor', kind: 'Tipo', format: 'Formato', found: 'documentos encontrados',
    none: 'Nenhum exemplo corresponde à sua busca.', clear: 'Limpar filtros',
    preview: 'Detalhes do documento', previewHelp: 'Prévia ilustrativa, sem arquivo real anexado.',
    download: 'Baixar arquivo original', unavailable: 'Download disponível quando o armazenamento seguro for implementado.',
    documentSecurity: 'Privacidade em primeiro lugar', secureText: 'Os arquivos reais serão armazenados de forma privada, com acesso exclusivo ao proprietário.',
    capture: 'Capture', captureText: 'Fotografe ou envie PDFs.',
    organize: 'Organize', organizeText: 'Localize por dados e filtros.',
    retrieve: 'Recupere', retrieveText: 'Abra e baixe o original.',
    inDevelopment: 'Em desenvolvimento', demoToast: 'Esta é uma demonstração visual. Upload e armazenamento seguro serão implementados nas próximas versões.',
    back: 'Voltar', openSource: 'Código aberto no GitHub', future: 'Em breve', recent: 'Exemplos', noRealFiles: 'Nenhum arquivo pessoal é coletado nesta demonstração.',
    dashboardTitle: 'Um novo jeito de organizar', dashboardSubtitle: 'Mais clareza. Menos tempo procurando.',
    cards: 'Documentos', months: 'Período demonstrado', saved: 'Arquivos reais armazenados',
    monthsValue: 'Out – Nov/26', savedValue: 'Nenhum', technical: 'Infraestrutura', techValue: 'Cloudflare + Render + Neon',
    learnMore: 'Conhecer o projeto', production: 'Este é um ambiente de demonstração — ainda não é um cofre de documentos pronto para uso.'
  },
  en: {
    navHome: 'Overview', navDocs: 'Documents', yourSpace: 'Your workspace',
    prototype: 'Public prototype', product: 'Intelligent organization',
    hello: 'Everything in its place.', intro: 'Your receipts, invoices and payment records in one place — ready to find when you need them.',
    highlight: 'Find any document, effortlessly.',
    subtitle: 'An experience designed to turn scattered documents into information you can retrieve in seconds.',
    newDocument: 'Add document', search: 'Search documents', searchHint: 'e.g., pharmacy, R$ 350, electricity...',
    examples: 'Example documents', samples: 'Fictional data, only for exploring the interface.',
    all: 'All', invoice: 'Invoices', receipt: 'Receipts', payment: 'Payments',
    latest: 'Recent documents', seeAll: 'See all', merchant: 'Merchant', date: 'Date',
    amount: 'Amount', kind: 'Type', format: 'Format', found: 'documents found',
    none: 'No examples match your search.', clear: 'Clear filters',
    preview: 'Document details', previewHelp: 'Illustrative preview, no real file attached.',
    download: 'Download original file', unavailable: 'Downloads will be available once secure storage is implemented.',
    documentSecurity: 'Privacy first', secureText: 'Real files will be stored privately, accessible only by their owner.',
    capture: 'Capture', captureText: 'Take a photo or upload PDFs.',
    organize: 'Organize', organizeText: 'Find documents using filters.',
    retrieve: 'Retrieve', retrieveText: 'Preview and download originals.',
    inDevelopment: 'In development', demoToast: 'This is a visual demo. Secure uploads and storage will be implemented in future versions.',
    back: 'Back', openSource: 'Open source on GitHub', future: 'Coming soon', recent: 'Examples', noRealFiles: 'No personal files are collected in this demo.',
    dashboardTitle: 'A simpler way to organize', dashboardSubtitle: 'More clarity. Less searching.',
    cards: 'Documents', months: 'Example period', saved: 'Real files stored',
    monthsValue: 'Oct – Nov/26', savedValue: 'None', technical: 'Infrastructure', techValue: 'Cloudflare + Render + Neon',
    learnMore: 'Explore the project', production: 'This is a demo environment — not yet a production-ready document vault.'
  }
};

const categories: Category[] = ['all', 'invoice', 'receipt', 'payment'];

export default function App() {
  const [language, setLanguage] = useState<Language>('pt');
  const [view, setView] = useState<View>('dashboard');
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const t = dictionary[language];

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), reducedMotion ? 0 : 500);
    return () => window.clearTimeout(timeout);
  }, [reducedMotion]);

  useEffect(() => {
    // Auth status is non-blocking: public demo loads even if Render Free is sleeping.
    const controller = new AbortController();
    const stop = window.setTimeout(() => controller.abort(), 12000);
    fetch('/api/auth/status', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(status => {
        if (status?.enabled) {
          setAuthStatus(status as AuthStatus);
          if (window.location.pathname === '/reset-password') setShowAuth(true);
        }
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(stop));
    return () => { controller.abort(); window.clearTimeout(stop); };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) })
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (active && body?.user?.id) {
          setSessionUser(body.user);
          setView('vault');
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleAuthChange = (user: { id: string; name: string; email: string } | null) => {
    setSessionUser(user);
    setShowAuth(false);
    setView(user ? 'vault' : 'dashboard');
  };

  const displayed = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    const numbers = normalized.replace(/[^0-9]/g, '');
    return docs.filter((doc) => {
      if (category !== 'all' && category !== doc.kind) return false;
      if (!normalized) return true;
      const text = [doc.merchant, doc.titlePT, doc.titleEN, doc.date, doc.format, dictionary.pt[doc.kind], dictionary.en[doc.kind]].join(' ').toLocaleLowerCase();
      return text.includes(normalized) || (numbers.length > 0 && String(doc.cents / 100).includes(normalized.replace(',', '.'))) || (numbers.length > 0 && String(doc.cents).includes(numbers));
    });
  }, [category, search]);

  const selected = docs.find((doc) => doc.id === selectedId) ?? null;
  const money = (value: number) => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: 'BRL' }).format(value / 100);
  const date = (value: string) => new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
  const chooseView = (next: View) => { setView(next); setMobileMenu(false); setSelectedId(null); };
  const focusSearch = () => { if (sessionUser) { chooseView('vault'); } else { chooseView('documents'); requestAnimationFrame(() => searchRef.current?.focus()); } };
  const nav = (key: View, label: string, Icon: typeof LayoutDashboard) => (
    <button key={key} onClick={() => chooseView(key)}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${view === key ? 'bg-brand-soft text-brand' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
      <Icon size={18} strokeWidth={1.9} />{label}
    </button>
  );

  return (
    <AnimatePresence mode="wait">
      {!ready ? (
        <motion.div key="splash" className="flex min-h-screen flex-col items-center justify-center bg-canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="polite">
          <div className="flex items-center gap-3 text-brand"><div className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white"><Archive size={25} /></div><span className="text-3xl font-semibold tracking-tight">arqvo<span className="text-brand">.</span></span></div>
          <div className="mt-8 h-1 w-36 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label="Carregando Arqvo"><motion.div className="h-full w-12 rounded-full bg-brand" initial={{ x: -48 }} animate={{ x: 144 }} transition={{ duration: .8, ease: 'easeInOut', repeat: Infinity }} /></div>
        </motion.div>
      ) : (
        <motion.div key="app" initial={reducedMotion ? {} : { opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex h-[72px] max-w-[1520px] items-center justify-between gap-4 px-5 sm:px-8">
              <div className="flex items-center gap-3">
                <button className="rounded-lg p-1 text-slate-600 md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu"><Menu size={23} /></button>
                <button className="flex items-center gap-2" onClick={() => chooseView('dashboard')} aria-label="Arqvo home">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm"><Archive size={21} strokeWidth={2.2} /></span>
                  <span className="text-[24px] font-bold tracking-tight">arqvo<span className="text-brand">.</span></span>
                </button>
                <span className="ml-3 hidden rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand sm:inline-flex">{t.prototype}</span>
              </div>
              <div className="flex items-center gap-3">
                <a href="https://github.com/gabrielduclos/arqvo" target="_blank" rel="noreferrer" className="hidden items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand sm:inline-flex"><span>{t.openSource}</span><ArrowRight size={15} /></a>
                {authStatus?.enabled && (
                  <button onClick={() => sessionUser ? chooseView('vault') : setShowAuth(true)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                    {sessionUser ? <FolderOpen size={15} /> : <LockKeyhole size={15}/>}
                    {sessionUser ? (language === 'pt' ? 'Meus arquivos' : 'My files') : (language === 'pt' ? 'Entrar' : 'Sign in')}
                  </button>
                )}
                <button onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')} aria-label="Change language" className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand">
                  {language === 'pt' ? 'PT-BR' : 'EN'}<ChevronDown size={14} />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto flex max-w-[1520px]">
            <aside className={`${mobileMenu ? 'fixed inset-x-0 top-[72px] z-20 block shadow-lg' : 'hidden'} w-full border-b border-slate-200 bg-white px-5 py-8 md:sticky md:top-[72px] md:block md:h-[calc(100vh-72px)] md:w-[252px] md:shrink-0 md:border-b-0 md:border-r md:px-6 md:shadow-none`}>
              <p className="mb-5 px-4 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">{t.yourSpace}</p>
              <nav className="space-y-2" aria-label="Main navigation">
                {nav('dashboard', t.navHome, LayoutDashboard)}
                {nav('documents', t.navDocs, FolderOpen)}
                {sessionUser && nav('vault', language === 'pt' ? 'Meus arquivos' : 'My files', LockKeyhole)}
                {sessionUser && <button onClick={() => setShowAuth(true)} className="mt-3 rounded-xl px-4 py-2 text-xs text-slate-500 hover:text-brand">{sessionUser.email}</button>}
              </nav>
              <div className="mt-10 rounded-2xl bg-indigo-50 p-4">
                <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-white text-brand"><ShieldCheck size={19} /></div>
                <p className="text-sm font-bold">{t.documentSecurity}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.secureText}</p>
              </div>
              <p className="mt-6 px-2 text-[11px] leading-relaxed text-slate-400">{t.production}</p>
            </aside>

            <main className="min-w-0 flex-1 px-5 pb-14 pt-8 sm:px-8 lg:px-12 lg:pt-12">
              {view === 'dashboard' && (
                <section>
                  <div className="relative overflow-hidden rounded-[28px] bg-[#201d42] px-7 py-9 text-white sm:px-10 sm:py-12">
                    <div className="absolute -right-12 -top-24 size-64 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
                    <div className="absolute -bottom-24 right-28 size-56 rounded-full bg-violet-400/20 blur-3xl" aria-hidden />
                    <div className="relative z-10 max-w-[590px]">
                      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"><Sparkles size={14} /> {t.product}</span>
                      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-[44px]">{t.hello}</h1>
                      <p className="mt-4 max-w-[460px] text-sm leading-relaxed text-indigo-100/85 sm:text-base">{t.intro}</p>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <button onClick={focusSearch} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#28224c] transition hover:bg-indigo-50"><Search size={17} />{t.search}</button>
                        <button onClick={() => setToast(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><Plus size={18} />{t.newDocument}</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-7 grid gap-4 sm:grid-cols-3">
                    {[{ label: t.cards, value: String(docs.length).padStart(2, '0'), icon: FileText }, { label: t.months, value: t.monthsValue, icon: CalendarDays }, { label: t.saved, value: t.savedValue, icon: LockKeyhole }].map(({label, value, icon: Icon}) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-brand"><Icon size={19}/></div>
                        <p className="text-xs font-medium text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-12 flex items-center justify-between gap-4">
                    <div><h2 className="text-xl font-semibold tracking-tight">{t.latest}</h2><p className="mt-1 text-sm text-slate-500">{t.samples}</p></div>
                    <button onClick={() => chooseView('documents')} className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand">{t.seeAll}<ArrowRight size={16}/></button>
                  </div>
                  <DocumentList items={docs.slice(0, 3)} language={language} onSelect={setSelectedId} date={date} money={money} />
                  <div className="mt-9 grid gap-4 sm:grid-cols-3">
                    {[{ icon: FileImage, title: t.capture, text: t.captureText }, { icon: Sparkles, title: t.organize, text: t.organizeText }, { icon: ArrowDownToLine, title: t.retrieve, text: t.retrieveText }].map(({icon: Icon,title,text}) => (
                      <div key={title} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={19}/></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p></div></div>
                    ))}
                  </div>
                </section>
              )}

              {view === 'vault' && sessionUser && (
                <VaultPanel language={language} email={sessionUser.email} />
              )}

              {view === 'documents' && (
                <section>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"><Sparkles size={13}/>{t.prototype}</span>
                      <h1 className="text-3xl font-semibold tracking-tight">{t.navDocs}</h1>
                      <p className="mt-2 max-w-[530px] text-sm leading-relaxed text-slate-500">{t.samples}</p>
                    </div>
                    <button onClick={() => setToast(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"><Plus size={17}/>{t.newDocument}</button>
                  </div>

                  <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <label htmlFor="search-docs" className="mb-2 block text-xs font-semibold text-slate-500">{t.search}</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-indigo-100"><Search className="shrink-0 text-slate-400" size={19}/><input ref={searchRef} id="search-docs" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchHint} className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"/></div>
                    <div className="mt-5 flex flex-wrap gap-2" aria-label="Document category">
                      {categories.map((cat) => <button key={cat} onClick={() => setCategory(cat)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${category === cat ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}>{t[cat]}</button>)}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <div><h2 className="text-lg font-semibold">{t.examples}</h2><p className="mt-1 text-xs text-slate-500">{displayed.length} {t.found}</p></div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500"><ShieldCheck size={14}/>{t.noRealFiles}</span>
                  </div>
                  {displayed.length > 0
                    ? <DocumentList items={displayed} language={language} onSelect={setSelectedId} date={date} money={money} />
                    : <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center"><Search size={28} className="mx-auto text-slate-300"/><p className="mt-4 text-sm text-slate-600">{t.none}</p><button className="mt-3 text-sm font-semibold text-brand" onClick={() => {setSearch('');setCategory('all');}}>{t.clear}</button></div>}
                </section>
              )}

              <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400">
                <span>© 2026 Arqvo · MIT · {t.inDevelopment}</span>
                <a href="https://github.com/gabrielduclos/arqvo" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand">{t.learnMore}<ArrowRight size={13}/></a>
              </footer>
            </main>
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedId(null)}>
                <motion.div role="dialog" aria-modal="true" aria-label={t.preview} className="w-full max-w-[480px] rounded-3xl bg-white p-6 shadow-xl sm:p-8" onClick={(e) => e.stopPropagation()} initial={reducedMotion ? {} : { y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: 20 }}>
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-brand">{t.prototype}</span><button onClick={() => setSelectedId(null)} aria-label="Close preview" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
                  <div className="mt-5 flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 text-brand"><FileText size={36} strokeWidth={1.5}/><p className="mt-2 text-xs font-medium">{t.previewHelp}</p></div>
                  <h2 className="mt-6 text-xl font-semibold">{language === 'pt' ? selected.titlePT : selected.titleEN}</h2><p className="mt-1 text-sm text-slate-500">{selected.merchant}</p>
                  <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
                    <div><p className="text-xs text-slate-500">{t.amount}</p><p className="mt-1 font-semibold">{money(selected.cents)}</p></div>
                    <div><p className="text-xs text-slate-500">{t.date}</p><p className="mt-1 font-semibold">{date(selected.date)}</p></div>
                    <div><p className="text-xs text-slate-500">{t.kind}</p><p className="mt-1 font-semibold">{t[selected.kind]}</p></div>
                    <div><p className="text-xs text-slate-500">{t.format}</p><p className="mt-1 font-semibold">{selected.format}</p></div>
                  </div>
                  <button disabled title={t.unavailable} className="mt-6 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"><LockKeyhole size={16}/>{t.download}</button>
                  <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">{t.unavailable}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {toast && (
              <motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-5 left-5 right-5 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl">
                <CheckCircle2 className="mt-0.5 shrink-0 text-brand" size={20}/><p className="flex-1 text-sm leading-relaxed text-slate-700">{t.demoToast}</p><button onClick={() => setToast(false)} aria-label="Dismiss"><X size={18} className="text-slate-400"/></button>
              </motion.div>
            )}
          </AnimatePresence>
          {showAuth && authStatus?.enabled && <AuthPanel language={language} status={authStatus} onClose={() => setShowAuth(false)} onAuthChange={handleAuthChange} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DocumentList({ items, language, onSelect, date, money }: {
  items: ExampleDoc[];
  language: Language;
  onSelect: (id: string) => void;
  date: (value: string) => string;
  money: (value: number) => string;
}) {
  return <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    {items.map((doc, index) => (
      <button key={doc.id} onClick={() => onSelect(doc.id)} className={`flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-indigo-50/60 sm:px-6 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${doc.format === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-brand'}`}>
          {doc.format === 'PDF' ? <ReceiptText size={21} strokeWidth={1.8}/> : <FileImage size={21} strokeWidth={1.8}/>}
        </span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{language === 'pt' ? doc.titlePT : doc.titleEN}</span><span className="mt-1 block truncate text-xs text-slate-500">{doc.merchant} · {date(doc.date)}</span></span>
        <span className="shrink-0 text-right"><span className="block text-sm font-semibold text-slate-800">{money(doc.cents)}</span><span className="mt-1 block text-[11px] text-slate-400">{doc.format}</span></span>
        <ArrowRight size={17} className="ml-1 shrink-0 text-slate-300"/>
      </button>
    ))}
  </div>;
}
