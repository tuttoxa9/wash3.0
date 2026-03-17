const fs = require('fs');

const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace amount initialization with a hook that sets it to the current payout
code = code.replace(
  'const [amount, setAmount] = useState("");',
  `const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
  const [amount, setAmount] = useState(() => currentPayoutFromCash > 0 ? currentPayoutFromCash.toString() : "");
  // Когда меняется выбранный сотрудник или источник, пересчитываем начальное значение
  React.useEffect(() => {
    if (source === "cash") {
      const p = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
      setAmount(p > 0 ? p.toString() : "");
    } else {
      setAmount(""); // Для сейфа всегда с нуля, так как там транзакции
    }
  }, [employeeId, source, currentReport]);`
);

// We need to change how the payout logic works.
// For cash, we replace currentPayout + numAmount with just numAmount.
// But we need to calculate the difference to check expectedCash.

const oldPayoutLogic = `
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
`;

const newPayoutLogic = `
        const currentPayout = stateCash.salaryPayouts?.[employeeId] || 0;
        const diff = numAmount - currentPayout;

        // Если разница больше нуля, значит мы хотим выдать ЕЩЕ денег. Проверяем остаток.
        if (diff > expectedCash) {
          toast.error(\`В кассе недостаточно средств для доплаты (доступно: \${expectedCash.toFixed(2)} BYN)\`);
          setLoading(false);
          return;
        }

        const updatedReport = {
          ...currentReport!,
          cashState: {
            ...stateCash,
            salaryPayouts: {
              ...(stateCash.salaryPayouts || {}),
              [employeeId]: numAmount
            }
          }
        };

        // Если numAmount = 0, мы можем удалить ключ из payouts
        if (numAmount === 0) {
           delete updatedReport.cashState.salaryPayouts[employeeId];
        }
`;

code = code.replace(oldPayoutLogic, newPayoutLogic);

const oldSuccessMessage = 'toast.success(`Выплачено ${numAmount.toFixed(2)} BYN из кассы`);';
const newSuccessMessage = 'toast.success(`Сумма выплаты из кассы обновлена: ${numAmount.toFixed(2)} BYN`);';
code = code.replace(oldSuccessMessage, newSuccessMessage);


// For validation of parsedAmount:
// `const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;`
// We need to allow 0 for cash (if they want to return all money)
code = code.replace(
  'const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;',
  'const isValidAmount = !Number.isNaN(parsedAmount) && (source === "cash" ? parsedAmount >= 0 : parsedAmount > 0);'
);

// We also need to fix `if (Number.isNaN(numAmount) || numAmount <= 0) {` inside handlePayout
code = code.replace(
  'if (Number.isNaN(numAmount) || numAmount <= 0) {',
  'if (Number.isNaN(numAmount) || (source === "cash" ? numAmount < 0 : numAmount <= 0)) {'
);


// `isExceedingCash = source === "cash" && isValidAmount && parsedAmount > expectedCash;`
// expectedCash logic needs to check the difference.
const oldIsExceeding = 'const isExceedingCash = source === "cash" && isValidAmount && parsedAmount > expectedCash;';
const newIsExceeding = `
  const currentPayoutForValidation = stateCash.salaryPayouts?.[employeeId] || 0;
  const diffForValidation = source === "cash" && isValidAmount ? parsedAmount - currentPayoutForValidation : 0;
  const isExceedingCash = source === "cash" && isValidAmount && diffForValidation > expectedCash;
`;

code = code.replace(oldIsExceeding, newIsExceeding);


// Change the form input step and min
code = code.replace(
  'min="0.01"',
  'min={source === "cash" ? "0" : "0.01"}'
);

code = code.replace(
  'Сумма выплаты (BYN)',
  'Итоговая сумма выплаты (BYN)'
);

code = code.replace(
  '<p className="text-xs text-muted-foreground">Оформление выдачи средств</p>',
  `{source === 'cash' ? (
              <p className="text-xs text-muted-foreground">
                {(stateCash.salaryPayouts?.[employeeId] || 0) > 0 ? "Изменение уже выданной суммы" : "Оформление выдачи средств из кассы"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Оформление выдачи средств из сейфа</p>
            )}`
);

fs.writeFileSync(file, code);
