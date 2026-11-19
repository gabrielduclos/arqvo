# Roadmap / Roteiro

Checked items reflect implemented code or verified infrastructure. / Itens marcados refletem código implementado ou infraestrutura verificada.

## Phase 0 / Fase 0 — Infrastructure
- [x] Public MIT repository, bilingual docs / Repositório MIT público e docs bilíngues
- [x] Cloudflare Workers Static Assets + GitHub Builds / Interface Cloudflare e publicação automática
- [x] Render Fastify API + Neon PostgreSQL / API Render e Neon
- [x] Better Auth + Resend, verified-email requirement / Autenticação com confirmação de e-mail
- [x] Public signup by owner request / Cadastro público autorizado
- [x] Private R2 bucket + AI binding / Bucket R2 privado e binding IA
- [x] Additive Neon documents/usage migration / Migração aditiva de documentos/cotas no Neon
- [ ] Validate a verified real account and live email / Testar usuário real e e-mail de confirmação

## Phase 1 / Fase 1 — Real documents
- [x] Authenticated PDF/image upload (8 MiB), owner-scoped original R2 / Upload e originais privados
- [x] Document metadata in Neon, list, keyword search / Metadados e busca textual no Neon
- [x] Authorized image preview, original download and deletion / Prévia, download e exclusão autorizados
- [x] Read-only unauthenticated security checks / Testes de acesso sem sessão
- [x] Bilingual responsive document manager / Gestão de documentos responsiva e bilíngue
- [x] Login page and real Overview/Documents tabs without synthetic records / Login inicial e abas Visão geral/Documentos com dados reais, sem exemplos fictícios
- [ ] End-to-end test with real verified user and sample file / Teste completo com conta real e arquivo inofensivo
- [ ] Mobile camera capture affordance / Acesso direto à câmera no celular
- [ ] Reliable orphan cleanup, full export, account deletion / Limpeza de órfãos, exportação e exclusão de conta
- [ ] Security hardening, privacy review, backup & retention / Auditoria, privacidade, backups e retenção

## Phase 2 / Fase 2 — AI
- [x] Automatic Workers AI extraction after upload / Extração automática após upload
- [x] JPEG vision/OCR, merchant/date/amount suggestions and truthful analysis states / Modelo visual para JPEG, sugestões de dados e status fiel à extração
- [x] Natural-language question-to-filter search, owner-scoped SQL / Pesquisa natural com filtros SQL
- [x] Daily per-account and global usage limits / Limites de IA por conta e globais
- [ ] Verify accuracy on real documents and low-quality scanned PDFs / Medir precisão com PDFs escaneados
- [ ] Bulk asynchronous processing, retry, failure recovery / Processamento em lote e recuperação de falhas
- [ ] Human confirmation and correction of extracted fields / Confirmação e edição dos dados sugeridos

## Phase 3 / Fase 3 — Product
- [ ] ZIP bulk export / Exportação ZIP
- [ ] Spending dashboards / Indicadores financeiros
- [ ] Production observability, backup, retention and security audit / Monitoramento, backup, retenção e auditoria
- [ ] Harden public registration against abuse / Proteção adicional contra cadastro abusivo
