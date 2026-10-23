# Schema refactor implementation — first increment

This change is limited to the Prisma schema on `planning/foundation`. It does not create or apply a database migration and does not change production.

## Scope
- Replace the single-round `Bet` ownership with `Purchase` and one `PurchaseParticipation` per round.
- Attach the single payment to `Purchase`.
- Keep a cashier's customer record distinct from a login `User`.
- Add explicit withdrawal reviewer relations and status history.
- Preserve existing money values in integer cents and keep ledger entries auditable.

## Manual rules encoded by this increment
- Repetition is 1–10 rounds, with individual participation records.
- One purchase uses one payment method and one total amount.
- A participation belongs to one round; no retroactive participation after cutoff is allowed by service logic and must be covered by tests.
- Minimum amount is R$1.00 per plate per round; deterministic allocation and prize rounding remain subject to the specification's unresolved implementation decisions.
- Customer records do not implicitly create player accounts.
- Withdrawal review is attributable to a user and state transitions can be audited.

## Important compatibility note
Existing application services currently reference `Bet`, `BetLine`, `Payment.betId`, `Round.bets`, and ledger links to `Bet`. This schema is not ready to merge or migrate until those services and tests are updated together. Existing production data must be mapped explicitly before any migration.

## Validation gate
After service updates, run Prisma validation and client generation, TypeScript, ESLint, unit/integration tests, and production build. Generate migration SQL only for review against a disposable PostgreSQL database. Never apply it to production as part of this increment.
