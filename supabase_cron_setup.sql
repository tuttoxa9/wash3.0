-- Скрипт для настройки поминутных напоминаний на стороне Supabase
-- Выполните этот скрипт в SQL Editor панели управления Supabase (https://supabase.com)

-- 1. Активируем необходимые расширения (pg_net для HTTP-запросов и pg_cron для планировщика)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Удаляем старое задание планировщика, если оно уже было создано ранее (для предотвращения дублирования)
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'crm-check-reminders-job';

-- 3. Создаем (или обновляем) функцию для триггера напоминаний
CREATE OR REPLACE FUNCTION public.cron_trigger_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    crm_settings jsonb;
    app_url text;
    webhook_url text;
BEGIN
    -- Получаем настройки CRM из таблицы settings
    SELECT data FROM public.settings WHERE key = 'crmSettings' INTO crm_settings;
    IF crm_settings IS NULL THEN
        RETURN;
    END IF;

    -- Проверяем, вклюена ли интеграция с Telegram в настройках
    IF NOT (coalesce((crm_settings->>'telegramEnabled')::boolean, false)) THEN
        RETURN;
    END IF;

    -- Получаем URL-адрес веб-приложения (сохраняется автоматически из браузера при работе с CRM)
    app_url := crm_settings->>'appUrl';
    IF app_url IS NULL OR app_url = '' THEN
        RETURN;
    END IF;

    -- Формируем URL эндпоинта для проверки и отправки напоминаний
    webhook_url := app_url || '/api/check-reminders';

    -- Отправляем асинхронный HTTP POST-запрос на Vercel
    PERFORM net.http_post(
        url := webhook_url,
        body := '{}'::jsonb,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
END;
$$;

-- 4. Добавляем новое задание планировщика в pg_cron на запуск каждую минуту (* * * * *)
SELECT cron.schedule(
    'crm-check-reminders-job',
    '* * * * *',
    'SELECT public.cron_trigger_reminders();'
);
