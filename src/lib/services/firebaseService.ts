import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import type { Employee, Service, CarWashRecord, DailyReport, Organization, Appointment } from '../types';
import { format } from 'date-fns';
import { db, app } from '../firebase'; // Импортируем также app для дополнительных проверок

// Функция для логирования ошибок Firebase с более подробной информацией
const logFirebaseError = (message: string, error: any) => {
  console.error(`${message}:`, error);
  console.error('Firebase проект:', app.options.projectId);
  console.error('Код ошибки:', error?.code);
  console.error('Сообщение:', error?.message);
  if (error?.code === 'permission-denied') {
    console.error('Проверьте правила безопасности Firestore в консоли Firebase');
  }
};

// Сервис для работы с сотрудниками
export const employeeService = {
  // Получить всех сотрудников
  async getAll(): Promise<Employee[]> {
    try {
      console.log('Запрос сотрудников из коллекции employees в проекте:', app.options.projectId);
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      console.log(`Получено ${snapshot.docs.length} сотрудников`);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
    } catch (error) {
      logFirebaseError('Ошибка получения списка сотрудников', error);
      return [];
    }
  },

  // Добавить нового сотрудника
  async add(employee: Omit<Employee, 'id'>): Promise<Employee | null> {
    try {
      console.log('Добавление сотрудника:', employee.name);
      const employeesRef = collection(db, 'employees');

      // Добавляем сотрудника с метаданными
      const docRef = await addDoc(employeesRef, {
        ...employee,
        createdAt: serverTimestamp()
      });

      console.log('Сотрудник успешно добавлен с ID:', docRef.id);
      return {
        id: docRef.id,
        ...employee
      };
    } catch (error) {
      logFirebaseError('Ошибка добавления сотрудника', error);
      return null;
    }
  },

  // Удалить сотрудника
  async delete(id: string): Promise<boolean> {
    try {
      console.log('Удаление сотрудника с ID:', id);
      const employeeRef = doc(db, 'employees', id);
      await deleteDoc(employeeRef);
      console.log('Сотрудник успешно удален');
      return true;
    } catch (error) {
      logFirebaseError('Ошибка удаления сотрудника', error);
      return false;
    }
  }
};

// Сервис для работы с организациями-партнерами
export const organizationService = {
  // Получить все организации
  async getAll(): Promise<Organization[]> {
    try {
      const orgsRef = collection(db, 'organizations');
      const snapshot = await getDocs(orgsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Organization));
    } catch (error) {
      logFirebaseError('Ошибка получения списка организаций', error);
      return [];
    }
  },

  // Добавить новую организацию
  async add(organization: Omit<Organization, 'id'>): Promise<Organization | null> {
    try {
      const orgsRef = collection(db, 'organizations');
      const docRef = await addDoc(orgsRef, {
        ...organization,
        createdAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        ...organization
      };
    } catch (error) {
      logFirebaseError('Ошибка добавления организации', error);
      return null;
    }
  },

  // Обновить существующую организацию
  async update(organization: Organization): Promise<boolean> {
    try {
      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, {
        name: organization.name,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      logFirebaseError('Ошибка обновления организации', error);
      return false;
    }
  },

  // Удалить организацию
  async delete(id: string): Promise<boolean> {
    try {
      const orgRef = doc(db, 'organizations', id);
      await deleteDoc(orgRef);
      return true;
    } catch (error) {
      logFirebaseError('Ошибка удаления организации', error);
      return false;
    }
  }
};

// Сервис для работы с услугами
export const serviceService = {
  // Получить все услуги
  async getAll(): Promise<Service[]> {
    try {
      const servicesRef = collection(db, 'services');
      const snapshot = await getDocs(servicesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Service));
    } catch (error) {
      logFirebaseError('Ошибка получения списка услуг', error);
      return [];
    }
  },

  // Добавить новую услугу
  async add(service: Omit<Service, 'id'>): Promise<Service | null> {
    try {
      const servicesRef = collection(db, 'services');
      const docRef = await addDoc(servicesRef, service);
      return {
        id: docRef.id,
        ...service
      };
    } catch (error) {
      logFirebaseError('Ошибка добавления услуги', error);
      return null;
    }
  }
};

// Сервис для работы с записями о мойках автомобилей
export const carWashService = {
  // Добавить новую запись о мойке
  async add(record: Omit<CarWashRecord, 'id'>): Promise<CarWashRecord | null> {
    try {
      console.log('Начинаем добавление записи о мойке:', JSON.stringify(record));

      // Проверяем структуру записи перед добавлением
      if (!record.date || !record.carInfo || !record.service || !record.employeeIds) {
        console.error('Ошибка валидации: не все обязательные поля заполнены', record);
        return null;
      }

      // Проверяем корректность способа оплаты
      if (record.paymentMethod.type === 'organization' && !record.paymentMethod.organizationId) {
        console.error('Ошибка валидации: для способа оплаты "organization" требуется organizationId');
        return null;
      }

      const recordsRef = collection(db, 'carWashRecords');

      // Добавляем дополнительное логирование
      console.log('Создаем запись в коллекции carWashRecords с данными:', {
        date: record.date,
        time: record.time,
        carInfo: record.carInfo,
        service: record.service,
        price: record.price,
        paymentMethod: record.paymentMethod,
        employeeIds: record.employeeIds
      });

      const docRef = await addDoc(recordsRef, {
        ...record,
        createdAt: serverTimestamp()
      });

      console.log('Запись успешно добавлена с ID:', docRef.id);

      // Получаем добавленную запись для подтверждения
      const addedRecord = {
        id: docRef.id,
        ...record
      };

      console.log('Возвращаем добавленную запись:', addedRecord);
      return addedRecord;
    } catch (error) {
      logFirebaseError('Ошибка добавления записи о мойке', error);

      // Расширенное логирование для отладки
      console.error('Структура записи, которую не удалось добавить:', JSON.stringify(record));

      if (error instanceof Error) {
        console.error('Детали ошибки:', error.message);
        console.error('Стек вызовов:', error.stack);
      }

      return null;
    }
  },

  // Получить записи по дате
  async getByDate(date: string): Promise<CarWashRecord[]> {
    try {
      const recordsRef = collection(db, 'carWashRecords');
      const q = query(recordsRef, where('date', '==', date));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CarWashRecord));
    } catch (error) {
      logFirebaseError('Ошибка получения записей о мойках по дате', error);
      return [];
    }
  },

  // Получить записи по организации
  async getByOrganization(organizationId: string): Promise<CarWashRecord[]> {
    try {
      console.log('Запрос записей о мойках для организации:', organizationId);

      const recordsRef = collection(db, 'carWashRecords');
      const q = query(recordsRef, where('paymentMethod.organizationId', '==', organizationId));
      const snapshot = await getDocs(q);

      console.log(`Получено ${snapshot.docs.length} записей из базы данных`);

      if (snapshot.empty) {
        console.log('Записи не найдены в базе данных');
        return [];
      }

      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        // Преобразуем данные Firebase в JavaScript-объект
        return {
          id: doc.id,
          date: data.date,
          time: data.time || '',
          carInfo: data.carInfo || '',
          service: data.service || '',
          price: typeof data.price === 'number' ? data.price : 0,
          paymentMethod: data.paymentMethod || { type: 'organization', organizationId },
          employeeIds: data.employeeIds || []
        } as CarWashRecord;
      });

      console.log('Преобразовано записей:', records.length);
      if (records.length > 0) {
        console.log('Первая запись:', JSON.stringify(records[0]));
      }

      return records;
    } catch (error) {
      logFirebaseError('Ошибка получения записей о мойках по организации', error);
      return [];
    }
  },

  // Обновить существующую запись о мойке
  async update(record: CarWashRecord): Promise<boolean> {
    try {
      const recordRef = doc(db, 'carWashRecords', record.id);
      await updateDoc(recordRef, {
        ...record,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      logFirebaseError('Ошибка обновления записи о мойке', error);
      return false;
    }
  },

  // Удалить запись о мойке
  async delete(id: string): Promise<boolean> {
    try {
      const recordRef = doc(db, 'carWashRecords', id);
      await deleteDoc(recordRef);
      return true;
    } catch (error) {
      logFirebaseError('Ошибка удаления записи о мойке', error);
      return false;
    }
  }
};

// Сервис для работы с ежедневными отчетами
export const dailyReportService = {
  // Получить отчет по дате
  async getByDate(date: string): Promise<DailyReport | null> {
    try {
      const reportRef = doc(db, 'dailyReports', date);
      const snapshot = await getDoc(reportRef);

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as DailyReport;
      }
      return null;
    } catch (error) {
      logFirebaseError('Ошибка получения ежедневного отчета', error);
      return null;
    }
  },

  // Обновить ежедневный отчет
  async updateReport(report: DailyReport): Promise<boolean> {
    try {
      const reportRef = doc(db, 'dailyReports', report.id);
      await setDoc(reportRef, {
        ...report,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      logFirebaseError('Ошибка обновления ежедневного отчета', error);
      return false;
    }
  },

  // Добавить запись в ежедневный отчет
  async addRecord(date: string, record: CarWashRecord): Promise<boolean> {
    try {
      console.log('Добавление записи в ежедневный отчет:', date, record.id);

      // Получаем текущий отчет или создаем новый
      const currentReport = await this.getByDate(date) || {
        id: date,
        date: date,
        employeeIds: [],
        records: [],
        totalCash: 0,
        totalNonCash: 0
      };

      console.log('Текущий отчет перед обновлением:', currentReport);

      // Проверяем, что запись еще не существует в отчете
      const recordExists = currentReport.records.some(rec => rec.id === record.id);
      if (recordExists) {
        console.log('Запись уже существует в отчете, пропускаем добавление');
        return true;
      }

      // Добавляем запись
      const updatedRecords = [...currentReport.records, record];

      // Обновляем итоги с учетом новой структуры способа оплаты
      const totalCash = updatedRecords.reduce(
        (sum, rec) => sum + (rec.paymentMethod.type === 'cash' ? rec.price : 0),
        0
      );

      const totalNonCash = updatedRecords.reduce(
        (sum, rec) => sum + (rec.paymentMethod.type === 'card' ? rec.price : 0),
        0
      );

      // Обновляем список сотрудников, объединяя ID без дубликатов
      const allEmployeeIds = [...new Set([
        ...currentReport.employeeIds,
        ...record.employeeIds
      ])];

      // Обновляем отчет
      const updatedReport: DailyReport = {
        ...currentReport,
        records: updatedRecords,
        employeeIds: allEmployeeIds,
        totalCash,
        totalNonCash
      };

      console.log('Обновленный отчет перед сохранением:', {
        id: updatedReport.id,
        date: updatedReport.date,
        employeeIds: updatedReport.employeeIds.length,
        records: updatedReport.records.length,
        totalCash: updatedReport.totalCash,
        totalNonCash: updatedReport.totalNonCash
      });

      // Сохраняем в базе данных
      const success = await this.updateReport(updatedReport);
      console.log('Результат сохранения отчета:', success);
      return success;
    } catch (error) {
      logFirebaseError('Ошибка добавления записи в ежедневный отчет', error);

      // Дополнительное логирование для отладки
      if (error instanceof Error) {
        console.error('Детали ошибки:', error.message);
        console.error('Стек вызовов:', error.stack);
      }

      return false;
    }
  }
};

// Сервис для работы с записями на мойку (предварительные записи)
export const appointmentService = {
  // Получить все записи
  async getAll(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const snapshot = await getDocs(appointmentsRef);

      return snapshot.docs.map(doc => {
        const data = doc.data();

        // Преобразуем Timestamp в Date если необходимо
        let createdAt = data.createdAt;
        if (createdAt && typeof createdAt.toDate === 'function') {
          createdAt = createdAt.toDate();
        }

        return {
          id: doc.id,
          ...data,
          createdAt
        } as Appointment;
      });
    } catch (error) {
      logFirebaseError('Ошибка получения списка записей на мойку', error);
      return [];
    }
  },

  // Получить записи по дате
  async getByDate(date: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where('date', '==', date));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();

        // Преобразуем Timestamp в Date если необходимо
        let createdAt = data.createdAt;
        if (createdAt && typeof createdAt.toDate === 'function') {
          createdAt = createdAt.toDate();
        }

        return {
          id: doc.id,
          ...data,
          createdAt
        } as Appointment;
      });
    } catch (error) {
      logFirebaseError('Ошибка получения записей на мойку по дате', error);
      return [];
    }
  },

  // Добавить новую запись на мойку
  async add(appointment: Omit<Appointment, 'id'>): Promise<Appointment | null> {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const docRef = await addDoc(appointmentsRef, {
        ...appointment,
        createdAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        ...appointment
      };
    } catch (error) {
      logFirebaseError('Ошибка добавления записи на мойку', error);
      return null;
    }
  },

  // Обновить существующую запись на мойку
  async update(appointment: Appointment): Promise<boolean> {
    try {
      const appointmentRef = doc(db, 'appointments', appointment.id);
      await updateDoc(appointmentRef, {
        ...appointment,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      logFirebaseError('Ошибка обновления записи на мойку', error);
      return false;
    }
  },

  // Удалить запись на мойку
  async delete(id: string): Promise<boolean> {
    try {
      const appointmentRef = doc(db, 'appointments', id);
      await deleteDoc(appointmentRef);

      return true;
    } catch (error) {
      logFirebaseError('Ошибка удаления записи на мойку', error);
      return false;
    }
  },

  // Получить записи на сегодня и завтра
  async getTodayAndTomorrow(): Promise<Appointment[]> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd');

      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('date', 'in', [today, tomorrow]),
        where('status', '==', 'scheduled')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();

        // Преобразуем Timestamp в Date если необходимо
        let createdAt = data.createdAt;
        if (createdAt && typeof createdAt.toDate === 'function') {
          createdAt = createdAt.toDate();
        }

        return {
          id: doc.id,
          ...data,
          createdAt
        } as Appointment;
      });
    } catch (error) {
      logFirebaseError('Ошибка получения записей на мойку на сегодня и завтра', error);
      return [];
    }
  }
};

// Сервис для общих операций с базой данных
export const databaseService = {
  // Проверяет соединение с базой данных
  async testConnection(): Promise<boolean> {
    try {
      console.log('Проверка соединения с Firebase, проект:', app.options.projectId);

      // Сначала попробуем просто запросить список коллекций
      console.log('Запрос коллекции employees...');
      const q = query(collection(db, 'employees'), limit(1));
      const snapshot = await getDocs(q);

      console.log('Соединение успешно установлено');
      return true;
    } catch (error) {
      logFirebaseError('Ошибка проверки соединения с базой данных', error);

      // Дополнительная проверка на типичные ошибки
      if (error?.code === 'permission-denied') {
        console.error('У вас нет прав доступа к базе данных. Проверьте правила безопасности Firestore.');
      } else if (error?.code?.includes('network')) {
        console.error('Проблема с сетевым подключением. Проверьте ваше интернет-соединение.');
      }

      return false;
    }
  },

  // Очистить всю базу данных (полная очистка всех коллекций)
  async clearAllData(): Promise<boolean> {
    try {
      console.log('Начинаем полную очистку базы данных Firestore');
      console.log('Проект:', app.options.projectId);

      // Максимальный размер пакета - 500 операций
      const MAX_BATCH_SIZE = 450;

      // Функция для удаления коллекции с использованием нескольких пакетов
      const deleteCollection = async (collectionPath: string) => {
        try {
          console.log(`Начинаем очистку коллекции: ${collectionPath}`);
          const collectionRef = collection(db, collectionPath);
          const snapshot = await getDocs(collectionRef);

          if (snapshot.empty) {
            console.log(`Коллекция ${collectionPath} уже пуста`);
            return;
          }

          console.log(`Найдено ${snapshot.docs.length} документов в коллекции ${collectionPath}`);

          let batch = writeBatch(db);
          let operationCount = 0;
          let totalDeleted = 0;

          for (const document of snapshot.docs) {
            batch.delete(document.ref);
            operationCount++;
            totalDeleted++;

            // Если достигли максимального размера пакета, выполняем его и создаем новый
            if (operationCount >= MAX_BATCH_SIZE) {
              await batch.commit();
              console.log(`Удалено ${operationCount} документов из ${collectionPath} (итого: ${totalDeleted})`);
              batch = writeBatch(db);
              operationCount = 0;
            }
          }

          // Если остались операции в пакете, выполняем их
          if (operationCount > 0) {
            await batch.commit();
            console.log(`Удалено оставшиеся ${operationCount} документов из ${collectionPath}`);
          }

          console.log(`Коллекция ${collectionPath} полностью очищена (всего удалено: ${totalDeleted} документов)`);
        } catch (error) {
          console.error(`Ошибка при очистке коллекции ${collectionPath}:`, error);
          // Продолжаем с другими коллекциями даже если одна дала ошибку
        }
      };

      // Перечисляем ВСЕ возможные коллекции в приложении
      const collections = [
        'employees',           // Сотрудники
        'organizations',       // Организации-партнеры
        'carWashRecords',      // Записи о мойках
        'dailyReports',        // Ежедневные отчеты
        'services',            // Услуги
        'appointments',        // Записи на мойку
        'settings',            // Настройки системы
        'dailyRoles',          // Ежедневные роли сотрудников
        'users',               // Пользователи (если есть)
        'logs',                // Логи (если есть)
        'notifications',       // Уведомления (если есть)
        'backups',             // Резервные копии (если есть)
        'analytics',           // Аналитика (если есть)
        'configuration'        // Дополнительная конфигурация (если есть)
      ];

      console.log('Список коллекций для очистки:', collections);

      // Последовательно удаляем данные из каждой коллекции
      let successfullyCleared = 0;
      let errors = 0;

      for (const collectionPath of collections) {
        try {
          await deleteCollection(collectionPath);
          successfullyCleared++;
        } catch (error) {
          console.error(`Критическая ошибка при очистке коллекции ${collectionPath}:`, error);
          errors++;
        }
      }

      console.log(`Очистка завершена. Успешно очищено коллекций: ${successfullyCleared}, ошибок: ${errors}`);

      if (errors > 0) {
        console.warn(`Внимание: при очистке ${errors} коллекций произошли ошибки`);
      }

      // Возвращаем true если хотя бы часть коллекций была очищена
      return successfullyCleared > 0;
    } catch (error) {
      logFirebaseError('Критическая ошибка при полной очистке базы данных', error);
      return false;
    }
  }
};

// Сервис для работы с настройками системы
export const settingsService = {
  // Сохранить метод расчета зарплаты
  async saveSalaryCalculationMethod(method: string, date: string): Promise<boolean> {
    try {
      console.log(`Сохранение метода расчета зарплаты: ${method}, дата изменения: ${date}`);
      const settingsRef = doc(db, 'settings', 'salaryCalculation');

      await setDoc(settingsRef, {
        method,
        date,
        updatedAt: serverTimestamp()
      });

      console.log('Метод расчета зарплаты успешно сохранен в базе данных');
      return true;
    } catch (error) {
      logFirebaseError('Ошибка при сохранении метода расчета зарплаты', error);
      return false;
    }
  },

  // Получить метод расчета зарплаты
  async getSalaryCalculationMethod(): Promise<{ method: string; date: string } | null> {
    try {
      const settingsRef = doc(db, 'settings', 'salaryCalculation');
      const snapshot = await getDoc(settingsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          method: data.method,
          date: data.date
        };
      }

      return null;
    } catch (error) {
      logFirebaseError('Ошибка при получении метода расчета зарплаты', error);
      return null;
    }
  },

  // Сохранить настройки минимальной оплаты
  async saveMinimumPaymentSettings(settings: any): Promise<boolean> {
    try {
      console.log('Сохранение настроек минимальной оплаты:', settings);
      const settingsRef = doc(db, 'settings', 'minimumPayment');

      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });

      console.log('Настройки минимальной оплаты успешно сохранены в базе данных');
      return true;
    } catch (error) {
      logFirebaseError('Ошибка при сохранении настроек минимальной оплаты', error);
      return false;
    }
  },

  // Получить настройки минимальной оплаты
  async getMinimumPaymentSettings(): Promise<any | null> {
    try {
      const settingsRef = doc(db, 'settings', 'minimumPayment');
      const snapshot = await getDoc(settingsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          minimumPaymentWasher: data.minimumPaymentWasher || 0,
          percentageWasher: data.percentageWasher || 10,
          minimumPaymentAdmin: data.minimumPaymentAdmin || 0,
          percentageAdmin: data.percentageAdmin || 5,
          adminCashPercentage: data.adminCashPercentage || 3,
          adminCarWashPercentage: data.adminCarWashPercentage || 2
        };
      }

      return null;
    } catch (error) {
      logFirebaseError('Ошибка при получении настроек минимальной оплаты', error);
      return null;
    }
  }
};

// Сервис для работы с ежедневными ролями сотрудников
export const dailyRolesService = {
  // Сохранить ежедневные роли сотрудников
  async saveDailyRoles(date: string, employeeRoles: Record<string, string>): Promise<boolean> {
    try {
      console.log(`Сохранение ежедневных ролей для даты ${date}:`, employeeRoles);
      const rolesRef = doc(db, 'dailyRoles', date);

      await setDoc(rolesRef, {
        date,
        employeeRoles,
        updatedAt: serverTimestamp()
      });

      console.log('Ежедневные роли успешно сохранены в базе данных');
      return true;
    } catch (error) {
      logFirebaseError('Ошибка при сохранении ежедневных ролей', error);
      return false;
    }
  },

  // Получить ежедневные роли сотрудников
  async getDailyRoles(date: string): Promise<Record<string, string> | null> {
    try {
      const rolesRef = doc(db, 'dailyRoles', date);
      const snapshot = await getDoc(rolesRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        return data.employeeRoles || {};
      }

      return null;
    } catch (error) {
      logFirebaseError('Ошибка при получении ежедневных ролей', error);
      return null;
    }
  },

  // Обновить роль конкретного сотрудника на определенную дату
  async updateEmployeeRole(date: string, employeeId: string, role: string): Promise<boolean> {
    try {
      console.log(`Обновление роли сотрудника ${employeeId} на дату ${date}: ${role}`);

      // Получаем текущие роли
      const currentRoles = await this.getDailyRoles(date) || {};

      // Обновляем роль конкретного сотрудника
      currentRoles[employeeId] = role;

      // Сохраняем обновленные роли
      return await this.saveDailyRoles(date, currentRoles);
    } catch (error) {
      logFirebaseError('Ошибка при обновлении роли сотрудника', error);
      return false;
    }
  }
};
