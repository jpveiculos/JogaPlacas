# Apuração de prêmios por formato

- Só processa rodadas COMPLETED com os dois resultados presentes e válidos.
- Só considera participações e compras CONFIRMED.
- Aposta cinza compara exclusivamente com resultLegacyPlate; Mercosul exclusivamente com resultMercosurPlate.
- Não converte a quinta posição Mercosul em número. Unidade, dezena, centena e milhar comparam literalmente os últimos 1, 2, 3 e 4 caracteres da placa compactada. No formato Mercosul, o sufixo de quatro caracteres pode conter a letra da quinta posição.
- Multiplicadores vigentes (`approved-v3`): unidade 9x, dezena 30x, centena 300x, milhar 3.000x, três letras iniciais 3.000x e placa completa 300.000x. A mesma tabela vale para placa cinza e Mercosul; cada aposta concorre apenas ao resultado do seu próprio formato. O cálculo usa centavos inteiros, sem arredondamento. Compras anteriores mantêm os multiplicadores gravados em seus snapshots históricos. O cálculo usa centavos inteiros, sem arredondamento.
- `ruleSnapshot` precisa conter `{ version, multipliers }`, com `version` igual a `ruleVersion` e multiplicadores inteiros não negativos para `unit`, `tens`, `hundreds`, `thousands`, `letters` e `fullPlate`. A compra é rejeitada se o snapshot estiver ausente/inválido; a apuração também bloqueia linhas históricas inválidas, sem recorrer silenciosamente aos valores atuais.
- Crédito direto ao jogador usa a chave única prize-credit:<participationLineId> e ocorre na mesma transação da apuração. Reexecuções conferem destinatário e valor do lançamento existente.
- Compra online de jogador autenticado: o prêmio elegível é creditado diretamente na carteira do próprio jogador, com idempotência. Compra presencial vendida por cambista sem carteira vinculada: o prêmio fica pendente para reivindicação pelo QR do recibo e atendimento oficial da plataforma. O cambista nunca recebe nem paga prêmio e não pode dar baixa.

## Bloqueios antes de produção
- Revisar com o manual mestre a comparação da modalidade milhar em placas Mercosul.
- Confirmar migração/compatibilidade e revisar qualquer dado histórico criado antes do formato obrigatório de `ruleSnapshot`; dados sem multiplicadores precisam de reconciliação explícita.
- Executar testes automatizados e integração PostgreSQL.
- Não aplicar migração em produção, ativar pagamentos reais ou mesclar na main até concluir as validações.


## Decisão vigente — pagamento de prêmios exclusivamente pela plataforma (2026-10-28)

Esta regra substitui qualquer instrução anterior que permita ao cambista pagar prêmio, marcar prêmio como pago/dar baixa ou entregar dinheiro de prêmio ao comprador.

- **O cambista nunca paga prêmio.** Não deve existir na área do cambista botão, ação, endpoint ou permissão para pagar prêmio, dar baixa, marcar como pago, confirmar entrega de prêmio ou registrar liquidação manual de prêmio. A área do cambista fica restrita ao registro de novas apostas/vendas e à entrega do recibo original.
- **Compra online com jogador autenticado:** após a apuração oficial, o prêmio elegível é creditado diretamente na carteira online do próprio jogador, de forma transacional e idempotente. A consulta QR pode mostrar o estado oficial, mas não substitui o registro financeiro.
- **Compra presencial feita por cambista, sem carteira de jogador vinculada:** o cliente confere o recibo físico original pelo QR Code. Se o sistema indicar prêmio pendente, a página orienta o cliente a contatar a plataforma pelo botão oficial de WhatsApp. A equipe da plataforma valida o recibo, resultado, valor e estado financeiro e conduz o pagamento diretamente pela plataforma, nunca pelo cambista.
- **O QR Code é a porta de entrada do pedido de resgate, não um pagamento automático.** O WhatsApp inicia o atendimento com os dados mínimos do recibo/rodada/placa/valor indicado; o prêmio só pode ser declarado pago após registro financeiro oficial.
- **Proibir baixa manual de prêmio pelo cambista em todos os caminhos:** interface, API, permissões, ações administrativas delegadas ou endpoints alternativos. Se houver endpoint antigo de baixa/pagamento de prêmio acessível ao papel CASHIER, removê-lo ou negar acesso e adicionar teste de autorização. A reconciliação administrativa de falhas de crédito online permanece exclusiva a ADMIN e não deve ser usada para pagar prêmios de clientes sem carteira.
- Não confundir prêmio com comissão do cambista, confirmação de recebimento da venda, pagamento de saque do jogador ou reconciliação de crédito de carteira.
- Não apagar registros financeiros históricos nem alterar dados de produção nesta mudança. Revisar código e testes antes de afirmar que a proibição técnica está completa.
