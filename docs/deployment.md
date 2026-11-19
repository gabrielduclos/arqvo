# Deployment

[Português](deployment.pt-BR.md)

## Resources
- **GitHub:** `gabrielduclos/arqvo`.
- **Neon:** separate project named `arqvo`, database `arqvo`, São Paulo `aws-sa-east-1`.
- **Render:** create a new web service named `arqvo-api` in the confirmed existing workspace. Do not alter Uorqui's services.
- **Cloudflare Worker:** `arqvo` deployed at https://arqvo.uorqui1.workers.dev with React/Tailwind SPA and `/api/auth/*` same-origin proxy to Render.
- **R2:** private `arqvo-documents` bucket is created and bound to the Worker as `DOCS_BUCKET`; no public domain, and no file operations exposed yet.

## Render setup
After confirming the correct workspace, either import the reviewed [render.yaml](../render.yaml) or create a Node web service:

| Setting | Value |
|---|---|
| Repository | `https://github.com/gabrielduclos/arqvo` |
| Branch | `main` |
| Root directory | `apps/api` |
| Build | `npm install --no-audit --no-fund` |
| Start | `npm start` |
| Health check | `/health/live` |
| Node | `22` |
| Database | `DATABASE_URL` set as a **secret** pointing to the Arqvo Neon database |

If using a service-creation connector that cannot set Root Directory, use the repository root and instead configure:
- Build: `npm install --prefix apps/api --no-audit --no-fund`
- Start: `npm --prefix apps/api start`

## Better Auth (API enabled, signup closed)
The Render API contains a Better Auth Fastify integration. `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set as environment configuration; `AUTH_ENABLED=true` with `AUTH_PUBLIC_SIGNUP=false`; production API health and unauthenticated protection checked by GitHub Actions. The core-schema migration `docs/database/002_better_auth.sql` was approved and applied to Neon **Arqvo main** on 2026-11-19; four tables and nine indexes verified, temporary branch deleted. The auth API is live but no real user login or Resend email delivery has been verified yet. Public signup stays off until verification, abuse controls and privacy review are complete. See [auth.md](auth.md).

## Neon
The Neon project is independent from Uorqui. Never reuse Uorqui's connection string or role. The migration [001_initial.sql](database/001_initial.sql) is a reviewable proposal only, **not applied**.

## Tests and validation
```bash
cd apps/api
npm install
npm test
npm start
```
- `GET /health/live` returns 200 when process is running.
- `GET /health/ready` returns 200 only when database connection succeeds, else 503.

Do not enable financial-document uploads until authentication, per-user authorization, private storage, retention and safe processing exist.
