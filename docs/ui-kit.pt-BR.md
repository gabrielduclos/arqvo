# Arqvo UI Kit — referência visual permanente

**Snapshot canônico atual (indicadores e busca):** [Ver versão validada](https://github.com/gabrielduclos/arqvo/tree/main/design/reference/2026-11-19-upload-sources). Os arquivos antigos são referências históricas; a aplicação ativa está em `apps/web/src`.

**Referência histórica:** protótipo original no commit [6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7](https://github.com/gabrielduclos/arqvo/tree/6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7). Código congelado em [App.tsx](../design/reference/2026-11-19-original-prototype/App.tsx) e [style.css](../design/reference/2026-11-19-original-prototype/style.css). **Esses arquivos são somente referência: nunca reintroduzir documentos fictícios no aplicativo.**

## Cores e tipografia originais
- Roxo principal `#5146e5` (`brand`), `brand-soft #f0efff`.
- Fundo `#f7f8fc` (`canvas`), texto `#191b2a` (`ink`), secundário `#74798b`.
- O antigo banner/hero violeta `#201d42` faz parte apenas do snapshot histórico e **não deve ser restaurado** na Visão geral atual.
- Superfícies brancas, bordas slate-200, fundos indigo-50 para ícones, botões rounded-xl e cards rounded-2xl.
- Fonte Inter com fallback sistema; títulos com espaçamento de letras reduzido; logo minúsculo **arqvo.**, ponto roxo.

## Estrutura original
- Header branco/translúcido fixo, **64px no mobile e 72px no desktop**; mantém logo, idioma e sair.
- **Navegação atual autorizada:** sem menu lateral. Em telas menores que 768px, barra de navegação inferior fixa (footer) com **Visão geral**, **Documentos** e **Perfil**, ícones e rótulos, estado ativo roxo, alvos amplos e respeito a `env(safe-area-inset-bottom)`.
- Em telas a partir de 768px, navegação horizontal integrada ao header, sem sidebar. Footer inferior apenas no mobile.
- O menu lateral de 252px e o hambúrguer são **referências históricas do protótipo**, expressamente substituídos a pedido do proprietário.
- Área principal mobile-first com padding lateral de 16px no celular e espaço inferior suficiente para o footer fixo, sem encobrir documentos ou ações. Desktop com conteúdo centralizado em largura máxima.
- Visão geral atual: título simples, **sem banner roxo grande**. Três indicadores reais ficam **lado a lado também no celular** (3 colunas) e todos são botões. Total abre Documentos sem filtros; Este mês filtra pela data de envio do mês atual; Dados identificados filtra por análise concluída. Valores vêm somente da conta autenticada.
- Documentos: CTA de upload de largura total no celular, uma única busca por texto com botão Filtros ao lado (PDF/imagem ficam no painel avançado, sem pills separados, e a pesquisa por IA foi removida), cartões com valor, status e **alvos táteis mínimos de 44px** para reanalisar/baixar/excluir. Modal de documento funciona como bottom sheet no mobile.
- **Informações de upload:** o card fixo de formatos/limites/IA foi substituído por ícone circular **ⓘ** junto ao título Documentos. Toque para abrir detalhes em bottom sheet; o aviso sobre processamento com IA continua acessível.
- **Seleção de documento:** ao tocar **Adicionar documento**, mostrar primeiro um **modal próprio em bottom sheet** com três botões grandes e rotulados: **Câmera**, **Galeria**, **Arquivo**. Só após tocar uma opção abrir a função nativa correspondente do sistema. Câmera usa captura traseira (`capture="environment"`); Galeria aceita imagem; Arquivo aceita PDF ou imagem. Não abrir o seletor nativo diretamente ao tocar no botão principal.
- Não exibir dados fictícios, mesmo usando esse protótipo como base visual.

## Transições originais — requisito
- `motion/react` + `AnimatePresence mode="wait"`.
- Splash com logo centralizado e **barra de progresso índigo animada horizontalmente**, encerrando em fade.
- Entrada do aplicativo em fade, respeitando `useReducedMotion()`.
- Troca Visão geral/Documentos/Perfil com fade/deslocamento curto e sem cortes bruscos.
- Modal de prévia: fundo escurecendo em fade, painel sobe 30px; fechamento reverso.
- Toast surge de baixo com fade.
- Toda nova interface deve preservar esses movimentos; ajustes de dados, API ou IA não autorizam redesenho visual. A mudança de navegação para footer foi **expressamente aprovada**.

## Regras do produto
- Tela inicial de login, depois **Visão geral** com indicadores reais, **Documentos** para os uploads, busca, visualização, exclusão e extração automática por IA e **Perfil** para consultar nome/e-mail e alterar a senha.
- **Não restaurar a sidebar:** a decisão mobile-first com navegação footer (e header no desktop) substitui o layout histórico. Evitar outro redesign sem solicitação explícita.
- Conferir sempre os arquivos congelados antes de editar componentes.

## Revisão mobile-first — 19/11/2026
- Header de 64px no celular e 72px no desktop.
- Footer fixo no celular com três rotas (Visão geral, Documentos, Perfil), destaque animado via `motion/react` e safe area Android/iOS.
- Navegação desktop no cabeçalho, menu lateral abolido.
- Conteúdo responsivo, inputs com fonte mínima de 16px no iOS, preview em bottom sheet e pesquisa textual única com filtros avançados.
- Somente documentos e métricas reais, com animações preservadas.

[English](ui-kit.md)

## Filtro avançado — documentos
- Botão **Filtros** com contador de critérios ativos **dentro da área de busca**, junto ao único campo de pesquisa textual; nunca junto ao título da lista de documentos.
- Painel mobile com estabelecimento, tipo PDF/imagem, situação da extração, período (data de emissão ou envio), valor mínimo/máximo e ordenação.
- Filtros combináveis consultados no Neon por proprietário; não há pesquisa por IA nem filtros rápidos Todos/PDFs/Imagens fora do painel.

## Decisão de interface — indicadores e busca (19/11/2026)
- Remover o banner grande de Visão geral e não substituí-lo por outro card promocional.
- Manter os indicadores Total, Este mês e Dados identificados em 3 colunas compactas, responsivas, acessíveis e clicáveis.
- Cada indicador navega até Documentos com o filtro real correspondente previamente aplicado.
- Botão Filtros, contador de critérios e Limpar busca devem estar associados ao cabeçalho de **Busca e filtros**; a lista apresenta somente o título e contagem de resultados.

## Interface enxuta: avisos de privacidade (19/11/2026)
- Remover badges e mensagens repetitivos como “Privado · somente sua conta”, tanto em Documentos quanto em Visão geral e no detalhe do arquivo.
- A autenticação permanece obrigatória; as mensagens promocionais de privacidade não devem se repetir dentro do aplicativo.
- Manter acesso à Política de Privacidade e aviso sobre tratamento automático dos arquivos por IA; são informações legais/operacionais distintas.
- Pesquisa documental: **um único campo de texto com Filtros avançados**, sem pills Todos/PDFs/Imagens, sem alternância Buscar/Pesquisar com IA e sem endpoint de busca por IA.

## Perfil autenticado e alteração de senha
- Três itens no footer mobile e na navegação horizontal desktop: **Visão geral**, **Documentos**, **Perfil**. Sem reintroduzir sidebar ou tela “Meus arquivos”.
- **Perfil** exibe nome e e-mail reais do usuário autenticado, somente leitura nesta etapa, e formulário de alteração de senha.
- Pedir senha atual, nova senha (mínimo de 8 caracteres) e confirmação; mostrar/ocultar sem persistir as senhas e validar igualdade antes do envio.
- Enviar exclusivamente a Better Auth `POST /api/auth/change-password` autenticada, com `revokeOtherSessions: true`, preservando a sessão atual e encerrando as outras. Senhas não devem ser registradas em logs/analytics.
- Mensagens de erro/sucesso concisas, bilíngues e acessíveis; nenhum aviso repetitivo de privacidade.
- Referência ativa: `apps/web/src/ProfilePanel.tsx` e `apps/web/src/App.tsx`; não criar um segundo mecanismo de autenticação.


## Escolha da origem do upload — 19/11/2026
- Componente `apps/web/src/UploadSourceModal.tsx` é o modal oficial de escolha. Exibir opções Câmera, Galeria, Arquivo no mobile e desktop, com transição motion e respeito à safe area.
- Inputs file nativos continuam montados ocultos em `apps/web/src/VaultPanel.tsx`, um por origem, para preservar compatibilidade com iOS Safari, Android e desktop.
- `input.click()` precisa ocorrer **sincronamente no evento de toque**, sem `await`, pois navegadores bloqueiam seletores/câmera sem gesto do usuário.
- O fluxo posterior não muda: arquivo original vai ao R2, dados ao Neon, extração automática com Workers AI, verificação de MIME e limite 8 MB.
