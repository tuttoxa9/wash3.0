import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import {
  okleykaWorkerService,
  okleykaOrderService,
  okleykaItemService,
} from "@/lib/services/okleykaService";
import type { OkleykaOrderWorker, OkleykaOrder, OkleykaOrderItem } from "@/lib/types/okleyka";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CheckCircle2,
  Loader2,
  DollarSign,
  Car,
  X,
  Check,
} from "lucide-react";

// ── Enriched Record ───────────────────────────────────────────────────────────
interface EnrichedWorker {
  worker: OkleykaOrderWorker;
  order: OkleykaOrder | null;
  item: OkleykaOrderItem | null;
  employeeName: string;
}

// ── Salary Modal ──────────────────────────────────────────────────────────────
interface SalaryModalProps {
  worker: EnrichedWorker;
  onClose: () => void;
  onConfirm: (workerId: string, amount: number) => Promise<void>;
  saving: boolean;
}

const SalaryModal: React.FC<SalaryModalProps> = ({ worker, onClose, onConfirm, saving }) => {
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) { toast.error("Введите корректную сумму"); return; }
    await onConfirm(worker.worker.id, val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Назначить оплату</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 mb-4 p-3 bg-muted/40 rounded-xl text-sm">
          <p className="font-medium">{worker.employeeName}</p>
          {worker.order && (
            <p className="text-muted-foreground text-xs flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> {worker.order.carInfo}
            </p>
          )}
          {worker.item && (
            <p className="text-muted-foreground text-xs">{worker.item.name}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Сумма (BYN)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium hover:bg-muted transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Назначить
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── Worker Row ────────────────────────────────────────────────────────────────
interface WorkerRowProps {
  worker: EnrichedWorker;
  onAssign: (w: EnrichedWorker) => void;
}

const WorkerRow: React.FC<WorkerRowProps> = ({ worker, onAssign }) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border/30">
    <div className="flex-1 min-w-0 space-y-0.5">
      {worker.order && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <Car className="w-3 h-3 shrink-0" />
          {worker.order.carInfo}
        </p>
      )}
      {worker.item && (
        <p className="text-xs text-muted-foreground truncate">{worker.item.name}</p>
      )}
      {worker.order && (
        <p className="text-xs text-muted-foreground">
          {format(parseISO(worker.order.dateStart), "d MMM", { locale: ru })} — {format(parseISO(worker.order.dateEnd), "d MMM", { locale: ru })}
        </p>
      )}
    </div>
    <button
      onClick={() => onAssign(worker)}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
    >
      <DollarSign className="w-3.5 h-3.5" /> Назначить
    </button>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const OkleykaUnpaidPage: React.FC = () => {
  const { state, refreshUnpaidCount } = useOkleykaContext();
  const [enriched, setEnriched] = useState<EnrichedWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<EnrichedWorker | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUnpaid = useCallback(async () => {
    setLoading(true);
    try {
      const workers = await okleykaWorkerService.getUnpaid();
      if (workers.length === 0) { setEnriched([]); return; }

      // Fetch orders & items for each worker
      const orderIds = [...new Set(workers.map(w => w.orderId))];
      const orderMap = new Map<string, OkleykaOrder>();
      const itemMap = new Map<string, OkleykaOrderItem[]>();

      await Promise.all(orderIds.map(async (orderId) => {
        const result = await okleykaOrderService.getWithItems(orderId);
        if (result) {
          orderMap.set(orderId, result.order);
          itemMap.set(orderId, result.items);
        }
      }));

      const enrichedList: EnrichedWorker[] = workers.map(w => {
        const order = orderMap.get(w.orderId) ?? null;
        const items = itemMap.get(w.orderId) ?? [];
        const item = items.find(i => i.id === w.itemId) ?? null;
        const emp = state.employees.find(e => e.id === w.employeeId);
        return {
          worker: w,
          order,
          item,
          employeeName: emp?.name ?? "Неизвестный",
        };
      });

      setEnriched(enrichedList);
    } catch {
      toast.error("Не удалось загрузить неоплаченные услуги");
    } finally {
      setLoading(false);
    }
  }, [state.employees]);

  useEffect(() => { loadUnpaid(); }, [loadUnpaid]);

  const handleAssign = async (workerId: string, amount: number) => {
    setSaving(true);
    try {
      const ok = await okleykaWorkerService.assignSalary(workerId, amount);
      if (ok) {
        toast.success("Оплата назначена");
        setAssignTarget(null);
        await Promise.all([loadUnpaid(), refreshUnpaidCount()]);
      } else {
        toast.error("Не удалось назначить оплату");
      }
    } finally {
      setSaving(false);
    }
  };

  // Group by employee
  const grouped = enriched.reduce<Record<string, EnrichedWorker[]>>((acc, w) => {
    if (!acc[w.employeeName]) acc[w.employeeName] = [];
    acc[w.employeeName].push(w);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Неоплаченные услуги
            {state.unpaidWorkersCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                {state.unpaidWorkersCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Услуги без назначенной ЗП</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : enriched.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-base font-semibold text-foreground">Все услуги оплачены</p>
          <p className="text-sm text-muted-foreground mt-1">Нет записей без назначенной зарплаты</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {Object.entries(grouped).map(([empName, workers], gi) => (
              <motion.div
                key={empName}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{empName}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {workers.length} услуг
                  </span>
                </div>
                <div className="space-y-2">
                  {workers.map(w => (
                    <WorkerRow key={w.worker.id} worker={w} onAssign={setAssignTarget} />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Salary modal */}
      <AnimatePresence>
        {assignTarget && (
          <SalaryModal
            worker={assignTarget}
            onClose={() => setAssignTarget(null)}
            onConfirm={handleAssign}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OkleykaUnpaidPage;
