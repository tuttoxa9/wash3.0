const fs = require('fs');

const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// The first patch didn't quite cover everything cleanly, let's fix it manually.
// First, we need to add React.useEffect since we used it.
if (!code.includes('useEffect')) {
    code = code.replace('import React, { useState, useMemo }', 'import React, { useState, useMemo, useEffect }');
}

// Next, we need to replace how the amount is set and validated for Cash.
// We want "source === 'cash'" to replace the total.
const oldSetAmount = `const [amount, setAmount] = useState("");`;
const newSetAmount = `
  const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
  const [amount, setAmount] = useState(() => currentPayoutFromCash > 0 ? currentPayoutFromCash.toString() : "");

  // Когда меняется выбранный сотрудник или источник, пересчитываем начальное значение
  useEffect(() => {
    if (source === "cash") {
      const p = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
      setAmount(p > 0 ? p.toString() : "");
    } else {
      setAmount(""); // Для сейфа всегда с нуля, так как там транзакции
    }
  }, [employeeId, source, currentReport]);
`;
if (code.includes(oldSetAmount)) {
    code = code.replace(oldSetAmount, newSetAmount);
}

// Fix the numAmount check
const oldCheck = `if (Number.isNaN(numAmount) || numAmount <= 0) {`;
const newCheck = `if (Number.isNaN(numAmount) || (source === "cash" ? numAmount < 0 : numAmount <= 0)) {`;
if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
}

// Fix handlePayout logic for cash
const oldLogic = `
        if (numAmount > expectedCash) {
          toast.error(\`В кассе недостаточно средств (доступно: \${expectedCash.toFixed(2)} BYN)\`);
          setLoading(false);
          return;
        }

        const currentPayout = stateCash.salaryPayouts?.[employeeId] || 0;

        const updatedReport = {
          ...currentReport!,
          cashState: {
            ...stateCash,
            salaryPayouts: {
              ...(stateCash.salaryPayouts || {}),
              [employeeId]: currentPayout + numAmount
            }
          }
        };

        const success = await dailyReportService.updateReport(updatedReport);
`;

const newLogic = `
        const currentPayout = stateCash.salaryPayouts?.[employeeId] || 0;
        const diff = numAmount - currentPayout;

        // Если разница больше нуля, значит мы хотим выдать ЕЩЕ денег. Проверяем остаток.
        if (diff > expectedCash) {
          toast.error(\`В кассе недостаточно средств для доплаты (доступно: \${expectedCash.toFixed(2)} BYN)\`);
          setLoading(false);
          return;
        }

        const newPayouts = { ...(stateCash.salaryPayouts || {}) };
        if (numAmount === 0) {
            delete newPayouts[employeeId];
        } else {
            newPayouts[employeeId] = numAmount;
        }

        const updatedReport = {
          ...currentReport!,
          cashState: {
            ...stateCash,
            salaryPayouts: newPayouts
          }
        };

        const success = await dailyReportService.updateReport(updatedReport);
`;
if (code.includes(oldLogic)) {
    code = code.replace(oldLogic, newLogic);
}

// Validation logic
const oldValidation1 = `const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;`;
const newValidation1 = `const isValidAmount = !Number.isNaN(parsedAmount) && (source === "cash" ? parsedAmount >= 0 : parsedAmount > 0);`;
if (code.includes(oldValidation1)) {
    code = code.replace(oldValidation1, newValidation1);
}

const oldValidation2 = `const isExceedingCash = source === "cash" && isValidAmount && parsedAmount > expectedCash;`;
const newValidation2 = `
  const currentPayoutForValidation = stateCash.salaryPayouts?.[employeeId] || 0;
  const diffForValidation = source === "cash" && isValidAmount ? parsedAmount - currentPayoutForValidation : 0;
  const isExceedingCash = source === "cash" && isValidAmount && diffForValidation > expectedCash;
`;
if (code.includes(oldValidation2)) {
    code = code.replace(oldValidation2, newValidation2);
}

// Labels
if (code.includes('Сумма выплаты (BYN)')) {
    code = code.replace('Сумма выплаты (BYN)', 'Итоговая сумма выплаты (BYN)');
}

if (code.includes('min="0.01"')) {
    code = code.replace('min="0.01"', 'min={source === "cash" ? "0" : "0.01"}');
}

// Success toast
if (code.includes('toast.success(`Выплачено ${numAmount.toFixed(2)} BYN из кассы`);')) {
    code = code.replace('toast.success(`Выплачено ${numAmount.toFixed(2)} BYN из кассы`);', 'toast.success(`Сумма выплаты из кассы обновлена: ${numAmount.toFixed(2)} BYN`);');
}

fs.writeFileSync(file, code);
