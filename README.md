# Arqvo

**Your documents. Every answer.**

[Português (Brasil)](README.pt-BR.md) | [Architecture](docs/architecture.md) | [Deployment](docs/deployment.md)

Arqvo is an open-source, privacy-first organizer for receipts, invoices, proofs of payment, and personal financial documents.

## Product vision
Capture documents using a camera or import images and PDFs. Preserve original files, extract searchable amounts, dates and merchant information, then find and securely download those originals. Natural-language search and OCR are planned.

> **Current status: infrastructure bootstrap.** The API only exposes health endpoints. File uploads, authentication, OCR, search, and downloads are NOT implemented yet.

## Infrastructure
- React + TypeScript PWA (planned).
- Node.js API on **Render**, independent service `arqvo-api`.
- PostgreSQL on **Neon**, separate project/database `arqvo`.
- Private **Cloudflare R2** bucket for original files (planned).
- GitHub Actions for automated tests.

## Getting started
Requires Node.js 22 or later.

```sh
cd apps/api
npm install
npm test
npm start
```

Routes: `GET /health/live` (liveness), `GET /health/ready` (checks PostgreSQL).

See [architecture](docs/architecture.md), [deployment](docs/deployment.md), and [roadmap](docs/roadmap.md).

## Open source
MIT licensed. Contributions are welcome. Never commit actual financial documents or secrets.
