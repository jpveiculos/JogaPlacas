# Schema Refactor — Implementation Gates

> **Nota de atualização (2026-10-23):** este documento registra uma inspeção/etapa anterior e contém afirmações que podem não refletir a branch atual. Para o estado vigente, consulte `docs/TECHNICAL_ROADMAP.md`, `docs/PRODUCT_SPEC.md`, `docs/POSTGRES_CONCURRENCY_TEST_PLAN.md` e o código atual. A branch já possui `package-lock.json`, usa `npm ci` na CI e contém `prisma/migrations/20261023000000_init/migration.sql`; o schema foi refatorado para `Purchase`/`PurchaseParticipation`, e o serviço possui retry limitado para conflitos Prisma. Não use as descrições antigas abaixo como retrato do HEAD atual nem como autorização para migração em produção.


Status: working checklist for `planning/foundation`. This file does not authorize a database migration.

## Source of truth
Functional behavior must follow `docs/PRODUCT_SPEC.md`. Architecture boundaries follow `docs/ADR-001-FOUNDATION.md` and `docs/TARGET_DOMAIN_MODEL.md`. Where the product specification explicitly leaves a rule undecided, keep the affected production workflow disabled until the product owner resolves it.

## Confirmed gaps in the current Prisma scaffold

- `Bet` owns a single `roundId` and `Payment` is uniquely attached to one `Bet`; this cannot faithfully represent one upfront checkout covering 1–10 rounds.
- Customer contact fields currently live directly on `Bet`; the product spec requires a cashier customer record that does not automatically become a player account.
- `Withdrawal.reviewedById` is a scalar without a declared relation to `User`, so reviewer identity is not referentially enforced.
- `BetLine` stores category allocations as separate scalar columns; tests must enforce non-negative values and that their sum equals the line stake, and preserve the applied rule snapshot.
- `LedgerEntry` has an idempotency key, but the schema alone does not enforce transaction workflows, sufficient available balance, or correct ledger reconciliation.
- The existing model has no explicit purchase/participation lifecycle or round-specific cutoff eligibility record.
- The branch's `package.json` declares semver ranges, and `package-lock.json` was not found at the branch path queried. Reproducible dependency installation remains an open gate; verify the repository tree before concluding no lockfile exists anywhere.

## Target relationship contract

1. A `Purchase` represents one checkout and one payment method, has a unique idempotency identity and immutable monetary total, and owns zero or one provider payment record as appropriate to the chosen flow.
2. A `PurchaseParticipation` links one purchase to exactly one concrete round. Repetition N produces N participation rows while retaining one checkout/payment. Enforce uniqueness for the same purchase and round.
3. A participation owns its plate lines. Each line stores original display, normalized plate, integer-cent category allocations, and a snapshot of the applicable multiplier/rule version.
4. A cashier `Customer` is distinct from `User`; customer contact data must not create login access implicitly.
5. A payment is attached to the purchase, not a single round. Provider payment IDs and provider event IDs must be unique in the correct provider scope.
6. Webhook delivery is recorded before business effects; duplicate and out-of-order deliveries must be safe and tested.
7. Ledger entries are append-only, have unique idempotency keys, and reference the business event that caused each entry. All related balance and status effects execute in one database transaction.
8. Withdrawal requester and reviewer are separate explicit user relations. Reserve/release/payment entries and status history must be auditable.
9. Round result/rule corrections are represented as audited events or versions, not silent overwrites.
10. Server-side checks enforce cutoff, role and ownership; database relations/constraints provide the final integrity boundary where possible.

## Required tests before any migration

- Schema validation and Prisma client generation.
- Repetition 1 and 10 create exactly N participations with one purchase/payment.
- No participation can be created after the relevant round's server-side cutoff.
- Every plate is at least R$1.00 per round; category allocation sums exactly to the line stake in integer cents.
- Duplicate checkout submission, duplicate webhook, duplicate prize credit and duplicate withdrawal request are idempotent.
- Concurrent debits/withdrawals cannot spend the same available funds twice.
- Payment confirmation does not create a retroactive participation for a round whose cutoff has passed.
- Cashier cash declarations remain distinguishable from provider-confirmed Pix collections.
- Historical multiplier and commission snapshots remain unchanged after configuration updates.
- Reviewer and owner relations, role checks, and audit attribution are validated.

## Migration safety gate

Do not generate/apply a production migration yet. After schema and domain tests pass: generate SQL, review every destructive or data-transforming statement, test against a disposable PostgreSQL database with representative legacy data, verify backup/restore and recovery, and only then request explicit authorization for any production operation.
