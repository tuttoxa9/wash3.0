import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import { okleykaOrderService } from "@/lib/services/okleykaService";
import type { OkleykaOrder } from "@/lib/types/okleyka";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Filter,
  Calendar,
  Car,
  Phone,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Edit,
  Package,
  Layers,
} from "lucide-react";
import CompleteOrderModal from "@/components/okleyka/CompleteOrderModal";
import EditOrderModal from "@/components/okleyka/EditOrderModal";
import MessengerLinks from "@/components/okleyka/MessengerLinks";

type StatusFilter = "all" | "active" | "completed" | "cancelled";
type BoxFilter = "all" | "1" | "2";
type PeriodType = "current_month" | "custom";

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: OkleykaOrder["status"] }> = ({ status }) => {
  const cfg = {
    active: { label: "Активный", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    completed: { label: "Завершён", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
    cancelled: { label: "Отменён", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  }[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Box Badge ─────────────────────────────────────────────────────────────────
const BoxBadge: React.FC<{ box: 1 | 2 }> = ({ box }) => (
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
    box === 1
      ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
      : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
  }`}>
    Бокс {box}
  </span>
);

// ── Payment Label ─────────────────────────────────────────────────────────────
const paymentLabel = (order: OkleykaOrder) => {
  const t = order.paymentMethod?.type;
  if (!t) return null;
  const map: Record<string, string> = {
    cash: "Наличные",
    card: "Карта",
    organization: order.paymentMethod?.organizationName || "Организация",
    debt: "Долг",
  };
  return map[t] || t;
};

// ── Order Card ────────────────────────────────────────────────────────────────
interface OrderCardProps {
  order: OkleykaOrder;
  employees: { id: string; name: string }[];
  onComplete: (order: OkleykaOrder) => void;
  onEdit: (order: OkleykaOrder) => void;
  onCancel: (order: OkleykaOrder) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, employees, onComplete, onEdit, onCancel }) => {
  const workerNames = (order.workers || []).map(w => {
    const emp = employees.find(e => e.id === w.employeeId);
    return emp?.name ?? "—";
  }).filter(Boolean);

  const itemNames = (order.items || []).map(i => i.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <BoxBadge box={order.boxNumber} />
        <StatusBadge status={order.status} />
        {paymentLabel(order) && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {paymentLabel(order)}
          </span>
        )}
        <span className="ml-auto text-base font-bold tabular-nums">
          {order.totalPrice.toLocaleString("ru-RU")} BYN
        </span>
      </div>

      {/* Car + Client */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {order.carInfo}
        </div>
        {order.clientName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <User className="w-3.5 h-3.5 shrink-0" />
            {order.clientName}
            {order.clientPhone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {order.clientPhone}
                <MessengerLinks phone={order.clientPhone} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        {format(parseISO(order.dateStart), "d MMM", { locale: ru })} — {format(parseISO(order.dateEnd), "d MMM yyyy", { locale: ru })}
      </div>

      {/* Items */}
      {itemNames.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{itemNames.join(", ")}</span>
        </div>
      )}

      {/* Workers */}
      {workerNames.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{workerNames.join(", ")}</span>
        </div>
      )}

      {/* Actions */}
      {order.status === "active" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onEdit(order)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Редактировать
          </button>
          <button
            onClick={() => onComplete(order)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
          </button>
          <button
            onClick={() => onCancel(order)}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const OkleykaOrdersPage: React.FC = () => {
  const { state } = useOkleykaContext();

  const [period, setPeriod] = useState<PeriodType>("current_month");
  const [customStart, setCustomStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [boxFilter, setBoxFilter] = useState<BoxFilter>("all");

  const [orders, setOrders] = useState<OkleykaOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [completeTarget, setCompleteTarget] = useState<OkleykaOrder | null>(null);
  const [editTarget, setEditTarget] = useState<OkleykaOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let start: string, end: string;
      if (period === "current_month") {
        const now = new Date();
        start = format(startOfMonth(now), "yyyy-MM-dd");
        end = format(endOfMonth(now), "yyyy-MM-dd");
      } else {
        start = customStart;
        end = customEnd;
      }
      const data = await okleykaOrderService.getByDateRange(start, end);
      setOrders(data);
    } catch {
      toast.error("Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleCancel = async (order: OkleykaOrder) => {
    const ok = await okleykaOrderService.update(order.id, { status: "cancelled" });
    if (ok) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "cancelled" } : o));
      toast.success("Заказ отменён");
    } else {
      toast.error("Не удалось отменить заказ");
    }
  };

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (boxFilter !== "all" && String(o.boxNumber) !== boxFilter) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Заказы</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} заказов</p>
      </div>

      {/* Filters */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
          {/* Period */}
          <div className="flex bg-muted/60 p-0.5 rounded-xl gap-0.5">
            {(["current_month", "custom"] as PeriodType[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                {p === "current_month" ? "Текущий месяц" : "Период"}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Status filter */}
          <div className="flex bg-muted/60 p-0.5 rounded-xl gap-0.5">
            {(["all", "active", "completed", "cancelled"] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                {{ all: "Все", active: "Активные", completed: "Завершённые", cancelled: "Отменённые" }[s]}
              </button>
            ))}
          </div>

          {/* Box filter */}
          <div className="flex bg-muted/60 p-0.5 rounded-xl gap-0.5">
            {(["all", "1", "2"] as BoxFilter[]).map(b => (
              <button
                key={b}
                onClick={() => setBoxFilter(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  boxFilter === b ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                {b === "all" ? "Все боксы" : `Бокс ${b}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Нет заказов</p>
          <p className="text-xs mt-1">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                employees={state.employees}
                onComplete={setCompleteTarget}
                onEdit={setEditTarget}
                onCancel={handleCancel}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {completeTarget && (
          <CompleteOrderModal
            isOpen={!!completeTarget}
            order={completeTarget}
            onClose={() => setCompleteTarget(null)}
            onCompleted={() => { setCompleteTarget(null); loadOrders(); }}
          />
        )}
        {editTarget && (
          <EditOrderModal
            isOpen={!!editTarget}
            order={editTarget}
            onClose={() => setEditTarget(null)}
            shiftEmployees={state.currentShift?.employeeIds || []}
            employees={state.employees}
            organizations={state.organizations}
            onUpdated={() => { setEditTarget(null); loadOrders(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OkleykaOrdersPage;
