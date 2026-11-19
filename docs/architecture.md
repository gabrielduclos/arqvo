# Architecture — Arqvo

[Português](architecture.pt-BR.md)

## Services and trust boundaries

- **Client:** React/Vite under Cloudflare Workers Static Assets, `apps/web`.
- **Edge API:** Worker `arqvo`, routing `/api/auth/*` and metadata requests to Render, handling private R2 uploads/downloads and Workers AI extraction triggered by each upload.
- **Identity/API:** Fastify on Render (`arqvo-api`) with Better Auth, email verification and owner-scoped PostgreSQL queries.
- **Database:** independent Neon PostgreSQL `arqvo`; auth tables and additive migration [003_documents_live.sql](database/003_documents_live.sql) for `documents` and `ai_usage` (applied to Arqvo main on 2026-11-19).
- **Original files:** R2 bucket `arqvo-documents` (private, no public hostname). Keys use an encoded account ID prefix plus a server-generated UUID.
- **AI:** Cloudflare Workers AI binding, called automatically after successful uploads and on demand for retries or natural-language search.

## Upload path

1. Browser sends a signed-in, verified user’s PDF/JPEG/PNG/WebP through the same-origin Worker. Files are limited to 8 MiB and checked against file signatures.
2. Worker verifies the Better Auth session with Render `GET /api/me`, then uploads the unchanged bytes to private R2.
3. Worker registers name/type/size/R2 key with `POST /api/documents` on Render, which revalidates ownership, object key, session and Origin.
4. Metadata is written in Neon. On failed metadata creation, the Worker attempts R2 cleanup.
5. Owner-scoped `GET /api/documents` lists/searches records; `GET /api/documents/:id/file` revalidates the owner and streams the R2 object. `DELETE` removes metadata and then attempts to delete R2.
6. The database constrains total records to the user's account in the application: currently 100 documents per account.

## Automatic AI flow

- After a successful upload, the browser automatically requests analysis. The Worker retrieves the private document and uses Gemma 4 vision/OCR as the primary reader for JPEG/PNG/WebP (Moondream and toMarkdown as fallbacks) or `env.AI.toMarkdown()` for PDF, then a text model to suggest merchant, date and amount. Partial/empty metadata no longer sets the document to `ready`. The extracted content and suggestions are saved in Neon under the authenticated owner.
- Natural-language search sends the question (not the complete library) to a text model. Its structured filters are sanitized and passed as parameters to owner-scoped PostgreSQL queries. Monetary amounts written explicitly as BRL in questions are independently parsed into centavos.
- The previous app-level 8-per-account and 40-global daily AI caps were removed at the owner's request. Neon `ai_usage` is a legacy table not used for throttling; Cloudflare provider billing and limits still apply.
- The result is best-effort. AI conversion may not understand scanned or encrypted PDFs; values must be verified against the original.

## Security

- Never share Uorqui database tables, cookies, R2 objects or secrets.
- Document APIs require an authenticated **and email-verified** Better Auth session; mutation endpoints enforce same-origin headers.
- Only PDF/JPEG/PNG/WebP uploads are accepted. MIME and signature are checked, documents are private, file responses disable caching and sniffing.
- Original files remain private in R2; document content is also sent to Cloudflare Workers AI automatically after upload. Extracted text and metadata are stored in Neon. Processing can fail without deleting the original.
- Model responses are **data**, never raw SQL, and the prompt treats document text as untrusted.
- Accounts may be public but files have no public sharing route.
- This is an MVP; **not end-to-end encrypted, audited or certified**. Full retention, backup, orphan cleanup, abuse control and account deletion need more work. See [privacy](../PRIVACY.md).

## API overview

```
GET    /api/me
GET    /api/documents
POST   /api/documents                      # raw file upload at Worker
GET    /api/documents/:id
GET    /api/documents/:id/file             # signed-in, privately streamed
DELETE /api/documents/:id
POST   /api/documents/:id/analyze          # opt-in AI
POST   /api/ai/search                      # question -> sanitized SQL filters
```

The first design-only migration [001_initial.sql](database/001_initial.sql) was not applied. The production documents/quotas schema is [003_documents_live.sql](database/003_documents_live.sql).