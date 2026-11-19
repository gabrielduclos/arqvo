// Read-only production smoke checks: never sends email or modifies user data.
const web = 'https://arqvo.uorqui1.workers.dev';
const api = 'https://arqvo-api.onrender.com';
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function poll(name, url, check) {
  let lastError = '';
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(12000)
      });
      const raw = await response.text();
      let body = null;
      try { body = JSON.parse(raw); } catch { /* not JSON */ }
      if (check(response.status, body)) {
        console.log('PASS:', name, '(HTTP ' + response.status + ')');
        return;
      }
      lastError = 'HTTP ' + response.status + ', JSON: ' + JSON.stringify(body)?.slice(0, 200);
    } catch (error) {
      lastError = String(error?.message || error).slice(0, 200);
    }
    if (attempt < 14) await pause(6000);
  }
  throw new Error(name + ': ' + lastError);
}

await poll('Render liveness', api + '/health/live',
  (status, body) => status === 200 && body?.service === 'arqvo-api' && body?.status === 'ok');
await poll('Neon readiness', api + '/health/ready',
  (status, body) => status === 200 && body?.database === 'connected');
await poll('Cloudflare auth and public signup enabled', web + '/api/auth/status',
  (status, body) => status === 200 && body?.enabled === true &&
    body?.registrationAvailable === true && body?.emailVerificationRequired === true);
await poll('Private session data is protected without login', web + '/api/me',
  (status, body) => status === 401 && body?.error === 'unauthorized');
console.log('Read-only production checks passed; email delivery is NOT verified by this test.');
