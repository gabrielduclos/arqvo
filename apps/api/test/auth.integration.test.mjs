import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { buildApp } from '../src/app.mjs';

const databaseUrl = process.env.TEST_DATABASE_URL;
const safe = databaseUrl && ['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)
  && new URL(databaseUrl).pathname === '/arqvo_auth_test';

test('Better Auth verified-email signup, login, session and logout with local PostgreSQL', {
  skip: !safe && 'Set TEST_DATABASE_URL to local /arqvo_auth_test'
}, async () => {
  process.env.NODE_ENV = 'test';
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    // Never execute against Neon/production. Integration CI runs local Postgres.
    const schema = await readFile(new URL('../../../docs/database/002_better_auth.sql', import.meta.url), 'utf8');
    await pool.query(schema);

    let resolveMail;
    const mailbox = new Promise(resolve => { resolveMail = resolve; });
    const app = buildApp({
      databaseUrl, logger: false, authEnabled: true, publicSignUpEnabled: true,
      authBaseURL: 'http://localhost:5173',
      authSecret: 'integration-only-secret-at-least-32-bytes',
      mailer: {
        async send(email) {
          resolveMail(email);
          return { id: 'mock-email' };
        }
      }
    });
    const email = 'integration-' + Date.now() + '@example.test';
    const headers = { origin: 'http://localhost:5173', 'content-type': 'application/json' };
    try {
      const created = await app.inject({
        method: 'POST', url: '/api/auth/sign-up/email', headers,
        payload: { name: 'Arqvo Test', email, password: 'strong-password-12345' }
      });
      assert.equal(created.statusCode, 200, created.body);
      const sent = await Promise.race([
        mailbox,
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('No verification email sent')), 5000))
      ]);
      assert.equal(sent.to, email);
      assert.match(sent.text, /verify-email/);

      const before = await app.inject({
        method: 'POST', url: '/api/auth/sign-in/email', headers,
        payload: { email, password: 'strong-password-12345' }
      });
      assert.equal(before.statusCode, 403, before.body);

      const match = sent.text.match(/https?:\/\/[^\s]+/);
      assert.ok(match, 'Verification URL present');
      const link = new URL(match[0]);
      assert.equal(link.origin, 'http://localhost:5173');
      const verified = await app.inject({ method: 'GET', url: link.pathname + link.search });
      assert.ok([200, 302, 303].includes(verified.statusCode), verified.body);

      const loggedIn = await app.inject({
        method: 'POST', url: '/api/auth/sign-in/email', headers,
        payload: { email, password: 'strong-password-12345' }
      });
      assert.equal(loggedIn.statusCode, 200, loggedIn.body);
      const setCookie = loggedIn.headers['set-cookie'];
      const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
        .filter(Boolean).map(x => x.split(';')[0]).join('; ');
      assert.match(cookie, /arqvo.*session_token/i);
      const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
      assert.equal(me.statusCode, 200, me.body);
      assert.equal(me.json().user.email, email);

      const signOut = await app.inject({ method: 'POST', url: '/api/auth/sign-out', headers: { ...headers, cookie }, payload: {} });
      assert.equal(signOut.statusCode, 200, signOut.body);
      const after = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
      assert.equal(after.statusCode, 401, after.body);
    } finally {
      await app.close();
    }
  } finally {
    await pool.end();
  }
});
