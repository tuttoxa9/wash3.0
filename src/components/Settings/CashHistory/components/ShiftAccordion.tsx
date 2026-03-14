import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, AlertTriangle, Briefcase, Wallet, Building, Calendar, Users, FileText } from "lucide-react";
import { DailyReport } from "@/lib/types";
import { AppState } from "@/lib/context/AppContext";
import { getEmployeeName } from "../utils";

interface ShiftAccordionProps {
  report: DailyReport;
  state: AppState;
}

export const ShiftAccordion: React.FC<ShiftAccordionProps> = ({ report, state }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cashState = report.cashState;

  if (!cashState) return null;

  const totalPayouts = Object.values(cashState.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);

  // Calculate specific net mods for this shift
  let shiftModsNet = 0;
  let modsIn = 0;
  let modsOut = 0;
  const cashMods = report.cashModifications?.filter(m => !m.method || m.method === 'cash') || [];

  cashMods.forEach(mod => {
      shiftModsNet += mod.amount;
      if (mod.amount > 0) modsIn += mod.amount;
      else modsOut += Math.abs(mod.amount);
  });

  const expectedCash = cashState.startOfDayCash + report.totalCash + shiftModsNet - totalPayouts - (cashState.transferredToSafe || 0);
  const diff = cashState.actualEndOfDayCash !== undefined ? cashState.actualEndOfDayCash - expectedCash : 0;
  const hasDiff = Math.abs(diff) > 0.01;

  return (
    <div className={`group border-b border-border/50 last:border-none overflow-hidden transition-all duration-200 ${isExpanded ? "bg-muted/5" : "hover:bg-muted/5"}`}>
      {/* Header Row (Collapsed State) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
             <div className="flex items-center gap-2.5">
                 <span className="font-semibold text-foreground flex items-center gap-2">
                    {format(parseISO(report.date as string), "dd.MM.yyyy")}
                 </span>
                 <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cashState.isShiftOpen ? "bg-amber-500" : "bg-green-500"}`}></span>
                    <span className="text-xs font-medium text-muted-foreground">
                        {cashState.isShiftOpen ? "Открыта" : "Закрыта"}
                    </span>
                 </span>
             </div>
             <p className="text-xs text-muted-foreground mt-1.5">
               Остаток на конец: <span className="font-medium text-foreground">{cashState.actualEndOfDayCash !== undefined ? cashState.actualEndOfDayCash.toFixed(2) : "—"} BYN</span>
             </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
            {cashState.actualEndOfDayCash !== undefined && (
                <div className="flex flex-col items-end">
                    <p className="text-xs text-muted-foreground mb-0.5">Разница</p>
                    <div className={`flex items-center gap-1.5 ${
                        diff < -0.01 ? "text-red-500" :
                        diff > 0.01 ? "text-green-500" : "text-muted-foreground"
                    }`}>
                        {hasDiff && diff < -0.01 && <AlertTriangle className="w-3.5 h-3.5" />}
                        <span className="font-bold text-sm">
                            {diff > 0.01 ? "+" : ""}{diff.toFixed(2)} BYN
                        </span>
                    </div>
                </div>
            )}
            <div className="text-muted-foreground p-1 rounded-full group-hover:bg-border/50 transition-colors">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-background/30 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Формула кассы за смену
            </h4>

            <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">На начало дня</span>
                    <span className="font-medium">{cashState.startOfDayCash.toFixed(2)} BYN</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/50 text-green-600">
                    <span>+ Услуги (Наличными)</span>
                    <span className="font-bold">{report.totalCash.toFixed(2)} BYN</span>
                </div>

                {modsIn > 0 && (
                     <div className="flex flex-col py-2 border-b border-border/50">
                        <div className="flex justify-between items-center text-green-600">
                            <span>+ Внесения (Ручные)</span>
                            <span className="font-bold">{modsIn.toFixed(2)} BYN</span>
                        </div>
                        {cashMods.filter(m => m.amount > 0).map(m => (
                            <div key={m.id} className="flex justify-between items-center text-xs mt-1 text-muted-foreground pl-4 border-l-2 border-green-500/30 ml-1">
                                <span>{m.reason}</span>
                                <span>{m.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {modsOut > 0 && (
                     <div className="flex flex-col py-2 border-b border-border/50">
                        <div className="flex justify-between items-center text-red-500">
                            <span>- Изъятия (Ручные)</span>
                            <span className="font-bold">{modsOut.toFixed(2)} BYN</span>
                        </div>
                        {cashMods.filter(m => m.amount < 0).map(m => (
                            <div key={m.id} className="flex justify-between items-center text-xs mt-1 text-muted-foreground pl-4 border-l-2 border-red-500/30 ml-1">
                                <span>{m.reason}</span>
                                <span>{Math.abs(m.amount).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col py-2 border-b border-border/50">
                    <div className="flex justify-between items-center text-amber-500">
                        <span>- Выплачено ЗП</span>
                        <span className="font-bold">{totalPayouts.toFixed(2)} BYN</span>
                    </div>
                    {Object.entries(cashState.salaryPayouts || {}).map(([empId, amount]) => (
                        <div key={empId} className="flex justify-between items-center text-xs mt-1 text-muted-foreground pl-4 border-l-2 border-amber-500/30 ml-1">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3 h-3" />
                                {getEmployeeName(empId, state)}
                            </span>
                            <span>{amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {cashState.transferredToSafe && cashState.transferredToSafe > 0 && (
                     <div className="flex justify-between items-center py-2 border-b border-border/50 text-blue-500">
                        <span className="flex items-center gap-1.5"><Building className="w-4 h-4" /> - Перевод в сейф</span>
                        <span className="font-bold">{cashState.transferredToSafe.toFixed(2)} BYN</span>
                    </div>
                )}

                <div className="flex justify-between items-center py-3 bg-muted/30 px-3 rounded-lg mt-2">
                    <span className="font-medium text-foreground">= Расчетный остаток (Ожидается)</span>
                    <span className="font-bold text-base">{expectedCash.toFixed(2)} BYN</span>
                </div>

                {cashState.actualEndOfDayCash !== undefined && (
                     <div className="flex justify-between items-center py-3 px-3 rounded-lg border border-border bg-background mt-2">
                        <span className="font-bold text-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary" />
                            Фактически в кассе
                        </span>
                        <span className="font-black text-lg">{cashState.actualEndOfDayCash.toFixed(2)} BYN</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
