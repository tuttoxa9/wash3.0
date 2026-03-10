const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexType = /const \[paymentType, setPaymentType\] = useState<\n\s*"cash" \| "card" \| "organization"\n\s*>\("cash"\);/g;
content = content.replace(regexType, `const [paymentType, setPaymentType] = useState<\n    "cash" | "card" | "organization" | "certificate"\n  >("cash");`);

const regexBtn = /<button\s+type="button"\s+onClick=\{\(\) => setPaymentType\("organization"\)\}\s+className=\{paymentType === "organization" \? "active" : ""\}\s+>\s+Безнал\s+<\/button>/g;

content = content.replace(regexBtn, (match) => {
  return match + `
              <button
                type="button"
                onClick={() => setPaymentType("certificate")}
                className={paymentType === "certificate" ? "active" : ""}
              >
                Сертификат
              </button>`;
});

fs.writeFileSync(file, content);
console.log("HomePage inline CloseDebt patched");
