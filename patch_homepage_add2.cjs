const fs = require('fs');

const file = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexHandleChange = /const handlePaymentTypeChange = \(\s*type: "cash" \| "card" \| "organization" \| "debt",\s*\) => \{/g;
content = content.replace(regexHandleChange, `const handlePaymentTypeChange = (\n    type: "cash" | "card" | "organization" | "debt" | "certificate",\n  ) => {`);

fs.writeFileSync(file, content);
console.log("HomePage inline ADD type patched");
