import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Archive, ArrowRight, ChevronDown, FileText, FolderLock, LayoutDashboard, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import AuthPanel, { type AuthStatus, type Profile } from './AuthPanel';
import VaultPanel from './VaultPanel';
import OverviewPanel from './OverviewPanel';

type Language = 'pt' | 'en';
type Section = 'overview' | 'documents';

const copy = {
  pt: {
    loading: 'Preparando seu espaço...', retry: 'Tentar novamente',
    unavailable: 'Não foi possível conectar à autenticação. Seus arquivos continuam protegidos.',
    overview: 'Visão geral', documents: 'Documentos', logout: 'Sair', privacy: 'Privacidade',
    heroTag: 'Seu arquivo pessoal, inteligente e privado',
    hero: 'Seus documentos, sempre à mão.',
    subtitle: 'Guarde notas fiscais, comprovantes e recibos. Encontre o que precisa sem procurar em pastas intermináveis.',
    step1: 'Originais protegidos', detail1: 'Arquivos guardados em armazenamento privado, acessíveis apenas pela sua conta.',
    step2: 'Extração automática', detail2: 'Após o upload, a IA tenta identificar estabelecimento, data e valor para facilitar a organização.',
    step3: 'Pesquisa inteligente', detail3: 'Pesquise por texto ou descreva o documento que está procurando.',
    beta: 'Versão beta — mantenha uma cópia independente dos documentos importantes.',
    powered: 'Open source · Cloudflare · Render · Neon'
  },
  en: {
    loading: 'Preparing your workspace...', retry: 'Try again',
    unavailable: 'Unable to reach authentication. Your documents remain protected.',
    overview: 'Overview', documents: 'Documents', logout: 'Sign out', privacy: 'Privacy',
    heroTag: 'Your private, intelligent document space',
    hero: 'Every document, right where you need it.',
    subtitle: 'Keep receipts, invoices and payment records together. Find what matters without digging through folders.',
    step1: 'Private originals', detail1: 'Files stored privately and accessible only through your account.',
    step2: 'Automatic extraction', detail2: 'After uploading, AI looks for the merchant, date and amount to make organization easier.',
    step3: 'Intelligent search', detail3: 'Search by keyword or describe the document you are looking for.',
    beta: 'Beta release — keep an independent backup of important files.',
    powered: 'Open source · Cloudflare · Render · Neon'
  }
};

export default function App() {
  const [language, setLanguage] = useState<Language>('pt');
  const [section, setSection] = useState<Section>('overview');
  const reducedMotion = useReducedMotion();
  const chooseSection = (next: Section) => {
    setSection(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [reload, setReload] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setConnectionError(false);
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    const headers = { Accept: 'application/json' };
    Promise.allSettled([
      fetch('/api/auth/status', { headers, cache: 'no-store', signal: controller.signal })
        .then(async response => response.ok ? response.json() : null),
      fetch('/api/me', { headers, credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
        .then(async response => response.ok ? response.json() : null)
    ]).then(([status, account]) => {
      if (controller.signal.aborted) return;
      const result = status.status === 'fulfilled' ? status.value : null;
      const profile = account.status === 'fulfilled' ? account.value?.user : null;
      if (result?.enabled) setAuthStatus(result as AuthStatus);
      else if (!profile?.id) setConnectionError(true);
      if (profile?.id) setUser(profile as Profile);
    }).finally(() => {
      window.clearTimeout(timeout);
      setChecking(false);
    });
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [reload]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error('Sign out failed');
      setUser(null);
      chooseSection('overview');
    } catch {
      setConnectionError(true);
    } finally {
      setSigningOut(false);
    }
  }

  const logo = <span className="inline-flex items-center gap-2.5">
    <span className="flex size-10 items-center justify-center rounded-[13px] bg-brand text-white"><Archive size={22} strokeWidth={2.1}/></span>
    <span className="text-2xl font-bold tracking-[-0.045em] text-ink">arqvo<span className="text-brand">.</span></span>
  </span>;
  const languageButton = <button onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300"
    aria-label="Change language">
    {language === 'pt' ? 'PT-BR' : 'EN'}<ChevronDown size={14}/>
  </button>;


  const enter = reducedMotion ? {} : { opacity: 0, y: 12 };
  const leave = reducedMotion ? {} : { opacity: 0, y: -8 };

  return <AnimatePresence mode="wait">
    {checking ? <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-center bg-canvas" aria-live="polite">
      <div className="flex items-center gap-3 text-brand">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white"><Archive size={25}/></div>
        <span className="text-3xl font-semibold tracking-tight">arqvo<span className="text-brand">.</span></span>
      </div>
      <div className="mt-8 h-1 w-36 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label="Carregando Arqvo">
        <motion.div className="h-full w-12 rounded-full bg-brand" initial={{ x: -48 }}
          animate={{ x: 144 }} transition={{ duration: .8, ease: 'easeInOut', repeat: Infinity }}/>
      </div>
      <p className="mt-4 text-xs text-slate-400">{t.loading}</p>
    </motion.div> : !user && (connectionError || !authStatus) ?
    <motion.div key="error" initial={enter} animate={{ opacity: 1, y: 0 }} exit={leave}
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {logo}
      <div className="mt-7 max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <ShieldCheck size={28} className="mx-auto text-brand"/>
        <p className="mt-4 text-sm text-slate-600">{t.unavailable}</p>
        <button onClick={() => setReload(x => x + 1)}
          className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white">{t.retry}</button>
      </div>
    </motion.div> : !user ?
    <motion.div key="login" initial={enter} animate={{ opacity: 1, y: 0 }} exit={leave} className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1520px] items-center justify-between gap-4 px-5 sm:px-8">
          {logo}
          <div className="flex items-center gap-4">{languageButton}
            <a href={language === 'pt' ? 'https://github.com/gabrielduclos/arqvo/blob/main/PRIVACY.pt-BR.md' : 'https://github.com/gabrielduclos/arqvo/blob/main/PRIVACY.md'}
              target="_blank" rel="noreferrer" className="hidden text-xs font-semibold text-slate-500 hover:text-brand sm:block">{t.privacy}</a>
          </div>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1260px] lg:grid-cols-[1fr_470px]">
        <div className="relative hidden overflow-hidden px-12 py-20 lg:flex lg:flex-col lg:justify-center">
          <div className="absolute left-24 top-12 size-64 rounded-full bg-indigo-200/50 blur-3xl" aria-hidden="true"/>
          <div className="relative max-w-lg">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-semibold text-brand"><Sparkles size={15}/>{t.heroTag}</div>
            <h1 className="text-5xl font-semibold leading-[1.13] tracking-[-0.055em] text-ink">{t.hero}</h1>
            <p className="mt-6 max-w-md text-base leading-8 text-slate-500">{t.subtitle}</p>
            <div className="mt-10 space-y-7">
              {[
                { icon: FolderLock, name: t.step1, detail: t.detail1 },
                { icon: Sparkles, name: t.step2, detail: t.detail2 },
                { icon: ArrowRight, name: t.step3, detail: t.detail3 }
              ].map(({ icon: Icon, name, detail }) => <div key={name} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-sm"><Icon size={20}/></span>
                <div><h2 className="text-sm font-semibold">{name}</h2><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{detail}</p></div>
              </div>)}
            </div>
          </div>
          <div className="relative mt-14 max-w-md border-t border-slate-200 pt-5 text-xs leading-5 text-slate-400">{t.beta}</div>
        </div>
        <div className="flex items-center justify-center px-5 py-9 sm:px-8 lg:py-14">
          <AuthPanel language={language} status={authStatus!}
            onAuthChange={(profile) => { setUser(profile); chooseSection('overview'); }} />
        </div>
      </main>
    </motion.div> :
    <motion.div key="app" initial={reducedMotion ? {} : { opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} className="min-h-[100dvh] bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-2 px-4 sm:px-6 md:h-[72px] lg:px-8">
          <button onClick={() => chooseSection('overview')} aria-label="Arqvo home" className="shrink-0 rounded-xl">
            {logo}
          </button>
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100 p-1 md:flex"
            aria-label={language === 'pt' ? 'Navegação principal' : 'Main navigation'}>
            {([
              ['overview', t.overview, LayoutDashboard],
              ['documents', t.documents, FileText]
            ] as const).map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => chooseSection(key)}
                aria-current={section === key ? 'page' : undefined}
                className={'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ' +
                  (section === key ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-ink')}>
                <Icon size={17} strokeWidth={1.9}/>{label}
              </button>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-32 truncate text-xs font-medium text-slate-500 xl:inline">{user.name}</span>
            {languageButton}
            <button onClick={signOut} disabled={signingOut} aria-label={t.logout} title={t.logout}
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-50">
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-[1200px] px-4 pb-32 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pb-14 lg:pt-10">
        {connectionError && <div role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t.unavailable}</div>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={section} initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : .22, ease: 'easeOut' }}>
            {section === 'overview'
              ? <OverviewPanel language={language} onOpenDocuments={() => chooseSection('documents')}/>
              : <VaultPanel language={language} email={user.email}/>}
          </motion.div>
        </AnimatePresence>
        <footer className="mt-12 hidden flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400 md:flex">
          <span>© 2026 Arqvo · MIT · {t.beta}</span>
          <a href="https://github.com/gabrielduclos/arqvo" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand">{t.powered}<ArrowRight size={13}/></a>
        </footer>
      </main>
      <nav aria-label={language === 'pt' ? 'Navegação principal' : 'Main navigation'}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 shadow-[0_-8px_32px_rgba(25,27,42,0.06)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto grid h-[68px] max-w-lg grid-cols-2 gap-2 px-4 pt-1">
          {([
            ['overview', t.overview, LayoutDashboard],
            ['documents', t.documents, FileText]
          ] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => chooseSection(key)}
              aria-current={section === key ? 'page' : undefined}
              className={'relative flex min-h-[56px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[11px] font-semibold transition-colors ' +
                (section === key ? 'text-brand' : 'text-slate-500 active:bg-slate-100')}>
              {section === key && <motion.span layoutId="mobile-nav-active" transition={{ type: 'spring', bounce: .18, duration: .32 }}
                className="absolute inset-x-3 inset-y-1 rounded-2xl bg-brand-soft" aria-hidden="true"/>}
              <Icon size={21} strokeWidth={section === key ? 2.3 : 1.9} className="relative z-10"/>
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </motion.div>}
  </AnimatePresence>;
}