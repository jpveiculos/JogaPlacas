# Target Domain Model — Joga Placas

Status: design proposal derived from docs/PRODUCT_SPEC.md. No database migration is authorized by this document.

## Model boundaries

- **User:** login identity, role (PLAYER/CASHIER/ADMIN), status and password hash. Server enforces role and ownership; admin credentials are provisioned only through server secrets.
- **Purchase:** one checkout and receipt, one payment method, total amount, optional player account owner for player purchases, authenticated cashier as seller for cashier sales, immutable status and idempotency key. A cashier sale must be valid without a customer/contact record.
- **Round:** one concrete scheduled occurrence. A recurrence definition generates separate round records.
- **Participation:** one purchase's entry in one round. Repetition 1–10 creates separate participation records, covered by a single upfront checkout/payment.
- **ParticipationLine:** one plate per participation, preserving display and normalized forms, stake and category allocation in integer cents, plus the rule snapshot applied at purchase time.
- **Customer (legacy/optional):** historical contact record only where old records require it. New player accounts and new cashier sales must not depend on `Customer`; do not create customer contact records for anonymous sales. Retention or deletion of historical rows is a separate reviewed migration.
- **Payment:** belongs to Purchase, not to a single round. Provider references, confirmed amount, status, fees/refunds where supported and idempotency are retained.
- **ProviderEvent:** unique provider event identity, digest, event type, receipt/processing state and redacted diagnostics. Browser state is never proof of payment.
- **LedgerEntry:** append-only financial record with signed integer-cent amount, owner, type, unique idempotency key and optional references to purchase, participation or withdrawal. Any cached balance is secondary and transactionally reconciled.
- **CashierCommission:** sale, cashier, commission rate snapshot and calculated amount. Historical commissions are not silently recalculated.
- **Withdrawal:** owner, amount, encrypted Pix key, idempotency, state history, reviewer relation, reserve/release entries and provider payout reference. Mark paid only after trusted payout confirmation.
- **SettingVersion and AuditEvent:** typed/versioned rule changes with actor and effective time; immutable audit history with redacted metadata.

## Required invariants

1. A purchase uses one payment method only; wallet and Pix cannot be combined.
2. A purchase repeated across N rounds has N independent participations and one upfront checkout/payment.
3. No participation is created retroactively after that round's server-side cutoff.
4. Every plate has at least R$1.00 per round. Its category allocations sum exactly to the stake in integer cents.
5. Receipts can be retrieved/resubmitted without duplicating the sale or participation.
6. Wallet debit, confirmed payment, prize credit, withdrawal reserve/release/payment and refunds are transactionally consistent and idempotent.
7. Withdrawal reservation prevents concurrent spending of the same balance.
8. Cashier-declared cash is distinguished from provider-confirmed payments in reports.
9. Reporting separates sales, confirmed collections, pending/cancelled/refunded amounts, commissions, prizes, fees and net result without double counting.
10. Role and ownership checks occur server-side for every protected operation.
11. Historical purchases preserve the rules and commission terms that applied at the time.
12. Results and closed rounds cannot be silently rewritten; corrections are audited.

## Candidate schema modules

Identity/session; round schedule and concrete rounds; customer and purchase; purchase participations and plate lines; payment, provider events and refunds; ledger and optional reconciled balance cache; cashier commissions and cash reconciliation; withdrawals and state history; versioned settings and audit.

Exact table names may vary, but the boundaries and invariants must remain.

## Unresolved business rules from the manual

Do not invent these during implementation:

- **Prize formula/rounding:** multipliers are defined, but final calculation, rounding and any caps still require explicit definition.
- **Late Pix:** decide refund, manual reconciliation or wallet credit; never backdate participation.
- **Cancelled round:** decide refund versus wallet credit and how multi-round purchases are handled.
- **Cashier cash cutoff:** define the server timestamp/confirmation policy relative to round cutoff; no backdating.
- **Results source/corrections:** define trusted source, approval and audited correction process.
- **Pix payout:** confirm provider supports payout and trusted status confirmation; an admin click alone must not mark a withdrawal paid.
- **Legal/regulatory eligibility:** verify requirements for the exact game and payment model before public launch.

Until the relevant rule is resolved, affected workflow remains disabled for public/production use.

## Migration safety

Do not migrate the current database while this model is being reviewed. Before any migration, validate the schema, review generated SQL, test on a disposable PostgreSQL database, verify backup/restore and document recovery. Never reset an environment that may contain user or financial data.


## Approved identity and receipt rules — 2026-10-26

- Player `User` registration collects only unique username and password (password stored as a secure hash). No required full name, CPF, phone, WhatsApp or email.
- A player purchase uses the authenticated account context and game inputs; no repeated personal data entry. A cashier sale has `cashierId` and no required `customerId`.
- A confirmed purchase has one unique digital receipt and a QR code pointing to its public receipt lookup. Download and print are presentation/export actions and must not create another purchase. Keep receipt QR separate from Pix payment QR.
- ADMIN account search is a privileged maintenance feature over `User` accounts, not a reason to collect personal fields. Enforce role/ownership server-side, paginate and audit administrative actions.
- This is a target model, not proof of schema/service implementation. Any schema change requires migration review and tests on a disposable PostgreSQL database before any real database change.
