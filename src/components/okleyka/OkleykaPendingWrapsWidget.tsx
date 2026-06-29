import type React from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, Trash2 } from "lucide-react";
import type { CarWashRecord } from "@/lib/types";

interface OkleykaPendingWrapsWidgetProps {
  pendingWraps: { reportId: string; record: CarWashRecord }[];
  onExecute: (reportId: string, record: CarWashRecord, e: React.MouseEvent) => void;
  onDelete: (reportId: string, recordId: string) => void;
}

const OkleykaPendingWrapsWidget: React.FC<OkleykaPendingWrapsWidgetProps> = ({
  pendingWraps,
  onExecute,
  onDelete,
}) => {
  return (
    <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-blue-50 dark:bg-blue-950/20">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
          Ожидают оклейки
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
            {pendingWraps.length}
          </span>
        </h3>
      </div>

      <div className="overflow-y-auto max-h-[300px]">
        {pendingWraps.length > 0 ? (
          pendingWraps.map(({ reportId, record }) => (
            <div
              key={record.id}
              className="p-4 border-b border-border/50 last:border-b-0 hover:bg-accent/5 transition-colors"
            >
              <div className="flex justify-between items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-blue-600/80">
                      {format(parseISO(reportId), "dd.MM")}
                    </span>
                    <span className="font-semibold text-foreground truncate">
                      {record.carInfo}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {record.service}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onDelete(reportId, record.id)}
                    className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors shadow-sm"
                    title="Удалить оклейку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => onExecute(reportId, record, e)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm"
                    title="Исполнить оклейку"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Нет ожидающих оклеек
          </div>
        )}
      </div>
    </div>
  );
};

export default OkleykaPendingWrapsWidget;
