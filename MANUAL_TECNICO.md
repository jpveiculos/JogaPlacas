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


## Multiplicadores vigentes de prêmios — 28/10/2026
- Versão da regra: `approved-v3`.
- Tabela aplicada igualmente às placas cinza (`LEGACY`) e Mercosul (`MERCOSUR`): unidade 9x; dezena 30x; centena 300x; milhar 3.000x; três primeiras letras na ordem exata 3.000x; placa inteira 300.000x.
- A apuração compara cada aposta exclusivamente com o resultado do mesmo formato de placa. A multiplicação é aplicada ao valor alocado à categoria vencedora, em centavos inteiros.
- Cada compra nova grava um snapshot da versão vigente. Apostas antigas mantêm os multiplicadores registrados no snapshot original; não se reescreve o histórico ao mudar a regra.
- Testes atualizados para confirmar que a alocação de R$ 0,20 na unidade, multiplicada por 9x, resulta em R$ 1,80 de prêmio bruto.
- A alteração no repositório não comprova publicação no ambiente de produção. Validar CI, testes de integração e deploy antes de declarar a regra ativa no site.


## Consulta de recibos e área do cambista
- O QR Code impresso no recibo abre a página específica `/verificar-recibo/{receiptCode}`, que consulta o registro oficial, a situação do pagamento, as rodadas e os resultados vinculados àquela compra.
- A página específica do QR não exige login, pois precisa abrir diretamente pela câmera do celular, mas não é um painel geral de resultados: só mostra os dados associados ao código único presente no recibo escaneado.
- Remover a página geral de resultados públicos, a busca pública por código digitado e a API geral de resultados públicos. A conferência do recibo deve começar pelo QR Code impresso.
- A consulta do recibo é somente de leitura: não permite emitir, reimprimir nem recuperar um recibo perdido.
- Não oferecer segunda via de recibo por placa, código, pedido ao cambista ou qualquer outro fluxo. Se o recibo impresso for perdido, não há recuperação nem reemissão.
- Na área do cambista, manter somente o formulário de registrar uma nova aposta. Remover histórico/resumo de vendas e opções de consulta de apostas, resultados e segunda via.
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
