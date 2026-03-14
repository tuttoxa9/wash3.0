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
        <div className="flex flex-col h-full bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-border/50 bg-background/50">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        Аналитика кассы
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-background border border-border/50 rounded-lg px-2 py-1 shadow-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer pl-2 pr-4 py-1 outline-none text-foreground"
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
                        className="flex items-center gap-2 px-3 py-2 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-lg text-sm font-medium"
                    >
                        <FileDown className="w-4 h-4" />
                        <span className="hidden sm:inline">Экспорт</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/50 border-b border-border/50 bg-background/20">
                <div className="p-4 sm:p-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium uppercase tracking-wider">Поступления</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{kpiData.totalCashIncome.toFixed(2)} <span className="text-sm text-muted-foreground font-normal">BYN</span></p>
                </div>

                <div className="p-4 sm:p-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <ArrowDownLeft className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-medium uppercase tracking-wider">Изъятия</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{kpiData.totalCashOutcome.toFixed(2)} <span className="text-sm text-muted-foreground font-normal">BYN</span></p>
                </div>

                <div className="p-4 sm:p-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <TrendingDown className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium uppercase tracking-wider">Выплачено ЗП</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{kpiData.totalSalaryPayouts.toFixed(2)} <span className="text-sm text-muted-foreground font-normal">BYN</span></p>
                </div>

                <div className={`p-4 sm:p-5 flex flex-col ${kpiData.totalDiscrepancy !== 0 ? 'bg-muted/10' : ''}`}>
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        {kpiData.totalDiscrepancy < 0 ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                         kpiData.totalDiscrepancy > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> :
                         <CheckCircle2 className="w-4 h-4 text-primary" />}
                        <span className="text-xs font-medium uppercase tracking-wider">Разница касс</span>
                    </div>
                    <p className={`text-xl font-bold ${
                        kpiData.totalDiscrepancy < 0 ? "text-red-500" :
                        kpiData.totalDiscrepancy > 0 ? "text-green-500" : "text-foreground"
                    }`}>
                        {kpiData.totalDiscrepancy > 0 ? "+" : ""}{kpiData.totalDiscrepancy.toFixed(2)} <span className="text-sm opacity-70 font-normal">BYN</span>
                    </p>
                </div>
            </div>

            {/* List & Tabs */}
             <div className="flex flex-col flex-1 min-h-[500px] p-6">
                <div className="flex items-center border-b border-border mb-6">
                    <button
                        onClick={() => setActiveTab("shifts")}
                        className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === "shifts"
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Книга смен
                    </button>
                    <button
                        onClick={() => setActiveTab("modifications")}
                        className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === "modifications"
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Все транзакции
                    </button>
                </div>

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
