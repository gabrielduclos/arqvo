# Arqvo architecture

[Português](architecture.pt-BR.md)

## Goal
An independent, open-source, mobile-first document organizer. Users will capture or import receipts/invoices as images or PDFs, search metadata and extracted text, and retrieve **the original file**.

## Components
- **GitHub:** independent `gabrielduclos/arqvo` repository.
- **Render:** dedicated `arqvo-api` Node.js service using `apps/api`, separated from Uorqui.
- **Neon:** dedicated PostgreSQL project and database `arqvo`, in São Paulo (`aws-sa-east-1`).
- **Cloudflare R2 (future):** dedicated private bucket storing original files unchanged.
- **React PWA (future):** capture, preview, search, download.

## Intended data flow
1. Authenticated client requests a file upload.
2. Server validates user ownership, type, content and size; stores original bytes in private R2.
3. Background job extracts text and structured fields such as merchant, date and amount.
4. Neon stores searchable metadata and the private R2 object key.
5. Searches first enforce the owner's identity; exact financial filters use SQL.
6. The server authorizes every original-file preview/download and delivers it through a short-lived signed URL or authenticated streaming.

AI search is planned as a query interpretation layer, not as the source of truth for financial totals.

## Security rules
- Do NOT share Uorqui database URLs, secrets, tables, or file buckets.
- Every document query must be restricted to the authenticated owner.
- Never expose database credentials, object-store keys or AI API secrets to the browser.
- Enforce an allowlist of file types, size limits, content validation, rate limits and access logging.
- Treat OCR text as untrusted input; defend against prompt injection.
- Define deletion, export, backup and data-retention policies before production.
- Do not submit personal financial content to AI services without disclosure and appropriate safeguards.

## Implemented now
Only Fastify process and optional PostgreSQL health endpoints. **No upload, search, authentication or download APIs yet.**

The SQL in [database/001_initial.sql](database/001_initial.sql) is a proposed migration and has not been applied.
