const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexDebtBtn = /<button\s+type="button"\s+onClick=\{\(\) =>\s+handleEditPaymentTypeChange\("debt"\)\s+\}\s+className=\{`px-2 py-1 text-xs rounded \$\{\s+editFormData\.paymentMethod\?\.type === "debt"\s+\? "bg-primary text-white"\s+: "bg-secondary"\s+\}\`\}\s+>\s+Долг\s+<\/button>/g;

content = content.replace(regexDebtBtn, (match) => {
  return match + `
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("certificate")
                                  }
                                  className={\`px-2 py-1 text-xs rounded \${
                                    editFormData.paymentMethod?.type === "certificate"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }\`}
                                >
                                  Серт
                                </button>`;
});

const regexHandleEditTypeChange = /const handleEditPaymentTypeChange = \(\s*type: "cash" \| "card" \| "organization",\s*\) => \{/g;
content = content.replace(regexHandleEditTypeChange, `const handleEditPaymentTypeChange = (\n    type: "cash" | "card" | "organization" | "debt" | "certificate",\n  ) => {`);

fs.writeFileSync(file, content);
console.log("HomePage inline edit form patched correctly");
