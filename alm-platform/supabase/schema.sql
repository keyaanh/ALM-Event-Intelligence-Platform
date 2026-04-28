-- ALM Event Platform Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('vp_events', 'finance', 'admin')),
  created_at timestamptz default now()
);

-- ─── EVENTS ──────────────────────────────────────────────
create table events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  event_type text not null check (event_type in ('social', 'fundraiser', 'professional', 'community')),
  date date not null,
  venue text,
  expected_attendees int default 0,
  description text,
  checklist jsonb default '[]',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── ORG BUDGET ──────────────────────────────────────────
create table org_budget (
  id uuid primary key default uuid_generate_v4(),
  semester text not null,
  total_budget numeric(10,2) not null default 0,
  spent numeric(10,2) not null default 0,
  updated_at timestamptz default now()
);

-- ─── BUDGET REQUESTS ─────────────────────────────────────
create table budget_requests (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  requested_by uuid references users(id) on delete set null,
  reviewed_by uuid references users(id) on delete set null,
  amount numeric(10,2) not null,
  purpose text not null,
  itemized_breakdown jsonb default '[]',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewer_notes text,
  ai_flag text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- ─── AUDIT LOG ───────────────────────────────────────────
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── SEED: default budget ─────────────────────────────────
insert into org_budget (semester, total_budget, spent)
values ('Spring 2026', 5000.00, 0.00);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────
alter table users enable row level security;
alter table events enable row level security;
alter table budget_requests enable row level security;
alter table audit_log enable row level security;
alter table org_budget enable row level security;

-- Allow all authenticated users to read their own user row
create policy "Users can read own profile" on users
  for select using (auth.uid()::text = id::text);

-- Allow finance/admin to read all users
create policy "Finance reads all users" on users
  for select using (true);
