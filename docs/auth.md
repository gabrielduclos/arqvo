# Better Auth + Cloudflare / Autenticação

**Status / Situação:** integration scaffold; login is NOT live / integração preparada; login NÃO liberado.

- Frontend: Cloudflare Worker `arqvo` on `https://arqvo.uorqui1.workers.dev`.
- Auth endpoints: same-origin `/api/auth/*`, reverse proxied by Cloudflare to Render Fastify.
- Backend: `arqvo-api`, PostgreSQL project `arqvo` on Neon.
- Cookie: Arqvo-specific prefix, HttpOnly, Secure on HTTPS; no cross-site cookies.
- R2 bucket `arqvo-documents`: private, bound to Cloudflare Worker as `DOCS_BUCKET`; no storage endpoints exposed yet.

## Activation checklist / Checklist de ativação
1. [x] Review, test and apply the [Better Auth migration](database/002_better_auth.sql) to **Arqvo main** after explicit approval on 2026-11-19. Migration ID: `49d149e3-2172-418b-a739-03c7e695a96a`. Four tables and nine indexes verified; temporary branch deleted.
2. Verify that the installed Better Auth version's generated schema matches the migration.
3. Configure `BETTER_AUTH_SECRET` (>= 32 random bytes) and `BETTER_AUTH_URL` as Render secrets.
4. Provide a verified transactional email sender before enabling public registration or password recovery.
5. Only then set `AUTH_ENABLED=true` and perform end-to-end sign-in, logout, session, cookie and CSRF tests.
6. Implement owner-scoped document upload / download; do not expose files on unauthenticated routes.

## Portuguese
A autenticação será da própria aplicação e não reutiliza usuários, sessões ou cookies do Uorqui. O login ficará na origem Cloudflare para evitar bloqueio de cookies de terceiros no Safari e navegadores móveis. A inscrição pública continua desabilitada até configurar verificação de e-mail. Não publicar credenciais ou dados financeiros reais.
