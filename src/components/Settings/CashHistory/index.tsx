import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    Filter,
    ArrowRightLeft,
    TrendingDown,
    TrendingUp,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import {
    filterReportsByTime,
    aggregateCashData,
    extractAllModifications,
    TimeFilter,
} from "./utils";
import { ShiftAccordion } from "./components/ShiftAccordion";
import { TransactionList } from "./components/TransactionList";
import { exportCashHistoryToCSV } from "./export";
import { FileDown } from "lucide-react";

export const CashHistoryDashboard: React.FC = () => {
    const { state } = useAppContext();
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
    const [activeTab, setActiveTab] = useState<"shifts" | "modifications">("shifts");
    const [modTypeFilter, setModTypeFilter] = useState<"all" | "in" | "out">("all");

    // Core data preparation
    const reportsList = Object.values(state.dailyReports).sort(
        (a, b) => parseISO(b.date as string).getTime() - parseISO(a.date as string).getTime()
    );

    const shifts = reportsList.filter(r => r.cashState);

    const [searchQuery, setSearchQuery] = useState("");

    // Apply time filters
    const filteredShifts = useMemo(() => filterReportsByTime(shifts, timeFilter), [shifts, timeFilter]);

    const allModifications = useMemo(() => extractAllModifications(filteredShifts), [filteredShifts]);

    // Aggregate Data for KPIs
    const kpiData = useMemo(() => aggregateCashData(filteredShifts), [filteredShifts]);

    const handleExport = () => {
        exportCashHistoryToCSV(filteredShifts, allModifications, timeFilter);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header & Filters */}
            <div className="flex flex-col xl:flex-row justify-between gap-4 bg-card border border-border/50 rounded-2xl p-6">
                 <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-primary" />
                        Аналитика денежных потоков
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Детализированный учет кассовых смен и транзакций
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-muted/40 p-1 rounded-xl items-center border border-border/50">
                        <Calendar className="w-4 h-4 ml-3 text-muted-foreground hidden sm:block" />
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer pr-4 pl-2 py-1.5 outline-none"
                        >
                            <option value="all">За всё время</option>
                            <option value="today">Сегодня</option>
                            <option value="yesterday">Вчера</option>
                            <option value="this_week">Последние 7 дней</option>
                            <option value="this_month">Этот месяц</option>
                            <option value="last_month">Прошлый месяц</option>
                        </select>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-xl text-sm font-medium border border-primary/20"
                    >
                        <FileDown className="w-4 h-4" />
                        Экспорт CSV
                    </button>

                    <div className="flex bg-muted/40 p-1 rounded-xl items-center border border-border/50">
                        <button
                            onClick={() => setActiveTab("shifts")}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === "shifts" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                        >
                            Книга смен
                        </button>
                        <button
                            onClick={() => setActiveTab("modifications")}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === "modifications" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                        >
                            Транзакции
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border/50 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowUpRight className="w-16 h-16 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Поступления наличных</p>
                    <p className="text-2xl font-bold text-green-600">+{kpiData.totalCashIncome.toFixed(2)} <span className="text-sm">BYN</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Услуги + Внесения</p>
                </div>

                <div className="bg-card border border-border/50 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowDownLeft className="w-16 h-16 text-red-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Расходы из кассы</p>
                    <p className="text-2xl font-bold text-red-500">-{kpiData.totalCashOutcome.toFixed(2)} <span className="text-sm">BYN</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Без учета ЗП и инкассации</p>
                </div>

                <div className="bg-card border border-border/50 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingDown className="w-16 h-16 text-amber-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Выплачено ЗП</p>
                    <p className="text-2xl font-bold text-amber-500">-{kpiData.totalSalaryPayouts.toFixed(2)} <span className="text-sm">BYN</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Наличными сотрудникам</p>
                </div>

                <div className={`bg-card border border-border/50 p-5 rounded-2xl relative overflow-hidden ${
                    kpiData.totalDiscrepancy < 0 ? 'bg-red-500/5 border-red-500/20' :
                    kpiData.totalDiscrepancy > 0 ? 'bg-green-500/5 border-green-500/20' : ''
                }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {kpiData.totalDiscrepancy < 0 ? <AlertTriangle className="w-16 h-16 text-red-500" /> :
                         kpiData.totalDiscrepancy > 0 ? <TrendingUp className="w-16 h-16 text-green-500" /> :
                         <CheckCircle2 className="w-16 h-16 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Общая разница касс</p>
                    <p className={`text-2xl font-bold ${
                        kpiData.totalDiscrepancy < 0 ? "text-red-500" :
                        kpiData.totalDiscrepancy > 0 ? "text-green-600" : "text-foreground"
                    }`}>
                        {kpiData.totalDiscrepancy > 0 ? "+" : ""}{kpiData.totalDiscrepancy.toFixed(2)} <span className="text-sm">BYN</span>
                    </p>
                    <div className="flex gap-3 text-xs mt-2 font-medium">
                        <span className="text-red-500">Недостачи: {kpiData.shiftsWithShortage}</span>
                        <span className="text-green-600">Излишки: {kpiData.shiftsWithSurplus}</span>
                    </div>
                </div>
            </div>

            {/* List Section */}
             <div className="bg-card border border-border/50 rounded-2xl flex flex-col flex-1 min-h-[500px] p-6 shadow-sm overflow-hidden">
                {activeTab === "shifts" ? (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                             {filteredShifts.length === 0 ? (
                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                                    <Wallet className="w-12 h-12 text-muted/30 mb-3" />
                                    <p>Нет данных о закрытых сменах за период</p>
                                </div>
                             ) : (
                                <div className="space-y-3 pb-4">
                                    {filteredShifts.map((report) => (
                                        <ShiftAccordion key={report.id} report={report} state={state} />
                                    ))}
                                </div>
                             )}
                        </div>
                    </div>
                ) : (
                    <TransactionList
                        transactions={allModifications}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        modTypeFilter={modTypeFilter}
                        setModTypeFilter={setModTypeFilter}
                    />
                )}
             </div>
        </div>
    );
};
