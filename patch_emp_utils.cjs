const fs = require('fs');

const file = 'src/components/EmployeeRecords/utils.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /case "debt":\n      return "Долг";/,
  'case "debt":\n      return "Долг";\n    case "certificate":\n      return "Сертификат";'
);

content = content.replace(
  /case "debt":\n        return "text-red-300 bg-red-500\/10 border-red-500\/20";/,
  'case "debt":\n        return "text-red-300 bg-red-500/10 border-red-500/20";\n      case "certificate":\n        return "text-orange-300 bg-orange-500/10 border-orange-500/20";'
);

content = content.replace(
  /case "debt":\n        return "text-red-400 bg-red-500\/5 border-red-500\/30";/,
  'case "debt":\n        return "text-red-400 bg-red-500/5 border-red-500/30";\n      case "certificate":\n        return "text-orange-400 bg-orange-500/5 border-orange-400/30";'
);

content = content.replace(
  /case "debt":\n        return "text-red-600 bg-red-50 border-red-200";/,
  'case "debt":\n        return "text-red-600 bg-red-50 border-red-200";\n      case "certificate":\n        return "text-orange-600 bg-orange-50 border-orange-200";'
);

fs.writeFileSync(file, content);
console.log("EmployeeRecords utils.ts patched");
