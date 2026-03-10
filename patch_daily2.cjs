const fs = require('fs');

const file = 'src/components/Home/DailyReportModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add certificate card in DailyReportModal
const debtCardStr = `                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Долги
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-red-500 leading-tight break-words">
                    {(() => {
                      const debtSum =
                        currentReport.records?.reduce((sum, record) => {
                          return (
                            sum +
                            (record.paymentMethod.type === "debt"
                              ? record.price
                              : 0)
                          );
                        }, 0) || 0;
                      return debtSum.toFixed(2);
                    })()} BYN
                  </div>
                </div>`;

const certCardStr = debtCardStr + `
                {/* Сертификаты */}
                {(() => {
                  const totalCertificate = currentReport.records?.reduce((sum, record) => sum + (record.paymentMethod.type === "certificate" ? record.price : 0), 0) || 0;
                  if (totalCertificate <= 0) return null;
                  return (
                    <div
                      className={\`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors \${
                        paymentFilter === "certificate"
                          ? "bg-primary/10 border border-primary"
                          : "bg-muted/30 hover:bg-muted/50"
                      }\`}
                      onClick={() =>
                        onPaymentFilterChange(
                          paymentFilter === "certificate" ? "all" : "certificate",
                        )
                      }
                      title="Нажмите для фильтрации по сертификатам"
                    >
                      <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                        Сертификаты
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-bold text-purple-500 leading-tight break-words">
                        {totalCertificate.toFixed(2)} BYN
                      </div>
                    </div>
                  );
                })()}`;

content = content.replace(debtCardStr, certCardStr);

// Also add a button in the segment control.
// It has:
const searchDebtBtnStr = `            <button
              onClick={() => onPaymentFilterChange("debt")}
              className={paymentFilter === "debt" ? "active" : ""}
            >
              Долги
            </button>`;

const newSearchDebtBtnStr = searchDebtBtnStr + `
            <button
              onClick={() => onPaymentFilterChange("certificate")}
              className={paymentFilter === "certificate" ? "active" : ""}
            >
              Сертификаты
            </button>`;
content = content.replace(searchDebtBtnStr, newSearchDebtBtnStr);

fs.writeFileSync(file, content);
console.log("DailyReportModal patched with patch_daily2");
