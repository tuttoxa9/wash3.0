const fs = require('fs');

let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

const bannerRegex = /\{\/\*\s*Верхний баннер "Чтобы начать работу"\s*\*\/\}\s*\{\!shiftStarted && \([\s\S]*?\}\);?\s*\}\s*\}\s*className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary hover:bg-primary\/90 text-primary-foreground font-medium rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors shadow-md sm:shadow-lg shadow-primary\/20 w-full sm:w-auto mt-3 sm:mt-0"\s*>\s*Перейти к выбору работников\s*<ArrowRight className="w-4 h-4 ml-2 inline-block" \/>\s*<\/button>\s*<span className="text-xs text-muted-foreground mt-3 sm:mt-0 block sm:inline-block"\>\s*После начала смены функции станут доступны\s*<\/span>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/m;

// More precise string replacement because regex can be brittle
const startStr = '{/* Верхний баннер "Чтобы начать работу" */}';
const startIndex = content.indexOf(startStr);

if (startIndex !== -1) {
  // Find the end of the banner logic
  // It ends with a closing bracket for the conditional `{!shiftStarted && ( ... )}`
  const endMarkerStr = 'После начала смены функции станут доступны\n                  </span>\n                </div>\n              </div>\n            </div>\n          )}';
  const endIndex = content.indexOf(endMarkerStr, startIndex);

  if (endIndex !== -1) {
    const fullEndIndex = endIndex + endMarkerStr.length;
    content = content.substring(0, startIndex) + content.substring(fullEndIndex);
    fs.writeFileSync('src/pages/HomePage.tsx', content);
    console.log("Successfully removed pre-shift banner.");
  } else {
    console.log("End marker not found.");
  }
} else {
  console.log("Start marker not found.");
}
