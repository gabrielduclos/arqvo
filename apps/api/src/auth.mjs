import { betterAuth } from 'better-auth';

/**
 * Better Auth runs only when explicitly enabled after the reviewed
 * PostgreSQL migration has been applied. The Render API must not
 * accept signups or documents before verification and access controls.
 */
export function createArqvoAuth({ pool, secret, baseURL, enabled = false }) {
  if (!enabled) return null;
  if (!pool) throw new Error('AUTH_ENABLED requires DATABASE_URL');
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('BETTER_AUTH_SECRET must have at least 32 bytes');
  }
  const origin = new URL(baseURL);
  if (origin.origin !== baseURL || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) {
    throw new Error('BETTER_AUTH_URL must be the canonical origin; use HTTPS in production');
  }
  return betterAuth({
    database: pool,
    secret,
    baseURL,
    trustedOrigins: [origin.origin],
    advanced: {
      cookiePrefix: 'arqvo',
      useSecureCookies: origin.protocol === 'https:'
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30
    }
  });
}
