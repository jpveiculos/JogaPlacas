# Mapeamento de dependências da refatoração Purchase/Participation

> **Documento histórico — 2026-10-23; não representa o estado atual da branch.** O inventário e o plano abaixo descrevem `planning/foundation` naquele momento e contêm afirmações superadas (por exemplo, ausência de APIs, migrações e serviços). Para o estado vigente, consulte `docs/TECHNICAL_ROADMAP.md`, `docs/PRODUCT_SPEC.md` e o código em `feature/dual-plate-draw`. Este arquivo é preservado como registro do motivo e das dependências identificadas durante a refatoração, não como checklist ativo nem autorização para migração em produção.


Data da revisão: 2026-10-23
Branch analisada: `planning/foundation`
Fonte funcional: `docs/PRODUCT_SPEC.md`

## Resumo executivo

A branch contém um schema Prisma de destino e módulos puros de domínio com testes, mas o código visível até esta revisão ainda não contém serviços de aplicação para compra, pagamento/Pix/webhook, carteira/livro-razão, saques ou comissões. A árvore `src/app` contém apenas `page.tsx`, `layout.tsx` e `globals.css`; não foi encontrada a pasta `src/app/api`. Também não foi encontrada `prisma/migrations` na branch. Isso significa que não há, nesta branch, uma camada de serviços identificada para adaptar ainda; a integração funcional continua por implementar ou localizar em outra branch/repositório.

## Inventário encontrado

| Área | Arquivos encontrados | Estado do mapeamento |
|---|---|---|
| Regras de compra | `src/domain/purchase-rules.ts`, `src/domain/purchase-rules.test.ts` | Módulo de regras independente; testes de domínio presentes. Não é serviço de persistência. |
| Valores monetários | `src/modules/bets/money.ts`, `src/modules/bets/money.test.ts` | Utilitário de valores e teste presentes. Verificar reutilização na implementação de compra/livro-razão. |
| Normalização de placas | `src/modules/plates/normalize-plate.ts`, `src/modules/plates/normalize-plate.test.ts` | Módulo e testes presentes; precisa continuar ligado às linhas da participação. |
| Janelas de rodada | `src/modules/rounds/round-window.ts`, `src/modules/rounds/round-window.test.ts` | Módulo e testes presentes; ainda falta confirmar integração transacional com a criação/confirmação de participações. |
| Interface Next.js | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | Não foi localizada API/rota de servidor na árvore examinada. |
| Persistência Prisma | `prisma/schema.prisma` | Modelo de destino existe; validação executada localmente não foi possível por esta leitura remota. |
| Migrações | `prisma/migrations` | Diretório não encontrado nesta branch. Não gerar nem aplicar migração até definir e revisar a origem/destino dos dados. |
| CI | `.github/workflows/verify.yml` | Pipeline de verificação existe; seu resultado para o HEAD atual precisa ser consultado separadamente. |

## Dependências de modelo que exigem adaptação quando os serviços forem localizados/criados

- `Bet` / `BetLine` / `BET_DEBIT` (modelos legados mencionados na revisão anterior) devem ser rastreados antes de remoção ou renomeação; a busca no branch atual não encontrou ocorrências de código por busca remota, portanto isso não prova ausência em outras branches ou no sistema em produção.
- Nova cadeia de compra: `Purchase` → `PurchaseParticipation` → `ParticipationLine`.
- Pagamento: `Payment` → `Purchase`; eventos de webhook idempotentes por `(provider, providerEventId)`.
- Livro-razão: `LedgerEntry` pode referenciar compra, participação ou saque; confirmar transações atômicas e chaves idempotentes na camada de serviço.
- Saques: `Withdrawal`, `WithdrawalStatusHistory` e `reviewedBy`; a relação `actorId` do histórico ainda não está formalmente ligada a `User`.
- Cliente de cambista: `Customer.createdById` ainda não tem relação Prisma formal com `User`.

## Lacunas de integridade identificadas no schema

1. `Customer.createdById` é um identificador sem relação formal com `User`.
2. `WithdrawalStatusHistory.actorId` não possui relação formal com `User`.
3. A estrutura não impõe por si só que `Purchase.totalCents` seja igual à soma das participações/linhas, nem que `Payment.amountCents` corresponda à compra; isso exige validação transacional na aplicação e/ou restrições apropriadas.
4. `PaymentMethod.CASH` existe, coerente com vendas do cambista, mas o fluxo de confirmação de recebimento em espécie ainda não foi localizado na aplicação.
5. O manual exige confirmação Pix até o cutoff para participação; o schema sozinho não aplica essa regra. Deve ser coberta por serviço e testes de concorrência/horário.
6. O schema declara `currency` como texto e valores monetários como `Int`; validar limites e valores positivos/negativos na camada de domínio e banco.

## Plano de execução recomendado

1. Confirmar se a implementação de produção está em outra branch/repositório e localizar os serviços ativos antes de qualquer substituição.
2. Executar no ambiente isolado `prisma validate`, `prisma generate`, testes, lint, typecheck e build contra o HEAD exato.
3. Adicionar relações formais para autor de cadastro de cliente e ator do histórico de saque.
4. Implementar uma camada de serviço transacional para criar compra + participações + linhas e confirmar pagamento sem retroagir após cutoff.
5. Implementar/revisar o tratamento idempotente de webhooks, livro-razão, prêmios, estornos, reservas e pagamento de saques.
6. Criar migração explícita somente depois de comparar schema atual de produção, histórico de migrações e plano de conversão de dados; ensaiar com cópia descartável e plano de rollback.
7. Abrir PR e exigir CI verde antes de qualquer implantação.

## Limites desta revisão

Este documento registra uma inspeção estática da árvore e dos arquivos da branch. Não afirma que testes foram executados, que o Prisma foi validado localmente, nem que a aplicação de produção foi alterada. Nenhuma migração ou mudança em produção foi feita.
