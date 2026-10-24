# Plano de testes PostgreSQL: concorrência e idempotência

Status: plano ativo para `planning/foundation`. Atualizado em 2026-10-24 após a CI do commit `d714319f7887164c34ec44f4b29d76214b04e38c`.

## Estado verificado

- `src/modules/purchases/create-purchase.ts` cria compra, participações, linhas e pagamento pendente na mesma transação Prisma com isolamento Serializable.
- O serviço possui retry limitado para conflitos de serialização Prisma `P2034` (até três retries após a tentativa inicial) e uma nova tentativa para corrida na chave única de idempotência (`P2002`).
- Testes de integração PostgreSQL cobrem concorrência com a mesma chave de idempotência, conflito de conteúdo, rollback, retry simulado, alterações de campos relevantes e os limites do cutoff.
- Os casos de cutoff rejeitam a compra exatamente em `2035-01-01T12:30:00.000Z` e um milissegundo depois, verificando que Purchase, Payment e PurchaseParticipation não são persistidos.
- A CI do commit `d714319f7887164c34ec44f4b29d76214b04e38c` terminou com sucesso nos três jobs: `verify`, `migration-test` e `postgres-concurrency-test`. Execução: https://github.com/jpveiculos/JogaPlacas/actions/runs/40103208868
- `package-lock.json` existe e a CI usa `npm ci`.
- `prisma/migrations/20261023000000_init/migration.sql` existe e o workflow aplica as migrações a um PostgreSQL descartável.
- A migração e os testes da CI não tocam a base de produção. Não há autorização para migração produtiva.
- A comparação de idempotência cobre dados relevantes da solicitação, incluindo código de recibo, ator/cliente, rodadas, linhas, alocações e snapshots de regra.
- **Bloqueio conhecido:** não existe ainda um serviço/rota real de fechamento de rodada na árvore atual. Portanto, o cenário de compra concorrendo com fechamento ainda não pode ser executado de forma válida; não foi inventado um fluxo de fechamento apenas para satisfazer o teste.
- **Risco pendente:** o parâmetro `now` é capturado antes da transação em `createPendingPixPurchase`. Uma transação que aguarde até depois do cutoff pode validar com um horário desatualizado. A correção deve ser implementada junto da decisão transacional de fechamento e usar uma regra temporal consistente; a CI verde atual não elimina esse risco.

## Casos de integração obrigatórios

Executar somente contra um PostgreSQL efêmero criado pelo workflow; nunca usar a variável de ambiente de produção.

1. Duas requisições simultâneas idênticas, mesma chave: deve existir exatamente uma Purchase, uma Payment, o número esperado de participações e as linhas esperadas; ambas as chamadas devem produzir resultado coerente/idempotente.
2. Mesma chave com conteúdo diferente, inclusive código de recibo diferente: uma única compra persistida; a chamada divergente deve retornar conflito de idempotência.
3. Cutoff: compra antes do cutoff deve ser aceita; compra exatamente no cutoff e depois dele deve ser rejeitada sem registros parciais.
4. Duas chaves diferentes para a mesma rodada perto do cutoff: não aceitar compra se o cutoff tiver ocorrido no ponto de decisão transacional.
5. Fechamento concorrente da rodada: validar serialização e ordem de decisão entre compra e fechamento, respeitando a regra oficial de cutoff. **Pendente até a implementação do fluxo real de fechamento.**
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

Os cenários implementados de concorrência e idempotência devem passar no mesmo commit que passa validação/geração Prisma, lint, typecheck, testes unitários, build e migração em banco vazio. A conclusão integral permanece bloqueada até existir um fluxo real de fechamento e o teste concorrente de compra/fechamento passar. Até a conclusão dos testes e da revisão de segurança, não iniciar migração de produção nem integrar Mercado Pago. A integração do provedor continua reservada à fase final definida no manual.
