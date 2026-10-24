# Plano de testes PostgreSQL: concorrência e idempotência

Status: plano ativo para `planning/foundation`. Consulte o código atual antes de usar descrições de comportamento antigas deste documento.

## Estado verificado

- `src/modules/purchases/create-purchase.ts` cria compra, participações, linhas e pagamento pendente na mesma transação Prisma com isolamento Serializable.
- O serviço possui retry limitado para conflitos de serialização Prisma `P2034` (até três retries após a tentativa inicial) e uma nova tentativa para corrida na chave única de idempotência (`P2002`).
- Os testes unitários atuais simulam códigos de erro; eles não substituem concorrência real contra PostgreSQL.
- `package-lock.json` existe e a CI usa `npm ci`.
- `prisma/migrations/20261023000000_init/migration.sql` existe e o workflow aplica migrações a um PostgreSQL descartável.
- A migração de CI não toca a base de produção. Não há autorização para migração produtiva.
- A comparação de idempotência precisa cobrir todos os dados relevantes da solicitação, inclusive o código de recibo, ator/cliente, rodadas, linhas, alocações e snapshots de regra.

## Casos de integração obrigatórios

Executar somente contra um PostgreSQL efêmero criado pelo workflow; nunca usar a variável de ambiente de produção.

1. Duas requisições simultâneas idênticas, mesma chave: deve existir exatamente uma Purchase, uma Payment, o número esperado de participações e as linhas esperadas; ambas as chamadas devem produzir resultado coerente/idempotente.
2. Mesma chave com conteúdo diferente, inclusive código de recibo diferente: uma única compra persistida; a chamada divergente deve retornar conflito de idempotência.
3. Duas chaves diferentes para a mesma rodada perto do cutoff: não aceitar compra se o cutoff tiver ocorrido no ponto de decisão transacional.
4. Fechamento concorrente da rodada: validar serialização e ordem de decisão entre compra e fechamento, respeitando a regra oficial de cutoff.
5. Falha após iniciar a criação da compra e antes de completar pagamento/participações: a transação deve reverter tudo, sem registros parciais.
6. Repetição após timeout do cliente: mesma chave recupera compra existente sem duplicar linhas ou pagamento.
7. Alteração de cada campo relevante sob a mesma chave: a solicitação deve ser rejeitada como conflito e não reutilizar silenciosamente a compra.
8. Executar os cenários concorrentes repetidamente e verificar contagens no banco ao final.

## Configuração de CI

- Usar o serviço PostgreSQL descartável definido em `.github/workflows/verify.yml`.
- Aplicar `prisma migrate deploy` e verificar `prisma migrate status` antes dos testes de integração.
- Usar URL de teste criada pelo workflow e validar que aponta para o serviço efêmero.
- Nunca imprimir segredos ou copiar credenciais de produção para testes.
- Manter testes de unidade e integração separados para que mocks não sejam confundidos com garantias reais do banco.

## Critério de aprovação

Os cenários de concorrência e idempotência devem passar no mesmo commit que passa validação/geração Prisma, lint, typecheck, testes unitários, build e migração em banco vazio. Até a conclusão dos testes e da revisão de segurança, não iniciar migração de produção nem integrar Mercado Pago. A integração do provedor continua reservada à fase final definida no manual.
