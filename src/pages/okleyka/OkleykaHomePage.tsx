import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
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

// ── Simple DatePicker stub to avoid importing DayPicker which can be complex ──
const CustomDatePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-purple-500/50 text-white font-medium"
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
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-purple-500"
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
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-xs font-semibold"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <div>
            <h3 className="font-bold text-base text-white">Изменить состав смены</h3>
            <p className="text-[10px] text-white/40">Добавление/удаление сотрудников и смена ролей</p>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 py-2">
          {employees.map((emp) => {
            const active = selectedIds.includes(emp.id);
            const role = roles[emp.id] || "installer";
            return (
              <div
                key={emp.id}
                className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-medium transition-all ${
                  active
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                    : "bg-white/[0.03] border-white/[0.05] text-white/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(emp.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    active
                      ? "bg-purple-500 border-purple-400 text-white"
                      : "border-white/20 bg-transparent text-transparent"
                  }`}>
                    <Check size={12} weight="bold" />
                  </div>
                  <span className={active ? "text-white font-semibold" : "text-white/75"}>{emp.name}</span>
                </button>

                {active && (
                  <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-0.5 ml-2">
                    <button
                      type="button"
                      onClick={() => handleSetRole(emp.id, "admin")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        role === "admin"
                          ? "bg-purple-600 text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      Админ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetRole(emp.id, "installer")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        role === "installer"
                          ? "bg-purple-600 text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      Оклейщик
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-900 text-white/70 hover:bg-zinc-800 text-xs font-semibold"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-xs font-semibold disabled:opacity-40"
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
                    ? "bg-purple-500/15 border-purple-400/30 text-purple-400"
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
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-xs font-semibold disabled:opacity-40"
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
  const { state, dispatch, refreshShift, refreshOrders, refreshDebts, refreshUnpaidCount } = useOkleykaContext();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [shiftEmployees, setShiftEmployees] = useState<string[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<Record<string, "admin" | "installer">>({});
  const [startCash, setStartCash] = useState("0");
  const [opening, setOpening] = useState(false);

  // Active state modals
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [activeBoxNum, setActiveBoxNum] = useState<1 | 2>(1);
  const [completeOrderOpen, setCompleteOrderOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OkleykaOrder | null>(null);

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

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshOrders(selectedDate),
      refreshDebts(),
      refreshUnpaidCount(),
      refreshShift(selectedDate),
    ]);
  }, [refreshOrders, refreshDebts, refreshUnpaidCount, refreshShift, selectedDate]);

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
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
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
        o.dateStart <= selectedDate &&
        o.dateEnd >= selectedDate
    );
  };
  const dailyOrders = state.orders.filter((o) => o.shiftDate === selectedDate);
  const filteredDailyOrders = dailyOrders.filter((o) => {
    if (paymentFilter === "all") return true;
    return o.paymentMethod?.type === paymentFilter;
  });

  return (
    <div className="space-y-6">

      {/* ── HEADER & DATE SELECTOR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Главная страница
          </h2>
          <p className="text-xs text-muted-foreground">Календарь боксов, транзакции и отчёты</p>
        </div>

        {/* Date Selector with CaretLeft and CaretRight */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
            }}
            className="p-2 rounded-xl bg-background border border-border/50 hover:bg-accent text-foreground transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <div className="w-36">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl text-xs focus:outline-none text-foreground font-semibold text-center [color-scheme:dark]"
            />
          </div>
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
            }}
            className="p-2 rounded-xl bg-background border border-border/50 hover:bg-accent text-foreground transition-colors"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── PRE-SHIFT SCREEN (IF NO SHIFT OPENED) ── */}
      {!shift ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto p-6 bg-card border border-border/50 rounded-3xl space-y-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
              <Play size={20} weight="duotone" className="text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Смена не открыта</h3>
              <p className="text-[11px] text-muted-foreground">Откройте смену для управления оклейкой на {selectedDate}</p>
            </div>
          </div>

          {/* Employees Multi-check */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider pl-1">Выберите сотрудников в смену</label>
            {state.employees.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-1">Сотрудники отсутствуют. Добавьте в настройках.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {state.employees.map((emp) => {
                  const active = shiftEmployees.includes(emp.id);
                  const role = employeeRoles[emp.id] || "installer";
                  return (
                    <div
                      key={emp.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-medium transition-all ${
                        active
                          ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                          : "bg-background border-border/50 text-muted-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleEmp(emp.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          active
                            ? "bg-purple-500 border-purple-400 text-white"
                            : "border-white/20 bg-transparent text-transparent"
                        }`}>
                          <Check size={12} weight="bold" />
                        </div>
                        <span className={active ? "text-foreground font-semibold" : "text-muted-foreground"}>{emp.name}</span>
                      </button>

                      {active && (
                        <div className="flex bg-background border border-border/50 rounded-xl overflow-hidden p-0.5 ml-2">
                          <button
                            type="button"
                            onClick={() => setEmployeeRoles((prev) => ({ ...prev, [emp.id]: "admin" }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              role === "admin"
                                ? "bg-purple-600 text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Админ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmployeeRoles((prev) => ({ ...prev, [emp.id]: "installer" }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              role === "installer"
                                ? "bg-purple-600 text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Оклейщик
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start Cash */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1 font-semibold uppercase tracking-wider pl-1">Наличные на начало смены (касса)</label>
            <div className="relative">
              <input
                type="number"
                value={startCash}
                onChange={(e) => setStartCash(e.target.value)}
                className="w-full px-4 py-3.5 bg-background border border-border/50 rounded-2xl text-foreground font-bold pr-12 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">BYN</span>
            </div>
          </div>

          <button
            onClick={handleOpenShift}
            disabled={opening}
            className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(147,51,234,0.3)]"
          >
            {opening ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={16} weight="fill" />}
            Открыть смену
          </button>
        </motion.div>
      ) : (

        /* ── ACTIVE SHIFT MAIN GRID ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT 2 COLUMNS: BOXES & BOTTOM INFO */}
          <div className="lg:col-span-2 space-y-6">

            {/* BOX CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([1, 2] as const).map((boxNum) => {
                const activeOrders = boxOrders(boxNum);
                const isOccupied = activeOrders.length > 0;
                const active = activeOrders[0];

                return (
                  <div
                    key={boxNum}
                    className={`p-5 rounded-3xl border transition-all ${
                      isOccupied
                        ? "bg-card border-purple-500/30 shadow-sm"
                        : "bg-card border-border/50 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                          isOccupied ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {boxNum}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">Бокс {boxNum}</h4>
                          <p className="text-[10px] text-muted-foreground">Календарь бокса</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isOccupied ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {isOccupied ? "Занят" : "Свободен"}
                      </span>
                    </div>

                    {isOccupied && active ? (
                      <div className="space-y-3">
                        <div className="bg-background border border-border/50 p-3.5 rounded-2xl">
                          <p className="text-xs text-muted-foreground">Автомобиль</p>
                          <p className="font-bold text-foreground text-sm mt-0.5">{active.carInfo}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(active.dateStart), "dd MMM", { locale: ru })} – {format(new Date(active.dateEnd), "dd MMM", { locale: ru })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedOrder(active); setEditOrderOpen(true); }}
                            className="flex-1 py-2 bg-background border border-border/50 hover:bg-accent rounded-xl text-[10px] font-bold text-foreground"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(active); setCompleteOrderOpen(true); }}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Check size={10} weight="bold" />
                            Завершить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActiveBoxNum(boxNum); setAddOrderOpen(true); }}
                        className="w-full h-28 border border-dashed border-border hover:border-purple-500/40 hover:bg-purple-500/[0.02] rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:text-purple-400 gap-1.5 transition-all"
                      >
                        <Plus size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Создать заказ</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DAILY STATEMENT WIDGET */}
            <div className="bg-card border border-border/50 p-5 rounded-3xl space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                <div className="text-left">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <ListBullets size={18} className="text-purple-400" />
                    Ежедневная ведомость
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Всего услуг: {dailyOrders.length} • Сумма:{" "}
                    <span className="font-bold text-foreground">
                      {dailyOrders.reduce((sum, o) => sum + o.totalPrice, 0).toLocaleString("ru-RU")} BYN
                    </span>
                  </p>
                </div>

                {/* Filter tabs */}
                <div className="flex flex-wrap gap-1">
                  {(["all", "cash", "card", "organization", "debt"] as const).map((filter) => {
                    const label = {
                      all: "Все",
                      cash: "Нал",
                      card: "Карта",
                      organization: "Безнал",
                      debt: "Долг",
                    }[filter];

                    return (
                      <button
                        key={filter}
                        onClick={() => setPaymentFilter(filter)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                          paymentFilter === filter
                            ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                            : "bg-background border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table / List */}
              {filteredDailyOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">Записей по выбранному фильтру нет</p>
              ) : (
                <div className="overflow-x-auto pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground font-semibold">
                        <th className="py-2 pr-2 text-[10px] uppercase">Бокс</th>
                        <th className="py-2 pr-2 text-[10px] uppercase">Авто</th>
                        <th className="py-2 pr-2 text-[10px] uppercase">Услуги</th>
                        <th className="py-2 pr-2 text-[10px] uppercase">Исполнители</th>
                        <th className="py-2 pr-2 text-[10px] uppercase">Оплата</th>
                        <th className="py-2 pr-2 text-right text-[10px] uppercase">Сумма</th>
                        <th className="py-2 pl-2 text-right text-[10px] uppercase">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDailyOrders.map((order) => {
                        const orderItemNames = (order.items || []).map((i) => i.name).join(", ") || "—";
                        const orderWorkerNames = (order.workers || [])
                          .map((w) => state.employees.find((e) => e.id === w.employeeId)?.name)
                          .filter(Boolean)
                          .join(", ") || "—";

                        const pmType = order.paymentMethod?.type;
                        const pmLabel = pmType
                          ? {
                              cash: "Наличные",
                              card: "Карта",
                              organization: order.paymentMethod?.organizationName || "Безнал",
                              debt: "Долг",
                            }[pmType]
                          : "—";

                        return (
                          <tr key={order.id} className="border-b border-border/40 hover:bg-muted/10 last:border-b-0 transition-colors">
                            <td className="py-3 pr-2 font-medium">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                order.boxNumber === 1
                                  ? "bg-violet-500/10 text-violet-400"
                                  : "bg-orange-500/10 text-orange-400"
                              }`}>
                                {order.boxNumber}
                              </span>
                            </td>
                            <td className="py-3 pr-2 font-bold text-foreground">{order.carInfo}</td>
                            <td className="py-3 pr-2 text-muted-foreground truncate max-w-[120px]" title={orderItemNames}>
                              {orderItemNames}
                            </td>
                            <td className="py-3 pr-2 text-muted-foreground truncate max-w-[120px]" title={orderWorkerNames}>
                              {orderWorkerNames}
                            </td>
                            <td className="py-3 pr-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                pmType === "cash"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : pmType === "card"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : pmType === "debt"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {pmLabel}
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-right font-extrabold text-foreground">
                              {order.totalPrice.toLocaleString("ru-RU")} BYN
                            </td>
                            <td className="py-3 pl-2 text-right">
                              <div className="flex justify-end gap-1.5">
                                {order.status === "active" && (
                                  <button
                                    onClick={() => { setSelectedOrder(order); setCompleteOrderOpen(true); }}
                                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors"
                                    title="Завершить"
                                  >
                                    <Check size={12} weight="bold" />
                                  </button>
                                )}
                                <button
                                  onClick={() => { setSelectedOrder(order); setEditOrderOpen(true); }}
                                  className="p-1.5 bg-background border border-border/50 hover:bg-accent text-foreground rounded-xl transition-colors"
                                  title="Изменить"
                                >
                                  <Gear size={12} weight="bold" />
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(order)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                                  title="Отменить заказ"
                                >
                                  <X size={12} weight="bold" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* LOWER GRID: CASH & EMPLOYEES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* CASH REGISTER WIDGET */}
              <div className="bg-card border border-border/50 p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <Coins size={18} className="text-emerald-500" />
                    <h4 className="font-bold text-foreground text-sm">Касса смены</h4>
                  </div>
                  <button
                    onClick={handleCloseShift}
                    className="px-3 py-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-[9px] font-bold text-red-400 uppercase tracking-wider"
                  >
                    Закрыть смену
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="bg-background p-3 rounded-2xl border border-border/50">
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Начало</span>
                    <span className="font-bold text-foreground text-sm">{shift.startOfDayCash} BYN</span>
                  </div>
                  <div className="bg-background p-3 rounded-2xl border border-border/50">
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Наличные</span>
                    <span className="font-bold text-foreground text-sm">{getCashRevenue()} BYN</span>
                  </div>
                  <div className="bg-background p-3 rounded-2xl border border-border/50">
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Карта</span>
                    <span className="font-bold text-foreground text-sm">{getCardRevenue()} BYN</span>
                  </div>
                  <div className="bg-background p-3 rounded-2xl border border-border/50">
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Движение</span>
                    <span className={`font-bold text-sm ${getModificationsSum() < 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {getModificationsSum() > 0 ? "+" : ""}{getModificationsSum()} BYN
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-emerald-500 block font-bold uppercase tracking-wider">Ожидается в кассе</span>
                    <span className="font-extrabold text-emerald-500 text-lg leading-none mt-1 inline-block">
                      {expectedCashTotal()} BYN
                    </span>
                  </div>
                  <Coins size={28} className="text-emerald-500/20" />
                </div>

                {/* QUICK TRANSACTION FORM */}
                <form onSubmit={handleAddMod} className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Быстрая транзакция</p>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Сумма"
                      value={modAmount}
                      onChange={(e) => setModAmount(e.target.value)}
                      className="w-24 px-3 py-2 bg-background border border-border/50 rounded-xl text-xs text-foreground focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Причина"
                      value={modReason}
                      onChange={(e) => setModReason(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-xl text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 text-[10px] font-semibold">
                    {/* In / Out */}
                    <div className="flex-1 flex rounded-xl overflow-hidden border border-border/50">
                      <button
                        type="button"
                        onClick={() => setModType("in")}
                        className={`flex-1 py-1.5 transition-colors ${modType === "in" ? "bg-emerald-500/10 text-emerald-500 font-bold" : "bg-background text-muted-foreground"}`}
                      >
                        Приход
                      </button>
                      <button
                        type="button"
                        onClick={() => setModType("out")}
                        className={`flex-1 py-1.5 transition-colors ${modType === "out" ? "bg-red-500/10 text-red-500 font-bold" : "bg-background text-muted-foreground"}`}
                      >
                        Расход
                      </button>
                    </div>

                    {/* Cash / Card */}
                    <div className="flex-1 flex rounded-xl overflow-hidden border border-border/50">
                      <button
                        type="button"
                        onClick={() => setModMethod("cash")}
                        className={`flex-1 py-1.5 transition-colors ${modMethod === "cash" ? "bg-purple-500/10 text-purple-400 font-bold" : "bg-background text-muted-foreground"}`}
                      >
                        Нал
                      </button>
                      <button
                        type="button"
                        onClick={() => setModMethod("card")}
                        className={`flex-1 py-1.5 transition-colors ${modMethod === "card" ? "bg-purple-500/10 text-purple-400 font-bold" : "bg-background text-muted-foreground"}`}
                      >
                        Безнал
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-background hover:bg-accent border border-border/50 rounded-xl text-[10px] font-bold text-foreground uppercase tracking-wider"
                  >
                    Внести
                  </button>
                </form>

                {/* TRANSACTIONS LOG */}
                {shift.cashModifications.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border-t border-border/50 pt-3">
                    {shift.cashModifications.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[11px] p-2 bg-background rounded-xl border border-border/50">
                        <div className="text-left">
                          <p className="font-medium text-foreground leading-none">{m.reason}</p>
                          <span className="text-[9px] text-muted-foreground mt-0.5 inline-block font-mono capitalize">
                            {m.method === "cash" ? "нал" : "безнал"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${m.amount < 0 ? "text-red-500" : "text-emerald-500"}`}>
                            {m.amount > 0 ? "+" : ""}{m.amount} BYN
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMod(m.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTIVE SHIFT EMPLOYEES */}
              <div className="bg-card border border-border/50 p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-purple-500" />
                    <h4 className="font-bold text-foreground text-sm">Сотрудники в смене</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditCrewOpen(true)}
                    className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="Изменить состав"
                  >
                    <Gear size={16} weight="bold" />
                  </button>
                </div>

                <div className="space-y-2">
                  {shift.employeeIds.map((empId) => {
                    const emp = state.employees.find((e) => e.id === empId);
                    if (!emp) return null;
                    const payout = shift.salaryPayouts[empId] || 0;
                    const role = shift.employeeRoles?.[empId] || "installer";

                    return (
                      <div key={empId} className="flex items-center justify-between p-3 bg-background border border-border/50 rounded-2xl">
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-foreground text-xs leading-none">{emp.name}</p>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none ${
                              role === "admin"
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                : "bg-muted border-border/50 text-muted-foreground"
                            }`}>
                              {role === "admin" ? "Админ" : "Оклейщик"}
                            </span>
                          </div>
                          <p className="text-[9px] text-muted-foreground font-semibold">Выплачено: {payout} BYN</p>
                        </div>
                        <button
                          onClick={() => {
                            setPayoutEmployee(emp);
                            setPayoutMax(500); // placeholder max
                            setPayoutOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 rounded-xl text-[10px] font-bold text-purple-400"
                        >
                          Выплата
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: DEBTS & CONTROL INSPECTIONS */}
          <div className="space-y-6">

            {/* DEBTS WIDGET */}
            <div className="bg-card border border-border/50 p-5 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Warning size={18} className="text-amber-500" />
                <h4 className="font-bold text-foreground text-sm">Активные долги ({state.debts.length})</h4>
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

            {/* INSPECTIONS WIDGET */}
            <div className="bg-card border border-border/50 p-5 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <ShieldCheck size={18} className="text-purple-500" />
                <h4 className="font-bold text-foreground text-sm">Контрольный осмотр ({state.upcomingInspections.length})</h4>
              </div>
              {state.upcomingInspections.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 pl-1">Осмотры не запланированы</p>
              ) : (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {state.upcomingInspections.map((order) => {
                    const date = order.inspectionDate ? new Date(order.inspectionDate) : null;
                    return (
                      <div key={order.id} className="p-3 bg-background border border-border/50 rounded-2xl">
                        <p className="font-bold text-foreground text-xs leading-none">{order.carInfo}</p>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-400/20">
                            {date ? format(date, "d MMM HH:mm", { locale: ru }) : ""}
                          </span>
                          {order.clientPhone && (
                            <span className="flex items-center gap-1 ml-auto">
                              <a href={`tel:${order.clientPhone}`} className="text-[9px] text-muted-foreground hover:underline">
                                {order.clientPhone}
                              </a>
                              <MessengerLinks phone={order.clientPhone} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ── MODALS INTEGRATION ── */}
      {addOrderOpen && (
        <AddOrderModal
          isOpen={addOrderOpen}
          onClose={() => setAddOrderOpen(false)}
          preSelectedBox={activeBoxNum}
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
