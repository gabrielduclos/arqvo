# Better Auth + Resend / Autenticação e e-mail

**Current status / Situação:** Safe staging. Better Auth is implemented but **not live** (`AUTH_ENABLED=false`). Public registration is **also disabled** (`AUTH_PUBLIC_SIGNUP=false`).

## Architecture
- Frontend: Cloudflare Worker `arqvo`, https://arqvo.uorqui1.workers.dev
- Authentication and cookies: Cloudflare same-origin `/api/auth/*`, proxied to Render Fastify.
- Auth data: separate Neon PostgreSQL project `arqvo` (`user`, `session`, `account`, `verification`).
- Email: Resend REST service, called **only on the Render backend**; `RESEND_API_KEY` is never placed in the client or GitHub.
- R2: private `arqvo-documents` bound to Worker as `DOCS_BUCKET`. No document endpoints currently exposed.
- English and Portuguese emails use plain text, with an origin check on verification/reset URLs.

## What has been done / O que foi feito
- [x] Migration [002_better_auth.sql](database/002_better_auth.sql) applied on Neon `arqvo` main with approval on 2026-11-19. Four tables and nine indexes verified; temporary branch removed.
- [x] Resend transport code implemented with tests and safe error handling.
- [x] Better Auth verification and password-reset callbacks prepared; 12-character minimum password, sessions revoked on password reset.
- [x] Public `/api/auth/status` endpoint for the frontend (booleans only).
- [x] Login/register/reset UI supports feature flags; it doesn't activate when auth is disabled.
- [ ] Configure a sender domain verified in the Resend dashboard.
- [ ] Add a dedicated `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to the Render service.
- [ ] Review CI full PostgreSQL signup/login/logout results and production transport.
- [ ] Set `AUTH_ENABLED=true` **only after the above** and validate login + cookies on Cloudflare.
- [ ] Set `AUTH_PUBLIC_SIGNUP=true` only after email delivery, verification, privacy policy and abuse protection have been tested.

## Render variables
| Name | Status | Notes |
|---|---|---|
| `DATABASE_URL` | Configured | Arqvo Neon only; secret |
| `BETTER_AUTH_SECRET` | Configured | Never in GitHub |
| `BETTER_AUTH_URL` | Configured | https://arqvo.uorqui1.workers.dev |
| `AUTH_ENABLED` | false | Require complete verified sender configuration before true |
| `AUTH_PUBLIC_SIGNUP` | false | Second explicit switch for registration |
| `RESEND_API_KEY` | missing | Create in Resend and keep secret |
| `RESEND_FROM_EMAIL` | missing | Must be an address on a verified sending domain |

## English / Instructions
1. Add and verify a domain at https://resend.com/domains (DNS entries include SPF/DKIM, as shown by Resend).
2. Create an API key for the Arqvo project at https://resend.com/api-keys. Do not share it in GitHub issues or public chats.
3. In the Render service `arqvo-api`, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Environment.
4. Check test email deliverability, callback URL, password-reset operation, session revocation and cookie protection.
5. Only then activate authentication, and later public signup.

## Português / Instruções
1. No Resend, acesse https://resend.com/domains e verifique um domínio remetente seguindo os registros DNS exigidos.
2. Gere uma chave de API para o Arqvo em https://resend.com/api-keys, sem publicá-la.
3. No serviço Render `arqvo-api`, configure como segredos `RESEND_API_KEY` e o endereço autorizado `RESEND_FROM_EMAIL`.
4. Valide entrega, URL de callback, redefinição de senha, revogação de sessões e cookies.
5. Só então habilite autenticação; cadastro público é uma segunda etapa.

**Never place private financial documents, credentials or active account tokens in the repository or vault. / Nunca publique documentos financeiros reais, segredos nem tokens.**
