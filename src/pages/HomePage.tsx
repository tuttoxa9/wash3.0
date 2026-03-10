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
import { generateDailyReportDocx, generateDailyReportCsv } from "@/lib/utils";
import type { PaymentMethod, Organization } from "@/lib/types";
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
  Shield,
  Trash2,
  User,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import AddCarWashModal from "@/components/Home/AddCarWashModal";
import AppointmentsWidget from "@/components/Home/AppointmentsWidget";
import CloseDebtModal from "@/components/Home/CloseDebtModal";
import DailyReportModal from "@/components/Home/DailyReportModal";
import EmployeeDetailModal from "@/components/Home/EmployeeDetailModal";
import { PreShiftScreen } from "@/components/Home/PreShiftScreen";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [selectedDate, setSelectedDate] = useState(state.currentDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Add ref for shift section scroll
  const shiftSectionRef = useRef<HTMLDivElement>(null);

  // Добавляем состояние для подсветки блока выбора сотрудников
  const [isShiftSectionHighlighted, setIsShiftSectionHighlighted] =
    useState(false);

  // Shift start animation state
  const [shiftPhase, setShiftPhase] = useState<"idle" | "starting" | "success" | "active" | "closing" | "closed">("idle");

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
    "all" | "cash" | "card" | "organization" | "debt" | "certificate"
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
    if (type === "certificate") return "Сертификат";
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

  const exportToCsv = () => {
    if (!currentReport) {
      toast.error("Нет данных для экспорта");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, exporting: true }));
      const csvString = generateDailyReportCsv(
        currentReport,
        state.employees,
        state.organizations,
        selectedDate
      );

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const fileName = `Ведомость_${format(new Date(selectedDate), "dd-MM-yyyy")}.csv`;
      saveAs(blob, fileName);
      toast.success("CSV успешно экспортирован");
    } catch (error) {
      console.error("Ошибка при экспорте CSV:", error);
      toast.error("Ошибка при экспорте CSV");
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
    // Логика закрытия смены
    if (shiftEmployees.length === 0 && isEditingShift) {
      setShiftPhase("closing");
      try {
        setLoading((prev) => ({ ...prev, savingShift: true }));

        if (currentReport) {
          const updatedReport = {
            ...currentReport,
            employeeIds: [],
            dailyEmployeeRoles: {},
          };

          await dailyReportService.updateReport(updatedReport);

          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        setTimeout(() => {
          setShiftPhase("closed");
          setLoading((prev) => ({ ...prev, savingShift: false }));

          setTimeout(() => {
            setIsShiftLocked(false);
            setIsEditingShift(false);
            setShiftPhase("idle");
            toast.success("Смена закрыта");
          }, 1500);
        }, 1500);
      } catch (error) {
        console.error("Ошибка при закрытии смены:", error);
        toast.error("Не удалось закрыть смену");
        setShiftPhase("active");
        setLoading((prev) => ({ ...prev, savingShift: false }));
      }
      return;
    }

    if (shiftEmployees.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника для смены");
      return;
    }

    if (!isEditingShift) {
      setShiftPhase("starting");
    }

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

        // Обновляем состояние
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: updatedReport },
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
          dailyEmployeeRoles: employeeRoles,
        };

        await dailyReportService.updateReport(newReport);
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: newReport },
        });
      }

      setIsShiftLocked(true);
      setIsEditingShift(false);

      if (!isEditingShift) {
        // Имитируем небольшую задержку загрузки (минимум 1.5 сек)
        setTimeout(() => {
          setShiftPhase("success");
          setLoading((prev) => ({ ...prev, savingShift: false }));

          // Галочка висит 1.5 сек, потом переходим к активной смене
          setTimeout(() => {
            setShiftPhase("active");
            toast.success("Смена успешно открыта");
          }, 1500);
        }, 1500);
      } else {
        setLoading((prev) => ({ ...prev, savingShift: false }));
        toast.success("Состав смены обновлен");
      }

    } catch (error) {
      console.error("Ошибка при сохранении состава смены:", error);
      toast.error("Не удалось сохранить состав смены");
      if (!isEditingShift) setShiftPhase("idle");
      setLoading((prev) => ({ ...prev, savingShift: false }));
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
    type: "cash" | "card" | "organization" | "debt" | "certificate",
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



  useEffect(() => {
    // В AppContext данные загружаются, как только они приходят, отключаем лоадер
    if (state.employees) {
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  }, [state.employees]);

  // --- RENDERING SPLIT ---
  // If the shift hasn't started, we render the Morning Lobby (Pre-shift state)

  // Окно начала смены и анимация перехода
  if ((!shiftStarted && !isEditingShift) || ["starting", "success", "closing", "closed"].includes(shiftPhase)) {
    // Получаем записи на ближайшие 2 часа для текущей даты
    const now = new Date();
    const isDateToday = selectedDate === format(now, "yyyy-MM-dd");

    // Определяем "текущее время" - если сегодня и до 9 утра, то считаем 9:00
    // Если после 9 утра - берем реальное текущее время
    let currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentTimeMinutes < 9 * 60) {
      currentTimeMinutes = 9 * 60; // 09:00
    }

    const upcomingAppointments = state.appointments
      .filter(app => {
        if (app.date !== selectedDate) return false;
        if (!isDateToday) return true; // Если смотрим будущую дату, показываем все за день

        const [hours, minutes] = app.time.split(":").map(Number);
        const appTimeMinutes = hours * 60 + minutes;

        // Показываем записи от "текущего времени" до +2 часов
        return appTimeMinutes >= currentTimeMinutes && appTimeMinutes <= currentTimeMinutes + 120;
      })
      .sort((a, b) => {
        const timeA = a.time.split(":").map(Number);
        const timeB = b.time.split(":").map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });

    const totalAppointmentsToday = state.appointments.filter(app => app.date === selectedDate).length;

    return (
      <AnimatePresence mode="wait">
        {shiftPhase === "idle" && (
          <motion.div
            key="preshift"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <PreShiftScreen
              selectedDate={selectedDate}
              isCalendarOpen={isCalendarOpen}
              setIsCalendarOpen={setIsCalendarOpen}
              calendarRef={calendarRef}
              handleDateSelect={(date) => {
                if (date) {
                  const newDateStr = format(date, "yyyy-MM-dd");
                  if (newDateStr !== selectedDate) {
                    setSelectedDate(newDateStr);
                    dispatch({ type: "SET_CURRENT_DATE", payload: newDateStr });
                  }
                  setIsCalendarOpen(false);
                }
              }}
              shiftSectionRef={shiftSectionRef}
              isShiftSectionHighlighted={isShiftSectionHighlighted}
              employees={state.employees}
              shiftEmployees={shiftEmployees}
              handleEmployeeSelection={handleEmployeeSelection}
              employeeRoles={employeeRoles}
              setEmployeeRoles={setEmployeeRoles}
              startShift={startShift}
              loading={loading}
              upcomingAppointments={upcomingAppointments}
              totalAppointmentsToday={totalAppointmentsToday}
            />
          </motion.div>
        )}

        {["starting", "success", "closing", "closed"].includes(shiftPhase) && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <motion.div
              className="bg-card min-w-[320px] rounded-3xl shadow-xl border border-border/50 flex flex-col items-center justify-center p-10 gap-6"
            >
              <AnimatePresence mode="wait">
                {shiftPhase === "starting" && (
                  <motion.div
                    key="spinner-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5 text-primary"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                    <span className="text-base font-medium text-foreground">Открытие смены...</span>
                  </motion.div>
                )}

                {shiftPhase === "success" && (
                  <motion.div
                    key="check-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                      <Check className="w-8 h-8" />
                    </div>
                    <span className="text-base font-medium text-foreground">Смена открыта</span>
                  </motion.div>
                )}

                {shiftPhase === "closing" && (
                  <motion.div
                    key="spinner-close"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5 text-destructive"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                    <span className="text-base font-medium text-foreground">Закрытие смены...</span>
                  </motion.div>
                )}

                {shiftPhase === "closed" && (
                  <motion.div
                    key="check-close"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Check className="w-8 h-8" />
                    </div>
                    <span className="text-base font-medium text-foreground">Смена закрыта</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // --- ACTIVE SHIFT VIEW ---
  return (
    <motion.div
      className="bg-card rounded-[2rem] p-4 sm:p-6 shadow-sm border border-border/50 min-h-[85dvh] flex flex-col gap-6"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >

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

      {/* Заголовок */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <h2 className="text-2xl font-bold text-foreground">
            Главная страница
          </h2>

          {/* Дата */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
              Дата:
            </span>
            <div className="relative" ref={calendarRef}>
              <div
                className="flex h-9 items-center rounded-lg border border-border/50 bg-card px-3 py-1.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={toggleCalendar}
              >
                <span className="flex-1 font-semibold">
                  {formattedDate}
                </span>
              </div>
              {isCalendarOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-card rounded-xl shadow-xl border border-border p-3 backdrop-blur-sm">
                  <DayPicker
                    mode="single"
                    selected={new Date(selectedDate)}
                    onDayClick={handleDaySelect}
                    locale={ru}
                    modifiers={{ today: new Date() }}
                    modifiersStyles={{ today: { fontWeight: "bold", color: "var(--primary)" } }}
                    className="bg-card rounded-xl border-none m-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <button
            onClick={
              shiftStarted
                ? openDailyReportModal
                : () =>
                    toast.info(
                      "Сначала выберите работников и начните смену",
                    )
            }
            disabled={!shiftStarted}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Ежедневная ведомость</span>
            <span className="sm:hidden">Ведомость</span>
          </button>
          <button
            onClick={(e) => {
              if (!shiftStarted) {
                toast.info("Сначала выберите работников и начните смену");
                return;
              }
              setAppointmentToConvert(null);
              setPreselectedEmployeeId(null);
              toggleModal(e);
            }}
            disabled={!shiftStarted}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить услугу</span>
            <span className="sm:hidden">Добавить</span>
          </button>
        </div>
      </div>

      {/* Основная секция */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="flex flex-col gap-6">
          {/* Сотрудники */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-bold">Сотрудники</h3>
              </div>

              {/* Кнопка изменить состав смены */}
              {shiftStarted && isShiftLocked && (
                <button
                  onClick={() => setIsEditingShift(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-accent transition-colors text-sm font-medium shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Изменить состав
                </button>
              )}
            </div>
            {loading.dailyReport ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[142px] w-full rounded-xl bg-muted/60" />
                ))}
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
                      className={`relative group rounded-xl p-4 cursor-pointer transition-all duration-200 border bg-background hover:bg-accent/5 w-full flex flex-col gap-3 ${
                        loading.dailyReport ? "loading" : ""
                      } ${
                        isManualSalary
                          ? "border-orange-400/50 shadow-sm"
                          : "border-border/50 shadow-sm hover:border-primary/30"
                      }`}
                      onClick={() => openEmployeeModal(employee.id)}
                    >
                      {/* Верхняя часть: Имя, Роль, Кнопка + */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex flex-col min-w-0 flex-1">
                          <h4 className="font-semibold text-base text-foreground truncate" title={employee.name}>
                            {employee.name}
                          </h4>
                          <span
                            className={`mt-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium border ${
                              role === "admin"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {role === "admin" ? "Админ" : "Мойщик"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            if (!shiftStarted) {
                              e.preventDefault();
                              e.stopPropagation();
                              toast.info(
                                "Сначала выберите работников и начните смену",
                              );
                              return;
                            }
                            openAddRecordModalForEmployee(employee.id, e);
                          }}
                          disabled={!shiftStarted}
                          className="shrink-0 p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 text-primary"
                          title={
                            shiftStarted
                              ? "Добавить запись для этого сотрудника"
                              : "Сначала выберите работников и начните смену"
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Статистика: Машины и Сумма */}
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                            Машин
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-card-foreground">
                            {stats.carCount}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-border/40" />
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                            Сумма
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-card-foreground">
                            {stats.totalEarnings.toFixed(0)} BYN
                          </span>
                        </div>
                      </div>

                      {/* Зарплата */}
                      <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                          {(() => {
                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const currentTimeInMinutes =
                              currentHour * 60 + currentMinute;
                            const workStartMinutes = 9 * 60;
                            const workEndMinutes = 21 * 60;

                            if (currentTimeInMinutes < workStartMinutes) {
                              return "ЗП за день";
                            } else if (currentTimeInMinutes >= workEndMinutes) {
                              return "ЗП за день";
                            } else {
                              const workedMinutes =
                                currentTimeInMinutes - workStartMinutes;
                              const workedHours = workedMinutes / 60;
                              return `ЗП за ${workedHours.toFixed(1)}ч`;
                            }
                          })()}
                        </span>
                        <span
                          className={`font-bold text-lg tabular-nums ${
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
            ) : (
              <div className="text-center py-8 md:py-12 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Смена еще не начата</h3>
                <p className="text-sm max-w-sm">
                  Выберите сотрудников ниже и нажмите «Начать смену», чтобы получить доступ к функциям записи.
                </p>
              </div>
            )}

            {/* Модальное окно редактирования состава смены */}
            {isEditingShift && (
              <Modal
                isOpen={isEditingShift}
                onClose={() => {
                  setIsEditingShift(false);
                  // Восстанавливаем сотрудников, если отменили редактирование
                  if (currentReport) {
                    setShiftEmployees([...currentReport.employeeIds]);
                  }
                }}
                className="max-w-xl"
              >
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-border/50 pb-4">
                    <h3 className="text-xl font-bold text-foreground">
                      Редактировать состав смены
                    </h3>
                    <button
                      onClick={() => {
                        setIsEditingShift(false);
                        if (currentReport) {
                          setShiftEmployees([...currentReport.employeeIds]);
                        }
                      }}
                      className="p-2 rounded-full hover:bg-accent transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    {state.employees.map((employee) => {
                      const isSelected = shiftEmployees.includes(employee.id);
                      const currentRole = employeeRoles[employee.id] || "washer";

                      return (
                        <div
                          key={employee.id}
                          className={`relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? "bg-primary/5 border-primary/30 shadow-sm"
                              : "bg-background border-border hover:border-border/80 hover:bg-accent/5"
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-white"
                                  : "border-input bg-background"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() => handleEmployeeSelection(employee.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium truncate transition-colors ${
                                  isSelected
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {employee.name}
                              </p>
                            </div>
                          </label>

                          <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              isSelected
                                ? "max-h-24 opacity-100 mt-3"
                                : "max-h-0 opacity-0 mt-0"
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center bg-background rounded-lg border border-border/50 p-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmployeeRoles({
                                      ...employeeRoles,
                                      [employee.id]: "washer",
                                    });
                                  }}
                                  className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                                    currentRole === "washer"
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  }`}
                                >
                                  Мойщик
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmployeeRoles({
                                      ...employeeRoles,
                                      [employee.id]: "admin",
                                    });
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                                    currentRole === "admin"
                                      ? "bg-amber-500 text-white shadow-sm"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  }`}
                                >
                                  <Shield className="w-3 h-3" />
                                  Админ
                                </button>
                              </div>

                              {/* Min Payment Toggle */}
                              <label className="flex items-center gap-2 px-1 py-0.5 cursor-pointer group w-fit">
                                <div
                                  className={`flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-colors ${
                                    (employeeRoles as any)?.[`min_${employee.id}`] !== false
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-input bg-background"
                                  }`}
                                >
                                  {(employeeRoles as any)?.[`min_${employee.id}`] !== false && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={(employeeRoles as any)?.[`min_${employee.id}`] !== false}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setEmployeeRoles({
                                      ...employeeRoles,
                                      [`min_${employee.id}`]: e.target.checked ? true : false,
                                    } as any);
                                  }}
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors select-none">
                                  Учитывать минималку
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                    {shiftEmployees.length === 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm text-center font-medium">
                        Вы сняли всех сотрудников. Сохранение закроет текущую смену.
                      </div>
                    )}
                    <button
                      onClick={startShift}
                      disabled={loading.savingShift}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-all shadow-sm ${
                        shiftEmployees.length === 0
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-primary hover:bg-primary/90"
                      } disabled:opacity-50`}
                    >
                      {loading.savingShift ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Сохранение...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>{shiftEmployees.length === 0 ? "Закрыть смену" : "Сохранить изменения"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </div>

          {/* Итоги */}
          {currentReport && shiftStarted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative mt-2">
              {/* Сводка по оплатам */}
              <div className="p-5 rounded-2xl border border-border/50 shadow-sm bg-background flex flex-col h-full">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-xl font-bold text-foreground">Итого</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 flex-1">
                  {/* Наличные */}
                  <div
                    className={`flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      paymentFilter === "cash"
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/20 border-border/50 hover:bg-accent/30"
                    } ${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      setPaymentFilter("cash");
                      openDailyReportModal();
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для просмотра ведомости по наличным"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    <span className="text-sm text-muted-foreground font-medium mb-1.5">
                      Наличные
                    </span>
                    <span className="font-bold text-lg text-foreground">
                      {currentReport.totalCash.toFixed(2)}{" "}
                      <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                    </span>
                  </div>

                  {/* Карта */}
                  <div
                    className={`flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      paymentFilter === "card"
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/20 border-border/50 hover:bg-accent/30"
                    } ${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      setPaymentFilter("card");
                      openDailyReportModal();
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для просмотра ведомости по картам"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    <span className="text-sm text-muted-foreground font-medium mb-1.5">
                      Карта
                    </span>
                    <span className="font-bold text-lg text-foreground">
                      {(
                        currentReport.records?.reduce(
                          (sum, rec) =>
                            sum +
                            (rec.paymentMethod.type === "card" ? rec.price : 0),
                          0,
                        ) || 0
                      ).toFixed(2)}{" "}
                      <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                    </span>
                  </div>

                  {/* Безналичные */}
                  <div
                    className={`flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border col-span-2 sm:col-span-1 ${
                      paymentFilter === "organization"
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/20 border-border/50 hover:bg-accent/30"
                    } ${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      setPaymentFilter("organization");
                      openDailyReportModal();
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для просмотра ведомости по безналу"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    <span className="text-sm text-muted-foreground font-medium mb-1.5">
                      Безналичные
                    </span>
                    <span className="font-bold text-lg text-foreground">
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
                      })()} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
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
                        className={`flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border col-span-2 sm:col-span-1 ${
                          paymentFilter === "organization"
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/20 border-border/50 hover:bg-accent/30"
                        } ${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          if (!shiftStarted) {
                            toast.info("Сначала выберите работников и начните смену");
                            return;
                          }
                          setPaymentFilter("organization");
                          openDailyReportModal();
                        }}
                        title={
                          shiftStarted
                            ? "Нажмите для просмотра ведомости (входит в безнал)"
                            : "Сначала выберите работников и начните смену"
                        }
                      >
                        <span className="text-sm text-muted-foreground font-medium mb-1.5 truncate">
                          {org.name}
                        </span>
                        <span className="font-bold text-lg text-indigo-500">
                          {sumForOrg.toFixed(2)} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                  {/* Сертификаты (только если есть) */}
                  {(() => {
                    const totalCertificate =
                      currentReport.records?.reduce(
                        (sum, rec) =>
                          sum +
                          (rec.paymentMethod.type === "certificate" ? rec.price : 0),
                        0,
                      ) || 0;

                    if (totalCertificate <= 0) return null;

                    return (
                      <div
                        className={`flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border col-span-2 sm:col-span-1 ${
                          paymentFilter === "certificate"
                            ? "bg-purple-500/10 border-purple-500/30"
                            : "bg-muted/20 border-border/50 hover:bg-accent/30"
                        } ${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          if (!shiftStarted) {
                            toast.info("Сначала выберите работников и начните смену");
                            return;
                          }
                          setPaymentFilter("certificate");
                          openDailyReportModal();
                        }}
                        title={
                          shiftStarted
                            ? "Нажмите для просмотра ведомости по сертификатам"
                            : "Сначала выберите работников и начните смену"
                        }
                      >
                        <span className="text-sm text-muted-foreground font-medium mb-1.5 truncate">
                          Сертификат
                        </span>
                        <span className="font-bold text-lg text-purple-500">
                          {totalCertificate.toFixed(2)} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                        </span>
                      </div>
                    );
                  })()}

                {/* Всего */}
                <div
                  className={`mt-auto pt-5 border-t border-border/50 flex justify-between items-center cursor-pointer transition-all duration-200 p-4 rounded-xl border bg-primary/5 hover:bg-primary/10 border-primary/20 ${
                    !shiftStarted ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  onClick={() => {
                    if (!shiftStarted) {
                      toast.info("Сначала выберите работников и начните смену");
                      return;
                    }
                    setPaymentFilter("all");
                    openDailyReportModal();
                  }}
                  title={
                    shiftStarted
                      ? "Нажмите для просмотра полной ведомости"
                      : "Сначала выберите работников и начните смену"
                  }
                >
                  <span className="font-bold text-lg">
                    Всего
                  </span>
                  <span className="font-bold text-2xl text-primary text-right">
                    {(() => {
                      const totalRevenue =
                        currentReport.records?.reduce((sum, record) => {
                          return sum + record.price;
                        }, 0) || 0;
                      return totalRevenue.toFixed(2);
                    })()} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                  </span>
                </div>
              </div>

              {/* Заработок сотрудников */}
              <div className="p-5 rounded-2xl border border-border/50 shadow-sm bg-background flex flex-col h-full">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-xl font-bold flex items-center text-foreground">
                    Заработок
                    <span className="inline-flex items-center relative group ml-3">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs cursor-help font-bold">
                        i
                      </div>
                      <div className="absolute bottom-full left-0 mb-3 w-48 sm:w-64 p-2 sm:p-3 bg-popover text-popover-foreground rounded-lg sm:rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-border/40 z-50">
                        <p className="text-xs sm:text-sm font-medium">
                          Расчет ЗП: минимальная оплата + процент с учетом ролей
                        </p>
                        <div className="absolute top-full left-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover" />
                      </div>
                    </span>
                  </h3>
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
                                      className="flex justify-between items-center text-sm"
                                    >
                                      <div className="flex flex-col min-w-0 pr-2">
                                        <span
                                          className={`font-medium truncate ${
                                            result.isManual
                                              ? "text-orange-500"
                                              : "text-card-foreground"
                                          }`}
                                        >
                                          {result.employeeName}
                                          <span className="text-xs text-muted-foreground font-normal ml-1">
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

                          <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center bg-accent/5 p-3 rounded-lg border border-border/40">
                            <span className="font-bold text-lg text-foreground">
                              Общая сумма
                            </span>
                            <span className="font-bold text-xl text-primary">
                              {totalSalarySum.toFixed(2)} BYN
                            </span>
                          </div>
                        </>
                      );
                    }

                    if (methodToUse === "none") {
                      return (
                        <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">Выберите метод расчета в настройках</span>
                          <span className="font-medium">0.00 BYN</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground">
                        <span className="text-sm">Нет данных для расчета</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка с виджетами */}
        <div className="flex flex-col gap-6">
          {/* Виджет "Записи на мойку" */}
          <div className="sticky top-6">
            <AppointmentsWidget
              onStartAppointment={handleAppointmentConversion}
              canCreateRecords={shiftStarted}
            />

            {/* Активные долги */}
            {activeDebts.length > 0 && (
              <div className="mt-6 rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-red-50 dark:bg-red-950/20">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                    Активные долги
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold">
                      {activeDebts.length}
                    </span>
                  </h3>
                </div>

                <div className="overflow-y-auto max-h-[300px]">
                  {activeDebts.map(({ reportId, record }) => (
                    <div
                      key={record.id}
                      className="p-4 border-b border-border/50 last:border-b-0 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-red-600/80">
                              {format(parseISO(reportId), "dd.MM")}
                            </span>
                            <span className="font-semibold text-foreground truncate">
                              {record.carInfo}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {record.service} •{" "}
                            <span className="font-bold text-foreground">
                              {record.price.toFixed(0)} BYN
                            </span>
                          </div>
                          {record.paymentMethod.comment && (
                            <div className="text-xs text-red-500/80 font-medium truncate italic leading-tight mt-1.5 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
                              "{record.paymentMethod.comment}"
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) =>
                            initiateCloseDebt(reportId, record.id, e)
                          }
                          className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-colors shadow-sm shrink-0"
                          title="Закрыть долг"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      {isModalOpen && (
        <AddCarWashModal
          onClose={toggleModal}
          selectedDate={selectedDate}
          prefilledData={appointmentToConvert}
          clickPosition={clickPosition}
          employeeRoles={employeeRoles}
          preselectedEmployeeId={preselectedEmployeeId}
          onSuccess={() => {
            loadActiveDebts();
          }}
        />
      )}

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

      {dailyReportModalOpen && shiftStarted && (
        <DailyReportModal
          onClose={() => setDailyReportModalOpen(false)}
          currentReport={currentReport}
          employees={state.employees}
          organizations={state.organizations}
          selectedDate={selectedDate}
          onExport={exportToWord}
          onExportCsv={exportToCsv}
          isExporting={loading.exporting}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
        />
      )}
    </motion.div>
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
    "cash" | "card" | "organization" | "certificate"
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
              <button
                type="button"
                onClick={() => setPaymentType("certificate")}
                className={paymentType === "certificate" ? "active" : ""}
              >
                Сертификат
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
  onSuccess?: () => void;
}

const AddCarWashModal: React.FC<AddCarWashModalProps> = ({
  onClose,
  selectedDate,
  prefilledData,
  clickPosition,
  employeeRoles,
  preselectedEmployeeId,
  onSuccess,
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
    type: "cash" | "card" | "organization" | "debt" | "certificate",
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

          // Вызываем коллбек об успешном добавлении, чтобы обновить списки в родительском компоненте
          if (onSuccess) {
            onSuccess();
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
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("certificate")}
                  className={
                    formData.paymentMethod.type === "certificate" ? "active" : ""
                  }
                >
                  Сертификат
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
    if (type === "certificate") return "Сертификат";
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
  onExportCsv: () => void;
  isExporting: boolean;
  paymentFilter: "all" | "cash" | "card" | "organization" | "debt" | "certificate";
  onPaymentFilterChange: (
    filter: "all" | "cash" | "card" | "organization" | "debt" | "certificate",
  ) => void;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({
  onClose,
  currentReport,
  employees,
  organizations,
  selectedDate,
  onExport,
  onExportCsv,
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
    if (type === "certificate") return "Сертификат";
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
    type: "cash" | "card" | "organization" | "debt" | "certificate",
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
              <div className="flex gap-2 bg-secondary text-secondary-foreground rounded-lg sm:rounded-xl overflow-hidden">
                <button
                  onClick={onExport}
                  disabled={isExporting || !currentReport}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-secondary/80 transition-colors disabled:opacity-50 text-xs sm:text-sm border-r border-background/20"
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
                      <span className="hidden sm:inline">Word</span>
                      <span className="sm:hidden">Word</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onExportCsv}
                  disabled={isExporting || !currentReport}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-secondary/80 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                >
                  {isExporting ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <>
                      <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">CSV</span>
                      <span className="sm:hidden">CSV</span>
                    </>
                  )}
                </button>
              </div>
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("certificate")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "certificate"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Серт
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
