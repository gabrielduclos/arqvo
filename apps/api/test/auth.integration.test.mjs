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
    const documentsSchema = await readFile(new URL('../../../docs/database/003_documents_live.sql', import.meta.url), 'utf8');
    await pool.query(documentsSchema);

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
        payload: { name: 'Arqvo Test', email, password: 'Aq7!x9pQ' }
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
        payload: { email, password: 'Aq7!x9pQ' }
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
        payload: { email, password: 'Aq7!x9pQ' }
      });
      assert.equal(loggedIn.statusCode, 200, loggedIn.body);
      const setCookie = loggedIn.headers['set-cookie'];
      const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
        .filter(Boolean).map(x => x.split(';')[0]).join('; ');
      assert.match(cookie, /arqvo.*session_token/i);
      const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
      assert.equal(me.statusCode, 200, me.body);
      assert.equal(me.json().user.email, email);


      // Real database integration: owner-scoped upload metadata and deletion.
      const uid = me.json().user.id;
      const safeKey = encodeURIComponent(uid) + '/' + crypto.randomUUID();
      const inserted = await app.inject({
        method: 'POST', url: '/api/documents',
        headers: { ...headers, cookie },
        payload: {
          filename: 'receipt.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 120,
          objectKey: safeKey
        }
      });
      assert.equal(inserted.statusCode, 201, inserted.body);
      const id = inserted.json().document.id;
      assert.ok(id);
      const unauthorizedDoc = await app.inject({ method: 'GET', url: '/api/documents/' + id });
      assert.equal(unauthorizedDoc.statusCode, 401);

      const forged = await app.inject({
        method: 'POST', url: '/api/documents',
        headers: { ...headers, cookie },
        payload: {
          filename: 'forged.pdf', mimeType: 'application/pdf',
          sizeBytes: 120, objectKey: 'another-user/' + crypto.randomUUID()
        }
      });
      assert.equal(forged.statusCode, 400);
      const records = await app.inject({
        method: 'GET', url: '/api/documents',
        headers: { cookie }
      });
      assert.equal(records.statusCode, 200, records.body);
      assert.ok(records.json().documents.some(d => d.id === id));
      const analyzed = await app.inject({
        method: 'PATCH', url: '/api/documents/' + id + '/analysis',
        headers: { ...headers, cookie },
        payload: {
          extractedText: 'Farmácia Central 20 de novembro total 85 reais',
          merchant: 'Farmácia Central', documentDate: '2026-11-20',
          amountCents: 8500
        }
      });
      assert.equal(analyzed.statusCode, 200, analyzed.body);
      assert.equal(Number(analyzed.json().document.amountCents), 8500);
      assert.equal(analyzed.json().document.status, 'ready');
      const searched = await app.inject({
        method: 'GET', url: '/api/documents?q=farmácia',
        headers: { cookie }
      });
      assert.equal(searched.statusCode, 200);
      assert.ok(searched.json().documents.some(d => d.id === id));
      // Regression: text-only OCR must never be labelled "analyzed" when
      // the model failed to recognize merchant, date and total.
      const textOnly = await app.inject({
        method: 'PATCH', url: '/api/documents/' + id + '/analysis',
        headers: { ...headers, cookie },
        payload: { extractedText: 'texto da imagem pouco legivel', merchant: '', documentDate: null, amountCents: null }
      });
      assert.equal(textOnly.statusCode, 200, textOnly.body);
      assert.equal(textOnly.json().document.status, 'uploaded');
      const listedAfter = await app.inject({
        method: 'GET', url: '/api/documents',
        headers: { cookie }
      });
      const item = listedAfter.json().documents.find(d => d.id === id);
      assert.ok(item);
      assert.equal(item.status, 'uploaded');
      assert.equal(item.hasExtractedText, true);
      const partial = await app.inject({
        method: 'PATCH', url: '/api/documents/' + id + '/analysis',
        headers: { ...headers, cookie },
        payload: { extractedText: 'Farmácia Central', merchant: 'Farmácia Central', documentDate: null, amountCents: null }
      });
      assert.equal(partial.statusCode, 200, partial.body);
      assert.equal(partial.json().document.status, 'uploaded');
      const quota = await app.inject({
        method: 'POST', url: '/api/ai/consume',
        headers: { ...headers, cookie }, payload: {}
      });
      assert.equal(quota.statusCode, 200, quota.body);
      const deleted = await app.inject({
        method: 'DELETE', url: '/api/documents/' + id,
        headers: { origin: 'http://localhost:5173', cookie }
      });
      assert.equal(deleted.statusCode, 200, deleted.body);
      const removed = await app.inject({
        method: 'GET', url: '/api/documents/' + id,
        headers: { cookie }
      });
      assert.equal(removed.statusCode, 404);

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
