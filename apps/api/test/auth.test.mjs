import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.mjs';
import { createArqvoAuth } from '../src/auth.mjs';

test('no auth instance is created without explicit opt-in', () => {
  assert.equal(createArqvoAuth({ enabled: false }), null);
});

test('auth cannot be enabled without a database', () => {
  assert.throws(() => createArqvoAuth({
    enabled: true, secret: 'a'.repeat(48), baseURL: 'http://localhost:5173'
  }), /DATABASE_URL/);
});

test('auth routes fail closed until schema and verification are ready', async () => {
  const app = buildApp({ databaseUrl: null, authEnabled: false, logger: false });
  const response = await app.inject({ method: 'GET', url: '/api/auth/get-session' });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error, 'authentication_not_configured');
  const me = await app.inject({ method: 'GET', url: '/api/me' });
  assert.equal(me.statusCode, 503);
  await app.close();
});
