// Idempotent schema setup. Kept as plain SQL so it runs the same on Postgres and PGlite.
// Keep in sync with schema.ts.
export const MIGRATION_SQL = `
create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  neighborhood text not null,
  move_status text not null,
  move_date text,
  referral text,
  created_at timestamptz not null default now()
);

create table if not exists setup_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  token text not null unique,
  status text not null default 'new',
  preferences jsonb not null,
  consent_at timestamptz not null,
  appointment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists setup_requests_status_idx on setup_requests(status);

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references setup_requests(id) on delete cascade,
  name text not null,
  species text not null,
  species_other text,
  breed text,
  age text,
  sex text,
  fixed text,
  medications text,
  conditions text,
  insurer text,
  profile jsonb,
  extraction_status text not null default 'none',
  extraction_error text
);

create table if not exists pet_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size integer not null,
  bytes bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  neighborhood text,
  address text,
  phone text,
  website text,
  species_seen text[] not null default '{}',
  exotics boolean,
  emergency_24h boolean,
  online_booking_url text,
  booking_method text,
  new_patient_form_url text,
  ownership text,
  accepting text not null default 'unknown',
  accepting_checked_at timestamptz,
  exam_fee_usd integer,
  source_url text,
  notes text,
  updated_at timestamptz not null default now()
);
alter table clinics add column if not exists kind text not null default 'general';
create unique index if not exists clinics_name_address_idx on clinics(name, coalesce(address, ''));

create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references setup_requests(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  kind text not null,
  body text not null,
  minutes integer,
  created_at timestamptz not null default now()
);
create index if not exists activity_request_idx on activity(request_id);
`;
