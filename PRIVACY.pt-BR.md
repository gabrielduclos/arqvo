# Privacidade e tratamento de dados — Arqvo (beta)

[English](PRIVACY.md)

**Última atualização:** 19/11/2026

O Arqvo é um organizador de documentos experimental e open source. **Não é** um cofre financeiro auditado, um armazenamento criptografado de ponta a ponta ou um serviço de contabilidade. Evite enviar documentos extremamente sensíveis (documentos de identidade, senhas, credenciais bancárias, extratos completos) até concluirmos revisões adicionais de segurança, retenção e recuperação.

## Dados tratados
- **Conta:** nome, e-mail, hash de senha, verificação de e-mail e sessões, gerenciados pelo Better Auth em banco Neon PostgreSQL exclusivo do Arqvo.
- **Documentos:** o PDF ou imagem original é guardado de forma privada no Cloudflare R2; nome, estabelecimento, data, valor e texto extraído ficam no Neon. O aplicativo não altera intencionalmente os bytes do arquivo original.
- **IA (opcional):** somente quando você solicita análise, o documento é enviado ao Cloudflare Workers AI para conversão em texto e sugestões de metadados. A pesquisa por linguagem natural envia **a pergunta**, não toda a sua biblioteca de documentos, para o modelo. Resultados de IA podem conter erros.
- **E-mail:** o Resend processa o endereço de e-mail e as mensagens de verificação/recuperação. O fluxo configurado de e-mails não envia arquivos originais.
- **Dados operacionais:** provedores podem tratar metadados de requisições, IPs e logs para autenticação e proteção do serviço.

## Infraestrutura e armazenamento
- Cloudflare Workers hospeda a interface, faz a mediação do acesso aos arquivos e processa solicitações voluntárias à IA.
- O R2 privado armazena os originais sem domínio R2 público.
- Render hospeda a API e Neon armazena dados da conta e metadados para busca. Os provedores e seus recursos podem operar em regiões diferentes. **Não prometemos armazenamento exclusivo no Brasil nem criptografia de ponta a ponta.**
- Administradores da aplicação e operadores da infraestrutura podem ter acesso técnico aos dados para suporte. Este não é um serviço de conhecimento zero.

## Acesso
As rotas da aplicação exigem sessão Better Auth com e-mail verificado e conferem a propriedade dos documentos antes de entregá-los. Não existe rota pública de compartilhamento de documentos. O fato de qualquer pessoa poder se cadastrar não torna seus arquivos públicos.

## Retenção e exclusão
Os arquivos permanecem até você excluí-los. O botão de exclusão remove os metadados no PostgreSQL e tenta remover o original no R2. Se houver falha no armazenamento, pode ser necessário limpar um objeto órfão manualmente. Exclusão completa da conta, exportação geral, backups e política automática de retenção ainda estão em desenvolvimento. Não use o beta como sua única cópia de arquivos importantes.

## Limites e custos de IA
Até 100 documentos por conta, com 8 MB por arquivo. A IA possui limite inicial de oito operações diárias por usuário e 40 no total, para controlar abusos e consumo.

## Solicitações e incidentes
Para solicitações de privacidade ou exclusão, utilize um **canal privado** indicado no perfil do mantenedor em https://github.com/gabrielduclos. **Nunca** publique documentos financeiros, senhas, tokens ou dados pessoais em issues públicas.

Este texto descreve o funcionamento atual do beta e não representa certificação de conformidade legal. Relate imediatamente qualquer acesso inesperado a dados.