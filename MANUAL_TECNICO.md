# Manual técnico — Joga Placa
Atualizado em 28/10/2026.

## Identidade oficial e aplicação global da marca
- Nome público correto: **Joga Placa** (singular). `JogaPlacas` permanece apenas como identificador técnico do repositório GitHub.
- Cabeçalho único em TODO o site (páginas públicas e áreas autenticadas): somente a imagem oficial da logomarca, centralizada horizontalmente. É proibido colocar usuário, botão Sair, botões de acesso, menu, ícones, títulos ou qualquer outro elemento no cabeçalho. O botão Sair fica separado, no rodapé das áreas autenticadas.
- A logomarca deve permanecer sem itálico, inclinação, filtros ou efeitos.
- Aplicar a marca também na página pública, nos modais de cobrança Pix (QR Code e copia e cola), na verificação pública de recibo e nos recibos impressos/digitais.
- Toda alteração de marca deve ser acompanhada de revisão de títulos, metadados, textos acessíveis, rodapé, fluxo Pix, recibos e documentação. Não renomear o repositório técnico sem revisão separada de URLs e deploy.

## Procedimento obrigatório antes de qualquer trabalho
1. Ler `MANUAL-MESTRE.md` na raiz da branch `feature/public-home-registration`.
2. Consultar a seção pertinente de `docs/PRODUCT_SPEC.md`, fonte de verdade das decisões funcionais.
3. Consultar este manual técnico e `docs/TECHNICAL_ROADMAP.md` para arquitetura, sequência e pendências.
4. Confrontar a decisão solicitada com os documentos e com o código/testes atuais. Se houver contradição, não escolher silenciosamente uma versão: identificar a regra antiga, atualizar a documentação normativa e só então alterar o código.
5. Atualizar a documentação oficial junto com as mudanças de código. Distinguir claramente o que está decidido, documentado, implementado, testado e implantado.
6. Antes de declarar concluído, conferir CI do commit exato, testes pertinentes, build e deploy/logs quando aplicável. Não executar merge, alteração em produção, DNS/domínio, migração produtiva ou cobrança real sem autorização explícita.


## Árvore do repositório e mapa de arquivos (branch de trabalho)

Mapa operacional dos diretórios e arquivos principais, conferido na árvore Git desta branch. Use os caminhos exatos; não crie arquivos paralelos quando já existe um módulo responsável. [Abrir a árvore completa do repositório](https://github.com/jpveiculos/JogaPlacas/tree/feature/public-home-registration).

```text
JogaPlacas/
├── .github/workflows/          # CI e verificações automatizadas
├── public/images/brand/        # Arte oficial da marca
├── public/images/plates/       # Imagens da placa cinza e Mercosul
├── prisma/
│   ├── schema.prisma           # Modelo do banco
│   └── migrations/             # Migrações versionadas
├── docs/
│   ├── PRODUCT_SPEC.md         # Fonte de verdade das regras funcionais
│   ├── TECHNICAL_ROADMAP.md    # Estado técnico, arquitetura e sequência
│   ├── BRANCH-STATUS.md        # Situação das branches
│   ├── PRIZE-SETTLEMENT.md     # Apuração e liquidação de prêmios
│   ├── DUAL-PLATE-DRAW.md      # Sorteios dos dois formatos
│   └── ...                     # ADRs, auditorias, planos e runbooks
├── src/
│   ├── app/
│   │   ├── page.tsx            # Página pública inicial
│   │   ├── player/page.tsx     # Área do jogador
│   │   ├── cashier/page.tsx    # Área do cambista
│   │   ├── admin/page.tsx      # Área administrativa
│   │   ├── login/page.tsx      # Login
│   │   ├── cadastro/page.tsx   # Cadastro
│   │   ├── verificar-recibo/   # Consulta pública via QR Code
│   │   ├── api/                # Rotas HTTP/API por domínio e perfil
│   │   ├── globals.css         # Estilos globais
│   │   └── layout.tsx          # Layout raiz, metadados e CSS
│   ├── components/
│   │   ├── admin/              # Gestão administrativa
│   │   ├── auth/               # Autenticação
│   │   ├── cashier/            # Venda e resumo do cambista
│   │   ├── player/             # Apostas, histórico e carteira
│   │   ├── plates/             # Visualização das placas
│   │   ├── receipts/           # Recibos, QR e impressão térmica
│   │   ├── brand-logo.tsx      # Logomarca reutilizável
│   │   ├── site-header.tsx     # Cabeçalho compartilhado
│   │   └── area-shell.tsx      # Estrutura das áreas autenticadas
│   ├── domain/
│   │   ├── prize-rule-snapshot.ts # Multiplicadores e versão vigente
│   │   ├── allocate-plate-stake.ts # Distribuição da aposta
│   │   ├── purchase-rules.ts   # Regras de compra
│   │   └── cashier-commission.ts # Comissão do cambista
│   └── modules/
│       ├── bets/               # Valores de aposta
│       ├── payments/           # Pagamentos e confirmação
│       ├── plates/             # Normalização e geração de placas
│       ├── purchases/          # Criação e validação de compras
│       └── rounds/             # Rodadas, sorteio e apuração
├── MANUAL-MESTRE.md            # Entrada obrigatória para tarefas
├── MANUAL_TECNICO.md           # Manual e mapa operacional
├── README.md
├── package.json                # Scripts e dependências
└── .env.example                # Exemplo de variáveis sem segredos reais
```

### Onde mexer por tipo de alteração

| Alteração | Arquivo(s) principal(is) | Conferências obrigatórias |
|---|---|---|
| Multiplicadores e versão da regra | `src/domain/prize-rule-snapshot.ts` | `docs/PRODUCT_SPEC.md`, testes de apuração/snapshot e este manual |
| Distribuição da aposta entre categorias | `src/domain/allocate-plate-stake.ts` | Testes de centavos e regra funcional |
| Apuração/liquidação de prêmio | `src/modules/rounds/settle-round-prizes.ts` | Testes unitários e de integração |
| Abrir/fechar/sortear rodadas | `src/modules/rounds/` e `src/app/api/admin/rounds/` | Horários, testes e auditoria |
| Formatos e validação de placas | `src/modules/plates/normalize-plate.ts`, `src/components/plates/plate-visual.tsx` | Cinza e Mercosul; digitação, colagem e API |
| Compra do jogador | `src/components/player/player-purchase-form.tsx`, `src/app/api/player/purchases/route.ts`, `src/modules/purchases/create-purchase.ts` | Pagamento, saldo, recibo, snapshots e idempotência |
| Venda do cambista | `src/components/cashier/cashier-sale-form.tsx`, `src/app/api/cashier/purchases/` | Comissão, pagamento e recibo |
| Recibo, QR e impressão | `src/components/receipts/`, `src/app/api/public/receipt-verification/[receiptCode]/route.ts` | Código único, consulta e impressão |
| Pix/Mercado Pago | `src/modules/payments/`, `src/app/api/webhooks/mercado-pago/route.ts` | Callback, idempotência e reconciliação |
| Logomarca/cabeçalho | `src/components/brand-logo.tsx`, `src/components/site-header.tsx`, `src/app/globals.css` | Todas as áreas e telas responsivas |
| Página pública | `src/app/page.tsx` | Navegação e explicação das regras |
| Banco de dados | `prisma/schema.prisma`, `prisma/migrations/` | Migração, testes e reversão |
| Regras funcionais | `docs/PRODUCT_SPEC.md` | Manter somente a regra atual como normativa |
| Estado e sequência técnica | `docs/TECHNICAL_ROADMAP.md` | Separar implementação, testes e deploy |

**Regra de manutenção:** quando uma regra for substituída, atualizar as seções normativas em todos os manuais/especificações aplicáveis no mesmo trabalho. Manter versões antigas somente para interpretar registros históricos, rotuladas claramente como históricas/superadas; nunca deixá-las parecendo vigentes.


## Fuso horário oficial das rodadas
- Toda entrada e exibição de horário de rodada no painel administrativo deve usar o horário de Brasília, atualmente UTC−03:00.
- O navegador envia horários locais do campo `datetime-local` convertidos para instantes UTC; o servidor persiste os instantes como datas absolutas.
- Para código da rodada e auditoria, interpretar o instante no deslocamento fixo UTC−03:00 (`Etc/GMT+3`, nome IANA com sinal invertido por convenção). Não usar o fuso local do servidor nem o fuso do dispositivo.
- A interface deve identificar o padrão como “Horário de Brasília (UTC−03:00)”.
- A regra atual exige resultado nos minutos :00 ou :30 e início 29 minutos antes do resultado; as apostas fecham um minuto antes do resultado. O servidor valida o intervalo e calcula `cutoffAt`; nunca confiar somente na validação do navegador.
- O uso de UTC−03:00 representa o horário de Brasília vigente. Se a legislação brasileira alterar o fuso oficial, revisar explicitamente esta regra e seus testes antes de mudar o comportamento.
- O código da rodada segue `JP-AAAAMMDD-HHMM`, usando a data e hora do resultado no horário de Brasília. A criação da rodada e o evento de auditoria devem ocorrer na mesma transação serializável.

## Validação de placas nas vendas
- Placa cinza: exatamente três letras ASCII A–Z seguidas de quatro algarismos 0–9 (`ABC1234`), sem hífen na exibição canônica.
- Placa Mercosul: exatamente três letras A–Z, um algarismo, uma letra A–Z e dois algarismos (`ABC1D23`).
- A interface filtra caracteres incompatíveis com cada posição, mas a validação definitiva é feita no módulo `src/modules/plates/normalize-plate.ts` no servidor. Testar entrada digitada, colada e requisições diretas à API.

## Cadastro de cambistas
- A API `POST /api/admin/cashiers` aceita somente os campos definidos pelo esquema estrito: nome completo, usuário, senha, WhatsApp e comissão. Não enviar `status` na criação; o servidor define a nova conta como ativa e exige troca de senha no primeiro acesso.
- A edição usa `PATCH` e pode alterar o status. Senhas são armazenadas como hash; nunca registrar senha em logs nem em eventos de auditoria.
- O formulário deve mostrar erros devolvidos pela API e atualizar a lista após uma criação bem-sucedida.

## Validação e implantação
- Alterações relacionadas a rodadas devem incluir testes da conversão de horário, código de rodada, cutoff e evento de auditoria.
- Após cada commit, verificar o status de CI, o deploy correspondente no Railway, logs de build e runtime, e executar testes de fumaça nas rotas afetadas antes de declarar conclusão.
- Pagamentos reais não devem ser considerados homologados apenas por compilação: confirmar callbacks do provedor, idempotência, reconciliação e registros financeiros em ambiente de teste controlado.


## Multiplicadores vigentes de prêmios — 28/10/2026 (regra atual)

- **Versão vigente para novas apostas: `approved-v4`.**
- Unidade (último caractere): **6x**.
- Dezena (últimos dois caracteres): **30x**.
- Centena (últimos três caracteres): **300x**.
- Milhar (últimos quatro caracteres): **3.000x**.
- Três primeiras letras, na ordem exata: **3.000x**.
- Placa inteira: **300.000x**.
- A tabela aplica-se às placas cinza (`LEGACY`) e Mercosul (`MERCOSUR`), sempre comparando a aposta com o resultado do mesmo formato.
- O multiplicador é aplicado somente ao valor alocado à categoria vencedora, em centavos inteiros. Exemplo de alocação de R$ 1,00: a unidade recebe R$ 0,20; com 6x, o prêmio bruto da unidade é **R$ 1,20**.
- Cada linha de compra guarda `ruleVersion` e `ruleSnapshot`. Novas compras devem gravar `approved-v4`; compras históricas com `approved-v3` conservam o snapshot original e não devem ser recalculadas. A versão antiga não é regra vigente e não deve ser apresentada como tal.
- **Estado da implantação:** código/documentação atualizados na branch `feature/public-home-registration`; a regra só pode ser considerada ativa no site após confirmar testes pertinentes e o deploy do commit exato no Railway.

## Consulta de recibos e área do cambista
- O QR Code impresso no recibo abre a página específica `/verificar-recibo/{receiptCode}`, que consulta o registro oficial, a situação do pagamento, as rodadas e os resultados vinculados àquela compra.
- A página específica do QR não exige login, pois precisa abrir diretamente pela câmera do celular, mas não é um painel geral de resultados: só mostra os dados associados ao código único presente no recibo escaneado.
- Remover a página geral de resultados públicos, a busca pública por código digitado e a API geral de resultados públicos. A conferência do recibo deve começar pelo QR Code impresso.
- A consulta do recibo é somente de leitura: não permite emitir, reimprimir nem recuperar um recibo perdido.
- Não oferecer segunda via de recibo por placa, código, pedido ao cambista ou qualquer outro fluxo. Se o recibo impresso for perdido, não há recuperação nem reemissão.
- Na área do cambista, manter o formulário de registrar uma nova aposta e o menu suspenso financeiro definido na decisão vigente abaixo. Remover histórico detalhado de vendas e opções de consulta de apostas individuais, segunda via ou reimpressão. A antiga instrução de remover todo resumo financeiro foi substituída pela decisão mais recente.
- O cambista orienta o jogador a consultar o recibo original pelo QR Code impresso. A área do jogador continua separada e mantém seu próprio histórico de jogadas e consultas; essa alteração não modifica essa área.
- A página pública específica do QR e a API de verificação devem continuar disponíveis para validar o código do recibo, sem incluir reemissão, regeneração ou impressão de uma nova via.


## Resgate de prêmio pelo recibo QR — decisão de 2026-10-28
- A página `/verificar-recibo/{receiptCode}` é a consulta pública específica do recibo. Quando o sistema oficial indicar uma participação premiada com crédito ainda não confirmado, a página deve orientar o jogador a guardar o recibo físico original e contatar o atendimento oficial para receber instruções de resgate/conferência.
- Exibir o botão **Solicitar resgate pelo WhatsApp** somente quando houver prêmio indicado ainda sem crédito confirmado. O link abre o WhatsApp com mensagem pré-preenchida com código do recibo, código da rodada, placa/formato e valor do prêmio indicado. Não incluir senha, dados de conta, chave Pix ou outros dados sensíveis.
- A mensagem pré-preenchida é um pedido de atendimento, não uma autorização de pagamento. O servidor e a equipe responsável devem validar o recibo, resultado, valor e estado financeiro antes de pagar. Não prometer que o valor já foi pago se não houver confirmação oficial.
- O número do atendimento é configurado pela variável pública `NEXT_PUBLIC_PRIZE_SUPPORT_WHATSAPP`, contendo somente dígitos, com código do país e DDD (Brasil: `55 + DDD + número`). Nunca inventar ou embutir número não confirmado no código. Configurar no serviço web do Railway e fazer novo deploy para a variável pública ser incorporada ao bundle.
- Se a variável não estiver configurada, não mostrar link quebrado nem inventar contato; mostrar aviso de que o contato ainda não foi configurado.
- Este fluxo não oferece segunda via nem reimpressão. O recibo físico original continua sendo a referência; a página QR serve para conferir o registro oficial e iniciar o contato de resgate.
- O fluxo operacional de prêmios de venda do cambista continua sujeito à validação ponta a ponta; a presença do botão não comprova que o pagamento do prêmio está integrado ou concluído.


## Decisão vigente — pagamento de prêmios exclusivamente pela plataforma (2026-10-28)

Esta regra substitui qualquer instrução anterior que permita ao cambista pagar prêmio, marcar prêmio como pago/dar baixa ou entregar dinheiro de prêmio ao comprador.

- **O cambista nunca paga prêmio.** Não deve existir na área do cambista botão, ação, endpoint ou permissão para pagar prêmio, dar baixa, marcar como pago, confirmar entrega de prêmio ou registrar liquidação manual de prêmio. A área do cambista fica restrita ao registro de novas apostas/vendas e à entrega do recibo original.
- **Compra online com jogador autenticado:** após a apuração oficial, o prêmio elegível é creditado diretamente na carteira online do próprio jogador, de forma transacional e idempotente. A consulta QR pode mostrar o estado oficial, mas não substitui o registro financeiro.
- **Compra presencial feita por cambista, sem carteira de jogador vinculada:** o cliente confere o recibo físico original pelo QR Code. Se o sistema indicar prêmio pendente, a página orienta o cliente a contatar a plataforma pelo botão oficial de WhatsApp. A equipe da plataforma valida o recibo, resultado, valor e estado financeiro e conduz o pagamento diretamente pela plataforma, nunca pelo cambista.
- **O QR Code é a porta de entrada do pedido de resgate, não um pagamento automático.** O WhatsApp inicia o atendimento com os dados mínimos do recibo/rodada/placa/valor indicado; o prêmio só pode ser declarado pago após registro financeiro oficial.
- **Proibir baixa manual de prêmio pelo cambista em todos os caminhos:** interface, API, permissões, ações administrativas delegadas ou endpoints alternativos. Se houver endpoint antigo de baixa/pagamento de prêmio acessível ao papel CASHIER, removê-lo ou negar acesso e adicionar teste de autorização. A reconciliação administrativa de falhas de crédito online permanece exclusiva a ADMIN e não deve ser usada para pagar prêmios de clientes sem carteira.
- Não confundir prêmio com comissão do cambista, confirmação de recebimento da venda, pagamento de saque do jogador ou reconciliação de crédito de carteira.
- Não apagar registros financeiros históricos nem alterar dados de produção nesta mudança. Revisar código e testes antes de afirmar que a proibição técnica está completa.


## Implementação aplicada — bloqueio de crédito automático para venda de cambista (2026-10-28)

- Em `src/modules/rounds/settle-round-prizes.ts`, o crédito automático agora exige compra de jogador online sem `cashierId`. Compra originada por cambista permanece pendente para atendimento da plataforma, mesmo se houver dado legado/inconsistente com `playerId`.
- Em `src/app/api/admin/prize-credit-reconciliation/route.ts`, a lista e a ação de reconciliação corretiva filtram explicitamente `cashierId: null`. Esse recurso ADMIN continua reservado à correção de crédito na carteira de jogadores online; não é fluxo de pagamento de prêmio de recibo presencial.
- A área do cambista foi conferida: `src/app/cashier/page.tsx` apresenta somente o formulário de venda; não foi encontrado endpoint de pagamento/baixa de prêmio destinado ao papel CASHIER nos caminhos de API inspecionados.
- A página QR e o botão de WhatsApp já existem, mas a configuração do contato oficial depende de `NEXT_PUBLIC_PRIZE_SUPPORT_WHATSAPP`.
- **Ainda pendente para concluir integralmente o ciclo:** um fluxo administrativo oficial para registrar e auditar o pagamento de prêmio presencial feito pela plataforma e refletir esse estado na página QR. O esquema atual usa `prizeCreditedAt` para crédito em carteira; não se deve reutilizar esse campo para fingir que houve crédito online quando o prêmio foi pago por outro meio.
- **Validação:** alterações de código foram gravadas na branch; testes, typecheck, build e integração PostgreSQL não foram executados nesta sessão. Nenhum deploy foi realizado.

## Atualização automática e validade das rodadas — 2026-10-28
- Nos formulários de compra do jogador e de venda do cambista, consultar a lista de rodadas disponíveis a cada **2 segundos**, enquanto a página estiver visível. Ao voltar à página/aba, consultar imediatamente.
- Manter o temporizador já existente no cliente para atualizar a exibição no horário de encerramento (cutoffAt). Não adicionar um segundo mecanismo de remoção ou de limpeza da seleção que duplique a regra existente.
- A lista retornada pelas APIs de rodadas deve conter apenas rodadas elegíveis. A filtragem visual no cliente melhora a experiência, mas não substitui a validação autoritativa no servidor.
- **Regra obrigatória para aposta e pagamento:** antes de registrar a compra/venda e antes de iniciar ou confirmar qualquer pagamento Pix, o servidor deve revalidar, no mesmo fluxo transacional, que a primeira rodada continua aberta e que todas as rodadas selecionadas ainda aceitam apostas. Se alguma rodada tiver encerrado, recusar a operação sem registrar aposta nem gerar cobrança válida e devolver erro claro em português; o cliente deve atualizar a lista e pedir que a pessoa selecione rodadas válidas novamente. Não confiar no relógio do dispositivo nem somente no estado do carrossel.
- A consulta a cada 2 segundos foi ajustada no código dos dois formulários. A validação ponta a ponta de concorrência entre encerramento e criação de cobrança precisa ser testada e confirmada antes de considerar o fluxo homologado.


## Área do jogador — seções recolhíveis (2026-10-28)
- O formulário principal de compra permanece sempre visível.
- Todo o conteúdo abaixo dele fica em três painéis recolhíveis nativos (`details/summary`): **Carteira digital — Saldo e saques**, **Suas apostas — Histórico dos últimos 7 dias** e **Resultados — Últimos resultados**.
- Os painéis começam fechados para reduzir a rolagem no celular. Cada cabeçalho apresenta título, descrição curta e seta que indica o estado; tocar no cabeçalho abre/fecha o conteúdo.
- A interação usa controles HTML nativos, com foco visível para teclado e área de toque ampla. Não duplicar os componentes internos nem alterar suas regras de saldo, saque, histórico ou resultados.
- A mudança é visual/estrutural; não altera APIs, permissões ou regras financeiras. Testar abertura/fechamento em celular e desktop e confirmar que formulários e ações internas continuam funcionando.


## Ordem dos campos — formulário do cambista (2026-10-28)
- Exibir as placas, o botão **Adicionar mais placas** e a lista de placas adicionadas; logo em seguida, exibir o cartão **Rodadas**.
- Depois do cartão de rodadas, exibir o valor por placa/rodada, a forma de pagamento e o botão de confirmação.
- A alteração é somente de apresentação; preservar as regras e validações existentes de rodadas e pagamento.


## Ajuste de texto — menu da carteira digital do jogador (2026-10-28)
- No menu suspenso da carteira digital, a descrição deve ser exatamente: **“Toque para consultar saldo ou solicitar saque”**. Não usar “seu saldo”, pois o texto deve ser curto e evitar redundância.


## Ajuste de layout — rodadas na área do jogador (2026-10-28)
- No formulário de aposta da área do jogador, exibir o carrossel/cards de rodadas imediatamente abaixo do botão **Adicionar mais placas**. O restante dos campos de valor e forma de pagamento fica depois das rodadas.


## Ajuste visual — cards compactos de rodadas (2026-10-28)
- Os cards horizontais de rodadas nos formulários do jogador e do cambista devem usar altura compacta (cerca de 56–58 px), com padding e tipografia reduzidos para liberar espaço vertical em telas pequenas.
- Preservar leitura do código, horários, seleção por toque, rolagem horizontal e regras de elegibilidade; este ajuste é somente visual.


## Ajuste de espaçamento — formulário Nova aposta (2026-10-28)
- Em telas móveis, remover o espaço superior excessivo antes do título “Nova aposta” nos formulários de jogo do jogador e do cambista, mantendo o cabeçalho/logo e o restante do layout preservados.


## Correção de espaçamento — formulário do cambista (2026-10-28)
- A propriedade `compact` do `AreaShell` agora reduz o espaço entre o cabeçalho e o conteúdo apenas nas páginas que a solicitam.
- O card “Nova aposta” da área do cambista recebe uma classe específica com padding superior reduzido, evitando alterar o espaçamento dos demais cards do site.
- A alteração visual só deve ser considerada concluída após uma implantação bem-sucedida no Railway e conferência na página publicada.


## Regra obrigatória — cabeçalho global padronizado (2026-10-28)

Esta regra substitui qualquer descrição anterior que permita usuário, botão Sair ou outros controles no cabeçalho.

- Todas as rotas devem usar o componente compartilhado `src/components/site-header.tsx`: página inicial, login, cadastro, troca de senha, consulta pública, termos de uso, verificação de recibo e áreas do jogador, cambista e administrador.
- O cabeçalho contém **exclusivamente a logomarca oficial centralizada**. Nenhum botão, menu, ícone, título, nome de usuário, link de navegação ou ação pode ficar dentro do cabeçalho.
- A logomarca deve usar a mesma imagem oficial em todas as páginas, manter sua proporção original, adaptar-se a celular e desktop e nunca ser cortada ou distorcida.
- Os links de navegação da página pública ficam no corpo da página. O botão **Sair** permanece no rodapé das áreas autenticadas, fora do cabeçalho.
- Não criar cabeçalhos alternativos nem duplicar CSS específico por rota. Ajustes devem ser feitos no componente compartilhado e seus estilos globais.
- **Checklist obrigatório após mudanças de interface:** (1) listar todas as rotas em `src/app`; (2) confirmar que todas usam o mesmo componente; (3) verificar se não sobrou cabeçalho antigo ou importação/estilo conflitante; (4) executar lint, typecheck, testes e build; (5) confirmar que o deploy do commit correto terminou com sucesso no Railway; (6) conferir cada rota em celular e desktop, incluindo centralização, altura, proporção e ausência de controles no cabeçalho; (7) registrar aqui e em `docs/TECHNICAL_ROADMAP.md` o resultado e as pendências reais.
- **Estado em 2026-10-28:** a regra foi aplicada ao código e documentada; validação automatizada, deploy e inspeção visual de todas as rotas ainda não foram confirmados. Não declarar o trabalho concluído/publicado antes dessas verificações.


## Procedimento permanente de manutenção do manual (2026-10-28)

Toda solicitação de mudança no Joga Placas deve ser cruzada com este manual técnico antes de alterar o código e novamente depois da implementação:

1. Localizar a regra existente e verificar se a solicitação já está contemplada.
2. Se a regra existente continuar correta, atualizar a seção com o novo comportamento, implementação, evidência e estado de validação; evitar criar uma seção duplicada.
3. Se a regra estiver incompleta, desatualizada ou contradizer a decisão mais recente, corrigir/substituir explicitamente o trecho antigo para não deixar duas instruções conflitantes.
4. Se não houver seção pertinente, acrescentar uma seção nova com data, regra, escopo, arquivos afetados, critérios de aceite e validações pendentes.
5. Atualizar também `docs/PRODUCT_SPEC.md` e/ou `docs/TECHNICAL_ROADMAP.md` quando a mudança alterar requisitos do produto ou o plano técnico. Manter `MANUAL-MESTRE.md` como índice/resumo das decisões importantes.
6. Nunca registrar como concluído, testado ou publicado algo que apenas foi editado no repositório. Distinguir claramente implementação em branch, testes automatizados, deploy confirmado e inspeção visual em produção/desenvolvimento.
7. Antes de encerrar uma tarefa, informar quais documentos foram atualizados, quais verificações foram feitas e quais permanecem pendentes.

Este procedimento é obrigatório para solicitações futuras, não apenas para alterações visuais.


## Correção responsiva da página inicial — 2026-10-28
- Corrigir qualquer uso de `BrandLogo` sem importação explícita na página inicial.
- O cabeçalho deve continuar sendo `SiteHeader`, com a imagem oficial centralizada e nenhum controle extra.
- No celular, o hero passa a uma coluna e as placas ilustrativas usam largura limitada, texto responsivo e sem transformações que provoquem corte horizontal.
- Critérios obrigatórios: build válido; imagem e logomarca sem corte em tela estreita; conteúdo principal visível sem uma imagem dominar a primeira tela; validar a URL publicada após o deploy.
- Situação: código/documentação atualizados; build, deploy e inspeção visual real ainda pendentes.


## Padrão dimensional oficial da logomarca no cabeçalho — 2026-10-28
- Componente único: `src/components/site-header.tsx`; imagem única via `src/components/brand-logo.tsx`, arquivo `/images/brand/joga-placa-logo.jpg`.
- Desktop/tablet: altura CSS responsiva `clamp(64px, 13vw, 80px)`; largura automática, largura máxima de 76% do cabeçalho; `object-fit: contain`.
- Celular (até 480px): cabeçalho com altura mínima de 82px; logomarca com altura responsiva `clamp(60px, 16vw, 68px)`, largura máxima de 80% do espaço disponível.
- Página inicial em celular: altura de 68px e largura máxima `min(80vw, 260px)` para o logo no cabeçalho.
- O cabeçalho deve continuar fino e proporcional à marca, com a logomarca horizontalmente centralizada, sem botões, menus, ícones, título ou usuário. Nunca distorcer nem cortar a imagem; manter `object-fit: contain`.
- Histórico consultado: as decisões anteriores registravam uma tentativa com `max-height: 100px` e, depois, proposta de cabeçalho aproximado de 76px/logo até 76px na área autenticada. O CSS compartilhado mais recente havia reduzido a imagem a 56px na página inicial móvel e 50–62px nas demais telas pequenas. Para unificar e evitar a marca pequena, o padrão atual passa a ser os valores responsivos acima.
- Ao alterar dimensões no futuro, atualizar esta seção e o CSS compartilhado; conferir visualmente jogador, cambista, administrador e página inicial em celular e desktop.
- Estado: padrão documentado e CSS atualizado; aguarda build/deploy e confirmação visual no site publicado.


## Implantação no Hydro — migrações e provisionamento inicial (2026-10-29)

- O erro `The table public.LoginAttemptBucket does not exist` indica que a aplicação acessou o banco antes de a migração correspondente estar aplicada. O modelo `LoginAttemptBucket` existe em `prisma/schema.prisma` e sua migração versionada é `prisma/migrations/20261024010000_login_rate_limit/migration.sql`.
- O arquivo `railway.json` contém `preDeployCommand`, mas essa configuração é específica do Railway e não deve ser considerada um hook de pré-deploy do Hydro.
- Para o Hydro, foi adicionado um `Dockerfile` explícito. O build executa `prisma validate`, `prisma generate` e `next build`. Na inicialização do processo, o script `start` executa `prisma migrate deploy`, o provisionamento idempotente do primeiro administrador e então `next start`. Isso evita exigir acesso ao banco durante o build.
- O provisionamento exige `DATABASE_URL`. Se ainda não existir administrador, também exige `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD` com pelo menos 6 caracteres e `CONFIRM_ADMIN_PROVISIONING=CREATE_FIRST_ADMIN`. Se já existir administrador, o script não altera a conta nem a senha.
- Não usar `prisma migrate reset`, não apagar o banco e não criar a tabela manualmente. As migrações versionadas são a fonte de verdade.
- Configurar as variáveis no serviço de aplicação Hydro, incluindo a URL de conexão interna correta do PostgreSQL. Migrações e provisionamento são executados na inicialização, quando as variáveis de runtime estão disponíveis.
- O Hydro documenta suporte a Dockerfile do repositório; não foi presumido suporte a um arquivo fictício `hydro.json`. O Dockerfile e os scripts foram ajustados no repositório. Ainda é necessário confirmar o novo build/deploy no Hydro, verificar nos logs que as migrações terminaram com sucesso e testar o login. A edição do repositório, sozinha, não comprova que o banco foi atualizado.


## Padrão obrigatório de mensagens em formulários — 2026-10-29

- Toda mensagem de validação, erro de API ou falha de operação deve ficar visível **imediatamente abaixo do botão/ação que a pessoa acabou de acionar**, dentro do mesmo formulário ou bloco de ação. Nunca deixar o único aviso no topo de um cartão/formulário longo, onde pode ficar fora da tela em celulares.
- Erros usam vermelho com contraste alto, fundo/borda de erro e semântica acessível `role="alert"` (com anúncio assertivo quando apropriado). Sucessos usam verde com contraste alto, fundo/borda de sucesso e `role="status"`/anúncio educado. Não diferenciar estado apenas pela cor: o texto precisa explicar o que ocorreu.
- Mensagens devem usar o mesmo espaço visual e alinhamento abaixo do botão, ocupar a largura disponível, quebrar linhas longas e funcionar em celular e desktop. Não usar alertas do navegador como substituto do feedback dentro da página.
- Após sucesso, atualizar a lista/estado exibido quando aplicável e mostrar confirmação explícita. Após falha, preservar os dados digitados para permitir correção; não indicar sucesso antes da confirmação do servidor.
- A regra vale para todos os formulários e ações mutáveis do site: login, cadastro, troca de senha, criação/edição de cambistas, gestão de rodadas, saques, formulários de compra/venda, Pix/carteira e qualquer formulário futuro.
- Componentes reutilizáveis devem manter as mesmas cores, espaçamento, semântica e localização. Evitar mensagens duplicadas no topo e no rodapé do formulário.
- Critério de aceite: provocar pelo menos um erro de validação local, um erro devolvido pela API e um sucesso em cada fluxo crítico; em tela pequena, a mensagem deve aparecer logo abaixo do botão acionado sem exigir rolar até o topo. Verificar leitor de tela/atributos ARIA e estado de carregamento/desabilitação do botão.
- Implementação registrada nesta alteração: CSS global padroniza mensagens `role="alert"` em vermelho e `role="status"` em verde; o cadastro de cambistas, criação manual de rodadas, login, cadastro público e troca de senha exibem feedback abaixo do botão/ação. Os formulários de compra/venda já exibiam seus avisos após o formulário e passam a receber o padrão global de cores.
- Estado: alterações de código/documentação commitadas na branch `feature/public-home-registration`. A padronização completa de todos os formulários e ações administrativas restantes, bem como lint, typecheck, testes, build, deploy e validação visual em celular/desktop, ainda precisa ser auditada antes de declarar a tarefa integralmente concluída.


### Auditoria do fuso horário — 29/10/2026
- A inspeção do endpoint `src/app/api/internal/round-scheduler/route.ts` identificou que a implementação ainda declarava `America/Sao_Paulo`, embora a regra normativa deste manual já exigisse o deslocamento fixo de Brasília UTC−03:00 (`Etc/GMT+3`). O log do deploy confirmou o identificador antigo.
- Não foi encontrada evidência de um “remendo” que mudasse o horário do servidor; o problema confirmado era uma divergência entre a regra documentada e o identificador IANA usado pelo agendador. Atualmente ambos representam UTC−03:00, mas a implementação deve seguir a regra explícita do manual para evitar ambiguidade e manter a árvore consistente.
- Correção registrada na branch de desenvolvimento: o agendador agora usa `Etc/GMT+3` e os nomes auxiliares referem-se a Brasília; o teste de unidade foi alinhado com essa regra.
- Esta alteração ainda precisa passar por testes/CI e novo deploy para que os logs de produção confirmem `timeZone: 'Etc/GMT+3'`. Não considerar a correção implantada apenas porque foi commitada.


## Área do cambista — resumo financeiro em menu suspenso (decisão vigente, 2026-10-29)
- Exibir na área do cambista um menu recolhível chamado **Resumo do cambista**, no rodapé, imediatamente acima do botão **Sair**. Deve iniciar fechado para não ocupar espaço no formulário de venda.
- Ao abrir, mostrar duas janelas/cards lado a lado: **Saldo total das apostas** e **Saldo total da comissão**. Em telas estreitas, permitir que os cards empilhem sem cortar valores.
- O total de apostas soma somente vendas confirmadas do cambista autenticado. A comissão soma os registros oficiais de comissão das vendas confirmadas do mesmo cambista. Não calcular com dados fornecidos pelo navegador nem expor dados de outros cambistas.
- Valores em reais (BRL), atualização automática a cada 30 segundos e consulta ao carregar. Enquanto carrega, mostrar estado de carregamento; em falha, exibir erro visível no próprio menu.
- Reutilizar `GET /api/cashier/summary`, autenticado e restrito ao papel `CASHIER`, com `Cache-Control: no-store, private`.
- Esta decisão substitui a instrução anterior de remover todo resumo financeiro. Não reintroduzir histórico de vendas, busca de recibos, segunda via, reimpressão ou pagamento/baixa de prêmios pelo cambista.
- Implementação registrada na branch `feature/public-home-registration`: componente `CashierSalesSummary` no rodapé de `AreaShell`, acima de Sair; estilos responsivos adicionados ao CSS global. Validar build/testes e deploy antes de considerar publicado.


## Painel administrativo — formulário de criação manual de rodadas oculto (2026-10-29)
- O formulário **Criar uma rodada** não deve aparecer na área administrativa em uso normal, pois as rodadas são criadas pelo agendador automático.
- Não excluir o formulário nem sua lógica do repositório: mantê-los no componente `src/components/admin/admin-round-manager.tsx`, ocultos/desabilitados na interface por padrão, para possível reativação futura mediante alteração explícita de código.
- Manter visíveis a consulta das rodadas existentes e as operações administrativas já disponíveis (quando aplicáveis). Esta mudança afeta somente a exibição do formulário de criação manual.
- Alteração registrada na branch `feature/public-home-registration`; confirmar build, deploy e visualmente que o formulário não aparece, mas a listagem e as operações de rodadas continuam funcionando.


## Painel do administrador — seções em menus suspensos (2026-10-29)
- Para preservar espaço, os módulos principais do painel administrativo devem ficar em seções recolhíveis com seta indicadora, fechadas por padrão.
- Seções atuais: **Rodadas e sorteios**; **Prêmios e carteira digital**; **Controle financeiro e saques**; **Cadastro e gestão de cambistas**.
- Clicar no cabeçalho abre/fecha o conteúdo; o controle deve funcionar por toque em celular e por teclado, com foco visível. O texto secundário explica a finalidade de cada seção.
- A mudança é apenas de apresentação: não remover módulos, formulários, endpoints, permissões ou lógica de negócio. A criação manual de rodadas permanece preservada e oculta conforme regra anterior.
- Implementação registrada em `src/app/admin/page.tsx` e estilos em `src/app/globals.css` na branch `feature/public-home-registration`. Validar build, deploy e comportamento responsivo antes de considerar publicado.


## Painel administrativo — menu suspenso de últimos resultados (2026-10-29)
- Acrescentado menu **Últimos resultados**, fechado por padrão, no painel administrativo, junto das demais seções recolhíveis.
- Reutiliza o componente `PlayerRecentResults`, exibindo até 10 rodadas concluídas com as duas placas e data/hora.
- A API `GET /api/player/results` passa a permitir também o papel `ADMIN`, mantendo autenticação, resultados publicados e cache privado sem armazenamento.
- A mudança reaproveita o componente e a API existentes; não cria lógica duplicada de resultados. Validar autorização, lint/typecheck/testes/build e deploy antes de considerar publicado.
