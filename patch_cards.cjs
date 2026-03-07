const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

// Replace the colored bars
code = code.replace(/<div className="w-1 sm:w-1\.5 h-5 sm:h-6 bg-gradient-to-b from-accent to-primary rounded-full" \/>/g, '<User className="w-5 h-5 text-primary" />');

// Replace the employee cards wrapper
code = code.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">/g,
  '<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">'
);

// We need to rewrite the employee card div
// First, find the return block for the employee map

let lines = code.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('key={employee.id}') && lines[i+1] && lines[i+1].includes('className={`relative group rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 cursor-pointer')) {
    startIdx = i - 1; // get the `return (` line
    let openTags = 0;
    for (let j = startIdx; j < lines.length; j++) {
      if (lines[j].includes('<div')) openTags += (lines[j].match(/<div/g) || []).length;
      if (lines[j].includes('</div')) openTags -= (lines[j].match(/<\/div/g) || []).length;

      if (openTags === 0 && j > startIdx + 1) {
        endIdx = j;
        break;
      }
    }
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `                  return (
                    <div
                      key={employee.id}
                      className={\`relative group rounded-xl p-4 cursor-pointer transition-all duration-200 border bg-card hover:bg-accent/5 w-full flex flex-col gap-3 \${
                        loading.dailyReport ? "loading" : ""
                      } \${
                        isManualSalary
                          ? "border-orange-400/50 shadow-sm"
                          : "border-border/40 shadow-sm hover:border-primary/30 hover:shadow-md"
                      }\`}
                      onClick={() => openEmployeeModal(employee.id)}
                    >
                      {/* Верхняя часть: Имя, Роль, Кнопка + */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex flex-col min-w-0 flex-1">
                          <h4 className="font-semibold text-sm sm:text-base text-card-foreground truncate" title={employee.name}>
                            {employee.name}
                          </h4>
                          <span
                            className={\`mt-1 w-fit px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium border \${
                              role === "admin"
                                ? "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 dark:border-green-500/30"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30"
                            }\`}
                          >
                            {role === "admin" ? "Админ" : "Мойщик"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            if (!shiftStarted) {
                              e.preventDefault();
                              e.stopPropagation();
                              toast.info(
                                "Сначала выберите работников и начните смену",
                              );
                              return;
                            }
                            openAddRecordModalForEmployee(employee.id, e);
                          }}
                          disabled={!shiftStarted}
                          className="shrink-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 text-primary"
                          title={
                            shiftStarted
                              ? "Добавить запись для этого сотрудника"
                              : "Сначала выберите работников и начните смену"
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Статистика: Машины и Сумма */}
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                            Машин
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-card-foreground">
                            {stats.carCount}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-border/40" />
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                            Сумма
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-card-foreground">
                            {stats.totalEarnings.toFixed(0)} BYN
                          </span>
                        </div>
                      </div>

                      {/* Зарплата */}
                      <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                          {(() => {
                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const currentTimeInMinutes =
                              currentHour * 60 + currentMinute;
                            const workStartMinutes = 9 * 60;
                            const workEndMinutes = 21 * 60;

                            if (currentTimeInMinutes < workStartMinutes) {
                              return "ЗП за день";
                            } else if (currentTimeInMinutes >= workEndMinutes) {
                              return "ЗП за день";
                            } else {
                              const workedMinutes =
                                currentTimeInMinutes - workStartMinutes;
                              const workedHours = workedMinutes / 60;
                              return \`ЗП за \${workedHours.toFixed(1)}ч\`;
                            }
                          })()}
                        </span>
                        <span
                          className={\`font-bold text-sm sm:text-base \${
                            isManualSalary ? "text-orange-500" : "text-primary"
                          }\`}
                        >
                          {dailySalary.toFixed(0)} BYN {isManualSalary && "*"}
                        </span>
                      </div>
                    </div>
                  );`;

  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  code = lines.join('\n');
}

fs.writeFileSync('src/pages/HomePage.tsx', code);
console.log('done');
