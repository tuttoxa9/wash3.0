const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update DailyReportModalProps
content = content.replace(
  /paymentFilter: "all" \| "cash" \| "card" \| "organization" \| "debt";\s*onPaymentFilterChange: \(\s*filter: "all" \| "cash" \| "card" \| "organization" \| "debt",\s*\) => void;/,
  'paymentFilter: "all" | "cash" | "card" | "organization" | "debt" | "certificate";\n  onPaymentFilterChange: (\n    filter: "all" | "cash" | "card" | "organization" | "debt" | "certificate",\n  ) => void;'
);

// Add Certificate to edit form segmented control
const editFormDebtStr = `                              <button
                                type="button"
                                onClick={() => handleEditPaymentTypeChange("debt")}
                                className={
                                  editFormData.paymentMethod.type === "debt"
                                    ? "active"
                                    : ""
                                }
                              >
                                Долг
                              </button>`;

const editFormCertStr = editFormDebtStr + `
                              <button
                                type="button"
                                onClick={() => handleEditPaymentTypeChange("certificate")}
                                className={
                                  editFormData.paymentMethod.type === "certificate"
                                    ? "active"
                                    : ""
                                }
                              >
                                Сертификат
                              </button>`;
content = content.replace(editFormDebtStr, editFormCertStr);

// Add certificate card in DailyReportModal totals
const debtCardStr = `                <div
                  className={\`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors \${
                    paymentFilter === "debt"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }\`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "debt" ? "all" : "debt",
                    )
                  }
                  title="Нажмите для фильтрации по долгам"
                >
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">
                    Долги
                  </p>
                  <p className="font-bold text-sm sm:text-base text-red-500">
                    {totalDebt.toFixed(2)}{" "}
                    <span className="text-[10px] sm:text-xs text-muted-foreground">BYN</span>
                  </p>
                </div>`;

const certCardStr = debtCardStr + `
                {/* Сертификаты */}
                {(() => {
                  const totalCertificate = currentReport?.records?.reduce((sum, rec) => sum + (rec.paymentMethod.type === "certificate" ? rec.price : 0), 0) || 0;
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
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">
                        Сертификат
                      </p>
                      <p className="font-bold text-sm sm:text-base text-purple-500">
                        {totalCertificate.toFixed(2)}{" "}
                        <span className="text-[10px] sm:text-xs text-muted-foreground">BYN</span>
                      </p>
                    </div>
                  );
                })()}`;

content = content.replace(debtCardStr, certCardStr);

// Add edit payment method change handling
const handleEditTypeChangeStr = `  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt",
  ) => {`;
const newHandleEditTypeChangeStr = `  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt" | "certificate",
  ) => {`;
content = content.replace(handleEditTypeChangeStr, newHandleEditTypeChangeStr);

fs.writeFileSync(file, content);
console.log("Modal patched successfully!");
