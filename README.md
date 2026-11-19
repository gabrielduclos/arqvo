# Arqvo

**Your documents. Every answer.**

[Português (Brasil)](README.pt-BR.md) | [Architecture](docs/architecture.md) | [Deployment](docs/deployment.md)

Arqvo is an open-source, privacy-first organizer for receipts, invoices, proofs of payment, and personal financial documents.

## Product vision
Capture documents using a camera or import images and PDFs. Preserve original files, extract searchable amounts, dates and merchant information, then find and securely download those originals. Natural-language search and OCR are planned.

> **Current status: UI demo / pre-MVP.** A React frontend with clearly labeled fictional sample documents is available in source. The API exposes only health endpoints. File uploads, authentication, OCR, real-document search, and downloads are NOT implemented yet.

## Infrastructure
- React + Vite + TypeScript + Tailwind UI hosted as **Cloudflare Workers Static Assets** (`apps/web`), Cloudflare Builds configured for GitHub `main`.
- Node.js API on **Render**, independent service `arqvo-api`.
- PostgreSQL on **Neon**, separate project/database `arqvo`.
- Private **Cloudflare R2** bucket `arqvo-documents` provisioned, not yet accessible from document APIs.
- **Better Auth** is staged in the Render API; login is not active until the reviewed Neon migration and verified-email flow are completed.
- GitHub Actions for API tests and frontend build checks; Cloudflare Builds handles web deployment.

### Current Cloudflare frontend

Demo: https://arqvo.uorqui1.workers.dev — fictional example data only. The Worker includes a same-origin authentication proxy and a private R2 binding, but does not expose document upload or download routes.

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
