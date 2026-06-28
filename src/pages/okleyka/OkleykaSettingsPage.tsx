import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import {
  okleykaEmployeeService,
  okleykaOrganizationService,
  okleykaSettingsService,
  okleykaShiftService,
} from "@/lib/services/okleykaService";
import type { OkleykaEmployee, OkleykaOrganization } from "@/lib/types/okleyka";
import { toast } from "sonner";
import {
  Users,
  Building,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Loader2,
  Coins,
  AlertTriangle,
} from "lucide-react";

// ── Employee Modal ────────────────────────────────────────────────────────────
interface EmployeeModalProps {
  employee?: OkleykaEmployee;
  onClose: () => void;
  onSave: (name: string, position: string) => Promise<void>;
  saving: boolean;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ employee, onClose, onSave, saving }) => {
  const [name, setName] = useState(employee?.name ?? "");
  const [position, setPosition] = useState(employee?.position ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Введите имя"); return; }
    await onSave(name.trim(), position.trim());
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
          <h3 className="text-base font-semibold">
            {employee ? "Редактировать сотрудника" : "Добавить сотрудника"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Имя</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Иван Иванов"
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Должность</label>
            <input
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="Мастер оклейки"
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div className="flex gap-2 pt-1">
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
              Сохранить
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── Organization Modal ────────────────────────────────────────────────────────
interface OrgModalProps {
  org?: OkleykaOrganization;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  saving: boolean;
}

const OrgModal: React.FC<OrgModalProps> = ({ org, onClose, onSave, saving }) => {
  const [name, setName] = useState(org?.name ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Введите название"); return; }
    await onSave(name.trim());
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
          <h3 className="text-base font-semibold">
            {org ? "Редактировать организацию" : "Добавить организацию"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Название</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ООО «Пример»"
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
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
              Сохранить
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────
interface DeleteDialogProps {
  label: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ label, onCancel, onConfirm, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6"
    >
      <h3 className="text-base font-semibold mb-2">Удалить запись?</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Вы уверены, что хотите удалить <span className="font-medium text-foreground">«{label}»</span>? Это действие нельзя отменить.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium hover:bg-muted transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Удалить
        </button>
      </div>
    </motion.div>
  </div>
);

// ── Employees Tab ─────────────────────────────────────────────────────────────
const EmployeesTab: React.FC = () => {
  const { state, dispatch } = useOkleykaContext();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<OkleykaEmployee | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<OkleykaEmployee | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (name: string, position: string) => {
    setSaving(true);
    try {
      if (editTarget) {
        const ok = await okleykaEmployeeService.update({ ...editTarget, name, position });
        if (ok) {
          dispatch({ type: "UPDATE_EMPLOYEE", payload: { ...editTarget, name, position } });
          toast.success("Сотрудник обновлён");
          setShowModal(false);
          setEditTarget(undefined);
        } else {
          toast.error("Не удалось обновить сотрудника");
        }
      } else {
        const emp = await okleykaEmployeeService.add({ name, position });
        if (emp) {
          dispatch({ type: "ADD_EMPLOYEE", payload: emp });
          toast.success("Сотрудник добавлен");
          setShowModal(false);
        } else {
          toast.error("Не удалось добавить сотрудника");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await okleykaEmployeeService.delete(deleteTarget.id);
      if (ok) {
        dispatch({ type: "REMOVE_EMPLOYEE", payload: deleteTarget.id });
        toast.success("Сотрудник удалён");
        setDeleteTarget(undefined);
      } else {
        toast.error("Не удалось удалить сотрудника");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{state.employees.length} сотрудников</p>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {state.employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет сотрудников</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {state.employees.map((emp, i) => (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-card shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium">{emp.name}</p>
                  {emp.position && <p className="text-xs text-muted-foreground mt-0.5">{emp.position}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setEditTarget(emp); setShowModal(true); }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(emp)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <EmployeeModal
            employee={editTarget}
            onClose={() => { setShowModal(false); setEditTarget(undefined); }}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {deleteTarget && (
          <DeleteDialog
            label={deleteTarget.name}
            onCancel={() => setDeleteTarget(undefined)}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Organizations Tab ─────────────────────────────────────────────────────────
const OrganizationsTab: React.FC = () => {
  const { state, dispatch } = useOkleykaContext();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<OkleykaOrganization | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<OkleykaOrganization | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (name: string) => {
    setSaving(true);
    try {
      if (editTarget) {
        const ok = await okleykaOrganizationService.update({ ...editTarget, name });
        if (ok) {
          dispatch({ type: "UPDATE_ORGANIZATION", payload: { ...editTarget, name } });
          toast.success("Организация обновлена");
          setShowModal(false);
          setEditTarget(undefined);
        } else {
          toast.error("Не удалось обновить организацию");
        }
      } else {
        const org = await okleykaOrganizationService.add({ name });
        if (org) {
          dispatch({ type: "ADD_ORGANIZATION", payload: org });
          toast.success("Организация добавлена");
          setShowModal(false);
        } else {
          toast.error("Не удалось добавить организацию");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await okleykaOrganizationService.delete(deleteTarget.id);
      if (ok) {
        dispatch({ type: "REMOVE_ORGANIZATION", payload: deleteTarget.id });
        toast.success("Организация удалена");
        setDeleteTarget(undefined);
      } else {
        toast.error("Не удалось удалить организацию");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{state.organizations.length} организаций</p>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {state.organizations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет организаций</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {state.organizations.map((org, i) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-card shadow-sm"
              >
                <p className="text-sm font-medium">{org.name}</p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setEditTarget(org); setShowModal(true); }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(org)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <OrgModal
            org={editTarget}
            onClose={() => { setShowModal(false); setEditTarget(undefined); }}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {deleteTarget && (
          <DeleteDialog
            label={deleteTarget.name}
            onCancel={() => setDeleteTarget(undefined)}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Salary Settings Tab ───────────────────────────────────────────────────────
const SalarySettingsTab: React.FC = () => {
  const { state, dispatch } = useOkleykaContext();
  const [adminSalaryType, setAdminSalaryType] = useState<"fixed" | "percent">(
    state.settings?.adminSalaryType ?? "fixed"
  );
  const [adminSalaryValue, setAdminSalaryValue] = useState<string>(
    state.settings?.adminSalaryValue?.toString() ?? "0"
  );
  const [saving, setSaving] = useState(false);
  const [deletingShift, setDeletingShift] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueNum = Number(adminSalaryValue);
    if (isNaN(valueNum) || valueNum < 0) {
      toast.error("Введите корректное числовое значение");
      return;
    }
    setSaving(true);
    try {
      const ok = await okleykaSettingsService.save({
        adminSalaryType,
        adminSalaryValue: valueNum,
      });
      if (ok) {
        dispatch({
          type: "SET_SETTINGS",
          payload: { adminSalaryType, adminSalaryValue: valueNum },
        });
        toast.success("Настройки ЗП успешно сохранены");
      } else {
        toast.error("Не удалось сохранить настройки");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async () => {
    const dateInput = prompt(
      "Введите дату смены для удаления в формате ГГГГ-ММ-ДД (например, 2026-06-28):"
    );
    if (!dateInput) return;

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateInput)) {
      toast.error("Неверный формат даты. Используйте ГГГГ-ММ-ДД");
      return;
    }

    const confirmInput = prompt(
      `ВНИМАНИЕ! Это полностью удалит смену за ${dateInput} и ВСЕ связанные выплаты/данные смены.\nДля подтверждения введите дату еще раз:`
    );
    if (confirmInput !== dateInput) {
      toast.error("Введенная дата не совпадает. Операция отменена.");
      return;
    }

    setDeletingShift(true);
    try {
      const ok = await okleykaShiftService.deleteByDate(dateInput);
      if (ok) {
        toast.success(`Смена за ${dateInput} успешно удалена`);
      } else {
        toast.error(`Не удалось удалить смену за ${dateInput}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при удалении смены");
    } finally {
      setDeletingShift(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Зарплата администратора</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Настройка расчета ежедневной ставки администратора оклейки
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">Тип расчета</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdminSalaryType("fixed")}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  adminSalaryType === "fixed"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Фиксированная ставка
              </button>
              <button
                type="button"
                onClick={() => setAdminSalaryType("percent")}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  adminSalaryType === "percent"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Процент от выручки
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              {adminSalaryType === "fixed" ? "Ставка (BYN)" : "Процент (%)"}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={adminSalaryValue}
                onChange={(e) => setAdminSalaryValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition pr-12"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                {adminSalaryType === "fixed" ? "BYN" : "%"}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Сохранить
          </button>
        </form>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-destructive/10 text-destructive rounded-xl mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-destructive">Опасная зона</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Действия ниже могут привести к необратимому удалению данных.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-destructive/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Удалить смену полностью</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Удаляет запись смены и очищает все ассоциированные данные за этот день.
            </p>
          </div>
          <button
            onClick={handleDeleteShift}
            disabled={deletingShift}
            className="px-4 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold rounded-xl transition-colors shrink-0 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {deletingShift ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Удалить смену
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const OkleykaSettingsPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5"
    >
      <div>
        <h1 className="text-xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление справочниками оклейки</p>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="w-full">
          <TabsTrigger value="employees" className="flex-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Сотрудники
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex-1 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" /> Организации
          </TabsTrigger>
          <TabsTrigger value="salary" className="flex-1 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" /> Настройки ЗП
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <EmployeesTab />
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          <OrganizationsTab />
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <SalarySettingsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default OkleykaSettingsPage;
