# Arqvo web / Interface Arqvo

An early, **synthetic-data-only** React + Vite + Tailwind prototype hosted as **Cloudflare Workers Static Assets**.

Protótipo inicial com **dados fictícios**, React, Vite e Tailwind, hospedado pela **Cloudflare Workers Static Assets**.

```sh
cd apps/web
npm install
npm run build
npx wrangler deploy
```

## Cloudflare Builds settings / Configuração Cloudflare Builds
- Worker name / Nome: `arqvo` (must match `wrangler.jsonc`).
- Repository: `gabrielduclos/arqvo`.
- Branch: `main`.
- Root directory / Diretório raiz: `apps/web`.
- Build command / Compilação: `npm run build`.
- Deploy command / Publicação: `npx wrangler deploy`.
- No production secrets are needed in the current public demo.

## Product status / Estado do produto
This first public deploy contains a UI demo only. It **does not upload, store, OCR, search real files, or download real documents**. Those features require authentication, isolated private R2 storage and owner-level access control before activation.

Esta primeira publicação contém apenas a demonstração visual. **Não armazena, processa nem permite baixar documentos reais**. Os recursos precisam de autenticação e armazenamento privado com autorização antes da ativação.
