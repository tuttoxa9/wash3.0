import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { format, parseISO, isToday, isTomorrow, ru } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAppContext } from '@/lib/context/AppContext';
import { Loader2, FileDown, Save, Check, Edit, Calendar, Plus, CheckCircle, X, ArrowRight, Trash2, User, Eye, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import type { DailyReport, CarWashRecord, Employee, Appointment, EmployeeRole } from '@/lib/types';
import { carWashService, dailyReportService, appointmentService, dailyRolesService } from '@/lib/services/supabaseService';
import { createSalaryCalculator } from '@/components/SalaryCalculator';
import { generateDailyReportDocx } from '@/lib/utils';
import { saveAs } from 'file-saver';
import { Packer } from 'docx';
import Modal from '@/components/ui/modal';

const HomePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState({
    dailyReport: true,
    employees: true,
    exporting: false,
    savingShift: false
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftEmployees, setShiftEmployees] = useState<string[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<Record<string, EmployeeRole>>({});
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [selectedDate, setSelectedDate] = useState(state.currentDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Состояния для модальных окон
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [dailyReportModalOpen, setDailyReportModalOpen] = useState(false);

  // Добавим состояние и обработчики для предзаполнения данных из записи
  const [appointmentToConvert, setAppointmentToConvert] = useState<Appointment | null>(null);
  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | null>(null);

  // Добавляем состояния для хранения позиции клика
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  // Добавляем состояние для отслеживания редактируемой записи
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CarWashRecord> | null>(null);

  // Добавляем состояние для фильтрации по методу оплаты
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'organization'>('all');

  // Проверяем, является ли выбранная дата текущей
  const isCurrentDate = isToday(new Date(selectedDate));

  // Получаем текущий отчет и список сотрудников
  const currentReport = state.dailyReports[selectedDate] || null;
  const workingEmployees = currentReport?.employeeIds
    ? state.employees.filter(emp => currentReport.employeeIds.includes(emp.id))
    : [];

  // Флаг: смена начата (есть работники в отчете)
  const shiftStarted = (currentReport?.employeeIds?.length || 0) > 0;

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = state.organizations.find(org => org.id === id);
    return organization ? organization.name : 'Неизвестная организация';
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (type: string, organizationId?: string): string => {
    if (type === 'cash') return 'Наличные';
    if (type === 'card') return 'Карта';
    if (type === 'organization' && organizationId) return getOrganizationName(organizationId);
    return 'Неизвестный';
  };

  // Функция для получения статистики работника
  const getEmployeeStats = (employeeId: string) => {
    if (!currentReport?.records) {
      return { carCount: 0, totalEarnings: 0 };
    }

    const employeeRecords = currentReport.records.filter(record =>
      record.employeeIds.includes(employeeId)
    );

    const carCount = employeeRecords.length;
    const totalEarnings = employeeRecords.reduce((sum, record) => sum + record.price, 0);

    return { carCount, totalEarnings };
  };

  // Обработчик открытия модального окна работника
  const openEmployeeModal = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEmployeeModalOpen(true);
  };

  // Обработчик открытия модального окна ежедневной ведомости
  const openDailyReportModal = () => {
    setDailyReportModalOpen(true);
  };

  // Переключение модального окна
  const toggleModal = (event?: React.MouseEvent) => {
    // Если закрываем модальное окно, сбрасываем данные
    if (isModalOpen) {
      setAppointmentToConvert(null);
      setClickPosition(null);
      setPreselectedEmployeeId(null);
    } else if (event) {
      // Сохраняем позицию клика для анимации
      setClickPosition({ x: event.clientX, y: event.clientY });
    }
    setIsModalOpen(!isModalOpen);
  };

  // Функция для открытия модального окна добавления записи с предвыбранным сотрудником
  const openAddRecordModalForEmployee = (employeeId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Предотвращаем открытие детального модального окна
    setPreselectedEmployeeId(employeeId);
    setClickPosition({ x: event.clientX, y: event.clientY });
    setIsModalOpen(true);
  };

  // Обработчик изменения даты через календарь
  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      const newDate = format(day, 'yyyy-MM-dd');
      setSelectedDate(newDate);
      dispatch({ type: 'SET_CURRENT_DATE', payload: newDate });
      setIsCalendarOpen(false);
    }
  };

  // Toggle calendar visibility
  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  // Format date for display
  const formattedDate = format(new Date(selectedDate), 'dd.MM.yyyy');

  // Функция для экспорта отчета в Word
  const exportToWord = async () => {
    if (!currentReport) {
      toast.error('Нет данных для экспорта');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, exporting: true }));

      // Создаем документ
      const doc = generateDailyReportDocx(currentReport, state.employees, selectedDate);

      // Преобразуем в blob
      const blob = await Packer.toBlob(doc);

      // Сохраняем файл
      const fileName = `Ведомость_${format(new Date(selectedDate), 'dd-MM-yyyy')}.docx`;
      saveAs(blob, fileName);

      toast.success('Документ успешно экспортирован');
    } catch (error) {
      console.error('Ошибка при экспорте документа:', error);
      toast.error('Ошибка при экспорте документа');
    } finally {
      setLoading(prev => ({ ...prev, exporting: false }));
    }
  };

  // Обработчик выбора сотрудников для смены
  const handleEmployeeSelection = (employeeId: string) => {
    if (isShiftLocked && !isEditingShift) return;

    if (shiftEmployees.includes(employeeId)) {
      setShiftEmployees(shiftEmployees.filter(id => id !== employeeId));
      // Удаляем роль сотрудника при удалении из смены
      const newRoles = { ...employeeRoles };
      delete newRoles[employeeId];
      setEmployeeRoles(newRoles);
    } else {
      setShiftEmployees([...shiftEmployees, employeeId]);
      // Устанавливаем роль по умолчанию как мойщик
      setEmployeeRoles({
        ...employeeRoles,
        [employeeId]: 'washer'
      });
    }
  };

  // Обработчик изменения роли сотрудника
  const handleEmployeeRoleChange = (employeeId: string, role: EmployeeRole) => {
    setEmployeeRoles({
      ...employeeRoles,
      [employeeId]: role
    });
  };

  // Начало смены - зафиксировать сотрудников
  const startShift = async () => {
    if (shiftEmployees.length === 0) {
      toast.error('Выберите хотя бы одного сотрудника для смены');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, savingShift: true }));

      // Сохраняем ежедневные роли в базе данных
      const success = await dailyRolesService.saveDailyRoles(selectedDate, employeeRoles);
      if (!success) {
        console.warn('Не удалось сохранить ежедневные роли, но продолжаем');
      }

      // Если отчет уже существует, обновляем сотрудников
      if (currentReport) {
        const updatedReport = {
          ...currentReport,
          employeeIds: shiftEmployees,
          dailyEmployeeRoles: employeeRoles
        };

        // Сохраняем в базе данных
        await dailyReportService.updateReport(updatedReport);

        // Обновляем состояние
        dispatch({
          type: 'SET_DAILY_REPORT',
          payload: { date: selectedDate, report: updatedReport }
        });
      } else {
        // Создаем новый отчет
        const newReport: DailyReport = {
          id: selectedDate,
          date: selectedDate,
          employeeIds: shiftEmployees,
          records: [],
          totalCash: 0,
          totalNonCash: 0,
          dailyEmployeeRoles: employeeRoles
        };

        await dailyReportService.updateReport(newReport);
        dispatch({
          type: 'SET_DAILY_REPORT',
          payload: { date: selectedDate, report: newReport }
        });
      }

      setIsShiftLocked(true);
      setIsEditingShift(false);
      toast.success('Состав смены и роли сотрудников сохранены');
    } catch (error) {
      console.error('Ошибка при сохранении состава смены:', error);
      toast.error('Не удалось сохранить состав смены');
    } finally {
      setLoading(prev => ({ ...prev, savingShift: false }));
    }
  };

  // Функция для обработки преобразования записи в запись о помытой машине
  const handleAppointmentConversion = (appointment: Appointment, event?: React.MouseEvent) => {
    setAppointmentToConvert(appointment);

    // Если есть событие клика, сохраняем позицию
    if (event) {
      setClickPosition({ x: event.clientX, y: event.clientY });
    }

    // Открываем модальное окно
    toggleModal();
  };

  // Функция для начала редактирования записи
  const startEditing = (record: CarWashRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      ...record,
      // Если нужно, можно преобразовать дополнительные поля для формы
    });
  };

  // Функция для отмены редактирования
  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditFormData(null);
  };

  // Обработчик изменений в полях формы редактирования
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => {
      if (!prev) return prev;

      // Особая обработка для числовых значений
      if (name === 'price') {
        return { ...prev, [name]: Number.parseFloat(value) || 0 };
      }

      return { ...prev, [name]: value };
    });
  };

  // Обработчик изменения способа оплаты при редактировании
  const handleEditPaymentTypeChange = (type: 'cash' | 'card' | 'organization') => {
    setEditFormData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          type,
          organizationId: type === 'organization' ? prev.paymentMethod?.organizationId : undefined,
          organizationName: type === 'organization' ? prev.paymentMethod?.organizationName : undefined
        }
      };
    });
  };

  // Обработчик выбора организации при редактировании
  const handleEditOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(org => org.id === organizationId);

    setEditFormData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          ...prev.paymentMethod,
          type: 'organization',
          organizationId,
          organizationName: organization?.name
        }
      };
    });
  };

  // Обработчик выбора сотрудников при редактировании
  const handleEditEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setEditFormData(prev => {
      if (!prev) return prev;

      const currentEmployeeIds = prev.employeeIds || [];

      if (checked) {
        return {
          ...prev,
          employeeIds: [...currentEmployeeIds, value]
        };
      } else {
        return {
          ...prev,
          employeeIds: currentEmployeeIds.filter(id => id !== value)
        };
      }
    });
  };

  // Функция для сохранения изменений
  const saveRecordChanges = async () => {
    if (!editFormData || !editingRecordId) return;

    try {
      const record = {
        ...editFormData,
        id: editingRecordId
      } as CarWashRecord;

      // Обновляем запись в базе данных
      const updatedRecord = await carWashService.update(record);

      if (updatedRecord) {
        // Обновляем запись в отчете
        const updatedReport = {...currentReport};
        if (updatedReport && updatedReport.records) {
          updatedReport.records = updatedReport.records.map(rec =>
            rec.id === editingRecordId ? record : rec
          );

          // Пересчитываем итоги
          const totalCash = updatedReport.records.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'cash' ? rec.price : 0),
            0
          );

          const totalNonCash = updatedReport.records.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'card' ? rec.price : 0),
            0
          );

          // Также пересчитываем организации, хотя они не хранятся отдельно
          // totalOrganizations можно вычислить как totalRevenue - totalCash - totalNonCash

          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: 'SET_DAILY_REPORT',
            payload: { date: selectedDate, report: updatedReport }
          });
        }

        // Сбрасываем состояние редактирования
        cancelEditing();
        toast.success('Запись успешно обновлена');
      } else {
        toast.error('Не удалось обновить запись');
      }
    } catch (error) {
      console.error('Ошибка при обновлении записи:', error);
      toast.error('Произошла ошибка при обновлении записи');
    }
  };

  // Функция для удаления записи
  const deleteRecord = async (recordId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      const success = await carWashService.delete(recordId);

      if (success) {
        // Обновляем отчет
        const updatedReport = {...currentReport};
        if (updatedReport && updatedReport.records) {
          const updatedRecords = updatedReport.records.filter(rec => rec.id !== recordId);

          // Пересчитываем итоги
          const totalCash = updatedRecords.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'cash' ? rec.price : 0),
            0
          );

          const totalNonCash = updatedRecords.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'card' ? rec.price : 0),
            0
          );

          // Также пересчитываем организации, хотя они не хранятся отдельно
          // totalOrganizations можно вычислить как totalRevenue - totalCash - totalNonCash

          updatedReport.records = updatedRecords;
          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: 'SET_DAILY_REPORT',
            payload: { date: selectedDate, report: updatedReport }
          });
        }

        toast.success('Запись успешно удалена');
      } else {
        toast.error('Не удалось удалить запись');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      toast.error('Произошла ошибка при удалении записи');
    }
  };

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(prev => ({ ...prev, dailyReport: true }));
      try {
        const report = await dailyReportService.getByDate(selectedDate);
        if (report) {
          dispatch({
            type: 'SET_DAILY_REPORT',
            payload: { date: selectedDate, report }
          });

          // Если в отчете уже есть сотрудники, устанавливаем и блокируем
          if (report.employeeIds && report.employeeIds.length > 0) {
            setShiftEmployees(report.employeeIds);
            setIsShiftLocked(true);

            // Загружаем ежедневные роли из отчета или из базы данных
            if (report.dailyEmployeeRoles) {
              setEmployeeRoles(report.dailyEmployeeRoles);
            } else {
              // Если в отчете нет ролей, пытаемся загрузить из dailyRoles коллекции
              const dailyRoles = await dailyRolesService.getDailyRoles(selectedDate);
              if (dailyRoles) {
                setEmployeeRoles(dailyRoles);
              } else {
                // Если ролей нет нигде, устанавливаем роли по умолчанию (мойщик)
                const defaultRoles: Record<string, EmployeeRole> = {};
                report.employeeIds.forEach(empId => {
                  defaultRoles[empId] = 'washer';
                });
                setEmployeeRoles(defaultRoles);
              }
            }
          }

          // Если в отчете уже есть записи, блокируем изменение смены
          if (report.records && report.records.length > 0) {
            setIsShiftLocked(true);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке отчета:', error);
        toast.error('Не удалось загрузить отчет');
      } finally {
        setLoading(prev => ({ ...prev, dailyReport: false }));
      }
    };

    loadData();
    // При изменении выбранной даты сбрасываем состояние смены
    setIsShiftLocked(false);
    setIsEditingShift(false);
    setShiftEmployees([]);
    setEmployeeRoles({});
  }, [selectedDate, dispatch]);

  // Handle clicks outside the calendar to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [calendarRef]);

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold truncate">
            Главная страница
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={shiftStarted ? openDailyReportModal : () => toast.info('Сначала выберите работников и начните смену')}
              disabled={!shiftStarted}
              className="mobile-button inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm touch-manipulation disabled:opacity-50"
              title={shiftStarted ? undefined : 'Сначала выберите работников и начните смену'}
            >
              <Receipt className="w-4 h-4" />
              Ежедневная ведомость
            </button>
            <button
              onClick={(e) => {
                if (!shiftStarted) {
                  toast.info('Сначала выберите работников и начните смену');
                  return;
                }
                setAppointmentToConvert(null);
                setPreselectedEmployeeId(null);
                toggleModal(e);
              }}
              disabled={!shiftStarted}
              className="mobile-button inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm touch-manipulation disabled:opacity-50"
              title={shiftStarted ? undefined : 'Сначала выберите работников и начните смену'}
            >
              <Plus className="w-4 h-4" />
              Добавить помытую машину
            </button>
          </div>
        </div>

        {/* Выбор даты - теперь расположен ниже заголовка */}
        <div className="flex items-center gap-4 px-1 py-2">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
            <span className="text-muted-foreground font-medium">Дата:</span>
          </div>

          <div className="relative" ref={calendarRef}>
            <div
              className="flex h-9 items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={toggleCalendar}
            >
              <span className="flex-1 font-medium">{formattedDate}</span>
              {isCurrentDate &&
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                  Сегодня
                </span>
              }
            </div>
            {isCalendarOpen && (
              <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-lg border border-border p-1">
                <DayPicker
                  mode="single"
                  selected={new Date(selectedDate)}
                  onDayClick={handleDaySelect}
                />
              </div>
            )}
          </div>
        </div>

        {/* Выбор сотрудников на смене - более компактный дизайн */}
        <div className="card-with-shadow p-3 sm:p-4">
          <div className="flex flex-wrap justify-between items-center mb-2">
            <h3 className="text-base font-medium">
              {isShiftLocked && !isEditingShift
                ? `Работали: ${workingEmployees.map(e => e.name).join(', ')}` : 'Выберите сотрудников на смене:'}
            </h3>
            {isShiftLocked && (
              <button
                onClick={() => setIsEditingShift(!isEditingShift)}
                className="px-2 py-1 rounded-lg border border-input hover:bg-muted/50 transition-colors text-xs"
              >
                {isEditingShift ? (
                  <>
                    <Check className="w-3 h-3 inline mr-1" />
                    Готово
                  </>
                ) : (
                  <>
                    <Edit className="w-3 h-3 inline mr-1" />
                    Изменить
                  </>
                )}
              </button>
            )}
          </div>

          {(!isShiftLocked || isEditingShift) && (
            <>
              <div className="space-y-3 mb-3">
                <div className="flex flex-wrap gap-2">
                  {state.employees.map(employee => (
                    <button
                      key={employee.id}
                      onClick={() => handleEmployeeSelection(employee.id)}
                      className={`px-3 py-2 rounded-lg text-xs transition-colors touch-manipulation ${
                        shiftEmployees.includes(employee.id)
                          ? 'bg-primary text-white'
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      {employee.name}
                    </button>
                  ))}
                </div>

                {/* Выбор ролей для выбранных сотрудников */}
                {shiftEmployees.length > 0 && state.salaryCalculationMethod === 'minimumWithPercentage' && (
                  <div className="p-3 border border-border rounded-lg bg-muted/20">
                    <h4 className="text-xs font-medium mb-2">Назначение ролей сотрудников:</h4>
                    <div className="space-y-2">
                      {shiftEmployees.map(employeeId => {
                        const employee = state.employees.find(emp => emp.id === employeeId);
                        if (!employee) return null;

                        return (
                          <div key={employeeId} className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium flex-1">{employee.name}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEmployeeRoleChange(employeeId, 'washer')}
                                className={`px-2 py-1 rounded text-xs transition-colors touch-manipulation ${
                                  employeeRoles[employeeId] === 'washer'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-secondary/50 hover:bg-secondary'
                                }`}
                              >
                                Мойщик
                              </button>
                              <button
                                onClick={() => handleEmployeeRoleChange(employeeId, 'admin')}
                                className={`px-2 py-1 rounded text-xs transition-colors touch-manipulation ${
                                  employeeRoles[employeeId] === 'admin'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-secondary/50 hover:bg-secondary'
                                }`}
                              >
                                Админ
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={startShift}
                disabled={loading.savingShift || shiftEmployees.length === 0}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                {loading.savingShift ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditingShift ? 'Сохранить изменения' : 'Начать смену'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Основная секция с квадратиками работников и виджетами */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 lg:gap-5">
        <div className="space-y-5">
          {/* Квадратики работников */}
          <div className="card-with-shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Сотрудники</h3>
            {loading.dailyReport ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Загрузка данных...</p>
              </div>
            ) : workingEmployees.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {workingEmployees.map(employee => {
                  const stats = getEmployeeStats(employee.id);
                  const role = employeeRoles[employee.id] || 'washer';

                  // Расчет заработной платы сотрудника
                  let dailySalary = 0;
                  if (state.salaryCalculationMethod === 'minimumWithPercentage' && currentReport?.records) {
                    const salaryCalculator = createSalaryCalculator(
                      state.minimumPaymentSettings,
                      currentReport.records,
                      employeeRoles,
                      state.employees
                    );
                    const salaryResults = salaryCalculator.calculateSalaries();
                    const employeeSalary = salaryResults.find(result => result.employeeId === employee.id);
                    dailySalary = employeeSalary ? employeeSalary.calculatedSalary : 0;
                  }

                  return (
                    <div
                      key={employee.id}
                      className={`employee-card rounded-xl p-6 cursor-pointer ${loading.dailyReport ? 'loading' : ''}`}
                      onClick={() => openEmployeeModal(employee.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              if (!shiftStarted) {
                                e.preventDefault();
                                e.stopPropagation();
                                toast.info('Сначала выберите работников и начните смену');
                                return;
                              }
                              openAddRecordModalForEmployee(employee.id, e);
                            }}
                            disabled={!shiftStarted}
                            className="employee-avatar hover:bg-primary/20 transition-colors rounded-lg p-2 disabled:opacity-50"
                            title={shiftStarted ? 'Добавить запись для этого сотрудника' : 'Сначала выберите работников и начните смену'}
                          >
                            <Plus className="w-6 h-6 text-primary" />
                          </button>
                          <h4 className="font-semibold text-lg text-card-foreground">{employee.name}</h4>
                        </div>
                        <span
                          className={`employee-role-badge ${
                            role === 'admin' ? 'admin' : 'washer'
                          }`}
                        >
                          {role === 'admin' ? 'Админ' : 'Мойщик'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Машин помыто:</span>
                          <span className="font-semibold text-lg text-card-foreground">{stats.carCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Сумма услуг:</span>
                          <span className="font-semibold text-lg text-card-foreground">{stats.totalEarnings.toFixed(2)} BYN</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {(() => {
                              const now = new Date();
                              const currentHour = now.getHours();
                              const currentMinute = now.getMinutes();
                              const currentTimeInMinutes = currentHour * 60 + currentMinute;
                              const workStartMinutes = 9 * 60;
                              const workEndMinutes = 21 * 60;

                              if (currentTimeInMinutes < workStartMinutes) {
                                return "ЗП за день:";
                              } else if (currentTimeInMinutes >= workEndMinutes) {
                                return "ЗП за день:";
                              } else {
                                const workedMinutes = currentTimeInMinutes - workStartMinutes;
                                const workedHours = workedMinutes / 60;
                                return `ЗП за ${workedHours.toFixed(1)}ч:`;
                              }
                            })()}
                          </span>
                          <span className="font-bold text-lg text-primary">{dailySalary.toFixed(2)} BYN</span>
                        </div>
                      </div>

                      <div className="employee-card-footer">
                        <div className="flex items-center justify-center gap-2 text-sm text-primary">
                          <Eye className="w-4 h-4" />
                          Нажмите для деталей
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Нет работающих сотрудников на выбранную дату.</p>
                <p className="text-sm mt-1">Выберите сотрудников для смены выше.</p>
              </div>
            )}
          </div>

          {/* Итоги */}
          {currentReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Сводка по оплатам */}
              <div className="card-with-shadow">
                <h3 className="text-lg font-semibold mb-4">Итого:</h3>
                <div className="space-y-2">
                  <div
                    className={`flex justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      paymentFilter === 'cash'
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted/50'
                    } ${!shiftStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!shiftStarted) { toast.info('Сначала выберите работников и начните смену'); return; }
                      setPaymentFilter('cash');
                      openDailyReportModal();
                    }}
                    title={shiftStarted ? 'Нажмите для просмотра ведомости по наличным' : 'Сначала выберите работников и начните смену'}
                  >
                    <span>Нал - </span>
                    <span className="font-medium">{currentReport.totalCash.toFixed(2)} BYN</span>
                  </div>
                  <div
                    className={`flex justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      paymentFilter === 'card'
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted/50'
                    } ${!shiftStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!shiftStarted) { toast.info('Сначала выберите работников и начните смену'); return; }
                      setPaymentFilter('card');
                      openDailyReportModal();
                    }}
                    title={shiftStarted ? 'Нажмите для просмотра ведомости по картам' : 'Сначала выберите работников и начните смену'}
                  >
                    <span>Карта - </span>
                    <span className="font-medium">{currentReport.totalNonCash.toFixed(2)} BYN</span>
                  </div>
                  <div
                    className={`flex justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      paymentFilter === 'organization'
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted/50'
                    } ${!shiftStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!shiftStarted) { toast.info('Сначала выберите работников и начните смену'); return; }
                      setPaymentFilter('organization');
                      openDailyReportModal();
                    }}
                    title={shiftStarted ? 'Нажмите для просмотра ведомости по безналу' : 'Сначала выберите работников и начните смену'}
                  >
                    <span>Безнал - </span>
                    <span className="font-medium">{(() => {
                      // Подсчитываем сумму за организации
                      const orgSum = currentReport.records?.reduce((sum, record) => {
                        return sum + (record.paymentMethod.type === 'organization' ? record.price : 0);
                      }, 0) || 0;
                      return orgSum.toFixed(2);
                    })()} BYN</span>
                  </div>
                  <div
                    className={`border-t border-border mt-4 pt-4 flex justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors ${!shiftStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!shiftStarted) { toast.info('Сначала выберите работников и начните смену'); return; }
                      setPaymentFilter('all');
                      openDailyReportModal();
                    }}
                    title={shiftStarted ? 'Нажмите для просмотра полной ведомости' : 'Сначала выберите работников и начните смену'}
                  >
                    <span className="font-medium">Всего:</span>
                    <span className="font-bold">
                      {(() => {
                        // Считаем общую сумму всех записей напрямую
                        const totalRevenue = currentReport.records?.reduce((sum, record) => {
                          return sum + record.price;
                        }, 0) || 0;
                        return totalRevenue.toFixed(2);
                      })()} BYN
                    </span>
                  </div>
                </div>
              </div>

              {/* Заработок сотрудников */}
              <div className="card-with-shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  Заработок
                  <span className="inline-flex items-center relative group ml-4">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full border border-primary text-primary text-xs cursor-help">i</span>
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover text-popover-foreground rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <p className="text-sm">
                        Расчет ЗП: минимальная оплата + процент с учетом ролей
                      </p>
                      <div className="absolute top-full left-5 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover"></div>
                    </div>
                  </span>
                </h3>
                <div className="space-y-2">
                  {(() => {
                    // Всегда используем минимальную оплату + процент
                    const methodToUse = state.salaryCalculationMethod;

                    // Используем новый компонент расчета зарплаты
                    if (methodToUse === 'minimumWithPercentage' && currentReport?.records) {
                      const salaryCalculator = createSalaryCalculator(
                        state.minimumPaymentSettings,
                        currentReport.records,
                        employeeRoles,
                        state.employees
                      );

                      const salaryResults = salaryCalculator.calculateSalaries();
                      const totalSalarySum = salaryCalculator.getTotalSalarySum();

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Общая сумма - </span>
                            <span className="font-medium">{totalSalarySum.toFixed(2)} BYN</span>
                          </div>
                          {salaryResults.length > 0 && (
                            <div className="border-t border-border mt-4 pt-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Индивидуальные зарплаты:
                                </p>
                                <div className="space-y-1">
                                  {salaryResults.map(result => {
                                    // Расчет почасовой оплаты с учетом текущего времени
                                    const calculateHourlyRate = () => {
                                      const now = new Date();
                                      const currentHour = now.getHours();
                                      const currentMinute = now.getMinutes();
                                      const currentTimeInMinutes = currentHour * 60 + currentMinute;

                                      // Рабочее время: 09:00 - 21:00
                                      const workStartMinutes = 9 * 60; // 09:00 в минутах
                                      const workEndMinutes = 21 * 60;   // 21:00 в минутах

                                      // Если сейчас не рабочее время, показываем полную дневную ставку
                                      if (currentTimeInMinutes < workStartMinutes || currentTimeInMinutes >= workEndMinutes) {
                                        return result.calculatedSalary / 12; // Полный день 12 часов
                                      }

                                      // Рассчитываем отработанное время в часах
                                      const workedMinutes = Math.max(0, currentTimeInMinutes - workStartMinutes);
                                      const workedHours = workedMinutes / 60;

                                      // Если отработано менее часа, показываем почасовую ставку
                                      if (workedHours < 1) {
                                        return result.calculatedSalary / 12;
                                      }

                                      // Возвращаем заработок на данный момент, разделенный на отработанные часы
                                      return result.calculatedSalary / workedHours;
                                    };

                                    const hourlyRate = calculateHourlyRate();

                                    return (
                                      <div key={result.employeeId} className="flex justify-between text-sm">
                                        <span>{result.employeeName} ({result.role === 'admin' ? 'Админ' : 'Мойщик'}) ({(() => {
                                          const now = new Date();
                                          const currentHour = now.getHours();
                                          const currentMinute = now.getMinutes();
                                          const currentTimeInMinutes = currentHour * 60 + currentMinute;
                                          const workStartMinutes = 9 * 60;
                                          const workEndMinutes = 21 * 60;

                                          if (currentTimeInMinutes < workStartMinutes || currentTimeInMinutes >= workEndMinutes) {
                                            return `${hourlyRate.toFixed(2)} BYN/час`;
                                          }

                                          const workedMinutes = Math.max(0, currentTimeInMinutes - workStartMinutes);
                                          const workedHours = workedMinutes / 60;

                                          if (workedHours < 1) {
                                            return `${hourlyRate.toFixed(2)} BYN/час`;
                                          }

                                          return `${hourlyRate.toFixed(2)} BYN/час за ${workedHours.toFixed(1)}ч`;
                                        })()})</span>
                                        <span className="font-medium">{result.calculatedSalary.toFixed(2)} BYN</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    }

                    // Fallback если нет записей или метод не выбран
                    if (methodToUse === 'none') {
                      return (
                        <div className="flex justify-between">
                          <span>Выберите метод расчета в настройках</span>
                          <span className="font-medium">0.00 BYN</span>
                        </div>
                      );
                    }

                    // Fallback - показываем что нет данных для расчета
                    return (
                      <div className="flex justify-between">
                        <span>Нет данных для расчета</span>
                        <span className="font-medium">0.00 BYN</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Модальное окно для добавления записи */}
          {isModalOpen && <AddCarWashModal
            onClose={toggleModal}
            selectedDate={selectedDate}
            prefilledData={appointmentToConvert}
            clickPosition={clickPosition}
            employeeRoles={employeeRoles}
            preselectedEmployeeId={preselectedEmployeeId}
          />}

          {/* Модальное окно детальной таблицы работника */}
          {employeeModalOpen && selectedEmployeeId && (
            <EmployeeDetailModal
              employeeId={selectedEmployeeId}
              onClose={() => {
                setEmployeeModalOpen(false);
                setSelectedEmployeeId(null);
              }}
              currentReport={currentReport}
              employees={state.employees}
              organizations={state.organizations}
            />
          )}

          {/* Модальное окно ежедневной ведомости */}
          {dailyReportModalOpen && shiftStarted && (
            <DailyReportModal
              onClose={() => setDailyReportModalOpen(false)}
              currentReport={currentReport}
              employees={state.employees}
              organizations={state.organizations}
              selectedDate={selectedDate}
              onExport={exportToWord}
              isExporting={loading.exporting}
              paymentFilter={paymentFilter}
              onPaymentFilterChange={setPaymentFilter}
            />
          )}
        </div>

        {/* Виджет "Записи на мойку" */}
        <AppointmentsWidget onStartAppointment={handleAppointmentConversion} canCreateRecords={shiftStarted} />
      </div>
    </div>
  );
};

// Интерфейс модального окна для добавления записи
interface AddCarWashModalProps {
  onClose: () => void;
  selectedDate: string;
  prefilledData?: Appointment | null;
  clickPosition?: { x: number; y: number } | null;
  employeeRoles: Record<string, EmployeeRole>;
  preselectedEmployeeId?: string | null;
}

const AddCarWashModal: React.FC<AddCarWashModalProps> = ({ onClose, selectedDate, prefilledData, clickPosition, employeeRoles, preselectedEmployeeId }) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  // Получаем текущий отчет и его сотрудников
  const currentReport = state.dailyReports[selectedDate] || null;
  const shiftEmployeeIds = currentReport?.employeeIds || [];

  // Начальное состояние формы с учетом предзаполненных данных
  const [formData, setFormData] = useState(() => {
    if (prefilledData) {
      return {
        time: prefilledData.time,
        carInfo: prefilledData.carInfo,
        service: prefilledData.service,
        price: 0, // Нужно указать цену
        paymentMethod: { type: 'cash' } as PaymentMethod,
        employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : []
      };
    }

    return {
      time: format(new Date(), 'HH:mm'),
      carInfo: '',
      service: '',
      price: 0,
      paymentMethod: { type: 'cash' } as PaymentMethod,
      employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : []
    };
  });

  // Обработка изменений в форме
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Обработка изменения способа оплаты
  const handlePaymentTypeChange = (type: 'cash' | 'card' | 'organization') => {
    setFormData({
      ...formData,
      paymentMethod: {
        type,
        organizationId: type === 'organization' ? formData.paymentMethod.organizationId : undefined,
        organizationName: type === 'organization' ? formData.paymentMethod.organizationName : undefined
      }
    });
  };

  // Обработка изменений в выборе организации
  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(org => org.id === organizationId);

    setFormData({
      ...formData,
      paymentMethod: {
        ...formData.paymentMethod,
        organizationId,
        organizationName: organization?.name
      }
    });
  };

  // Обработка изменений в выборе сотрудников
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    if (checked) {
      setFormData({
        ...formData,
        employeeIds: [...formData.employeeIds, value]
      });
    } else {
      setFormData({
        ...formData,
        employeeIds: formData.employeeIds.filter(id => id !== value)
      });
    }
  };

  // Функция для добавления записи в базу данных и отчет
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка валидности данных
    if (!formData.carInfo || !formData.service || !formData.time) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    const price = Number.parseFloat(formData.price.toString());
    if (isNaN(price) || price <= 0) {
      toast.error('Укажите корректную стоимость');
      return;
    }

    // Проверка наличия хотя бы одного сотрудника
    if (formData.employeeIds.length === 0) {
      toast.error('Выберите хотя бы одного сотрудника');
      return;
    }

    setLoading(true);

    try {
      // Подготовка данных записи
      let paymentMethod = { ...formData.paymentMethod };

      // Убедимся, что для типов 'cash' и 'card' не передаются ненужные поля organizationId и organizationName
      if (paymentMethod.type === 'cash' || paymentMethod.type === 'card') {
        paymentMethod = {
          type: paymentMethod.type,
        };
      }

      // Проверка необходимых данных для способа оплаты "organization"
      if (paymentMethod.type === 'organization' && !paymentMethod.organizationId) {
        toast.error('Выберите организацию для оплаты');
        setLoading(false);
        return;
      }

      // Создаем новую запись о мойке с корректной структурой
      const newRecord: Omit<CarWashRecord, 'id'> = {
        date: selectedDate,
        time: formData.time,
        carInfo: formData.carInfo,
        service: formData.service,
        price,
        paymentMethod,
        employeeIds: formData.employeeIds
      };

      console.log('Отправляем данные записи:', JSON.stringify(newRecord));

      // Добавляем запись в базу данных
      const addedRecord = await carWashService.add(newRecord);

      if (addedRecord) {
        console.log('Запись успешно добавлена с ID:', addedRecord.id);

        // Добавляем запись в отчет
        const success = await dailyReportService.addRecord(selectedDate, addedRecord);

        if (success) {
          // Обновляем локальное состояние
          dispatch({
            type: 'ADD_CAR_WASH_RECORD',
            payload: {
              date: selectedDate,
              record: addedRecord
            }
          });

          // Если запись была создана из существующей записи на мойку,
          // обновляем статус записи на "completed"
          if (prefilledData) {
            try {
              const updatedAppointment: Appointment = {
                ...prefilledData,
                status: 'completed'
              };

              const success = await appointmentService.update(updatedAppointment);

              if (success) {
                // Обновляем состояние
                dispatch({
                  type: 'UPDATE_APPOINTMENT',
                  payload: updatedAppointment
                });

                // Отправляем событие, чтобы уведомить виджет об изменении
                // Создаем пользовательское событие для обновления виджета
                const appointmentUpdatedEvent = new CustomEvent('appointmentCompleted', {
                  detail: { id: updatedAppointment.id }
                });
                document.dispatchEvent(appointmentUpdatedEvent);

                toast.success('Запись о мойке добавлена, запись отмечена как выполненная');
              }
            } catch (error) {
              console.error('Ошибка при обновлении статуса записи:', error);
              // Все равно показываем уведомление об успешном добавлении записи о мойке
              toast.success('Запись о мойке успешно добавлена');
            }
          } else {
            toast.success('Запись о мойке успешно добавлена');
          }

          // Закрываем модальное окно
          onClose();
        } else {
          toast.error('Запись добавлена, но не удалось обновить отчет');
          console.error('Ошибка при обновлении отчета');
        }
      } else {
        toast.error('Не удалось добавить запись');
        console.error('Ошибка: addedRecord вернул null');
      }
    } catch (error) {
      console.error('Ошибка при добавлении записи:', error);
      toast.error('Произошла ошибка при добавлении записи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      clickPosition={clickPosition}
      className="max-w-lg"
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Добавить помытую машину</h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Время */}
            <div>
              <label htmlFor="time" className="block text-sm font-medium mb-1">
                Время
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Информация об авто */}
            <div>
              <label htmlFor="carInfo" className="block text-sm font-medium mb-1">
                Авто
              </label>
              <input
                type="text"
                id="carInfo"
                name="carInfo"
                value={formData.carInfo}
                onChange={handleChange}
                placeholder="Например: VW Polo, 1234 AB-7"
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Услуга */}
            <div>
              <label htmlFor="service" className="block text-sm font-medium mb-1">
                Услуга
              </label>
              <input
                type="text"
                id="service"
                name="service"
                value={formData.service}
                onChange={handleChange}
                placeholder="Например: Комплекс"
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Цена */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">
                Стоимость
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Оплата - новый дизайн с 3 опциями */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Оплата
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('cash')}
                  className={`px-3 py-2 border rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                    formData.paymentMethod.type === 'cash'
                      ? 'bg-primary text-white border-primary'
                      : 'border-input hover:bg-secondary/50'
                  }`}
                >
                  Наличные
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('card')}
                  className={`px-3 py-2 border rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                    formData.paymentMethod.type === 'card'
                      ? 'bg-primary text-white border-primary'
                      : 'border-input hover:bg-secondary/50'
                  }`}
                >
                  Карта
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('organization')}
                  className={`px-3 py-2 border rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                    formData.paymentMethod.type === 'organization'
                      ? 'bg-primary text-white border-primary'
                      : 'border-input hover:bg-secondary/50'
                  }`}
                >
                  Организация
                </button>
              </div>

              {/* Выбор организации */}
              {formData.paymentMethod.type === 'organization' && (
                <div className="mt-2">
                  <label htmlFor="organizationId" className="block text-sm font-medium mb-1">
                    Выберите организацию
                  </label>
                  <select
                    id="organizationId"
                    name="organizationId"
                    value={formData.paymentMethod.organizationId || ''}
                    onChange={handleOrganizationChange}
                    className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    required={formData.paymentMethod.type === 'organization'}
                  >
                    <option value="" disabled>Выберите организацию</option>
                    {state.organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {state.organizations.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Нет доступных организаций. Добавьте их в разделе настроек.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Выбор сотрудников */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Сотрудники, выполнившие работу
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-input rounded-xl">
                {state.employees.length > 0 ? (
                  // Сортируем сотрудников: сначала те, кто на смене, потом остальные
                  [...state.employees]
                    .sort((a, b) => {
                      const aOnShift = shiftEmployeeIds.includes(a.id);
                      const bOnShift = shiftEmployeeIds.includes(b.id);
                      if (aOnShift && !bOnShift) return -1;
                      if (!aOnShift && bOnShift) return 1;
                      return 0;
                    })
                    .map(employee => (
                    <div key={employee.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`employee-${employee.id}`}
                        name="employeeIds"
                        value={employee.id}
                        checked={formData.employeeIds.includes(employee.id)}
                        onChange={handleEmployeeChange}
                        className="rounded border-input text-primary focus:ring-ring"
                      />
                      <label
                        htmlFor={`employee-${employee.id}`}
                        className={`flex-1 flex items-center gap-2 text-sm ${shiftEmployeeIds.includes(employee.id) ? 'font-medium' : ''}`}
                      >
                        <span>{employee.name}</span>
                        {shiftEmployeeIds.includes(employee.id) && (
                          <span
                            className={`px-2 py-1 rounded text-xs text-white ${
                              employeeRoles[employee.id] === 'admin'
                                ? 'bg-green-500'
                                : employeeRoles[employee.id] === 'washer'
                                ? 'bg-blue-500'
                                : 'bg-gray-500'
                            }`}
                          >
                            {employeeRoles[employee.id] === 'admin' ? 'Админ' : employeeRoles[employee.id] === 'washer' ? 'Мойщик' : 'на смене'}
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    Нет доступных сотрудников. Добавьте их в разделе настроек.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input hover:bg-secondary/50 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// Компонент AppointmentsWidget
interface AppointmentsWidgetProps {
  onStartAppointment: (appointment: Appointment, event?: React.MouseEvent) => void;
  canCreateRecords: boolean;
}

const AppointmentsWidget: React.FC<AppointmentsWidgetProps> = ({ onStartAppointment, canCreateRecords }) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Загрузка записей на сегодня и завтра
  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      try {
        const todayTomorrowAppointments = await appointmentService.getTodayAndTomorrow();
        setAppointments(todayTomorrowAppointments);
      } catch (error) {
        console.error('Ошибка при загрузке записей:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();

    // Обновляем записи каждые 5 минут
    const interval = setInterval(loadAppointments, 5 * 60 * 1000);

    // Слушатель события завершения записи
    const handleAppointmentCompleted = (event: CustomEvent<{ id: string }>) => {
      setAppointments(currentAppointments =>
        currentAppointments.filter(app => app.id !== event.detail.id)
      );
    };

    // Добавляем слушатель события
    document.addEventListener('appointmentCompleted', handleAppointmentCompleted as EventListener);

    return () => {
      clearInterval(interval);
      document.removeEventListener('appointmentCompleted', handleAppointmentCompleted as EventListener);
    };
  }, []);

  // Группировка записей по дате
  const todayAppointments = appointments.filter(app => isToday(parseISO(app.date)));
  const tomorrowAppointments = appointments.filter(app => isTomorrow(parseISO(app.date)));

  // Обработка клика по иконке "Начать выполнение"
  const handleStartAppointment = (appointment: Appointment, event?: React.MouseEvent) => {
    if (!canCreateRecords) {
      toast.info('Сначала выберите работников и начните смену');
      return;
    }
    onStartAppointment(appointment, event);
  };

  // Обработка отметки о выполнении
  const handleCompleteAppointment = async (appointment: Appointment) => {
    if (!confirm('Отметить запись как выполненную?')) {
      return;
    }

    try {
      const updatedAppointment: Appointment = {
        ...appointment,
        status: 'completed'
      };

      const success = await appointmentService.update(updatedAppointment);

      if (success) {
        // Обновляем список записей
        setAppointments(appointments.map(app =>
          app.id === appointment.id ? updatedAppointment : app
        ));

        // Обновляем в глобальном состоянии
        dispatch({ type: 'UPDATE_APPOINTMENT', payload: updatedAppointment });

        toast.success('Запись отмечена как выполненная');
      } else {
        toast.error('Не удалось обновить статус записи');
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса записи:', error);
      toast.error('Произошла ошибка при обновлении статуса');
    }
  };

  // Обработка удаления записи
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      const success = await appointmentService.delete(id);

      if (success) {
        // Обновляем список записей
        setAppointments(appointments.filter(app => app.id !== id));

        // Обновляем в глобальном состоянии
        dispatch({ type: 'REMOVE_APPOINTMENT', payload: id });

        toast.success('Запись успешно удалена');
      } else {
        toast.error('Не удалось удалить запись');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      toast.error('Произошла ошибка при удалении записи');
    }
  };

  // Рендер записи - более компактный вариант
  const renderAppointment = (appointment: Appointment) => (
    <div key={appointment.id} className="py-1 px-2 border-b border-border/50 last:border-b-0 hover:bg-secondary/10">
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-xs">
            <span className="font-medium whitespace-nowrap">{appointment.time}</span>
            <span className="mx-1 text-muted-foreground">•</span>
            <span className="truncate">{appointment.carInfo}</span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {appointment.service}
          </div>
        </div>

        <div className="flex ml-1">
          {appointment.status === 'scheduled' && (
            <>
              <button
                onClick={(e) => handleStartAppointment(appointment, e)}
                className="p-0.5 rounded-md hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 disabled:opacity-50"
                title={canCreateRecords ? 'Начать выполнение' : 'Сначала выберите работников и начните смену'}
                disabled={!canCreateRecords}
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteAppointment(appointment.id)}
                className="p-0.5 rounded-md hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                title="Отменить запись"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="card-with-shadow overflow-hidden max-h-[calc(100vh-350px)]">
      <div className="flex items-center justify-between p-1.5 border-b border-border/60">
        <h3 className="text-sm font-medium">Записи на мойку</h3>
        <a
          href={canCreateRecords ? '/records' : '#'}
          onClick={(e) => { if (!canCreateRecords) { e.preventDefault(); toast.info('Сначала выберите работников и начните смену'); } }}
          className="text-xs flex items-center text-primary hover:underline"
          title={canCreateRecords ? undefined : 'Сначала выберите работников и начните смену'}
        >
          Все записи <ArrowRight className="w-3 h-3 ml-0.5" />
        </a>
      </div>

      <div className="overflow-y-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground">Загрузка записей...</span>
          </div>
        ) : (
          <>
            {(todayAppointments.length > 0 || tomorrowAppointments.length > 0) ? (
              <>
                {todayAppointments.length > 0 && (
                  <div className="mb-0.5">
                    <h4 className="text-xs font-medium px-2 py-0.5 bg-primary/5 border-l-2 border-primary">
                      Сегодня
                    </h4>
                    <div>
                      {todayAppointments.map(renderAppointment)}
                    </div>
                  </div>
                )}

                {tomorrowAppointments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium px-2 py-0.5 bg-secondary/10 border-l-2 border-secondary">
                      Завтра
                    </h4>
                    <div>
                      {tomorrowAppointments.map(renderAppointment)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-3 text-muted-foreground text-xs">
                <p>Нет предстоящих записей</p>
                <a
                  href={canCreateRecords ? '/records' : '#'}
                  onClick={(e) => { if (!canCreateRecords) { e.preventDefault(); toast.info('Сначала выберите работников и начните смену'); } }}
                  className="text-xs text-primary hover:underline inline-flex items-center mt-1"
                  title={canCreateRecords ? undefined : 'Сначала выберите работников и начните смену'}
                >
                  Создать запись <Plus className="w-2.5 h-2.5 ml-0.5" />
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Интерфейс модального окна детальной таблицы работника
interface EmployeeDetailModalProps {
  employeeId: string;
  onClose: () => void;
  currentReport: DailyReport | null;
  employees: Employee[];
  organizations: Organization[];
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employeeId,
  onClose,
  currentReport,
  employees,
  organizations
}) => {
  const employee = employees.find(emp => emp.id === employeeId);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CarWashRecord> | null>(null);

  if (!employee || !currentReport) {
    return null;
  }

  // Фильтруем записи для конкретного работника
  const employeeRecords = currentReport.records?.filter(record =>
    record.employeeIds.includes(employeeId)
  ) || [];

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = organizations.find(org => org.id === id);
    return organization ? organization.name : 'Неизвестная организация';
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (type: string, organizationId?: string): string => {
    if (type === 'cash') return 'Наличные';
    if (type === 'card') return 'Карта';
    if (type === 'organization' && organizationId) return getOrganizationName(organizationId);
    return 'Неизвестный';
  };

  // Функция для начала редактирования записи
  const startEditing = (record: CarWashRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      ...record,
    });
  };

  // Функция для отмены редактирования
  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditFormData(null);
  };

  // Общая сумма работника
  const totalEarnings = employeeRecords.reduce((sum, record) => sum + record.price, 0);

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-[98vw] max-h-[95vh]">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-card-foreground">Детали работы - {employee.name}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Всего машин:</span>
              <span className="font-semibold text-card-foreground">{employeeRecords.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Общая сумма:</span>
              <span className="font-semibold text-card-foreground">{totalEarnings.toFixed(2)} BYN</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full bg-card">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">№</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Время</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Авто</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Услуга</th>
                <th className="py-4 px-4 text-right text-sm font-semibold text-card-foreground">Стоимость</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Оплата</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Другие работники</th>
              </tr>
            </thead>
            <tbody>
              {employeeRecords.length > 0 ? (
                employeeRecords.map((record, index) => (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-4 text-card-foreground font-medium">{index + 1}</td>
                    <td className="py-4 px-4 text-card-foreground">{record.time}</td>
                    <td className="py-4 px-4 text-card-foreground">{record.carInfo}</td>
                    <td className="py-4 px-4 text-card-foreground">{record.service}</td>
                    <td className="py-4 px-4 text-right font-semibold text-card-foreground">{record.price.toFixed(2)} BYN</td>
                    <td className="py-4 px-4 text-card-foreground">
                      {getPaymentMethodDisplay(record.paymentMethod.type, record.paymentMethod.organizationId)}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {record.employeeIds
                        .filter(id => id !== employeeId)
                        .map(id => employees.find(emp => emp.id === id)?.name)
                        .filter(Boolean)
                        .join(', ') || 'Нет'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    У этого работника нет записей за выбранную дату.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

// Интерфейс модального окна ежедневной ведомости
interface DailyReportModalProps {
  onClose: () => void;
  currentReport: DailyReport | null;
  employees: Employee[];
  organizations: Organization[];
  selectedDate: string;
  onExport: () => void;
  isExporting: boolean;
  paymentFilter: 'all' | 'cash' | 'card' | 'organization';
  onPaymentFilterChange: (filter: 'all' | 'cash' | 'card' | 'organization') => void;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({
  onClose,
  currentReport,
  employees,
  organizations,
  selectedDate,
  onExport,
  isExporting,
  paymentFilter,
  onPaymentFilterChange
}) => {
  const { state, dispatch } = useAppContext();
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CarWashRecord> | null>(null);

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = organizations.find(org => org.id === id);
    return organization ? organization.name : 'Неизвестная организация';
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (type: string, organizationId?: string): string => {
    if (type === 'cash') return 'Наличные';
    if (type === 'card') return 'Карта';
    if (type === 'organization' && organizationId) return getOrganizationName(organizationId);
    return 'Неизвестный';
  };

  // Функция для начала редактирования записи
  const startEditing = (record: CarWashRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      ...record,
    });
  };

  // Функция для отмены редактирования
  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditFormData(null);
  };

  // Обработчик изменений в полях формы редактирования
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => {
      if (!prev) return prev;

      // Особая обработка для числовых значений
      if (name === 'price') {
        return { ...prev, [name]: Number.parseFloat(value) || 0 };
      }

      return { ...prev, [name]: value };
    });
  };

  // Обработчик изменения способа оплаты при редактировании
  const handleEditPaymentTypeChange = (type: 'cash' | 'card' | 'organization') => {
    setEditFormData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          type,
          organizationId: type === 'organization' ? prev.paymentMethod?.organizationId : undefined,
          organizationName: type === 'organization' ? prev.paymentMethod?.organizationName : undefined
        }
      };
    });
  };

  // Обработчик выбора организации при редактировании
  const handleEditOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(org => org.id === organizationId);

    setEditFormData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          ...prev.paymentMethod,
          type: 'organization',
          organizationId,
          organizationName: organization?.name
        }
      };
    });
  };

  // Обработчик выбора сотрудников при редактировании
  const handleEditEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setEditFormData(prev => {
      if (!prev) return prev;

      const currentEmployeeIds = prev.employeeIds || [];

      if (checked) {
        return {
          ...prev,
          employeeIds: [...currentEmployeeIds, value]
        };
      } else {
        return {
          ...prev,
          employeeIds: currentEmployeeIds.filter(id => id !== value)
        };
      }
    });
  };

  // Функция для сохранения изменений
  const saveRecordChanges = async () => {
    if (!editFormData || !editingRecordId) return;

    try {
      const record = {
        ...editFormData,
        id: editingRecordId
      } as CarWashRecord;

      // Обновляем запись в базе данных
      const updatedRecord = await carWashService.update(record);

      if (updatedRecord) {
        // Обновляем запись в отчете
        const updatedReport = {...currentReport};
        if (updatedReport && updatedReport.records) {
          updatedReport.records = updatedReport.records.map(rec =>
            rec.id === editingRecordId ? record : rec
          );

          // Пересчитываем итоги
          const totalCash = updatedReport.records.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'cash' ? rec.price : 0),
            0
          );

          const totalNonCash = updatedReport.records.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'card' ? rec.price : 0),
            0
          );

          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: 'SET_DAILY_REPORT',
            payload: { date: selectedDate, report: updatedReport }
          });
        }

        // Сбрасываем состояние редактирования
        cancelEditing();
        toast.success('Запись успешно обновлена');
      } else {
        toast.error('Не удалось обновить запись');
      }
    } catch (error) {
      console.error('Ошибка при обновлении записи:', error);
      toast.error('Произошла ошибка при обновлении записи');
    }
  };

  // Функция для удаления записи
  const deleteRecord = async (recordId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      const success = await carWashService.delete(recordId);

      if (success) {
        // Обновляем отчет
        const updatedReport = {...currentReport};
        if (updatedReport && updatedReport.records) {
          const updatedRecords = updatedReport.records.filter(rec => rec.id !== recordId);

          // Пересчитываем итоги
          const totalCash = updatedRecords.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'cash' ? rec.price : 0),
            0
          );

          const totalNonCash = updatedRecords.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === 'card' ? rec.price : 0),
            0
          );

          updatedReport.records = updatedRecords;
          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: 'SET_DAILY_REPORT',
            payload: { date: selectedDate, report: updatedReport }
          });
        }

        toast.success('Запись успешно удалена');
      } else {
        toast.error('Не удалось удалить запись');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      toast.error('Произошла ошибка при удалении записи');
    }
  };

  // Фильтрация записей по методу оплаты
  const filteredRecords = currentReport?.records?.filter(record => {
    if (paymentFilter === 'all') return true;
    return record.paymentMethod.type === paymentFilter;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Оверлей */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Модальное окно снизу */}
      <div className="relative w-full max-w-7xl bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[98vh] overflow-hidden border border-border">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-card-foreground">
              Ежедневная ведомость - {format(new Date(selectedDate), 'dd.MM.yyyy')}
            </h3>
            <div className="flex gap-3">
              <button
                onClick={onExport}
                disabled={isExporting || !currentReport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Экспорт...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Экспорт в Word
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Фильтры по методу оплаты */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => onPaymentFilterChange('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                paymentFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/50 hover:bg-secondary'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => onPaymentFilterChange('cash')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                paymentFilter === 'cash'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/50 hover:bg-secondary'
              }`}
            >
              Наличные
            </button>
            <button
              onClick={() => onPaymentFilterChange('card')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                paymentFilter === 'card'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/50 hover:bg-secondary'
              }`}
            >
              Карта
            </button>
            <button
              onClick={() => onPaymentFilterChange('organization')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                paymentFilter === 'organization'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/50 hover:bg-secondary'
              }`}
            >
              Безнал
            </button>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full bg-card">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">№</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Время</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Авто</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Услуга</th>
                  <th className="py-4 px-4 text-right text-sm font-semibold text-card-foreground">Стоимость</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Оплата</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Сотрудники</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-card-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => {
                    const isEditing = editingRecordId === record.id;

                    if (isEditing && editFormData) {
                      // Режим редактирования
                      return (
                        <tr key={record.id} className="border-b border-border bg-yellow-50 dark:bg-yellow-900/20">
                          <td className="py-4 px-4 text-card-foreground font-medium">{index + 1}</td>
                          <td className="py-4 px-4">
                            <input
                              type="time"
                              name="time"
                              value={editFormData.time || ''}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              name="carInfo"
                              value={editFormData.carInfo || ''}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              name="service"
                              value={editFormData.service || ''}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              name="price"
                              value={editFormData.price || 0}
                              onChange={handleEditFormChange}
                              step="0.01"
                              min="0"
                              className="w-full px-2 py-1 border border-input rounded text-sm text-right"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditPaymentTypeChange('cash')}
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === 'cash'
                                      ? 'bg-primary text-white'
                                      : 'bg-secondary'
                                  }`}
                                >
                                  Нал
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditPaymentTypeChange('card')}
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === 'card'
                                      ? 'bg-primary text-white'
                                      : 'bg-secondary'
                                  }`}
                                >
                                  Карта
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditPaymentTypeChange('organization')}
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === 'organization'
                                      ? 'bg-primary text-white'
                                      : 'bg-secondary'
                                  }`}
                                >
                                  Орг
                                </button>
                              </div>
                              {editFormData.paymentMethod?.type === 'organization' && (
                                <select
                                  value={editFormData.paymentMethod?.organizationId || ''}
                                  onChange={handleEditOrganizationChange}
                                  className="w-full px-2 py-1 border border-input rounded text-xs"
                                >
                                  <option value="">Выберите организацию</option>
                                  {state.organizations.map(org => (
                                    <option key={org.id} value={org.id}>
                                      {org.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {employees.map(emp => (
                                <label key={emp.id} className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    value={emp.id}
                                    checked={editFormData.employeeIds?.includes(emp.id) || false}
                                    onChange={handleEditEmployeeChange}
                                    className="w-3 h-3"
                                  />
                                  <span className="truncate">{emp.name}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={saveRecordChanges}
                                className="p-1 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                title="Сохранить"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                title="Отмена"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Обычный режим просмотра
                    return (
                      <tr key={record.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-4 text-card-foreground font-medium">{index + 1}</td>
                        <td className="py-4 px-4 text-card-foreground">{record.time}</td>
                        <td className="py-4 px-4 text-card-foreground">{record.carInfo}</td>
                        <td className="py-4 px-4 text-card-foreground">{record.service}</td>
                        <td className="py-4 px-4 text-right font-semibold text-card-foreground">{record.price.toFixed(2)} BYN</td>
                        <td className="py-4 px-4 text-card-foreground">
                          {getPaymentMethodDisplay(record.paymentMethod.type, record.paymentMethod.organizationId)}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {record.employeeIds
                            .map(id => employees.find(emp => emp.id === id)?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditing(record)}
                              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                              title="Редактировать"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-2 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      {paymentFilter === 'all'
                        ? 'За выбранную дату нет записей.'
                        : `Нет записей с выбранным методом оплаты.`
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Итоги - компактный дизайн */}
          {currentReport && (
            <div className="mt-4 pt-4 border-t border-border bg-muted/5 -mx-6 px-6 pb-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                  className={`text-center p-3 rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === 'cash'
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => onPaymentFilterChange(paymentFilter === 'cash' ? 'all' : 'cash')}
                  title="Нажмите для фильтрации по наличным"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">Наличные</div>
                  <div className="text-lg font-bold text-card-foreground">{currentReport.totalCash.toFixed(2)} BYN</div>
                </div>
                <div
                  className={`text-center p-3 rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === 'card'
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => onPaymentFilterChange(paymentFilter === 'card' ? 'all' : 'card')}
                  title="Нажмите для фильтрации по картам"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">Карта</div>
                  <div className="text-lg font-bold text-card-foreground">{currentReport.totalNonCash.toFixed(2)} BYN</div>
                </div>
                <div
                  className={`text-center p-3 rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === 'organization'
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => onPaymentFilterChange(paymentFilter === 'organization' ? 'all' : 'organization')}
                  title="Нажмите для фильтрации по безналу"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">Безнал</div>
                  <div className="text-lg font-bold text-card-foreground">
                    {(() => {
                      const orgSum = currentReport.records?.reduce((sum, record) => {
                        return sum + (record.paymentMethod.type === 'organization' ? record.price : 0);
                      }, 0) || 0;
                      return orgSum.toFixed(2);
                    })()} BYN
                  </div>
                </div>
                <div
                  className={`text-center p-3 rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === 'all'
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => onPaymentFilterChange('all')}
                  title="Показать все записи"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">Всего</div>
                  <div className="text-lg font-bold text-primary">
                    {(() => {
                      const totalRevenue = currentReport.records?.reduce((sum, record) => {
                        return sum + record.price;
                      }, 0) || 0;
                      return totalRevenue.toFixed(2);
                    })()} BYN
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
