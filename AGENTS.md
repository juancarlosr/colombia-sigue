<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Agent Guide — Colombia Sigue

Payroll-giving MVP for Colombia. Employees authorize a voluntary monthly payroll deduction; the company deducts and transfers directly to one foundation; **the platform never touches money** — it records authorizations and makes the flow traceable. The product spec (ground truth for any audit) is [docs/payroll_giving_mvp_prompt.md](docs/payroll_giving_mvp_prompt.md) — 32 sections, in Spanish (§32 is the post-v0 change log).

## Run it locally

Requirements: Node 20+, Docker.

```bash
docker compose up -d db                 # Postgres 16 on port 5433
cp .env.example .env                    # then set SESSION_SECRET (min 32 chars):
#   openssl rand -base64 48
npm install
npx prisma generate                     # Prisma 7: migrate does NOT auto-generate
npm run db:migrate
npm run db:seed                         # deterministic demo data, safe to re-run
npm run dev                             # http://localhost:3000
```

Verification: `npm test` (needs the DB up), `npm run lint`, `npm run typecheck`, `npm run build`.

## Logging in (passwordless — read this or you can't navigate)

There are no passwords. Login is via single-use magic links (15 min TTL). Without a `RESEND_API_KEY`, "emails" are printed to the dev-server console. The fastest way to log in as anyone:

```bash
npx tsx scripts/mint-login-token.ts <email>
# open http://localhost:3000/auth/verify?token=<printed token>
# the page shows a "Continuar" button — the GET only validates; the POST consumes.
```

### Demo accounts (all seeded, no real data anywhere)

| Role | Email | Lands on |
|---|---|---|
| Platform admin | `platform@colombiasigue.example.com` | `/platform` |
| Company admin (ACME) | `rrhh@acme.example.com` | `/admin` |
| Company admin (others) | `rrhh@celerik.example.com`, `rrhh@gutierrezgroup.example.com`, `rrhh@sanremo.example.com`, `rrhh@cubia.example.com` | `/admin` |
| Employee, active donor with history | `ana.gomez@acme.example.com` | `/app` |
| Employee, never donated (full journey available) | `sofia.herrera@acme.example.com` | `/app` |
| Employee, amount-change history (SUPERSEDED chain) | `maria.lopez@acme.example.com` | `/app` |
| Employee, cancelled authorization | `diego.martinez@acme.example.com` | `/app` |

Seed: 5 companies at different pilot stages (Celerik/ACME have 3 months of payroll history incl. completed cycles; Gutierrez has a fresh snapshot; San Remo has undransferred results; Cubia is empty). Re-running `npm run db:seed` resets everything and invalidates sessions.

## Architecture map

- Next.js 16 App Router monolith, TypeScript, Tailwind 4 + shadcn (Base UI), Prisma 7 + Postgres.
- Domain logic lives in `src/lib/` (`donations.ts`, `payroll.ts`, `employee-import.ts`, `invitations.ts`, `metrics.ts`, `company-overview.ts`, `csv.ts`); server actions in `src/app/**/actions.ts` are thin guards over it. Tests are colocated `*.test.ts` (44, DB-backed).
- Auth: hand-rolled (deliberate — Auth.js v5 was beta): hashed single-use tokens (`src/lib/auth/tokens.ts`), jose JWT session cookie, role re-checked against the DB on every request (`src/lib/auth/guards.ts`). RBAC: `EMPLOYEE` → `/app`, `COMPANY_ADMIN` → `/admin` (scoped via `adminUserId`, never client-supplied company ids), `PLATFORM_ADMIN` → `/platform`.

## Company self-registration

Companies self-register at `/empresas/inscripcion` (public form): NIT validated with the
DIAN check-digit algorithm (`src/lib/nit.ts`), corporate email required (free providers
blocked), participation agreement (v0-draft, `src/lib/participation-agreement.ts`)
accepted with append-only evidence. Requests land as `Company.status = PENDING`, the
contact verifies their email via `/empresas/verificar` (peek-on-GET, consume-on-POST),
and the platform admin approves/rejects from `/platform`. Approval creates the
COMPANY_ADMIN user — never before. PENDING/REJECTED companies must never appear in
overviews nor grant any access.

## Invariants worth attacking in an audit

1. `DonationAuthorization` is append-only: amount changes create a new row and mark the old `SUPERSEDED` (linked via `supersededById`); cancellation sets `CANCELLED`. Stored consent (text, version, document, email, IP, UA in `metadata`) must never mutate.
2. At most one `ACTIVE` authorization per employee (per-employee Postgres advisory lock).
3. The monthly flow operates on the **operating period** (most recent OPEN, un-transferred), not the calendar month; a new month opens only when the previous is transferred/closed; abandoned periods (≥2 months behind, zero deductions) auto-close. Downloading the payroll CSV syncs the snapshot; rows past AUTHORIZED are never rewritten; transferred/closed periods are immutable.
4. Results CSV amounts are digits-only (`20.000` must be rejected, not read as 20 pesos); absent employees mean "no contribution this month".
5. Foundation bank data must never reach an employee-facing page. Employee document numbers must not appear on platform pages (data minimization, spec §21).
6. Login must not reveal whether an email is registered; magic-link GET must not consume the token (mail-scanner protection).

## Known and accepted — do not re-report

- Authorization text is `v0-draft`, pending Colombian labor lawyer sign-off (spec §28 launch gate, tracked).
- No email provider in dev: console logging is the intended mode.
- Rate limiting is in-memory, single-instance (pilot deploys one instance).
- Aggregations in `company-overview.ts`/`metrics.ts` are JS-side, documented as pilot-scale.
- No company CRUD (spec keeps it out of the MVP); foundation is a singleton.
- Deliberately deferred small items: transfer-proof URL field (§14), foundation export CSV (§16), invite-button resend cooldown, documented employee-departure procedure.

## Suggested audit focus

1. Break RBAC: cross-role access, cross-company data leaks via server actions, IDOR on period/company ids.
2. Break the state machines: race conditions on confirm/cancel, period lifecycle edge cases across month boundaries.
3. Spec fidelity: sections 4–10 dictate exact user-facing Spanish copy; sections 25/31 forbid unrequested features.
4. Money-data integrity: CSV import/export edge cases, totals consistency across employee/admin/platform views.
