import { useAppContext } from "@/lib/context/AppContext";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import type React from "react";
import LegacyModal from "@/components/ui/LegacyModal";
import type { PaymentMethodDetailModalProps } from "./types";
import { getPaymentMethodLabel } from "./utils";

const PaymentMethodDetailModal: React.FC<PaymentMethodDetailModalProps> = ({
  isOpen,
  onClose,
  paymentMethod,
  records,
  employee,
  periodLabel,
}) => {
  const { state } = useAppContext();

  if (!isOpen) return null;

  return (
    <LegacyModal isOpen={isOpen} onClose={onClose} className="md:max-w-xl">
          {/* Компактный заголовок */}
          <div
            className={`p-3 border-b flex items-center justify-between ${
              state.theme === "dark"
                ? "border-slate-700"
                : state.theme === "black"
                  ? "border-gray-800"
                  : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`p-1 rounded-md transition-colors ${
                  state.theme === "dark"
                    ? "hover:bg-slate-700 text-gray-400"
                    : state.theme === "black"
                      ? "hover:bg-gray-800 text-gray-500"
                      : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
              <div>
                <h2
                  className={`text-lg font-semibold ${
                    state.theme === "dark"
                      ? "text-white"
                      : state.theme === "black"
                        ? "text-gray-100"
                        : "text-gray-900"
                  }`}
                >
                  {getPaymentMethodLabel(paymentMethod, state.organizations)}:{" "}
                  {employee.name}
                </h2>
                <p
                  className={`text-sm ${
                    state.theme === "dark"
                      ? "text-gray-400"
                      : state.theme === "black"
                        ? "text-gray-500"
                        : "text-gray-600"
                  }`}
                >
                  {periodLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-md transition-colors ${
                state.theme === "dark"
                  ? "hover:bg-slate-700 text-gray-400"
                  : state.theme === "black"
                    ? "hover:bg-gray-800 text-gray-500"
                    : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Компактная статистика */}
          <div className="overflow-y-auto max-h-[calc(75vh-80px)] p-3">
            {/* Основные показатели - компактные */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div
                className={`p-2 rounded-md text-center ${
                  state.theme === "dark"
                    ? "bg-slate-800"
                    : state.theme === "black"
                      ? "bg-gray-900"
                      : "bg-gray-50"
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    state.theme === "dark"
                      ? "text-white"
                      : state.theme === "black"
                        ? "text-gray-100"
                        : "text-gray-900"
                  }`}
                >
                  {records.length}
                </div>
                <div
                  className={`text-xs ${
                    state.theme === "dark"
                      ? "text-gray-400"
                      : state.theme === "black"
                        ? "text-gray-500"
                        : "text-gray-600"
                  }`}
                >
                  Машин
                </div>
              </div>

              <div
                className={`p-2 rounded-md text-center ${
                  state.theme === "dark"
                    ? "bg-slate-800"
                    : state.theme === "black"
                      ? "bg-gray-900"
                      : "bg-gray-50"
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    state.theme === "dark"
                      ? "text-white"
                      : state.theme === "black"
                        ? "text-gray-100"
                        : "text-gray-900"
                  }`}
                >
                  {records
                    .reduce(
                      (sum, record) =>
                        sum + calculateEmployeeEarnings(record, employee.id),
                      0,
                    )
                    .toFixed(2)}
                </div>
                <div
                  className={`text-xs ${
                    state.theme === "dark"
                      ? "text-gray-400"
                      : state.theme === "black"
                        ? "text-gray-500"
                        : "text-gray-600"
                  }`}
                >
                  Заработок
                </div>
              </div>

              <div
                className={`p-2 rounded-md text-center ${
                  state.theme === "dark"
                    ? "bg-slate-800"
                    : state.theme === "black"
                      ? "bg-gray-900"
                      : "bg-gray-50"
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    state.theme === "dark"
                      ? "text-white"
                      : state.theme === "black"
                        ? "text-gray-100"
                        : "text-gray-900"
                  }`}
                >
                  {new Set(records.map((r) => r.service)).size}
                </div>
                <div
                  className={`text-xs ${
                    state.theme === "dark"
                      ? "text-gray-400"
                      : state.theme === "black"
                        ? "text-gray-500"
                        : "text-gray-600"
                  }`}
                >
                  Услуг
                </div>
              </div>

              <div
                className={`p-2 rounded-md text-center ${
                  state.theme === "dark"
                    ? "bg-slate-800"
                    : state.theme === "black"
                      ? "bg-gray-900"
                      : "bg-gray-50"
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    state.theme === "dark"
                      ? "text-white"
                      : state.theme === "black"
                        ? "text-gray-100"
                        : "text-gray-900"
                  }`}
                >
                  {records.length > 0
                    ? (
                        records.reduce(
                          (sum, record) =>
                            sum + calculateEmployeeEarnings(record, employee.id),
                          0,
                        ) / records.length
                      ).toFixed(2)
                    : "0"}
                </div>
                <div
                  className={`text-xs ${
                    state.theme === "dark"
                      ? "text-gray-400"
                      : state.theme === "black"
                        ? "text-gray-500"
                        : "text-gray-600"
                  }`}
                >
                  Среднее
                </div>
              </div>
            </div>

            {/* Список записей */}
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-2 rounded-md ${
                    state.theme === "dark"
                      ? "bg-slate-800"
                      : state.theme === "black"
                        ? "bg-gray-900"
                        : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span
                          className={`${
                            state.theme === "dark"
                              ? "text-gray-400"
                              : state.theme === "black"
                                ? "text-gray-500"
                                : "text-gray-600"
                          }`}
                        >
                          {format(
                            parseISO(
                              typeof record.date === "string"
                                ? record.date
                                : format(record.date, "yyyy-MM-dd"),
                            ),
                            "dd.MM.yyyy",
                          )}
                        </span>
                        {record.time && (
                          <span
                            className={`${
                              state.theme === "dark"
                                ? "text-gray-400"
                                : state.theme === "black"
                                  ? "text-gray-500"
                                  : "text-gray-600"
                            }`}
                          >
                            {record.time}
                          </span>
                        )}
                      </div>
                      <div
                        className={`font-medium text-sm truncate ${
                          state.theme === "dark"
                            ? "text-white"
                            : state.theme === "black"
                              ? "text-gray-100"
                              : "text-gray-900"
                        }`}
                      >
                        {record.carInfo}
                      </div>
                      <div
                        className={`text-xs truncate ${
                          state.theme === "dark"
                            ? "text-gray-400"
                            : state.theme === "black"
                              ? "text-gray-500"
                              : "text-gray-500"
                        }`}
                      >
                        {record.service}
                      </div>
                      {record.paymentMethod.organizationName && (
                        <div
                          className={`text-xs truncate ${
                            state.theme === "dark"
                              ? "text-purple-300"
                              : state.theme === "black"
                                ? "text-purple-400"
                                : "text-purple-600"
                          }`}
                        >
                          {record.paymentMethod.organizationName}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-bold text-green-500">
                        {record.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs ${
                          state.theme === "dark"
                            ? "text-gray-400"
                            : state.theme === "black"
                              ? "text-gray-500"
                              : "text-gray-500"
                        }`}
                      >
                        {record.employeeIds.length} сотр.
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
    </LegacyModal>
  );
};

export default PaymentMethodDetailModal;
