# Gate C — revisão do schema atual contra o manual

Status: **bloqueado para migração**. Esta revisão é deliberadamente não destrutiva: não altera nem migra banco algum.

## Divergências confirmadas em `prisma/schema.prisma`

1. **Compra e rodada estão acopladas.** `Bet` contém `roundId` e `Payment` tem relação única com `Bet`. Isso não representa uma única compra/pagamento cobrindo de 1 a 10 rodadas com participações independentes. O destino precisa separar `Purchase`, `Participation` e `Payment`.
2. **Linha de aposta sem participação/rodada própria.** `BetLine` pertence à aposta atual; depois da separação, cada linha deve pertencer à participação da rodada e preservar placa exibida/normalizada, alocação por categoria e snapshot das regras.
3. **Revisor de saque sem relação.** `Withdrawal.reviewedById` é apenas uma string opcional; não há relação declarada com `User`, nem histórico de transições do saque.
4. **Referências financeiras insuficientes para reconciliação completa.** `LedgerEntry` aponta para `Bet`, mas o modelo-alvo exige referências coerentes à compra/participação/saque, histórico append-only e chaves de idempotência por operação.
5. **Comissão de cambista ausente como entidade própria.** O schema atual não preserva a taxa e o valor de comissão aplicados a cada venda, conforme o manual exige.
6. **Configuração histórica incompleta.** `SettingChange` mantém texto anterior/novo, mas não modela explicitamente versão efetiva das regras e snapshots usados por compras antigas.
7. **Eventos de webhook têm boa base de deduplicação**, com unicidade por provedor e ID de evento, mas a aplicação ainda precisa provar validação de autenticidade, tratamento de eventos fora de ordem, reprocessamento seguro e confirmação até o corte.

## Invariantes obrigatórias para aceitar o schema

- Uma compra pode conter de 1 a 10 participações, uma por rodada, com um checkout/pagamento integral.
- Não existe participação criada retroativamente depois do corte da rodada.
- Cada placa em cada rodada respeita o mínimo de R$ 1,00; as alocações por categoria somam exatamente o valor da placa, em centavos inteiros.
- Pagamento, participação, débito/crédito financeiro, estorno e saque são idempotentes e consistentes sob concorrência.
- Uma reserva de saque impede gasto simultâneo do mesmo saldo; o revisor é um usuário real e o pagamento só fica concluído após confirmação confiável.
- Comissão aplicada e regras/multiplicadores são preservados como snapshot histórico.
- Venda em dinheiro declarada pelo cambista é distinguível de Pix confirmado pelo provedor.
- Correções de resultado, cancelamentos e alterações administrativas deixam trilha de auditoria.

## Testes de aceitação antes de qualquer migração

1. Validar schema e gerar o Prisma Client.
2. Criar e consultar uma compra com 1, 2 e 10 rodadas, mantendo um pagamento e participações independentes.
3. Tentar criar participação após o corte e comprovar rejeição no servidor.
4. Reentregar o mesmo webhook e enviar eventos fora de ordem; comprovar que não há cobrança/crédito/participação duplicados.
5. Executar duas solicitações concorrentes de saque/débito sobre o mesmo saldo e comprovar que o saldo não fica negativo nem é reservado duas vezes.
6. Conferir rateio com várias placas e categorias, incluindo centavos residuais, sem perda nem criação de centavos.
7. Testar migração em banco PostgreSQL descartável, revisar SQL e demonstrar recuperação antes de considerar qualquer ambiente real.

## Decisões de negócio que continuam bloqueando fluxos específicos

A especificação funcional ainda deixa em aberto fórmula final/arredondamento de prêmios, política para Pix confirmado depois do corte, tratamento de rodada cancelada e fonte/processo de correção de resultados. Não inventar essas regras durante a refatoração; manter os fluxos afetados desabilitados até decisão explícita.

## Próxima ação

Refatorar o schema em branch isolada para separar compra, participação e pagamento e completar relações de saque/comissão/auditoria. Depois validar geração e testes em banco descartável. **Não criar nem aplicar migração de produção nesta etapa.**
