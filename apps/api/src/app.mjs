import Fastify from 'fastify';
import pg from 'pg';
import { fromNodeHeaders } from 'better-auth/node';
import { createArqvoAuth } from './auth.mjs';
import { createResendMailer } from './email.mjs';
import { registerDocumentRoutes } from './documents.mjs';

export function buildApp({
  databaseUrl = process.env.DATABASE_URL,
  logger = true,
  authEnabled = process.env.AUTH_ENABLED === 'true',
  publicSignUpEnabled = process.env.AUTH_PUBLIC_SIGNUP === 'true',
  authBaseURL = process.env.BETTER_AUTH_URL || 'http://localhost:5173',
  authSecret = process.env.BETTER_AUTH_SECRET,
  mailer = authEnabled ? createResendMailer() : null
} = {}) {
  const app = Fastify({ logger });
  const pool = databaseUrl
    ? new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 4000 })
    : null;
  const auth = createArqvoAuth({
    pool, secret: authSecret, baseURL: authBaseURL,
    mailer, enabled: authEnabled, publicSignUpEnabled,
    logEmailError: (type) => app.log.error({ type }, 'Transactional auth email failed')
  });

  app.get('/health/live', async () => ({ service: 'arqvo-api', status: 'ok' }));
  app.get('/health/ready', async (_request, reply) => {
    if (!pool) return reply.code(503).send({ service: 'arqvo-api', status: 'not_ready', database: 'not_configured' });
    try {
      await pool.query('SELECT 1');
      return { service: 'arqvo-api', status: 'ready', database: 'connected' };
    } catch (error) {
      app.log.error({ err: error }, 'Database readiness check failed');
      return reply.code(503).send({ service: 'arqvo-api', status: 'not_ready', database: 'unavailable' });
    }
  });

  // Feature discovery is public, but never returns internal secrets or provider details.
  app.get('/api/auth/status', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return {
      enabled: Boolean(auth),
      registrationAvailable: Boolean(auth && publicSignUpEnabled),
      emailVerificationRequired: true,
      passwordRecoveryAvailable: Boolean(auth)
    };
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      reply.header('Cache-Control', 'no-store');
      if (!auth) return reply.code(503).send({ error: 'authentication_not_configured' });
      try {
        const url = new URL(request.url, authBaseURL);
        const headers = fromNodeHeaders(request.headers);
        const forwardedRequest = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.method !== 'GET' ? { body: JSON.stringify(request.body ?? {}) } : {})
        });
        const response = await auth.handler(forwardedRequest);
        reply.code(response.status);
        response.headers.forEach((value, key) => {
          if (!['set-cookie', 'content-length', 'transfer-encoding', 'connection'].includes(key)) {
            reply.header(key, value);
          }
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) reply.header('set-cookie', cookies);
        return reply.send(await response.text());
      } catch (error) {
        request.log.error({ err: error }, 'Auth request failed');
        return reply.code(500).send({ error: 'authentication_error' });
      }
    }
  });

  app.get('/api/me', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!auth) return reply.code(503).send({ error: 'authentication_not_configured' });
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) return reply.code(401).send({ error: 'unauthorized' });
      return { user: { id: session.user.id, name: session.user.name, email: session.user.email } };
    } catch (error) {
      request.log.error({ err: error }, 'Session lookup failed');
      return reply.code(503).send({ error: 'authentication_unavailable' });
    }
  });

  registerDocumentRoutes(app, { pool, auth, authBaseURL });

  app.addHook('onClose', async () => {
    if (pool) await pool.end();
  });
  return app;
}
