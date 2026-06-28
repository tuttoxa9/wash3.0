import type React from "react";
import { useState, useEffect } from "react";
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
} from "@phosphor-icons/react";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import AddOrderModal from "@/components/okleyka/AddOrderModal";
import CompleteOrderModal from "@/components/okleyka/CompleteOrderModal";
import EditOrderModal from "@/components/okleyka/EditOrderModal";

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
  const { state, dispatch, refreshShift, refreshOrders, refreshDebts } = useOkleykaContext();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [shiftEmployees, setShiftEmployees] = useState<string[]>([]);
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

  // Load shift when selected date changes
  useEffect(() => {
    refreshShift(selectedDate);
  }, [selectedDate, refreshShift]);

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
      const openedShift = await okleykaShiftService.open(
        selectedDate,
        shiftEmployees,
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
    setShiftEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      refreshShift(selectedDate);
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
      refreshShift(selectedDate);
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
      refreshShift(selectedDate);
    } else {
      toast.error("Ошибка выплаты");
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
      refreshShift(selectedDate);
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

  return (
    <div className="space-y-6">

      {/* ── HEADER & DATE SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-950 border border-zinc-900 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Панель управления
            {shift && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 uppercase">
                Смена открыта
              </span>
            )}
          </h2>
          <p className="text-xs text-white/40">Календарь боксов, транзакции и отчёты</p>
        </div>
        <div className="w-full sm:w-48">
          <CustomDatePicker value={selectedDate} onChange={setSelectedDate} />
        </div>
      </div>

      {/* ── PRE-SHIFT SCREEN (IF NO SHIFT OPENED) ── */}
      {!shift ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
              <Play size={20} weight="duotone" className="text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Смена не открыта</h3>
              <p className="text-[11px] text-white/40">Откройте смену для управления оклейкой на {selectedDate}</p>
            </div>
          </div>

          {/* Employees Multi-check */}
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 block font-semibold uppercase tracking-wider pl-1">Выберите сотрудников в смену</label>
            {state.employees.length === 0 ? (
              <p className="text-xs text-white/30 italic pl-1">Сотрудники отсутствуют. Добавьте в настройках.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {state.employees.map((emp) => {
                  const active = shiftEmployees.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleToggleEmp(emp.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-medium text-left transition-all ${
                        active
                          ? "bg-purple-500/15 border-purple-400/30 text-purple-400"
                          : "bg-white/[0.03] border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>{emp.name}</span>
                      {active ? <Check size={12} weight="bold" /> : <Plus size={10} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start Cash */}
          <div>
            <label className="text-[10px] text-white/40 block mb-1 font-semibold uppercase tracking-wider pl-1">Наличные на начало смены (касса)</label>
            <div className="relative">
              <input
                type="number"
                value={startCash}
                onChange={(e) => setStartCash(e.target.value)}
                className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold pr-12 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">BYN</span>
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

          {/* LEFT 2 COLUMNS: BOXES & LISTS */}
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
                        ? "bg-purple-950/10 border-purple-500/20 shadow-[0_8px_24px_rgba(168,85,247,0.05)]"
                        : "bg-emerald-950/10 border-emerald-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                          isOccupied ? "bg-purple-500/20 text-purple-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {boxNum}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Бокс {boxNum}</h4>
                          <p className="text-[10px] text-white/40">Календарь бокса</p>
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
                        <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                          <p className="text-xs text-white/40">Автомобиль</p>
                          <p className="font-bold text-white text-sm mt-0.5">{active.carInfo}</p>
                          <p className="text-[10px] text-white/30 mt-1">
                            {format(new Date(active.dateStart), "dd MMM", { locale: ru })} – {format(new Date(active.dateEnd), "dd MMM", { locale: ru })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedOrder(active); setEditOrderOpen(true); }}
                            className="flex-1 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-white/80"
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
                        className="w-full h-28 border border-dashed border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] rounded-2xl flex flex-col items-center justify-center text-emerald-400 gap-1.5 transition-all"
                      >
                        <Plus size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Создать заказ</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DEBTS & CONTROL INSPECTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* DEBTS WIDGET */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <Warning size={18} className="text-amber-500" />
                  <h4 className="font-bold text-white text-sm">Активные долги ({state.debts.length})</h4>
                </div>
                {state.debts.length === 0 ? (
                  <p className="text-xs text-white/30 italic py-2 pl-1">Долгов нет</p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {state.debts.map((debt) => (
                      <div key={debt.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                        <div>
                          <p className="font-bold text-white text-xs leading-none">{debt.carInfo}</p>
                          <p className="text-[10px] text-white/40 mt-1 font-semibold">{debt.amount} BYN</p>
                        </div>
                        <button
                          onClick={() => { setSelectedDebt(debt); setCloseDebtOpen(true); }}
                          className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-[10px] font-bold text-amber-400 transition-colors"
                        >
                          Закрыть
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INSPECTIONS WIDGET */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-purple-500" />
                  <h4 className="font-bold text-white text-sm">Контрольный осмотр ({state.upcomingInspections.length})</h4>
                </div>
                {state.upcomingInspections.length === 0 ? (
                  <p className="text-xs text-white/30 italic py-2 pl-1">Осмотры не запланированы</p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {state.upcomingInspections.map((order) => {
                      const date = order.inspectionDate ? new Date(order.inspectionDate) : null;
                      return (
                        <div key={order.id} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                          <p className="font-bold text-white text-xs leading-none">{order.carInfo}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-400/20">
                              {date ? format(date, "d MMM HH:mm", { locale: ru }) : ""}
                            </span>
                            {order.clientPhone && (
                              <a href={`tel:${order.clientPhone}`} className="text-[9px] text-white/40 hover:underline">
                                {order.clientPhone}
                              </a>
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

          {/* RIGHT COLUMN: CASH STATE & EMPLOYEES */}
          <div className="space-y-6">

            {/* CASH REGISTER WIDGET */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-emerald-500" />
                  <h4 className="font-bold text-white text-sm">Касса смены</h4>
                </div>
                <button
                  onClick={handleCloseShift}
                  className="px-3 py-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-[9px] font-bold text-red-400 uppercase tracking-wider"
                >
                  Закрыть смену
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.03]">
                  <span className="text-[9px] text-white/30 block font-semibold uppercase">Начало</span>
                  <span className="font-bold text-white text-sm">{shift.startOfDayCash} BYN</span>
                </div>
                <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.03]">
                  <span className="text-[9px] text-white/30 block font-semibold uppercase">Наличные</span>
                  <span className="font-bold text-white text-sm">{getCashRevenue()} BYN</span>
                </div>
                <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.03]">
                  <span className="text-[9px] text-white/30 block font-semibold uppercase">Карта</span>
                  <span className="font-bold text-white text-sm">{getCardRevenue()} BYN</span>
                </div>
                <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.03]">
                  <span className="text-[9px] text-white/30 block font-semibold uppercase">Движение</span>
                  <span className={`font-bold text-sm ${getModificationsSum() < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {getModificationsSum() > 0 ? "+" : ""}{getModificationsSum()} BYN
                  </span>
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-emerald-400 block font-bold uppercase tracking-wider">Ожидается в кассе</span>
                  <span className="font-extrabold text-emerald-300 text-lg leading-none mt-1 inline-block">
                    {expectedCashTotal()} BYN
                  </span>
                </div>
                <Coins size={28} className="text-emerald-500/20" />
              </div>

              {/* QUICK TRANSACTION FORM */}
              <form onSubmit={handleAddMod} className="space-y-3 pt-2 border-t border-white/[0.04]">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider pl-1">Быстрая транзакция</p>

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Сумма"
                    value={modAmount}
                    onChange={(e) => setModAmount(e.target.value)}
                    className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Причина"
                    value={modReason}
                    onChange={(e) => setModReason(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 text-[10px] font-semibold">
                  {/* In / Out */}
                  <div className="flex-1 flex rounded-xl overflow-hidden border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setModType("in")}
                      className={`flex-1 py-1.5 transition-colors ${modType === "in" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-950 text-white/30"}`}
                    >
                      Приход
                    </button>
                    <button
                      type="button"
                      onClick={() => setModType("out")}
                      className={`flex-1 py-1.5 transition-colors ${modType === "out" ? "bg-red-500/20 text-red-400" : "bg-zinc-950 text-white/30"}`}
                    >
                      Расход
                    </button>
                  </div>

                  {/* Cash / Card */}
                  <div className="flex-1 flex rounded-xl overflow-hidden border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setModMethod("cash")}
                      className={`flex-1 py-1.5 transition-colors ${modMethod === "cash" ? "bg-purple-500/20 text-purple-400" : "bg-zinc-950 text-white/30"}`}
                    >
                      Нал
                    </button>
                    <button
                      type="button"
                      onClick={() => setModMethod("card")}
                      className={`flex-1 py-1.5 transition-colors ${modMethod === "card" ? "bg-purple-500/20 text-purple-400" : "bg-zinc-950 text-white/30"}`}
                    >
                      Безнал
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider"
                >
                  Внести
                </button>
              </form>

              {/* TRANSACTIONS LOG */}
              {shift.cashModifications.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto border-t border-white/[0.04] pt-3">
                  {shift.cashModifications.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-[11px] p-2 bg-white/[0.01] rounded-xl border border-white/[0.02]">
                      <div className="text-left">
                        <p className="font-medium text-white/80 leading-none">{m.reason}</p>
                        <span className="text-[9px] text-white/30 mt-0.5 inline-block font-mono capitalize">
                          {m.method === "cash" ? "нал" : "безнал"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${m.amount < 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {m.amount > 0 ? "+" : ""}{m.amount} BYN
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMod(m.id)}
                          className="text-white/20 hover:text-white/60 p-0.5 rounded"
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
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-purple-400" />
                  <h4 className="font-bold text-white text-sm">Сотрудники в смене</h4>
                </div>
              </div>

              <div className="space-y-2">
                {shift.employeeIds.map((empId) => {
                  const emp = state.employees.find((e) => e.id === empId);
                  if (!emp) return null;
                  const payout = shift.salaryPayouts[empId] || 0;

                  return (
                    <div key={empId} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.03] rounded-2xl">
                      <div className="text-left">
                        <p className="font-bold text-white text-xs leading-none">{emp.name}</p>
                        <p className="text-[9px] text-white/40 mt-1 font-semibold">Выплачено: {payout} BYN</p>
                      </div>
                      <button
                        onClick={() => {
                          setPayoutEmployee(emp);
                          setPayoutMax(500); // placeholder max
                          setPayoutOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded-xl text-[10px] font-bold text-purple-400"
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
            refreshOrders();
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
          onUpdated={(order) => {
            dispatch({ type: "UPDATE_ORDER", payload: order });
            refreshOrders();
          }}
        />
      )}

      {completeOrderOpen && selectedOrder && (
        <CompleteOrderModal
          isOpen={completeOrderOpen}
          onClose={() => { setCompleteOrderOpen(false); setSelectedOrder(null); }}
          order={selectedOrder}
          onCompleted={() => {
            refreshOrders();
          }}
        />
      )}

      <OkleykaCloseDebtModal
        isOpen={closeDebtOpen}
        onClose={() => { setCloseDebtOpen(false); setSelectedDebt(null); }}
        debt={selectedDebt}
        organizations={state.organizations}
        onClosed={() => {
          refreshDebts();
          refreshOrders();
          if (shift) refreshShift(selectedDate);
        }}
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
    </div>
  );
};

export default OkleykaHomePage;
