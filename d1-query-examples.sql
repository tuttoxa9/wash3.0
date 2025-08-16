-- Примеры SQL-запросов для Cloudflare D1
-- Эти запросы заменяют операции Firestore в приложении

-- ============================================================================
-- Сотрудники (employees)
-- ============================================================================

-- Получение всех сотрудников (заменяет employeeService.getAll)
SELECT id, name, position, role FROM employees ORDER BY name;

-- Добавление нового сотрудника (заменяет employeeService.add)
-- Примечание: ID должен генерироваться в приложении с помощью UUID
INSERT INTO employees (id, name, position, role)
VALUES ('uuid-generated-by-app', 'Имя сотрудника', 'Должность', 'washer')
RETURNING id, name, position, role;

-- Удаление сотрудника (заменяет employeeService.delete)
DELETE FROM employees WHERE id = ?;

-- ============================================================================
-- Организации (organizations)
-- ============================================================================

-- Получение всех организаций (заменяет organizationService.getAll)
SELECT id, name FROM organizations ORDER BY name;

-- Добавление новой организации (заменяет organizationService.add)
INSERT INTO organizations (id, name)
VALUES ('uuid-generated-by-app', 'Название организации')
RETURNING id, name;

-- Обновление организации (заменяет organizationService.update)
UPDATE organizations SET name = ? WHERE id = ?;

-- Удаление организации (заменяет organizationService.delete)
DELETE FROM organizations WHERE id = ?;

-- ============================================================================
-- Услуги (services)
-- ============================================================================

-- Получение всех услуг (заменяет serviceService.getAll)
SELECT id, name, price FROM services;

-- Добавление новой услуги (заменяет serviceService.add)
INSERT INTO services (id, name, price)
VALUES ('uuid-generated-by-app', 'Название услуги', 10.5)
RETURNING id, name, price;

-- ============================================================================
-- Записи о мойках (car_wash_records)
-- ============================================================================

-- Добавление новой записи о мойке (заменяет carWashService.add)
-- Транзакция для добавления записи и участников
BEGIN TRANSACTION;
  -- 1. Добавляем запись
  INSERT INTO car_wash_records (id, date, time, car_info, service, service_type, price, payment_method)
  VALUES (
    'uuid-generated-by-app',
    ?, -- date в формате YYYY-MM-DD
    ?, -- time в формате HH:MM
    ?, -- car_info
    ?, -- service
    ?, -- service_type ('wash' или 'dryclean')
    ?, -- price
    ? -- payment_method в формате JSON строки
  );

  -- 2. Добавляем участников (для каждого employeeId из массива)
  INSERT INTO car_wash_participants (record_id, employee_id)
  VALUES ('uuid-generated-by-app', ?); -- Повторить для каждого employeeId
COMMIT;

-- Получение записей по дате (заменяет carWashService.getByDate)
SELECT
  cwr.id, cwr.date, cwr.time, cwr.car_info AS carInfo,
  cwr.service, cwr.service_type AS serviceType, cwr.price,
  cwr.payment_method AS paymentMethod,
  GROUP_CONCAT(cwp.employee_id) AS employeeIds
FROM car_wash_records cwr
LEFT JOIN car_wash_participants cwp ON cwr.id = cwp.record_id
WHERE cwr.date = ?
GROUP BY cwr.id
ORDER BY cwr.time;

-- Получение записей по организации (заменяет carWashService.getByOrganization)
-- Примечание: Для поиска в JSON мы используем оператор LIKE, что не оптимально,
-- но SQLite не имеет хороших инструментов для работы с JSON.
-- В реальном приложении лучше создать отдельную таблицу для связи с организациями.
SELECT
  cwr.id, cwr.date, cwr.time, cwr.car_info AS carInfo,
  cwr.service, cwr.service_type AS serviceType, cwr.price,
  cwr.payment_method AS paymentMethod,
  GROUP_CONCAT(cwp.employee_id) AS employeeIds
FROM car_wash_records cwr
LEFT JOIN car_wash_participants cwp ON cwr.id = cwp.record_id
WHERE cwr.payment_method LIKE '%"organizationId":"' || ? || '"%'
GROUP BY cwr.id;

-- Обновление записи о мойке (заменяет carWashService.update)
BEGIN TRANSACTION;
  -- 1. Обновляем основную запись
  UPDATE car_wash_records
  SET
    date = ?,
    time = ?,
    car_info = ?,
    service = ?,
    service_type = ?,
    price = ?,
    payment_method = ?,
    updated_at = datetime('now')
  WHERE id = ?;

  -- 2. Удаляем старых участников
  DELETE FROM car_wash_participants WHERE record_id = ?;

  -- 3. Добавляем новых участников
  INSERT INTO car_wash_participants (record_id, employee_id)
  VALUES (?, ?); -- Повторить для каждого employeeId
COMMIT;

-- Удаление записи о мойке (заменяет carWashService.delete)
-- Благодаря ON DELETE CASCADE, связанные записи в car_wash_participants будут удалены автоматически
DELETE FROM car_wash_records WHERE id = ?;

-- ============================================================================
-- Ежедневные отчеты (daily_reports)
-- ============================================================================

-- Получение отчета по дате (заменяет dailyReportService.getByDate)
-- Этот запрос сложнее, так как нам нужно объединить данные из нескольких таблиц
SELECT
  dr.id, dr.date, dr.total_cash AS totalCash, dr.total_non_cash AS totalNonCash,
  GROUP_CONCAT(DISTINCT de.employee_id) AS employeeIds,
  (
    -- Подзапрос для получения записей о мойках
    SELECT json_group_array(
      json_object(
        'id', cwr.id,
        'date', cwr.date,
        'time', cwr.time,
        'carInfo', cwr.car_info,
        'service', cwr.service,
        'serviceType', cwr.service_type,
        'price', cwr.price,
        'paymentMethod', cwr.payment_method,
        'employeeIds', (
          SELECT json_group_array(employee_id)
          FROM car_wash_participants
          WHERE record_id = cwr.id
        )
      )
    )
    FROM car_wash_records cwr
    WHERE cwr.date = dr.date
  ) AS records,
  (
    -- Подзапрос для получения ежедневных ролей
    SELECT json_object(
      employee_id, role
    )
    FROM daily_employee_roles
    WHERE report_id = dr.id
    GROUP BY report_id
  ) AS dailyEmployeeRoles
FROM daily_reports dr
LEFT JOIN daily_employees de ON dr.id = de.report_id
WHERE dr.id = ? -- date в формате YYYY-MM-DD
GROUP BY dr.id;

-- Обновление ежедневного отчета (заменяет dailyReportService.updateReport)
BEGIN TRANSACTION;
  -- 1. Обновляем или создаем отчет (upsert)
  INSERT INTO daily_reports (id, date, total_cash, total_non_cash, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    total_cash = excluded.total_cash,
    total_non_cash = excluded.total_non_cash,
    updated_at = datetime('now');

  -- 2. Удаляем старых сотрудников
  DELETE FROM daily_employees WHERE report_id = ?;

  -- 3. Добавляем новых сотрудников
  INSERT INTO daily_employees (report_id, employee_id)
  VALUES (?, ?); -- Повторить для каждого employeeId

  -- 4. Обновляем ежедневные роли (если есть)
  DELETE FROM daily_employee_roles WHERE report_id = ?;

  -- 5. Добавляем новые ежедневные роли
  INSERT INTO daily_employee_roles (report_id, employee_id, role)
  VALUES (?, ?, ?); -- Повторить для каждой пары employeeId-role
COMMIT;

-- Добавление записи в ежедневный отчет (заменяет dailyReportService.addRecord)
-- Это сложная операция, которая состоит из нескольких шагов
BEGIN TRANSACTION;
  -- 1. Получаем текущий отчет или создаем новый
  INSERT INTO daily_reports (id, date, total_cash, total_non_cash)
  VALUES (?, ?, 0, 0)
  ON CONFLICT(id) DO NOTHING;

  -- 2. Добавляем сотрудников отчета (если их еще нет)
  INSERT OR IGNORE INTO daily_employees (report_id, employee_id)
  VALUES (?, ?); -- Повторить для каждого employeeId из записи

  -- 3. Обновляем суммы
  -- Примечание: В реальном приложении этот расчет должен быть более сложным,
  -- учитывающим тип оплаты из payment_method (JSON)
  UPDATE daily_reports
  SET
    total_cash = (
      SELECT SUM(price)
      FROM car_wash_records
      WHERE date = ? AND payment_method LIKE '%"type":"cash"%'
    ),
    total_non_cash = (
      SELECT SUM(price)
      FROM car_wash_records
      WHERE date = ? AND payment_method NOT LIKE '%"type":"cash"%'
    ),
    updated_at = datetime('now')
  WHERE id = ?;
COMMIT;

-- ============================================================================
-- Записи на мойку (appointments)
-- ============================================================================

-- Получение всех записей (заменяет appointmentService.getAll)
SELECT
  id, date, time, car_info AS carInfo, service,
  client_name AS clientName, client_phone AS clientPhone,
  status, created_at AS createdAt
FROM appointments
ORDER BY date, time;

-- Получение записей по дате (заменяет appointmentService.getByDate)
SELECT
  id, date, time, car_info AS carInfo, service,
  client_name AS clientName, client_phone AS clientPhone,
  status, created_at AS createdAt
FROM appointments
WHERE date = ?
ORDER BY time;

-- Добавление новой записи (заменяет appointmentService.add)
INSERT INTO appointments (
  id, date, time, car_info, service, client_name, client_phone, status
) VALUES (
  'uuid-generated-by-app', ?, ?, ?, ?, ?, ?, ?
)
RETURNING
  id, date, time, car_info AS carInfo, service,
  client_name AS clientName, client_phone AS clientPhone,
  status, created_at AS createdAt;

-- Обновление записи (заменяет appointmentService.update)
UPDATE appointments
SET
  date = ?,
  time = ?,
  car_info = ?,
  service = ?,
  client_name = ?,
  client_phone = ?,
  status = ?,
  updated_at = datetime('now')
WHERE id = ?;

-- Удаление записи (заменяет appointmentService.delete)
DELETE FROM appointments WHERE id = ?;

-- Получение записей на сегодня и завтра (заменяет appointmentService.getTodayAndTomorrow)
SELECT
  id, date, time, car_info AS carInfo, service,
  client_name AS clientName, client_phone AS clientPhone,
  status, created_at AS createdAt
FROM appointments
WHERE date IN (date('now'), date('now', '+1 day'))
  AND status = 'scheduled'
ORDER BY date, time;

-- ============================================================================
-- Настройки (settings)
-- ============================================================================

-- Сохранение метода расчета зарплаты (заменяет settingsService.saveSalaryCalculationMethod)
INSERT INTO settings (key, data, updated_at)
VALUES ('salaryCalculation', json_object('method', ?, 'date', ?), datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  data = json_object('method', ?, 'date', ?),
  updated_at = datetime('now');

-- Получение метода расчета зарплаты (заменяет settingsService.getSalaryCalculationMethod)
SELECT json_extract(data, '$.method') AS method, json_extract(data, '$.date') AS date
FROM settings
WHERE key = 'salaryCalculation';

-- Сохранение настроек минимальной оплаты (заменяет settingsService.saveMinimumPaymentSettings)
INSERT INTO settings (key, data, updated_at)
VALUES ('minimumPayment', ?, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  data = ?,
  updated_at = datetime('now');

-- Получение настроек минимальной оплаты (заменяет settingsService.getMinimumPaymentSettings)
SELECT data
FROM settings
WHERE key = 'minimumPayment';

-- ============================================================================
-- Ежедневные роли (daily_roles)
-- ============================================================================

-- Сохранение ежедневных ролей (заменяет dailyRolesService.saveDailyRoles)
INSERT INTO daily_roles (id, date, employee_roles, updated_at)
VALUES (?, ?, ?, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  employee_roles = ?,
  updated_at = datetime('now');

-- Получение ежедневных ролей (заменяет dailyRolesService.getDailyRoles)
SELECT employee_roles
FROM daily_roles
WHERE id = ?;

-- Обновление роли сотрудника (заменяет dailyRolesService.updateEmployeeRole)
-- Это сложная операция, которая включает обновление JSON-объекта
-- В SQLite нет прямого способа обновить часть JSON, поэтому мы должны:
-- 1. Получить текущий JSON
-- 2. Изменить его в приложении
-- 3. Сохранить обновленный JSON
-- Примерный SQL для этого процесса:

-- 1. Получаем текущие роли
SELECT employee_roles FROM daily_roles WHERE id = ?;

-- 2. Обновляем роли (после модификации в приложении)
UPDATE daily_roles
SET
  employee_roles = ?, -- Обновленный JSON с измененной ролью
  updated_at = datetime('now')
WHERE id = ?;

-- ============================================================================
-- Сервисные операции с базой данных
-- ============================================================================

-- Проверка соединения (заменяет databaseService.testConnection)
SELECT 1;

-- Очистка всех данных (заменяет databaseService.clearAllData)
BEGIN TRANSACTION;
  DELETE FROM appointments;
  DELETE FROM car_wash_participants;
  DELETE FROM car_wash_records;
  DELETE FROM daily_employee_roles;
  DELETE FROM daily_employees;
  DELETE FROM daily_reports;
  DELETE FROM daily_roles;
  DELETE FROM services;
  DELETE FROM organizations;
  DELETE FROM employees;
  DELETE FROM settings;
COMMIT;
