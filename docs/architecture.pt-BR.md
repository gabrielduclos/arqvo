# Arquitetura — Arqvo

[English](architecture.md)

## Componentes e fronteiras de confiança

- **Cliente:** React/Vite em Cloudflare Workers Static Assets, `apps/web`.
- **Borda:** Worker `arqvo`, com proxy das rotas de autenticação e metadados para Render, upload/download privado no R2 e IA acionada automaticamente após cada upload.
- **Identidade/API:** Fastify no Render (`arqvo-api`) com Better Auth, verificação de e-mail e consultas PostgreSQL restritas ao proprietário.
- **Banco:** Neon PostgreSQL independente `arqvo`; tabelas Better Auth e migração aditiva [003_documents_live.sql](database/003_documents_live.sql) para `documents` e `ai_usage` (aplicada à main do Arqvo em 19/11/2026).
- **Originais:** bucket privado R2 `arqvo-documents`, sem domínio público. Chaves são prefixadas pelo ID de usuário codificado e por UUID gerado pelo serviço.
- **IA:** binding Cloudflare Workers AI, acionado automaticamente após upload e sob solicitação para reanalisar um documento. A busca por IA foi descontinuada.

## Fluxo de upload

1. Navegador envia PDF/JPEG/PNG/WebP pelo Worker na origem do aplicativo; limite 8 MiB e validação de assinatura dos bytes.
2. Worker consulta `GET /api/me` no Render para validar a sessão Better Auth e salva os bytes intactos no R2 privado.
3. Worker registra metadados em `POST /api/documents`. Render valida novamente sessão, proprietário, chave R2 e origem da requisição.
4. Neon armazena os metadados; se a gravação falhar, o Worker tenta remover o arquivo recém-enviado.
5. `GET /api/documents` lista arquivos do proprietário; `GET /api/documents/:id/file` autoriza e transmite o original; `DELETE` apaga metadados e tenta remover o original do R2.
6. Limite inicial: 100 documentos por conta.

## Fluxo automático de IA

- Após o upload, o navegador inicia a análise. O Worker busca o documento privado e usa Gemma 4 Vision como modelo principal para JPEG/PNG/WebP (com fallback Moondream/toMarkdown) ou `env.AI.toMarkdown()` para PDFs; em seguida, um modelo de texto sugere estabelecimento, data e valor. Documentos com dados incompletos não são mais marcados como `ready`. Texto e metadados são salvos no Neon, com escopo do usuário autenticado.
- Busca textual com filtros explícitos por estabelecimento, categoria, datas, valores e tipo de arquivo; os parâmetros são validados e aplicados no PostgreSQL somente à conta autenticada. A IA fica dedicada à extração dos documentos.
- Sem cotas diárias de IA impostas pelo aplicativo: as antigas regras de 8/conta e 40/globais foram removidas. A tabela Neon `ai_usage` permanece como legado, sem bloqueio. Cotação/cobrança e cotas da Cloudflare continuam válidas.
- Resultados são sugestões. PDFs escaneados, protegidos ou incomuns podem não ser bem interpretados.

## Segurança e limitações

- Não compartilhar contas de usuário, cookies, tabelas, objetos R2 ou segredos com o Uorqui.
- APIs de documentos exigem sessão Better Auth **e e-mail verificado**; mutações validam a origem.
- Somente PDF/JPEG/PNG/WebP, checagem de MIME/assinatura, respostas privadas e sem cache.
- Após o upload, o conteúdo é processado automaticamente pela IA, conforme aviso visível no formulário. O original continua privado no R2, mesmo que a extração falhe.
- Respostas dos modelos nunca viram SQL arbitrário; textos extraídos são tratados como dados não confiáveis.
- Cadastro público não significa arquivos públicos.
- Ainda **não** é um cofre auditado, criptografado de ponta a ponta ou certificado. Retenção, backups, remoção completa de conta, limpeza de órfãos e proteção adicional contra abusos estão pendentes. Consulte [privacidade](../PRIVACY.pt-BR.md).

## Endpoints

```
GET    /api/me
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
GET    /api/documents/:id/file
DELETE /api/documents/:id
POST   /api/documents/:id/analyze
```

O esquema antigo [001_initial.sql](database/001_initial.sql) era apenas proposta; o esquema real aplicado é [003_documents_live.sql](database/003_documents_live.sql).