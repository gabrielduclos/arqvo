# Arqvo

**Your documents. Every answer.**

[Mobile-first UI Kit](docs/ui-kit.md) · [Português (Brasil)](README.pt-BR.md) · [Architecture](docs/architecture.md) · [Deployment](docs/deployment.md) · [Privacy](PRIVACY.md) · [Roadmap](docs/roadmap.md)

**Arqvo** is an open-source, mobile-first organizer for receipts, invoices and proofs of payment. It preserves the original files, makes them searchable, automatically attempts to extract metadata after upload, and offers AI-assisted search.

**Web app:** https://arqvo.uorqui1.workers.dev

> **Beta warning:** The account area and document management are implemented; full end-to-end testing with a verified real account is still pending. Not an audited financial vault or the only safe backup for important documents. The application now opens to the login page. After signing in, **Overview** shows live account statistics and **Documents** contains real uploads. No sample documents are displayed.

**Mobile-first UI:** a fixed bottom navigation for Overview and Documents on phones (no sidebar); horizontal navigation in the desktop header. Touch-friendly cards, a bottom-sheet preview and live account summaries.

## Features

- Email/password signup and sign-in with Better Auth, mandatory email verification and password reset (Resend).
- Owner-scoped PDF/JPG/PNG/WebP upload to private Cloudflare R2, with magic-byte checks, 8 MB/file and 100 documents/account limits.
- Original-file download, image preview, advanced filtering (merchant, dates, amounts, type, extraction status, sorting), deletion and structured metadata in PostgreSQL. Upload information is accessible via an ⓘ icon.
- **Automatic AI analysis:** after each upload, Cloudflare Workers AI attempts to read the document and suggests merchant, date and amount in BRL; JPEG/PNG/WebP use a vision/OCR model. The upload screen explains this processing. AI suggestions can be wrong, so always compare them to the original.
- **Natural-language search:** AI interprets the query into safe filters, while PostgreSQL retrieves only the signed-in user's matching documents.
- Portuguese/English interface, responsive layout and automated integration tests.

## Infrastructure

```text
React/Vite UI ── Cloudflare Workers Static Assets
                     ├── Better Auth proxy ── Render Fastify ── Neon PostgreSQL
                     ├── Private R2 original documents
                     └── Workers AI (automatic extraction after upload and question search)
```

- GitHub: separate public MIT repository `gabrielduclos/arqvo`.
- Render: independent `arqvo-api` service (`apps/api`).
- Neon: independent project/database `arqvo`, with auth tables, `documents`, and `ai_usage`.
- Cloudflare: dedicated Worker `arqvo`, dedicated private bucket `arqvo-documents`, Workers AI binding.
- CI: GitHub Actions and Cloudflare Builds on `main`.

## Limits and unfinished work

No application-level daily limit on AI processing; Cloudflare's provider usage quotas and billing still apply. JPEG/PNG/WebP use Gemma 4 vision as primary OCR with fallbacks. A synthetic invoice image was successfully transcribed, but actual-photo accuracy remains unverified. PDF/image extraction is best-effort, not guaranteed OCR. General exports, account-wide deletion, automated orphan cleanup, backups, retention policies and full production security audit remain planned. Do not upload highly sensitive documents during beta. See [Privacy](PRIVACY.md).

## Run locally

Node.js 22+.

```bash
cd apps/api
npm install
npm test
npm start
```

For web development:

```bash
cd apps/web
npm install
npm run dev
npm run build
```

Production deployment is handled through Cloudflare Builds and Render, not the local Vite preview. Review [deployment](docs/deployment.md) before configuring secrets.

## Contribute

MIT-licensed code, with [contribution guidelines](CONTRIBUTING.md). User documents are **not** public or licensed under MIT. Never commit financial documents, credentials or production secrets.