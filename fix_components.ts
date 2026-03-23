import fs from 'fs';

// Helper function to replace in file
function replaceInFile(filePath: string, searchStr: string, replaceStr: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Successfully updated ${filePath}`);
  } else {
    console.error(`Could not find search block in ${filePath}`);
  }
}

// 1. SettingsPage.tsx
replaceInFile(
  'src/pages/SettingsPage.tsx',
  `      const successSafe = await settingsService.processSafeOperations([transaction], newBalance);

      if (successSafe) {
        dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
        dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });`,
  `      const result = await settingsService.processSafeOperations([transaction], newBalance);

      if (result.success) {
        dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
        dispatch({ type: "SET_SAFE_BALANCE", payload: result.newBalance ?? newBalance });`
);

// 2. PayoutsPage.tsx
replaceInFile(
  'src/pages/PayoutsPage.tsx',
  `        const newBalance = state.safeBalance - diff; // if diff > 0 (pay more), balance decreases. If diff < 0 (return), balance increases.
        const successSafe = await settingsService.processSafeOperations([transaction], newBalance);

        if (successSafe) {
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
          dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });`,
  `        const newBalance = state.safeBalance - diff; // if diff > 0 (pay more), balance decreases. If diff < 0 (return), balance increases.
        const result = await settingsService.processSafeOperations([transaction], newBalance);

        if (result.success) {
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
          dispatch({ type: "SET_SAFE_BALANCE", payload: result.newBalance ?? newBalance });`
);

// 3. PayoutEmployeesModal.tsx
replaceInFile(
  'src/components/Home/CashState/PayoutEmployeesModal.tsx',
  `        const newBalance = state.safeBalance + netSafeChange;

        const success = await settingsService.processSafeOperations(newSafeTransactions, newBalance);

        if (success) {
          for (const tx of newSafeTransactions) {
            dispatch({ type: "ADD_SAFE_TRANSACTION", payload: tx });
          }
          dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });`,
  `        const newBalance = state.safeBalance + netSafeChange;

        const result = await settingsService.processSafeOperations(newSafeTransactions, newBalance);

        if (result.success) {
          for (const tx of newSafeTransactions) {
            dispatch({ type: "ADD_SAFE_TRANSACTION", payload: tx });
          }
          dispatch({ type: "SET_SAFE_BALANCE", payload: result.newBalance ?? newBalance });`
);

// 4. TransferToSafeModal.tsx
replaceInFile(
  'src/components/Home/CashState/TransferToSafeModal.tsx',
  `      // 2. Рассчитываем новый баланс
      const newBalance = state.safeBalance + numAmount;

      const successSafe = await settingsService.processSafeOperations([transaction], newBalance);

      // 3. Обновляем отчет (cashState)`,
  `      // 2. Рассчитываем новый баланс
      const newBalance = state.safeBalance + numAmount;

      const result = await settingsService.processSafeOperations([transaction], newBalance);
      const successSafe = result.success;

      // 3. Обновляем отчет (cashState)`
);

// Since TransferToSafeModal.tsx uses successSafe directly, let's fix the ADD_SAFE_TRANSACTION block too
replaceInFile(
  'src/components/Home/CashState/TransferToSafeModal.tsx',
  `      if (successSafe && successReport) {
        dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
        dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });`,
  `      if (successSafe && successReport) {
        dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
        dispatch({ type: "SET_SAFE_BALANCE", payload: result.newBalance ?? newBalance });`
);
