const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

// remove amber dot
code = code.replace(/<div className="w-1 sm:w-1\.5 h-5 sm:h-6 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full" \/>/g, '');

let lines = code.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('              {/* Заработок сотрудников */}')) {
    startIdx = i;
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
  const replacement = `              {/* Заработок сотрудников */}
              <div className="p-4 rounded-xl border border-border/40 shadow-sm bg-card flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-bold flex items-center">
                    Заработок
                    <span className="inline-flex items-center relative group ml-2 sm:ml-4">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs cursor-help font-bold">
                        i
                      </div>
                      <div className="absolute bottom-full left-0 mb-3 w-48 sm:w-64 p-2 sm:p-3 bg-popover text-popover-foreground rounded-lg sm:rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-border/40 z-50">
                        <p className="text-xs sm:text-sm font-medium">
                          Расчет ЗП: минимальная оплата + процент с учетом ролей
                        </p>
                        <div className="absolute top-full left-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover"></div>
                      </div>
                    </span>
                  </h3>
                </div>

                <div className="flex-1 flex flex-col space-y-4">
                  {(() => {
                    const methodToUse = state.salaryCalculationMethod;

                    if (
                      methodToUse === "minimumWithPercentage" &&
                      currentReport?.records
                    ) {
                      const minimumOverride = shiftEmployees.reduce<
                        Record<string, boolean>
                      >((acc, id) => {
                        const key = \`min_\${id}\` as any;
                        const val = (employeeRoles as any)[key];
                        acc[id] = val !== false;
                        return acc;
                      }, {});

                      const salaryCalculator = createSalaryCalculator(
                        state.minimumPaymentSettings,
                        currentReport.records,
                        employeeRoles,
                        state.employees,
                        minimumOverride,
                      );

                      const calculatedResults =
                        salaryCalculator.calculateSalaries();
                      const salaryResults = calculatedResults.map((res) => {
                        const manualAmount =
                          currentReport.manualSalaries?.[res.employeeId];
                        return {
                          ...res,
                          calculatedSalary:
                            manualAmount !== undefined
                              ? manualAmount
                              : res.calculatedSalary,
                          isManual: manualAmount !== undefined,
                        };
                      });

                      const totalSalarySum = salaryResults.reduce(
                        (sum, res) => sum + res.calculatedSalary,
                        0,
                      );

                      return (
                        <>
                          {salaryResults.length > 0 && (
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-muted-foreground mb-3 pb-2 border-b border-border/40">
                                Индивидуальные зарплаты
                              </p>
                              <div className="space-y-3">
                                {salaryResults.map((result) => {
                                  const calculateHourlyRate = () => {
                                    const now = new Date();
                                    const currentHour = now.getHours();
                                    const currentMinute = now.getMinutes();
                                    const currentTimeInMinutes =
                                      currentHour * 60 + currentMinute;
                                    const workStartMinutes = 9 * 60;
                                    const workEndMinutes = 21 * 60;

                                    if (
                                      currentTimeInMinutes <
                                        workStartMinutes ||
                                      currentTimeInMinutes >= workEndMinutes
                                    ) {
                                      return result.calculatedSalary / 12;
                                    }

                                    const workedMinutes = Math.max(
                                      0,
                                      currentTimeInMinutes - workStartMinutes,
                                    );
                                    const workedHours = workedMinutes / 60;

                                    if (workedHours < 1) {
                                      return result.calculatedSalary / 12;
                                    }

                                    return (
                                      result.calculatedSalary / workedHours
                                    );
                                  };

                                  const hourlyRate = calculateHourlyRate();

                                  return (
                                    <div
                                      key={result.employeeId}
                                      className="flex justify-between items-center text-sm"
                                    >
                                      <div className="flex flex-col min-w-0 pr-2">
                                        <span
                                          className={\`font-medium truncate \${
                                            result.isManual
                                              ? "text-orange-500"
                                              : "text-card-foreground"
                                          }\`}
                                        >
                                          {result.employeeName}
                                          <span className="text-xs text-muted-foreground font-normal ml-1">
                                            ({result.role === "admin" ? "Админ" : "Мойщик"})
                                          </span>
                                          {result.isManual && " *"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {(() => {
                                            const now = new Date();
                                            const currentHour = now.getHours();
                                            const currentMinute =
                                              now.getMinutes();
                                            const currentTimeInMinutes =
                                              currentHour * 60 + currentMinute;
                                            const workStartMinutes = 9 * 60;
                                            const workEndMinutes = 21 * 60;

                                            if (
                                              currentTimeInMinutes <
                                                workStartMinutes ||
                                              currentTimeInMinutes >=
                                                workEndMinutes
                                            ) {
                                              return \`\${hourlyRate.toFixed(2)} BYN/час\`;
                                            }

                                            const workedMinutes = Math.max(
                                              0,
                                              currentTimeInMinutes -
                                                workStartMinutes,
                                            );
                                            const workedHours =
                                              workedMinutes / 60;

                                            if (workedHours < 1) {
                                              return \`\${hourlyRate.toFixed(2)} BYN/час\`;
                                            }

                                            return \`\${hourlyRate.toFixed(2)} BYN/час за \${workedHours.toFixed(1)}ч\`;
                                          })()}
                                        </span>
                                      </div>
                                      <span
                                        className={\`font-bold shrink-0 text-base \${
                                          result.isManual ? "text-orange-500" : "text-primary"
                                        }\`}
                                      >
                                        {result.calculatedSalary.toFixed(2)}{" "}
                                        BYN
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center bg-accent/5 p-3 rounded-lg border border-border/40">
                            <span className="font-bold text-base sm:text-lg">
                              Общая сумма
                            </span>
                            <span className="font-bold text-lg sm:text-xl text-primary">
                              {totalSalarySum.toFixed(2)} BYN
                            </span>
                          </div>
                        </>
                      );
                    }

                    if (methodToUse === "none") {
                      return (
                        <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">Выберите метод расчета в настройках</span>
                          <span className="font-medium">0.00 BYN</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                        <span className="text-sm text-muted-foreground">Нет данных для расчета</span>
                        <span className="font-medium">0.00 BYN</span>
                      </div>
                    );
                  })()}
                </div>
              </div>`;

  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  code = lines.join('\n');
}

fs.writeFileSync('src/pages/HomePage.tsx', code);
console.log('done earnings');
