const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

// Replace green decorative line
code = code.replace(/<div className="w-1 sm:w-1\.5 h-5 sm:h-6 bg-gradient-to-b from-green-500 to-green-600 rounded-full" \/>/g, '');

// Redesign Totals div
let lines = code.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('              {/* Сводка по оплатам */}')) {
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
  const replacement = `              {/* Сводка по оплатам */}
              <div className="p-4 rounded-xl border border-border/40 shadow-sm bg-card flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-bold">Итого</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
                  {/* Наличные */}
                  <div
                    className={\`flex flex-col justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 border \${
                      paymentFilter === "cash"
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/30 border-border/40 hover:bg-muted/50"
                    } \${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}\`}
                    onClick={() => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      setPaymentFilter("cash");
                      openDailyReportModal();
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для просмотра ведомости по наличным"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    <span className="text-xs text-muted-foreground font-medium mb-1">
                      Наличные
                    </span>
                    <span className="font-bold text-sm sm:text-base text-card-foreground">
                      {currentReport.totalCash.toFixed(2)} BYN
                    </span>
                  </div>

                  {/* Карта */}
                  <div
                    className={\`flex flex-col justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 border \${
                      paymentFilter === "card"
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/30 border-border/40 hover:bg-muted/50"
                    } \${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}\`}
                    onClick={() => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      setPaymentFilter("card");
                      openDailyReportModal();
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для просмотра ведомости по картам"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    <span className="text-xs text-muted-foreground font-medium mb-1">
                      Карта
                    </span>
                    <span className="font-bold text-sm sm:text-base text-card-foreground">
                      {(
                        currentReport.records?.reduce(
                          (sum, rec) =>
                            sum +
                            (rec.paymentMethod.type === "card" ? rec.price : 0),
                          0,
                        ) || 0
                      ).toFixed(2)}{" "}
                      BYN
                    </span>
                  </div>

                  {/* Безналичные */}
                  <div
                    className={\`flex flex-col justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 border col-span-2 sm:col-span-1 \${
                      paymentFilter === "organization"
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/30 border-border/40 hover:bg-muted/50"
                    } \${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}\`}
                    onClick={() => {
                      if (!shiftStarted) {
                        toast.info("Сначала выберите работников и начните смену");
                        return;
                      }
                      setPaymentFilter("organization");
                      openDailyReportModal();
                    }}
                    title={
                      shiftStarted
                        ? "Нажмите для просмотра ведомости по безналу"
                        : "Сначала выберите работников и начните смену"
                    }
                  >
                    <span className="text-xs text-muted-foreground font-medium mb-1">
                      Безналичные
                    </span>
                    <span className="font-bold text-sm sm:text-base text-card-foreground">
                      {(() => {
                        const orgsInTotal = state.organizationsInTotal || [];
                        const orgSum =
                          currentReport.records?.reduce((sum, record) => {
                            const isOrg =
                              record.paymentMethod.type === "organization";
                            const isSeparated =
                              record.paymentMethod.organizationId &&
                              orgsInTotal.includes(
                                record.paymentMethod.organizationId,
                              );
                            return sum + (isOrg && !isSeparated ? record.price : 0);
                          }, 0) || 0;
                        return orgSum.toFixed(2);
                      })()} BYN
                    </span>
                  </div>

                  {/* Организации (разделённые) */}
                  {state.organizationsInTotal?.map((orgId) => {
                    const org = state.organizations.find((o) => o.id === orgId);
                    if (!org) return null;
                    const sumForOrg =
                      currentReport.records?.reduce((sum, record) => {
                        return (
                          sum +
                          (record.paymentMethod.type === "organization" &&
                          record.paymentMethod.organizationId === orgId
                            ? record.price
                            : 0)
                        );
                      }, 0) || 0;

                    return (
                      <div
                        key={\`total-org-\${orgId}\`}
                        className={\`flex flex-col justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 border col-span-2 sm:col-span-1 \${
                          paymentFilter === "organization"
                            ? "bg-primary/10 border-primary/30"
                            : "bg-muted/30 border-border/40 hover:bg-muted/50"
                        } \${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}\`}
                        onClick={() => {
                          if (!shiftStarted) {
                            toast.info("Сначала выберите работников и начните смену");
                            return;
                          }
                          setPaymentFilter("organization");
                          openDailyReportModal();
                        }}
                        title={
                          shiftStarted
                            ? \`Нажмите для просмотра ведомости (входит в безнал)\`
                            : "Сначала выберите работников и начните смену"
                        }
                      >
                        <span className="text-xs text-muted-foreground font-medium mb-1 truncate">
                          {org.name}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-indigo-500 dark:text-indigo-400">
                          {sumForOrg.toFixed(2)} BYN
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Всего */}
                <div
                  className={\`mt-auto pt-4 border-t border-border/40 flex justify-between items-center cursor-pointer transition-all duration-200 p-3 rounded-lg border bg-primary/5 hover:bg-primary/10 border-primary/20 \${
                    !shiftStarted ? "opacity-60 cursor-not-allowed" : ""
                  }\`}
                  onClick={() => {
                    if (!shiftStarted) {
                      toast.info("Сначала выберите работников и начните смену");
                      return;
                    }
                    setPaymentFilter("all");
                    openDailyReportModal();
                  }}
                  title={
                    shiftStarted
                      ? "Нажмите для просмотра полной ведомости"
                      : "Сначала выберите работников и начните смену"
                  }
                >
                  <span className="font-bold text-base sm:text-lg">
                    Всего
                  </span>
                  <span className="font-bold text-lg sm:text-xl text-primary text-right">
                    {(() => {
                      const totalRevenue =
                        currentReport.records?.reduce((sum, record) => {
                          return sum + record.price;
                        }, 0) || 0;
                      return totalRevenue.toFixed(2);
                    })()} BYN
                  </span>
                </div>
              </div>`;
  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  code = lines.join('\n');
}

fs.writeFileSync('src/pages/HomePage.tsx', code);
console.log('done totals');
