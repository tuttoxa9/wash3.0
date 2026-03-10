const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update paymentFilter state type
content = content.replace(
  /const \[paymentFilter, setPaymentFilter\] = useState<\s*"all" \| "cash" \| "card" \| "organization" \| "debt"\s*>\("all"\);/,
  'const [paymentFilter, setPaymentFilter] = useState<\n    "all" | "cash" | "card" | "organization" | "debt" | "certificate"\n  >("all");'
);

// Update getPaymentMethodDisplay
const oldDisplay = `  const getPaymentMethodDisplay = (
    type: string,
    organizationId?: string,
  ): string => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId)
      return getOrganizationName(organizationId);
    return "Неизвестный";
  };`;

const newDisplay = `  const getPaymentMethodDisplay = (
    type: string,
    organizationId?: string,
  ): string => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "certificate") return "Сертификат";
    if (type === "organization" && organizationId)
      return getOrganizationName(organizationId);
    return "Неизвестный";
  };`;

content = content.split(oldDisplay).join(newDisplay);

// Find the end of the mapped organizations blocks in 'Итого' to append the Certificate block
// We need to inject the totalCertificate block right before the 'Всего' block
const searchTotalStr = `                {/* Всего */}`;

const replaceStr = `                  {/* Сертификаты (только если есть) */}
                  {(() => {
                    const totalCertificate =
                      currentReport.records?.reduce(
                        (sum, rec) =>
                          sum +
                          (rec.paymentMethod.type === "certificate" ? rec.price : 0),
                        0,
                      ) || 0;

                    if (totalCertificate <= 0) return null;

                    return (
                      <div
                        className={\`flex flex-col justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border col-span-2 sm:col-span-1 \${
                          paymentFilter === "certificate"
                            ? "bg-purple-500/10 border-purple-500/30"
                            : "bg-muted/20 border-border/50 hover:bg-accent/30"
                        } \${!shiftStarted ? "opacity-60 cursor-not-allowed" : ""}\`}
                        onClick={() => {
                          if (!shiftStarted) {
                            toast.info("Сначала выберите работников и начните смену");
                            return;
                          }
                          setPaymentFilter("certificate");
                          openDailyReportModal();
                        }}
                        title={
                          shiftStarted
                            ? "Нажмите для просмотра ведомости по сертификатам"
                            : "Сначала выберите работников и начните смену"
                        }
                      >
                        <span className="text-sm text-muted-foreground font-medium mb-1.5 truncate">
                          Сертификат
                        </span>
                        <span className="font-bold text-lg text-purple-500">
                          {totalCertificate.toFixed(2)} <span className="text-sm font-semibold opacity-80 text-muted-foreground">BYN</span>
                        </span>
                      </div>
                    );
                  })()}

                {/* Всего */}`;

content = content.replace(searchTotalStr, replaceStr);

// Also we need to add a button in DailyReportModal which is rendered inside HomePage.tsx
// Find where paymentFilter buttons are generated:

const searchDebtButton = `              <button
                onClick={() => setPaymentFilter(paymentFilter === "debt" ? "all" : "debt")}
                className={paymentFilter === "debt" ? "active" : ""}
              >
                Долги
              </button>`;

const replaceDebtButton = searchDebtButton + `
              <button
                onClick={() => setPaymentFilter(paymentFilter === "certificate" ? "all" : "certificate")}
                className={paymentFilter === "certificate" ? "active" : ""}
              >
                Сертификаты
              </button>`;

content = content.replace(searchDebtButton, replaceDebtButton);

fs.writeFileSync(file, content);
console.log("HomePage patched successfully!");
