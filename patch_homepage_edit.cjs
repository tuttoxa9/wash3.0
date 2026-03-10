const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

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

if (content.includes(editFormDebtStr)) {
  content = content.replace(editFormDebtStr, editFormCertStr);
}

// Add edit payment method change handling
const handleEditTypeChangeStr = `  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt",
  ) => {`;
const newHandleEditTypeChangeStr = `  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt" | "certificate",
  ) => {`;
content = content.replace(handleEditTypeChangeStr, newHandleEditTypeChangeStr);

fs.writeFileSync(file, content);
console.log("HomePage inline edit form patched");
