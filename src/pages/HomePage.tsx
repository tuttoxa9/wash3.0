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

  // Add ref for shift section scroll
  const shiftSectionRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to shift selection
  const scrollToShift = () => {
    if (shiftSectionRef.current) {
      const y = shiftSectionRef.current.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

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

          {/* Top actions enhancements */}
          <div className="flex flex-wrap gap-2 items-center">
            {!shiftStarted && (
              <span className="text-[10px] uppercase tracking-wide bg-muted/60 text-muted-foreground px-2 py-1 rounded-md border border-border">Заблокировано</span>
            )}
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
                if (!shiftStarted) { toast.info('Сначала выберите работников и начните смену'); return; }
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
        <div ref={shiftSectionRef} className="card-with-shadow p-3 sm:p-4">
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
                              if (!shiftStarted) { e.preventDefault(); e.stopPropagation(); toast.info('Сначала выберите работников и начните смену'); return; }
                              openAddRecordModalForEmployee(employee.id, e);
                            }}
                            disabled={!shiftStarted}
                            className="employee-avatar hover:bg-primary/20 transition-colors rounded-lg p-2 disabled:opacity-50 relative"
                            title={shiftStarted ? 'Добавить запись для этого сотрудника' : 'Сначала выберите работников и начните смену'}
                          >
                            {!shiftStarted && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border">Начните смену</span>
                            )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 relative">
              {!shiftStarted && (
                <div className="absolute inset-0 z-10 rounded-xl pointer-events-none">
                  <div className="absolute inset-0 bg-card/40 backdrop-blur-[1px] rounded-xl" />
                </div>
              )}
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

// ... rest of the file unchanged (AddCarWashModal, AppointmentsWidget, EmployeeDetailModal, DailyReportModal) ...

// Интерфейс модального окна для добавления записи
interface AddCarWashModalProps {
  onClose: () => void;
  selectedDate: string;
  prefilledData?: Appointment | null;
  clickPosition?: { x: number; y: number } | null;
  employeeRoles: Record<string, EmployeeRole>;
  preselectedEmployeeId?: string | null;
}

// ... rest of AddCarWashModal, AppointmentsWidget, EmployeeDetailModal, DailyReportModal unchanged ...

export default HomePage;
