# Runbook: lockfile e execução segura de testes concorrentes

## Lockfile: não fabricar nem gerar em produção

O package.json declara faixas semver (`^`) e a branch não contém package-lock.json. Portanto, o grafo atualmente resolvido não está fixado no repositório.

Gerar o arquivo em checkout limpo da branch `planning/foundation`, com a versão de Node/npm que será padronizada no CI:

1. Registrar `node --version` e `npm --version`.
2. Executar `npm install --package-lock-only --ignore-scripts` para gerar o lock sem executar scripts de instalação; revisar o diff e confirmar que package.json não foi alterado.
3. Em checkout limpo, executar `npm ci` e depois `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.
4. Executar `npm audit --json` e identificar pacote direto/transitivo, caminho de dependência, versão corrigida e risco de breaking change. Não usar `npm audit fix --force` como primeira medida.
5. Versionar package-lock.json e configurar o CI para `npm ci`. Fixar a versão principal do Node e manter a versão npm compatível com o lockfile.

Não afirmar que o lockfile foi criado até que o arquivo esteja no Git e um checkout limpo passe por `npm ci`.

## Testes concorrentes com PostgreSQL

Os testes unitários atuais usam mocks e não provam isolamento transacional, restrições únicas ou comportamento real de PostgreSQL. Adicionar uma suíte separada de integração que só execute quando `TEST_DATABASE_URL` estiver definido.

Requisitos de segurança para a suíte:
- Usar PostgreSQL efêmero provisionado pelo CI, com credenciais e nome de banco exclusivos da execução.
- Não usar `DATABASE_URL` como fallback para `TEST_DATABASE_URL`.
- Antes de qualquer reset ou criação de schema, verificar explicitamente host, database e um marcador de ambiente de teste; abortar se qualquer verificação falhar.
- Não usar comandos destrutivos contra um banco cujo ambiente não esteja inequivocamente identificado como descartável.
- Até existirem migrações versionadas, preparar o schema de teste apenas no banco efêmero, e não considerar isso substituto das migrações necessárias para implantação.

## Semântica de idempotência esperada

- Mesma chave e mesmo payload: devolver a compra já persistida; não criar segunda compra, pagamento ou participação.
- Mesma chave e payload diferente: devolver `IDEMPOTENCY_CONFLICT`.
- Tratar apenas conflitos conhecidos de Prisma/PostgreSQL. Para `P2034`, usar retry limitado e com backoff curto, repetindo a transação inteira; para `P2002` na chave única, consultar a compra existente e comparar o payload antes de decidir entre retorno idempotente e conflito.
- Não repetir falhas de validação, erros de conectividade genéricos ou operações externas. Nenhuma chamada ao provedor de pagamento ocorre dentro da transação de banco.
- O retry deve ter limite pequeno e, ao esgotar, retornar erro controlado; nunca gerar cobrança externa.

## Critérios de aprovação

1. Cem pares de chamadas concorrentes idênticas com a mesma chave resultam em uma única compra e um único pagamento.
2. Payloads diferentes com a mesma chave nunca geram uma segunda compra e produzem conflito explícito.
3. Falha injetada dentro da transação não deixa compra, pagamento ou participação parcial.
4. Corrida com o fechamento da rodada respeita o cutoff conforme uma decisão transacional consistente.
5. A suíte passa repetidamente no PostgreSQL de CI e o restante do pipeline passa no mesmo commit.

Até que esses critérios sejam executados e seus logs confirmados, a idempotência concorrente não está aprovada. Mercado Pago, Pix real e migração de produção permanecem bloqueados.