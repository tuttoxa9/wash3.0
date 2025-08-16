-- Cloudflare D1 schema for the BelAutoCenter car wash application
-- Migrated from Firebase Firestore structure to SQLite-compatible syntax

-- Важно: SQLite не поддерживает uuid по умолчанию, поэтому используем TEXT для ID
-- и проверяем правильный формат uuid через триггеры или на уровне приложения

-- Таблица сотрудников
-- Заменяет коллекцию 'employees' из Firestore
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY, -- UUID будет генерироваться в приложении
  name TEXT NOT NULL,
  position TEXT,
  role TEXT CHECK (role IN ('washer', 'admin')),
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Таблица организаций-партнеров
-- Заменяет коллекцию 'organizations' из Firestore
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, -- UUID будет генерироваться в приложении
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Таблица услуг
-- Заменяет коллекцию 'services' из Firestore
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY, -- UUID будет генерироваться в приложении
  name TEXT NOT NULL,
  price REAL NOT NULL, -- В SQLite нет типа numeric, используем REAL
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Таблица записей о помывке автомобилей
-- Заменяет коллекцию 'carWashRecords' из Firestore
CREATE TABLE IF NOT EXISTS car_wash_records (
  id TEXT PRIMARY KEY, -- UUID будет генерироваться в приложении
  date TEXT NOT NULL, -- формат YYYY-MM-DD
  time TEXT NOT NULL, -- формат HH:MM
  car_info TEXT NOT NULL,
  service TEXT NOT NULL,
  service_type TEXT DEFAULT 'wash' CHECK (service_type IN ('wash', 'dryclean')),
  price REAL NOT NULL,
  payment_method TEXT NOT NULL, -- JSON строка: { type: 'cash'|'card'|'organization', organizationId?, organizationName? }
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Таблица участников мойки (связь между car_wash_records и employees)
-- Решает проблему хранения массива participant_ids в Supabase
CREATE TABLE IF NOT EXISTS car_wash_participants (
  record_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  PRIMARY KEY (record_id, employee_id),
  FOREIGN KEY (record_id) REFERENCES car_wash_records (id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);

-- Таблица ежедневных отчетов
-- Заменяет коллекцию 'dailyReports' из Firestore
CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY, -- используется формат даты YYYY-MM-DD как ID
  date TEXT NOT NULL, -- формат YYYY-MM-DD
  total_cash REAL NOT NULL DEFAULT 0,
  total_non_cash REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Таблица сотрудников, работавших в определенный день
-- Заменяет массив employee_ids в daily_reports
CREATE TABLE IF NOT EXISTS daily_employees (
  report_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  PRIMARY KEY (report_id, employee_id),
  FOREIGN KEY (report_id) REFERENCES daily_reports (id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);

-- Таблица ежедневных ролей сотрудников
-- Заменяет поле daily_employee_roles (jsonb) в daily_reports
CREATE TABLE IF NOT EXISTS daily_employee_roles (
  report_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('washer', 'admin')),
  PRIMARY KEY (report_id, employee_id),
  FOREIGN KEY (report_id) REFERENCES daily_reports (id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);

-- Таблица записей на мойку (предварительные записи)
-- Заменяет коллекцию 'appointments' из Firestore
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, -- UUID будет генерироваться в приложении
  date TEXT NOT NULL, -- формат YYYY-MM-DD
  time TEXT NOT NULL, -- формат HH:MM
  car_info TEXT NOT NULL,
  service TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Таблица настроек
-- Заменяет коллекцию 'settings' из Firestore
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON строка для хранения различных настроек
  created_at TIMESTAMP DEFAULT (datetime('now')),
  updated_at TIMESTAMP
);

-- Индексы для ускорения запросов

-- Индекс для поиска записей по дате
CREATE INDEX IF NOT EXISTS idx_car_wash_records_date ON car_wash_records (date);

-- Индекс для поиска записей на определенную дату
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);

-- Индекс для поиска записей по дате и статусу
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments (date, status);

-- Функциональный индекс для поиска организации в payment_method
-- Примечание: в SQLite нет прямого аналога GIN индекса для JSON,
-- поэтому мы должны полагаться на приложение для фильтрации по JSON полям
-- или создать дополнительные таблицы/столбцы для индексирования этих данных

-- Представления (Views) для упрощения сложных запросов

-- Представление для полной информации о записях мойки с участниками
CREATE VIEW IF NOT EXISTS v_car_wash_records_full AS
SELECT
  cwr.*,
  GROUP_CONCAT(cwp.employee_id) AS participant_ids,
  GROUP_CONCAT(e.name) AS participant_names
FROM
  car_wash_records cwr
LEFT JOIN
  car_wash_participants cwp ON cwr.id = cwp.record_id
LEFT JOIN
  employees e ON cwp.employee_id = e.id
GROUP BY
  cwr.id;

-- Представление для полной информации о ежедневных отчетах с сотрудниками
CREATE VIEW IF NOT EXISTS v_daily_reports_full AS
SELECT
  dr.*,
  GROUP_CONCAT(de.employee_id) AS employee_ids
FROM
  daily_reports dr
LEFT JOIN
  daily_employees de ON dr.id = de.report_id
GROUP BY
  dr.id;

-- Триггеры для автоматического обновления updated_at

-- Триггер для employees
CREATE TRIGGER IF NOT EXISTS trg_employees_updated_at
AFTER UPDATE ON employees
BEGIN
  UPDATE employees SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Триггер для organizations
CREATE TRIGGER IF NOT EXISTS trg_organizations_updated_at
AFTER UPDATE ON organizations
BEGIN
  UPDATE organizations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Триггер для services
CREATE TRIGGER IF NOT EXISTS trg_services_updated_at
AFTER UPDATE ON services
BEGIN
  UPDATE services SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Триггер для car_wash_records
CREATE TRIGGER IF NOT EXISTS trg_car_wash_records_updated_at
AFTER UPDATE ON car_wash_records
BEGIN
  UPDATE car_wash_records SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Триггер для daily_reports
CREATE TRIGGER IF NOT EXISTS trg_daily_reports_updated_at
AFTER UPDATE ON daily_reports
BEGIN
  UPDATE daily_reports SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Триггер для appointments
CREATE TRIGGER IF NOT EXISTS trg_appointments_updated_at
AFTER UPDATE ON appointments
BEGIN
  UPDATE appointments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Триггер для settings
CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at
AFTER UPDATE ON settings
BEGIN
  UPDATE settings SET updated_at = datetime('now') WHERE key = NEW.key;
END;

-- Пояснения по миграции с Firebase Firestore на Cloudflare D1:
--
-- 1. Структура таблиц:
--    - Основные сущности, такие как сотрудники, организации, услуги, записи,
--      преобразованы в соответствующие таблицы в D1.
--    - Для хранения массивов данных (например, participant_ids) созданы отдельные
--      связующие таблицы с отношениями many-to-many, что соответствует
--      реляционной модели данных.
--
-- 2. Типы данных:
--    - UUID поля хранятся как TEXT, поскольку D1 (SQLite) не имеет встроенного
--      типа UUID.
--    - JSON данные хранятся как TEXT, приложение должно выполнять сериализацию/
--      десериализацию.
--    - Денежные значения хранятся как REAL, так как SQLite не имеет типа NUMERIC.
--
-- 3. Индексы:
--    - Созданы основные индексы для ускорения запросов по датам и статусам.
--    - SQLite не поддерживает индексы JSON полей (GIN), поэтому для эффективного
--      поиска по JSON содержимому могут потребоваться дополнительные решения.
--
-- 4. Представления (Views):
--    - Добавлены представления для упрощения сложных запросов, объединяющих
--      данные из нескольких таблиц.
--    - Это позволяет сохранить простоту API при использовании более сложной
--      схемы базы данных.
--
-- 5. Ограничения и целостность данных:
--    - Добавлены внешние ключи для обеспечения ссылочной целостности.
--    - Использованы CHECK-ограничения для обеспечения валидности данных.
--    - Триггеры добавлены для автоматического обновления полей updated_at
--      при изменении данных.
--
-- 6. Особенности работы с Cloudflare D1:
--    - D1 использует SQLite в качестве своего движка, поэтому схема адаптирована
--      под ограничения SQLite.
--    - В отличие от Firestore, D1 требует жесткой схемы данных, что улучшает
--      целостность данных.
--    - Для миграции данных из Firestore рекомендуется использовать промежуточный
--      этап экспорта в JSON, а затем импорта в D1 с преобразованием структуры.
