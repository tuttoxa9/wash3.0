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
  certificateService,
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
import { calculateEmployeeShare } from "@/lib/employee-utils";
import { Packer } from "docx";
import { saveAs } from "file-saver";
import { generateId } from "@/lib/utils";
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

import DailyReportModal from "@/components/Home/DailyReportModal";
import CashModificationsModal from "@/components/Home/CashModificationsModal";
import CertificatesWidget from "@/components/Home/CertificatesWidget";
import CashStateWidget from "@/components/Home/CashStateWidget";

import CloseCashModal from "@/components/Home/CashState/CloseCashModal";
import PayoutEmployeesModal from "@/components/Home/CashState/PayoutEmployeesModal";
import TransferToSafeModal from "@/components/Home/CashState/TransferToSafeModal";

import { PreShiftScreen } from "@/components/Home/PreShiftScreen";
import EmployeeDetailModal from "@/components/Home/EmployeeDetailModal";
import AddCarWashModal from "@/components/Home/AddCarWashModal";
import AppointmentsWidget from "@/components/Home/AppointmentsWidget";
import CloseDebtModal from "@/components/Home/CloseDebtModal";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { recalculateReportTotals } from "@/lib/report-utils";

const HomePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState({
    dailyReport: true,
    employees: true,
    exporting: false,
    savingShift: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftEmployees, setShiftEmployees] = useState<string[]>(() => {
    // Synchronous initialization to prevent initial flicker
    try {
      const cachedDataStr = localStorage.getItem(`cached_daily_report_${state.currentDate}`);
      if (cachedDataStr) {
        const cachedReport = JSON.parse(cachedDataStr);
        if (cachedReport.employeeIds && cachedReport.employeeIds.length > 0) {
          return cachedReport.employeeIds;
        }
      }
    } catch (e) {
      console.warn("Error reading cache for shiftEmployees initialization");
    }
    return [];
  });
  const [employeeRoles, setEmployeeRoles] = useState<
    Record<string, EmployeeRole>
  >(() => {
    try {
      const cachedDataStr = localStorage.getItem(`cached_daily_report_${state.currentDate}`);
      if (cachedDataStr) {
        const cachedReport = JSON.parse(cachedDataStr);
        if (cachedReport.dailyEmployeeRoles) {
          return cachedReport.dailyEmployeeRoles;
        }
      }
    } catch (e) {
      console.warn("Error reading cache for employeeRoles initialization");
    }
    return {};
  });
  const [isShiftLocked, setIsShiftLocked] = useState(() => {
    try {
      const cachedDataStr = localStorage.getItem(`cached_daily_report_${state.currentDate}`);
      if (cachedDataStr) {
        const cachedReport = JSON.parse(cachedDataStr);
        if (cachedReport.employeeIds && cachedReport.employeeIds.length > 0) {
          return true;
        }
      }
    } catch (e) {
      console.warn("Error reading cache for isShiftLocked initialization");
    }
    return false;
  });
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
  const [shiftPhase, setShiftPhase] = useState<"idle" | "starting" | "success" | "active" | "deleting" | "deleted">("idle");

  const [startOfDayCash, setStartOfDayCash] = useState<string>("");
  const [previousDayCash, setPreviousDayCash] = useState<number | undefined>(undefined);

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
  const [preselectedCertificateId, setPreselectedCertificateId] = useState<
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
  const [isCashModificationsModalOpen, setIsCashModificationsModalOpen] = useState(false);

  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isTransferSafeModalOpen, setIsTransferSafeModalOpen] = useState(false);

  const [debtToClose, setDebtToClose] = useState<{
    reportId: string;
    recordId: string;
  } | null>(null);

  // Проверяем, является ли выбранная дата текущей
  const isCurrentDate = isToday(parseISO(selectedDate));

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
      return { carCount: 0, totalServicesAmount: 0 };
    }

    const employeeRecords = currentReport.records.filter((record) =>
      record.employeeIds.includes(employeeId),
    );

    const carCount = employeeRecords.length;
    // Сумма оказанных услуг, разделенная на количество сотрудников, выполнявших услугу
    const totalServicesAmount = employeeRecords.reduce((sum, record) => {
      return sum + record.price / record.employeeIds.length;
    }, 0);

    return { carCount, totalServicesAmount };
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
      setPreselectedCertificateId(null);
    } else if (event) {
      // Сохраняем позицию клика для анимации
      setClickPosition({ x: event.clientX, y: event.clientY });
    }
    setIsModalOpen(!isModalOpen);
  };

  // Функция для обработки использования сертификата
  const handleUseCertificate = (certificate: any, event: React.MouseEvent) => {
    setPreselectedCertificateId(certificate.id);
    setClickPosition({ x: event.clientX, y: event.clientY });
    setIsModalOpen(true);
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
  const formattedDate = format(parseISO(selectedDate), "dd.MM.yyyy");

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
      const { totalCash, totalCard } = recalculateReportTotals({ records: updatedRecords });

      const updatedReport = {
        ...report,
        records: updatedRecords,
        totalCash,
        totalCard,
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

        // Проверяем: нужно ли создать кассовую проводку в текущей смене
        // Условие: оплата налом или картой, и долг не относится к сегодняшней смене (либо мы всё равно хотим учесть это в кассе текущей смены)
        if (
          (paymentMethod.type === "cash" || paymentMethod.type === "card") &&
          currentReport &&
          recordToUpdate
        ) {
          // Если долг был за прошлую дату, добавляем в текущую открытую смену, чтобы сошлась физическая касса
          // Если за текущую, то долг уже перешел в totalCash/totalCard текущего отчета, так что дополнительная проводка не нужна
          if (reportId !== selectedDate) {
            const modification = {
              id: generateId(),
              amount: recordToUpdate.price, // Внесение суммы
              reason: `Закрытие долга за ${format(parseISO(reportId), "dd.MM")} - ${recordToUpdate.carInfo}`,
              createdAt: new Date().toISOString(),
              method: paymentMethod.type as "cash" | "card",
            };

            const updatedCurrentReport = {
              ...currentReport,
              cashModifications: [
                ...(currentReport.cashModifications || []),
                modification,
              ],
            };

            await dailyReportService.updateReport(updatedCurrentReport);
            dispatch({
              type: "SET_DAILY_REPORT",
              payload: { date: selectedDate, report: updatedCurrentReport },
            });
            toast.success(`Внесено в кассу текущей смены (${paymentMethod.type === "cash" ? "Наличные" : "Карта"})`);
          }
        }

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
        state.organizations,
        state.organizationsInTotal
      );

      // Преобразуем в blob
      const blob = await Packer.toBlob(doc);

      // Сохраняем файл
      const fileName = `Ведомость_${format(parseISO(selectedDate), "dd-MM-yyyy")}.docx`;
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
        selectedDate,
        state.organizationsInTotal
      );

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const fileName = `Ведомость_${format(parseISO(selectedDate), "dd-MM-yyyy")}.csv`;
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

  // Delete shift states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Начало смены - зафиксировать сотрудников
  const startShift = async () => {
    // Логика удаления смены (если сняты все галочки)
    if (shiftEmployees.length === 0 && isEditingShift) {
      setIsDeleteConfirmOpen(true);
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
          cashState: currentReport.cashState || {
            isShiftOpen: true,
            startOfDayCash: Number.parseFloat(startOfDayCash) || 0,
          }
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
          totalCard: 0,
          dailyEmployeeRoles: employeeRoles,
          cashState: {
            isShiftOpen: true,
            startOfDayCash: Number.parseFloat(startOfDayCash) || 0,
          }
        };


        // Обновляем кэш в localStorage
        localStorage.setItem(`cached_daily_report_${selectedDate}`, JSON.stringify(newReport));

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
            const updatedRecords = updatedReport.records.map((rec) =>
            rec.id === editingRecordId ? record : rec,
          );

            // Пересчитываем итоги
            const { totalCash, totalCard } = recalculateReportTotals({ records: updatedRecords });

            updatedReport.records = updatedRecords;
            updatedReport.totalCash = totalCash;
            updatedReport.totalCard = totalCard;

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
            const { totalCash, totalCard } = recalculateReportTotals({ records: updatedRecords });

            updatedReport.records = updatedRecords;
            updatedReport.totalCash = totalCash;
            updatedReport.totalCard = totalCard;

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
      // 1. Пытаемся быстро подгрузить кэш из localStorage

      // Загрузка кассы предыдущей смены
      try {
        const prevDate = parseISO(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = format(prevDate, "yyyy-MM-dd");
        const prevReport = await dailyReportService.getByDate(prevDateStr);
        if (prevReport?.cashState?.actualEndOfDayCash !== undefined) {
          const cashState = prevReport.cashState;
          const totalPayouts = Object.values(cashState.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
          const transferred = cashState.transferredToSafe || 0;
          setPreviousDayCash((cashState.actualEndOfDayCash || 0) - totalPayouts - transferred);
        } else if (prevReport) {
          // Вычисляем если не было cashState (или касса не была закрыта)
          const totalPayouts = Object.values(prevReport.cashState?.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
          const transferred = prevReport.cashState?.transferredToSafe || 0;

          const calcCash = (prevReport.cashState?.startOfDayCash || 0) + prevReport.totalCash + (prevReport.cashModifications || [])
            .filter(m => !m.method || m.method === "cash")
            .reduce((sum, mod) => sum + mod.amount, 0) - totalPayouts - transferred;
          setPreviousDayCash(calcCash);
        }
      } catch (e) {
        console.error(e);
      }

      const cachedKey = `cached_daily_report_${selectedDate}`;
      const cachedDataStr = localStorage.getItem(cachedKey);

      if (cachedDataStr) {
        try {
          const cachedReport = JSON.parse(cachedDataStr);
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: cachedReport },
          });

          if (cachedReport.employeeIds && cachedReport.employeeIds.length > 0) {
            setShiftEmployees(cachedReport.employeeIds);
            setIsShiftLocked(true);
            if (cachedReport.dailyEmployeeRoles) {
              setEmployeeRoles(cachedReport.dailyEmployeeRoles);
            }
          }
        } catch (e) {
          console.warn("Failed to parse cached daily report", e);
        }
      }

      setLoading((prev) => ({ ...prev, dailyReport: true }));
      try {
        const report = await dailyReportService.getByDate(selectedDate);
        if (report) {
          // Обновляем кэш
          localStorage.setItem(cachedKey, JSON.stringify(report));

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
                setEmployeeRoles(dailyRoles as Record<string, EmployeeRole>);
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

  const handleDeleteShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");

    if (deletePassword !== import.meta.env.VITE_SETTINGS_PASSWORD) {
      setDeleteError("Неверный пароль. Попробуйте еще раз.");
      return;
    }

    setIsDeleteConfirmOpen(false);
    setDeletePassword("");
    setShiftPhase("deleting");
    try {
      setLoading((prev) => ({ ...prev, savingShift: true }));

      // Если отчет существует, удаляем все связанные данные
      if (currentReport) {
        // 1. Удаляем все записи о машинах за этот день
        if (currentReport.records && currentReport.records.length > 0) {
          await Promise.all(
            currentReport.records.map((rec) => carWashService.delete(rec.id))
          );
        }

        // 2. Удаляем ежедневные роли
        await dailyRolesService.saveDailyRoles(selectedDate, {}); // или создать метод deleteDailyRoles, но пока просто обнуляем

        // 3. Создаем пустой отчет вместо удаления документа (чтобы структура осталась валидной)
        const emptyReport: DailyReport = {
          id: selectedDate,
          date: selectedDate,
          employeeIds: [],
          records: [],
          totalCash: 0,
          totalCard: 0,
          dailyEmployeeRoles: {},
          cashModifications: [],
        };

        await dailyReportService.updateReport(emptyReport);

        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: emptyReport },
        });

        // Очищаем кэш в localStorage
        localStorage.removeItem(`cached_daily_report_${selectedDate}`);
      }

      setTimeout(() => {
        setShiftPhase("deleted");
        setLoading((prev) => ({ ...prev, savingShift: false }));

        setTimeout(() => {
          setIsShiftLocked(false);
          setIsEditingShift(false);
          setShiftPhase("idle");
          toast.success("Смена и все данные за день удалены");
        }, 1500);
      }, 1500);
    } catch (error) {
      console.error("Ошибка при удалении смены:", error);
      toast.error("Не удалось удалить смену");
      setShiftPhase("active");
      setLoading((prev) => ({ ...prev, savingShift: false }));
    }
  };


  // Окно начала смены и анимация перехода
  if ((!shiftStarted && !isEditingShift) || ["starting", "success", "deleting", "deleted"].includes(shiftPhase)) {

    // Глобальная проверка инициализации: пока приложение (или отчет) грузится, показываем лоадер,
    // чтобы не было моргания экрана "Открытие смены"
    if ((!state.isInitialized || loading.dailyReport) && shiftPhase === "idle") {
      return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground font-medium">Загрузка данных смены...</p>
        </div>
      );
    }

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              startOfDayCash={startOfDayCash}
              setStartOfDayCash={setStartOfDayCash}
              previousDayCash={previousDayCash}
            />
          </motion.div>
        )}

        {["starting", "success", "deleting", "deleted"].includes(shiftPhase) && (
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

                {shiftPhase === "deleting" && (
                  <motion.div
                    key="spinner-delete"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5 text-destructive"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-destructive/50" />
                    <span className="text-base font-medium text-foreground">Удаление смены...</span>
                  </motion.div>
                )}

                {shiftPhase === "deleted" && (
                  <motion.div
                    key="check-delete"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                      <Trash2 className="w-8 h-8" />
                    </div>
                    <span className="text-base font-medium text-foreground">Смена удалена</span>
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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
          minimumPaymentSettings={state.minimumPaymentSettings}
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
                    selected={parseISO(selectedDate)}
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
              setPreselectedCertificateId(null);
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
            {loading.dailyReport && (!currentReport || shiftEmployees.length === 0) ? (
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
                        isManualSalary
                          ? "border-orange-400/50 shadow-sm"
                          : "border-border/50 shadow-sm hover:border-primary/30"
                      }`}
                      onClick={() => {
                        if (loading.dailyReport) return;
                        openEmployeeModal(employee.id);
                      }}
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
                            {loading.dailyReport && !currentReport ? <Skeleton className="h-5 w-8" /> : stats.carCount}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-border/40" />
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                            Сумма
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-card-foreground flex items-center">
                            {loading.dailyReport && !currentReport ? <Skeleton className="h-5 w-12 mr-1" /> : `${stats.totalServicesAmount.toFixed(2)} BYN`}
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
                          className={`font-bold text-lg tabular-nums flex items-center ${
                            isManualSalary ? "text-orange-500" : "text-primary"
                          }`}
                        >
                          {loading.dailyReport && !currentReport ? <Skeleton className="h-6 w-14 mr-1" /> : `${dailySalary.toFixed(2)} BYN`} {isManualSalary && "*"}
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
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center font-medium">
                        Вы сняли всех сотрудников. Продолжение приведет к ПОЛНОМУ УДАЛЕНИЮ смены и всех записей за этот день.
                      </div>
                    )}
                    <button
                      onClick={startShift}
                      disabled={loading.savingShift}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-all shadow-sm ${
                        shiftEmployees.length === 0
                          ? "bg-destructive hover:bg-destructive/90"
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
                          {shiftEmployees.length === 0 ? <Trash2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                          <span>{shiftEmployees.length === 0 ? "Удалить смену" : "Сохранить изменения"}</span>
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
                    className={`relative flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border bg-muted/20 border-border/50 hover:bg-accent/30 ${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                    onClick={(e) => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      // Не открываем DailyReportModal, а открываем модалку с движением наличных
                      setIsCashModificationsModalOpen(true);
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для редактирования наличных (изъятия/внесения)"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    {currentReport.cashModifications && currentReport.cashModifications.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-600">
                          {currentReport.cashModifications.length}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground font-medium mb-1.5">
                      Наличные
                    </span>
                    <span className="font-bold text-lg text-foreground">
                      {(() => {
                        const actualCash =
                          currentReport.totalCash +
                          (currentReport.cashModifications || [])
                            .filter(m => !m.method || m.method === "cash")
                            .reduce(
                              (sum, mod) => sum + mod.amount,
                              0,
                            );
                        return actualCash.toFixed(2);
                      })()}{" "}
                      <span className="text-sm font-semibold opacity-80 text-muted-foreground">
                        BYN
                      </span>
                    </span>
                    {currentReport.cashModifications && currentReport.cashModifications.filter(m => !m.method || m.method === "cash").length > 0 && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        По услугам: {currentReport.totalCash.toFixed(2)} BYN
                      </span>
                    )}
                  </div>

                  {/* Карта */}
                  <div
                    className={`relative flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
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
                    {currentReport.cashModifications && currentReport.cashModifications.filter(m => m.method === "card").length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                          {currentReport.cashModifications.filter(m => m.method === "card").length}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground font-medium mb-1.5">
                      Карта
                    </span>
                    <span className="font-bold text-lg text-foreground">
                      {loading.dailyReport && !currentReport ? (
                        <Skeleton className="h-7 w-20" />
                      ) : (
                        <>
                          {(() => {
                            const totalCardServices = currentReport.records?.reduce((sum, rec) => sum + (rec.paymentMethod.type === "card" ? rec.price : 0), 0) || 0;
                            const cardMods = (currentReport.cashModifications || []).filter(m => m.method === "card").reduce((sum, mod) => sum + mod.amount, 0);
                            return (totalCardServices + cardMods).toFixed(2);
                          })()}{" "}
                          <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                        </>
                      )}
                    </span>
                    {!(loading.dailyReport && !currentReport) && currentReport.cashModifications && currentReport.cashModifications.filter(m => m.method === "card").length > 0 && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        По услугам: {(currentReport.records?.reduce((sum, rec) => sum + (rec.paymentMethod.type === "card" ? rec.price : 0), 0) || 0).toFixed(2)} BYN
                      </span>
                    )}
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
                      {loading.dailyReport && !currentReport ? (
                        <Skeleton className="h-7 w-20" />
                      ) : (
                        <>
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
                        </>
                      )}
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
                          {loading.dailyReport && !currentReport ? (
                            <Skeleton className="h-7 w-20" />
                          ) : (
                            <>
                              {sumForOrg.toFixed(2)} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                            </>
                          )}
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
                          {loading.dailyReport && !currentReport ? (
                            <Skeleton className="h-7 w-20" />
                          ) : (
                            <>
                              {totalCertificate.toFixed(2)} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                            </>
                          )}
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
                    {loading.dailyReport && !currentReport ? (
                      <Skeleton className="h-8 w-28" />
                    ) : (
                      <>
                        {(() => {
                          const totalRevenue =
                            currentReport.records?.reduce((sum, record) => {
                              return sum + record.price;
                            }, 0) || 0;
                          return totalRevenue.toFixed(2);
                        })()} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                      </>
                    )}
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
                                        {loading.dailyReport && !currentReport ? (
                                          <Skeleton className="h-6 w-16" />
                                        ) : (
                                          <>
                                            {result.calculatedSalary.toFixed(2)}{" "}
                                            BYN
                                          </>
                                        )}
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
                              {loading.dailyReport && !currentReport ? (
                                <Skeleton className="h-8 w-24" />
                              ) : (
                                <>
                                  {totalSalarySum.toFixed(2)} BYN
                                </>
                              )}
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
          <div className="sticky top-6 flex flex-col gap-6">
            {/* Активные долги */}
            {activeDebts.length > 0 && (
              <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden flex flex-col">
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
                              {record.price.toFixed(2)} BYN
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

            {currentReport && shiftStarted && (
              <CashStateWidget
                report={currentReport}
                onCloseCash={() => setIsCloseCashModalOpen(true)}
                onPayout={() => setIsPayoutModalOpen(true)}
                onTransferToSafe={() => setIsTransferSafeModalOpen(true)}
              />
            )}

            {/* Виджет сертификатов */}
            <CertificatesWidget
              canCreateRecords={shiftStarted}
              selectedDate={selectedDate}
              onUseCertificate={handleUseCertificate}
            />

            {/* Виджет "Записи на мойку" */}
            <AppointmentsWidget
              onStartAppointment={handleAppointmentConversion}
              canCreateRecords={shiftStarted}
            />
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
          preselectedCertificateId={preselectedCertificateId}
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
          employeeRoles={employeeRoles}
          minimumPaymentSettings={state.minimumPaymentSettings}
        />
      )}

      {isCashModificationsModalOpen && shiftStarted && currentReport && (
        <CashModificationsModal
          onClose={() => setIsCashModificationsModalOpen(false)}
          currentReport={currentReport}
          selectedDate={selectedDate}
        />
      )}

      {isDeleteConfirmOpen && (
        <Modal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletePassword("");
            setDeleteError("");
          }}
          className="max-w-md"
        >
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Подтвердите удаление</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Вы собираетесь удалить смену. Это действие безвозвратно удалит <b>ВСЕ</b> записи о помытых машинах, выручку, долги и внесенные наличные за эту дату ({format(parseISO(selectedDate), "dd.MM.yyyy")}).
                </p>
              </div>
            </div>

            <form onSubmit={handleDeleteShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Введите пароль от настроек:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Пароль"
                  autoFocus
                  className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-destructive text-sm"
                />
                {deleteError && (
                  <p className="text-xs text-destructive mt-1.5">{deleteError}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  className="px-4 py-2 rounded-xl border border-input text-sm font-medium hover:bg-secondary/50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!deletePassword || loading.savingShift}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {loading.savingShift ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Удалить навсегда
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}


      {isCloseCashModalOpen && currentReport && (
        <CloseCashModal
          isOpen={isCloseCashModalOpen}
          onClose={() => setIsCloseCashModalOpen(false)}
          report={currentReport}
        />
      )}

      {isPayoutModalOpen && currentReport && (
        <PayoutEmployeesModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          report={currentReport}
          employees={state.employees}
        />
      )}

      {isTransferSafeModalOpen && currentReport && (
        <TransferToSafeModal
          isOpen={isTransferSafeModalOpen}
          onClose={() => setIsTransferSafeModalOpen(false)}
          report={currentReport}
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
          employeeRoles={employeeRoles}
          minimumPaymentSettings={state.minimumPaymentSettings}
        />
      )}
    </motion.div>
  );
};

// Интерфейс модального окна для закрытия долга
export default HomePage;
