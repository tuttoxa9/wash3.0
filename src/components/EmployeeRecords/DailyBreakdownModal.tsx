import { useAppContext } from "@/lib/context/AppContext";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { BarChart3, Calendar, X, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import type React from "react";
import LegacyModal from "@/components/ui/LegacyModal";
import type { DailyBreakdownModalProps } from "./types";
import { getPaymentMethodColor, getPaymentMethodLabel } from "./utils";

const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  employee,
  groupedRecords,
  sortedDates,
  periodLabel,
  calculateEmployeeEarnings,
  calculateDaySalary,
  onDayClick,
  selectedDate,
  selectedDateRecords,
  showAnalyticsButton = false,
  onAnalyticsClick,
  onPayoutHistoryClick,
}) => {
  const { state } = useAppContext();

  if (!isOpen) return null;

  return (
    <LegacyModal isOpen={isOpen} onClose={onClose} className="md:max-w-5xl">
      <div className="flex h-full overflow-hidden">
        <div
          className="w-full max-w-7xl mx-auto flex flex-col md:flex-row h-full"
        >
          {/* Левая панель - список дней */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Дни работы: {employee.name}
              </h2>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {sortedDates.map((date) => {
                  const dayRecords = groupedRecords[date];
                  const dayEarnings = calculateDaySalary ? calculateDaySalary(date) : dayRecords.reduce(
                    (sum, record) =>
                      sum + calculateEmployeeEarnings(record, employee.id),
                    0,
                  );
                  const dayRevenue = dayRecords.reduce(
                    (sum, record) =>
                      sum + record.price,
                    0,
                  );

                  return (
                    <div
                      key={date}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedDate === date
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/20 border-border hover:bg-muted/40"
                      }`}
                      onClick={() => onDayClick(date, dayRecords)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-foreground">
                            {format(parseISO(date), "dd MMMM yyyy", {
                              locale: ru,
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {dayRecords.length > 0 ? `${dayRecords.length} записей` : "Нет лично выполненных услуг"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            +{dayEarnings.toFixed(2)} BYN
                          </div>
                          {dayRecords.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              на {dayRevenue.toFixed(2)} BYN
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Правая панель - детали выбранного дня */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedDate
                    ? format(parseISO(selectedDate), "dd MMMM yyyy", {
                        locale: ru,
                      })
                    : "Выберите день"}
                </h2>
                {selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDateRecords.length} записей
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onPayoutHistoryClick && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onPayoutHistoryClick}
                    className="px-2 py-1.5 rounded-md font-medium text-sm transition-colors bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
                    title="История выплат"
                  >
                    <Wallet className="w-4 h-4" />
                  </motion.button>
                )}
                {showAnalyticsButton && onAnalyticsClick && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAnalyticsClick}
                    className="px-3 py-1.5 rounded-md font-medium text-sm transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                  >
                    <BarChart3 className="w-4 h-4 mr-1 inline" />
                    Аналитика
                  </motion.button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {selectedDate && selectedDateRecords.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-lg bg-muted/20 border border-border"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm mb-1">
                            <span className="text-muted-foreground">
                              {record.time || "—"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs border ${getPaymentMethodColor(record.paymentMethod.type, state.theme)}`}
                            >
                              {getPaymentMethodLabel(
                                record.paymentMethod.type,
                                state.organizations,
                                record.paymentMethod.organizationId,
                              )}
                            </span>
                          </div>
                          <div className="font-medium text-sm truncate text-foreground">
                            {record.carInfo}
                          </div>
                          <div className="text-xs truncate text-muted-foreground">
                            {record.service}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm font-bold text-green-600">
                            +
                            {calculateEmployeeEarnings(
                              record,
                              employee.id,
                            ).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            из {record.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedDate ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium text-foreground mb-1">Нет лично выполненных услуг</p>
                    <p className="text-sm">В этот день вы не мыли машины, но заработали процент от общей кассы смены.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Выберите день для просмотра деталей</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LegacyModal>
  );
};

export default DailyBreakdownModal;
