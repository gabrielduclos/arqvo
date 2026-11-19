# Arqvo

**Seus documentos. Todas as respostas.**

[English](README.md) | [Arquitetura](docs/architecture.pt-BR.md) | [Implantação](docs/deployment.pt-BR.md)

O Arqvo é um organizador de documentos open source focado em privacidade, recibos, notas fiscais, comprovantes e documentos financeiros pessoais.

## Visão do produto
Fotografar documentos ou importar imagens e PDFs; preservar arquivos originais; extrair valores, datas e estabelecimentos; encontrar documentos e baixar os originais com segurança. OCR e busca por IA são etapas planejadas.

> **Status atual: preparação da infraestrutura.** A API tem apenas rotas de monitoramento. Uploads, autenticação, OCR, busca e downloads AINDA NÃO foram implementados.

## Infraestrutura
- PWA React + TypeScript (planejado).
- API Node.js no **Render**, serviço independente `arqvo-api`.
- PostgreSQL no **Neon**, projeto/banco separado `arqvo`.
- Bucket privado **Cloudflare R2** para arquivos originais (planejado).
- GitHub Actions para testes.

## Como executar
Requer Node.js 22 ou superior.

```sh
cd apps/api
npm install
npm test
npm start
```

Rotas: `GET /health/live` (processo), `GET /health/ready` (verificação PostgreSQL).

Veja [arquitetura](docs/architecture.pt-BR.md), [implantação](docs/deployment.pt-BR.md) e [roadmap](docs/roadmap.md).

## Open source
Licença MIT. Contribuições são bem-vindas. Não publique documentos financeiros reais nem segredos.
