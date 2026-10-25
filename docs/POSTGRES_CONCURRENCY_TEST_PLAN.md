# Plano de testes PostgreSQL: concorrência e idempotência

Status: plano de verificação da branch `feature/dual-plate-draw`, atualizado em 2026-10-24 após auditoria do HEAD de código `d337082b2d0fa6b24db64a6839d20e24c894fb9e`. A execução de CI desse HEAD terminou com sucesso. As atualizações documentais posteriores acionaram novas execuções, ainda pendentes no momento desta edição. O commit antigo `8ec470dd8c5e0a76be4083d6854dabaac84d3932` citado abaixo é evidência histórica, não o HEAD atual.

## Estado verificado

- `src/modules/purchases/create-purchase.ts` cria compra, participações, linhas e pagamento pendente na mesma transação Prisma com isolamento Serializable.
- O serviço de compra repete, de forma limitada, conflitos de serialização Prisma `P2034` e conflitos PostgreSQL `P2010` com SQLSTATE `40001`; também trata a corrida da chave única de idempotência (`P2002`).
- `src/modules/rounds/close-round.ts` implementa o serviço de fechamento: bloqueia a linha da rodada, relê o estado, valida o cutoff e altera o status para `CLOSED` dentro de transação Serializable. Conflitos de serialização têm repetição limitada.
- Compra e fechamento compartilham o protocolo de bloqueio da linha da rodada. A compra usa `clock_timestamp()` após adquirir os bloqueios, a menos que um horário determinístico seja injetado pelos testes.
- Testes PostgreSQL cobrem idempotência concorrente com mesma chave, conflito de conteúdo, rollback, repetição após timeout simulado, campos relevantes, limites do cutoff e corrida entre compra e fechamento.
- O teste de compra/fechamento aceita dois resultados coerentes: compra confirmada no lado anterior ao cutoff antes do fechamento, ou compra rejeitada se o fechamento ganhar a disputa. Em ambos os casos verifica estado final e ausência de registros parciais no caminho rejeitado.
- **Cobertura temporal adicional:** além da corrida com horários determinísticos, a suíte contém um teste que mantém um bloqueio PostgreSQL até o cutoff real passar, verifica por `pg_stat_activity` que a compra está esperando pelo lock e confirma que a compra é rejeitada sem registros parciais após a liberação. Esse teste passou na CI do commit `8ec470dd8c5e0a76be4083d6854dabaac84d3932`.
- A execução histórica do commit `8ec470dd8c5e0a76be4083d6854dabaac84d3932` terminou com sucesso nos três jobs (`verify`, `migration-test` e `postgres-concurrency-test`): https://github.com/jpveiculos/JogaPlacas/actions/runs/40114297532. A execução mais recente consultada para o HEAD de código `d337082b2d0fa6b24db64a6839d20e24c894fb9e` também terminou com sucesso no workflow Verify. Não afirmar que todos os testes locais foram executados nesta conversa.
- `package-lock.json` existe e a CI usa `npm ci`.
- `prisma/migrations/20261023000000_init/migration.sql` existe e o workflow aplica as migrações a um PostgreSQL descartável.
- A migração e os testes da CI não tocam a base de produção. Não há autorização para migração produtiva.
- A comparação de idempotência cobre dados relevantes da solicitação, incluindo código de recibo, ator/cliente, rodadas, linhas, alocações e snapshots de regra.
- O serviço de fechamento está implementado, mas ainda não foi encontrado um endpoint/rota de aplicação que o exponha. Isso não deve ser confundido com um fluxo operacional já disponível para usuários ou administradores.

## Casos de integração obrigatórios

Executar somente contra um PostgreSQL efêmero criado pelo workflow; nunca usar a variável de ambiente de produção.

1. Duas requisições simultâneas idênticas, mesma chave: deve existir exatamente uma Purchase, uma Payment, o número esperado de participações e as linhas esperadas; ambas as chamadas devem produzir resultado coerente/idempotente.
2. Mesma chave com conteúdo diferente, inclusive código de recibo diferente: uma única compra persistida; a chamada divergente deve retornar conflito de idempotência.
3. Cutoff: compra antes do cutoff deve ser aceita; compra exatamente no cutoff e depois dele deve ser rejeitada sem registros parciais.
4. Duas chaves diferentes para a mesma rodada perto do cutoff: não aceitar compra se o cutoff tiver ocorrido no ponto de decisão transacional.
5. Fechamento concorrente da rodada: a corrida determinística está coberta, assim como o teste temporal que mantém a compra bloqueada até depois do cutoff real e verifica a rejeição após o desbloqueio.
6. Falha após iniciar a criação da compra e antes de completar pagamento/participações: a transação deve reverter tudo, sem registros parciais.
7. Repetição após timeout do cliente: mesma chave recupera compra existente sem duplicar linhas ou pagamento.
8. Alteração de cada campo relevante sob a mesma chave: a solicitação deve ser rejeitada como conflito e não reutilizar silenciosamente a compra.
9. Executar os cenários concorrentes repetidamente e verificar contagens no banco ao final.

## Configuração de CI

- Usar o serviço PostgreSQL descartável definido em `.github/workflows/verify.yml`.
- Aplicar `prisma migrate deploy` e verificar `prisma migrate status` antes dos testes de integração.
- Usar URL de teste criada pelo workflow e validar que aponta para o serviço efêmero.
- Nunca imprimir segredos ou copiar credenciais de produção para testes.
- Manter testes de unidade e integração separados para que mocks não sejam confundidos com garantias reais do banco.

## Critério de aprovação

Os cenários implementados de concorrência e idempotência devem passar no mesmo commit que passa validação/geração Prisma, lint, typecheck, testes unitários, build e migração em banco vazio. A CI do commit citado está verde, e a cobertura temporal de bloqueio atravessando o cutoff passou. Permanecem pendentes a repetição dos cenários para avaliar estabilidade e a exposição segura do serviço de fechamento por uma rota autenticada/autorizada. Até concluir testes, revisão de segurança e os fluxos de aplicação, não iniciar migração de produção nem integrar Mercado Pago. A integração do provedor continua reservada à fase final definida no manual.
