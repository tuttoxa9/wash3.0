import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { Calendar, ChevronDown, Check, Users, Shield, ArrowRight, Loader2, Clock } from "lucide-react";
import type { Employee, EmployeeRole, Appointment } from "@/lib/types";

interface PreShiftScreenProps {
  selectedDate: string;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  calendarRef: React.RefObject<HTMLDivElement | null>;
  handleDateSelect: (date: Date | undefined) => void;
  shiftSectionRef: React.RefObject<HTMLDivElement | null>;
  isShiftSectionHighlighted: boolean;
  employees: Employee[];
  shiftEmployees: string[];
  handleEmployeeSelection: (employeeId: string) => void;
  employeeRoles: Record<string, EmployeeRole>;
  setEmployeeRoles: (roles: Record<string, EmployeeRole>) => void;
  startShift: () => void;
  startOfDayCash: string;
  setStartOfDayCash: (val: string) => void;
  previousDayCash?: number;
  loading: { savingShift: boolean; employees: boolean };
  upcomingAppointments: Appointment[];
  totalAppointmentsToday: number;
}

import { Skeleton } from "@/components/ui/skeleton";

export const PreShiftScreen: React.FC<PreShiftScreenProps> = ({
  selectedDate,
  isCalendarOpen,
  setIsCalendarOpen,
  calendarRef,
  handleDateSelect,
  shiftSectionRef,
  isShiftSectionHighlighted,
  employees,
  shiftEmployees,
  handleEmployeeSelection,
  employeeRoles,
  setEmployeeRoles,
  startShift,
  loading,
  startOfDayCash,
  setStartOfDayCash,
  previousDayCash,
  upcomingAppointments,
  totalAppointmentsToday,
}) => {
  return (
    <div className="min-h-[85dvh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 bg-background/50">
      {/* Header Section */}
      <div className="text-center mb-10 w-full max-w-2xl">
        <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 text-primary mb-5 border border-primary/20 shadow-sm">
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
          Открытие смены
        </h1>

        {/* Interactive Date Selector */}
        <div className="flex justify-center items-center gap-2 text-muted-foreground text-sm sm:text-base">
          <span>Дата смены:</span>
          <div className="relative">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-foreground bg-card border border-border/50 hover:bg-accent/50 hover:border-border transition-colors shadow-sm"
            >
              {format(parseISO(selectedDate), "d MMMM yyyy", { locale: ru })}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Calendar Dropdown */}
            {isCalendarOpen && (
              <div
                ref={calendarRef}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl border border-border z-50 p-3 animate-in slide-in-from-top-2 duration-200"
              >
                <DayPicker
                  mode="single"
                  selected={parseISO(selectedDate)}
                  onSelect={handleDateSelect}
                  locale={ru}
                  modifiers={{ today: new Date() }}
                  modifiersStyles={{
                    today: { fontWeight: "bold", color: "var(--primary)" },
                  }}
                  className="bg-card rounded-xl border-none m-0"
                  classNames={{
                    head_cell:
                      "text-muted-foreground font-medium text-sm w-9 font-normal",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    nav_button:
                      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    caption: "flex justify-center pt-1 relative items-center mb-4",
                    caption_label: "text-sm font-medium",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column - Employees Selection Card */}
        <div
          ref={shiftSectionRef}
          className={`bg-card rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
            isShiftSectionHighlighted
              ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
              : "border-border/50"
          }`}
        >
          <div className="p-5 sm:p-6 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Сотрудники</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Выберите сотрудников, работающих в эту смену, и назначьте им роли
            </p>
          </div>

          <div className="p-5 sm:p-6">
            {loading.employees ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-xl bg-muted/60" />
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-10 bg-accent/30 rounded-xl border border-dashed border-border">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Нет сотрудников</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Добавьте сотрудников на странице "Сотрудники"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employees.map((employee) => {
                  const isSelected = shiftEmployees.includes(employee.id);
                  const currentRole = employeeRoles[employee.id] || "washer";

                  return (
                    <div
                      key={employee.id}
                      className={`relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "bg-background border-border hover:border-border/80 hover:bg-accent/5"
                      }`}
                    >
                      {/* Selection Toggle */}
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
                          onChange={() => handleEmployeeSelection(employee.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate transition-colors ${
                              isSelected
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {employee.name}
                          </p>
                        </div>
                      </label>

                      {/* Integrated Role Switcher & Min Payment Toggle */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isSelected
                            ? "max-h-24 opacity-100 mt-3"
                            : "max-h-0 opacity-0 mt-0"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center bg-background rounded-lg border border-border/40 p-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({
                                  ...employeeRoles,
                                  [employee.id]: "washer",
                                });
                              }}
                              className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                                currentRole === "washer"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              }`}
                            >
                              Мойщик
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({
                                  ...employeeRoles,
                                  [employee.id]: "admin",
                                });
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                                currentRole === "admin"
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              Админ
                            </button>
                          </div>

                          {/* Min Payment Toggle */}
                          <label className="flex items-center gap-2 px-1 py-0.5 cursor-pointer group w-fit">
                            <div
                              className={`flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-colors ${
                                (employeeRoles as any)?.[`min_${employee.id}`] !== false
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-input bg-background"
                              }`}
                            >
                              {(employeeRoles as any)?.[`min_${employee.id}`] !== false && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={(employeeRoles as any)?.[`min_${employee.id}`] !== false}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({
                                  ...employeeRoles,
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
            )}
          </div>
        </div>

        {/* Right Column - Upcoming Appointments */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full max-h-[500px]">
          <div className="p-5 sm:p-6 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Записи</h2>
            </div>
            <p className="text-sm text-muted-foreground">Ближайшие 2 часа</p>
          </div>

          <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Нет записей на ближайшее время</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-3 bg-background rounded-xl border border-border/50 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">{appointment.time}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {appointment.service}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{appointment.clientName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/50 bg-muted/10 text-center">
            <span className="text-sm font-medium text-muted-foreground">
              Всего записей на день: <span className="text-foreground">{totalAppointmentsToday}</span>
            </span>
          </div>
        </div>


        {/* Блок ввода кассы на начало дня */}
        <div className="lg:col-span-2 mt-4 p-6 bg-card border border-border/50 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <h3 className="text-xl font-bold text-foreground">Состояние кассы</h3>
          </div>

          {previousDayCash !== undefined && (
            <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50 flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium">Остаток в кассе за предыдущую смену:</span>
              <span className="text-lg font-bold text-foreground">{previousDayCash.toFixed(2)} BYN</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Наличные в кассе на начало смены <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={startOfDayCash}
              onChange={(e) => setStartOfDayCash(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 bg-muted/20 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-base font-medium transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Введите сумму наличных, которая физически находится в кассе до начала работы.
            </p>
          </div>
        </div>


        {/* Action Bar */}
        <div className="lg:col-span-2 flex justify-center mt-4">
          <button
            onClick={startShift}
            disabled={
              shiftEmployees.length === 0 ||
              loading.savingShift ||
              loading.employees ||
              !startOfDayCash || Number.parseFloat(startOfDayCash) < 0
            }
            className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20 w-full sm:w-auto min-w-[280px]"
          >
            {loading.savingShift ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Открытие смены...</span>
              </>
            ) : (
              <>
                <span>Начать работу</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
            {shiftEmployees.length > 0 && !loading.savingShift && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background rounded-full text-xs flex items-center justify-center font-bold shadow-sm border-2 border-background animate-in zoom-in duration-200">
                {shiftEmployees.length}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
