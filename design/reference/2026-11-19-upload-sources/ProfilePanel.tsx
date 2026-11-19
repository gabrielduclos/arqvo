import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, LoaderCircle, UserRound } from 'lucide-react';
import type { Profile } from './AuthPanel';

type Language = 'pt' | 'en';

const copy = {
  pt: {
    title: 'Meu perfil', intro: 'Seus dados de acesso e segurança da conta.',
    account: 'Dados da conta', name: 'Nome', email: 'E-mail',
    security: 'Alterar senha', securityHint: 'Para continuar, confirme sua senha atual.',
    current: 'Senha atual', next: 'Nova senha', confirm: 'Confirmar nova senha',
    minimum: 'A nova senha deve ter pelo menos 8 caracteres.',
    mismatch: 'A confirmação não corresponde à nova senha.',
    reuse: 'Escolha uma senha diferente da atual.',
    required: 'Preencha todos os campos.',
    saving: 'Salvando…', save: 'Salvar nova senha',
    success: 'Senha alterada com sucesso. As outras sessões foram encerradas.',
    incorrect: 'A senha atual está incorreta.',
    unavailable: 'Não foi possível alterar a senha. Tente novamente.',
    session: 'Ao alterar a senha, as outras sessões da sua conta serão encerradas.',
    reveal: 'Mostrar senha', conceal: 'Ocultar senha'
  },
  en: {
    title: 'My profile', intro: 'Your account details and access security.',
    account: 'Account details', name: 'Name', email: 'Email',
    security: 'Change password', securityHint: 'Confirm your current password to continue.',
    current: 'Current password', next: 'New password', confirm: 'Confirm new password',
    minimum: 'The new password must have at least 8 characters.',
    mismatch: 'The confirmation does not match the new password.',
    reuse: 'Choose a password different from your current one.',
    required: 'Fill in all fields.',
    saving: 'Saving…', save: 'Save new password',
    success: 'Password changed successfully. Other sessions have been signed out.',
    incorrect: 'Your current password is incorrect.',
    unavailable: 'Unable to change your password. Please try again.',
    session: 'Changing your password will sign out your other account sessions.',
    reveal: 'Show password', conceal: 'Hide password'
  }
};

function PasswordField({
  id, label, value, onChange, autoComplete, language
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete: 'current-password' | 'new-password';
  language: Language;
}) {
  const [visible, setVisible] = useState(false);
  const t = copy[language];
  return <div>
    <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <div className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
      <LockKeyhole size={17} className="shrink-0 text-slate-400" aria-hidden="true"/>
      <input id={id} type={visible ? 'text' : 'password'}
        required autoComplete={autoComplete} autoCapitalize="off" spellCheck={false}
        value={value} onChange={event => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none sm:text-sm"/>
      <button type="button" onClick={() => setVisible(old => !old)}
        aria-label={visible ? t.conceal : t.reveal}
        aria-pressed={visible}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-brand">
        {visible ? <EyeOff size={18}/> : <Eye size={18}/>}
      </button>
    </div>
  </div>;
}

export default function ProfilePanel({ language, user }: { language: Language; user: Profile }) {
  const t = copy[language];
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError('');
    setMessage('');
    if (!current || !next || !confirm) return setError(t.required);
    if (next.length < 8) return setError(t.minimum);
    if (next !== confirm) return setError(t.mismatch);
    if (next === current) return setError(t.reuse);
    setSaving(true);
    try {
      // Use Better Auth directly through the existing authenticated Cloudflare proxy.
      // Never log, cache or persist any of these passwords in the browser.
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
          revokeOtherSessions: true
        }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) {
        const data: { code?: string; error?: string; message?: string } =
          await response.json().catch(() => ({}));
        const code = (data.code || data.error || '').toUpperCase();
        if (code.includes('INVALID_PASSWORD') || code.includes('INCORRECT_PASSWORD') ||
            code.includes('INVALID_CREDENTIAL') || code.includes('PASSWORD_MISMATCH')) {
          throw new Error(t.incorrect);
        }
        throw new Error(t.unavailable);
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage(t.success);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === t.incorrect ? t.incorrect : t.unavailable);
    } finally {
      setSaving(false);
    }
  }

  return <section className="mx-auto w-full max-w-[760px] space-y-5 sm:space-y-6">
    <header>
      <h1 className="text-[27px] font-semibold tracking-tight text-ink sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{t.intro}</p>
    </header>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-brand">
          <UserRound size={20} aria-hidden="true"/>
        </span>
        <h2 className="text-base font-semibold text-ink">{t.account}</h2>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs text-slate-500">{t.name}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-ink">{user.name}</dd>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3">
          <dt className="text-xs text-slate-500">{t.email}</dt>
          <dd className="mt-1 break-all text-sm font-semibold text-ink">{user.email}</dd>
        </div>
      </dl>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{t.security}</h2>
      <p className="mt-1 text-sm text-slate-500">{t.securityHint}</p>
      <form onSubmit={changePassword} className="mt-6 space-y-4">
        <PasswordField id="profile-current-password" label={t.current}
          value={current} onChange={setCurrent} autoComplete="current-password" language={language}/>
        <PasswordField id="profile-new-password" label={t.next}
          value={next} onChange={setNext} autoComplete="new-password" language={language}/>
        <PasswordField id="profile-confirm-password" label={t.confirm}
          value={confirm} onChange={setConfirm} autoComplete="new-password" language={language}/>
        <p className="text-xs leading-relaxed text-slate-500">{t.minimum} {t.session}</p>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0"/>{error}
        </p>}
        {message && <p role="status" aria-live="polite" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0"/>{message}
        </p>}
        <button type="submit" disabled={saving}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto">
          {saving && <LoaderCircle size={17} className="animate-spin"/>}
          {saving ? t.saving : t.save}
        </button>
      </form>
    </div>
  </section>;
}
