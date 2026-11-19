# Implantação — Arqvo

[English](deployment.md) · [Arquitetura](architecture.pt-BR.md) · [Privacidade](../PRIVACY.pt-BR.md)

## Serviços em produção

| Componente | Serviço |
|---|---|
| Frontend e API de borda | Cloudflare Worker `arqvo`, https://arqvo.uorqui1.workers.dev |
| API e Better Auth | Render `arqvo-api` |
| Banco | Projeto/banco Neon PostgreSQL `arqvo` |
| Originais | Bucket Cloudflare R2 privado `arqvo-documents` |
| IA | Binding Cloudflare Workers AI `AI` |
| E-mail | Resend com remetente `arqvo@uorqui.app` |

Recursos isolados do aplicativo Uorqui; apenas contas dos fornecedores e domínio de e-mail podem ser compartilhados.

## GitHub e Cloudflare Builds

- Repositório: `gabrielduclos/arqvo`, branch `main`.
- Cloudflare Builds: raiz `apps/web`, compilação `npm run build`, publicação `npx wrangler deploy`.
- O `apps/web/wrangler.jsonc` vincula `DOCS_BUCKET` privado, `AI`, `ASSETS` e `API_ORIGIN`. O Worker atende `/api/*` antes dos arquivos estáticos.
- Nunca enviar chaves Neon, R2, Resend ou segredos ao navegador.
- Workers AI possui franquias e cobrança próprias; nenhuma cota diária é imposta pelo Arqvo nesta fase. Monitorar uso e gastos no provedor.

## API Render

Serviço existente `arqvo-api`, código `apps/api`:

```text
Build: npm install --prefix apps/api --no-audit --no-fund
Start: npm --prefix apps/api start
Health: /health/live
Node: 22
```

Segredos e variáveis no Render:
- `DATABASE_URL` — exclusivamente o Neon Arqvo.
- `BETTER_AUTH_SECRET` — segredo aleatório, privado.
- `BETTER_AUTH_URL=https://arqvo.uorqui1.workers.dev`.
- `AUTH_ENABLED=true`, `AUTH_PUBLIC_SIGNUP=true` — cadastro público conforme autorização, com e-mail verificado.
- `RESEND_API_KEY` — chave de envio privada.
- `RESEND_FROM_EMAIL=arqvo@uorqui.app`.

## Banco

Aplicados à main do Neon Arqvo em 19/11/2026:
- [002_better_auth.sql](database/002_better_auth.sql) — tabelas da autenticação.
- [003_documents_live.sql](database/003_documents_live.sql) — tabelas `documents` e `ai_usage`, adicionadas em transação sem DROP/ALTER. Ambas estavam vazias na criação.

O [001_initial.sql](database/001_initial.sql) era apenas a proposta original. **Não aplicá-lo novamente.**

## Validação

```bash
cd apps/api && npm install && npm test
cd ../web && npm install && npm run build
```

CI utiliza PostgreSQL 18 isolado. O [smoke test de produção](../scripts/production-smoke.mjs) valida saúde do Render/Neon e se documentos e arquivos rejeitam acesso sem sessão (401).

**QA manual ainda necessário:** entrar com e-mail real confirmado, enviar PDF/foto de teste sem dados sensíveis, conferir a lista, prévia, download dos bytes originais, extração de IA solicitada, busca natural e exclusão do documento. Não compartilhe arquivos de teste em canais públicos.

## Limitações

Beta. Até 8 MiB por arquivo, 100 por conta. IA sem cota diária interna; cotas e cobrança da Cloudflare permanecem. A extração pode errar. Exclusão remove os metadados e tenta remover o original no R2; falhas podem deixar objeto órfão para limpeza posterior. Exclusão completa da conta, backups, reconciliação de storage e revisão geral de privacidade/segurança ainda estão pendentes.