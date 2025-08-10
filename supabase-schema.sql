1|-- Supabase SQL schema for Detail Lab app
2|-- Run this in Supabase SQL editor.
3|
4|-- Enable extensions
5|create extension if not exists "uuid-ossp";
6|
7|-- employees
8|create table if not exists employees (
9|  id uuid primary key default uuid_generate_v4(),
10|  name text not null,
11|  position text,
12|  role text check (role in ('washer','admin')),
13|  created_at timestamptz default now(),
14|  updated_at timestamptz
15|);
16|
17|-- organizations
18|create table if not exists organizations (
19|  id uuid primary key default uuid_generate_v4(),
20|  name text not null,
21|  created_at timestamptz default now(),
22|  updated_at timestamptz
23|);
24|
25|-- services
26|create table if not exists services (
27|  id uuid primary key default uuid_generate_v4(),
28|  name text not null,
29|  price numeric not null,
30|  created_at timestamptz default now(),
31|  updated_at timestamptz
32|);
33|
34|-- car wash records
35|create table if not exists car_wash_records (
36|  id uuid primary key default uuid_generate_v4(),
37|  date date not null,
38|  time text not null,
39|  car_info text not null,
40|  service text not null,
41|  price numeric not null,
42|  payment_method jsonb not null, -- { type: 'cash'|'card'|'organization', organizationId?, organizationName? }
43|  -- migrated: previously washer_id text not null (single washer). Now multiple participants allowed, including admins
44|  participant_ids text[] not null default '{}', -- list of employee ids (washers and/or admins) who worked on the car
45|  created_at timestamptz default now(),
46|  updated_at timestamptz
47|);
48|create index if not exists car_wash_records_date_idx on car_wash_records(date);
49|create index if not exists car_wash_records_payment_org_idx on car_wash_records using gin (payment_method);
50|create index if not exists car_wash_records_participants_idx on car_wash_records using gin (participant_ids);
51|
52|-- daily reports
53|create table if not exists daily_reports (
54|  id text primary key, -- use YYYY-MM-DD as id
55|  date date not null,
56|  employee_ids text[] not null default '{}', -- unique employees present that day (washers and admins)
57|  records jsonb not null default '[]', -- array of CarWashRecord-like summaries
58|  total_cash numeric not null default 0,
59|  total_non_cash numeric not null default 0,
60|  daily_employee_roles jsonb, -- { employeeId: role }
61|  created_at timestamptz default now(),
62|  updated_at timestamptz
63|);
64|
65|-- appointments
66|create table if not exists appointments (
67|  id uuid primary key default uuid_generate_v4(),
68|  date date not null,
69|  time text not null,
70|  car_info text not null,
71|  service text not null,
72|  client_name text,
73|  client_phone text,
74|  status text not null check (status in ('scheduled','completed','cancelled')),
75|  created_at timestamptz default now(),
76|  updated_at timestamptz
77|);
78|create index if not exists appointments_date_idx on appointments(date);
79|
80|-- settings key-value
81|create table if not exists settings (
82|  key text primary key,
83|  data jsonb not null,
84|  created_at timestamptz default now(),
85|  updated_at timestamptz
86|);
87|
88|-- daily roles
89|create table if not exists daily_roles (
90|  id text primary key, -- use YYYY-MM-DD as id
91|  date date not null,
92|  employee_roles jsonb not null default '{}', -- { employeeId: role }
93|  created_at timestamptz default now(),
94|  updated_at timestamptz
95|);
96|
97|-- RLS
98|alter table employees enable row level security;
99|alter table organizations enable row level security;
100|alter table services enable row level security;
101|alter table car_wash_records enable row level security;
102|alter table daily_reports enable row level security;
103|alter table appointments enable row level security;
104|alter table settings enable row level security;
105|alter table daily_roles enable row level security;
106|
107|-- basic policies: authenticated users can CRUD
108|-- EMPLOYEES
109|drop policy if exists "employees read" on employees;
110|drop policy if exists "employees write" on employees;
111|create policy "employees read" on employees for select using (auth.role() = 'authenticated');
112|create policy "employees write" on employees for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
113|
114|-- ORGANIZATIONS
115|drop policy if exists "organizations read" on organizations;
116|drop policy if exists "organizations write" on organizations;
117|create policy "organizations read" on organizations for select using (auth.role() = 'authenticated');
118|create policy "organizations write" on organizations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
119|
120|-- SERVICES
121|drop policy if exists "services read" on services;
122|drop policy if exists "services write" on services;
123|create policy "services read" on services for select using (auth.role() = 'authenticated');
124|create policy "services write" on services for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
125|
126|-- CAR WASH RECORDS
127|drop policy if exists "car records read" on car_wash_records;
128|drop policy if exists "car records write" on car_wash_records;
129|create policy "car records read" on car_wash_records for select using (auth.role() = 'authenticated');
130|create policy "car records write" on car_wash_records for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
131|
132|-- DAILY REPORTS
133|drop policy if exists "daily reports read" on daily_reports;
134|drop policy if exists "daily reports write" on daily_reports;
135|create policy "daily reports read" on daily_reports for select using (auth.role() = 'authenticated');
136|create policy "daily reports write" on daily_reports for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
137|
138|-- APPOINTMENTS
139|drop policy if exists "appointments read" on appointments;
140|drop policy if exists "appointments write" on appointments;
141|create policy "appointments read" on appointments for select using (auth.role() = 'authenticated');
142|create policy "appointments write" on appointments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
143|
144|-- SETTINGS
145|drop policy if exists "settings read" on settings;
146|drop policy if exists "settings write" on settings;
147|create policy "settings read" on settings for select using (auth.role() = 'authenticated');
148|create policy "settings write" on settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
149|
150|-- DAILY ROLES
151|drop policy if exists "daily roles read" on daily_roles;
152|drop policy if exists "daily roles write" on daily_roles;
153|create policy "daily roles read" on daily_roles for select using (auth.role() = 'authenticated');
154|create policy "daily roles write" on daily_roles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
