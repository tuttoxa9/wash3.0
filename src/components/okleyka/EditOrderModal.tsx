import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Plus,
  Trash,
  WarningCircle,
  CheckCircle,
  CurrencyRub,
  UserCircle,
  Car,
  Buildings,
  CalendarBlank,
} from "@phosphor-icons/react";
import { okleykaOrderService } from "@/lib/services/okleykaService";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import type { OkleykaOrder, OkleykaPaymentMethod } from "@/lib/types/okleyka";
import ConfirmUnpaidModal from "./ConfirmUnpaidModal";

// ── Types ──────────────────────────────────────────────────────────────────
interface ServiceItem {
  id: string;
  name: string;
  price: string;
}

interface WorkerEntry {
  employeeId: string;
  salary: string; // empty string = not set
}

// itemId (index in serviceItems) → list of WorkerEntry
type WorkersMap = Record<number, WorkerEntry[]>;

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OkleykaOrder | null;
  shiftEmployees: string[];
  employees: { id: string; name: string }[];
  organizations: { id: string; name: string }[];
  onUpdated: (order: OkleykaOrder) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);

const paymentLabels: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  organization: "Организация",
  debt: "Долг",
};

// ── Component ──────────────────────────────────────────────────────────────
const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  shiftEmployees,
  employees,
  organizations,
  onUpdated,
}) => {
  const { dispatch } = useOkleykaContext();

  // Loading state
  const [loading, setLoading] = useState(false);

  // Form state
  const [carInfo, setCarInfo] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [boxNumber, setBoxNumber] = useState<1 | 2>(1);
  const [dateStart, setDateStart] = useState(today());
  const [dateEnd, setDateEnd] = useState(today());
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
    { id: uid(), name: "", price: "" },
  ]);
  const [workersMap, setWorkersMap] = useState<WorkersMap>({});
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "organization" | "debt">("cash");
  const [organizationId, setOrganizationId] = useState("");
  const [notes, setNotes] = useState("");

  // Availability check
  const [availability, setAvailability] = useState<{
    available: boolean;
    conflictingOrder?: OkleykaOrder;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [unpaidItems, setUnpaidItems] = useState<
    { employeeName: string; serviceName: string }[]
  >([]);

  // Debounced availability check
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(
    async (box: 1 | 2, start: string, end: string, excludeId?: string) => {
      if (!start || !end || start > end) return;
      setCheckingAvailability(true);
      try {
        const result = await okleykaOrderService.checkBoxAvailability(
          box,
          start,
          end,
          excludeId
        );
        setAvailability(result);
      } finally {
        setCheckingAvailability(false);
      }
    },
    []
  );

  // Re-check when box/dates change
  useEffect(() => {
    if (!isOpen || !order) return;
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => {
      checkAvailability(boxNumber, dateStart, dateEnd, order.id);
    }, 400);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [boxNumber, dateStart, dateEnd, checkAvailability, isOpen, order]);

  // Load details when modal opens and order is provided
  useEffect(() => {
    if (isOpen && order) {
      const loadDetails = async () => {
        setLoading(true);
        try {
          const res = await okleykaOrderService.getWithItems(order.id);
          if (res) {
            setCarInfo(res.order.carInfo);
            setClientName(res.order.clientName || "");
            setClientPhone(res.order.clientPhone || "");
            setBoxNumber(res.order.boxNumber);
            setDateStart(res.order.dateStart);
            setDateEnd(res.order.dateEnd);
            setPaymentType(res.order.paymentMethod?.type || "cash");
            setOrganizationId(res.order.paymentMethod?.organizationId || "");
            setNotes(res.order.notes || "");

            // Map items
            const mappedItems = res.items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price.toString(),
            }));
            setServiceItems(
              mappedItems.length > 0 ? mappedItems : [{ id: uid(), name: "", price: "" }]
            );

            // Map workers
            const mappedWorkers: WorkersMap = {};
            mappedItems.forEach((item, idx) => {
              const itemWorkers = res.workers.filter((w) => w.itemId === item.id);
              mappedWorkers[idx] = itemWorkers.map((w) => ({
                employeeId: w.employeeId,
                salary: w.salary !== null ? w.salary.toString() : "",
              }));
            });
            setWorkersMap(mappedWorkers);
            setAvailability({ available: true });
          }
        } catch (err) {
          console.error("[EditOrderModal] error loading details:", err);
          toast.error("Не удалось загрузить детали заказа");
        } finally {
          setLoading(false);
        }
      };
      loadDetails();
    }
  }, [isOpen, order]);

  // ── Services helpers ─────────────────────────────────────────────────────
  const addService = () => {
    setServiceItems((prev) => [...prev, { id: uid(), name: "", price: "" }]);
  };

  const updateService = (idx: number, field: "name" | "price", val: string) => {
    setServiceItems((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  };

  const removeService = (idx: number) => {
    setServiceItems((prev) => prev.filter((_, i) => i !== idx));
    setWorkersMap((prev) => {
      const next = { ...prev };
      delete next[idx];
      // Shift keys above idx
      const shifted: WorkersMap = {};
      Object.entries(next).forEach(([k, v]) => {
        const ki = parseInt(k);
        shifted[ki > idx ? ki - 1 : ki] = v;
      });
      return shifted;
    });
  };

  const totalPrice = serviceItems.reduce(
    (sum, s) => sum + (parseFloat(s.price) || 0),
    0
  );

  // ── Workers helpers ──────────────────────────────────────────────────────
  const getWorkers = (idx: number): WorkerEntry[] => workersMap[idx] ?? [];

  const toggleWorker = (serviceIdx: number, empId: string) => {
    const current = getWorkers(serviceIdx);
    const exists = current.find((w) => w.employeeId === empId);
    if (exists) {
      setWorkersMap((prev) => ({
        ...prev,
        [serviceIdx]: current.filter((w) => w.employeeId !== empId),
      }));
    } else {
      setWorkersMap((prev) => ({
        ...prev,
        [serviceIdx]: [...current, { employeeId: empId, salary: "" }],
      }));
    }
  };

  const updateWorkerSalary = (serviceIdx: number, empId: string, salary: string) => {
    setWorkersMap((prev) => ({
      ...prev,
      [serviceIdx]: (prev[serviceIdx] ?? []).map((w) =>
        w.employeeId === empId ? { ...w, salary } : w
      ),
    }));
  };

  // ── Submit logic ─────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!carInfo.trim()) return "Укажите информацию об автомобиле";
    if (!boxNumber) return "Выберите бокс";
    if (!dateStart) return "Укажите дату начала";
    if (!dateEnd) return "Укажите дату окончания";
    if (dateEnd < dateStart) return "Дата окончания не может быть раньше даты начала";
    if (serviceItems.length === 0) return "Добавьте хотя бы одну услугу";
    if (serviceItems.some((s) => !s.name.trim())) return "Заполните названия всех услуг";
    if (availability && !availability.available) return "Выбранный бокс занят в указанные даты";
    return null;
  };

  const buildUnpaidList = () => {
    const unpaid: { employeeName: string; serviceName: string }[] = [];
    serviceItems.forEach((service, idx) => {
      const workers = getWorkers(idx);
      workers.forEach((w) => {
        if (!w.salary.trim() || w.salary === "") {
          const emp = employees.find((e) => e.id === w.employeeId);
          unpaid.push({
            employeeName: emp?.name ?? w.employeeId,
            serviceName: service.name || `Услуга ${idx + 1}`,
          });
        }
      });
    });
    return unpaid;
  };

  const doUpdate = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const paymentMethod: OkleykaPaymentMethod = { type: paymentType };
      if (paymentType === "organization" && organizationId) {
        const org = organizations.find((o) => o.id === organizationId);
        paymentMethod.organizationId = organizationId;
        paymentMethod.organizationName = org?.name;
      }

      const workers: { itemIndex: number; employeeId: string; salary: number | null }[] = [];
      serviceItems.forEach((_, idx) => {
        getWorkers(idx).forEach((w) => {
          workers.push({
            itemIndex: idx,
            employeeId: w.employeeId,
            salary: w.salary ? parseFloat(w.salary) : null,
          });
        });
      });

      const success = await okleykaOrderService.updateWithItems(order.id, {
        boxNumber,
        dateStart,
        dateEnd,
        carInfo: carInfo.trim(),
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        paymentMethod,
        totalPrice,
        notes: notes.trim() || undefined,
        items: serviceItems.map((s) => ({
          name: s.name.trim(),
          price: parseFloat(s.price) || 0,
        })),
        workers,
      });

      if (!success) {
        toast.error("Ошибка при обновлении заказа");
        return;
      }

      // Fetch the updated order details to dispatch with full fields (items, workers, etc.)
      const updatedDetails = await okleykaOrderService.getWithItems(order.id);
      if (updatedDetails) {
        const fullOrder: OkleykaOrder = {
          ...updatedDetails.order,
          items: updatedDetails.items,
          workers: updatedDetails.workers,
        };
        dispatch({ type: "UPDATE_ORDER", payload: fullOrder });
        toast.success("Заказ успешно обновлён!");
        onUpdated(fullOrder);
        onClose();
      } else {
        toast.error("Не удалось получить обновлённые данные заказа");
      }
    } catch (err) {
      console.error("[EditOrderModal] doUpdate error:", err);
      toast.error("Неожиданная ошибка");
    } finally {
      setSubmitting(false);
      setShowUnpaidModal(false);
    }
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const unpaid = buildUnpaidList();
    if (unpaid.length > 0) {
      setUnpaidItems(unpaid);
      setShowUnpaidModal(true);
    } else {
      doUpdate();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const shiftEmployeeObjects = employees.filter((e) => shiftEmployees.includes(e.id));

  const paymentTypes: Array<"cash" | "card" | "organization" | "debt"> = [
    "cash", "card", "organization", "debt",
  ];

  if (!order) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="edit-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              key="edit-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0f0f14] rounded-t-3xl shadow-2xl md:inset-0 md:m-auto md:max-w-2xl md:max-h-[90vh] md:rounded-2xl overflow-hidden"
              style={{ maxHeight: "92vh" }}
            >
              {/* Handle bar (mobile) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white">Редактировать заказ</h2>
                  <p className="text-xs text-white/50 mt-0.5">Внесите изменения в данные</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="text-white" size={18} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <span className="animate-spin text-violet-400 text-2xl">⟳</span>
                    <span className="text-white/50 text-sm">Загрузка данных заказа…</span>
                  </div>
                ) : (
                  <>
                    {/* ── Section 1: Car Info ── */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="text-violet-400" size={18} weight="duotone" />
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                          Информация об авто
                        </h3>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs text-white/50 mb-1">
                          Авто (номер / марка) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={carInfo}
                          onChange={(e) => setCarInfo(e.target.value)}
                          placeholder="A001AA 777 / Toyota Camry"
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-white/50 mb-1">Имя клиента</label>
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Иван Иванов"
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1">Телефон</label>
                          <input
                            type="tel"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            placeholder="+7 999 000 00 00"
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                          />
                        </div>
                      </div>
                    </section>

                    {/* ── Section 2: Box & Dates ── */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarBlank className="text-violet-400" size={18} weight="duotone" />
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                          Бокс и даты
                        </h3>
                      </div>

                      {/* Box toggle */}
                      <div className="grid grid-cols-2 gap-2">
                        {([1, 2] as const).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBoxNumber(b)}
                            className={`py-3 rounded-xl font-bold text-sm transition-all border ${
                              boxNumber === b
                                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40"
                                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                            }`}
                          >
                            Бокс {b}
                          </button>
                        ))}
                      </div>

                      {/* Date range */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-white/50 mb-1">
                            Дата начала <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => {
                              setDateStart(e.target.value);
                              if (dateEnd < e.target.value) setDateEnd(e.target.value);
                            }}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1">
                            Дата окончания <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            value={dateEnd}
                            min={dateStart}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Availability banner */}
                      <AnimatePresence mode="wait">
                        {checkingAvailability && (
                          <motion.div
                            key="checking"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white/50 text-xs"
                          >
                            <span className="animate-spin">⟳</span>
                            Проверка доступности…
                          </motion.div>
                        )}
                        {!checkingAvailability && availability && !availability.available && (
                          <motion.div
                            key="occupied"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs"
                          >
                            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold">Бокс занят!</p>
                              {availability.conflictingOrder && (
                                <p className="mt-0.5 text-red-400/80">
                                  {availability.conflictingOrder.carInfo} ·{" "}
                                  {availability.conflictingOrder.dateStart} —{" "}
                                  {availability.conflictingOrder.dateEnd}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                        {!checkingAvailability && availability?.available && (
                          <motion.div
                            key="free"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
                          >
                            <CheckCircle size={16} weight="fill" />
                            Бокс свободен в выбранные даты
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>

                    {/* ── Section 3: Services ── */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CurrencyRub className="text-violet-400" size={18} weight="duotone" />
                          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                            Услуги
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={addService}
                          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
                        >
                          <Plus size={14} weight="bold" />
                          Добавить
                        </button>
                      </div>

                      <div className="space-y-2">
                        {serviceItems.map((service, idx) => (
                          <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={service.name}
                              onChange={(e) => updateService(idx, "name", e.target.value)}
                              placeholder={`Услуга ${idx + 1}`}
                              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                            />
                            <input
                              type="number"
                              value={service.price}
                              onChange={(e) => updateService(idx, "price", e.target.value)}
                              placeholder="Цена"
                              min="0"
                              className="w-24 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                            />
                            {serviceItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeService(idx)}
                                className="w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center text-red-400 transition-colors shrink-0"
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                        <span className="text-sm text-white/60">Итого</span>
                        <span className="text-lg font-bold text-violet-300">
                          {totalPrice.toLocaleString("ru-RU")} BYN
                        </span>
                      </div>
                    </section>

                    {/* ── Section 4: Workers per service ── */}
                    {serviceItems.some((s) => s.name.trim()) && shiftEmployeeObjects.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <UserCircle className="text-violet-400" size={18} weight="duotone" />
                          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                            Исполнители
                          </h3>
                        </div>

                        {serviceItems.map((service, sIdx) => {
                          const sWorkers = getWorkers(sIdx);
                          return (
                            <div
                              key={service.id}
                              className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-2"
                            >
                              <p className="text-xs font-semibold text-white/60 mb-2">
                                {service.name || `Услуга ${sIdx + 1}`}
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {shiftEmployeeObjects.map((emp) => {
                                  const isSelected = sWorkers.some(
                                    (w) => w.employeeId === emp.id
                                  );
                                  const workerEntry = sWorkers.find(
                                    (w) => w.employeeId === emp.id
                                  );
                                  return (
                                    <div key={emp.id} className="space-y-1">
                                      <button
                                        type="button"
                                        onClick={() => toggleWorker(sIdx, emp.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                                          isSelected
                                            ? "bg-violet-500/20 border border-violet-500/40 text-white"
                                            : "bg-white/5 border border-white/8 text-white/50 hover:bg-white/8"
                                        }`}
                                      >
                                        <span
                                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected
                                              ? "border-violet-400 bg-violet-500"
                                              : "border-white/20"
                                          }`}
                                        >
                                          {isSelected && (
                                            <span className="block w-1.5 h-1.5 rounded-full bg-white" />
                                          )}
                                        </span>
                                        {emp.name}
                                      </button>

                                      {isSelected && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="pl-3"
                                        >
                                          <div className="relative">
                                            <input
                                              type="number"
                                              value={workerEntry?.salary ?? ""}
                                              onChange={(e) =>
                                                updateWorkerSalary(sIdx, emp.id, e.target.value)
                                              }
                                              placeholder="ЗП (оставьте пустым — укажете позже)"
                                              min="0"
                                              className="w-full pl-3 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/25 text-xs focus:outline-none focus:border-violet-500/50 transition-all"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                                              BYN
                                            </span>
                                          </div>
                                        </motion.div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </section>
                    )}

                    {/* ── Section 5: Payment ── */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Buildings className="text-violet-400" size={18} weight="duotone" />
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                          Оплата
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {paymentTypes.map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setPaymentType(pt)}
                            className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                              paymentType === pt
                                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/30"
                                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8"
                            }`}
                          >
                            {paymentLabels[pt]}
                          </button>
                        ))}
                      </div>

                      {paymentType === "organization" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <label className="block text-xs text-white/50 mb-1">Организация</label>
                          <select
                            value={organizationId}
                            onChange={(e) => setOrganizationId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all"
                          >
                            <option value="" className="bg-[#1a1a2e]">
                              Выберите организацию…
                            </option>
                            {organizations.map((org) => (
                              <option key={org.id} value={org.id} className="bg-[#1a1a2e]">
                                {org.name}
                              </option>
                            ))}
                          </select>
                        </motion.div>
                      )}

                      {paymentType === "debt" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
                        >
                          <WarningCircle size={16} weight="fill" className="shrink-0" />
                          Будет создан долг на сумму {totalPrice.toLocaleString("ru-RU")} BYN
                        </motion.div>
                      )}
                    </section>

                    {/* Notes */}
                    <section>
                      <label className="block text-xs text-white/50 mb-1">Заметки (необязательно)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Дополнительная информация…"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/60 resize-none transition-all"
                      />
                    </section>
                  </>
                )}
                {/* Bottom padding */}
                <div className="h-2" />
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-white/10 bg-[#0f0f14] flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting || loading}
                  className="flex-1 py-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || loading}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-violet-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Сохранение…
                    </>
                  ) : (
                    "Сохранить"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unpaid confirmation modal */}
      <ConfirmUnpaidModal
        isOpen={showUnpaidModal}
        onClose={() => setShowUnpaidModal(false)}
        onConfirm={doUpdate}
        unpaidItems={unpaidItems}
        isLoading={submitting}
      />
    </>
  );
};

export default EditOrderModal;
