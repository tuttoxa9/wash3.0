const fs = require('fs');

const path = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The main return statement starts at line ~815
const mainReturnStartStr = '  return (\n    <div className="space-y-4">';
const startIndex = content.indexOf(mainReturnStartStr);

if (startIndex === -1) {
  console.log("Could not find main return statement.");
  process.exit(1);
}

const customPreShiftLobby = `
  // --- RENDERING SPLIT ---
  // If the shift hasn't started, we render the Morning Lobby (Pre-shift state)
  if (!shiftStarted) {
    return (
      <div className="min-h-[85dvh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-500">

        {/* Hero Section */}
        <div className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-6 shadow-sm ring-1 ring-primary/20">
            <Calendar className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
            Доброе утро!
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Сегодня <span className="font-medium text-foreground">{format(parseISO(selectedDate), "d MMMM yyyy", { locale: ru })}</span>. Давайте соберем команду и откроем смену.
          </p>
        </div>

        {/* Builder Card */}
        <div className="w-full max-w-3xl bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/5 dark:shadow-black/20 relative overflow-hidden">
          {/* Subtle gradient decorations inside the card */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              Кто сегодня работает?
            </h2>

            {/* Employee Chips */}
            <div className="flex flex-wrap gap-3 mb-8">
              {state.employees.length === 0 ? (
                <p className="text-muted-foreground w-full text-center py-4">Нет доступных сотрудников в базе.</p>
              ) : (
                state.employees.map((employee) => {
                  const isSelected = shiftEmployees.includes(employee.id);
                  return (
                    <button
                      key={employee.id}
                      onClick={() => handleEmployeeSelection(employee.id)}
                      className={\`group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-3 \${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                      }\`}
                    >
                      {/* Avatar placeholder */}
                      <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold \${isSelected ? 'bg-primary-foreground/20 text-white' : 'bg-muted-foreground/20'}\`}>
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      {employee.name}
                    </button>
                  );
                })
              )}
            </div>

            {/* Roles selector (only shows if people are selected and method requires it) */}
            {shiftEmployees.length > 0 && state.salaryCalculationMethod === "minimumWithPercentage" && (
              <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Назначьте роли:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shiftEmployees.map(empId => {
                    const emp = state.employees.find(e => e.id === empId);
                    if (!emp) return null;
                    return (
                      <div key={\`role-\${empId}\`} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                        <span className="font-medium text-sm">{emp.name}</span>
                        <select
                          className="bg-muted/50 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-1 focus:ring-primary cursor-pointer"
                          value={employeeRoles[empId] || "washer"}
                          onChange={(e) => {
                            setEmployeeRoles({
                              ...employeeRoles,
                              [empId]: e.target.value as EmployeeRole,
                            });
                          }}
                        >
                          <option value="washer">Мойщик</option>
                          <option value="admin">Админ</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Start Action */}
            <div className="flex flex-col items-center pt-4 border-t border-border/30 mt-4">
              <button
                onClick={startShift}
                disabled={shiftEmployees.length === 0}
                className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none"
              >
                🚀 Открыть смену
              </button>
              {shiftEmployees.length === 0 && (
                <p className="text-xs text-muted-foreground mt-4">Выберите хотя бы одного сотрудника для старта</p>
              )}
            </div>
          </div>
        </div>

        {/* Small Appointments Glance (Optional) */}
        {appointments.filter(a => a.date === selectedDate).length > 0 && (
          <div className="mt-8 text-sm font-medium text-muted-foreground bg-card/40 px-6 py-3 rounded-full border border-border/30 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            На сегодня предстоит {appointments.filter(a => a.date === selectedDate).length} записей
          </div>
        )}
      </div>
    );
  }

  // --- ACTIVE SHIFT VIEW ---
  return (
    <div className="space-y-4">
`;

// Insert the import for ru locale if not exists
let finalContent = content;

const importStr = `import { ru } from "date-fns/locale";\n`;
if (!finalContent.includes(importStr) && finalContent.includes('import { format,')) {
    // Just inject it near the other date-fns imports
    finalContent = finalContent.replace(
        /import { format, parseISO } from "date-fns";/g,
        'import { format, parseISO } from "date-fns";\nimport { ru } from "date-fns/locale";'
    );
}

// Replace the return block
finalContent = finalContent.substring(0, startIndex) + customPreShiftLobby + finalContent.substring(startIndex + '  return (\n    <div className="space-y-4">'.length);

// Now we need to remove the old shift logic from the Active Shift View
// The old shift builder was wrapped in a <div className="space-y-3 md:space-y-4"> -> {/* Квадратики работников */}
// Let's remove the "Квадратики работников" block entirely, as it's now handled by our Lobby
// Wait, when shift IS started, they still need to see WHO is working!
// Let's leave the employee cards in the Active View, but remove the "Состав смены" / "Редактировать состав смены" builder block!

const employeesBuilderStart = '{/* Интерфейс выбора сотрудников для смены */}';
const builderIndexStart = finalContent.indexOf(employeesBuilderStart);

if (builderIndexStart !== -1) {
    // Find the end of this block. It's a bit tricky, but it ends with:
    //                      </button>
    //                    </div>
    //                  </div>
    //                )}
    //              </div>
    //            )}

    const endMarker = '              </div>\n            )}';
    let currentIndex = builderIndexStart;
    let foundCount = 0;
    while(foundCount < 1) { // Find the first occurrence after builderStart
        const nextIdx = finalContent.indexOf(endMarker, currentIndex);
        if (nextIdx !== -1) {
            foundCount++;
            currentIndex = nextIdx + endMarker.length;
        } else {
            break;
        }
    }

    if (currentIndex > builderIndexStart) {
        // Also remove the `startShift` button logic below it. Wait, if it's editing shift, they still need a "Save" button.
        // Actually, let's keep the builder block for ACTIVE shift because they use it to EDIT the shift (isEditingShift).
        console.log("Preserving builder block for editing during active shift.");
    }
}

// What about the "Начать смену" button in the active view?
// It was part of the builder block. If `isShiftLocked` is true (shift started), it shows "Сохранить изменения".
// Let's just write the changes to the file.
fs.writeFileSync(path, finalContent);
console.log("Successfully separated Pre-Shift Lobby and Active Shift Dashboard.");
