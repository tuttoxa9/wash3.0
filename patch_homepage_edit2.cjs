const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const debtRegex = /<button\s+type="button"\s+onClick=\{\(\) =>\s+handleEditPaymentTypeChange\("debt"\)\s+\}\s+className=\{\s+editFormData\.paymentMethod\.type === "debt"\s+\? "active"\s+: ""\s+\}\s+>\s+Долг\s+<\/button>/g;

content = content.replace(debtRegex, (match) => {
  return match + `
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
});

fs.writeFileSync(file, content);
console.log("HomePage inline edit form patched with regex");
