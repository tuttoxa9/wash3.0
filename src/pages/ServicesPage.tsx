import React, { useState, useEffect, useRef } from "react";
import { 
  Layers, 
  Calendar as CalendarIcon, 
  Search, 
  Loader2, 
  Inbox
} from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService, dailyRolesService } from "@/lib/services/supabaseService";
import type { CarWashRecord, DailyReport, EmployeeRole } from "@/lib/types";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import EditCarWashModal from "@/components/Home/EditCarWashModal";
import PasswordAuth from "@/components/ui/PasswordAuth";

type PeriodType = "day" | "week" | "month" | "custom";

const ServicesPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Период
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Date picker state
  const [activeDatePicker, setActiveDatePicker] = useState<"main" | "start" | "end" | null>(null);
  const mainDatePickerRef = useRef<HTMLDivElement>(null);
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  
  // Данные
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [dailyRoles, setDailyRoles] = useState<Record<string, Record<string, EmployeeRole>>>({});
  
  // Редактирование
  const [selectedRecord, setSelectedRecord] = useState<CarWashRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        (activeDatePicker === "main" && mainDatePickerRef.current && !mainDatePickerRef.current.contains(event.target as Node)) ||
        (activeDatePicker === "start" && startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) ||
        (activeDatePicker === "end" && endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node))
      ) {
        setActiveDatePicker(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDatePicker]);

  useEffect(() => {
    switch (periodType) {
      case "day":
        setStartDate(selectedDate);
        setEndDate(selectedDate);
        break;
      case "week":
        setStartDate(startOfWeek(selectedDate, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(selectedDate, { weekStartsOn: 1 }));
        break;
      case "month":
        setStartDate(startOfMonth(selectedDate));
        setEndDate(endOfMonth(selectedDate));
        break;
    }
  }, [periodType, selectedDate]);

  useEffect(() => {
    const loadData = async () => {
      if (!startDate || !endDate) return;
      setLoading(true);
      try {
        const startStr = format(startDate, "yyyy-MM-dd");
        const endStr = format(endDate, "yyyy-MM-dd");

        const [fetchedRecords, fetchedRolesMap] = await Promise.all([
          carWashService.getByDateRange(startStr, endStr),
          dailyRolesService.getDailyRolesByDateRange(startStr, endStr),
        ]);

        // Сортировка по дате (от новых к старым), затем по времени
        fetchedRecords.sort((a, b) => {
          const dateA = typeof a.date === "string" ? a.date : (a.date as any).toISOString().slice(0, 10);
          const dateB = typeof b.date === "string" ? b.date : (b.date as any).toISOString().slice(0, 10);
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          return b.time.localeCompare(a.time);
        });

        setRecords(fetchedRecords);
        setDailyRoles(fetchedRolesMap as any);
      } catch (error) {
        console.error("Ошибка при загрузке услуг:", error);
        toast.error("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) {
      loadData();
    }
  }, [startDate, endDate, isAuthenticated]);

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

  const filteredRecords = records.filter(record => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      record.carInfo.toLowerCase().includes(query) ||
      record.service.toLowerCase().includes(query)
    );
  });

  const handleUpdateSuccess = (date: string, updatedRecord: CarWashRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: "main" | "start" | "end") => {
    const value = e.target.value;
    if (value) {
      try {
        const date = parseISO(value);
        if (date && !isNaN(date.getTime())) {
          if (type === "main") setSelectedDate(date);
          if (type === "start") setStartDate(date);
          if (type === "end") setEndDate(date);
        }
      } catch (e) {}
    }
    setActiveDatePicker(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <PasswordAuth onSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-5 min-h-screen pb-20 overflow-x-hidden">
      <h2 className="text-xl sm:text-2xl font-semibold border-b pb-3 flex items-center gap-2">
        <Layers className="w-6 h-6 text-primary" />
        Услуги
      </h2>

      <div className="card-with-shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Выбор Даты</h3>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-auto">
              <div className="relative" ref={mainDatePickerRef}>
                <div
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                  onClick={() => setActiveDatePicker("main")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  <span className="flex-1">
                    {format(selectedDate, "dd.MM.yyyy")}
                  </span>
                </div>
                {activeDatePicker === "main" && (
                  <input
                    type="date"
                    value={format(selectedDate, "yyyy-MM-dd")}
                    onChange={(e) => handleDateChange(e, "main")}
                    className="absolute top-12 left-0 z-50 p-2 bg-background border border-border rounded-lg shadow-xl"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по гос. номеру или названию услуги..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-border rounded-xl text-sm focus:outline-none transition-colors"
        />
      </div>

      <div className="card-with-shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
            <p>Загрузка данных...</p>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar mobile-table">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="font-medium text-left text-xs md:text-sm px-4 py-3">Дата / Время</th>
                  <th className="font-medium text-left text-xs md:text-sm px-4 py-3">Авто</th>
                  <th className="font-medium text-left text-xs md:text-sm px-4 py-3">Услуга</th>
                  <th className="font-medium text-left text-xs md:text-sm px-4 py-3">Тип</th>
                  <th className="font-medium text-right text-xs md:text-sm px-4 py-3">Стоимость</th>
                  <th className="font-medium text-left text-xs md:text-sm px-4 py-3">Исполнители / ЗП</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map((record) => {
                  const isUnpaid = getUncalculatedStatus(record);
                  const recordDateStr = typeof record.date === "string" ? record.date : (record.date as any).toISOString().slice(0, 10);
                  
                  return (
                    <tr 
                      key={record.id} 
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsEditModalOpen(true);
                      }}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer group ${
                        isUnpaid ? "bg-amber-500/10 hover:bg-amber-500/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-left">
                        <div className="text-sm font-semibold">
                            {format(parseISO(recordDateStr), "dd.MM.yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{record.time}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold max-w-[150px] truncate" title={record.carInfo}>
                        {record.carInfo}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium max-w-[200px] truncate" title={record.service}>
                        {record.service}
                        {isUnpaid && (
                            <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                          record.serviceType === "wash" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                          record.serviceType === "dryclean" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          record.serviceType === "detailing" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        }`}>
                          {record.serviceType === "wash" && "Мойка"}
                          {record.serviceType === "dryclean" && "Химчистка"}
                          {record.serviceType === "detailing" && "Детейлинг"}
                          {record.serviceType === "wrap_sale" && "Продажа оклейки"}
                          {record.serviceType === "wrap_execution" && "Исполнение оклейки"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-right whitespace-nowrap">
                        {record.price.toFixed(2)} BYN
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.employeeIds.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {record.employeeIds.map(empId => {
                              const emp = state.employees.find((e) => e.id === empId);
                              const indSal = record.individualSalaries?.[empId] 
                                || (record.manualWrapperSalary ? record.manualWrapperSalary / record.employeeIds.length : null);
                              return (
                                <div key={empId} className="flex items-center justify-between gap-3 text-xs bg-background/50 border border-border/20 px-2 py-1 rounded-md">
                                  <span className="font-medium text-muted-foreground">{emp ? emp.name : "Неизвестный"}</span>
                                  {indSal !== null ? (
                                    <span className="font-bold text-foreground">{indSal.toFixed(2)} BYN</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">Процент</span>
                                  )}
                                </div>
                              );
                            })}
                            {(record.manualWrapperSalary || record.individualSalaries) && (
                               <div className="mt-1 pt-1 border-t border-border/50 text-[10px] font-bold text-muted-foreground text-right">
                                  Всего ЗП: {((record.manualWrapperSalary || 0) + Object.values(record.individualSalaries || {}).reduce((s, v) => s + (v as number || 0), 0) || 0).toFixed(2)} BYN
                               </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Нет исполнителей</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="w-8 h-8 opacity-30 text-primary mx-auto mb-2" />
            <p className="font-semibold text-sm">Услуг не найдено</p>
            <p className="text-xs mt-1">Попробуйте выбрать другой период</p>
          </div>
        )}
      </div>

      {isEditModalOpen && selectedRecord && (
        <EditCarWashModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
          employeeRoles={
            dailyRoles[typeof selectedRecord.date === "string" ? selectedRecord.date : (selectedRecord.date as any).toISOString().slice(0, 10)] || {}
          }
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default ServicesPage;
