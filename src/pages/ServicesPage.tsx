import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Calendar, 
  Search, 
  DollarSign, 
  Loader2, 
  AlertCircle, 
  Edit3,
  X,
  UserCheck,
  Inbox
} from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService } from "@/lib/services/supabaseService";
import type { CarWashRecord, DailyReport, Employee, EmployeeRole } from "@/lib/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";

interface EditSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CarWashRecord;
  reportId: string;
  employees: Employee[];
  employeeRoles: Record<string, EmployeeRole>;
  onUpdateSuccess: (date: string, updatedRecord: CarWashRecord) => void;
}

const EditSalaryModal: React.FC<EditSalaryModalProps> = ({
  isOpen,
  onClose,
  record,
  reportId,
  employees,
  employeeRoles,
  onUpdateSuccess,
}) => {
  const [salaries, setSalaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && record) {
      const initialSalaries: Record<string, string> = {};
      record.employeeIds.forEach((empId) => {
        const indSal = record.individualSalaries?.[empId] 
          || (record.manualWrapperSalary ? record.manualWrapperSalary / record.employeeIds.length : 0);
        initialSalaries[empId] = indSal > 0 ? indSal.toFixed(2) : "";
      });
      setSalaries(initialSalaries);
    }
  }, [isOpen, record]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const individualSalaries: Record<string, number> = {};
      let totalManualSalary = 0;

      for (const empId of record.employeeIds) {
        const valStr = salaries[empId] || "0";
        const val = parseFloat(valStr);
        if (isNaN(val) || val < 0) {
          toast.error("Введите корректную сумму зарплаты");
          setLoading(false);
          return;
        }
        individualSalaries[empId] = val;
        totalManualSalary += val;
      }

      const updatedRecord: CarWashRecord = {
        ...record,
        manualWrapperSalary: totalManualSalary > 0 ? totalManualSalary : undefined,
        individualSalaries: individualSalaries,
      };

      // 1. Обновляем в Supabase car_wash_records
      const successDb = await carWashService.update(updatedRecord);
      if (!successDb) throw new Error("Failed to update record in DB");

      // 2. Обновляем в DailyReport
      const report = await dailyReportService.getByDate(reportId);
      if (report) {
        const updatedRecords = report.records.map((r) => 
          r.id === record.id ? updatedRecord : r
        );
        const updatedReport: DailyReport = {
          ...report,
          records: updatedRecords
        };
        await dailyReportService.updateReport(updatedReport);
      }

      toast.success("Зарплаты исполнителей успешно обновлены");
      onUpdateSuccess(reportId, updatedRecord);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось обновить зарплаты");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Настройка ЗП исполнителей
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl mb-6 space-y-2">
          <div className="text-sm font-semibold">{record.carInfo}</div>
          <div className="text-xs text-muted-foreground">{record.service}</div>
          <div className="flex justify-between text-xs font-bold pt-2 border-t border-border/20">
            <span>Стоимость услуги:</span>
            <span>{record.price.toFixed(2)} BYN</span>
          </div>
        </div>

        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {record.employeeIds.map((empId) => {
            const emp = employees.find((e) => e.id === empId);
            const role = employeeRoles[empId] || "washer";
            return (
              <div key={empId} className="flex items-center justify-between gap-4 p-3 bg-zinc-950 border border-border/40 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{emp ? emp.name : "Неизвестный"}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {role === "admin" ? "Администратор" : "Мойщик"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salaries[empId] || ""}
                    onChange={(e) => setSalaries({ ...salaries, [empId]: e.target.value })}
                    placeholder="0.00"
                    className="w-24 px-2.5 py-1.5 bg-zinc-900 border border-border text-sm font-semibold rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">BYN</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/95 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ServicesPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unpaid">("all");
  
  const [selectedRecord, setSelectedRecord] = useState<CarWashRecord | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [selectedEmployeeRoles, setSelectedEmployeeRoles] = useState<Record<string, any>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const reportsList = Object.values(state.dailyReports);
  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  const services: Array<{ record: CarWashRecord; reportId: string; employeeRoles: Record<string, any> }> = [];

  reportsList.forEach((report) => {
    const reportDate = typeof report.date === "string" ? parseISO(report.date) : new Date(report.date);
    
    if (isWithinInterval(reportDate, { start: startDate, end: endDate })) {
      report.records.forEach((record) => {
        services.push({
          record,
          reportId: report.id,
          employeeRoles: report.dailyEmployeeRoles || {}
        });
      });
    }
  });

  // Сортировка по дате и времени (от новых к старым)
  services.sort((a, b) => {
    const dateA = typeof a.record.date === "string" ? a.record.date : (a.record.date as any).toISOString().slice(0, 10);
    const dateB = typeof b.record.date === "string" ? b.record.date : (b.record.date as any).toISOString().slice(0, 10);
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return b.record.time.localeCompare(a.record.time);
  });

  const getUncalculatedStatus = (record: CarWashRecord) => {
    const isUncalculatedType = record.serviceType === "wrap_execution" || record.serviceType === "detailing";
    const hasExecutors = record.employeeIds && record.employeeIds.length > 0;
    const hasNoManualSalary = !record.manualWrapperSalary;
    
    const individualSalaries = record.individualSalaries;
    const individualSalariesSum = individualSalaries 
      ? Object.values(individualSalaries).reduce((sum, v) => sum + (v as number || 0), 0) 
      : 0;
    const hasNoIndividualSalaries = individualSalariesSum === 0;

    return isUncalculatedType && hasExecutors && hasNoManualSalary && hasNoIndividualSalaries;
  };

  // Фильтрация
  const filteredServices = services.filter(({ record }) => {
    if (filterType === "unpaid") {
      return getUncalculatedStatus(record);
    }
    return true;
  }).filter(({ record }) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      record.carInfo.toLowerCase().includes(query) ||
      record.service.toLowerCase().includes(query)
    );
  });

  const totalServicesCount = filteredServices.length;
  const unpaidServicesCount = services.filter(({ record }) => getUncalculatedStatus(record)).length;
  const totalServicesRevenue = filteredServices.reduce((sum, { record }) => sum + record.price, 0);

  const handleUpdateSuccess = (date: string, updatedRecord: CarWashRecord) => {
    const currentReport = state.dailyReports[date];
    if (!currentReport) return;

    const updatedRecords = currentReport.records.map((r) => 
      r.id === updatedRecord.id ? updatedRecord : r
    );

    const updatedReport: DailyReport = {
      ...currentReport,
      records: updatedRecords
    };

    dispatch({
      type: "SET_DAILY_REPORT",
      payload: {
        date,
        report: updatedReport
      }
    });
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Шапка страницы */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-primary to-blue-500 rounded-full"></div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary animate-pulse" />
            Все Услуги и Расчет
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление выполненными услугами автомойки, детейлинга и оклейки.
          </p>
        </div>

        {/* Выбор периода */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-border/50 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 text-xs font-bold"
          >
            &larr;
          </button>
          <div className="text-sm font-semibold px-3 flex items-center gap-2 text-foreground whitespace-nowrap">
            <Calendar className="w-4 h-4 text-primary" />
            {format(selectedMonth, "LLLL yyyy", { locale: ru })}
          </div>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 text-xs font-bold"
            disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Аналитика */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-border/40 rounded-2xl flex items-center justify-between group hover:border-border transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Всего заказов</span>
            <div className="text-2xl font-black text-foreground">{totalServicesCount}</div>
          </div>
          <div className="p-3 bg-zinc-800 rounded-xl text-muted-foreground group-hover:text-foreground transition-colors">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-border/40 rounded-2xl flex items-center justify-between group hover:border-border transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Требуют ЗП</span>
            <div className="text-2xl font-black text-foreground flex items-center gap-2">
              {unpaidServicesCount}
              {unpaidServicesCount > 0 && (
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl transition-colors ${unpaidServicesCount > 0 ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-muted-foreground"}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-border/40 rounded-2xl flex items-center justify-between group hover:border-border transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Выручка за период</span>
            <div className="text-2xl font-black text-foreground">{totalServicesRevenue.toFixed(2)} BYN</div>
          </div>
          <div className="p-3 bg-zinc-800 rounded-xl text-muted-foreground group-hover:text-foreground transition-colors">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Поиск и Фильтрация */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-border/30">
        <div className="segmented-control w-full sm:w-auto shrink-0">
          <button
            onClick={() => setFilterType("all")}
            className={filterType === "all" ? "active" : ""}
          >
            Все услуги
          </button>
          <button
            onClick={() => setFilterType("unpaid")}
            className={filterType === "unpaid" ? "active flex items-center gap-1.5" : "flex items-center gap-1.5"}
          >
            Требуют ЗП
            {unpaidServicesCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black animate-pulse">
                {unpaidServicesCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по гос. номеру или названию услуги..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-border/40 hover:border-muted-foreground/30 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900 border border-border/40 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-bold text-muted-foreground uppercase">
                <th className="p-3">Дата / Время</th>
                <th className="p-3">Автомобиль</th>
                <th className="p-3">Услуга</th>
                <th className="p-3">Тип</th>
                <th className="p-3 text-right">Стоимость</th>
                <th className="p-3">Исполнители / Зарплата</th>
                <th className="p-3">Админ %</th>
                <th className="p-3 text-right">Управление</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length > 0 ? (
                filteredServices.map(({ record, reportId, employeeRoles }) => {
                  const isUnpaid = getUncalculatedStatus(record);
                  const isCustomPaidType = record.serviceType === "wrap_execution" || record.serviceType === "detailing";
                  
                  return (
                    <tr key={record.id} className={`border-b border-border/40 hover:bg-muted/10 transition-colors ${
                      isUnpaid ? "bg-amber-500/[0.015]" : ""
                    }`}>
                      {/* Дата/Время */}
                      <td className="p-3 text-sm whitespace-nowrap align-middle">
                        <div className="font-semibold">
                          {format(parseISO(typeof record.date === "string" ? record.date : (record.date as any).toISOString()), "dd.MM.yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{record.time}</div>
                      </td>

                      {/* Автомобиль */}
                      <td className="p-3 text-sm font-bold text-foreground align-middle">
                        {record.carInfo}
                      </td>

                      {/* Название */}
                      <td className="p-3 text-sm font-medium align-middle">
                        {record.service}
                      </td>

                      {/* Тип услуги */}
                      <td className="p-3 text-sm align-middle whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                          record.serviceType === "wash" 
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : record.serviceType === "dryclean"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : record.serviceType === "detailing"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        }`}>
                          {record.serviceType === "wash" && "Мойка"}
                          {record.serviceType === "dryclean" && "Химчистка"}
                          {record.serviceType === "detailing" && "Детейлинг"}
                          {record.serviceType === "wrap_sale" && "Продажа оклейки"}
                          {record.serviceType === "wrap_execution" && "Исполнение оклейки"}
                        </span>
                      </td>

                      {/* Стоимость */}
                      <td className="p-3 text-sm font-black text-right align-middle whitespace-nowrap">
                        {record.price.toFixed(2)} BYN
                      </td>

                      {/* Исполнители */}
                      <td className="p-3 text-sm align-middle">
                        {record.employeeIds.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {record.employeeIds.map((empId) => {
                              const emp = state.employees.find((e) => e.id === empId);
                              const indSal = record.individualSalaries?.[empId] 
                                || (record.manualWrapperSalary ? record.manualWrapperSalary / record.employeeIds.length : null);
                              return (
                                <div key={empId} className="flex items-center justify-between gap-3 text-xs bg-zinc-900 border border-border/20 px-2.5 py-1 rounded-lg">
                                  <span className="font-medium text-muted-foreground">{emp ? emp.name : "Неизвестный"}</span>
                                  {indSal !== null ? (
                                    <span className="font-bold text-foreground">{indSal.toFixed(2)} BYN</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-semibold">Процент (%)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Исполнители не выбраны</span>
                        )}
                      </td>

                      {/* Админ комиссия */}
                      <td className="p-3 text-sm align-middle">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                          record.noAdminCommission
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20"
                        }`}>
                          {record.noAdminCommission ? "Исключен" : "Начислен"}
                        </span>
                      </td>

                      {/* Управление */}
                      <td className="p-3 text-sm text-right align-middle">
                        {isCustomPaidType ? (
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setSelectedReportId(reportId);
                              setSelectedEmployeeRoles(employeeRoles);
                              setIsEditModalOpen(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 ml-auto transition-all touch-manipulation active:scale-95 ${
                              isUnpaid
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-zinc-800 text-foreground border-border hover:bg-secondary"
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isUnpaid ? "Указать ЗП" : "Изменить ЗП"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="w-8 h-8 opacity-30 text-primary" />
                      <p className="font-semibold text-xs">Услуг не найдено</p>
                      <p className="text-[10px] text-muted-foreground/75">
                        Попробуйте изменить период или поисковый запрос.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка изменения ЗП */}
      {selectedRecord && (
        <EditSalaryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
          reportId={selectedReportId}
          employees={state.employees}
          employeeRoles={selectedEmployeeRoles}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default ServicesPage;
