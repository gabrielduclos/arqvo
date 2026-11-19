# Arquitetura do Arqvo

[English](architecture.md)

## Objetivo
Organizador independente e open source, pensado para celulares. O usuário poderá fotografar ou importar notas fiscais, recibos e PDFs, pesquisar informações e recuperar **o arquivo original**.

## Componentes
- **GitHub:** repositório independente `gabrielduclos/arqvo`.
- **Render:** serviço Node.js dedicado `arqvo-api`, em `apps/api`, sem usar o serviço do Uorqui.
- **Neon:** projeto e banco PostgreSQL próprios `arqvo`, na região de São Paulo (`aws-sa-east-1`).
- **Cloudflare R2 (futuro):** bucket privado dedicado para preservar os arquivos originais.
- **PWA React (futuro):** câmera, visualização, pesquisa e download.

## Fluxo planejado
1. Cliente autenticado solicita upload.
2. Servidor valida usuário, tipo, conteúdo e tamanho, salvando o arquivo original no R2 privado.
3. Processamento posterior extrai texto, estabelecimento, data e valor.
4. Neon armazena metadados pesquisáveis e a referência privada do arquivo.
5. Toda pesquisa exige escopo do proprietário; valores exatos são consultados via SQL.
6. O servidor autoriza cada download/visualização por URL temporária ou streaming protegido.

A IA interpretará perguntas, sem ser a fonte de verdade para cálculos financeiros.

## Segurança
- Não reutilizar URLs de banco, chaves, tabelas, buckets ou segredos do Uorqui.
- Toda consulta de documento deve restringir os dados ao usuário autenticado.
- Segredos de banco, R2 e IA jamais devem aparecer no navegador.
- Validar tamanho, tipo e conteúdo; aplicar limites de requisições e registrar acessos.
- Tratar OCR como entrada não confiável, inclusive contra prompt injection.
- Definir política de exclusão, exportação, backups e retenção antes de produção.
- Não enviar dados financeiros pessoais a serviços de IA sem informar o usuário e adotar salvaguardas.

## Já implementado
Somente Fastify e rotas de saúde com verificação opcional de PostgreSQL. **Ainda não existem rotas de upload, autenticação, busca ou download.**

O SQL em [database/001_initial.sql](database/001_initial.sql) é uma proposta, não executada.
