import React, { useState } from "react";
import { Plus, Gift, Trash2 } from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { certificateService, dailyReportService } from "@/lib/services/supabaseService";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import SellCertificateModal from "./SellCertificateModal";

import type { Certificate } from "@/lib/types";

interface CertificatesWidgetProps {
  canCreateRecords: boolean;
  selectedDate: string;
  onUseCertificate: (certificate: Certificate, event: React.MouseEvent) => void;
}

const CertificatesWidget: React.FC<CertificatesWidgetProps> = ({
  canCreateRecords,
  selectedDate,
  onUseCertificate,
}) => {
  const { state, dispatch } = useAppContext();
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  const activeCertificates = state.certificates || [];

  const handleDeleteCertificate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Вы уверены, что хотите удалить этот сертификат? Это действие не отменить.")) {
      return;
    }

    try {
      const cert = activeCertificates.find(c => c.id === id);
      const success = await certificateService.delete(id);
      if (success) {
        dispatch({ type: "REMOVE_CERTIFICATE", payload: id });
        toast.success("Сертификат удален");

        // Попытка найти и удалить связанную корректировку кассы в отчете за дату продажи сертификата
        if (cert) {
          const reportDate = cert.date;
          const reportToUpdate = state.dailyReports[reportDate];

          // Если отчет за эту дату загружен в стейт
          if (reportToUpdate && reportToUpdate.cashModifications) {
            const reasonToMatch = `Продажа сертификата: ${cert.service}`;
            const updatedModifications = reportToUpdate.cashModifications.filter(
              m => !(m.reason === reasonToMatch && m.amount === cert.amount)
            );

            if (updatedModifications.length !== reportToUpdate.cashModifications.length) {
              const updatedReport = { ...reportToUpdate, cashModifications: updatedModifications };
              await dailyReportService.updateReport(updatedReport);
              dispatch({
                type: "SET_DAILY_REPORT",
                payload: { date: reportDate, report: updatedReport },
              });
            }
          } else {
            // Если отчета нет в стейте, загружаем его из БД, обновляем и сохраняем
            const reportFromDb = await dailyReportService.getByDate(reportDate);
            if (reportFromDb && reportFromDb.cashModifications) {
              const reasonToMatch = `Продажа сертификата: ${cert.service}`;
              const updatedModifications = reportFromDb.cashModifications.filter(
                m => !(m.reason === reasonToMatch && m.amount === cert.amount)
              );

              if (updatedModifications.length !== reportFromDb.cashModifications.length) {
                const updatedReport = { ...reportFromDb, cashModifications: updatedModifications };
                await dailyReportService.updateReport(updatedReport);
              }
            }
          }
        }
      } else {
        toast.error("Не удалось удалить сертификат");
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка при удалении");
    }
  };

  return (
    <div className="rounded-xl sm:rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden flex flex-col mt-6">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/40 bg-gradient-to-r from-purple-500/10 to-transparent">
        <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-400">
          <Gift className="w-4 h-4" />
          Сертификаты
          {activeCertificates.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-[10px] font-bold">
              {activeCertificates.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => {
            if (!canCreateRecords) {
              toast.info("Сначала выберите работников и начните смену");
              return;
            }
            setIsSellModalOpen(true);
          }}
          disabled={!canCreateRecords}
          className="p-1 sm:p-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/50 transition-colors disabled:opacity-50"
          title={canCreateRecords ? "Продать сертификат" : "Сначала начните смену"}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[300px]">
        {activeCertificates.length > 0 ? (
          <div className="divide-y divide-border/40">
            {activeCertificates.map((cert) => (
              <div
                key={cert.id}
                className={`p-3 transition-colors flex justify-between items-center group ${canCreateRecords ? "cursor-pointer hover:bg-accent/10" : "opacity-70"}`}
                onClick={(e) => {
                  if (canCreateRecords) {
                    onUseCertificate(cert, e);
                  } else {
                    toast.info("Сначала начните смену");
                  }
                }}
                title={canCreateRecords ? "Использовать сертификат" : undefined}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm truncate">{cert.service}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
                      {format(parseISO(cert.date), "dd.MM.yy")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{cert.amount.toFixed(2)} BYN</span>
                    <span>•</span>
                    <span>{cert.paymentMethod === 'cash' ? 'Наличные' : 'Карта'}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteCertificate(cert.id, e)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Удалить сертификат"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-[10px] sm:text-xs px-2 flex flex-col items-center gap-2">
            <Gift className="w-6 h-6 text-muted-foreground/30" />
            <p>Нет активных сертификатов</p>
          </div>
        )}
      </div>

      {isSellModalOpen && (
        <SellCertificateModal
          onClose={() => setIsSellModalOpen(false)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default CertificatesWidget;