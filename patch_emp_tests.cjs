const fs = require('fs');

const file = 'src/components/EmployeeRecords/utils.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /it\("should return 'Долг' for 'debt'", \(\) => \{\n      expect\(getPaymentMethodLabel\("debt", mockOrganizations\)\)\.toBe\("Долг"\);\n    \}\);/,
  'it("should return \'Долг\' for \'debt\'", () => {\n      expect(getPaymentMethodLabel("debt", mockOrganizations)).toBe("Долг");\n    });\n\n    it("should return \'Сертификат\' for \'certificate\'", () => {\n      expect(getPaymentMethodLabel("certificate", mockOrganizations)).toBe("Сертификат");\n    });'
);

content = content.replace(
  /expect\(getPaymentMethodColor\("debt", "dark"\)\)\.toBe\(\n          "text-red-300 bg-red-500\/10 border-red-500\/20",\n        \);/,
  'expect(getPaymentMethodColor("debt", "dark")).toBe(\n          "text-red-300 bg-red-500/10 border-red-500/20",\n        );\n        expect(getPaymentMethodColor("certificate", "dark")).toBe(\n          "text-orange-300 bg-orange-500/10 border-orange-500/20",\n        );'
);

content = content.replace(
  /expect\(getPaymentMethodColor\("debt", "black"\)\)\.toBe\(\n          "text-red-400 bg-red-500\/5 border-red-500\/30",\n        \);/,
  'expect(getPaymentMethodColor("debt", "black")).toBe(\n          "text-red-400 bg-red-500/5 border-red-500/30",\n        );\n        expect(getPaymentMethodColor("certificate", "black")).toBe(\n          "text-orange-400 bg-orange-500/5 border-orange-400/30",\n        );'
);

content = content.replace(
  /expect\(getPaymentMethodColor\("debt", "light"\)\)\.toBe\(\n          "text-red-600 bg-red-50 border-red-200",\n        \);/,
  'expect(getPaymentMethodColor("debt", "light")).toBe(\n          "text-red-600 bg-red-50 border-red-200",\n        );\n        expect(getPaymentMethodColor("certificate", "light")).toBe(\n          "text-orange-600 bg-orange-50 border-orange-200",\n        );'
);

fs.writeFileSync(file, content);
console.log("EmployeeRecords utils.test.ts patched");
