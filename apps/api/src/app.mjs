import Fastify from 'fastify';
import pg from 'pg';

export function buildApp({ databaseUrl = process.env.DATABASE_URL, logger = true } = {}) {
  const app = Fastify({ logger });
  const pool = databaseUrl
    ? new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 4000 })
    : null;

  app.get('/health/live', async () => ({ service: 'arqvo-api', status: 'ok' }));

  app.get('/health/ready', async (_request, reply) => {
    if (!pool) {
      return reply.code(503).send({
        service: 'arqvo-api', status: 'not_ready', database: 'not_configured'
      });
    }
    try {
      await pool.query('SELECT 1');
      return { service: 'arqvo-api', status: 'ready', database: 'connected' };
    } catch (error) {
      app.log.error({ err: error }, 'Database readiness check failed');
      return reply.code(503).send({
        service: 'arqvo-api', status: 'not_ready', database: 'unavailable'
      });
    }
  });

  app.addHook('onClose', async () => {
    if (pool) await pool.end();
  });

  return app;
}
