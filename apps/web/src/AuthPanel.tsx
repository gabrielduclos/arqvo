import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole, Mail, UserRound, ArrowRight, Eye, EyeOff } from 'lucide-react';

type Language = 'pt' | 'en';
export type AuthStatus = {
  enabled: boolean;
  registrationAvailable: boolean;
  emailVerificationRequired: boolean;
  passwordRecoveryAvailable: boolean;
};
type Mode = 'login' | 'register' | 'forgot' | 'reset';
export type Profile = { id: string; name: string; email: string };
type Result = { ok: boolean; body: Record<string, unknown> };

const phrases = {
  pt: {
    heading: 'Acesse seu Arqvo', register: 'Crie sua conta', forgot: 'Recuperar senha',
    reset: 'Defina uma nova senha', name: 'Nome', email: 'E-mail', password: 'Senha',
    newPassword: 'Nova senha', login: 'Entrar', create: 'Cadastrar', send: 'Enviar link',
    confirm: 'Redefinir senha', forgotLink: 'Esqueci minha senha', signup: 'Criar conta',
    back: 'Voltar ao login', pending: 'Confira seu e-mail para continuar.',
    sent: 'Se houver uma conta, enviaremos instruções por e-mail.',
    changed: 'Senha atualizada. Você pode entrar novamente.',
    invalid: 'Não foi possível concluir a solicitação. Confira seus dados e tente novamente.',
    min: 'Use pelo menos 8 caracteres.', logout: 'Sair da conta', welcome: 'Sessão iniciada',
    demo: 'Seus arquivos reais ficarão disponíveis após o login.',
    secure: 'Acesso protegido com Better Auth',
    unavailable: 'Link de recuperação inválido ou ausente.',
    processing: 'Processando…'
  },
  en: {
    heading: 'Sign in to Arqvo', register: 'Create an account', forgot: 'Reset your password',
    reset: 'Set a new password', name: 'Name', email: 'Email', password: 'Password',
    newPassword: 'New password', login: 'Sign in', create: 'Create account', send: 'Send reset link',
    confirm: 'Reset password', forgotLink: 'Forgot password?', signup: 'Create account',
    back: 'Back to sign in', pending: 'Check your email to continue.',
    sent: 'If an account exists, we will email instructions.',
    changed: 'Password updated. You can sign in again.',
    invalid: 'We could not complete that request. Check your details and retry.',
    min: 'Use at least 8 characters.', logout: 'Sign out', welcome: 'Signed in',
    demo: 'Your own documents are available after signing in.',
    secure: 'Protected by Better Auth',
    unavailable: 'Invalid or missing password reset link.',
    processing: 'Processing…'
  }
};

async function request(path: string, payload: object): Promise<Result> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, body: typeof body === 'object' && body !== null ? body as Record<string, unknown> : {} };
}

export default function AuthPanel({ language, status, onAuthChange }: {
  language: Language; status: AuthStatus;
  onAuthChange: (user: Profile | null) => void
}) {
  const t = phrases[language];
  const token = new URLSearchParams(window.location.search).get('token');
  const [mode, setMode] = useState<Mode>(() => window.location.pathname === '/reset-password' ? 'reset' : 'login');
  const [user, setUser] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (active && data?.user) setUser(data.user as Profile); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  function changeMode(next: Mode) {
    setMode(next);
    setMessage('');
    setError('');
    setPassword('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    if (mode !== 'forgot' && password.length < 8) {
      setError(t.min);
      setBusy(false);
      return;
    }
    if (mode === 'reset' && !token) {
      setError(t.unavailable);
      setBusy(false);
      return;
    }
    try {
      const operation = mode === 'register' ? '/api/auth/sign-up/email'
        : mode === 'forgot' ? '/api/auth/request-password-reset'
        : mode === 'reset' ? '/api/auth/reset-password'
        : '/api/auth/sign-in/email';
      const payload = mode === 'register' ? { name, email, password, callbackURL: '/' }
        : mode === 'forgot' ? { email, redirectTo: window.location.origin + '/reset-password' }
        : mode === 'reset' ? { token, newPassword: password }
        : { email, password };
      const result = await request(operation, payload);
      setPassword('');
      if (!result.ok) {
        setError(t.invalid);
      } else if (mode === 'login') {
        const account = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.ok ? r.json() : null);
        if (account?.user) {
          setUser(account.user as Profile);
          onAuthChange(account.user as Profile);
        } else setMessage(t.pending);
      } else if (mode === 'forgot') {
        setMessage(t.sent);
      } else if (mode === 'register') {
        setMessage(t.pending);
      } else {
        window.history.replaceState(null, '', '/');
        changeMode('login');
        setMessage(t.changed);
      }
    } catch {
      setError(t.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const result = await request('/api/auth/sign-out', {});
      if (result.ok) {
        setUser(null);
        onAuthChange(null);
        changeMode('login');
      } else setError(t.invalid);
    } catch { setError(t.invalid); }
    finally { setBusy(false); }
  }

  return (
    <div className="w-full max-w-[470px]">
      <section aria-label={t.heading}
        className="w-full rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[28px] sm:p-9">
        <div className="flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><LockKeyhole size={23}/></div>
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-semibold text-brand">Arqvo</span>
        </div>
        {user ? (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold">{t.welcome}</h2>
            <p className="mt-2 text-sm font-medium text-slate-700">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
            <p className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm leading-relaxed text-slate-600">{t.demo}</p>
            <button type="button" onClick={signOut} disabled={busy} className="mt-6 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t.logout}</button>
          </div>
        ) : (
          <>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">{mode === 'register' ? t.register : mode === 'forgot' ? t.forgot : mode === 'reset' ? t.reset : t.heading}</h2>
            <p className="mt-2 text-sm text-slate-500">{t.secure}</p>
            <form onSubmit={submit} className="mt-6 space-y-5 sm:space-y-4">
              {mode === 'register' && (
                <label className="block text-xs font-semibold text-slate-600">{t.name}
                  <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><UserRound size={17} className="text-slate-400"/><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="min-w-0 flex-1 text-base outline-none sm:text-sm" /></span>
                </label>
              )}
              {mode !== 'reset' && (
                <label className="block text-xs font-semibold text-slate-600">{t.email}
                  <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><Mail size={17} className="text-slate-400"/><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="min-w-0 flex-1 text-base outline-none sm:text-sm" /></span>
                </label>
              )}
              {mode !== 'forgot' && (
                <label className="block text-xs font-semibold text-slate-600">{mode === 'reset' ? t.newPassword : t.password}
                  <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><LockKeyhole size={17} className="text-slate-400"/><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className="min-w-0 flex-1 text-base outline-none sm:text-sm" /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)} className="text-slate-400">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span>
                </label>
              )}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700">{message}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {busy ? t.processing : mode === 'register' ? t.create : mode === 'forgot' ? t.send : mode === 'reset' ? t.confirm : t.login}
                {!busy && <ArrowRight size={17}/>}
              </button>
            </form>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-brand sm:text-xs">
              {mode === 'login' ? (
                <>
                  {status.passwordRecoveryAvailable && <button type="button" onClick={() => changeMode('forgot')}>{t.forgotLink}</button>}
                  {status.registrationAvailable && <button type="button" onClick={() => changeMode('register')}>{t.signup}</button>}
                </>
              ) : <button type="button" onClick={() => changeMode('login')}>{t.back}</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
