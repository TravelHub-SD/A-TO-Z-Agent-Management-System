# A TO Z — Agent Management System

An internal web application for the **A TO Z** travel agency to manage its
external travel agents: their tickets, outstanding balances, payments,
transaction numbers, statements, reports and a complete audit history.

---

## 1. What this system is (and is not)

**External agents do not have accounts and never sign in.** There is only an
internal A TO Z dashboard. A TO Z staff create and manage agent records
(Travel Hub, Agent B, Agent C …) on their behalf.

The agent receives ticket and payment information outside the system. When the
agent pays A TO Z, staff receive the notification externally and then record
that payment here:

```
A TO Z Admin/Staff  →  manages  →  Agents  →  manages  →  Tickets  →  records  →  Payments
```

There is no agent portal, no agent credentials and no public registration.

The application answers four questions immediately:

| Question | Where |
| --- | --- |
| Who owes A TO Z money? | Dashboard → Total Outstanding, "Who owes A TO Z" |
| How much do they owe? | Agents list → Outstanding column; agent page balance |
| What exactly is the debt? | Agent statement → ticket-level running balance |
| Who paid, and what confirms it? | Payments → transaction number + audit log |

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 with a custom design-token theme |
| UI primitives | Radix UI + shadcn-style components written in-repo |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Validation | Zod (shared by client forms and server routes) |
| Auth | HS256 JWT session cookie (`jose`) + bcrypt password hashing |
| Charts | Recharts |
| Exports | ExcelJS (.xlsx), hand-rolled CSV, jsPDF + autoTable (PDF) |

---

## 3. Getting started

### Prerequisites

- Node.js 20+ (developed on 22)
- PostgreSQL 14+ (developed on 16)

### Install

```bash
git clone <repository-url>
cd A-TO-Z-Agent-Management-System
npm install
```

### Configure

```bash
cp .env.example .env
```

Then edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/atoz_agent_management?schema=public"
AUTH_SECRET="<at least 32 random characters>"
AUTH_SESSION_MAX_AGE_HOURS=12
```

Generate a secret with:

```bash
openssl rand -base64 48
```

The application refuses to start a session if `AUTH_SECRET` is missing or
shorter than 32 characters.

### Create the database

```bash
createdb atoz_agent_management     # or: CREATE DATABASE atoz_agent_management;
npm run db:migrate                  # applies prisma/migrations
npm run db:seed                     # development data (see below)
```

### Run

```bash
npm run dev                         # http://localhost:3000
```

---

## 4. Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by Prisma. |
| `AUTH_SECRET` | yes | Signing key for the session cookie. Minimum 32 characters. |
| `AUTH_SESSION_MAX_AGE_HOURS` | no | Session lifetime in hours. Default `12`. |
| `APP_ORIGIN` | no | Public origin (e.g. `https://agents.example.com`). Only needed when a proxy rewrites the `Host` header, so same-origin checks resolve correctly. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | no | Override the seeded admin credentials. |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | no | Override the seeded staff credentials. |
| `SEED_ALLOW_PRODUCTION` | no | Must be `true` to let the seed script run with `NODE_ENV=production`. |

Never commit `.env`. `.env.example` is committed and contains no real secrets.

---

## 5. Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (production/CI) |
| `npm run db:seed` | Load development seed data |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate and re-seed (development only) |

---

## 6. Development credentials

`npm run db:seed` creates two accounts. **These are development credentials
only — change or remove them before deploying anywhere real.**

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@atoz.local` | `ChangeMe!2024` |
| STAFF | `staff@atoz.local` | `StaffPass!2024` |

The seed also creates four agents (Travel Hub `TH001`, Agent B `AGB002`,
Agent C `AGC003`, Nile Bridge Tours `NLB004`), 18 tickets spread over the last
three months with a mix of paid and unpaid, 10 payments with transaction
numbers, and matching audit-log entries.

The seed script refuses to run against `NODE_ENV=production` unless
`SEED_ALLOW_PRODUCTION=true` is set explicitly.

---

## 7. Roles and permissions

Accounts are created by an administrator from **Settings → Users**. There is no
public sign-up route.

| Capability | ADMIN | STAFF |
| --- | :---: | :---: |
| View agents, tickets, payments, reports, activity log | ✓ | ✓ |
| Create and edit agents | ✓ | ✓ |
| Create and edit tickets (unpaid only) | ✓ | ✓ |
| Record payments | ✓ | ✓ |
| Export reports | ✓ | ✓ |
| Activate / deactivate agents | ✓ | — |
| Delete tickets (unpaid only) | ✓ | — |
| Reverse payments | ✓ | — |
| Manage user accounts | ✓ | — |
| Change system settings | ✓ | — |

The matrix lives in `src/lib/auth/permissions.ts` and is enforced server-side on
every page, service call and API route. Navigation is filtered by the same
matrix, so staff never see a link to something they would be refused.

---

## 8. The payment workflow

Marking a ticket paid is a financial act, so it is never a casual toggle.

1. A ticket is created and starts as **🔴 UNPAID** with no transaction number.
2. The agent pays A TO Z outside the system.
3. Staff open the ticket and click **Record Payment**.
4. A confirmation dialog restates the **agent**, **PNR**, **amount** and
   **payment date**, and requires the **4-digit transaction number**.
5. On confirmation the system, **in one database transaction**:
   - locks the ticket row (`SELECT … FOR UPDATE`) so two people cannot pay it at once;
   - re-checks that it is still `UNPAID`;
   - verifies the transaction number is exactly four digits and globally unused;
   - creates the `payments` row (amount always equals the ticket amount);
   - sets the ticket to `PAID`;
   - writes `CREATE_PAYMENT` and `MARK_TICKET_PAID` audit entries.
6. The ticket becomes **🟢 PAID**, the amount turns green, and dashboard
   totals, agent balances and statements update immediately.

If any step fails, the whole transaction rolls back — a ticket can never be
`PAID` without a matching payment record, or vice versa.

### Transaction numbers

Exactly four digits, validated on the client **and** re-validated on the
server (`4827` valid; `482`, `48270`, `AB27`, `4A27` rejected). Transaction
numbers are **globally unique**, enforced by a database constraint as well as
an application check.

### Partial payments

Not supported in version 1. A payment always equals the full ticket amount; a
request carrying a different amount is rejected.

---

## 9. Agent statements

Every agent has a financial statement at `/agents/:id/statement`.

- **Tickets are debits**, **payments are credits**, and the balance column is
  the running amount owed to A TO Z after each entry.
- Selecting a period folds everything before it into a **balance brought
  forward** row, so the running balance stays correct rather than restarting
  at zero.
- Exportable to PDF, Excel and CSV, and print-styled for a clean paper copy.

---

## 10. Reports

Four reports at `/reports`, each filterable by agent, status and date range:

| Report | Contents |
| --- | --- |
| Agent Report | Activity for one agent, or the position across all agents |
| Payment Report | Payments received in a period |
| Outstanding Report | All unpaid tickets with days outstanding |
| Ticket Report | All tickets in a period |

Every report exports to **PDF**, **Excel (.xlsx)** and **CSV**. CSV and Excel
are produced on the server from the same report structure the table renders, so
the three formats can never disagree. PDF is generated in the browser, which
keeps the PDF library out of the server bundle.

CSV exports prefix values beginning with `=`, `+`, `-` or `@` with a quote to
prevent formula injection when opened in a spreadsheet.

---

## 11. Audit trail

Every significant action is recorded in `audit_logs` with the acting user, a
human-readable summary, the client IP, and — for state changes — JSONB
snapshots of `old_values` and `new_values`.

Tracked actions: `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `USER_CREATED`,
`USER_UPDATED`, `CREATE_AGENT`, `UPDATE_AGENT`, `CREATE_TICKET`,
`UPDATE_TICKET`, `DELETE_TICKET`, `MARK_TICKET_PAID`, `CREATE_PAYMENT`,
`UPDATE_PAYMENT`, `REVERSE_PAYMENT`, `UPDATE_SETTINGS`.

Audit writes that accompany a data change run inside the same transaction, so a
change can never be committed without its log entry. The log is append-only:
nothing in the application edits or deletes an entry.

The **Activity Log** page shows the trail with filters for action, record type,
user and date range; entries with snapshots expand to a before/after field
comparison. Ticket and payment detail pages show their own history inline.

---

## 12. Architecture

```
prisma/
  schema.prisma            Models, enums, indexes, constraints
  migrations/              Committed SQL migrations
  seed.ts                  Development seed data

src/
  middleware.ts            Edge auth gate; redirects unauthenticated requests

  app/
    (auth)/login/          The only public page
    (app)/                 Every internal page; layout enforces the session
      dashboard/  agents/  tickets/  payments/
      reports/  activity/  settings/
    api/                   REST endpoints (thin wrappers over services)

  components/
    ui/                    Primitives: button, input, dialog, table, badge…
    layout/                Sidebar, topbar, mobile drawer, global search
    shared/                Stat card, status badge, money, filters, pagination
    agents/ tickets/ payments/ reports/ activity/ settings/

  lib/
    prisma.ts              PrismaClient singleton
    constants.ts           Currencies, timezones, patterns, page sizes
    auth/                  session, password, permissions, guard, rate-limit, csrf
    validation/schemas.ts  Zod schemas shared by client and server
    services/              All business logic
    export/                CSV and XLSX writers
    utils/                 currency, dates, errors, request, cn, api-client
```

**The service layer is the single source of truth.** Server Components call
services directly for fast server-side rendering; API routes are thin HTTP
wrappers around the same functions. Business rules therefore cannot be bypassed
by calling a different entry point.

Amounts are stored as `DECIMAL(18,2)` and cross the server/client boundary as
decimal **strings**, so no precision is lost in JSON. Timestamps are
`timestamptz` (UTC) and are formatted through `Intl` with an explicit
`timeZone`, so the server and browser always render identical strings.

### Database

```
users     1 ─── ∞  tickets   (created_by)
users     1 ─── ∞  payments  (paid_by)
users     1 ─── ∞  audit_logs
agents    1 ─── ∞  tickets
tickets   1 ─── 1  payments  (ticket_id UNIQUE — one payment per ticket in v1)
```

Indexed for the searches the application actually performs: `agents.code`
(unique), `agents.name`, `tickets.pnr`, `tickets.agent_id`, `tickets.status`,
`tickets.(agent_id, status)`, `payments.transaction_number` (unique),
`payments.ticket_id` (unique), `payments.paid_at`, and `created_at` on every
table.

### Data-integrity rules (enforced server-side)

1. An agent must exist and be active before a ticket can be created for it.
2. PNR must be 5–8 alphanumeric characters, stored upper-case.
3. Amount must be greater than zero, with at most two decimal places.
4. Currency must be one of the supported codes.
5. New tickets are always created `UNPAID`; status is never settable through
   the ticket endpoints.
6. An unpaid ticket has no transaction number; a paid ticket always has a valid one.
7. Transaction numbers are exactly four digits and globally unique.
8. A ticket can have at most one payment (database constraint).
9. Payment amount must equal the ticket amount.
10. Payment creation and the ticket status update happen in one transaction.
11. A paid ticket cannot be edited or deleted while its payment stands.
12. An agent with unpaid tickets cannot be deactivated.

---

## 13. Security

- **Password hashing** — bcrypt, cost 12. Hashes are never included in any DTO
  or API response.
- **Sessions** — HS256 JWT in an `httpOnly`, `SameSite=Lax`, `Secure`
  (in production) cookie. The token identifies the user; every server entry
  point re-loads the account from the database, so deactivating a user locks
  them out on their **next request** rather than at token expiry.
- **Route protection** — edge middleware redirects unauthenticated page
  requests to `/login` (preserving the destination) and returns `401` for API
  requests. The `(app)` layout and every service re-check the session, so the
  middleware is a fast path, never the only defence.
- **Authorisation** — capability checks on every mutating route.
- **CSRF** — the session cookie is `SameSite=Lax`, and every mutating API
  request must additionally carry an `Origin` matching this deployment.
- **Rate limiting** — sign-in attempts are limited per account and per IP
  (5 per account / 20 per IP per 15 minutes). Failed attempts are audited.
- **Timing** — a sign-in for an unknown email performs an equivalent-cost hash
  comparison so response timing does not reveal which accounts exist.
- **Input validation** — Zod on both sides; the server never trusts the client.
- **SQL injection** — all queries go through Prisma; the two raw queries use
  parameter binding.
- **HTTP headers** — CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, and a restrictive `Permissions-Policy` (`next.config.ts`).
- **Error handling** — raw database errors are logged server-side and never
  reach the client; users see specific, actionable messages.

### Before deploying

- Set a strong, unique `AUTH_SECRET`.
- Change or delete the seeded accounts.
- Terminate TLS in front of the app (the `Secure` cookie flag requires HTTPS).
- The login rate limiter keeps its counters **in process memory**. That is
  sufficient for a single instance; behind more than one replica, back it with
  a shared store (Redis) — see `src/lib/auth/rate-limit.ts`.

---

## 14. API reference

All endpoints require an authenticated session. Mutating requests require a
same-origin `Origin` header.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Exchange credentials for a session cookie |
| `POST` | `/api/auth/logout` | Clear the session |
| `GET` | `/api/auth/me` | The signed-in user |
| `PATCH` | `/api/auth/password` | Change your own password |
| `GET` | `/api/agents` | Paginated agents with balances |
| `POST` | `/api/agents` | Create an agent |
| `GET` | `/api/agents/:id` | Agent with totals |
| `PATCH` | `/api/agents/:id` | Update, or activate/deactivate (ADMIN) |
| `GET` | `/api/agents/:id/tickets` | That agent's tickets |
| `GET` | `/api/agents/:id/statement` | Statement (`?from=&to=`) |
| `GET` | `/api/tickets` | Filtered, sorted, paginated tickets + totals |
| `POST` | `/api/tickets` | Create a ticket (always `UNPAID`) |
| `GET` | `/api/tickets/:id` | Ticket detail |
| `PATCH` | `/api/tickets/:id` | Edit an unpaid ticket |
| `DELETE` | `/api/tickets/:id` | Delete an unpaid ticket (ADMIN) |
| `POST` | `/api/tickets/:id/payment` | **Record a payment** (atomic) |
| `GET` | `/api/payments` | Payment history |
| `GET` | `/api/payments/:id` | Payment detail |
| `POST` | `/api/payments/:id/reverse` | Reverse a payment (ADMIN, reason required) |
| `GET` | `/api/reports` | Build a report (`?type=…`) |
| `GET` | `/api/reports/export` | Export `format=csv\|xlsx` |
| `GET` | `/api/audit-logs` | Filtered audit trail |
| `GET` | `/api/search` | Global search: PNR, agent name/code, transaction number |
| `GET` `POST` | `/api/users` | List / create users (ADMIN) |
| `PATCH` | `/api/users/:id` | Update a user or reset their password (ADMIN) |
| `GET` `PATCH` | `/api/settings` | Read / update system settings |

Status codes: `200` OK, `201` Created, `204` No Content, `400` Bad Request,
`401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict,
`422` Validation Error, `429` Too Many Requests, `500` Internal Error.

Error bodies are `{ "error": string, "code": string, "fieldErrors"?: {...} }`.

---

## 15. Currency and timezone

Default currency is **SDG**; default timezone is **Africa/Khartoum**. Both are
configurable in **Settings** and are stored in the `system_settings` table.

Currency is stored explicitly on every ticket and payment rather than assumed
globally, so additional currencies can be introduced without migrating existing
records. Amounts are displayed with locale-aware grouping
(`1,250,000 SDG`, never `1250000`) and tabular figures so columns align.

---

## 16. Production build and deployment

```bash
npm ci
npm run db:deploy          # apply migrations
npm run build
npm run start              # or your process manager / container entrypoint
```

The application requires a Node.js runtime (it uses `bcryptjs`, `exceljs` and
Prisma on the server) and cannot be exported as a static site. It runs on any
Node host — a VM with a process manager, a container, or a Node-capable
platform such as Vercel, Render, Railway or Fly.io — with a reachable
PostgreSQL instance.

Deployment checklist:

- [ ] `DATABASE_URL` points at the production database
- [ ] `AUTH_SECRET` is a fresh random value, not the development one
- [ ] `APP_ORIGIN` set if a proxy rewrites the `Host` header
- [ ] `npm run db:deploy` has been run against the production database
- [ ] Seeded development accounts removed or their passwords changed
- [ ] HTTPS terminated in front of the application
- [ ] Database backups configured (this system holds financial records)

---

## 17. Documented assumptions

Where the specification left room for interpretation, the safer option was
taken and recorded here.

1. **Payment reversal is implemented as a dedicated ADMIN-only workflow.**
   The specification asks for no *automatic* reversal, and states that if one
   is implemented it must require ADMIN permission, confirmation, a reason and
   an audit log. All four are enforced. A payment is never silently flipped
   back: reversal removes the payment row (freeing the ticket and its
   transaction number), returns the ticket to `UNPAID`, and writes a full JSONB
   snapshot of the deleted payment plus the stated reason to the audit log, so
   the original payment remains fully reconstructable.
2. **PNRs are unique per agent, not globally.** The same PNR issued for two
   different agents is legitimate; a duplicate for the same agent is rejected.
3. **A `system_settings` table was added** beyond the specified schema to back
   the Settings page (agency name, default currency, timezone, ageing
   thresholds). It is a single pinned row.
4. **Deactivating an agent with unpaid tickets is refused**, so outstanding
   balances cannot be hidden by deactivation. Settle or reverse first.
5. **Paid tickets are immutable.** Editing or deleting one requires reversing
   its payment first, so a payment record can never disagree with its ticket.
6. **STAFF restrictions** were chosen as the safest reading of "STAFF can be
   given restricted permissions": staff do day-to-day operations; anything
   destructive or administrative is ADMIN-only. See §7.
7. **Days outstanding freezes when a ticket is paid**, showing how long it took
   to settle rather than growing forever.
8. **Reports are capped at 5,000 rows** per generation to bound memory. List
   pages are always paginated and filtered server-side.
9. **Ageing thresholds default to 14 days (warning) and 30 days (overdue)** and
   are configurable in Settings.

---

## 18. Verification

The build was verified end to end against a real PostgreSQL database:

- `npm run typecheck` — no errors
- `npm run lint` — no warnings or errors
- `npm run build` — compiles successfully
- The section-40 acceptance scenario was exercised against the running
  application (login → agent → add ticket → unpaid → record payment →
  transaction number validation → paid → balances, statement, payments list and
  audit log all updated), together with authorisation, CSRF, validation,
  concurrency and export checks — 70 assertions, all passing.
- All pages were loaded in Chromium at 1440×900 and 390×844 with zero console
  errors, zero failed requests and no horizontal overflow.

---

## 19. Deploying to Vercel + Supabase

The preview deployment uses a Supabase Postgres database and a Vercel Node
runtime. Prisma migrations are committed, so the database is reproducible.

### 1. Database

Create a Supabase project, then apply the schema. If your machine can reach
Postgres directly:

```bash
DATABASE_URL="<session-pooler-url>" npx prisma migrate deploy
DATABASE_URL="<session-pooler-url>" npm run db:seed
```

If outbound Postgres is blocked (as in some CI/sandbox environments), apply
`prisma/migrations/*/migration.sql` through the Supabase SQL editor instead,
then insert a matching row into `_prisma_migrations` so future
`prisma migrate deploy` runs stay no-ops.

Prefer a dedicated least-privilege login role over the `postgres` superuser:

```sql
CREATE ROLE atoz_app WITH LOGIN PASSWORD '<strong-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE, CREATE ON SCHEMA public TO atoz_app;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO atoz_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO atoz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO atoz_app;
```

### 2. Connection string

Vercel functions must use Supabase's **transaction-mode pooler**, not the
direct database host:

```
postgresql://atoz_app.<project-ref>:<password>@aws-N-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

- `pgbouncer=true` disables prepared statements, which transaction pooling
  cannot hold across statements.
- `connection_limit=1` keeps each serverless invocation to a single connection.
- The direct host (`db.<ref>.supabase.co`) is **IPv6-only** and is not reliably
  reachable from Vercel. The pooler is IPv4.
- The `aws-N` prefix is assigned per project. Copy the exact host from
  Supabase → Project Settings → Database → Connection string → Transaction
  pooler rather than guessing.

The app's interactive transactions (including the `SELECT … FOR UPDATE` that
guards payment recording) work over transaction pooling, because the pooler
holds one server connection for the duration of a transaction.

### 3. Vercel project

Vercel's GitHub App must have access to the repository before a project can be
linked. In GitHub → Settings → Applications → Vercel → Configure, grant access
to this repository, then import it in Vercel.

`vercel.json` pins `framework: "nextjs"` deliberately. Importing this repository
before the application existed on the production branch left Vercel with no
framework detected, so it treated the build as a static site and failed with
*No Output Directory named "public" found after the Build completed* — the build
itself had succeeded. Committing the framework means detection cannot drift
again, and it overrides whatever the dashboard inferred.

Set these environment variables for **all** environments:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the transaction-pooler URL above |
| `AUTH_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
| `AUTH_SESSION_MAX_AGE_HOURS` | `12` (optional) |

Do **not** set `APP_ORIGIN` for preview deployments. The same-origin check
derives the origin from the forwarded `Host` header, which is what allows it to
work across every generated preview URL; pinning `APP_ORIGIN` to one hostname
would reject requests from the others.

No build-time database access is required — every page is `force-dynamic` and
`prisma generate` does not connect — so the build succeeds before the
environment variables are present. It just cannot serve requests until they are.

### 4. After deploying

Change the seeded passwords from **Settings → Users**, and consider enabling
Vercel Deployment Protection if the preview should not be publicly reachable.
