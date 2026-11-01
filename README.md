# Settled

Concierge vet setup for pet owners new to San Francisco. Owners fill in one form; you (and later, agents) shortlist clinics, call, fill in new-patient forms, send records and book the first visit.

## What's here

| Path | What it is |
| --- | --- |
| `/` | Landing page |
| `/start` | Four-step intake: owner, pets (with record uploads), preferences, review and consent |
| `/p/<token>` | Owner's private status page: progress, booked visit, records read from their uploads |
| `/ops` | Your dashboard: open requests, hours since request, minutes you've logged, median time to booking |
| `/ops/r/<id>` | One request: pet profiles, ranked clinics per pet with reasons, log a call, book |
| `/ops/clinics` | Clinic database: new-patient status, exam fees, CSV import |

Under the hood:

- `src/lib/extract.ts`: reads uploaded PDFs and photos with Claude (structured output) into a pet profile: vaccines with due dates, meds, conditions, and what's missing.
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

1. Create a Postgres database and set `DATABASE_URL` (add `PGSSL=require` if your host needs SSL).
2. Set `ANTHROPIC_API_KEY`, `OPS_PASSWORD`, and `PUBLIC_BASE_URL` (your domain).
3. Optional: `NEXT_PUBLIC_PAYMENT_LINK_URL`, a Stripe Payment Link shown on the owner page once a visit is booked.
4. Build with `npm run build`, start with `npm start`.

Edit `src/lib/site.ts` for the name, price, contact email and target turnaround.

## Before sharing the link

- Set a real contact email in `src/lib/site.ts`.
- Add a privacy note covering record storage and deletion.
- Voice calling to clinics is not built yet. California requires AI disclosure on automated calls and all-party consent to record; get legal sign-off first.
