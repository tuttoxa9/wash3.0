-- Включаем Realtime публикацию для таблиц, которые важны для мгновенного обновления на клиентах
-- Этот скрипт необходимо выполнить в SQL Editor в панели управления Supabase

-- 1. Таблица записей на мойку (Appointments)
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- 2. Таблица ежедневных отчетов (Daily Reports)
ALTER PUBLICATION supabase_realtime ADD TABLE daily_reports;

-- 3. Таблица самих записей о мойках и долгах (Car Wash Records)
ALTER PUBLICATION supabase_realtime ADD TABLE car_wash_records;

-- 4. Таблица сотрудников (Employees)
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- 5. Таблица организаций (Organizations)
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;

-- 6. Если в будущем добавится таблица заметок, ее тоже нужно будет включить
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;
