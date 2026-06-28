-- ============================================================
-- OKLEYKA MODULE — SQL MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Сотрудники оклейки (отдельно от мойки)
CREATE TABLE IF NOT EXISTS okleyka_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Организации оклейки (отдельно от мойки)
CREATE TABLE IF NOT EXISTS okleyka_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Смены оклейки
CREATE TABLE IF NOT EXISTS okleyka_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  employee_ids JSONB DEFAULT '[]',        -- массив UUID сотрудников
  start_of_day_cash NUMERIC DEFAULT 0,
  actual_end_cash NUMERIC,               -- NULL = смена открыта
  salary_payouts JSONB DEFAULT '{}',     -- { employeeId: amount }
  cash_modifications JSONB DEFAULT '[]', -- быстрые транзакции
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Заказы оклейки
CREATE TABLE IF NOT EXISTS okleyka_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number INTEGER NOT NULL CHECK (box_number IN (1, 2)),
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  car_info TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  payment_method JSONB,                  -- { type: 'cash'|'card'|'organization'|'debt', organizationId? }
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  shift_date DATE,                       -- дата смены, в которую создан заказ
  inspection_date TIMESTAMPTZ,           -- дата и время контрольного осмотра
  inspection_notified BOOLEAN DEFAULT FALSE, -- отправлено ли TG-напоминание
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Услуги внутри заказа
CREATE TABLE IF NOT EXISTS okleyka_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES okleyka_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Сотрудники на каждой услуге + их зарплата
CREATE TABLE IF NOT EXISTS okleyka_order_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES okleyka_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES okleyka_order_items(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES okleyka_employees(id) ON DELETE CASCADE,
  salary NUMERIC,                        -- NULL = не назначена (неоплаченная услуга)
  is_paid BOOLEAN DEFAULT FALSE,         -- фактически выплачена из кассы/сейфа
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Долги оклейки
CREATE TABLE IF NOT EXISTS okleyka_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES okleyka_orders(id) ON DELETE SET NULL,
  car_info TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  shift_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  actual_payment_method JSONB,           -- чем закрыли: cash|card|organization
  employee_payouts JSONB DEFAULT '{}',   -- employeeId -> amount (при закрытии долга)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Записи на будущее (appointments)
CREATE TABLE IF NOT EXISTS okleyka_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TEXT NOT NULL,                    -- HH:MM
  car_info TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  service TEXT,
  box_number INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies — разрешить чтение/запись авторизованным пользователям
-- ============================================================

ALTER TABLE okleyka_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_order_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE okleyka_appointments ENABLE ROW LEVEL SECURITY;

-- Политики для аутентифицированных пользователей
CREATE POLICY "auth_all_okleyka_employees" ON okleyka_employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_organizations" ON okleyka_organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_shifts" ON okleyka_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_orders" ON okleyka_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_order_items" ON okleyka_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_order_workers" ON okleyka_order_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_debts" ON okleyka_debts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_okleyka_appointments" ON okleyka_appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role (для API functions)
CREATE POLICY "service_all_okleyka_orders" ON okleyka_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_okleyka_orders_dates ON okleyka_orders(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_okleyka_orders_box ON okleyka_orders(box_number, status);
CREATE INDEX IF NOT EXISTS idx_okleyka_orders_shift ON okleyka_orders(shift_date);
CREATE INDEX IF NOT EXISTS idx_okleyka_orders_inspection ON okleyka_orders(inspection_date) WHERE inspection_date IS NOT NULL AND inspection_notified = FALSE;
CREATE INDEX IF NOT EXISTS idx_okleyka_workers_order ON okleyka_order_workers(order_id);
CREATE INDEX IF NOT EXISTS idx_okleyka_workers_unpaid ON okleyka_order_workers(salary) WHERE salary IS NULL;
CREATE INDEX IF NOT EXISTS idx_okleyka_debts_open ON okleyka_debts(is_closed) WHERE is_closed = FALSE;
CREATE INDEX IF NOT EXISTS idx_okleyka_appointments_date ON okleyka_appointments(date, status);
