# Privacy and data handling — Arqvo (beta)

[Português](PRIVACY.pt-BR.md)

**Last updated:** 2026-11-19

Arqvo is an experimental, open-source document organizer. It is **not** an audited financial vault, encrypted end-to-end storage system, or an accounting service. Avoid uploading exceptionally sensitive items (identity documents, passwords, account credentials, full bank statements) until additional security, retention, and recovery controls have been reviewed.

## Data handled
- **Account:** name, email, password hash, verification state and session data, processed by Better Auth and stored in the isolated Arqvo Neon PostgreSQL database.
- **Documents:** the original PDF or image is stored privately in Cloudflare R2; metadata such as filename, merchant, date, amount and extracted text is stored in Neon. Uploaded bytes are not intentionally changed by the application.
- **AI (opt-in):** Only when you request an analysis, the file is processed by Cloudflare Workers AI's text/Markdown conversion, with a model used to suggest structured metadata. A natural-language search sends the search question—not the entire document library—to Cloudflare Workers AI. AI outputs can be incorrect.
- **Email:** Resend receives the email address and account verification/password-reset message content. It does not receive document originals through the configured email flow.
- **Operational data:** service providers may process request metadata, IP addresses and logs for authentication and service security.

## Storage and provider boundaries
- Cloudflare Workers serves the site, authorizes file access and processes user-initiated AI requests.
- Private R2 storage holds the original files, without a public R2 domain.
- Render hosts the API; Neon holds account records and searchable metadata. Infrastructure and processors can operate in different regions. **No promise of Brazilian-only processing or end-to-end encryption is made.**
- Application admins and infrastructure operators may have technical access to data needed for troubleshooting. Do not assume a zero-knowledge service.

## Access and sharing
Application routes use a verified Better Auth session and check the account owner before accessing files or metadata. No public document sharing route is implemented. A public account registration page does not make user documents public.

## Retention and deletion
Documents remain until you delete them. The delete action removes PostgreSQL metadata and attempts to delete the corresponding R2 original. In case of storage failure, a detached object may require operator cleanup. Account deletion, full data export, backups and automated retention policies are still being developed. Do not treat the beta as your only archival copy.

## Limits and AI costs
Up to 100 documents per account, maximum 8 MB each, with a limited number of AI requests per day (currently eight per account and 40 across the service). Limits are intended to reduce abuse and uncontrolled inference usage.

## Requests and incidents
For privacy or deletion requests, use a **private channel** provided by the repository owner through their GitHub profile: https://github.com/gabrielduclos. **Never** post financial documents, personal details, passwords or access tokens in public GitHub issues.

This document describes the current beta implementation and is not a certification of legal compliance. Please report any unexpected data access immediately.