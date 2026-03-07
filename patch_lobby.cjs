const fs = require('fs');

const path = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

// We are going to completely replace the Morning Lobby block inside `if (!shiftStarted)`
const lobbyStartStr = '  if (!shiftStarted) {\n    return (\n      <div className="min-h-[85dvh]';
const startIndex = content.indexOf(lobbyStartStr);

if (startIndex === -1) {
    console.log("Could not find Lobby start.");
    process.exit(1);
}

const lobbyEndStr = '  // --- ACTIVE SHIFT VIEW ---';
const endIndex = content.indexOf(lobbyEndStr, startIndex);

if (endIndex === -1) {
    console.log("Could not find Lobby end.");
    process.exit(1);
}

const newLobbyCode = `
  if (!shiftStarted) {
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
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl border border-border z-50 p-2 animate-in slide-in-from-top-2 duration-200"
                >
                  <DayPicker
                    mode="single"
                    selected={parseISO(selectedDate)}
                    onSelect={(date) => {
                      if (date) {
                        const newDateStr = format(date, "yyyy-MM-dd");
                        if (newDateStr !== selectedDate) {
                          handleDateChange(newDateStr);
                        }
                        setIsCalendarOpen(false);
                      }
                    }}
                    locale={ru}
                    modifiers={{
                      today: new Date(),
                    }}
                    modifiersStyles={{
                      today: { fontWeight: "bold", color: "var(--primary)" },
                    }}
                    className="p-3 bg-card rounded-xl border-none"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium text-foreground",
                      nav: "space-x-1 flex items-center",
                      nav_button:
                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-muted transition-colors",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell:
                        "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] capitalize",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm relative p-0 hover:bg-muted rounded-md focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-md transition-colors",
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-md",
                      day_today: "text-primary font-bold bg-primary/10",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_hidden: "invisible",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Employee & Role Selector */}
        <div className="w-full max-w-2xl bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              Сотрудники на смене
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              Выбрано: {shiftEmployees.length}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {state.employees.length === 0 ? (
                <p className="text-muted-foreground text-sm col-span-full text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border/50">
                  Сотрудники не найдены. Добавьте их в настройках.
                </p>
              ) : (
                state.employees.map((employee) => {
                  const isSelected = shiftEmployees.includes(employee.id);
                  const role = employeeRoles[employee.id] || "washer";

                  return (
                    <div
                      key={employee.id}
                      className={\`relative flex flex-col p-3 rounded-xl border transition-all duration-200 \${
                        isSelected
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "bg-background border-border hover:border-border/80 hover:bg-accent/5"
                      }\`}
                    >
                      {/* Selection Toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className={\`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors \${
                          isSelected ? "bg-primary border-primary text-white" : "border-input bg-background"
                        }\`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => handleEmployeeSelection(employee.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={\`text-sm font-medium truncate transition-colors \${isSelected ? "text-foreground" : "text-muted-foreground"}\`}>
                            {employee.name}
                          </p>
                        </div>
                      </label>

                      {/* Integrated Role Switcher (Reveals smoothly) */}
                      <div className={\`overflow-hidden transition-all duration-300 ease-in-out \${isSelected ? "max-h-12 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}\`}>
                         <div className="flex items-center bg-background rounded-lg border border-border/40 p-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({ ...employeeRoles, [employee.id]: "washer" });
                              }}
                              className={\`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all \${
                                role === "washer" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                              }\`}
                            >
                              Мойщик
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeRoles({ ...employeeRoles, [employee.id]: "admin" });
                              }}
                              className={\`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all \${
                                role === "admin" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                              }\`}
                            >
                              Админ
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Start Action */}
            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {shiftEmployees.length === 0 ? "Выберите хотя бы одного" : "Все готово к началу работы"}
              </span>
              <button
                onClick={startShift}
                disabled={shiftEmployees.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Начать смену
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Small Appointments Glance */}
        {state.appointments.filter(a => a.date === selectedDate).length > 0 && (
          <div className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Запланировано {state.appointments.filter(a => a.date === selectedDate).length} записей
          </div>
        )}
      </div>
    );
  }

`;

content = content.substring(0, startIndex) + newLobbyCode + content.substring(endIndex);

fs.writeFileSync(path, content);
console.log("Successfully patched Morning Lobby to a mature, structured design.");
