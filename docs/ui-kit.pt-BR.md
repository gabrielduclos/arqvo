# Arqvo UI Kit — referência visual permanente

**Referência canônica:** protótipo original no commit [6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7](https://github.com/gabrielduclos/arqvo/tree/6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7). Código congelado em [App.tsx](../design/reference/2026-11-19-original-prototype/App.tsx) e [style.css](../design/reference/2026-11-19-original-prototype/style.css). **Esses arquivos são somente referência: nunca reintroduzir documentos fictícios no aplicativo.**

## Cores e tipografia originais
- Roxo principal `#5146e5` (`brand`), `brand-soft #f0efff`.
- Fundo `#f7f8fc` (`canvas`), texto `#191b2a` (`ink`), secundário `#74798b`.
- Banner/hero Visão geral `#201d42`, luzes roxas desfocadas e texto branco/índigo claro.
- Superfícies brancas, bordas slate-200, fundos indigo-50 para ícones, botões rounded-xl e cards rounded-2xl.
- Fonte Inter com fallback sistema; títulos com espaçamento de letras reduzido; logo minúsculo **arqvo.**, ponto roxo.

## Estrutura original
- Header branco/translúcido fixo, **72px**, borda discreta, largura máxima `1520px`.
- Menu lateral **252px**, fixo abaixo do header, fundo branco, borda e card informativo de segurança. No mobile, menu hambúrguer/drawer — sem substituir por abas horizontais.
- Área principal com `px-5 sm:px-8 lg:px-12 lg:pt-12`.
- Visão geral: banner roxo escuro arredondado **28px** com duas ações, indicadores brancos abaixo, documentos recentes e cards de recursos.
- Documentos: título e botão de upload, card branco de busca, filtros em pills e lista de documentos com ícones, status e dados reais.
- Não exibir dados fictícios, mesmo usando esse protótipo como base visual.

## Transições originais — requisito
- `motion/react` + `AnimatePresence mode="wait"`.
- Splash com logo centralizado e **barra de progresso índigo animada horizontalmente**, encerrando em fade.
- Entrada do aplicativo em fade, respeitando `useReducedMotion()`.
- Troca Visão geral/Documentos com fade/deslocamento curto e sem cortes bruscos.
- Modal de prévia: fundo escurecendo em fade, painel sobe 30px; fechamento reverso.
- Toast surge de baixo com fade.
- Toda nova interface deve preservar esses movimentos; ajustes de dados, API ou IA não autorizam redesenho visual.

## Regras do produto
- Tela inicial de login, depois **Visão geral** com indicadores reais e **Documentos** para os uploads, busca, visualização, exclusão e extração automática por IA.
- Evitar outro redesign sem solicitação explícita.
- Conferir sempre os arquivos congelados antes de editar componentes.

[English](ui-kit.md)