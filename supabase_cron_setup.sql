-- Включение необходимых расширений (если они еще не включены)
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Функция для вызова API проверки напоминаний
create or replace function invoke_check_reminders()
returns void
language plpgsql
security definer
as $$
declare
  app_url text;
  request_id bigint;
begin
  -- Получаем актуальный URL приложения из настроек (сохраняется автоматически при входе в настройки CRM)
  select data->>'appUrl' into app_url
  from public.settings
  where key = 'crmSettings';

  -- Если URL существует, делаем POST запрос на эндпоинт проверки
  if app_url is not null and app_url != '' then
    select net.http_post(
      url := app_url || '/api/check-reminders',
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) into request_id;
  end if;
end;
$$;

-- Отменяем старую задачу, если она существует (для безопасного перезапуска)
select cron.unschedule('check-crm-reminders-job');

-- Настраиваем cron-задачу на выполнение каждую минуту
select cron.schedule(
  'check-crm-reminders-job',
  '* * * * *',
  'select invoke_check_reminders()'
);
