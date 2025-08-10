-- Supabase SQL schema for Detail Lab app
-- Run this in Supabase SQL editor.

-- Enable extensions
create extension if not exists "uuid-ossp";

-- employees
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  position text,
  role text check (role in ('washer','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- organizations
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- services
create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- car wash records
create table if not exists car_wash_records (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  time text not null,
  car_info text not null,
  service text not null,
  price numeric not null,
  payment_method jsonb not null, -- { type: 'cash'|'card'|'organization', organizationId?, organizationName? }
  participant_ids text[] not null default '{}', -- list of employee ids (washers and/or admins)
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists car_wash_records_date_idx on car_wash_records(date);
create index if not exists car_wash_records_payment_org_idx on car_wash_records using gin (payment_method);
create index if not exists car_wash_records_participants_idx on car_wash_records using gin (participant_ids);

-- daily reports
create table if not exists daily_reports (
  id text primary key, -- use YYYY-MM-DD as id
  date date not null,
  employee_ids text[] not null default '{}', -- unique employees present that day
  records jsonb not null default '[]', -- array of CarWashRecord-like summaries
  total_cash numeric not null default 0,
  total_non_cash numeric not null default 0,
  daily_employee_roles jsonb, -- { employeeId: role }
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- appointments
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  time text not null,
  car_info text not null,
  service text not null,
  client_name text,
  client_phone text,
  status text not null check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists appointments_date_idx on appointments(date);

-- settings key-value
create table if not exists settings (
  key text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- daily roles
create table if not exists daily_roles (
  id text primary key, -- use YYYY-MM-DD as id
  date date not null,
  employee_roles jsonb not null default '{}', -- { employeeId: role }
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- RLS
alter table employees enable row level security;
alter table organizations enable row level security;
alter table services enable row level security;
alter table car_wash_records enable row level security;
alter table daily_reports enable row level security;
alter table appointments enable row level security;
alter table settings enable row level security;
alter table daily_roles enable row level security;

-- basic policies: allow anonymous users for public app access
-- EMPLOYEES
drop policy if exists "employees read" on employees;
drop policy if exists "employees write" on employees;
create policy "employees read" on employees for select using (true);
create policy "employees write" on employees for all using (true) with check (true);

-- ORGANIZATIONS
drop policy if exists "organizations read" on organizations;
drop policy if exists "organizations write" on organizations;
create policy "organizations read" on organizations for select using (true);
create policy "organizations write" on organizations for all using (true) with check (true);

-- SERVICES
drop policy if exists "services read" on services;
drop policy if exists "services write" on services;
create policy "services read" on services for select using (true);
create policy "services write" on services for all using (true) with check (true);

-- CAR WASH RECORDS
drop policy if exists "car records read" on car_wash_records;
drop policy if exists "car records write" on car_wash_records;
create policy "car records read" on car_wash_records for select using (true);
create policy "car records write" on car_wash_records for all using (true) with check (true);

-- DAILY REPORTS
drop policy if exists "daily reports read" on daily_reports;
drop policy if exists "daily reports write" on daily_reports;
create policy "daily reports read" on daily_reports for select using (true);
create policy "daily reports write" on daily_reports for all using (true) with check (true);

-- APPOINTMENTS
drop policy if exists "appointments read" on appointments;
drop policy if exists "appointments write" on appointments;
create policy "appointments read" on appointments for select using (true);
create policy "appointments write" on appointments for all using (true) with check (true);

-- SETTINGS
drop policy if exists "settings read" on settings;
drop policy if exists "settings write" on settings;
create policy "settings read" on settings for select using (true);
create policy "settings write" on settings for all using (true) with check (true);

-- DAILY ROLES
drop policy if exists "daily roles read" on daily_roles;
drop policy if exists "daily roles write" on daily_roles;
create policy "daily roles read" on daily_roles for select using (true);
create policy "daily roles write" on daily_roles for all using (true) with check (true);

-- Note: clear_all_data function removed due to Supabase SQL editor compatibility issues
-- The databaseService.clearAllData() will use client-side DELETE statements instead
