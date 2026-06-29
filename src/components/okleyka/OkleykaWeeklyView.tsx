import type React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Trash2, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOkleykaContext } from '@/lib/context/OkleykaContext';
import { okleykaAppointmentService } from '@/lib/services/okleykaService';
import type { OkleykaAppointment } from '@/lib/types/okleyka';

interface OkleykaWeeklyViewProps {
  appointments: OkleykaAppointment[];
  onRefresh: () => void;
}

const getDigits = (phone: string) => phone.replace(/\D/g, '');

const MessengerButtons: React.FC<{ phone: string }> = ({ phone }) => {
  const d = getDigits(phone);
  if (!d) return null;
  return (
    <div className="flex gap-1 mt-1">
      <a
        href={`https://t.me/+${d}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >TG</a>
      <a
        href={`https://wa.me/${d}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >WA</a>
      <a
        href={`viber://chat?number=%2B${d}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >Vb</a>
    </div>
  );
};

const AppointmentCard: React.FC<{
  apt: OkleykaAppointment;
  isActionable: boolean;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAssign: (id: string, empId: string) => Promise<void>;
  employees: { id: string; name: string }[];
}> = ({ apt, isActionable, onComplete, onDelete, onAssign, employees }) => {
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEmpSelect, setShowEmpSelect] = useState(false);

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const assignedEmp = apt.assignedEmployeeId
    ? employees.find((e) => e.id === apt.assignedEmployeeId)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-1.5 text-left"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white truncate">{apt.carInfo}</p>
          {apt.time && <p className="text-[10px] text-white/50">{apt.time}</p>}
        </div>
        <span
          className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
            statusColors[apt.status] || ''
          }`}
        >
          {apt.status === 'scheduled' ? 'Зап.' : apt.status === 'completed' ? 'Готово' : 'Отм.'}
        </span>
      </div>

      {apt.service && (
        <p className="text-[10px] text-white/60 truncate">{apt.service}</p>
      )}

      {apt.clientPhone && (
        <div>
          <p className="text-[10px] text-white/50">{apt.clientPhone}</p>
          <MessengerButtons phone={apt.clientPhone} />
        </div>
      )}

      {assignedEmp && (
        <p className="text-[10px] text-purple-300 font-medium">👤 {assignedEmp.name}</p>
      )}

      {isActionable && apt.status === 'scheduled' && (
        <div className="space-y-1 pt-1 border-t border-white/[0.06]">
          {/* Assign employee */}
          {!showEmpSelect ? (
            <button
              onClick={() => setShowEmpSelect(true)}
              className="w-full text-[10px] py-1 rounded-lg bg-purple-500/15 text-purple-400 font-semibold hover:bg-purple-500/25 transition-colors flex items-center justify-center gap-1"
            >
              <User size={10} /> {assignedEmp ? 'Сменить' : 'Назначить'}
            </button>
          ) : (
            <div className="space-y-1">
              <select
                className="w-full text-[10px] bg-zinc-800 border border-zinc-700 text-white rounded-lg p-1"
                defaultValue=""
                onChange={async (e) => {
                  if (e.target.value) {
                    await onAssign(apt.id, e.target.value);
                    setShowEmpSelect(false);
                  }
                }}
              >
                <option value="">Выбрать мастера...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowEmpSelect(false)}
                className="w-full text-[10px] text-white/40 hover:text-white/60"
              >
                Отмена
              </button>
            </div>
          )}

          {/* Complete / Delete */}
          <div className="flex gap-1">
            <button
              onClick={async () => {
                setCompleting(true);
                await onComplete(apt.id);
                setCompleting(false);
              }}
              disabled={completing}
              className="flex-1 text-[10px] py-1 rounded-lg bg-green-500/15 text-green-400 font-semibold hover:bg-green-500/25 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {completing ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Check size={10} />
              )}
              Готово
            </button>
            <button
              onClick={async () => {
                setDeleting(true);
                await onDelete(apt.id);
                setDeleting(false);
              }}
              disabled={deleting}
              className="flex-1 text-[10px] py-1 rounded-lg bg-red-500/15 text-red-400 font-semibold hover:bg-red-500/25 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Trash2 size={10} />
              )}
              Удалить
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const OkleykaWeeklyView: React.FC<OkleykaWeeklyViewProps> = ({ appointments, onRefresh }) => {
  const { state } = useOkleykaContext();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getAptsForDay = (day: Date) =>
    appointments.filter((apt) => {
      try {
        return isSameDay(parseISO(apt.date), day);
      } catch {
        return false;
      }
    });

  const handleComplete = async (id: string) => {
    const ok = await okleykaAppointmentService.updateStatus(id, 'completed');
    if (ok) {
      toast.success('Запись завершена');
      onRefresh();
    } else {
      toast.error('Ошибка');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await okleykaAppointmentService.deleteById(id);
    if (ok) {
      toast.success('Запись удалена');
      onRefresh();
    } else {
      toast.error('Ошибка');
    }
  };

  const handleAssign = async (id: string, empId: string) => {
    const ok = await okleykaAppointmentService.assignEmployee(id, empId);
    if (ok) {
      toast.success('Мастер назначен');
      onRefresh();
    } else {
      toast.error('Ошибка');
    }
  };

  const rangeLabel = `${format(days[0], 'd MMM', { locale: ru })} – ${format(days[6], 'd MMM yyyy', { locale: ru })}`;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentWeekStart((prev) => subWeeks(prev, 1))}
          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-white capitalize">{rangeLabel}</span>
        <button
          onClick={() => setCurrentWeekStart((prev) => addWeeks(prev, 1))}
          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 7-day grid – horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {days.map((day, idx) => {
            const apts = getAptsForDay(day);
            const isToday_ = isToday(day);
            const isTomorrow_ = isTomorrow(day);
            const isActionable = isToday_ || isTomorrow_;
            const isPast = day < new Date() && !isToday_;

            return (
              <div
                key={idx}
                className={`flex flex-col gap-2 w-[145px] shrink-0 rounded-2xl p-2.5 ${
                  isToday_
                    ? 'bg-purple-500/10 border border-purple-500/25'
                    : isPast
                      ? 'bg-white/[0.02] border border-white/[0.04]'
                      : 'bg-white/[0.04] border border-white/[0.07]'
                }`}
              >
                {/* Day header */}
                <div className="text-center">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isToday_ ? 'text-purple-400' : 'text-white/40'
                    }`}
                  >
                    {dayNames[idx]}
                  </p>
                  <p
                    className={`text-lg font-bold leading-tight ${
                      isToday_ ? 'text-purple-300' : isPast ? 'text-white/30' : 'text-white/80'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>
                  {isToday_ && (
                    <p className="text-[8px] text-purple-400 font-bold">СЕГОДНЯ</p>
                  )}
                  {isTomorrow_ && (
                    <p className="text-[8px] text-amber-400 font-bold">ЗАВТРА</p>
                  )}
                </div>

                {/* Appointments */}
                <div className="space-y-1.5 flex-1">
                  {apts.length === 0 ? (
                    <p className="text-[10px] text-white/20 text-center py-2">—</p>
                  ) : (
                    apts.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        apt={apt}
                        isActionable={isActionable}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                        onAssign={handleAssign}
                        employees={state.employees}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OkleykaWeeklyView;
