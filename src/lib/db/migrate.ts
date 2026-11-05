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

-- v2: storage keys, payments, accounts, notifications, bill check, assistant
alter table pet_records add column if not exists storage_key text;
alter table pet_records alter column bytes drop not null;
alter table setup_requests add column if not exists paid_at timestamptz;
alter table setup_requests add column if not exists paid_amount_cents integer;
alter table setup_requests add column if not exists stripe_session_id text;

create table if not exists auth_user (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists auth_session (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id text not null references auth_user(id) on delete cascade
);
create table if not exists auth_account (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references auth_user(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists auth_verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auth_session_user_idx on auth_session(user_id);
create index if not exists auth_account_user_idx on auth_account(user_id);
create index if not exists auth_verification_identifier_idx on auth_verification(identifier);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  request_id uuid references setup_requests(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_email_idx on notifications(email);

create table if not exists bill_checks (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  pet_name text,
  clinic_name text,
  visit_date text,
  total_cents integer,
  status text not null default 'pending',
  report jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bill_checks_email_idx on bill_checks(email);

create table if not exists bill_files (
  id uuid primary key default gen_random_uuid(),
  bill_check_id uuid not null references bill_checks(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size integer not null,
  storage_key text,
  bytes bytea,
  created_at timestamptz not null default now()
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_check_id uuid not null references bill_checks(id) on delete cascade,
  description text not null,
  normalized text not null,
  category text not null,
  quantity double precision,
  unit_cents integer,
  total_cents integer,
  clinic_name text,
  visit_date text,
  created_at timestamptz not null default now()
);
create index if not exists bill_items_normalized_idx on bill_items(normalized);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_email_idx on messages(email);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  request_id uuid references setup_requests(id) on delete set null,
  bill_check_id uuid references bill_checks(id) on delete set null,
  kind text not null,
  pet_name text,
  details text not null,
  status text not null default 'open',
  created_by text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists tasks_status_idx on tasks(status);
`;
