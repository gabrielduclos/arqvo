import { betterAuth } from 'better-auth';

const MAX_URL_LENGTH = 4096;

export function validateAuthLink(url, baseURL) {
  if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) {
    throw new Error('Invalid authentication link');
  }
  const candidate = new URL(url);
  const origin = new URL(baseURL);
  if (candidate.origin !== origin.origin || candidate.protocol !== origin.protocol) {
    throw new Error('Cross-origin authentication link refused');
  }
  return candidate.toString();
}

/**
 * Authentication is disabled until a verified sender has been configured.
 * Public registration requires a second, explicit switch.
 */
export function createArqvoAuth({
  pool,
  secret,
  baseURL,
  mailer,
  enabled = false,
  publicSignUpEnabled = false,
  logEmailError = () => {}
}) {
  if (!enabled) return null;
  if (!pool) throw new Error('AUTH_ENABLED requires DATABASE_URL');
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('BETTER_AUTH_SECRET must have at least 32 bytes');
  }
  if (!mailer || typeof mailer.send !== 'function') {
    throw new Error('AUTH_ENABLED requires a configured email sender');
  }
  const canonical = new URL(baseURL);
  if (canonical.origin !== baseURL ||
      (process.env.NODE_ENV === 'production' && canonical.protocol !== 'https:')) {
    throw new Error('BETTER_AUTH_URL must be a canonical HTTPS origin in production');
  }

  function deliver(type, user, url) {
    const link = validateAuthLink(url, baseURL);
    const isVerification = type === 'verification';
    const subject = isVerification ? 'Arqvo — Verifique seu e-mail' : 'Arqvo — Redefina sua senha';
    const intro = isVerification
      ? 'Confirme seu endereço de e-mail para acessar o Arqvo.'
      : 'Use o link abaixo para redefinir sua senha do Arqvo.';
    const english = isVerification
      ? 'Verify your email address to access Arqvo.'
      : 'Use the link below to reset your Arqvo password.';
    // Avoid response-time email enumeration. Node keeps the send request running.
    // A durable queue is recommended before high-volume public registration.
    void Promise.resolve()
      .then(() => mailer.send({
        to: user.email,
        subject,
        text: `${intro}\n\n${link}\n\n${english}\n\nSe não solicitou esta ação, ignore este e-mail.\nIf you did not request this, ignore this message.\n`
      }))
      .catch(() => logEmailError(type)); // do not log recipient, token or link
  }

  return betterAuth({
    database: pool,
    secret,
    baseURL,
    trustedOrigins: [canonical.origin],
    advanced: {
      cookiePrefix: 'arqvo',
      useSecureCookies: canonical.protocol === 'https:'
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !publicSignUpEnabled,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => deliver('reset', user, url)
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => deliver('verification', user, url)
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24
    },
    rateLimit: {
      enabled: process.env.NODE_ENV !== 'test',
      window: 60,
      max: 30
    }
  });
}
