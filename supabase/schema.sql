-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

create table if not exists scratchers (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  handle text not null,
  created_at timestamptz not null default now()
);

-- Enforce one handle per person regardless of capitalization ("@Jay" vs "@jay")
create unique index if not exists scratchers_handle_lower_idx
  on scratchers (lower(handle));

-- Single-row table holding the current week's pairings.
create table if not exists beef_state (
  id int primary key default 1,
  pairings jsonb not null default '[]'::jsonb,
  generated_at timestamptz,
  constraint beef_state_singleton check (id = 1)
);

insert into beef_state (id, pairings, generated_at)
values (1, '[]'::jsonb, null)
on conflict (id) do nothing;

-- Row Level Security: the app talks to Supabase using the service_role key
-- from server-side API routes only (never exposed to the browser), which
-- bypasses RLS entirely. Enabling RLS here with no public policies just adds
-- a belt-and-suspenders layer in case the anon key ever gets used by mistake.
alter table scratchers enable row level security;
alter table beef_state enable row level security;
