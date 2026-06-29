import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { OkleykaPreShiftScreen } from "@/components/okleyka/OkleykaPreShiftScreen";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import OkleykaCashStateWidget from "@/components/okleyka/OkleykaCashStateWidget";
import OkleykaPendingWrapsWidget from "@/components/okleyka/OkleykaPendingWrapsWidget";
import OkleykaTimelineWidget from "@/components/okleyka/OkleykaTimelineWidget";
import OkleykaMonthCalendarModal from "@/components/okleyka/OkleykaMonthCalendarModal";
import { Loader2, ArrowRight } from "lucide-react";

import {
  okleykaShiftService,
  okleykaOrderService,
  okleykaDebtService,
  okleykaAppointmentService,
} from "@/lib/services/okleykaService";
import type {
  OkleykaShift,
  OkleykaOrder,
  OkleykaDebt,
  OkleykaAppointment,
  OkleykaCashModification,
  OkleykaPaymentMethod,
  OkleykaEmployee,
} from "@/lib/types/okleyka";
import { dailyReportService } from "@/lib/services/supabaseService";
import {
  Play,
  UserPlus,
  Coins,
  ArrowUp,
  ArrowDown,
  Plus,
  Calendar,
  Warning,
  Clock,
  Check,
  X,
  Users,
  ShieldCheck,
  ListBullets,
  ArrowCircleUpRight,
  Backspace,
  Info,
  Gear,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import AddOrderModal from "@/components/okleyka/AddOrderModal";
import CompleteOrderModal from "@/components/okleyka/CompleteOrderModal";
import EditOrderModal from "@/components/okleyka/EditOrderModal";
import MessengerLinks from "@/components/okleyka/MessengerLinks";
import OkleykaDailyReportModal from "@/components/okleyka/OkleykaDailyReportModal";

// ── Simple DatePicker stub to avoid importing DayPicker which can be complex ──
const CustomDatePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-white font-medium"
    />
  );
};

// ── Payouts Modal ────────────────────────────────────────────────────────
const PayoutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  maxAmount: number;
  onPaid: (amount: number) => void;
}> = ({ isOpen, onClose, employeeId, employeeName, maxAmount, onPaid }) => {
  const [amount, setAmount] = useState(maxAmount.toString());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
        <h3 className="font-bold text-base text-white mb-2">Выплата зарплаты</h3>
        <p className="text-xs text-white/50 mb-4">{employeeName}</p>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-white/40 block mb-1 font-semibold uppercase">Сумма к выплате (Баланс: {maxAmount} BYN)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-white/70 hover:bg-zinc-800 text-xs font-semibold"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                const val = Number(amount);
                if (val <= 0) { toast.error("Неверная сумма"); return; }
                onPaid(val);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-primary text-white hover:bg-primary text-xs font-semibold"
            >
              Выплатить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Edit Crew Modal ────────────────────────────────────────────────────────
const EditCrewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  shift: OkleykaShift;
  employees: OkleykaEmployee[];
  onSave: (employeeIds: string[], employeeRoles: Record<string, "admin" | "installer">) => void;
}> = ({ isOpen, onClose, shift, employees, onSave }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(shift.employeeIds);
  const [roles, setRoles] = useState<Record<string, "admin" | "installer">>(shift.employeeRoles || {});
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const active = prev.includes(id);
      if (active) {
        return prev.filter((x) => x !== id);
      } else {
        if (!roles[id]) {
          setRoles((prevRoles) => ({ ...prevRoles, [id]: "installer" }));
        }
        return [...prev, id];
      }
    });
  };

  const handleSetRole = (id: string, role: "admin" | "installer") => {
    setRoles((prev) => ({ ...prev, [id]: role }));
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }
    setSaving(true);
    try {
      const rolesMap: Record<string, "admin" | "installer"> = {};
      selectedIds.forEach((id) => {
        rolesMap[id] = roles[id] || "installer";
      });
      await onSave(selectedIds, rolesMap);
      onClose();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border/50 p-6 rounded-3xl w-full max-w-xl flex flex-col gap-6 max-h-[90vh] shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div>
            <h3 className="font-bold text-xl text-foreground">Изменить состав смены</h3>
            <p className="text-xs text-muted-foreground mt-1">Добавление/удаление сотрудников и смена ролей</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-2">
          {employees.map((employee) => {
            const isSelected = selectedIds.includes(employee.id);
            const currentRole = roles[employee.id] || "installer";

            return (
              <div
                key={employee.id}
                className={`relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-background border-border hover:border-border/80 hover:bg-accent/5"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-input bg-background"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isSelected}
                    onChange={() => handleToggle(employee.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate transition-colors ${
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {employee.name}
                    </p>
                  </div>
                </label>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isSelected ? "max-h-24 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center bg-background rounded-lg border border-border/50 p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetRole(employee.id, "installer");
                        }}
                        className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                          currentRole === "installer"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        Оклейщик
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetRole(employee.id, "admin");
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                          currentRole === "admin"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        Админ
                      </button>
                    </div>

                    {/* Min Payment Toggle */}
                    <label className="flex items-center gap-2 px-1 py-0.5 cursor-pointer group w-fit">
                      <div
                        className={`flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-colors ${
                          (roles as any)?.[`min_${employee.id}`] !== false
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background"
                        }`}
                      >
                        {(roles as any)?.[`min_${employee.id}`] !== false && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={(roles as any)?.[`min_${employee.id}`] !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          setRoles({
                            ...roles,
                            [`min_${employee.id}`]: e.target.checked ? true : false,
                          } as any);
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors select-none">
                        Учитывать минималку
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary text-white hover:bg-primary text-xs font-semibold disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Close Debt Modal ───────────────────────────────────────────────────────
const OkleykaCloseDebtModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  debt: OkleykaDebt | null;
  organizations: { id: string; name: string }[];
  onClosed: () => void;
}> = ({ isOpen, onClose, debt, organizations, onClosed }) => {
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "organization">("cash");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const pm: OkleykaPaymentMethod = {
        type: payMethod,
        organizationId: payMethod === "organization" ? selectedOrgId : undefined,
        organizationName: payMethod === "organization" ? organizations.find(o => o.id === selectedOrgId)?.name : undefined,
      };

      const success = await okleykaDebtService.close(debt.id, pm, {});
      if (success) {
        toast.success("Долг успешно закрыт");
        onClosed();
        onClose();
      } else {
        toast.error("Не удалось закрыть долг");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
        <h3 className="font-bold text-base text-white mb-2">Закрытие долга</h3>
        <p className="text-xs text-white/50 mb-4">{debt.carInfo} ({debt.amount} BYN)</p>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(["cash", "card", "organization"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayMethod(m)}
                className={`flex-1 py-2.5 rounded-xl border text-[11px] font-bold capitalize transition-all ${
                  payMethod === m
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-zinc-900 border-zinc-800 text-white/40 hover:text-white/60"
                }`}
              >
                {m === "cash" ? "Наличные" : m === "card" ? "Карта" : "Орг."}
              </button>
            ))}
          </div>

          {payMethod === "organization" && (
            <div>
              <label className="text-[10px] text-white/40 block mb-1 font-semibold uppercase">Организация</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-white/70 hover:bg-zinc-800 text-xs font-semibold"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-primary text-white hover:bg-primary text-xs font-semibold disabled:opacity-40"
            >
              Подтвердить
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ── Main Home Page ─────────────────────────────────────────────────────────
const OkleykaHomePage: React.FC = () => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isShiftSectionHighlighted, setIsShiftSectionHighlighted] = useState(false);
  const [previousDayCash, setPreviousDayCash] = useState<number | undefined>(undefined);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const shiftSectionRef = useRef<HTMLDivElement | null>(null);

  // Fetch previous day cash balance
  useEffect(() => {
    const fetchPreviousDayCash = async () => {
      try {
        const { data, error } = await supabase
          .from("okleyka_shifts")
          .select("*")
          .lt("date", selectedDate)
          .order("date", { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          const prev = data[0];
          setPreviousDayCash(prev.actual_end_cash !== null ? Number(prev.actual_end_cash) : undefined);
        } else {
          setPreviousDayCash(undefined);
        }
      } catch (e) {
        console.error("Error fetching previous shift cash:", e);
        setPreviousDayCash(undefined);
      }
    };
    fetchPreviousDayCash();
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(format(date, "yyyy-MM-dd"));
      setIsCalendarOpen(false);
    }
  };
  const { state, dispatch, refreshShift, refreshOrders, refreshDebts, refreshUnpaidCount } = useOkleykaContext();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [shiftEmployees, setShiftEmployees] = useState<string[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<Record<string, "admin" | "installer">>({});
  const [startCash, setStartCash] = useState("0");
  const [opening, setOpening] = useState(false);

  // Active state modals
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [addOrderDate, setAddOrderDate] = useState<string | undefined>(undefined);
  const [activeBoxNum, setActiveBoxNum] = useState<1 | 2>(1);
  const [completeOrderOpen, setCompleteOrderOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OkleykaOrder | null>(null);

  const [pendingWraps, setPendingWraps] = useState<any[]>([]);

  // Load pending wraps
  useEffect(() => {
    const loadPendingWraps = async () => {
      try {
        const reports = await dailyReportService.getActiveWraps();
        const wraps: any[] = [];
        reports.forEach((report: any) => {
          report.records.forEach((record: any) => {
            if (record.serviceType === "wrap_sale" && !record.isExecuted) {
              wraps.push({ reportId: report.id, record });
            }
          });
        });
        setPendingWraps(wraps);
      } catch (e) {
        console.error("Failed to load wraps", e);
      }
    };
    loadPendingWraps();
  }, []);

  // Debts
  const [closeDebtOpen, setCloseDebtOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<OkleykaDebt | null>(null);

  // Cash modifications
  const [modAmount, setModAmount] = useState("");
  const [modReason, setModReason] = useState("");
  const [modType, setModType] = useState<"in" | "out">("in");
  const [modMethod, setModMethod] = useState<"cash" | "card">("cash");

  // Payouts
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutEmployee, setPayoutEmployee] = useState<{ id: string; name: string } | null>(null);
  const [payoutMax, setPayoutMax] = useState(0);
  const [editCrewOpen, setEditCrewOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "card" | "organization" | "debt">("all");
  const [dailyReportOpen, setDailyReportOpen] = useState(false);

  // Timeline State
  const [timelineOrders, setTimelineOrders] = useState<OkleykaOrder[]>([]);
  const [monthCalendarOpen, setMonthCalendarOpen] = useState(false);
  const [actionOrder, setActionOrder] = useState<OkleykaOrder | null>(null);

  const refreshTimeline = useCallback(async (baseDate: string) => {
    const start = baseDate;
    const end = new Date(new Date(baseDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const orders = await okleykaOrderService.getOverlappingForDateRange(start, end);
    setTimelineOrders(orders);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshOrders(selectedDate),
      refreshDebts(),
      refreshUnpaidCount(),
      refreshShift(selectedDate),
      refreshTimeline(selectedDate),
    ]);
  }, [refreshOrders, refreshDebts, refreshUnpaidCount, refreshShift, selectedDate, refreshTimeline]);

  useEffect(() => {
    refreshAll();
  }, [selectedDate, refreshAll]);

  const handleInitiateCloseDebt = async (debt: OkleykaDebt) => {
    if (!debt.orderId) {
      toast.error("Не найден ID заказа для этого долга");
      return;
    }
    const orderDetails = await okleykaOrderService.getWithItems(debt.orderId);
    if (!orderDetails) {
      toast.error("Не удалось загрузить данные заказа");
      return;
    }
    const fullOrder: OkleykaOrder = {
      ...orderDetails.order,
      items: orderDetails.items,
      workers: orderDetails.workers,
    };
    setSelectedOrder(fullOrder);
    setEditOrderOpen(true);
  };

  const handleCancelOrder = async (order: OkleykaOrder) => {
    if (!confirm("Вы уверены, что хотите отменить этот заказ?")) return;
    const ok = await okleykaOrderService.update(order.id, { status: "cancelled" });
    if (ok) {
      toast.success("Заказ отменен");
      refreshAll();
    } else {
      toast.error("Не удалось отменить заказ");
    }
  };

  if (!state.isInitialized) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const shift = state.currentShift;

  const handleOpenShift = async () => {
    if (shiftEmployees.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }
    setOpening(true);
    try {
      const rolesMap: Record<string, "admin" | "installer"> = {};
      shiftEmployees.forEach((id) => {
        rolesMap[id] = employeeRoles[id] || "installer";
      });

      const openedShift = await okleykaShiftService.open(
        selectedDate,
        shiftEmployees,
        rolesMap,
        Number(startCash)
      );
      if (openedShift) {
        toast.success("Смена успешно открыта");
        dispatch({ type: "SET_SHIFT", payload: openedShift });
      } else {
        toast.error("Не удалось открыть смену");
      }
    } catch {
      toast.error("Ошибка при открытии смены");
    } finally {
      setOpening(false);
    }
  };

  // Toggle employees select for new shift
  const handleToggleEmp = (id: string) => {
    setShiftEmployees((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((x) => x !== id);
      } else {
        if (!employeeRoles[id]) {
          setEmployeeRoles((roles) => ({ ...roles, [id]: "installer" }));
        }
        return [...prev, id];
      }
    });
  };

  // Cash modifications logic
  const handleAddMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;
    if (!modAmount.trim() || !modReason.trim()) {
      toast.error("Заполните сумму и причину");
      return;
    }

    const amt = Number(modAmount) * (modType === "out" ? -1 : 1);
    const newMod: OkleykaCashModification = {
      id: crypto.randomUUID(),
      amount: amt,
      reason: modReason.trim(),
      method: modMethod,
      createdAt: new Date().toISOString(),
    };

    const success = await okleykaShiftService.addCashModification(
      shift.id,
      newMod,
      shift.cashModifications
    );

    if (success) {
      toast.success("Транзакция добавлена");
      setModAmount("");
      setModReason("");
      refreshAll();
    } else {
      toast.error("Ошибка при добавлении транзакции");
    }
  };

  const handleRemoveMod = async (modId: string) => {
    if (!shift) return;
    if (!confirm("Удалить транзакцию?")) return;

    const success = await okleykaShiftService.removeCashModification(
      shift.id,
      modId,
      shift.cashModifications
    );

    if (success) {
      toast.success("Транзакция удалена");
      refreshAll();
    } else {
      toast.error("Не удалось удалить транзакцию");
    }
  };

  // Payout salary in shift
  const handlePayoutSubmit = async (amt: number) => {
    if (!shift || !payoutEmployee) return;
    const currentPayout = shift.salaryPayouts[payoutEmployee.id] || 0;
    const updatedPayouts = {
      ...shift.salaryPayouts,
      [payoutEmployee.id]: currentPayout + amt,
    };

    const success = await okleykaShiftService.updateSalaryPayouts(
      shift.id,
      updatedPayouts
    );

    if (success) {
      toast.success("Выплата проведена успешно");
      refreshAll();
    } else {
      toast.error("Ошибка выплаты");
    }
  };

  const handleSaveCrew = async (
    employeeIds: string[],
    employeeRoles: Record<string, "admin" | "installer">
  ) => {
    if (!shift) return;
    const updatedShift: OkleykaShift = {
      ...shift,
      employeeIds,
      employeeRoles,
    };
    const success = await okleykaShiftService.update(updatedShift);
    if (success) {
      toast.success("Состав смены изменен");
      refreshAll();
    } else {
      toast.error("Не удалось обновить состав смены");
    }
  };

  // Close active shift
  const handleCloseShift = async () => {
    if (!shift) return;
    const expectedCash = expectedCashTotal();
    const actualCash = prompt(`Введите фактическую сумму в кассе (ожидалось: ${expectedCash} BYN):`, expectedCash.toString());
    if (actualCash === null) return;

    const val = Number(actualCash);
    if (isNaN(val)) { toast.error("Неверное число"); return; }

    const success = await okleykaShiftService.close(shift.id, val);
    if (success) {
      toast.success("Смена закрыта");
      refreshAll();
    } else {
      toast.error("Не удалось закрыть смену");
    }
  };

  // Calculations for cash state widget
  const ordersCompletedToday = state.orders.filter(
    (o) => o.shiftDate === selectedDate && o.status === "completed"
  );

  const getCashRevenue = () =>
    ordersCompletedToday
      .filter((o) => o.paymentMethod?.type === "cash")
      .reduce((sum, o) => sum + o.totalPrice, 0);

  const getCardRevenue = () =>
    ordersCompletedToday
      .filter((o) => o.paymentMethod?.type === "card")
      .reduce((sum, o) => sum + o.totalPrice, 0);

  const getModificationsSum = (method?: "cash" | "card") => {
    if (!shift) return 0;
    return shift.cashModifications
      .filter((m) => !method || m.method === method)
      .reduce((sum, m) => sum + m.amount, 0);
  };

  const expectedCashTotal = () => {
    if (!shift) return 0;
    const start = shift.startOfDayCash;
    const rev = getCashRevenue();
    const mods = getModificationsSum("cash");
    const payouts = Object.values(shift.salaryPayouts).reduce((sum, v) => sum + v, 0);
    return start + rev + mods - payouts;
  };

  // Find active orders for boxes
  const boxOrders = (boxNum: 1 | 2) => {
    return state.orders.filter(
      (o) =>
        o.boxNumber === boxNum &&
        o.status !== "cancelled" &&
        o.status !== "completed" &&
        o.dateStart <= selectedDate &&
        o.dateEnd >= selectedDate
    );
  };
  const dailyOrders = state.orders.filter((o) => o.shiftDate === selectedDate);
  const filteredDailyOrders = dailyOrders.filter((o) => {
    if (paymentFilter === "all") return true;
    return o.paymentMethod?.type === paymentFilter;
  });

  
  
  // Filter appointments for pre-shift screen
  const todayAppointments = state.appointments.filter(app => app.date === selectedDate);
  const totalAppointmentsToday = todayAppointments.length;
  const isDateToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  const upcomingAppointments = todayAppointments.filter(app => {
    if (!isDateToday) return true;
    const [hours, minutes] = app.time.split(":").map(Number);
    const appTimeMinutes = hours * 60 + minutes;
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    return appTimeMinutes >= currentTimeMinutes && appTimeMinutes <= currentTimeMinutes + 120;
  });

  if (!shift) {
    return (
      <OkleykaPreShiftScreen
        selectedDate={selectedDate}
        isCalendarOpen={isCalendarOpen}
        setIsCalendarOpen={setIsCalendarOpen}
        calendarRef={calendarRef}
        handleDateSelect={handleDateSelect}
        shiftSectionRef={shiftSectionRef}
        isShiftSectionHighlighted={isShiftSectionHighlighted}
        employees={state.employees}
        shiftEmployees={shiftEmployees}
        handleEmployeeSelection={handleToggleEmp}
        employeeRoles={employeeRoles}
        setEmployeeRoles={setEmployeeRoles}
        startShift={handleOpenShift}
        startOfDayCash={startCash}
        setStartOfDayCash={setStartCash}
        previousDayCash={previousDayCash}
        loading={{ savingShift: opening, employees: false }}
        upcomingAppointments={upcomingAppointments}
        totalAppointmentsToday={totalAppointmentsToday}
      />
    );
  }

  // ACTIVE SHIFT VIEW
  return (
    <div className="bg-card rounded-[2rem] p-4 sm:p-6 shadow-sm border border-border/50 min-h-[85dvh] flex flex-col gap-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <h2 className="text-2xl font-bold text-foreground">
            Главная страница
          </h2>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
              Дата:
            </span>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-9 items-center rounded-lg border border-border/50 bg-card px-3 py-1.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <button
            onClick={() => {
              setPaymentFilter("all");
              setDailyReportOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
          >
            <ListBullets className="w-4 h-4" />
            <span className="hidden sm:inline">Ежедневная ведомость</span>
            <span className="sm:hidden">Ведомость</span>
          </button>
          <button
            onClick={() => {
              setActiveBoxNum(1);
              setAddOrderOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить запись</span>
            <span className="sm:hidden">Запись</span>
          </button>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        
        {/* LEFT COLUMN: Employees, Earnings, Totals */}
        <div className="flex flex-col gap-6">
          {/* Employees */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-bold">Сотрудники</h3>
              </div>
              <button
                onClick={() => setEditCrewOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-accent transition-colors text-sm font-medium shadow-sm"
              >
                <Gear className="w-3.5 h-3.5" />
                Изменить состав
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {shift.employeeIds.map((empId) => {
                const employee = state.employees.find((e) => e.id === empId);
                if (!employee) return null;
                const role = shift.employeeRoles?.[empId] || "installer";
                const payout = shift.salaryPayouts[empId] || 0;

                const empOrders = ordersCompletedToday.filter(o => o.workers?.some(w => w.employeeId === empId));
                const carCount = empOrders.length;
                const totalServicesAmount = empOrders.reduce((sum, o) => sum + o.totalPrice, 0);

                return (
                  <div
                    key={empId}
                    className="relative group rounded-xl p-4 transition-all duration-200 border bg-background hover:bg-accent/5 w-full flex flex-col gap-3 border-border/50 shadow-sm hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex flex-col min-w-0 flex-1">
                        <h4 className="font-semibold text-base text-foreground truncate">{employee.name}</h4>
                        <span className={`mt-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium border ${
                          role === "admin"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {role === "admin" ? "Админ" : "Оклейщик"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setPayoutEmployee(employee);
                          setPayoutMax(500); 
                          setPayoutOpen(true);
                        }}
                        className="shrink-0 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-bold"
                        title="Выплата"
                      >
                        Выплата
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Машин</span>
                        <span className="font-semibold text-sm sm:text-base text-card-foreground">{carCount}</span>
                      </div>
                      <div className="w-px h-8 bg-border/40" />
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Сумма</span>
                        <span className="font-semibold text-sm sm:text-base text-card-foreground">{totalServicesAmount.toFixed(2)} BYN</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Выплачено</span>
                      <span className="font-bold text-lg tabular-nums text-primary">{payout.toFixed(2)} BYN</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <OkleykaTimelineWidget
            startDate={selectedDate}
            orders={timelineOrders}
            onAddAppointment={(boxNum, date) => {
              setActiveBoxNum(boxNum);
              setAddOrderDate(date);
              setAddOrderOpen(true);
            }}
            onOrderClick={(order) => setActionOrder(order)}
            onExpand={() => setMonthCalendarOpen(true)}
          />

          <OkleykaCashStateWidget
            shift={shift}
            totalServicesCash={getCashRevenue()}
            onCloseCash={handleCloseShift}
            onPayout={() => {
               if (shift.employeeIds.length > 0) {
                 const emp = state.employees.find((e) => e.id === shift.employeeIds[0]);
                 if (emp) {
                   setPayoutEmployee(emp);
                   setPayoutMax(500);
                   setPayoutOpen(true);
                 }
               }
            }}
          />
        </div>

        {/* RIGHT COLUMN: Boxes, Debts, Upcoming */}
        <div className="space-y-6">
          <OkleykaPendingWrapsWidget
            pendingWraps={pendingWraps}
            onExecute={() => toast.info("Скоро будет реализовано")}
            onDelete={() => toast.info("Скоро будет реализовано")}
          />

          {/* DEBTS WIDGET */}
          <div className="bg-card border border-border/50 p-5 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <Warning size={18} className="text-amber-500" />
              <h4 className="font-bold text-foreground text-sm">Долги ({state.debts.length})</h4>
            </div>
            {state.debts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2 pl-1">Долгов нет</p>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {state.debts.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between p-3 bg-background border border-border/50 rounded-2xl">
                    <div>
                      <p className="font-bold text-foreground text-xs leading-none">{debt.carInfo}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-semibold">{debt.amount} BYN</p>
                    </div>
                    <button
                      onClick={() => handleInitiateCloseDebt(debt)}
                      className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-[10px] font-bold text-amber-500 transition-colors"
                    >
                      Закрыть
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

{/* ── MODALS INTEGRATION ── */}
      {addOrderOpen && (
        <AddOrderModal
          isOpen={addOrderOpen}
          onClose={() => setAddOrderOpen(false)}
          preSelectedBox={activeBoxNum}
          initialDateStart={addOrderDate}
          shiftDate={selectedDate}
          shiftEmployees={shift ? shift.employeeIds : []}
          employees={state.employees}
          organizations={state.organizations}
          onCreated={(order) => {
            dispatch({ type: "ADD_ORDER", payload: order });
            refreshAll();
          }}
        />
      )}

      {editOrderOpen && selectedOrder && (
        <EditOrderModal
          isOpen={editOrderOpen}
          onClose={() => { setEditOrderOpen(false); setSelectedOrder(null); }}
          order={selectedOrder}
          shiftEmployees={shift ? shift.employeeIds : []}
          employees={state.employees}
          organizations={state.organizations}
          shiftDate={selectedDate}
          onUpdated={(order) => {
            dispatch({ type: "UPDATE_ORDER", payload: order });
            refreshAll();
          }}
        />
      )}

      {completeOrderOpen && selectedOrder && (
        <CompleteOrderModal
          isOpen={completeOrderOpen}
          onClose={() => { setCompleteOrderOpen(false); setSelectedOrder(null); }}
          order={selectedOrder}
          onCompleted={() => {
            refreshAll();
          }}
        />
      )}

      <OkleykaMonthCalendarModal
        isOpen={monthCalendarOpen}
        onClose={() => setMonthCalendarOpen(false)}
        baseDate={selectedDate}
        orders={timelineOrders}
        onDateClick={(date) => {
          setMonthCalendarOpen(false);
          setAddOrderDate(date);
          setAddOrderOpen(true);
        }}
      />

      <OkleykaDailyReportModal
        isOpen={dailyReportOpen}
        onClose={() => setDailyReportOpen(false)}
        orders={dailyOrders}
        employees={state.employees}
        selectedDate={selectedDate}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        onEditOrder={(order) => {
          setSelectedOrder(order);
          setEditOrderOpen(true);
        }}
        onCompleteOrder={(order) => {
          setSelectedOrder(order);
          setCompleteOrderOpen(true);
        }}
        onCancelOrder={handleCancelOrder}
      />



      {payoutOpen && payoutEmployee && (
        <PayoutModal
          isOpen={payoutOpen}
          onClose={() => { setPayoutOpen(false); setPayoutEmployee(null); }}
          employeeId={payoutEmployee.id}
          employeeName={payoutEmployee.name}
          maxAmount={payoutMax}
          onPaid={handlePayoutSubmit}
        />
      )}

      {editCrewOpen && shift && (
        <EditCrewModal
          isOpen={editCrewOpen}
          onClose={() => setEditCrewOpen(false)}
          shift={shift}
          employees={state.employees}
          onSave={handleSaveCrew}
        />
      )}
    </div>
  );
};

export default OkleykaHomePage;
