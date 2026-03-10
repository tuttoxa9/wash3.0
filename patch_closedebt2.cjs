const fs = require('fs');

const file = 'src/components/Home/CloseDebtModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[paymentType, setPaymentType\] = useState<\n    "cash" \| "card" \| "organization"\n  >\("cash"\);/,
  'const [paymentType, setPaymentType] = useState<\n    "cash" | "card" | "organization" | "certificate"\n  >("cash");'
);

const orgRadioStr = `            <label
              className={\`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all \${
                paymentType === "organization"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
              }\`}
            >
              <input
                type="radio"
                name="payment_type"
                value="organization"
                className="sr-only"
                checked={paymentType === "organization"}
                onChange={() => setPaymentType("organization")}
              />
              <span className="text-2xl mb-2">🏢</span>
              <span className="text-sm font-medium">Безнал (Орг)</span>
            </label>`;

const certRadioStr = orgRadioStr + `
            <label
              className={\`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all \${
                paymentType === "certificate"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
              }\`}
            >
              <input
                type="radio"
                name="payment_type"
                value="certificate"
                className="sr-only"
                checked={paymentType === "certificate"}
                onChange={() => setPaymentType("certificate")}
              />
              <span className="text-2xl mb-2">🎫</span>
              <span className="text-sm font-medium">Сертификат</span>
            </label>`;

content = content.replace(orgRadioStr, certRadioStr);

// update grid-cols
content = content.replace(
  '<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">',
  '<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">'
);

fs.writeFileSync(file, content);
console.log("CloseDebtModal patched with patch_closedebt2");
