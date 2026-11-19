# Implantação

[English](deployment.md)

## Recursos
- **GitHub:** `gabrielduclos/arqvo`.
- **Neon:** projeto separado `arqvo`, banco `arqvo`, São Paulo `aws-sa-east-1`.
- **Render:** criar um novo web service `arqvo-api` no workspace existente confirmado. Não alterar serviços do Uorqui.
- **Cloudflare Worker:** `arqvo` publicado em https://arqvo.uorqui1.workers.dev, com SPA React/Tailwind e proxy de mesma origem `/api/auth/*` até o Render.
- **R2:** bucket privado `arqvo-documents` criado e vinculado ao Worker como `DOCS_BUCKET`; sem domínio público e ainda sem endpoints de arquivos.

## Configuração Render
Após confirmar o workspace correto, importe o [render.yaml](../render.yaml) revisado ou crie um serviço Node:

| Configuração | Valor |
|---|---|
| Repositório | `https://github.com/gabrielduclos/arqvo` |
| Branch | `main` |
| Diretório raiz | `apps/api` |
| Build | `npm install --no-audit --no-fund` |
| Start | `npm start` |
| Saúde | `/health/live` |
| Node | `22` |
| Banco | `DATABASE_URL` como **segredo**, com conexão exclusiva do Neon Arqvo |

Se a integração não permitir indicar o diretório raiz, configure pela raiz:
- Build: `npm install --prefix apps/api --no-audit --no-fund`
- Start: `npm --prefix apps/api start`

## Better Auth (preparado)
A API Render contém integração Fastify com Better Auth. `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` estão configurados; `AUTH_ENABLED=false` até aprovação e validação do login. O esquema `docs/database/002_better_auth.sql` foi aprovado e aplicado ao Neon **Arqvo main** em 2026-11-19; quatro tabelas e nove índices verificados, branch temporária excluída. Autenticação NÃO está ativa: falta configurar verificação de e-mail, habilitar com segurança e testar sessões/cookies. Consulte [auth.md](auth.md).

## Neon
Projeto separado do Uorqui. Nunca reutilizar string de conexão ou credenciais do Uorqui. A [migração proposta](database/001_initial.sql) **não foi aplicada**.

## Testes
```bash
cd apps/api
npm install
npm test
npm start
```
- `GET /health/live` responde 200 com o processo ativo.
- `GET /health/ready` responde 200 somente com conexão ao banco; caso contrário, 503.

Não habilitar upload de documentos financeiros antes de autenticação, autorização por usuário, armazenamento privado e processamento seguro.
