const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexDebtBtn = /<button\s+type="button"\s+onClick=\{\(\) => handlePaymentTypeChange\("debt"\)\}\s+className=\{\s+formData\.paymentMethod\.type === "debt" \? "active" : ""\s+\}\s+>\s+Долг\s+<\/button>/g;

content = content.replace(regexDebtBtn, (match) => {
  return match + `
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("certificate")}
                  className={
                    formData.paymentMethod.type === "certificate" ? "active" : ""
                  }
                >
                  Сертификат
                </button>`;
});

fs.writeFileSync(file, content);
console.log("HomePage inline ADD form patched");
