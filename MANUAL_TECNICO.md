# Manual técnico — Joga Placa
Atualizado em 28/10/2026.

## Identidade oficial e aplicação global da marca
- Nome público correto: **Joga Placa** (singular). `JogaPlacas` permanece apenas como identificador técnico do repositório GitHub.
- Cabeçalho compartilhado em todas as áreas autenticadas: logomarca original centralizada, usuário conectado no canto esquerdo e botão Sair no canto direito.
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
