# Better Auth + Resend / Autenticação e e-mail

**Current status / Situação:** Better Auth API **enabled** (`AUTH_ENABLED=true`) on Cloudflare + Render. **Public signup enabled** (`AUTH_PUBLIC_SIGNUP=true`) at the user's request. Production smoke passed (Render / Neon / Cloudflare / unauthenticated 401). Live Resend email delivery and real user sign-in are **not yet tested**.

## Architecture
- Frontend: Cloudflare Worker `arqvo`, https://arqvo.uorqui1.workers.dev
- Authentication and cookies: Cloudflare same-origin `/api/auth/*`, proxied to Render Fastify.
- Auth data: separate Neon PostgreSQL project `arqvo` (`user`, `session`, `account`, `verification`).
- Email: Resend REST service, called **only on the Render backend**; `RESEND_API_KEY` is never placed in the client or GitHub.
- Sender: `arqvo@uorqui.app` is configured in Render. DNS on `uorqui.app` includes a Resend DKIM selector, but the Resend dashboard **Verified** status has not yet been independently checked.
- R2: private `arqvo-documents` bound to Worker as `DOCS_BUCKET`. No document endpoints currently exposed.
- English and Portuguese emails use plain text, with an origin check on verification/reset URLs.

## What has been done / O que foi feito
- [x] Migration [002_better_auth.sql](database/002_better_auth.sql) applied on Neon `arqvo` main with approval on 2026-11-19. Four tables and nine indexes verified; temporary branch removed.
- [x] Resend transport code implemented with tests and safe error handling.
- [x] Better Auth verification and password-reset callbacks prepared; 12-character minimum password, sessions revoked on password reset.
- [x] Public `/api/auth/status` endpoint for the frontend (booleans only).
- [x] Login/register/reset UI supports feature flags; it doesn't activate when auth is disabled.
- [ ] Independently verify `uorqui.app` is **Verified** in Resend (operator reports configuration completed; DNS records are present on Cloudflare).
- [x] Configure `RESEND_FROM_EMAIL=arqvo@uorqui.app` in Render.
- [x] Dedicated `RESEND_API_KEY` configured in Render by the operator; the running backend starts successfully with the configured sender.
- [x] CI PostgreSQL signup/verification/login/logout tests passed, and production smoke passed (GitHub Actions run `44601453631`).
- [ ] Send a real verification/reset email to a controlled test inbox and verify Resend delivery status.
- [x] Set `AUTH_ENABLED=true`; Cloudflare `GET /api/auth/status` confirms enabled with signup disabled, and `GET /api/me` returns 401 without a session.
- [ ] Validate authenticated sign-in, session cookie and sign-out with a real test account; do not mark as completed based solely on a 401 probe.
- [x] Set `AUTH_PUBLIC_SIGNUP=true` with explicit owner approval on 2026-11-19; **registration is open to everyone, not just the owner**. Email verification and Better Auth rate limits remain enabled.
- [ ] Test real signup and Resend verification using the owner's chosen test mailbox, then confirm cookies and access control. Keep financial document upload disabled until privacy and security review.

## Render variables
| Name | Status | Notes |
|---|---|---|
| `DATABASE_URL` | Configured | Arqvo Neon only; secret |
| `BETTER_AUTH_SECRET` | Configured | Never in GitHub |
| `BETTER_AUTH_URL` | Configured | https://arqvo.uorqui1.workers.dev |
| `AUTH_ENABLED` | true | Backend enabled; signup remains disabled |
| `AUTH_PUBLIC_SIGNUP` | true | Public registration is enabled (anyone may request an account) |
| `RESEND_API_KEY` | Operator configured | Not visible in GitHub, Obsidian or frontend; live delivery not yet verified |
| `RESEND_FROM_EMAIL` | Configured | `arqvo@uorqui.app`; verify sender domain in Resend dashboard |

## English / Instructions
1. Confirm the existing `uorqui.app` domain shows **Verified** at https://resend.com/domains; avoid changing working DNS entries unless Resend identifies a problem.
2. Create an API key for the Arqvo project at https://resend.com/api-keys. Do not share it in GitHub issues or public chats.
3. In the Render service `arqvo-api`, add the dedicated `RESEND_API_KEY` in Environment. The sender is already `arqvo@uorqui.app`.
4. Check test email deliverability, callback URL, password-reset operation, session revocation and cookie protection.
5. Public signup is currently enabled by owner approval. Verify a live email and session before using real financial documents.

## Português / Instruções
1. No Resend, acesse https://resend.com/domains e confirme que o domínio existente `uorqui.app` está **Verified**; não altere o DNS que já funciona sem necessidade.
2. Gere uma chave de API para o Arqvo em https://resend.com/api-keys, sem publicá-la.
3. No serviço Render `arqvo-api`, configure a chave `RESEND_API_KEY` como segredo. O remetente `arqvo@uorqui.app` já foi configurado.
4. Valide entrega, URL de callback, redefinição de senha, revogação de sessões e cookies.
5. O cadastro público foi habilitado por solicitação do proprietário. Valide e-mail e sessão real antes de armazenar documentos financeiros.

**Never place private financial documents, credentials or active account tokens in the repository or vault. / Nunca publique documentos financeiros reais, segredos nem tokens.**
