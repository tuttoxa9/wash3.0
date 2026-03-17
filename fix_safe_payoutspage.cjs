const fs = require('fs');

const file = 'src/pages/PayoutsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// We need to calculate existingSafePayouts inside PayoutModal.
const oldSafeInit = `
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

const newSafeInit = `
  const currentPayoutFromCash = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;

  // Calculate existing safe payouts for today
  const existingSafePayout = useMemo(() => {
    if (!employeeId || !employee) return 0;
    const todayStr = state.currentDate;
    const todayTxs = state.safeTransactions.filter(tx => tx.date.startsWith(todayStr) && tx.comment.includes(employee.name));

    let sum = 0;
    todayTxs.forEach(tx => {
       if (tx.type === "out") sum += tx.amount;
       if (tx.type === "in") sum -= tx.amount;
    });
    return sum > 0 ? sum : 0;
  }, [state.safeTransactions, state.currentDate, employeeId, employee]);

  const [amount, setAmount] = useState(() => currentPayoutFromCash > 0 ? currentPayoutFromCash.toString() : "");

  // Когда меняется выбранный сотрудник или источник, пересчитываем начальное значение
  useEffect(() => {
    if (source === "cash") {
      const p = currentReport?.cashState?.salaryPayouts?.[employeeId || ""] || 0;
      setAmount(p > 0 ? p.toString() : "");
    } else {
      setAmount(existingSafePayout > 0 ? existingSafePayout.toString() : "");
    }
  }, [employeeId, source, currentReport, existingSafePayout]);
`;

code = code.replace(oldSafeInit, newSafeInit);

// Fix validation logic to allow source === "safe" to be >= 0
const oldValidation1 = `const isValidAmount = !Number.isNaN(parsedAmount) && (source === "cash" ? parsedAmount >= 0 : parsedAmount > 0);`;
const newValidation1 = `const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount >= 0;`;
code = code.replace(oldValidation1, newValidation1);

const oldValidation2 = `if (Number.isNaN(numAmount) || (source === "cash" ? numAmount < 0 : numAmount <= 0)) {`;
const newValidation2 = `if (Number.isNaN(numAmount) || numAmount < 0) {`;
code = code.replace(oldValidation2, newValidation2);

const oldValidation3 = `
  const currentPayoutForValidation = stateCash.salaryPayouts?.[employeeId] || 0;
  const diffForValidation = source === "cash" && isValidAmount ? parsedAmount - currentPayoutForValidation : 0;
  const isExceedingCash = source === "cash" && isValidAmount && diffForValidation > expectedCash;
  const isExceedingSafe = source === "safe" && isValidAmount && parsedAmount > safeAvailable;
`;

const newValidation3 = `
  const currentPayoutForValidation = stateCash.salaryPayouts?.[employeeId] || 0;
  const diffForValidation = source === "cash" && isValidAmount ? parsedAmount - currentPayoutForValidation : 0;
  const diffForSafeValidation = source === "safe" && isValidAmount ? parsedAmount - existingSafePayout : 0;
  const isExceedingCash = source === "cash" && isValidAmount && diffForValidation > expectedCash;
  const isExceedingSafe = source === "safe" && isValidAmount && diffForSafeValidation > safeAvailable;
`;

code = code.replace(oldValidation3, newValidation3);


// Fix Save logic for Safe
const oldSafeSave = `
        // Источник: Сейф
        if (numAmount > state.safeBalance) {
          toast.error(\`В сейфе недостаточно средств (доступно: \${state.safeBalance.toFixed(2)} BYN)\`);
          setLoading(false);
          return;
        }

        const defaultComment = \`Выплата: \${employee.name}\`;
        const finalComment = useCustomComment && customComment.trim() ? customComment.trim() : defaultComment;

        const transaction = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          date: new Date().toISOString(),
          amount: numAmount,
          type: "out" as const,
          comment: finalComment,
        };

        const successTx = await settingsService.addSafeTransaction(transaction);
        const newBalance = state.safeBalance - numAmount;
        const successBal = await settingsService.updateSafeBalance(newBalance);

        if (successTx && successBal) {
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
          dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });
          toast.success(\`Выплачено \${numAmount.toFixed(2)} BYN из сейфа\`);
          onClose();
        } else {
          throw new Error("Ошибка при операции с сейфом");
        }
`;

const newSafeSave = `
        // Источник: Сейф
        const diff = numAmount - existingSafePayout;

        if (diff === 0) {
           toast.success("Изменений нет");
           setLoading(false);
           onClose();
           return;
        }

        if (diff > state.safeBalance) {
          toast.error(\`В сейфе недостаточно средств для доплаты (доступно: \${state.safeBalance.toFixed(2)} BYN)\`);
          setLoading(false);
          return;
        }

        const defaultComment = diff > 0
           ? \`Выплата ЗП: \${employee.name}\`
           : \`Возврат выплаты ЗП: \${employee.name}\`;

        const finalComment = useCustomComment && customComment.trim() ? customComment.trim() : defaultComment;

        const transaction = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          date: new Date().toISOString(),
          amount: Math.abs(diff),
          type: diff > 0 ? "out" : "in" as const,
          comment: finalComment,
        };

        const successTx = await settingsService.addSafeTransaction(transaction);
        const newBalance = state.safeBalance - diff; // if diff > 0 (pay more), balance decreases. If diff < 0 (return), balance increases.
        const successBal = await settingsService.updateSafeBalance(newBalance);

        if (successTx && successBal) {
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
          dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });
          toast.success(diff > 0
             ? \`Сейф: выплачено еще \${diff.toFixed(2)} BYN\`
             : \`Сейф: возвращено \${Math.abs(diff).toFixed(2)} BYN\`);
          onClose();
        } else {
          throw new Error("Ошибка при операции с сейфом");
        }
`;

code = code.replace(oldSafeSave, newSafeSave);

// Also fix min on input to allow 0 for safe as well
code = code.replace('min={source === "cash" ? "0" : "0.01"}', 'min="0"');

fs.writeFileSync(file, code);
