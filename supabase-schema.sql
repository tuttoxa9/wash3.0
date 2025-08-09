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
  employee_ids text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists car_wash_records_date_idx on car_wash_records(date);
create index if not exists car_wash_records_payment_org_idx on car_wash_records using gin (payment_method);

-- daily reports
create table if not exists daily_reports (
  id text primary key, -- use YYYY-MM-DD as id
  date date not null,
  employee_ids text[] not null default '{}',
  records jsonb not null default '[]', -- array of CarWashRecord
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

-- basic policies: authenticated users can CRUD
create policy if not exists "employees read" on employees for select using (auth.role() = 'authenticated');
create policy if not exists "employees write" on employees for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "organizations read" on organizations for select using (auth.role() = 'authenticated');
create policy if not exists "organizations write" on organizations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "services read" on services for select using (auth.role() = 'authenticated');
create policy if not exists "services write" on services for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "car records read" on car_wash_records for select using (auth.role() = 'authenticated');
create policy if not exists "car records write" on car_wash_records for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "daily reports read" on daily_reports for select using (auth.role() = 'authenticated');
create policy if not exists "daily reports write" on daily_reports for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "appointments read" on appointments for select using (auth.role() = 'authenticated');
create policy if not exists "appointments write" on appointments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "settings read" on settings for select using (auth.role() = 'authenticated');
create policy if not exists "settings write" on settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy if not exists "daily roles read" on daily_roles for select using (auth.role() = 'authenticated');
create policy if not exists "daily roles write" on daily_roles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
