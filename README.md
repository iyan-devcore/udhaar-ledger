# Udhar Khata — shop credit ledger

A phone-first web app (installable PWA) for a general store to track customer
credit ("udhar"): who took what, who paid, who is due, and a one-tap WhatsApp
reminder with a UPI payment link. One user, amounts in INR, English and Hindi.

## Run it locally

Needs Node.js 20.9 or newer (22 recommended).

```bash
npm install
cp .env.example .env.local
# edit .env.local: set APP_PASSWORD=something and a SESSION_SECRET (see below)
npm run seed        # optional: 5 demo customers and ~30 entries
npm run dev         # http://localhost:3000
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

The database file is created on first start at `./data/ledger.db` and
migrations run automatically.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run check` | Lint, typecheck and unit tests |
| `npm test` | Unit tests only (Vitest) |
| `npm run seed` | Demo data (`-- --force` wipes existing data first) |
| `npm run backup` | Make today's backup copy now (`-- --now` for an extra copy) |
| `npm run hash-password -- "pass"` | Print an `APP_PASSWORD_HASH` line |
| `npm run db:generate` | New SQL migration after changing `src/lib/db/schema.ts` |

## Environment variables

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `APP_PASSWORD_HASH` | yes (production) | | Login password hash from `npm run hash-password` |
| `APP_PASSWORD` | no | | Plain password instead of the hash (fine for a preview; prefer the hash) |
| `SESSION_SECRET` | yes | | Random string, 32+ characters. Changing it logs out every device |
| `DATABASE_PATH` | no | `./data/ledger.db` | SQLite file. Must be on a persistent disk |
| `BACKUP_DIR` | no | `./data/backups` | Folder for nightly copies |
| `BACKUP_KEEP` | no | `14` | How many nightly copies to keep |
| `APP_TIMEZONE` | no | `Asia/Kolkata` | Time zone for "today", due dates and backup names |
| `PUBLIC_BASE_URL` | recommended | request host | Public address used in `/pay` links, e.g. `https://udhar.example.com` |
| `DISABLE_BACKUP_SCHEDULER` | no | | Set to `1` to turn off the built-in nightly backup timer |
| `SEED_DEMO` | no | | Docker image only: `1` loads demo data into an empty database at start |

Phase 2 names are reserved and unused in v1: `WHATSAPP_CLOUD_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `REMINDER_DAYS_BEFORE`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## First-time setup in the shop

1. Log in, open **Settings**, enter the shop name and the shop's UPI ID, and
   check the two reminder messages.
2. Load the paper diary in one go: **Settings → Load diary balances (CSV)**.
   The file needs a header row with `name, phone, balance, dueDay` (any
   order). Every row is checked first; if any row is wrong nothing is loaded
   and the bad rows are listed. Each balance becomes an "Opening balance"
   credit entry dated today.
3. On the phone, open the site in Chrome and choose **Add to Home screen**.

## Deploying

The app is one Node process with a SQLite file, so it needs a host with a
**persistent disk**. It must run as a single instance (no horizontal scaling).
Always serve it over HTTPS: the login cookie is marked `Secure` in production.

### Small VPS (any Ubuntu box)

```bash
git clone <your repo> udhar && cd udhar
npm ci && npm run build
cp .env.example .env    # set APP_PASSWORD_HASH, SESSION_SECRET, PUBLIC_BASE_URL
sudo mkdir -p /var/lib/udhar && sudo chown $USER /var/lib/udhar
# in .env: DATABASE_PATH=/var/lib/udhar/ledger.db  BACKUP_DIR=/var/lib/udhar/backups
npm start               # listens on :3000
```

Keep it running with systemd (`ExecStart=/usr/bin/npm start`,
`WorkingDirectory=` the project folder, `Restart=always`) and put Caddy or
nginx in front for HTTPS. With Caddy the whole config is:

```
udhar.example.com {
  reverse_proxy localhost:3000
}
```

### Fly.io

A `Dockerfile` is included. Create the app and a 1 GB volume in Mumbai:

```bash
fly launch --no-deploy --region bom
fly volumes create data --size 1 --region bom
fly secrets set APP_PASSWORD_HASH='scrypt$...' SESSION_SECRET='...' PUBLIC_BASE_URL='https://<app>.fly.dev'
```

Add to `fly.toml`:

```toml
[mounts]
  source = "data"
  destination = "/data"

[http_service]
  internal_port = 3000
  min_machines_running = 1
```

Then `fly deploy`. Keep one machine (`fly scale count 1`).

### Render (works from a phone)

The repo includes `render.yaml`. Open
`https://render.com/deploy?repo=<your repo URL>`, sign in, and Render asks for
`APP_PASSWORD`. It generates `SESSION_SECRET`, builds the Dockerfile and gives
you an `onrender.com` address (pay links use it automatically).

- The **free plan has no disk**: data resets whenever the service restarts or
  redeploys, and it sleeps after 15 minutes idle (the first visit then takes
  about a minute). `SEED_DEMO=1` reloads the 5 demo customers each time.
- **For real use:** switch to a paid instance, uncomment the `disk` block in
  `render.yaml` (mounted at `/data`), delete `SEED_DEMO`, and replace
  `APP_PASSWORD` with `APP_PASSWORD_HASH`.

## Backups and restores

There are three layers:

1. **Nightly copy (automatic).** While the server runs, it checks every hour
   and makes `ledger-YYYY-MM-DD.db` once a day in `BACKUP_DIR`, keeping the
   newest 14. Copies use SQLite's online backup API, so they are safe while
   the app is in use. `npm run backup` does the same from cron if you prefer.
2. **Extra copies.** "Back up now" in Settings, and an automatic copy before
   every restore or CSV import, saved as `ledger-…-manual.db`,
   `…-pre-restore.db` or `…-pre-import.db` (also 14 kept).
3. **Downloads.** Settings has a full JSON backup, customers CSV, entries CSV,
   and a download link for each saved `.db` copy. Download the JSON now and
   then to keep a copy off the server (Google Drive, email to yourself).

Restoring:

- **From a JSON backup (in the app):** Settings → Restore from JSON backup.
  This replaces all data after saving a `pre-restore` copy of the current data.
- **From a `.db` copy (on the server):** stop the app, then
  ```bash
  cp /var/lib/udhar/backups/ledger-2026-11-25.db /var/lib/udhar/ledger.db
  rm -f /var/lib/udhar/ledger.db-wal /var/lib/udhar/ledger.db-shm
  ```
  and start it again.

Backups on the same disk do not protect against losing the disk. Copy the
JSON export or the backups folder somewhere else regularly.

## How it works

```
src/
  app/
    (app)/            logged-in screens with bottom navigation
      page.tsx          Customers (home)
      due/              Due soon + reminders
      settings/         Shop, templates, language, backups
      customers/        new, [id], [id]/edit
    (print)/customers/[id]/statement   printable monthly statement
    pay/[token]/      PUBLIC UPI payment page (the only public page)
    login/  offline/  api/export  api/backups
    actions/          Server Actions (all mutations)
  components/         UI (entry sheet with keypad, lists, forms)
  lib/
    db/               Drizzle schema, connection, migrations runner
    repo/             Repository: the only code that queries the database
    money.ts dates.ts balance.ts phone.ts csv.ts   pure logic (unit tested)
    reminders/        message/link builders, ReminderProvider, phase 2 stub
    payments/         phase 2 payment gateway plan
    auth/             password hashing, session token, rate limit, guards
    i18n/             en.ts, hi.ts dictionaries
    backup.ts scheduler.ts
  proxy.ts            redirects to /login without a session
drizzle/              SQL migrations
scripts/              seed, backup, hash-password
```

Rules worth knowing:

- Money is integer **paise** everywhere; formatting uses Indian grouping
  (`₹1,23,456`). Typed amounts are parsed with string arithmetic.
- **Balance** = credits − payments, excluding soft-deleted entries. It is
  always computed, never stored.
- **Due date:** the customer's due day in the current month; a due day the
  month lacks (31 in November, 29–31 in February) falls on the last day.
- **Overdue** = credit taken on or before the last passed due date that is
  still unpaid (payments clear the oldest credit first). Credit taken after
  the due date is not overdue yet.
- Every entry edit, delete and restore writes an **audit log** row with the
  previous values. Deletes are soft, with a 10 second undo.
- The reminder log records customer, time and channel.

### Adding a language

Copy `src/lib/i18n/en.ts` to, say, `mr.ts`, translate the values, and add it
to `dictionaries` in `src/lib/i18n/index.ts`. TypeScript flags any missing key.
A default reminder template for the language can be added in
`src/lib/reminders/messages.ts`.

### Moving to Postgres later

All queries live in `src/lib/repo/repo.ts`, and the schema in
`src/lib/db/schema.ts` uses portable types (integers, text dates). Switch the
schema to `drizzle-orm/pg-core`, change `src/lib/db/open.ts` to a Postgres
client, regenerate migrations, and make the repository functions async. The
backup scheduler would be replaced by `pg_dump`.

## Security and privacy

- Single password login, compared against a scrypt hash in constant time.
- Failed logins are rate limited (5 per 15 minutes per client, 20 overall).
- Session cookie: signed (HMAC-SHA256), `httpOnly`, `SameSite=Lax`,
  `Secure` in production, 30 days.
- CSRF: all mutations are POST Server Actions; Next.js rejects requests whose
  Origin does not match the host, and every action checks the Origin again
  itself before checking the session.
- All input is validated on the server with zod.
- No analytics, trackers, or third-party scripts or fonts. Pages send
  `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`.
- The only public page is `/pay/<token>`: tokens are 144-bit random, tied to
  one customer and amount, expire after 30 days, and the page shows only the
  shop name, the customer's first name and the amount.
- The service worker caches only static build files and an offline page,
  never pages with customer data.

## Phase 2 (designed, not built)

- **WhatsApp Cloud API:** `src/lib/reminders/whatsapp-cloud.ts` implements the
  same `ReminderProvider` interface and documents the template, request and
  daily job (send N days before each due day). Enable it in
  `getReminderProvider()`.
- **Payment gateway (e.g. Razorpay):** `src/lib/payments/gateway.ts` describes
  payment links and a signed webhook that records payments automatically.

No external API calls are made in v1.
