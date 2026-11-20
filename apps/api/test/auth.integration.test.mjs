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
    const categoriesSchema = await readFile(new URL('../../../docs/database/004_document_categories.sql', import.meta.url), 'utf8');
    await pool.query(categoriesSchema);
    const amountSchema = await readFile(new URL('../../../docs/database/005_manual_amount.sql', import.meta.url), 'utf8');
    await pool.query(amountSchema);

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
          amountCents: 8500, category: 'farmacia', subcategory: 'Medicamentos'
        }
      });
      assert.equal(analyzed.statusCode, 200, analyzed.body);
      assert.equal(Number(analyzed.json().document.amountCents), 8500);
      assert.equal(analyzed.json().document.status, 'ready');
      assert.equal(analyzed.json().document.category, 'farmacia');
      assert.equal(analyzed.json().document.subcategory, 'Medicamentos');
      const searched = await app.inject({
        method: 'GET', url: '/api/documents?q=farmácia',
        headers: { cookie }
      });
      assert.equal(searched.statusCode, 200);
      assert.ok(searched.json().documents.some(d => d.id === id));

      // Advanced filters are executed in Neon and always scoped by session.
      async function filtered(query) {
        return app.inject({ method: 'GET', url: '/api/documents?' + query, headers: { cookie } });
      }
      const complete = await filtered(
        'q=farm%C3%A1cia&merchant=central&dateStart=2026-11-01&dateEnd=2026-11-30' +
        '&amountMin=8000&amountMax=9000&type=pdf&analysis=ready&sort=amount_high'
      );
      assert.equal(complete.statusCode, 200, complete.body);
      assert.deepEqual(complete.json().documents.map(doc => doc.id), [id]);
      assert.equal(complete.json().documents[0].analysisState, 'ready');
      const pharmacyDocs = await filtered('category=farmacia');
      assert.equal(pharmacyDocs.statusCode, 200, pharmacyDocs.body);
      assert.ok(pharmacyDocs.json().documents.some(doc => doc.id === id));
      const wrongCategory = await filtered('category=combustivel');
      assert.equal(wrongCategory.statusCode, 200, wrongCategory.body);
      assert.ok(!wrongCategory.json().documents.some(doc => doc.id === id));

      const uploadedToday = new Date().toISOString().slice(0, 10);
      const uploadDates = await filtered('uploadStart=' + uploadedToday + '&uploadEnd=' + uploadedToday + '&sort=oldest');
      assert.equal(uploadDates.statusCode, 200, uploadDates.body);
      assert.ok(uploadDates.json().documents.some(doc => doc.id === id));

      for (const query of [
        'type=image', 'analysis=pending', 'dateStart=2026-12-01',
        'amountMin=9000', 'merchant=inexistente', 'q=inexistente'
      ]) {
        const empty = await filtered(query);
        assert.equal(empty.statusCode, 200, empty.body);
        assert.ok(!empty.json().documents.some(doc => doc.id === id), query);
      }
      for (const invalid of [
        'sort=unknown', 'dateStart=2026-02-31',
        'dateStart=2026-11-30&dateEnd=2026-11-01',
        'amountMin=15000&amountMax=9000', 'type=exe', 'analysis=unknown', 'category=invalid',
        'amountMin=1.23'
      ]) {
        const response = await filtered(invalid);
        assert.equal(response.statusCode, 400, invalid + ': ' + response.body);
      }
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
      assert.equal(item.analysisState, 'text_only');
      const textOnlySearch = await filtered('analysis=text_only');
      assert.equal(textOnlySearch.statusCode, 200);
      assert.ok(textOnlySearch.json().documents.some(doc => doc.id === id));
      const partial = await app.inject({
        method: 'PATCH', url: '/api/documents/' + id + '/analysis',
        headers: { ...headers, cookie },
        payload: { extractedText: 'Farmácia Central', merchant: 'Farmácia Central', documentDate: null, amountCents: null }
      });
      assert.equal(partial.statusCode, 200, partial.body);
      assert.equal(partial.json().document.status, 'uploaded');
      const partialSearch = await filtered('analysis=partial&merchant=central');
      assert.equal(partialSearch.statusCode, 200, partialSearch.body);
      assert.ok(partialSearch.json().documents.some(doc => doc.id === id));
      // Correct purchase category must reflect items, not the gas station business.
      const reviewed = await app.inject({
        method: 'PATCH', url: '/api/documents/' + id + '/metadata',
        headers: { ...headers, cookie },
        payload: {
          merchant: 'POSTO EXEMPLO COMBUSTIVEL LTDA',
          category: 'alimentacao', subcategory: 'Café e bebidas'
        }
      });
      assert.equal(reviewed.statusCode, 200, reviewed.body);
      assert.equal(reviewed.json().document.category, 'alimentacao');
      assert.equal(reviewed.json().document.subcategory, 'Café e bebidas');

      const analyzedAgain = await app.inject({
        method: 'PATCH', url: '/api/documents/' + id + '/analysis',
        headers: { ...headers, cookie },
        payload: {
          extractedText: 'POSTO EXEMPLO COMBUSTIVEL LTDA\nITEM: CAFE 10,99\nTOTAL R$ 15,98',
          merchant: 'Incorrect inferred station',
          documentDate: '2026-11-18', amountCents: 1598,
          category: 'combustivel', subcategory: 'Abastecimento'
        }
      });
      assert.equal(analyzedAgain.statusCode, 200, analyzedAgain.body);
      assert.equal(analyzedAgain.json().document.merchant, 'POSTO EXEMPLO COMBUSTIVEL LTDA');
      assert.equal(analyzedAgain.json().document.category, 'alimentacao');
      assert.equal(analyzedAgain.json().document.subcategory, 'Café e bebidas');
      const retained = await filtered('category=alimentacao&merchant=POSTO');
      assert.equal(retained.statusCode, 200, retained.body);
      assert.ok(retained.json().documents.some(doc => doc.id === id));
      // The application no longer enforces per-day AI quotas.
      // A non-existent legacy quota endpoint must not be relied on.
      const retiredQuota = await app.inject({
        method: 'POST', url: '/api/ai/consume',
        headers: { ...headers, cookie }, payload: {}
      });
      assert.equal(retiredQuota.statusCode, 404);
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

      // Profile password change uses Better Auth's authenticated endpoint.
      // A wrong current password must not change credentials.
      const wrongCurrent = await app.inject({
        method: 'POST', url: '/api/auth/change-password',
        headers: { ...headers, cookie },
        payload: { currentPassword: 'wrong-password', newPassword: 'Bz8!y6mR', revokeOtherSessions: true }
      });
      assert.notEqual(wrongCurrent.statusCode, 200, 'Wrong current password must be rejected');

      // Create a second session to verify revokeOtherSessions behaviour.
      const secondLogin = await app.inject({
        method: 'POST', url: '/api/auth/sign-in/email', headers,
        payload: { email, password: 'Aq7!x9pQ' }
      });
      assert.equal(secondLogin.statusCode, 200, secondLogin.body);
      const secondSetCookie = secondLogin.headers['set-cookie'];
      const otherCookie = (Array.isArray(secondSetCookie) ? secondSetCookie : [secondSetCookie])
        .filter(Boolean).map(item => item.split(';')[0]).join('; ');
      assert.ok(otherCookie);
      const changedPassword = await app.inject({
        method: 'POST', url: '/api/auth/change-password',
        headers: { ...headers, cookie },
        payload: { currentPassword: 'Aq7!x9pQ', newPassword: 'Bz8!y6mR', revokeOtherSessions: true }
      });
      assert.equal(changedPassword.statusCode, 200, changedPassword.body);

      const currentSession = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
      assert.equal(currentSession.statusCode, 200, currentSession.body);
      const revokedSession = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: otherCookie } });
      assert.equal(revokedSession.statusCode, 401, revokedSession.body);

      const oldCredentials = await app.inject({
        method: 'POST', url: '/api/auth/sign-in/email', headers,
        payload: { email, password: 'Aq7!x9pQ' }
      });
      assert.notEqual(oldCredentials.statusCode, 200, 'Old password must stop working');
      const newCredentials = await app.inject({
        method: 'POST', url: '/api/auth/sign-in/email', headers,
        payload: { email, password: 'Bz8!y6mR' }
      });
      assert.equal(newCredentials.statusCode, 200, newCredentials.body);

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
