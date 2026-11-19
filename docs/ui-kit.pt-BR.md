# Arqvo UI Kit — referência visual permanente

**Referência histórica:** protótipo original no commit [6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7](https://github.com/gabrielduclos/arqvo/tree/6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7). Código congelado em [App.tsx](../design/reference/2026-11-19-original-prototype/App.tsx) e [style.css](../design/reference/2026-11-19-original-prototype/style.css). **Esses arquivos são somente referência: nunca reintroduzir documentos fictícios no aplicativo.**

## Cores e tipografia originais
- Roxo principal `#5146e5` (`brand`), `brand-soft #f0efff`.
- Fundo `#f7f8fc` (`canvas`), texto `#191b2a` (`ink`), secundário `#74798b`.
- Banner/hero Visão geral `#201d42`, luzes roxas desfocadas e texto branco/índigo claro.
- Superfícies brancas, bordas slate-200, fundos indigo-50 para ícones, botões rounded-xl e cards rounded-2xl.
- Fonte Inter com fallback sistema; títulos com espaçamento de letras reduzido; logo minúsculo **arqvo.**, ponto roxo.

## Estrutura original
- Header branco/translúcido fixo, **64px no mobile e 72px no desktop**; mantém logo, idioma e sair.
- **Navegação atual autorizada:** sem menu lateral. Em telas menores que 768px, barra de navegação inferior fixa (footer) com **Visão geral** e **Documentos**, ícones e rótulos, estado ativo roxo, alvos amplos e respeito a `env(safe-area-inset-bottom)`.
- Em telas a partir de 768px, navegação horizontal integrada ao header, sem sidebar. Footer inferior apenas no mobile.
- O menu lateral de 252px e o hambúrguer são **referências históricas do protótipo**, expressamente substituídos a pedido do proprietário.
- Área principal mobile-first com padding lateral de 16px no celular e espaço inferior suficiente para o footer fixo, sem encobrir documentos ou ações. Desktop com conteúdo centralizado em largura máxima.
- Visão geral: banner roxo escuro arredondado (24px mobile/28px desktop), CTA adaptativo e **indicadores reais em grade de duas colunas no celular**, com densidade maior e sem overflow; documentos recentes compactos.
- Documentos: CTA de upload de largura total no celular, pesquisa normal/IA em abas compactas, filtros em pills roláveis horizontalmente, cartões com valor, status e **alvos táteis mínimos de 44px** para reanalisar/baixar/excluir. Modal de documento funciona como bottom sheet no mobile.
- Não exibir dados fictícios, mesmo usando esse protótipo como base visual.

## Transições originais — requisito
- `motion/react` + `AnimatePresence mode="wait"`.
- Splash com logo centralizado e **barra de progresso índigo animada horizontalmente**, encerrando em fade.
- Entrada do aplicativo em fade, respeitando `useReducedMotion()`.
- Troca Visão geral/Documentos com fade/deslocamento curto e sem cortes bruscos.
- Modal de prévia: fundo escurecendo em fade, painel sobe 30px; fechamento reverso.
- Toast surge de baixo com fade.
- Toda nova interface deve preservar esses movimentos; ajustes de dados, API ou IA não autorizam redesenho visual. A mudança de navegação para footer foi **expressamente aprovada**.

## Regras do produto
- Tela inicial de login, depois **Visão geral** com indicadores reais e **Documentos** para os uploads, busca, visualização, exclusão e extração automática por IA.
- **Não restaurar a sidebar:** a decisão mobile-first com navegação footer (e header no desktop) substitui o layout histórico. Evitar outro redesign sem solicitação explícita.
- Conferir sempre os arquivos congelados antes de editar componentes.

## Revisão mobile-first — 19/11/2026
- Header de 64px no celular e 72px no desktop.
- Footer fixo no celular com duas rotas, destaque animado via `motion/react` e safe area Android/iOS.
- Navegação desktop no cabeçalho, menu lateral abolido.
- Conteúdo responsivo, inputs com fonte mínima de 16px no iOS, preview em bottom sheet, painel de IA/pesquisa em abas.
- Somente documentos e métricas reais, com animações preservadas.

[English](ui-kit.md)