import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResendMailer } from '../src/email.mjs';
import { validateAuthLink, createArqvoAuth } from '../src/auth.mjs';

test('Resend adapter sends correctly without exposing its API key in payload', async () => {
  let seen;
  const mailer = createResendMailer({
    apiKey: 're_test_123',
    from: 'no-reply@example.com',
    fetchImpl: async (url, options) => {
      seen = { url, options };
      return { ok: true, json: async () => ({ id: 'email_123' }) };
    }
  });
  const result = await mailer.send({
    to: 'test@example.com',
    subject: 'Test',
    text: 'Hello'
  });
  assert.equal(result.id, 'email_123');
  assert.equal(seen.url, 'https://api.resend.com/emails');
  assert.equal(seen.options.headers.Authorization, 'Bearer re_test_123');
  const body = JSON.parse(seen.options.body);
  assert.deepEqual(body.to, ['test@example.com']);
  assert.equal(body.from, 'no-reply@example.com');
  assert.doesNotMatch(seen.options.body, /re_test_123/);
});

test('Resend adapter fails closed for missing configuration or delivery rejection', async () => {
  assert.throws(() => createResendMailer({ apiKey: '', from: '' }), /require/);
  const mailer = createResendMailer({
    apiKey: 're_test_123',
    from: 'no-reply@example.com',
    fetchImpl: async () => ({ ok: false, status: 401 })
  });
  await assert.rejects(mailer.send({ to: 'test@example.com', subject: 'Test', text: 'x' }), /resend_delivery_failed/);
});

test('auth links cannot redirect secrets to an external origin', () => {
  const base = 'https://arqvo.uorqui1.workers.dev';
  assert.equal(validateAuthLink(base + '/api/auth/verify-email?token=abc', base), base + '/api/auth/verify-email?token=abc');
  assert.throws(() => validateAuthLink('https://example.com/steal?token=abc', base), /Cross-origin/);
  assert.throws(() => validateAuthLink('', base), /Invalid|URL/);
});

test('Better Auth refuses to initialize without an email sender', () => {
  assert.throws(() => createArqvoAuth({
    pool: {}, secret: 'z'.repeat(40),
    baseURL: 'https://arqvo.uorqui1.workers.dev',
    enabled: true, mailer: null
  }), /email sender/);
});
