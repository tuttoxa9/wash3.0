import React, { useState, useEffect, useRef } from "react";
import { 
  Archive, 
  HelpCircle, 
  Calendar, 
  Search, 
  DollarSign, 
  Check, 
  Loader2, 
  AlertCircle, 
  User, 
  ArrowRight,
  TrendingUp,
  Scissors
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService } from "@/lib/services/supabaseService";
import type { CarWashRecord, DailyReport } from "@/lib/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

interface WrapRowProps {
  record: CarWashRecord;
  reportId: string;
  employees: Array<{ id: string; name: string }>;
  employeeRoles: Record<string, any>;
  onUpdateSuccess: (date: string, updatedRecord: CarWashRecord) => void;
}

const WrapRow: React.FC<WrapRowProps> = ({ 
  record, 
  reportId, 
  employees, 
  employeeRoles,
  onUpdateSuccess 
}) => {
  const [val, setVal] = useState<string>(
    record.manualWrapperSalary !== undefined && record.manualWrapperSalary !== null 
      ? String(record.manualWrapperSalary) 
      : ""
  );
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const initialValRef = useRef(val);

  useEffect(() => {
    const currentVal = record.manualWrapperSalary !== undefined && record.manualWrapperSalary !== null 
      ? String(record.manualWrapperSalary) 
      : "";
    setVal(currentVal);
    initialValRef.current = currentVal;
  }, [record.manualWrapperSalary]);

  const handleSave = async () => {
    if (val === initialValRef.current) return;
    
    const num = Number.parseFloat(val);
    if (val !== "" && (isNaN(num) || num < 0)) {
      toast.error("Введите корректную сумму зарплаты");
      setStatus("error");
      return;
    }

    setStatus("saving");
    const updatedSalary = val === "" ? undefined : num;
    const updatedRecord: CarWashRecord = {
      ...record,
      manualWrapperSalary: updatedSalary
    };

    try {
      // 1. Сохраняем в Supabase car_wash_records
      const successDb = await carWashService.update(updatedRecord);
      if (!successDb) throw new Error("Failed to update record in DB");

      // 2. Обновляем запись в ежедневном отчете
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

      toast.success(`Зарплата за оклейку ${record.carInfo} успешно сохранена`);
      setStatus("success");
      initialValRef.current = val;
      
      // Вызываем коллбек для обновления глобального стейта
      onUpdateSuccess(reportId, updatedRecord);

      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Error saving manual wrap salary:", error);
      toast.error("Не удалось сохранить изменения");
      setStatus("error");
    }
  };

  const getStatusBadge = () => {
    const isPaid = record.manualWrapperSalary !== undefined && record.manualWrapperSalary > 0;
    if (isPaid) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
          <Check className="w-3 h-3" />
          Рассчитано
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit animate-pulse">
        <AlertCircle className="w-3 h-3" />
        Укажите ЗП
      </span>
    );
  };

  // Получаем имена исполнителей
  const getExecutors = () => {
    if (!record.employeeIds || record.employeeIds.length === 0) {
      return <span className="text-xs text-muted-foreground italic">Исполнители не выбраны</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {record.employeeIds.map((id) => {
          const emp = employees.find((e) => e.id === id);
          const role = employeeRoles[id] || "washer";
          const roleBadgeColor = 
            role === "admin" 
              ? "bg-green-500/10 text-green-400 border-green-500/20" 
              : "bg-blue-500/10 text-blue-400 border-blue-500/20";
          
          return (
            <span 
              key={id} 
              className={`px-2 py-0.5 rounded-lg text-xs font-medium border flex items-center gap-1 ${roleBadgeColor}`}
            >
              <User className="w-2.5 h-2.5" />
              {emp ? emp.name : `Сотрудник ID ${id.slice(0,4)}`}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <tr className={`border-b border-border/40 hover:bg-muted/10 transition-colors ${
      record.manualWrapperSalary !== undefined && record.manualWrapperSalary > 0 
        ? "" 
        : "bg-amber-500/[0.015]"
    }`}>
      {/* Дата и время */}
      <td className="p-3 text-sm align-middle whitespace-nowrap">
        <div className="font-medium text-foreground">
          {format(parseISO(typeof record.date === "string" ? record.date : (record.date as any).toISOString()), "dd.MM.yyyy")}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{record.time}</div>
      </td>

      {/* Автомобиль */}
      <td className="p-3 text-sm align-middle font-semibold text-foreground">
        {record.carInfo}
      </td>

      {/* Услуга */}
      <td className="p-3 text-sm align-middle">
        <div className="font-medium text-foreground">{record.service}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Выполнение работы
        </div>
      </td>

      {/* Общая стоимость */}
      <td className="p-3 text-sm align-middle font-bold text-foreground text-right whitespace-nowrap">
        {record.price.toFixed(2)} BYN
      </td>

      {/* Исполнители */}
      <td className="p-3 text-sm align-middle">
        {getExecutors()}
      </td>

      {/* Статус */}
      <td className="p-3 text-sm align-middle">
        {getStatusBadge()}
      </td>

      {/* Зарплата (Редактируемое поле) */}
      <td className="p-3 text-sm align-middle text-right min-w-[140px]">
        <div className="flex items-center justify-end gap-2 relative">
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="0.00"
              className={`w-24 px-2.5 py-1.5 bg-zinc-900 border text-sm font-semibold rounded-xl text-right focus:outline-none focus:ring-2 transition-all ${
                status === "success" 
                  ? "border-emerald-500 focus:ring-emerald-500/25 text-emerald-400" 
                  : status === "error" 
                    ? "border-destructive focus:ring-destructive/25 text-destructive"
                    : "border-border hover:border-muted-foreground/30 focus:border-primary focus:ring-primary/25 text-foreground"
              }`}
            />
            <span className="text-xs font-semibold text-muted-foreground ml-1.5">BYN</span>
          </div>

          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {status === "saving" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            {status === "success" && <Check className="w-4 h-4 text-emerald-400" />}
            {status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
          </div>
        </div>
      </td>
    </tr>
  );
};

const WrapsPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  
  // Вычисляем период текущего месяца
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Spotlight / Подсказка для тура
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("detail_lab_wraps_tour_completed");
    if (!completed) {
      setShowTips(true);
    }
  }, []);

  const handleDismissTips = () => {
    localStorage.setItem("detail_lab_wraps_tour_completed", "true");
    setShowTips(false);
  };

  // Собираем все отчеты
  const reportsList = Object.values(state.dailyReports);

  // Фильтруем записи по типу wrap_execution и дате в интервале выбранного месяца
  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  const wrapRecords: Array<{ record: CarWashRecord; reportId: string; employeeRoles: Record<string, any> }> = [];

  reportsList.forEach((report) => {
    const reportDate = typeof report.date === "string" ? parseISO(report.date) : new Date(report.date);
    
    if (isWithinInterval(reportDate, { start: startDate, end: endDate })) {
      const execs = report.records.filter((rec) => rec.serviceType === "wrap_execution");
      execs.forEach((record) => {
        wrapRecords.push({
          record,
          reportId: report.id,
          employeeRoles: report.dailyEmployeeRoles || {}
        });
      });
    }
  });

  // Сортировка отчетов/оклейк по дате и времени (от новых к старым)
  wrapRecords.sort((a, b) => {
    const dateA = typeof a.record.date === "string" ? a.record.date : (a.record.date as any).toISOString().slice(0,10);
    const dateB = typeof b.record.date === "string" ? b.record.date : (b.record.date as any).toISOString().slice(0,10);
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return b.record.time.localeCompare(a.record.time);
  });

  // Фильтрация по поисковому запросу
  const filteredWraps = wrapRecords.filter(({ record }) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      record.carInfo.toLowerCase().includes(query) ||
      record.service.toLowerCase().includes(query)
    );
  });

  // Статистика
  const totalWrapsCount = filteredWraps.length;
  const unpaidWrapsCount = filteredWraps.filter(
    ({ record }) => record.manualWrapperSalary === undefined || record.manualWrapperSalary === 0
  ).length;
  
  const totalWrapsSalarySum = filteredWraps.reduce(
    (sum, { record }) => sum + (record.manualWrapperSalary || 0), 
    0
  );

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
      {/* Элегантная шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-primary rounded-full"></div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent flex items-center gap-2">
            <Scissors className="w-7 h-7 text-indigo-500 animate-pulse" />
            Оклейки и Сдельная ЗП
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Постоплата выполненных работ по оклейке кузова и стекол.
          </p>
        </div>

        {/* Выбор периода */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-border/50 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground touch-manipulation active:scale-95"
          >
            &larr;
          </button>
          <div className="text-sm font-semibold px-3 flex items-center gap-2 text-foreground whitespace-nowrap">
            <Calendar className="w-4 h-4 text-indigo-400" />
            {format(selectedMonth, "LLLL yyyy", { locale: ru })}
          </div>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground touch-manipulation active:scale-95"
            disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Окно подсказки о новом разделе */}
      <AnimatePresence>
        {showTips && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="p-5 bg-gradient-to-r from-zinc-900 to-indigo-950/20 border border-indigo-500/25 rounded-2xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none"></div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 shrink-0">
                <HelpCircle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  Новый раздел «Оклейки» успешно добавлен!
                </h3>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Поскольку условия по ЗП для оклеек часто согласуются после выполнения, в этом разделе собраны все фактически выполненные оклейки кузова. 
                  Укажите здесь **фиксированную сумму зарплаты за работу** во встроенном поле. Оплата сразу разделится поровну между всеми исполнителями, 
                  учтется в их общей зарплате и отобразится во всех финансовых показателях и отчетах.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissTips}
              className="px-4 py-2 bg-indigo-500 text-white font-semibold text-xs rounded-xl hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/15 whitespace-nowrap self-end md:self-center"
            >
              Отлично, понятно!
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Карточки аналитики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Карточка 1 */}
        <div className="p-4 bg-zinc-900 border border-border/40 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-border transition-colors">
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Выполнено оклеек</span>
            <div className="text-2xl font-black text-foreground">{totalWrapsCount}</div>
          </div>
          <div className="p-3 bg-zinc-800 rounded-xl text-muted-foreground group-hover:text-foreground transition-colors">
            <Archive className="w-5 h-5" />
          </div>
        </div>

        {/* Карточка 2 */}
        <div className="p-4 bg-zinc-900 border border-border/40 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-border transition-colors">
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Требует ввода ЗП</span>
            <div className="text-2xl font-black text-foreground flex items-center gap-2">
              {unpaidWrapsCount}
              {unpaidWrapsCount > 0 && (
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl transition-colors ${unpaidWrapsCount > 0 ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-muted-foreground"}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Карточка 3 */}
        <div className="p-4 bg-zinc-900 border border-border/40 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-border transition-colors">
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Общий фонд ЗП</span>
            <div className="text-2xl font-black text-foreground">{totalWrapsSalarySum.toFixed(2)} BYN</div>
          </div>
          <div className="p-3 bg-zinc-800 rounded-xl text-muted-foreground group-hover:text-foreground transition-colors">
            <DollarSign className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Поиск и Фильтрация в таблице */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-border/30">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по гос. номеру автомобиля или названию услуги..."
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
                <th className="p-3">Дата завершения</th>
                <th className="p-3">Автомобиль</th>
                <th className="p-3">Услуга</th>
                <th className="p-3 text-right">Стоимость</th>
                <th className="p-3">Исполнители</th>
                <th className="p-3">Статус расчета</th>
                <th className="p-3 text-right">Зарплата за работу</th>
              </tr>
            </thead>
            <tbody>
              {filteredWraps.length > 0 ? (
                filteredWraps.map(({ record, reportId, employeeRoles }) => (
                  <WrapRow 
                    key={record.id}
                    record={record}
                    reportId={reportId}
                    employees={state.employees}
                    employeeRoles={employeeRoles}
                    onUpdateSuccess={handleUpdateSuccess}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Archive className="w-8 h-8 opacity-30 text-indigo-500" />
                      <p className="font-semibold text-xs">Выполненных оклеек не найдено</p>
                      <p className="text-[10px] text-muted-foreground/75">
                        Убедитесь, что были добавлены услуги «Оклейка - исполнение» за этот период.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WrapsPage;
