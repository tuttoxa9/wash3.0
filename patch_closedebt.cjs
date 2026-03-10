const fs = require('fs');

const file = 'src/components/Home/CloseDebtModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update paymentType state
content = content.replace(
  /const \[paymentType, setPaymentType\] = useState<\n    "cash" \| "card" \| "organization"\n  >\("cash"\);/,
  'const [paymentType, setPaymentType] = useState<\n    "cash" | "card" | "organization" | "certificate"\n  >("cash");'
);

// Add radio button for certificate
const orgRadioStr = `            <label
              className={\`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all \${
                paymentType === "organization"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
              }\`}
            >
              <input
                type="radio"
                name="payment_type"
                value="organization"
                className="hidden"
                checked={paymentType === "organization"}
                onChange={() => setPaymentType("organization")}
              />
              <span className="text-2xl mb-2">🏢</span>
              <span className="text-sm font-medium">Безнал</span>
            </label>`;

const certRadioStr = orgRadioStr + `
            <label
              className={\`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all \${
                paymentType === "certificate"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
              }\`}
            >
              <input
                type="radio"
                name="payment_type"
                value="certificate"
                className="hidden"
                checked={paymentType === "certificate"}
                onChange={() => setPaymentType("certificate")}
              />
              <span className="text-2xl mb-2">🎫</span>
              <span className="text-sm font-medium">Сертификат</span>
            </label>`;

content = content.replace(orgRadioStr, certRadioStr);

fs.writeFileSync(file, content);
console.log("CloseDebtModal patched with patch_closedebt");
