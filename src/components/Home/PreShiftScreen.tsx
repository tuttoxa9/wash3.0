import React from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { Calendar, ChevronDown, Check, Users, Shield, ArrowRight, Loader2 } from "lucide-react";
import type { Employee, EmployeeRole } from "@/lib/types";

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
  loading: { savingShift: boolean; employees: boolean };
}

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
      <div className="w-full max-w-2xl grid gap-6">
        {/* Employees Selection Card */}
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
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
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
                          className="sr-only"
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

                      {/* Integrated Role Switcher */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isSelected
                            ? "max-h-12 opacity-100 mt-3"
                            : "max-h-0 opacity-0 mt-0"
                        }`}
                      >
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-center mt-4">
          <button
            onClick={startShift}
            disabled={
              shiftEmployees.length === 0 ||
              loading.savingShift ||
              loading.employees
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
