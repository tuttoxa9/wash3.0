const fs = require('fs');

const file = 'src/components/Home/CashState/PayoutEmployeesModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// For cash payouts in handleSave
const oldCashSave = `
        const numericPayouts: Record<string, number> = {};
        Object.keys(cashPayouts).forEach(id => {
          const val = Number.parseFloat(cashPayouts[id]);
          if (!Number.isNaN(val) && val > 0) {
            numericPayouts[id] = val;
          }
        });
`;
const newCashSave = `
        const numericPayouts: Record<string, number> = {};
        Object.keys(cashPayouts).forEach(id => {
          if (cashPayouts[id] === "") return; // Skip completely empty
          const val = Number.parseFloat(cashPayouts[id]);
          if (!Number.isNaN(val) && val >= 0) {
            if (val > 0) {
                numericPayouts[id] = val;
            }
            // if val === 0, we simply don't add it, which effectively deletes it from payouts
          }
        });
`;
code = code.replace(oldCashSave, newCashSave);

// For validation, we need to check if the new total payouts EXCEEDS the expected cash.
// But expectedCash = baseCash - transferredToSafe.
// And baseCash already includes all modifications.
// This means expectedCash is the MAXIMUM we can pay out of the register at this moment.
// So totalPayoutsSum > expectedCash is perfectly correct because totalPayoutsSum is the NEW sum.
// We just need to make sure we don't block saving if totalPayoutsSum <= expectedCash.
// The current logic is already `if (totalPayoutsSum > expectedCash)`, which is correct.

// For safe payouts in handleSave
// Right now it just creates "out" transactions for whatever is typed.
// If we want to allow editing safe payouts too, it gets complicated because the modal
// only sees `safePayouts` as an empty object initially.
// Let's change safe payouts to act like cash payouts (total amount for the day),
// and calculate the difference!

const oldSafeInitial = `
  // Для сейфа вводим "новые" суммы выплат за этот раз
  const [safePayouts, setSafePayouts] = useState<Record<string, string>>({});
`;

const newSafeInitial = `
  // Храним уже выданное из сейфа за сегодня для каждого сотрудника
  const existingSafePayouts = useMemo(() => {
    const todayStr = state.currentDate;
    const payouts: Record<string, number> = {};
    const todayTxs = state.safeTransactions.filter(tx => tx.date.startsWith(todayStr) && tx.comment.includes("Выплата ЗП:"));

    employees.forEach(emp => {
      const empTxs = todayTxs.filter(tx => tx.comment.includes(emp.name));
      let sum = 0;
      empTxs.forEach(tx => {
         if (tx.type === "out") sum += tx.amount;
         if (tx.type === "in") sum -= tx.amount;
      });
      if (sum > 0) payouts[emp.id] = sum;
    });
    return payouts;
  }, [state.safeTransactions, state.currentDate, employees]);

  const [safePayouts, setSafePayouts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(existingSafePayouts).forEach(id => {
      initial[id] = existingSafePayouts[id].toString();
    });
    return initial;
  });
`;

code = code.replace(oldSafeInitial, newSafeInitial);

// Safe Save logic
const oldSafeSave = `
      } else {
        // Выплата из СЕЙФА
        const newSafeTransactions: any[] = [];
        let totalSafePayout = 0;

        Object.keys(safePayouts).forEach(id => {
          const val = Number.parseFloat(safePayouts[id]);
          if (!Number.isNaN(val) && val > 0) {
            const emp = employees.find(e => e.id === id);
            totalSafePayout += val;
            newSafeTransactions.push({
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              date: new Date().toISOString(),
              amount: val,
              type: "out" as const,
              comment: \`Выплата ЗП: \${emp?.name || "Сотрудник"}\`,
            });
          }
        });

        if (newSafeTransactions.length === 0) {
          toast.error("Введите суммы для выплаты");
          setLoading(false);
          return;
        }

        if (totalSafePayout > state.safeBalance) {
           toast.error(\`В сейфе недостаточно средств (доступно: \${state.safeBalance.toFixed(2)} BYN)\`);
           setLoading(false);
           return;
        }

        // Сохраняем каждую транзакцию и обновляем баланс сейфа
        for (const tx of newSafeTransactions) {
          await settingsService.addSafeTransaction(tx);
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: tx });
        }

        const newBalance = state.safeBalance - totalSafePayout;
        await settingsService.updateSafeBalance(newBalance);
        dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });

        toast.success(\`Выплачено \${totalSafePayout.toFixed(2)} BYN из сейфа\`);
        onClose();
      }
`;

const newSafeSave = `
      } else {
        // Выплата из СЕЙФА
        const newSafeTransactions: any[] = [];
        let netSafeChange = 0; // Negative means money leaves safe, positive means money returns

        Object.keys(safePayouts).forEach(id => {
          if (safePayouts[id] === "") return;
          const val = Number.parseFloat(safePayouts[id]);
          if (!Number.isNaN(val) && val >= 0) {
            const currentPayout = existingSafePayouts[id] || 0;
            const diff = val - currentPayout;

            if (diff !== 0) {
               const emp = employees.find(e => e.id === id);
               netSafeChange -= diff; // If diff > 0, we pay more out (negative change to balance).

               newSafeTransactions.push({
                 id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                 date: new Date().toISOString(),
                 amount: Math.abs(diff),
                 type: diff > 0 ? "out" : "in",
                 comment: diff > 0
                     ? \`Выплата ЗП: \${emp?.name || "Сотрудник"}\`
                     : \`Возврат выплаты ЗП: \${emp?.name || "Сотрудник"}\`,
               });
            }
          }
        });

        if (newSafeTransactions.length === 0) {
          toast.error("Нет изменений для сохранения");
          setLoading(false);
          return;
        }

        if (netSafeChange < 0 && Math.abs(netSafeChange) > state.safeBalance) {
           toast.error(\`В сейфе недостаточно средств для доплаты (доступно: \${state.safeBalance.toFixed(2)} BYN)\`);
           setLoading(false);
           return;
        }

        for (const tx of newSafeTransactions) {
          await settingsService.addSafeTransaction(tx);
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: tx });
        }

        const newBalance = state.safeBalance + netSafeChange;
        await settingsService.updateSafeBalance(newBalance);
        dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });

        toast.success(netSafeChange < 0
            ? \`Сейф: выплачено еще \${Math.abs(netSafeChange).toFixed(2)} BYN\`
            : \`Сейф: возвращено \${netSafeChange.toFixed(2)} BYN\`);
        onClose();
      }
`;
code = code.replace(oldSafeSave, newSafeSave);


// Also fix existingCashPayouts display to show for BOTH modes if we have it
const oldShowCashPayouts = `
                  {source === "safe" && existingCashPayouts[employee.id] > 0 && (
                     <div className="text-[10px] text-muted-foreground font-medium mb-1">
                       Уже выдано из кассы: {existingCashPayouts[employee.id].toFixed(2)}
                     </div>
                  )}
`;
const newShowCashPayouts = `
                  {source === "safe" && existingCashPayouts[employee.id] > 0 && (
                     <div className="text-[10px] text-muted-foreground font-medium mb-1">
                       Уже выдано из кассы: {existingCashPayouts[employee.id].toFixed(2)}
                     </div>
                  )}
                  {source === "cash" && existingSafePayouts[employee.id] > 0 && (
                     <div className="text-[10px] text-muted-foreground font-medium mb-1">
                       Уже выдано из сейфа: {existingSafePayouts[employee.id].toFixed(2)}
                     </div>
                  )}
`;
code = code.replace(oldShowCashPayouts, newShowCashPayouts);

fs.writeFileSync(file, code);
