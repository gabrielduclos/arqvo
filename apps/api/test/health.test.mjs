import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.mjs';

test('liveness works', async () => {
  const app = buildApp({ databaseUrl: null, logger: false });
  const result = await app.inject({ method: 'GET', url: '/health/live' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().service, 'arqvo-api');
  await app.close();
});

test('readiness fails safely without DATABASE_URL', async () => {
  const app = buildApp({ databaseUrl: null, logger: false });
  const result = await app.inject({ method: 'GET', url: '/health/ready' });
  assert.equal(result.statusCode, 503);
  assert.equal(result.json().database, 'not_configured');
  await app.close();
});
