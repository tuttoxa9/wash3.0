import { ru } from "date-fns/locale";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { createSalaryCalculator } from "@/components/SalaryCalculator";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import {
  appointmentService,
  carWashService,
  dailyReportService,
  dailyRolesService,
} from "@/lib/services/supabaseService";
import type {
  Appointment,
  CarWashRecord,
  DailyReport,
  Employee,
  EmployeeRole,
} from "@/lib/types";
import { generateDailyReportDocx } from "@/lib/utils";
import { Packer } from "docx";
import { saveAs } from "file-saver";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  Edit,
  Eye,
  FileDown,
  Loader2,
  Plus,
  Receipt,
  Save,
  Trash2,
  User,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const HomePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState({
    dailyReport: true,
    employees: true,
    exporting: false,
    savingShift: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftEmployees, setShiftEmployees] = useState<string[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<
    Record<string, EmployeeRole>
  >({});
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [isEditingShift, setIsEditingShift] = useState(false);

  // Состояния для анимации открытия смены
  const [shiftOpeningStage, setShiftOpeningStage] = useState<
    "idle" | "loading" | "success" | "expanding" | "done"
  >("idle");

  const [selectedDate, setSelectedDate] = useState(state.currentDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Add ref for shift section scroll
  const shiftSectionRef = useRef<HTMLDivElement>(null);

  // Добавляем состояние для подсветки блока выбора сотрудников
  const [isShiftSectionHighlighted, setIsShiftSectionHighlighted] =
    useState(false);

  // Smooth scroll to shift selection with highlight
  const scrollToShift = () => {
    if (shiftSectionRef.current) {
      // Подсвечиваем блок
      setIsShiftSectionHighlighted(true);

      // Убираем подсветку через 1 секунду
      setTimeout(() => {
        setIsShiftSectionHighlighted(false);
      }, 1000);

      // Проверяем, является ли это мобильным устройством
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // На мобильных устройствах делаем скролл
        const y =
          shiftSectionRef.current.getBoundingClientRect().top +
          window.scrollY -
          16;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  };

  // Состояния для модальных окон
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [dailyReportModalOpen, setDailyReportModalOpen] = useState(false);

  // Добавим состояние и обработчики для предзаполнения данных из записи
  const [appointmentToConvert, setAppointmentToConvert] =
    useState<Appointment | null>(null);
  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<
    string | null
  >(null);

  // Добавляем состояния для хранения позиции клика
  const [clickPosition, setClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Добавляем состояние для отслеживания редактируемой записи
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] =
    useState<Partial<CarWashRecord> | null>(null);

  // Добавляем состояние для фильтрации по методу оплаты
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "cash" | "card" | "organization" | "debt"
  >("all");

  // Состояние для долгов
  const [activeDebts, setActiveDebts] = useState<
    Array<{
      reportId: string;
      record: CarWashRecord;
      roles?: Record<string, EmployeeRole>;
    }>
  >([]);
  const [loadingDebts, setLoadingDebts] = useState(false);

  // Состояния для закрытия долга
  const [isCloseDebtModalOpen, setIsCloseDebtModalOpen] = useState(false);
  const [debtToClose, setDebtToClose] = useState<{
    reportId: string;
    recordId: string;
  } | null>(null);

  // Проверяем, является ли выбранная дата текущей
  const isCurrentDate = isToday(new Date(selectedDate));

  // Получаем текущий отчет и список сотрудников
  const currentReport = state.dailyReports[selectedDate] || null;
  const workingEmployees = currentReport?.employeeIds
    ? state.employees.filter((emp) =>
        currentReport.employeeIds.includes(emp.id),
      )
    : [];

  // Флаг: смена начата (есть работники в отчете)
  const shiftStarted = (currentReport?.employeeIds?.length || 0) > 0;

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = state.organizations.find((org) => org.id === id);
    return organization ? organization.name : "Неизвестная организация";
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (
    type: string,
    organizationId?: string,
  ): string => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId)
      return getOrganizationName(organizationId);
    return "Неизвестный";
  };

  // Функция для получения статистики работника
  const getEmployeeStats = (employeeId: string) => {
    if (!currentReport?.records) {
      return { carCount: 0, totalEarnings: 0 };
    }

    const employeeRecords = currentReport.records.filter((record) =>
      record.employeeIds.includes(employeeId),
    );

    const carCount = employeeRecords.length;
    const totalEarnings = employeeRecords.reduce(
      (sum, record) => sum + record.price,
      0,
    );

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
  const openAddRecordModalForEmployee = (
    employeeId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Предотвращаем открытие детального модального окна
    setPreselectedEmployeeId(employeeId);
    setClickPosition({ x: event.clientX, y: event.clientY });
    setIsModalOpen(true);
  };

  // Обработчик изменения даты через календарь
  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      const newDate = format(day, "yyyy-MM-dd");
      setSelectedDate(newDate);
      dispatch({ type: "SET_CURRENT_DATE", payload: newDate });
      setIsCalendarOpen(false);
    }
  };

  // Toggle calendar visibility
  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  // Format date for display
  const formattedDate = format(new Date(selectedDate), "dd.MM.yyyy");

  // Загрузка активных долгов
  const loadActiveDebts = async () => {
    setLoadingDebts(true);
    try {
      const reports = await dailyReportService.getActiveDebts();
      const debts: Array<{
        reportId: string;
        record: CarWashRecord;
        roles?: Record<string, EmployeeRole>;
      }> = [];

      reports.forEach((report) => {
        report.records.forEach((record) => {
          if (record.paymentMethod.type === "debt") {
            debts.push({
              reportId: report.id,
              record,
              roles: report.dailyEmployeeRoles,
            });
          }
        });
      });

      setActiveDebts(debts);
    } catch (error) {
      console.error("Error loading debts:", error);
    } finally {
      setLoadingDebts(false);
    }
  };

  // Инициировать закрытие долга (открыть модалку)
  const initiateCloseDebt = (
    reportId: string,
    recordId: string,
    event: React.MouseEvent,
  ) => {
    setClickPosition({ x: event.clientX, y: event.clientY });
    setDebtToClose({ reportId, recordId });
    setIsCloseDebtModalOpen(true);
  };

  // Закрытие долга
  const handleCloseDebt = async (paymentMethod: PaymentMethod) => {
    if (!debtToClose) return;

    const { reportId, recordId } = debtToClose;

    try {
      // Получаем оригинальный отчет
      const report = await dailyReportService.getByDate(reportId);
      if (!report) {
        toast.error("Отчет не найден");
        return;
      }

      // Обновляем запись
      const updatedRecords = report.records.map((rec) => {
        if (rec.id === recordId) {
          return {
            ...rec,
            paymentMethod,
          };
        }
        return rec;
      });

      // Пересчитываем итоги
      const totalCash = updatedRecords.reduce(
        (sum, rec) => sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
        0,
      );

      const totalNonCash = updatedRecords.reduce(
        (sum, rec) =>
          sum +
          (rec.paymentMethod.type === "card" ||
          rec.paymentMethod.type === "organization"
            ? rec.price
            : 0),
        0,
      );

      const updatedReport = {
        ...report,
        records: updatedRecords,
        totalCash,
        totalNonCash,
      };

      // Обновляем запись в таблице car_wash_records
      const recordToUpdate = updatedRecords.find((r) => r.id === recordId);
      if (recordToUpdate) {
        await carWashService.update(recordToUpdate);
      }

      const success = await dailyReportService.updateReport(updatedReport);
      if (success) {
        toast.success("Долг закрыт");
        loadActiveDebts();
        // Если закрываем долг за текущую выбранную дату, обновляем состояние
        if (reportId === selectedDate) {
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: reportId, report: updatedReport },
          });
        }
        setIsCloseDebtModalOpen(false);
        setDebtToClose(null);
      } else {
        toast.error("Не удалось закрыть долг");
      }
    } catch (error) {
      console.error("Error closing debt:", error);
      toast.error("Произошла ошибка при закрытии долга");
    }
  };

  // Функция для экспорта отчета в Word
  const exportToWord = async () => {
    if (!currentReport) {
      toast.error("Нет данных для экспорта");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, exporting: true }));

      // Создаем документ
      const doc = generateDailyReportDocx(
        currentReport,
        state.employees,
        selectedDate,
      );

      // Преобразуем в blob
      const blob = await Packer.toBlob(doc);

      // Сохраняем файл
      const fileName = `Ведомость_${format(new Date(selectedDate), "dd-MM-yyyy")}.docx`;
      saveAs(blob, fileName);

      toast.success("Документ успешно экспортирован");
    } catch (error) {
      console.error("Ошибка при экспорте документа:", error);
      toast.error("Ошибка при экспорте документа");
    } finally {
      setLoading((prev) => ({ ...prev, exporting: false }));
    }
  };

  // Обработчик выбора сотрудников для смены
  const handleEmployeeSelection = (employeeId: string) => {
    if (isShiftLocked && !isEditingShift) return;

    if (shiftEmployees.includes(employeeId)) {
      setShiftEmployees(shiftEmployees.filter((id) => id !== employeeId));
      // Удаляем роль сотрудника при удалении из смены
      const newRoles = { ...employeeRoles };
      delete newRoles[employeeId];
      setEmployeeRoles(newRoles);
    } else {
      setShiftEmployees([...shiftEmployees, employeeId]);
      // Устанавливаем роль по умолчанию как мойщик
      setEmployeeRoles({
        ...employeeRoles,
        [employeeId]: "washer",
      });
    }
  };

  // Обработчик изменения роли сотрудника
  const handleEmployeeRoleChange = (employeeId: string, role: EmployeeRole) => {
    setEmployeeRoles({
      ...employeeRoles,
      [employeeId]: role,
    });
  };

  // Начало смены - зафиксировать сотрудников
  const startShift = async () => {
    if (shiftEmployees.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника для смены");
      return;
    }

    // Запускаем процесс анимации открытия
    setShiftOpeningStage("loading");

    // Выполняем сохранение в фоне
    const savePromise = (async () => {
      try {
        setLoading((prev) => ({ ...prev, savingShift: true }));

        // Сохраняем ежедневные роли в базе данных
        const success = await dailyRolesService.saveDailyRoles(
          selectedDate,
          employeeRoles,
        );
        if (!success) {
          console.warn("Не удалось сохранить ежедневные роли, но продолжаем");
        }

        // Если отчет уже существует, обновляем сотрудников
        if (currentReport) {
          const updatedReport = {
            ...currentReport,
            employeeIds: shiftEmployees,
            dailyEmployeeRoles: employeeRoles,
          };

          // Сохраняем в базе данных
          await dailyReportService.updateReport(updatedReport);

          return { isNew: false, report: updatedReport };
        } else {
          // Создаем новый отчет
          const newReport: DailyReport = {
            id: selectedDate,
            date: selectedDate,
            employeeIds: shiftEmployees,
            records: [],
            totalCash: 0,
            totalNonCash: 0,
            dailyEmployeeRoles: employeeRoles,
          };

          await dailyReportService.updateReport(newReport);
          return { isNew: true, report: newReport };
        }
      } catch (error) {
        console.error("Ошибка при сохранении состава смены:", error);
        toast.error("Не удалось сохранить состав смены");
        setShiftOpeningStage("idle");
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, savingShift: false }));
      }
    })();

    // Искусственная задержка для анимации загрузки (минимум 1.5 секунды)
    const timerPromise = new Promise(resolve => setTimeout(resolve, 1500));

    // Ждем и сохранение, и таймер
    const [savedResult] = await Promise.all([savePromise, timerPromise]);

    if (savedResult) {
      // Переходим к этапу успешного сохранения (галочка)
      setShiftOpeningStage("success");

      // Ждем 1.5 секунды с галочкой
      setTimeout(() => {
        // Здесь мы ДОЛЖНЫ обновить стейт (shiftStarted станет true),
        // но мы переопределим рендер, чтобы анимация сработала плавно
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: savedResult.report },
        });

        setIsShiftLocked(true);
        setIsEditingShift(false);

        setShiftOpeningStage("expanding");

        // Переход в итоговое состояние после анимации растяжения
        setTimeout(() => {
          setShiftOpeningStage("done");
          toast.success("Состав смены и роли сотрудников сохранены");
        }, 800); // 800ms на CSS-анимацию
      }, 1500);
    }
  };

  // Функция для обработки преобразования записи в запись о помытой машине
  const handleAppointmentConversion = (
    appointment: Appointment,
    event?: React.MouseEvent,
  ) => {
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
  const handleEditFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      if (!prev) return prev;

      // Особая обработка для числовых значений
      if (name === "price") {
        return { ...prev, [name]: Number.parseFloat(value) || 0 };
      }

      return { ...prev, [name]: value };
    });
  };

  // Обработчик изменения способа оплаты при редактировании
  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization",
  ) => {
    setEditFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          type,
          organizationId:
            type === "organization"
              ? prev.paymentMethod?.organizationId
              : undefined,
          organizationName:
            type === "organization"
              ? prev.paymentMethod?.organizationName
              : undefined,
        },
      };
    });
  };

  // Обработчик выбора организации при редактировании
  const handleEditOrganizationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(
      (org) => org.id === organizationId,
    );

    setEditFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          ...prev.paymentMethod,
          type: "organization",
          organizationId,
          organizationName: organization?.name,
        },
      };
    });
  };

  // Обработчик выбора сотрудников при редактировании
  const handleEditEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setEditFormData((prev) => {
      if (!prev) return prev;

      const currentEmployeeIds = prev.employeeIds || [];

      if (checked) {
        return {
          ...prev,
          employeeIds: [...currentEmployeeIds, value],
        };
      }
      return {
        ...prev,
        employeeIds: currentEmployeeIds.filter((id) => id !== value),
      };
    });
  };

  // Функция для сохранения изменений
  const saveRecordChanges = async () => {
    if (!editFormData || !editingRecordId) return;

    try {
      const record = {
        ...editFormData,
        id: editingRecordId,
      } as CarWashRecord;

      // Обновляем запись в базе данных
      const updatedRecord = await carWashService.update(record);

      if (updatedRecord) {
        // Обновляем запись в отчете
        const updatedReport = { ...currentReport };
        if (updatedReport?.records) {
          updatedReport.records = updatedReport.records.map((rec) =>
            rec.id === editingRecordId ? record : rec,
          );

          // Пересчитываем итоги
          const totalCash = updatedReport.records.reduce(
            (sum, rec) =>
              sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedReport.records.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
          );

          // Также пересчитываем организации, хотя они не хранятся отдельно
          // totalOrganizations можно вычислить как totalRevenue - totalCash - totalNonCash

          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        // Сбрасываем состояние редактирования
        cancelEditing();
        toast.success("Запись успешно обновлена");
      } else {
        toast.error("Не удалось обновить запись");
      }
    } catch (error) {
      console.error("Ошибка при обновлении записи:", error);
      toast.error("Произошла ошибка при обновлении записи");
    }
  };

  // Функция для удаления записи
  const deleteRecord = async (recordId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) {
      return;
    }

    try {
      const success = await carWashService.delete(recordId);

      if (success) {
        // Обновляем отчет
        const updatedReport = { ...currentReport };
        if (updatedReport?.records) {
          const updatedRecords = updatedReport.records.filter(
            (rec) => rec.id !== recordId,
          );

          // Пересчитываем итоги
          const totalCash = updatedRecords.reduce(
            (sum, rec) =>
              sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedRecords.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
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
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        toast.success("Запись успешно удалена");
      } else {
        toast.error("Не удалось удалить запись");
      }
    } catch (error) {
      console.error("Ошибка при удалении записи:", error);
      toast.error("Произошла ошибка при удалении записи");
    }
  };

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading((prev) => ({ ...prev, dailyReport: true }));
      try {
        const report = await dailyReportService.getByDate(selectedDate);
        if (report) {
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report },
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
              const dailyRoles =
                await dailyRolesService.getDailyRoles(selectedDate);
              if (dailyRoles) {
                setEmployeeRoles(dailyRoles);
              } else {
                // Если ролей нет нигде, устанавливаем роли по умолчанию (мойщик)
                const defaultRoles: Record<string, EmployeeRole> = {};
                report.employeeIds.forEach((empId) => {
                  defaultRoles[empId] = "washer";
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
        console.error("Ошибка при загрузке отчета:", error);
        toast.error("Не удалось загрузить отчет");
      } finally {
        setLoading((prev) => ({ ...prev, dailyReport: false }));
      }
    };

    loadData();
    loadActiveDebts();
    // При изменении выбранной даты сбрасываем состояние смены
    setIsShiftLocked(false);
    setIsEditingShift(false);
    setShiftEmployees([]);
    setEmployeeRoles({});
  }, [selectedDate, dispatch]);

  // Handle clicks outside the calendar to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarRef]);


  // --- RENDERING SPLIT ---
  // If the shift hasn't started, we render the Morning Lobby (Pre-shift state)

  if (!shiftStarted) {
    return (
      <div className="min-h-[85dvh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 bg-background/50">

        {/* Header Section */}
        <div className="text-center mb-10 w-full max-w-2xl">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 text-primary mb-5 border border-primary/20 shadow-sm">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Открытие смены
          </h1>

          {/* Interactive Date Selector */}
          <div className="flex justify-center items-center gap-2 text-muted-foreground text-sm sm:text-base">
            <span>Дата смены:</span>
            <div className="relative">
              <button
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-foreground bg-card border border-border/50 hover:bg-accent/50 hover:border-border transition-colors shadow-sm"
              >
                {format(parseISO(selectedDate), "d MMMM yyyy", { locale: ru })}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Calendar Dropdown */}
              {isCalendarOpen && (
                <div
                  ref={calendarRef}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl border border-border z-50 p-3 animate-in slide-in-from-top-2 duration-200"
                >
                  <DayPicker
                    mode="single"
                    selected={parseISO(selectedDate)}
                    onSelect={(date) => {
                      if (date) {
                        const newDateStr = format(date, "yyyy-MM-dd");
                        if (newDateStr !== selectedDate) {
                          setSelectedDate(newDateStr);
                          dispatch({ type: "SET_CURRENT_DATE", payload: newDateStr });
                        }
                        setIsCalendarOpen(false);
                      }
                    }}
                    locale={ru}
                    modifiers={{
                      today: new Date(),
                    }}
                    modifiersStyles={{
                      today: { fontWeight: "bold", color: "var(--primary)" },
                    }}
                    className="bg-card rounded-xl border-none m-0"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md",
                      day_today: "text-primary font-bold bg-primary/10",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Employee & Role Selector */}
        <div className="w-full max-w-2xl bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              Сотрудники на смене
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              Выбрано: {shiftEmployees.length}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {state.employees.length === 0 ? (
                <p className="text-muted-foreground text-sm col-span-full text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border/50">
                  Сотрудники не найдены. Добавьте их в настройках.
                </p>
              ) : (
                state.employees.map((employee) => {
                  const isSelected = shiftEmployees.includes(employee.id);
                  const role = employeeRoles[employee.id] || "washer";

                  return (
                    <div
                      key={employee.id}
                      className={`relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "bg-background border-border hover:border-border/80 hover:bg-accent/5"
                      }`}
                    >
                      {/* Selection Toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary border-primary text-white" : "border-input bg-background"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => handleEmployeeSelection(employee.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {employee.name}
                          </p>
                        </div>
                      </label>

                      {/* Integrated Role Switcher (Reveals smoothly) */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSelected ? "max-h-12 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
                         <div className="flex items-center bg-background rounded-lg border border-border/40 p-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({ ...employeeRoles, [employee.id]: "washer" });
                              }}
                              className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                                role === "washer" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              Мойщик
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({ ...employeeRoles, [employee.id]: "admin" });
                              }}
                              className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                                role === "admin" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                              }`}
                            >
                              Админ
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Start Action */}
            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {shiftEmployees.length === 0 ? "Выберите хотя бы одного" : "Все готово к началу работы"}
              </span>
              <button
                onClick={startShift}
                disabled={shiftEmployees.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Начать смену
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Small Appointments Glance */}
        {state.appointments.filter(a => a.date === selectedDate).length > 0 && (
          <div className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Запланировано {state.appointments.filter(a => a.date === selectedDate).length} записей
          </div>
        )}
      </div>
    );
  }

  // --- START SHIFT (PRE-SHIFT) VIEW ---
  // Мы должны показывать пре-шифт вью, если смены НЕТ,
  // ИЛИ если смена уже есть в стейте, но анимация еще не дошла до done.
  const showPreShiftView = !shiftStarted || shiftOpeningStage !== "done";

  const isOpeningLoading = shiftOpeningStage === "loading";
  const isOpeningSuccess = shiftOpeningStage === "success";
  const isExpanding = shiftOpeningStage === "expanding";

  // Предстоящие записи (ближайшие 2 часа от текущего времени или от 09:00)
  const now = new Date();
  const currentHour = now.getHours();
  const startHour = Math.max(9, currentHour); // Не раньше 09:00
  const startMins = startHour === currentHour ? now.getMinutes() : 0;

  const upcomingAppointments = state.appointments
    .filter(app => {
      if (app.date !== selectedDate) return false;
      const [appHour, appMin] = app.time.split(':').map(Number);
      const appTotalMins = appHour * 60 + appMin;
      const startTotalMins = startHour * 60 + startMins;

      // В пределах ближайших 2 часов
      return appTotalMins >= startTotalMins && appTotalMins <= startTotalMins + 120;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const totalAppointmentsToday = state.appointments.filter(app => app.date === selectedDate).length;

  return (
    <div className="relative w-full h-full min-h-[80vh]">

      {/* ПРЕ-ШИФТ ВЬЮ (поверх дашборда при анимации) */}
      {showPreShiftView && (
        <div
          className={`absolute inset-0 z-40 flex items-center justify-center p-4 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isExpanding ? "opacity-0 scale-[1.05]" : "opacity-100 scale-100"
          } ${
            shiftStarted && !isExpanding && shiftOpeningStage !== "success" && shiftOpeningStage !== "loading" ? "hidden" : "" // скрываем если уже смена начата, но нет анимации (просто открыли страницу)
          }`}
          style={{
            pointerEvents: isExpanding ? "none" : "auto"
          }}
        >
          {/* Белый фон, который скрывает дашборд сзади до окончания анимации */}
          <div className="absolute inset-0 bg-background" />

          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-start justify-center relative z-10">

            {/* Главная карточка открытия смены */}
            <div className={`relative w-full max-w-2xl bg-card border border-border/40 rounded-3xl shadow-xl overflow-hidden z-10 transition-all duration-700 ${
              isExpanding ? "w-full max-w-full shadow-2xl scale-[1.02] border-transparent" : ""
            }`}>
              {/* Оверлей загрузки / успеха */}
              {(isOpeningLoading || isOpeningSuccess || isExpanding) && (
                <div className={`absolute inset-0 bg-card z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${
                  isExpanding ? "opacity-0" : "opacity-100"
                }`}>
                  {isOpeningLoading ? (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                      <Loader2 className="w-16 h-16 text-primary animate-spin" />
                      <span className="text-xl font-medium text-foreground">Открытие смены...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-green-500 animate-in fade-in zoom-in duration-300">
                      <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <Check className="w-10 h-10" />
                      </div>
                      <span className="text-xl font-medium">Смена открыта</span>
                    </div>
                  )}
                </div>
              )}

              <div className={`p-8 sm:p-10 flex flex-col items-center transition-opacity duration-300 ${isOpeningLoading || isOpeningSuccess || isExpanding ? "opacity-0" : "opacity-100"}`}>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>

                <h2 className="text-3xl font-bold text-foreground mb-4">Открытие смены</h2>

                <div className="flex items-center gap-3 mb-10 px-4 py-2 rounded-xl bg-muted/50 border border-border/40">
                  <span className="text-muted-foreground text-sm font-medium">Дата смены:</span>
                  <span className="text-foreground font-semibold">{format(parseISO(selectedDate), "d MMMM yyyy", { locale: ru })}</span>
                </div>

                <div className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">Сотрудники на смене</h3>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">Выбрано: {shiftEmployees.length}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {state.employees.map((employee) => {
                      const isSelected = shiftEmployees.includes(employee.id);
                      return (
                        <button
                          key={employee.id}
                          onClick={() => handleEmployeeSelection(employee.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/40 bg-card hover:border-border hover:bg-muted/20"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected ? "bg-primary border-primary text-white" : "border-input bg-background"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`font-medium text-sm sm:text-base ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {employee.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-border/40">
                    <span className="text-sm text-muted-foreground">Выберите хотя бы одного</span>
                    <button
                      onClick={startShift}
                      disabled={shiftEmployees.length === 0}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                    >
                      Начать смену
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Правая панель с записями (исчезает первой при расширении) */}
            <div className={`w-full lg:w-80 flex flex-col gap-4 transition-all duration-500 ${isExpanding ? "opacity-0 translate-x-10" : "opacity-100 translate-x-0"}`}>
              <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-md">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Ближайшие записи
                </h3>

                <div className="space-y-3 mb-6">
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map(app => (
                      <div key={app.id} className="p-3 rounded-xl bg-muted/30 border border-border/40 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-foreground">{app.time}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{app.service}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{app.clientName} {app.carModel ? `(${app.carModel})` : ""}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm bg-muted/10 rounded-xl border border-border/20">
                      На ближайшие 2 часа записей нет
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/40 text-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Всего на день: <span className="text-foreground font-bold">{totalAppointmentsToday}</span> записей
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ДАШБОРД (подложка, становится видимым когда пред-шифт исчезает) */}
      {(shiftStarted || isExpanding || shiftOpeningStage === "done") && (
        <div className={`space-y-4 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-0 ${
          isExpanding ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
        }`}>

      {/* Модальное окно закрытия долга */}
      {isCloseDebtModalOpen && debtToClose && (
        <CloseDebtModal
          onClose={() => {
            setIsCloseDebtModalOpen(false);
            setDebtToClose(null);
          }}
          onSubmit={handleCloseDebt}
          clickPosition={clickPosition}
          record={
            activeDebts.find((d) => d.record.id === debtToClose.recordId)
              ?.record
          }
          roles={
            activeDebts.find((d) => d.record.id === debtToClose.recordId)?.roles
          }
        />
      )}

      {/* Верхняя панель: Заголовок и Действия */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-4 sm:p-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground shrink-0">
            Главная страница
          </h2>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 border border-border/40 shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground hidden lg:inline">Дата:</span>

            <div className="relative" ref={calendarRef}>
              <div
                className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                onClick={toggleCalendar}
              >
                {formattedDate}
                <ChevronDown className="w-4 h-4 opacity-50" />
              </div>

              {isCalendarOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-card rounded-xl shadow-xl border border-border/40 p-3 backdrop-blur-sm min-w-[300px]">
                  <DayPicker
                    mode="single"
                    selected={new Date(selectedDate)}
                    onDayClick={handleDaySelect}
                    locale={ru}
                    modifiers={{
                      today: new Date(),
                    }}
                    modifiersStyles={{
                      today: { fontWeight: "bold", color: "var(--primary)" },
                    }}
                    className="bg-card rounded-xl border-none m-0"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md",
                      day_today: "text-primary font-bold bg-primary/10",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
          <button
            onClick={openDailyReportModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/40 hover:bg-muted/50 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Ежедневная ведомость</span>
            <span className="sm:hidden">Ведомость</span>
          </button>

          <button
            onClick={(e) => {
              setAppointmentToConvert(null);
              setPreselectedEmployeeId(null);
              toggleModal(e);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/40 hover:bg-muted/50 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Добавить услугу
          </button>
        </div>
      </div>

      {/* Основная сетка Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6">

        {/* Левая колонка (2/3 ширины) - Сотрудники */}
        <div className="xl:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold">Сотрудники</h3>
              </div>

              <button
                onClick={() => setIsEditingShift(!isEditingShift)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border/40"
              >
                <Edit className="w-4 h-4" />
                Изменить состав
              </button>
            </div>
            {loading.dailyReport ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-accent rounded-full animate-spin animation-delay-150" />
                </div>
                <p className="text-muted-foreground mt-4 font-medium">
                  Загрузка данных...
                </p>
              </div>
            ) : workingEmployees.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {workingEmployees.map((employee) => {
                  const stats = getEmployeeStats(employee.id);
                  const role = employeeRoles[employee.id] || "washer";

                  // Расчет заработной платы сотрудника
                  let dailySalary = 0;
                  let isManualSalary = false;

                  if (
                    currentReport?.manualSalaries?.[employee.id] !== undefined
                  ) {
                    dailySalary = currentReport.manualSalaries[employee.id];
                    isManualSalary = true;
                  } else if (
                    state.salaryCalculationMethod === "minimumWithPercentage" &&
                    currentReport?.records
                  ) {
                    // Построим карту флагов минималки из employeeRoles с ключами min_<id>
                    const minimumOverride = shiftEmployees.reduce<
                      Record<string, boolean>
                    >((acc, id) => {
                      const key = `min_${id}` as any;
                      // @ts-ignore
                      const val = (employeeRoles as any)[key];
                      acc[id] = val !== false; // по умолчанию true
                      return acc;
                    }, {});
                    const salaryCalculator = createSalaryCalculator(
                      state.minimumPaymentSettings,
                      currentReport.records,
                      employeeRoles,
                      state.employees,
                      minimumOverride,
                    );
                    const salaryResults = salaryCalculator.calculateSalaries();
                    const employeeSalary = salaryResults.find(
                      (result) => result.employeeId === employee.id,
                    );
                    dailySalary = employeeSalary
                      ? employeeSalary.calculatedSalary
                      : 0;
                  }

                  return (
                    <div
                      key={employee.id}
                      className={`relative group rounded-2xl p-5 cursor-pointer transition-all duration-200 border bg-background/50 flex flex-col gap-4 hover:border-primary/40 hover:shadow-lg hover:bg-card ${
                        loading.dailyReport ? "loading" : ""
                      } ${
                        isManualSalary
                          ? "border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                          : "border-border/40 shadow-sm"
                      }`}
                      onClick={() => openEmployeeModal(employee.id)}
                    >
                      {/* Верхняя часть: Имя, Роль, Кнопка + */}
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="flex flex-col min-w-0 flex-1">
                          <h4 className="font-bold text-base sm:text-lg text-foreground truncate mb-1.5" title={employee.name}>
                            {employee.name}
                          </h4>
                          <span
                            className={`w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              role === "admin"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {role === "admin" ? "Админ" : "Мойщик"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openAddRecordModalForEmployee(employee.id, e);
                          }}
                          className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                          title="Добавить запись для этого сотрудника"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Статистика: Машины и Сумма */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Машин
                          </span>
                          <span className="font-bold text-lg text-foreground">
                            {stats.carCount}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Сумма
                          </span>
                          <span className="font-bold text-lg text-foreground">
                            {stats.totalEarnings.toFixed(0)} BYN
                          </span>
                        </div>
                      </div>

                      {/* Зарплата */}
                      <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                          {(() => {
                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const currentTimeInMinutes =
                              currentHour * 60 + currentMinute;
                            const workStartMinutes = 9 * 60;
                            const workEndMinutes = 21 * 60;

                            if (currentTimeInMinutes < workStartMinutes || currentTimeInMinutes >= workEndMinutes) {
                              return "ЗП за смену";
                            } else {
                              const workedMinutes =
                                currentTimeInMinutes - workStartMinutes;
                              const workedHours = workedMinutes / 60;
                              return `ЗП за ${workedHours.toFixed(1)}ч`;
                            }
                          })()}
                        </span>
                        <span
                          className={`font-black text-lg ${
                            isManualSalary ? "text-orange-500" : "text-primary"
                          }`}
                        >
                          {dailySalary.toFixed(0)} BYN {isManualSalary && "*"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Интерфейс редактирования сотрудников для смены (только в режиме редактирования) */}
            {(isShiftLocked && isEditingShift) && (
              <div
                id="employees-section"
                ref={shiftSectionRef}
                className={`mt-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-card border border-border/40 shadow-sm transition-all duration-300 ${
                  isShiftSectionHighlighted
                    ? "ring-2 ring-primary/30 shadow-lg"
                    : ""
                }`}
              >
                <div className="mb-4">
                  <h4 className="text-base sm:text-lg font-semibold">
                    {isShiftLocked && isEditingShift
                      ? "Редактировать состав смены"
                      : "Состав смены"}
                  </h4>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {state.employees.map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => handleEmployeeSelection(employee.id)}
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border shadow-sm ${
                          shiftEmployees.includes(employee.id)
                            ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white border-sky-400/30 shadow-lg"
                            : "bg-gradient-to-r from-secondary/60 to-secondary/40 hover:from-secondary/80 hover:to-secondary/60 border-border/40"
                        }`}
                      >
                        {employee.name}
                      </button>
                    ))}
                  </div>

                  {/* Выбор ролей для выбранных сотрудников */}
                  {shiftEmployees.length > 0 &&
                    state.salaryCalculationMethod ===
                      "minimumWithPercentage" && (
                      <div className="p-3 sm:p-4 border border-border/40 rounded-lg sm:rounded-xl bg-gradient-to-r from-muted/20 to-muted/10 shadow-sm">
                        <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground">
                          Назначение ролей сотрудников:
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                          {shiftEmployees.map((employeeId) => {
                            const employee = state.employees.find(
                              (emp) => emp.id === employeeId,
                            );
                            if (!employee) return null;

                            return (
                              <div
                                key={employeeId}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-background/80 to-background/60 border border-border/30"
                              >
                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                  <span className="text-xs sm:text-sm font-medium flex-1 sm:flex-none">
                                    {employee.name}
                                  </span>
                                  {/* Кнопка удаления сотрудника из смены */}
                                  <button
                                    onClick={() =>
                                      handleEmployeeSelection(employeeId)
                                    }
                                    className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800 text-red-500"
                                    title="Удалить из смены"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                                  {/* Переключатель учета минималки */}
                                  <div
                                    className="flex items-center gap-3 p-2 rounded-xl border border-border/40 bg-background/50 cursor-pointer hover:bg-background/80 transition-colors"
                                    onClick={() => {
                                      const key = `min_${employeeId}` as any;
                                      const current =
                                        (employeeRoles as any)[key] !== false;
                                      const newRoles: any = {
                                        ...employeeRoles,
                                      };
                                      newRoles[key] = !current;
                                      setEmployeeRoles(newRoles);
                                    }}
                                  >
                                    <div
                                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${(employeeRoles as any)[`min_${employeeId}`] !== false ? "bg-primary border-primary text-white" : "border-input bg-background"}`}
                                    >
                                      {(employeeRoles as any)[
                                        `min_${employeeId}`
                                      ] !== false && (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    <span className="text-xs font-medium text-foreground">
                                      Минималка
                                    </span>
                                  </div>

                                  <div className="segmented-control min-w-[160px]">
                                    <button
                                      onClick={() =>
                                        handleEmployeeRoleChange(
                                          employeeId,
                                          "washer",
                                        )
                                      }
                                      className={
                                        employeeRoles[employeeId] === "washer"
                                          ? "active"
                                          : ""
                                      }
                                    >
                                      Мойщик
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleEmployeeRoleChange(
                                          employeeId,
                                          "admin",
                                        )
                                      }
                                      className={
                                        employeeRoles[employeeId] === "admin"
                                          ? "active"
                                          : ""
                                      }
                                    >
                                      Админ
                                    </button>
                                  </div>
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary/80 transition-all duration-200 disabled:opacity-50 text-sm font-semibold shadow-lg hover:shadow-xl border border-primary/30"
                >
                  {loading.savingShift ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {isEditingShift ? "Сохранить изменения" : "Начать смену"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Итоги */}
          {currentReport && shiftStarted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-4 md:mt-6">
              {/* Сводка по оплатам */}
              <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col h-full">
                <h3 className="text-xl font-bold text-foreground mb-6">Итого</h3>

                <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                  {/* Наличные */}
                  <div
                    className="flex flex-col p-4 rounded-xl border border-border/40 bg-muted/10 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all"
                    onClick={() => {
                      setPaymentFilter("cash");
                      openDailyReportModal();
                    }}
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Наличные
                    </span>
                    <span className="font-bold text-xl text-foreground">
                      {currentReport.totalCash.toFixed(2)} BYN
                    </span>
                  </div>

                  {/* Карта */}
                  <div
                    className="flex flex-col p-4 rounded-xl border border-border/40 bg-muted/10 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all"
                    onClick={() => {
                      setPaymentFilter("card");
                      openDailyReportModal();
                    }}
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Карта
                    </span>
                    <span className="font-bold text-xl text-foreground">
                      {(
                        currentReport.records?.reduce(
                          (sum, rec) =>
                            sum +
                            (rec.paymentMethod.type === "card" ? rec.price : 0),
                          0,
                        ) || 0
                      ).toFixed(2)}{" "}
                      BYN
                    </span>
                  </div>

                  {/* Безналичные */}
                  <div
                    className="flex flex-col p-4 rounded-xl border border-border/40 bg-muted/10 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all col-span-2 sm:col-span-1"
                    onClick={() => {
                      setPaymentFilter("organization");
                      openDailyReportModal();
                    }}
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Безналичные
                    </span>
                    <span className="font-bold text-xl text-foreground">
                      {(() => {
                        const orgsInTotal = state.organizationsInTotal || [];
                        const orgSum =
                          currentReport.records?.reduce((sum, record) => {
                            const isOrg =
                              record.paymentMethod.type === "organization";
                            const isSeparated =
                              record.paymentMethod.organizationId &&
                              orgsInTotal.includes(
                                record.paymentMethod.organizationId,
                              );
                            return sum + (isOrg && !isSeparated ? record.price : 0);
                          }, 0) || 0;
                        return orgSum.toFixed(2);
                      })()} BYN
                    </span>
                  </div>

                  {/* Организации (разделённые) */}
                  {state.organizationsInTotal?.map((orgId) => {
                    const org = state.organizations.find((o) => o.id === orgId);
                    if (!org) return null;
                    const sumForOrg =
                      currentReport.records?.reduce((sum, record) => {
                        return (
                          sum +
                          (record.paymentMethod.type === "organization" &&
                          record.paymentMethod.organizationId === orgId
                            ? record.price
                            : 0)
                        );
                      }, 0) || 0;

                    return (
                      <div
                        key={`total-org-${orgId}`}
                        className="flex flex-col p-4 rounded-xl border border-border/40 bg-muted/10 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all col-span-2 sm:col-span-1"
                        onClick={() => {
                          setPaymentFilter("organization");
                          openDailyReportModal();
                        }}
                      >
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 truncate" title={org.name}>
                          {org.name}
                        </span>
                        <span className="font-bold text-xl text-indigo-400">
                          {sumForOrg.toFixed(2)} BYN
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Всего */}
                <div
                  className="mt-auto p-5 rounded-xl border border-primary/20 bg-primary/5 flex justify-between items-center cursor-pointer hover:bg-primary/10 transition-all"
                  onClick={() => {
                    setPaymentFilter("all");
                    openDailyReportModal();
                  }}
                >
                  <span className="font-bold text-lg text-foreground">
                    Всего выручка
                  </span>
                  <span className="font-black text-2xl text-primary">
                    {(() => {
                      const totalRevenue =
                        currentReport.records?.reduce((sum, record) => {
                          return sum + record.price;
                        }, 0) || 0;
                      return totalRevenue.toFixed(2);
                    })()} BYN
                  </span>
                </div>
              </div>

              {/* Заработок сотрудников */}
              <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <h3 className="text-xl font-bold text-foreground">
                    Заработок
                  </h3>
                  <div className="relative group">
                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs cursor-help font-bold">
                      i
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 sm:w-64 p-3 bg-popover text-popover-foreground rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-border/40 z-50">
                      <p className="text-sm font-medium">
                        Расчет ЗП: минимальная оплата + процент с учетом ролей
                      </p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-4">
                  {(() => {
                    const methodToUse = state.salaryCalculationMethod;

                    if (
                      methodToUse === "minimumWithPercentage" &&
                      currentReport?.records
                    ) {
                      const minimumOverride = shiftEmployees.reduce<
                        Record<string, boolean>
                      >((acc, id) => {
                        const key = `min_${id}` as any;
                        const val = (employeeRoles as any)[key];
                        acc[id] = val !== false;
                        return acc;
                      }, {});

                      const salaryCalculator = createSalaryCalculator(
                        state.minimumPaymentSettings,
                        currentReport.records,
                        employeeRoles,
                        state.employees,
                        minimumOverride,
                      );

                      const calculatedResults =
                        salaryCalculator.calculateSalaries();
                      const salaryResults = calculatedResults.map((res) => {
                        const manualAmount =
                          currentReport.manualSalaries?.[res.employeeId];
                        return {
                          ...res,
                          calculatedSalary:
                            manualAmount !== undefined
                              ? manualAmount
                              : res.calculatedSalary,
                          isManual: manualAmount !== undefined,
                        };
                      });

                      const totalSalarySum = salaryResults.reduce(
                        (sum, res) => sum + res.calculatedSalary,
                        0,
                      );

                      return (
                        <>
                          {salaryResults.length > 0 && (
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-muted-foreground mb-3 pb-2 border-b border-border/40">
                                Индивидуальные зарплаты
                              </p>
                              <div className="space-y-3">
                                {salaryResults.map((result) => {
                                  const calculateHourlyRate = () => {
                                    const now = new Date();
                                    const currentHour = now.getHours();
                                    const currentMinute = now.getMinutes();
                                    const currentTimeInMinutes =
                                      currentHour * 60 + currentMinute;
                                    const workStartMinutes = 9 * 60;
                                    const workEndMinutes = 21 * 60;

                                    if (
                                      currentTimeInMinutes <
                                        workStartMinutes ||
                                      currentTimeInMinutes >= workEndMinutes
                                    ) {
                                      return result.calculatedSalary / 12;
                                    }

                                    const workedMinutes = Math.max(
                                      0,
                                      currentTimeInMinutes - workStartMinutes,
                                    );
                                    const workedHours = workedMinutes / 60;

                                    if (workedHours < 1) {
                                      return result.calculatedSalary / 12;
                                    }

                                    return (
                                      result.calculatedSalary / workedHours
                                    );
                                  };

                                  const hourlyRate = calculateHourlyRate();

                                  return (
                                    <div
                                      key={result.employeeId}
                                      className="flex justify-between items-center text-sm py-2"
                                    >
                                      <div className="flex flex-col min-w-0 pr-2">
                                        <span
                                          className={`font-semibold truncate ${
                                            result.isManual
                                              ? "text-orange-500"
                                              : "text-foreground"
                                          }`}
                                        >
                                          {result.employeeName}
                                          <span className="text-xs text-muted-foreground font-normal ml-1.5">
                                            ({result.role === "admin" ? "Админ" : "Мойщик"})
                                          </span>
                                          {result.isManual && " *"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {(() => {
                                            const now = new Date();
                                            const currentHour = now.getHours();
                                            const currentMinute =
                                              now.getMinutes();
                                            const currentTimeInMinutes =
                                              currentHour * 60 + currentMinute;
                                            const workStartMinutes = 9 * 60;
                                            const workEndMinutes = 21 * 60;

                                            if (
                                              currentTimeInMinutes <
                                                workStartMinutes ||
                                              currentTimeInMinutes >=
                                                workEndMinutes
                                            ) {
                                              return `${hourlyRate.toFixed(2)} BYN/час`;
                                            }

                                            const workedMinutes = Math.max(
                                              0,
                                              currentTimeInMinutes -
                                                workStartMinutes,
                                            );
                                            const workedHours =
                                              workedMinutes / 60;

                                            if (workedHours < 1) {
                                              return `${hourlyRate.toFixed(2)} BYN/час`;
                                            }

                                            return `${hourlyRate.toFixed(2)} BYN/час за ${workedHours.toFixed(1)}ч`;
                                          })()}
                                        </span>
                                      </div>
                                      <span
                                        className={`font-bold shrink-0 text-base ${
                                          result.isManual ? "text-orange-500" : "text-primary"
                                        }`}
                                      >
                                        {result.calculatedSalary.toFixed(2)}{" "}
                                        BYN
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-auto p-5 rounded-xl border border-border/40 bg-muted/10 flex justify-between items-center">
                            <span className="font-bold text-lg text-foreground">
                              Общая сумма
                            </span>
                            <span className="font-black text-2xl text-primary">
                              {totalSalarySum.toFixed(2)} BYN
                            </span>
                          </div>
                        </>
                      );
                    }

                    if (methodToUse === "none") {
                      return (
                        <div className="flex justify-between p-4 bg-muted/10 rounded-xl border border-border/40">
                          <span className="text-sm text-muted-foreground">Выберите метод расчета в настройках</span>
                          <span className="font-bold text-foreground">0.00 BYN</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex justify-between p-4 bg-muted/10 rounded-xl border border-border/40">
                        <span className="text-sm text-muted-foreground">Нет данных для расчета</span>
                        <span className="font-bold text-foreground">0.00 BYN</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Правая колонка с виджетами */}
        <div className="space-y-4 md:space-y-6">
          {/* Виджет "Записи на мойку" */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
            <AppointmentsWidget
              onStartAppointment={handleAppointmentConversion}
              canCreateRecords={shiftStarted}
            />
          </div>

          {/* Активные долги */}
          {activeDebts.length > 0 && (
            <div className="rounded-xl sm:rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden max-h-[400px] flex flex-col">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/40 bg-gradient-to-r from-red-500/10 to-red-500/5">
                <div className="flex items-center gap-2 sm:gap-3">

                  <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    Активные долги
                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                      {activeDebts.length}
                    </span>
                  </h3>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {activeDebts.map(({ reportId, record }) => (
                  <div
                    key={record.id}
                    className="py-2 px-3 border-b border-border/50 last:border-b-0 hover:bg-red-500/5 transition-colors"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                          <span className="font-bold text-red-600/80">
                            {format(parseISO(reportId), "dd.MM")}
                          </span>
                          <span className="font-medium truncate">
                            {record.carInfo}
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                          {record.service} •{" "}
                          <span className="font-bold text-foreground">
                            {record.price.toFixed(0)} BYN
                          </span>
                        </div>
                        {record.paymentMethod.comment && (
                          <div className="text-[9px] text-red-500 font-medium truncate italic leading-tight mt-0.5">
                            "{record.paymentMethod.comment}"
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) =>
                          initiateCloseDebt(reportId, record.id, e)
                        }
                        className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm shrink-0"
                        title="Закрыть долг"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна (перенесены вниз чтобы не ломать верстку) */}
      {/* Модальное окно для добавления записи */}
      {isModalOpen && (
        <AddCarWashModal
          onClose={toggleModal}
          selectedDate={selectedDate}
          prefilledData={appointmentToConvert}
          clickPosition={clickPosition}
          employeeRoles={employeeRoles}
          preselectedEmployeeId={preselectedEmployeeId}
        />
      )}

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
      )}
    </div>
  );
};

// Интерфейс модального окна для закрытия долга
interface CloseDebtModalProps {
  onClose: () => void;
  onSubmit: (paymentMethod: PaymentMethod) => Promise<void>;
  clickPosition?: { x: number; y: number } | null;
  record?: CarWashRecord;
  roles?: Record<string, EmployeeRole>;
}

const CloseDebtModal: React.FC<CloseDebtModalProps> = ({
  onClose,
  onSubmit,
  clickPosition,
  record,
  roles,
}) => {
  const { state } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<
    "cash" | "card" | "organization"
  >("cash");
  const [organizationId, setOrganizationId] = useState("");

  // Функция для расчета заработка сотрудника за эту конкретную запись
  const calculateEmployeeEarnings = (employeeId: string) => {
    if (!record) return 0;

    // Роль сотрудника в тот день (из параметров или по умолчанию washer)
    const role = roles?.[employeeId] || "washer";
    const numParticipants = record.employeeIds.length;

    // Доля выручки на одного участника
    const share = record.price / numParticipants;

    if (role === "admin") {
      const percentage =
        record.serviceType === "dryclean"
          ? state.minimumPaymentSettings.adminDrycleanPercentage
          : state.minimumPaymentSettings.adminCarWashPercentage;
      return share * (percentage / 100);
    }

    const percentage =
      record.serviceType === "dryclean"
        ? state.minimumPaymentSettings.percentageWasherDryclean
        : state.minimumPaymentSettings.percentageWasher;
    return share * (percentage / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const paymentMethod: PaymentMethod = {
      type: paymentType,
      organizationId:
        paymentType === "organization" ? organizationId : undefined,
      organizationName:
        paymentType === "organization"
          ? state.organizations.find((o) => o.id === organizationId)?.name
          : undefined,
    };

    if (paymentType === "organization" && !organizationId) {
      toast.error("Выберите организацию");
      setLoading(false);
      return;
    }

    await onSubmit(paymentMethod);
    setLoading(false);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      clickPosition={clickPosition}
      className="max-w-md"
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-3 text-foreground">Закрыть долг</h3>
        {record && (
          <div className="mb-5 space-y-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex justify-between items-start mb-1">
                <div className="text-sm font-bold text-foreground">
                  {record.carInfo}
                </div>
                <div className="text-[10px] font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                  {format(parseISO(record.date), "dd.MM.yyyy")} {record.time}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {record.service} •{" "}
                <span className="font-bold text-foreground">
                  {record.price.toFixed(2)} BYN
                </span>
              </div>

              <div className="pt-2 border-t border-border/40">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Работавшие сотрудники:
                </div>
                <div className="space-y-1">
                  {record.employeeIds.map((id) => {
                    const employee = state.employees.find((e) => e.id === id);
                    const earnings = calculateEmployeeEarnings(id);
                    const role = roles?.[id] || "washer";
                    return (
                      <div
                        key={id}
                        className="flex justify-between items-center text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground">
                            {employee?.name || "Неизвестный"}
                          </span>
                          <span
                            className={`text-[9px] px-1 rounded ${role === "admin" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {role === "admin" ? "Админ" : "Мойщик"}
                          </span>
                        </div>
                        <div className="font-medium text-primary">
                          +{earnings.toFixed(2)} BYN
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Способ оплаты
            </label>
            <div className="segmented-control">
              <button
                type="button"
                onClick={() => setPaymentType("cash")}
                className={paymentType === "cash" ? "active" : ""}
              >
                Наличные
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("card")}
                className={paymentType === "card" ? "active" : ""}
              >
                Карта
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("organization")}
                className={paymentType === "organization" ? "active" : ""}
              >
                Безнал
              </button>
            </div>
          </div>

          {paymentType === "organization" && (
            <div>
              <label
                htmlFor="orgSelect"
                className="block text-sm font-medium mb-1 text-foreground"
              >
                Организация
              </label>
              <select
                id="orgSelect"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-xl bg-background"
                required
              >
                <option value="">Выберите организацию</option>
                {state.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input hover:bg-muted transition-colors text-foreground"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Подтвердить"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
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

const AddCarWashModal: React.FC<AddCarWashModalProps> = ({
  onClose,
  selectedDate,
  prefilledData,
  clickPosition,
  employeeRoles,
  preselectedEmployeeId,
}) => {
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
        serviceType: "wash" as "wash" | "dryclean",
        price: 0, // Нужно указать цену
        paymentMethod: { type: "cash" } as PaymentMethod,
        employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [],
      };
    }

    return {
      time: format(new Date(), "HH:mm"),
      carInfo: "",
      service: "",
      serviceType: "wash" as "wash" | "dryclean",
      price: 0,
      paymentMethod: { type: "cash" } as PaymentMethod,
      employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [],
    };
  });

  // Обработка изменений в форме
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Обработка изменения способа оплаты
  const handlePaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt",
  ) => {
    setFormData({
      ...formData,
      paymentMethod: {
        type,
        organizationId:
          type === "organization"
            ? formData.paymentMethod.organizationId
            : undefined,
        organizationName:
          type === "organization"
            ? formData.paymentMethod.organizationName
            : undefined,
        comment: type === "debt" ? formData.paymentMethod.comment : undefined,
      },
    });
  };

  // Обработка изменений в выборе организации
  const handleOrganizationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(
      (org) => org.id === organizationId,
    );

    setFormData({
      ...formData,
      paymentMethod: {
        ...formData.paymentMethod,
        organizationId,
        organizationName: organization?.name,
      },
    });
  };

  // Обработка изменений в выборе сотрудников
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    if (checked) {
      setFormData({
        ...formData,
        employeeIds: [...formData.employeeIds, value],
      });
    } else {
      setFormData({
        ...formData,
        employeeIds: formData.employeeIds.filter((id) => id !== value),
      });
    }
  };

  // Функция для добавления записи в базу данных и отчет
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка валидности данных
    if (!formData.carInfo || !formData.service || !formData.time) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const price = Number.parseFloat(formData.price.toString());
    if (isNaN(price) || price <= 0) {
      toast.error("Укажите корректную стоимость");
      return;
    }

    // Проверка наличия хотя бы одного сотрудника
    if (formData.employeeIds.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    setLoading(true);

    try {
      // Подготовка данных записи
      let paymentMethod = { ...formData.paymentMethod };

      // Убедимся, что передаются только нужные поля для каждого типа оплаты
      if (paymentMethod.type === "cash" || paymentMethod.type === "card") {
        paymentMethod = {
          type: paymentMethod.type,
        };
      } else if (paymentMethod.type === "debt") {
        paymentMethod = {
          type: "debt",
          comment: paymentMethod.comment,
        };
      }

      // Проверка необходимых данных для способа оплаты "organization"
      if (
        paymentMethod.type === "organization" &&
        !paymentMethod.organizationId
      ) {
        toast.error("Выберите организацию для оплаты");
        setLoading(false);
        return;
      }

      // Создаем новую запись о мойке с корректной структурой
      const newRecord: Omit<CarWashRecord, "id"> = {
        date: selectedDate,
        time: formData.time,
        carInfo: formData.carInfo,
        service: formData.service,
        serviceType: formData.serviceType,
        price,
        paymentMethod,
        employeeIds: formData.employeeIds,
      };

      console.log("Отправляем данные записи:", JSON.stringify(newRecord));

      // Добавляем запись в базу данных
      const addedRecord = await carWashService.add(newRecord);

      if (addedRecord) {
        // Добавляем запись в отчет
        const success = await dailyReportService.addRecord(
          selectedDate,
          addedRecord,
        );

        if (success) {
          // Обновляем локальное состояние
          dispatch({
            type: "ADD_CAR_WASH_RECORD",
            payload: {
              date: selectedDate,
              record: addedRecord,
            },
          });

          // Если запись была создана из существующей записи на мойку,
          // обновляем статус записи на "completed"
          if (prefilledData) {
            try {
              const updatedAppointment: Appointment = {
                ...prefilledData,
                status: "completed",
              };

              const success =
                await appointmentService.update(updatedAppointment);

              if (success) {
                // Обновляем список записей
                setAppointments(
                  appointments.map((app) =>
                    app.id === appointment.id ? updatedAppointment : app,
                  ),
                );

                // Обновляем в глобальном состоянии
                dispatch({
                  type: "UPDATE_APPOINTMENT",
                  payload: updatedAppointment,
                });

                toast.success("Запись отмечена как выполненная");
              }
            } catch (error) {
              console.error("Ошибка при обновлении статуса записи:", error);
              // Все равно показываем уведомление об успешном добавлении записи о мойке
              toast.success("Запись о мойке успешно добавлена");
            }
          } else {
            toast.success("Запись о мойке успешно добавлена");
          }

          // Если создан долг, обновляем список долгов после небольшой задержки
          if (paymentMethod.type === "debt") {
            setTimeout(() => {
              loadActiveDebts();
            }, 500);
          }

          // Закрываем модальное окно
          onClose();
        } else {
          toast.error("Запись добавлена, но не удалось обновить отчет");
          console.error("Ошибка при обновлении отчета");
        }
      } else {
        toast.error("Не удалось добавить запись");
        console.error("Ошибка: addedRecord вернул null");
      }
    } catch (error) {
      console.error("Ошибка при добавлении записи:", error);
      toast.error("Произошла ошибка при добавлении записи");
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
        <h3 className="text-xl font-bold mb-4">Добавить услугу</h3>

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
              <label
                htmlFor="carInfo"
                className="block text-sm font-medium mb-1"
              >
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

            {/* Тип услуги */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Тип услуги
              </label>
              <div className="segmented-control mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, serviceType: "wash" })
                  }
                  className={formData.serviceType === "wash" ? "active" : ""}
                >
                  Мойка
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, serviceType: "dryclean" })
                  }
                  className={
                    formData.serviceType === "dryclean" ? "active" : ""
                  }
                >
                  Химчистка
                </button>
              </div>
            </div>

            {/* Услуга */}
            <div>
              <label
                htmlFor="service"
                className="block text-sm font-medium mb-1"
              >
                Услуга
              </label>
              <input
                type="text"
                id="service"
                name="service"
                list="services-list"
                value={formData.service}
                onChange={(e) => {
                  const val = e.target.value;
                  const service = state.services.find((s) => s.name === val);
                  if (service) {
                    setFormData((prev) => ({
                      ...prev,
                      service: val,
                      price: service.price,
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, service: val }));
                  }
                }}
                placeholder={
                  formData.serviceType === "wash"
                    ? "Например: Комплекс"
                    : "Например: Химчистка салона"
                }
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <datalist id="services-list">
                {state.services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.price} BYN
                  </option>
                ))}
              </datalist>
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
              <label className="block text-sm font-medium mb-2">Оплата</label>
              <div className="segmented-control mb-3">
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("cash")}
                  className={
                    formData.paymentMethod.type === "cash" ? "active" : ""
                  }
                >
                  Наличные
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("card")}
                  className={
                    formData.paymentMethod.type === "card" ? "active" : ""
                  }
                >
                  Карта
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("organization")}
                  className={
                    formData.paymentMethod.type === "organization"
                      ? "active"
                      : ""
                  }
                >
                  Безнал
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("debt")}
                  className={
                    formData.paymentMethod.type === "debt" ? "active" : ""
                  }
                >
                  Долг
                </button>
              </div>

              {/* Комментарий для долга */}
              {formData.paymentMethod.type === "debt" && (
                <div className="mt-2">
                  <label
                    htmlFor="comment"
                    className="block text-sm font-medium mb-1"
                  >
                    Кто должен / Комментарий
                  </label>
                  <input
                    type="text"
                    id="comment"
                    value={formData.paymentMethod.comment || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: {
                          ...formData.paymentMethod,
                          comment: e.target.value,
                        },
                      })
                    }
                    placeholder="Имя клиента, телефон"
                    className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    required={formData.paymentMethod.type === "debt"}
                  />
                </div>
              )}

              {/* Выбор организации */}
              {formData.paymentMethod.type === "organization" && (
                <div className="mt-2">
                  <label
                    htmlFor="organizationId"
                    className="block text-sm font-medium mb-1"
                  >
                    Выберите организацию
                  </label>
                  <select
                    id="organizationId"
                    name="organizationId"
                    value={formData.paymentMethod.organizationId || ""}
                    onChange={handleOrganizationChange}
                    className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    required={formData.paymentMethod.type === "organization"}
                  >
                    <option value="" disabled>
                      Выберите организацию
                    </option>
                    {state.organizations.map((org) => (
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
                    .map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-2"
                      >
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
                          className={`flex-1 flex items-center gap-2 text-sm ${shiftEmployeeIds.includes(employee.id) ? "font-medium" : ""}`}
                        >
                          <span>{employee.name}</span>
                          {shiftEmployeeIds.includes(employee.id) && (
                            <span
                              className={`px-2 py-1 rounded text-xs text-white ${
                                employeeRoles[employee.id] === "admin"
                                  ? "bg-green-500"
                                  : employeeRoles[employee.id] === "washer"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                              }`}
                            >
                              {employeeRoles[employee.id] === "admin"
                                ? "Админ"
                                : employeeRoles[employee.id] === "washer"
                                  ? "Мойщик"
                                  : "на смене"}
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
                "Сохранить"
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
  onStartAppointment: (
    appointment: Appointment,
    event?: React.MouseEvent,
  ) => void;
  canCreateRecords: boolean;
}

const AppointmentsWidget: React.FC<AppointmentsWidgetProps> = ({
  onStartAppointment,
  canCreateRecords,
}) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Загрузка записей на сегодня и завтра
  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      try {
        const todayTomorrowAppointments =
          await appointmentService.getTodayAndTomorrow();
        setAppointments(todayTomorrowAppointments);
      } catch (error) {
        console.error("Ошибка при загрузке записей:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();

    // Обновляем записи каждые 5 минут
    const interval = setInterval(loadAppointments, 5 * 60 * 1000);

    // Слушатель события завершения записи
    const handleAppointmentCompleted = (event: CustomEvent<{ id: string }>) => {
      setAppointments((currentAppointments) =>
        currentAppointments.filter((app) => app.id !== event.detail.id),
      );
    };

    // Добавляем слушатель события
    document.addEventListener(
      "appointmentCompleted",
      handleAppointmentCompleted as EventListener,
    );

    return () => {
      clearInterval(interval);
      document.removeEventListener(
        "appointmentCompleted",
        handleAppointmentCompleted as EventListener,
      );
    };
  }, []);

  // Группировка записей по дате
  const todayAppointments = appointments.filter((app) =>
    isToday(parseISO(app.date)),
  );
  const tomorrowAppointments = appointments.filter((app) =>
    isTomorrow(parseISO(app.date)),
  );

  // Обработка клика по иконке "Начать выполнение"
  const handleStartAppointment = (
    appointment: Appointment,
    event?: React.MouseEvent,
  ) => {
    if (!canCreateRecords) {
      toast.info("Сначала выберите работников и начните смену");
      return;
    }
    onStartAppointment(appointment, event);
  };

  // Обработка отметки о выполнении
  const handleCompleteAppointment = async (appointment: Appointment) => {
    if (!confirm("Отметить запись как выполненную?")) {
      return;
    }

    try {
      const updatedAppointment: Appointment = {
        ...appointment,
        status: "completed",
      };

      const success = await appointmentService.update(updatedAppointment);

      if (success) {
        // Обновляем список записей
        setAppointments(
          appointments.map((app) =>
            app.id === appointment.id ? updatedAppointment : app,
          ),
        );

        // Обновляем в глобальном состоянии
        dispatch({ type: "UPDATE_APPOINTMENT", payload: updatedAppointment });

        toast.success("Запись отмечена как выполненная");
      } else {
        toast.error("Не удалось обновить статус записи");
      }
    } catch (error) {
      console.error("Ошибка при обновлении статуса записи:", error);
      toast.error("Произошла ошибка при обновлении статуса");
    }
  };

  // Обработка удаления записи
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) {
      return;
    }

    try {
      const success = await appointmentService.delete(id);

      if (success) {
        // Обновляем список записей
        setAppointments(appointments.filter((app) => app.id !== id));

        // Обновляем в глобальном состоянии
        dispatch({ type: "REMOVE_APPOINTMENT", payload: id });

        toast.success("Запись успешно удалена");
      } else {
        toast.error("Не удалось удалить запись");
      }
    } catch (error) {
      console.error("Ошибка при удалении записи:", error);
      toast.error("Произошла ошибка при удалении записи");
    }
  };

  // Рендер записи - более компактный вариант
  const renderAppointment = (appointment: Appointment) => (
    <div
      key={appointment.id}
      className="py-1 sm:py-1.5 px-2 sm:px-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/10"
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-[10px] sm:text-xs">
            <span className="font-medium whitespace-nowrap">
              {appointment.time}
            </span>
            <span className="mx-0.5 sm:mx-1 text-muted-foreground">•</span>
            <span className="truncate">{appointment.carInfo}</span>
          </div>
          <div className="text-[9px] sm:text-xs text-muted-foreground truncate">
            {appointment.service}
          </div>
        </div>

        <div className="flex ml-0.5 sm:ml-1 gap-0.5">
          {appointment.status === "scheduled" && (
            <>
              <button
                onClick={(e) => handleStartAppointment(appointment, e)}
                className="p-0.5 sm:p-1 rounded hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 disabled:opacity-50"
                title={
                  canCreateRecords
                    ? "Начать выполнение"
                    : "Сначала выберите работников и начните смену"
                }
                disabled={!canCreateRecords}
              >
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteAppointment(appointment.id)}
                className="p-0.5 sm:p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                title="Отменить запись"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl sm:rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-350px)]">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="flex items-center gap-2 sm:gap-3">

          <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline">Записи на мойку</span>
            <span className="sm:hidden">Записи</span>
          </h3>
        </div>
        <a
          href={canCreateRecords ? "/records" : "#"}
          onClick={(e) => {
            if (!canCreateRecords) {
              e.preventDefault();
              toast.info("Сначала выберите работников и начните смену");
            }
          }}
          className={`text-[10px] sm:text-xs flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg font-medium transition-all duration-200 ${canCreateRecords ? "text-primary hover:bg-primary/10 border border-primary/20" : "pointer-events-none opacity-60"}`}
          title={
            canCreateRecords
              ? undefined
              : "Сначала выберите работников и начните смену"
          }
        >
          <span className="hidden sm:inline">Все записи</span>
          <span className="sm:hidden">Все</span>
          <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </a>
      </div>

      <div className="overflow-y-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-12">
            <div className="relative">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-transparent border-r-accent rounded-full animate-spin animation-delay-150" />
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 font-medium">
              Загрузка записей...
            </span>
          </div>
        ) : (
          <>
            {todayAppointments.length > 0 || tomorrowAppointments.length > 0 ? (
              <>
                {todayAppointments.length > 0 && (
                  <div className="mb-0.5">
                    <div>{todayAppointments.map(renderAppointment)}</div>
                  </div>
                )}

                {tomorrowAppointments.length > 0 && (
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 bg-secondary/10 border-l-2 border-secondary">
                      Завтра
                    </h4>
                    <div>{tomorrowAppointments.map(renderAppointment)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 sm:py-6 text-muted-foreground text-[10px] sm:text-xs px-2">
                <p>Нет предстоящих записей</p>
                <a
                  href={canCreateRecords ? "/records" : "#"}
                  onClick={(e) => {
                    if (!canCreateRecords) {
                      e.preventDefault();
                      toast.info("Сначала выберите работников и начните смену");
                    }
                  }}
                  className={`text-[10px] sm:text-xs text-primary hover:underline inline-flex items-center mt-1 ${!canCreateRecords ? "pointer-events-none opacity-60" : ""}`}
                  title={
                    canCreateRecords
                      ? undefined
                      : "Сначала выберите работников и начните смену"
                  }
                >
                  Создать запись{" "}
                  <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5 ml-0.5" />
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
  organizations,
}) => {
  const employee = employees.find((emp) => emp.id === employeeId);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] =
    useState<Partial<CarWashRecord> | null>(null);

  if (!employee || !currentReport) {
    return null;
  }

  // Фильтруем записи для конкретного работника
  const employeeRecords =
    currentReport.records?.filter((record) =>
      record.employeeIds.includes(employeeId),
    ) || [];

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = organizations.find((org) => org.id === id);
    return organization ? organization.name : "Неизвестная организация";
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (
    type: string,
    organizationId?: string,
  ): string => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId)
      return getOrganizationName(organizationId);
    return "Неизвестный";
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
  const totalEarnings = employeeRecords.reduce(
    (sum, record) => sum + record.price,
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Оверлей */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Модальное окно снизу */}
      <div className="relative w-full max-w-7xl bg-card rounded-t-xl sm:rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] sm:max-h-[98vh] lg:h-[75vh] lg:max-h-none overflow-hidden border border-border">
        <div className="p-3 sm:p-4 md:p-6 lg:flex lg:flex-col lg:h-full">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-card-foreground">
              Детали работы - {employee.name}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-muted rounded-md sm:rounded-lg transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Всего машин:
                </span>
                <span className="font-semibold text-card-foreground text-sm sm:text-base">
                  {employeeRecords.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Общая сумма:
                </span>
                <span className="font-semibold text-card-foreground text-sm sm:text-base">
                  {totalEarnings.toFixed(2)} BYN
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[75vh] sm:max-h-[75vh] lg:flex-1 lg:max-h-none lg:overflow-y-auto">
            <table className="w-full bg-card min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    №
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Время
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Авто
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Услуга
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Тип
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right text-xs sm:text-sm font-semibold text-card-foreground">
                    Стоимость
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Оплата
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Другие работники
                  </th>
                </tr>
              </thead>
              <tbody>
                {employeeRecords.length > 0 ? (
                  employeeRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground font-medium text-xs sm:text-sm">
                        {index + 1}
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                        {record.time}
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                        {record.carInfo}
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                        {record.service}
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                            record.serviceType === "dryclean"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {record.serviceType === "dryclean" ? "Хим" : "Мойка"}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right font-semibold text-card-foreground text-xs sm:text-sm">
                        {record.price.toFixed(2)} BYN
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                        {getPaymentMethodDisplay(
                          record.paymentMethod.type,
                          record.paymentMethod.organizationId,
                        )}
                      </td>
                      <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-[10px] sm:text-xs text-muted-foreground">
                        {record.employeeIds
                          .filter((id) => id !== employeeId)
                          .map(
                            (id) =>
                              employees.find((emp) => emp.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ") || "Нет"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 sm:py-12 text-center text-muted-foreground text-xs sm:text-sm"
                    >
                      У этого работника нет записей за выбранную дату.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
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
  paymentFilter: "all" | "cash" | "card" | "organization" | "debt";
  onPaymentFilterChange: (
    filter: "all" | "cash" | "card" | "organization" | "debt",
  ) => void;
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
  onPaymentFilterChange,
}) => {
  const { state, dispatch } = useAppContext();
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] =
    useState<Partial<CarWashRecord> | null>(null);

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = organizations.find((org) => org.id === id);
    return organization ? organization.name : "Неизвестная организация";
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (
    type: string,
    organizationId?: string,
  ): string => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId)
      return getOrganizationName(organizationId);
    return "Неизвестный";
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
  const handleEditFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      if (!prev) return prev;

      // Особая обработка для числовых значений
      if (name === "price") {
        return { ...prev, [name]: Number.parseFloat(value) || 0 };
      }

      return { ...prev, [name]: value };
    });
  };

  // Обработчик изменения способа оплаты при редактировании
  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt",
  ) => {
    setEditFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          type,
          organizationId:
            type === "organization"
              ? prev.paymentMethod?.organizationId
              : undefined,
          organizationName:
            type === "organization"
              ? prev.paymentMethod?.organizationName
              : undefined,
          comment: type === "debt" ? prev.paymentMethod?.comment : undefined,
        },
      };
    });
  };

  // Обработчик выбора организации при редактировании
  const handleEditOrganizationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(
      (org) => org.id === organizationId,
    );

    setEditFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          ...prev.paymentMethod,
          type: "organization",
          organizationId,
          organizationName: organization?.name,
        },
      };
    });
  };

  // Обработчик выбора сотрудников при редактировании
  const handleEditEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setEditFormData((prev) => {
      if (!prev) return prev;

      const currentEmployeeIds = prev.employeeIds || [];

      if (checked) {
        return {
          ...prev,
          employeeIds: [...currentEmployeeIds, value],
        };
      }
      return {
        ...prev,
        employeeIds: currentEmployeeIds.filter((id) => id !== value),
      };
    });
  };

  // Функция для сохранения изменений
  const saveRecordChanges = async () => {
    if (!editFormData || !editingRecordId) return;

    try {
      const record = {
        ...editFormData,
        id: editingRecordId,
      } as CarWashRecord;

      // Обновляем запись в базе данных
      const updatedRecord = await carWashService.update(record);

      if (updatedRecord) {
        // Обновляем запись в отчете
        const updatedReport = { ...currentReport };
        if (updatedReport?.records) {
          updatedReport.records = updatedReport.records.map((rec) =>
            rec.id === editingRecordId ? record : rec,
          );

          // Пересчитываем итоги
          const totalCash = updatedReport.records.reduce(
            (sum, rec) =>
              sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedReport.records.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
          );

          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        // Сбрасываем состояние редактирования
        cancelEditing();
        toast.success("Запись успешно обновлена");
      } else {
        toast.error("Не удалось обновить запись");
      }
    } catch (error) {
      console.error("Ошибка при обновлении записи:", error);
      toast.error("Произошла ошибка при обновлении записи");
    }
  };

  // Функция для удаления записи
  const deleteRecord = async (recordId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) {
      return;
    }

    try {
      const success = await carWashService.delete(recordId);

      if (success) {
        // Обновляем отчет
        const updatedReport = { ...currentReport };
        if (updatedReport?.records) {
          const updatedRecords = updatedReport.records.filter(
            (rec) => rec.id !== recordId,
          );

          // Пересчитываем итоги
          const totalCash = updatedRecords.reduce(
            (sum, rec) =>
              sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedRecords.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
          );

          updatedReport.records = updatedRecords;
          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        toast.success("Запись успешно удалена");
      } else {
        toast.error("Не удалось удалить запись");
      }
    } catch (error) {
      console.error("Ошибка при удалении записи:", error);
      toast.error("Произошла ошибка при удалении записи");
    }
  };

  // Фильтрация записей по методу оплаты
  const filteredRecords =
    currentReport?.records?.filter((record) => {
      if (paymentFilter === "all") return true;
      return record.paymentMethod.type === paymentFilter;
    }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Оверлей */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Модальное окно снизу */}
      <div className="relative w-full max-w-7xl bg-card rounded-t-xl sm:rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] sm:max-h-[98vh] lg:h-[75vh] lg:max-h-none overflow-hidden border border-border">
        <div className="p-3 sm:p-4 md:p-6 lg:flex lg:flex-col lg:h-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground">
              <span className="hidden sm:inline">Ежедневная ведомость - </span>
              <span className="sm:hidden">Ведомость - </span>
              {format(new Date(selectedDate), "dd.MM.yyyy")}
            </h3>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={onExport}
                disabled={isExporting || !currentReport}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-secondary text-secondary-foreground rounded-lg sm:rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">Экспорт...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Экспорт в Word</span>
                    <span className="sm:hidden">Word</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-muted rounded-md sm:rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Фильтры по методу оплаты */}
          <div className="segmented-control mb-4">
            <button
              onClick={() => onPaymentFilterChange("all")}
              className={paymentFilter === "all" ? "active" : ""}
            >
              Все
            </button>
            <button
              onClick={() => onPaymentFilterChange("cash")}
              className={paymentFilter === "cash" ? "active" : ""}
            >
              Наличные
            </button>
            <button
              onClick={() => onPaymentFilterChange("card")}
              className={paymentFilter === "card" ? "active" : ""}
            >
              Карта
            </button>
            <button
              onClick={() => onPaymentFilterChange("organization")}
              className={paymentFilter === "organization" ? "active" : ""}
            >
              Безнал
            </button>
            <button
              onClick={() => onPaymentFilterChange("debt")}
              className={paymentFilter === "debt" ? "active" : ""}
            >
              Долги
            </button>
          </div>

          {/* Десктопная версия таблицы */}
          <div className="hidden sm:block overflow-x-auto max-h-[75vh] lg:flex-1 lg:max-h-none lg:overflow-y-auto">
            <table className="w-full bg-card min-w-[800px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    №
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Время
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Авто
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Услуга
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Тип
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right text-xs sm:text-sm font-semibold text-card-foreground">
                    Стоимость
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Оплата
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Сотрудники
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => {
                    const isEditing = editingRecordId === record.id;

                    if (isEditing && editFormData) {
                      // Режим редактирования
                      return (
                        <tr
                          key={record.id}
                          className="border-b border-border bg-yellow-50 dark:bg-yellow-900/20"
                        >
                          <td className="py-4 px-4 text-card-foreground font-medium">
                            {index + 1}
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="time"
                              name="time"
                              value={editFormData.time || ""}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              name="carInfo"
                              value={editFormData.carInfo || ""}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              name="service"
                              value={editFormData.service || ""}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditFormData({
                                    ...editFormData,
                                    serviceType: "wash",
                                  })
                                }
                                className={`px-2 py-1 text-xs rounded ${
                                  editFormData.serviceType === "wash"
                                    ? "bg-blue-500 text-white"
                                    : "bg-secondary"
                                }`}
                              >
                                Мойка
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditFormData({
                                    ...editFormData,
                                    serviceType: "dryclean",
                                  })
                                }
                                className={`px-2 py-1 text-xs rounded ${
                                  editFormData.serviceType === "dryclean"
                                    ? "bg-purple-500 text-white"
                                    : "bg-secondary"
                                }`}
                              >
                                Хим
                              </button>
                            </div>
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
                                  onClick={() =>
                                    handleEditPaymentTypeChange("cash")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "cash"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Нал
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("card")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "card"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Карта
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("organization")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type ===
                                    "organization"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Орг
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("debt")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "debt"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Долг
                                </button>
                              </div>
                              {editFormData.paymentMethod?.type === "debt" && (
                                <input
                                  type="text"
                                  value={
                                    editFormData.paymentMethod?.comment || ""
                                  }
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      paymentMethod: {
                                        ...editFormData.paymentMethod,
                                        comment: e.target.value,
                                      } as any,
                                    })
                                  }
                                  placeholder="Комментарий"
                                  className="w-full px-2 py-1 border border-input rounded text-xs"
                                />
                              )}
                              {editFormData.paymentMethod?.type ===
                                "organization" && (
                                <select
                                  value={
                                    editFormData.paymentMethod
                                      ?.organizationId || ""
                                  }
                                  onChange={handleEditOrganizationChange}
                                  className="w-full px-2 py-1 border border-input rounded text-xs"
                                >
                                  <option value="">Выберите организацию</option>
                                  {state.organizations.map((org) => (
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
                              {employees.map((emp) => (
                                <label
                                  key={emp.id}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    value={emp.id}
                                    checked={
                                      editFormData.employeeIds?.includes(
                                        emp.id,
                                      ) || false
                                    }
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
                      <tr
                        key={record.id}
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground font-medium text-xs sm:text-sm">
                          {index + 1}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.time}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.carInfo}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.service}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4">
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                              record.serviceType === "dryclean"
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {record.serviceType === "dryclean"
                              ? "Хим"
                              : "Мойка"}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right font-semibold text-card-foreground text-xs sm:text-sm">
                          {record.price.toFixed(2)} BYN
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.paymentMethod.type === "debt" ? (
                            <span className="text-red-500 font-bold">
                              Долг{" "}
                              {record.paymentMethod.comment
                                ? `(${record.paymentMethod.comment})`
                                : ""}
                            </span>
                          ) : (
                            getPaymentMethodDisplay(
                              record.paymentMethod.type,
                              record.paymentMethod.organizationId,
                            )
                          )}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-[10px] sm:text-xs text-muted-foreground">
                          {record.employeeIds
                            .map(
                              (id) =>
                                employees.find((emp) => emp.id === id)?.name,
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => startEditing(record)}
                              className="p-1 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg hover:bg-secondary/50 transition-colors"
                              title="Редактировать"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-1 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {paymentFilter === "all"
                        ? "За выбранную дату нет записей."
                        : `Нет записей с выбранным методом оплаты.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Мобильная версия таблицы - компактная */}
          <div className="sm:hidden max-h-[70vh] overflow-y-auto p-2 space-y-2">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => {
                const isEditing = editingRecordId === record.id;

                if (isEditing && editFormData) {
                  // Режим редактирования для мобильных - компактный
                  return (
                    <div
                      key={record.id}
                      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-xs">
                          Ред. #{index + 1}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={saveRecordChanges}
                            className="p-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                            title="Сохранить"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Отмена"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block font-medium mb-0.5">
                            Время
                          </label>
                          <input
                            type="time"
                            name="time"
                            value={editFormData.time || ""}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-input rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-0.5">
                            Цена
                          </label>
                          <input
                            type="number"
                            name="price"
                            value={editFormData.price || 0}
                            onChange={handleEditFormChange}
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1 border border-input rounded text-xs"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="block font-medium mb-0.5">Авто</label>
                        <input
                          type="text"
                          name="carInfo"
                          value={editFormData.carInfo || ""}
                          onChange={handleEditFormChange}
                          className="w-full px-2 py-1 border border-input rounded text-xs"
                        />
                      </div>
                    </div>
                  );
                }

                // Компактный режим просмотра для мобильных
                return (
                  <div
                    key={record.id}
                    className="border border-border rounded-lg p-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-medium shrink-0">
                          {record.time}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                            record.serviceType === "dryclean"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                          }`}
                        >
                          {record.serviceType === "dryclean" ? "Х" : "М"}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-bold text-sm leading-tight">
                          {record.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground leading-none">
                          BYN
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs leading-tight">
                        <span className="font-medium">{record.carInfo}</span>
                        <span className="text-muted-foreground"> • </span>
                        <span className="text-muted-foreground">
                          {record.service}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        <span className="font-medium">Сотрудники: </span>
                        <span>
                          {record.employeeIds
                            .map(
                              (id) =>
                                employees.find((emp) => emp.id === id)?.name,
                            )
                            .filter(Boolean)
                            .join(", ") || "Не указано"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground truncate flex-1 min-w-0 pr-2">
                          {record.paymentMethod.type === "debt" ? (
                            <span className="text-red-500 font-bold uppercase tracking-tighter">
                              Долг{" "}
                              {record.paymentMethod.comment
                                ? `(${record.paymentMethod.comment})`
                                : ""}
                            </span>
                          ) : (
                            getPaymentMethodDisplay(
                              record.paymentMethod.type,
                              record.paymentMethod.organizationId,
                            )
                          )}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEditing(record)}
                            className="p-1 rounded hover:bg-secondary/50 transition-colors"
                            title="Редактировать"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                {paymentFilter === "all"
                  ? "За выбранную дату нет записей."
                  : `Нет записей с выбранным методом оплаты.`}
              </div>
            )}
          </div>

          {/* Итоги - компактный дизайн */}
          {currentReport && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border bg-muted/5 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pb-2">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "cash"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "cash" ? "all" : "cash",
                    )
                  }
                  title="Нажмите для фильтрации по наличным"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Наличные
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight break-words">
                    {currentReport.totalCash.toFixed(2)} BYN
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "card"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "card" ? "all" : "card",
                    )
                  }
                  title="Нажмите для фильтрации по картам"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Карта
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight break-words">
                    {(
                      currentReport.records?.reduce(
                        (sum, rec) =>
                          sum +
                          (rec.paymentMethod.type === "card" ? rec.price : 0),
                        0,
                      ) || 0
                    ).toFixed(2)}{" "}
                    BYN
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "organization"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "organization" ? "all" : "organization",
                    )
                  }
                  title="Нажмите для фильтрации по безналу"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Безнал
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight break-words">
                    {(() => {
                      const orgSum =
                        currentReport.records?.reduce((sum, record) => {
                          return (
                            sum +
                            (record.paymentMethod.type === "organization"
                              ? record.price
                              : 0)
                          );
                        }, 0) || 0;
                      return orgSum.toFixed(2);
                    })()} BYN
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "debt"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "debt" ? "all" : "debt",
                    )
                  }
                  title="Нажмите для фильтрации по долгам"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Долги
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-red-500 leading-tight break-words">
                    {(() => {
                      const debtSum =
                        currentReport.records?.reduce((sum, record) => {
                          return (
                            sum +
                            (record.paymentMethod.type === "debt"
                              ? record.price
                              : 0)
                          );
                        }, 0) || 0;
                      return debtSum.toFixed(2);
                    })()} BYN
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors col-span-2 lg:col-span-1 ${
                    paymentFilter === "all"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => onPaymentFilterChange("all")}
                  title="Показать все записи"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Всего
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-primary leading-tight break-words">
                    {(() => {
                      const totalRevenue =
                        currentReport.records?.reduce((sum, record) => {
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
