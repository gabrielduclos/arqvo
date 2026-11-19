# Deployment — Arqvo

[Português](deployment.pt-BR.md) · [Architecture](architecture.md) · [Privacy](../PRIVACY.md)

## Production services

| Component | Service |
|---|---|
| Frontend and edge API | Cloudflare Worker `arqvo`, https://arqvo.uorqui1.workers.dev |
| API and Better Auth | Render web service `arqvo-api` |
| Database | Neon PostgreSQL project/database `arqvo` |
| Originals | Private Cloudflare R2 bucket `arqvo-documents` |
| AI | Cloudflare Workers AI binding `AI` |
| Email | Resend sender `arqvo@uorqui.app` |

All resources are independent of the Uorqui application, except for sharing provider accounts and the sender domain.

## GitHub and Cloudflare Builds

- Repo: `gabrielduclos/arqvo`, branch `main`.
- Cloudflare Builds root: `apps/web`, build: `npm run build`, deploy: `npx wrangler deploy`.
- Wrangler `apps/web/wrangler.jsonc` declares the private `DOCS_BUCKET`, `AI`, `ASSETS` bindings and `API_ORIGIN`. The Worker handles only `/api/*` ahead of the SPA assets.
- Never expose Neon, R2 or Resend secrets to the browser.
- Workers AI consumes Cloudflare account allowance and may require a paid plan/usage beyond the free allocation. The application limits inference calls.

## Render API

Existing service `arqvo-api`, source `apps/api`:

```text
Build: npm install --prefix apps/api --no-audit --no-fund
Start: npm --prefix apps/api start
Health: /health/live
Node: 22
```

Render secrets:
- `DATABASE_URL` — Arqvo Neon **only**.
- `BETTER_AUTH_SECRET` — private, random secret.
- `BETTER_AUTH_URL=https://arqvo.uorqui1.workers.dev`.
- `AUTH_ENABLED=true`, `AUTH_PUBLIC_SIGNUP=true` — public signup as owner requested; verification is mandatory.
- `RESEND_API_KEY` — private sender API key.
- `RESEND_FROM_EMAIL=arqvo@uorqui.app`.

## Database

Applied to Neon `arqvo` main on 2026-11-19:
- [002_better_auth.sql](database/002_better_auth.sql) — Better Auth core tables.
- [003_documents_live.sql](database/003_documents_live.sql) — `documents` and `ai_usage`, applied using additive transaction with no DROP/ALTER, verified empty upon creation.

The earlier [001_initial.sql](database/001_initial.sql) was a design proposal only. Do not apply it again.

## Validation

```bash
cd apps/api && npm install && npm test
cd ../web && npm install && npm run build
```

CI checks run with an isolated PostgreSQL 18 instance. A read-only [production smoke test](../scripts/production-smoke.mjs) checks Render + Neon health and that unauthenticated document/file routes return 401.

**Remaining human QA:** sign in to a verified real account; upload a harmless sample PDF/photo; confirm it appears in My files; preview/download the exact original; explicitly run AI extraction; try natural-language search; delete the test item and verify it disappears. This does not require posting sensitive files in any public channel.

## Limitations

The product is beta. File quota: 8 MiB each and 100 per account. AI quota: 8 requests/account/day, 40/day globally. AI output is not authoritative. Deleting a document removes metadata and attempts to remove the R2 original; if the latter fails an orphan can require cleanup. Real-world account deletion, robust storage reconciliation, backups and full privacy/security review are pending.