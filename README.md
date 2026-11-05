# Settled

Concierge vet setup for pet owners new to San Francisco. Owners fill in one form; you (and later, agents) shortlist clinics, call, fill in new-patient forms, send records and book the first visit.

## Live

- Site: https://web-production-bc0164.up.railway.app
- Ops: https://web-production-bc0164.up.railway.app/ops (user `ops`, password in Railway variables as `OPS_PASSWORD`)
- Hosting: Railway project `settled` (services `web` and `Postgres`). Pushing to `main` redeploys.

## What's here

| Path | What it is |
| --- | --- |
| `/` | Landing page |
| `/start` | Four-step intake: owner, pets (with record uploads), preferences, review and consent |
| `/p/<token>` | Owner's private status page: progress, booked visit, records read from their uploads |
| `/ops` | Your dashboard: open requests, hours since request, minutes you've logged, median time to booking |
| `/ops/r/<id>` | One request: pet profiles, ranked clinics per pet with reasons, log a call, book |
| `/ops/clinics` | Clinic database: new-patient status, exam fees, CSV import |
| `/signin` | Passwordless sign-in: Google, or a 6-digit code by email |
| `/account` | Owner home: updates, pets, bookings, records |
| `/account/bills` | Bill check: upload an invoice, get a line-by-line price comparison |
| `/account/assistant` | Assistant chat; anything needing a person becomes a task for you |
| `/ops/inbox` | Your queue: assistant requests, unpriced bill items, replies to owners |
| `/api/v1/setup/<token>` | Owner status as JSON, for the mobile apps |
| `/api/health` | Health check (app and database) |

## On phones

- The site installs to the home screen (web app manifest, icons, offline page, service worker).
  Android shows an install button; iPhone owners see "Share, then Add to Home Screen" on their status page.
- `mobile/` holds iOS and Android projects (Capacitor) that load the live site. See `mobile/README.md`.

## Turning features on

Each feature works without its keys and switches on when they're set in Railway (web service, Variables):

| Feature | Variables | Without them |
| --- | --- | --- |
| Reading records and bills, assistant | `ANTHROPIC_API_KEY` | Files are kept; the assistant forwards messages to you |
| Emails and sign-in codes | `RESEND_API_KEY`, `EMAIL_FROM` (a verified domain) | Written to the server log |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Email-code sign-in only |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | No pay button (or `NEXT_PUBLIC_PAYMENT_LINK_URL`) |
| Team alerts | `OPS_NOTIFY_EMAIL` | Written to the server log |
| File storage | `S3_*` (set to the Railway bucket) | Files stored in Postgres |

Under the hood:

- `src/lib/extract.ts`: reads uploaded PDFs and photos with Claude (structured output) into a pet profile: vaccines with due dates, meds, conditions, and what's missing.
- `src/lib/bills.ts`: bill check. Reads the invoice, saves every line item to a shared price index (`bill_items`), looks up public prices with Claude's web search, and writes a price-only report. Items it can't price become tasks for you to call around.
- `src/lib/assistant.ts`: the assistant. Claude with tools that read the owner's own data, rank clinics and create tasks. It never diagnoses or books on its own.
- `src/lib/match.ts`: ranks clinics for a pet by species fit, new-patient status, distance, fee, online booking and ownership. Tested in `tests/match.test.ts`.
- `src/lib/db/`: Postgres schema (Drizzle). With no `DATABASE_URL` it runs an embedded Postgres (PGlite) in `./.data` for local work.
- `data/clinics.csv`: seeded automatically the first time the app boots with an empty clinics table.

## Run locally

```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY to test record reading
npm install
npm run dev                  # http://localhost:3000, ops at /ops
npm test
```

## Deploy (Railway or any Node host)

`railway.json` sets the start command and health check. On Railway:

1. Create a Postgres database and set `DATABASE_URL` (add `PGSSL=require` if your host needs SSL).
2. Set `ANTHROPIC_API_KEY`, `OPS_PASSWORD`, and `PUBLIC_BASE_URL` (your domain).
3. Optional: `NEXT_PUBLIC_PAYMENT_LINK_URL`, a Stripe Payment Link shown on the owner page once a visit is booked.
4. Build with `npm run build`, start with `npm start`.

Edit `src/lib/site.ts` for the name, price, contact email and target turnaround.

## Before sharing the link

- Set a real contact email in `src/lib/site.ts`.
- Add a privacy note covering record storage and deletion.
- Voice calling to clinics is not built yet. California requires AI disclosure on automated calls and all-party consent to record; get legal sign-off first.
