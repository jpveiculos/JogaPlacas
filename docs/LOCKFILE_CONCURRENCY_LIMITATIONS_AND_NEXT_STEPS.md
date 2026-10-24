# Registro de limitação e próximos passos — lockfile e concorrência

> **Nota de atualização (2026-10-23):** este documento registra uma inspeção/etapa anterior e contém afirmações que podem não refletir a branch atual. Para o estado vigente, consulte `docs/TECHNICAL_ROADMAP.md`, `docs/PRODUCT_SPEC.md`, `docs/POSTGRES_CONCURRENCY_TEST_PLAN.md` e o código atual. A branch já possui `package-lock.json`, usa `npm ci` na CI e contém `prisma/migrations/20261023000000_init/migration.sql`; o schema foi refatorado para `Purchase`/`PurchaseParticipation`, e o serviço possui retry limitado para conflitos Prisma. Não use as descrições antigas abaixo como retrato do HEAD atual nem como autorização para migração em produção.


**Branch de trabalho:** `planning/foundation`  
**Escopo:** preparar instalação reproduzível e validar concorrência sem tocar na `main` ou no banco de produção.

## Estado confirmado
- O `package.json` declara dependências com faixas semver e, na revisão realizada, não havia `package-lock.json` nesta branch.
- O serviço `src/modules/purchases/create-purchase.ts` contém tentativas limitadas para conflitos Prisma `P2034` e para `P2002` quando o alvo indica a chave de idempotência.
- Os testes unitários existentes simulam erros, mas não comprovam o comportamento concorrente real do PostgreSQL.
- Ainda não há evidência confirmada nesta etapa de uma instalação limpa com `npm ci), de testes concorrentes executados no PostgreSQL, nem de aprovação do pipeline no mesmo commit.
- A estratégia de migração permanece condicionada a testes num banco descartável. Nenhuma migração ou cobrança real deve ser executada nesta etapa.

## Passo 1 — gerar e revisar o lockfile
1. Usar checkout limpo de `planning/foundation` e registrar `node --version` e `npm --version`.
2. Gerar o lockfile com acesso ao registro npm, por exemplo `npm install --package-lock-only --ignore-scripts`.
3. Revisar o diff e confirmar que o `package.json` não foi alterado sem justificativa.
4. Em outro checkout limpo, executar `npm ci`.
5. Executar `npm audit --json`, identificar vulnerabilidades por pacote/caminho e escolher correções compatíveis; não usar `npm audit fix --force` como atalho.
6. Só então versionar o lockfile e alterar o CI para usar `npm ci`, mantendo Node/npm compatíveis e documentados.

**Critério de saída:** o lockfile está no Git e uma instalação limpa com `npm ci` é concluída com sucesso.

## Passo 2 — PostgreSQL descartável e testes de concorrência
1. Provisionar um PostgreSQL efêmero exclusivo para a execução, preferencialmente no CI.
2. Exigir `TEST_DATABASE_URL` explícita; nunca usar `DATABASE_URL` como fallback.
3. Antes de qualquer reset ou criação de schema, validar host, nome do banco e marcador explícito de ambiente de teste. Abortar se houver dúvida; nunca apontar para produção.
4. Preparar schema somente nesse banco descartável enquanto a estratégia de migrações ainda estiver sendo definida.
5. Implementar e executar testes para:
   - chamadas simultâneas idênticas: uma compra e um pagamento por chave;
   - mesma chave com payload diferente: conflito explícito e sem duplicação;
   - falha transacional: nenhum registro parcial;
   - corrida entre compra e fechamento/cutoff da rodada;
   - timeout/repetição sem duplicação.
6. Repetir cem pares de solicitações idênticas e conferir os registros persistidos, não apenas as respostas HTTP.

**Critério de saída:** todos os cenários passam repetidamente no PostgreSQL descartável, com evidência dos resultados.

## Passo 3 — validação do mesmo commit
Executar e registrar no mesmo commit:
- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- suíte de integração PostgreSQL
- `npm audit --json` revisado

## Bloqueios e segurança
- Não declarar concluído um teste que não foi executado.
- Não fabricar lockfile nem ignorar falhas de instalação.
- Não fazer atualização forçada de dependências sem avaliação.
- Não executar migrações, reset de banco ou cobranças reais em produção.
- Não integrar/ativar Mercado Pago e webhooks até a aprovação das etapas anteriores e revisão do impacto.
- Manter as alterações isoladas na branch de trabalho e revisar o diff antes de qualquer proposta de merge.

## Próxima ação
Resolver primeiro o acesso ao registro npm no ambiente de execução, gerar e revisar o lockfile e comprovar `npm ci`. Depois preparar o PostgreSQL descartável e executar os testes de concorrência. Se o ambiente impedir uma etapa, registrar o erro concreto e não marcar o critério como aprovado.
