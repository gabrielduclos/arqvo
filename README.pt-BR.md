# Arqvo

**Seus documentos. Todas as respostas.**

[English](README.md) · [Arquitetura](docs/architecture.pt-BR.md) · [Implantação](docs/deployment.pt-BR.md) · [Privacidade](PRIVACY.pt-BR.md) · [Roteiro](docs/roadmap.md)

O **Arqvo** é um organizador open source, responsivo e focado em recibos, notas fiscais e comprovantes. Preserva os arquivos originais, permite encontrá-los, inicia automaticamente a extração de dados após o upload e oferece pesquisa com inteligência artificial.

**Aplicativo:** https://arqvo.uorqui1.workers.dev

> **Atenção — beta:** o cadastro, autenticação e módulo de documentos estão implementados; ainda falta validar o fluxo completo com uma conta real de e-mail confirmado. Não é um cofre financeiro auditado nem deve ser a única cópia de documentos importantes. O aplicativo abre na tela de login. Após entrar, **Visão geral** exibe indicadores reais da conta, e **Documentos** contém os uploads reais. Não são exibidos documentos de demonstração.

## Funcionalidades

- Cadastro e login com Better Auth, confirmação obrigatória de e-mail e recuperação de senha pelo Resend.
- Envio de PDF/JPG/PNG/WebP ao Cloudflare R2 privado, com verificação do conteúdo e limites de 8 MB por arquivo e 100 documentos por conta.
- Download do original, prévia de imagens, listagem, pesquisa, exclusão e metadados estruturados no PostgreSQL.
- **Análise automática com IA:** após o upload, Cloudflare Workers AI tenta extrair texto e sugerir estabelecimento, data e valor em reais. Fotos JPEG/PNG/WebP usam modelo visual/OCR; o tratamento é informado antes do envio. Confira os resultados com o documento original.
- **Busca por linguagem natural:** a IA transforma a pergunta em filtros seguros; o Neon retorna somente documentos do proprietário autenticado.
- Interface em português/inglês, responsiva e com testes automatizados.

## Infraestrutura

```text
Interface React/Vite ── Cloudflare Workers Static Assets
                           ├── Proxy Better Auth ── Render Fastify ── Neon PostgreSQL
                           ├── R2 privado: arquivos originais
                           └── Workers AI: extração após upload e pesquisa sob solicitação
```

- GitHub: repositório público MIT `gabrielduclos/arqvo`, independente do Uorqui.
- Render: `arqvo-api` em `apps/api`.
- Neon: projeto/banco `arqvo`, com tabelas de autenticação, `documents` e `ai_usage`.
- Cloudflare: Worker `arqvo`, bucket privado `arqvo-documents` e binding Workers AI.
- Deploy via Cloudflare Builds, Render e testes GitHub Actions.

## Limites e pendências

IA: oito operações diárias por usuário e 40 globalmente. A conversão de PDFs e imagens em texto é por melhor esforço, não OCR infalível. Exportação geral, exclusão completa da conta, limpeza automática de arquivos órfãos, backups, política de retenção e auditoria de segurança ainda não foram concluídos. Evite documentos muito sensíveis durante o beta. Consulte [Privacidade](PRIVACY.pt-BR.md).

## Desenvolvimento local

Node.js 22+.

```bash
cd apps/api
npm install
npm test
npm start
```

Frontend:

```bash
cd apps/web
npm install
npm run dev
npm run build
```

A publicação de produção é feita pela Cloudflare e pelo Render, não pelo preview local. Consulte [implantação](docs/deployment.pt-BR.md) para variáveis de ambiente.

## Contribuições

O **código** utiliza licença MIT; os documentos dos usuários não são públicos nem licenciados. Nunca publique comprovantes reais, senhas ou segredos no GitHub.