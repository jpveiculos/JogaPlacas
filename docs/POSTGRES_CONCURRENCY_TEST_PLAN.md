# Plano de testes PostgreSQL: concorrência e idempotência

## Bloqueio identificado no serviço atual

src/modules/purchases/create-purchase.ts executa a criação dentro de uma transação Serializable e consulta a chave de idempotência antes de inserir. Ainda não há tratamento explícito comprovado para conflitos concorrentes de serialização (Prisma P2034) ou corrida na restrição única da chave (P2002). Sob concorrência, a garantia correta é: uma única compra persistida para uma chave; a mesma requisição deve recuperar a compra já criada; uma requisição diferente com a mesma chave deve retornar conflito de idempotência.

Não adicionar retry indiscriminado. Um retry deve ser limitado, reconhecer apenas erros transitórios específicos, preservar o mesmo conteúdo de requisição e reconsultar a compra após conflitos de unicidade/serialização. Erros de validação e outros erros de banco não devem ser repetidos.

## Casos de integração obrigatórios

Executar somente contra um PostgreSQL efêmero de CI, nunca contra DATABASE_URL de produção.

1. Duas requisições simultâneas idênticas, mesma chave: deve existir exatamente uma Purchase, uma Payment e o conjunto esperado de participações/linhas; ambas as chamadas devem terminar com resultado coerente ou uma resposta idempotente recuperada.
2. Mesma chave com conteúdo diferente: exatamente uma compra persistida; a outra chamada deve terminar com IDEMPOTENCY_CONFLICT, sem segunda cobrança/Payment.
3. Duas chaves diferentes para a mesma rodada, disparadas perto do cutoff: nenhuma compra pode ser criada se o cutoff já tiver ocorrido no ponto de decisão transacional.
4. Fechamento concorrente da rodada: validar serialização e ordem de bloqueio/atualização entre compra e fechamento; se a compra vencer, deve respeitar a regra oficial de cutoff, e se o fechamento vencer, a compra deve ser rejeitada.
5. Falha injetada após criar a compra e antes de completar Payment/participações: a transação deve reverter tudo, sem registros parciais.
6. Repetição após timeout do cliente: a nova chamada com a mesma chave deve recuperar a compra existente sem duplicar linhas ou pagamentos.

## Pré-requisitos de execução

- Provisionar PostgreSQL descartável como serviço do workflow.
- Usar uma URL de teste criada pelo próprio workflow e validar que aponta ao host de serviço efêmero antes de executar comandos de escrita.
- Como a branch revisada não tem prisma/migrations, preparar o schema apenas no banco efêmero com a estratégia de CI aprovada; isso não substitui a criação de migrações versionadas para a implantação.
- Sem lockfile, não declarar a instalação reproduzível nem trocar CI para npm ci. Gerar package-lock.json com a versão de Node/npm adotada, revisar a resolução e vulnerabilidades e só então versioná-lo.
- Executar os testes concorrentes repetidamente para reduzir o risco de passar por sorte; registrar logs, códigos de erro e contagens finais.

## Critério de aprovação

Todos os casos acima devem passar no mesmo commit que passa prisma validate, prisma generate, lint, typecheck, testes unitários e build. Até lá, não iniciar migração de produção nem integração com Mercado Pago.
