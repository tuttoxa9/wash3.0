-- Скрипт для настройки базы данных Supabase (CRM)
-- Выполните этот скрипт в SQL Editor панели управления Supabase

-- 1. Создаем таблицу для лидов crm_leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    car TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT,
    service TEXT,
    price NUMERIC DEFAULT 0,
    next_step_date TIMESTAMPTZ,
    notify_before INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    sent_notifications INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    notes TEXT,
    history JSONB DEFAULT '[]'::JSONB
);

-- 2. Включаем Row Level Security (RLS) для защиты данных
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- 3. Создаем политику доступа для авторизованных пользователей приложения
CREATE POLICY "Allow authenticated users full access" ON public.crm_leads
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Добавляем таблицу в публикацию Realtime для мгновенной синхронизации изменений в клиенте
ALTER PUBLICATION supabase_realtime ADD TABLE crm_leads;
