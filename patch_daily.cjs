const fs = require('fs');

const file = 'src/components/Home/DailyReportModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update getPaymentMethodDisplay
const oldDisplay = `  const getPaymentMethodDisplay = (
    type: "cash" | "card" | "organization" | "debt",
    organizationId?: string,
  ) => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId) {
      const org = state.organizations.find((o) => o.id === organizationId);
      return org ? org.name : "Организация";
    }
    if (type === "debt") {
      return (
        <span className="px-2 py-0.5 rounded text-xs border text-red-600 border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-800">
          Долг
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs border text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        Неизвестно
      </span>
    );
  };`;

const newDisplay = `  const getPaymentMethodDisplay = (
    type: "cash" | "card" | "organization" | "debt" | "certificate",
    organizationId?: string,
  ) => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId) {
      const org = state.organizations.find((o) => o.id === organizationId);
      return org ? org.name : "Организация";
    }
    if (type === "debt") {
      return (
        <span className="px-2 py-0.5 rounded text-xs border text-red-600 border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-800">
          Долг
        </span>
      );
    }
    if (type === "certificate") {
      return (
        <span className="px-2 py-0.5 rounded text-xs border text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-800">
          Сертификат
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs border text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        Неизвестно
      </span>
    );
  };`;

content = content.replace(oldDisplay, newDisplay);

// Replace props types
content = content.replace(
  /paymentFilter: "all" \| "cash" \| "card" \| "organization" \| "debt";\s*onPaymentFilterChange: \(\s*filter: "all" \| "cash" \| "card" \| "organization" \| "debt",\s*\) => void;/,
  'paymentFilter: "all" | "cash" | "card" | "organization" | "debt" | "certificate";\n  onPaymentFilterChange: (\n    filter: "all" | "cash" | "card" | "organization" | "debt" | "certificate",\n  ) => void;'
);

// Add Certificate to edit form segmented control
const editFormDebtStr = `                              <button
                                type="button"
                                onClick={() =>
                                  handleEditPaymentTypeChange("debt")
                                }
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
                                onClick={() =>
                                  handleEditPaymentTypeChange("certificate")
                                }
                                className={
                                  editFormData.paymentMethod.type === "certificate"
                                    ? "active"
                                    : ""
                                }
                              >
                                Сертификат
                              </button>`;
content = content.replace(editFormDebtStr, editFormCertStr);

// Add certificate card in totals
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
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      BYN
                    </span>
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
console.log("DailyReportModal patched successfully!");
