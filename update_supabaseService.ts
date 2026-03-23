import fs from 'fs';

const filePath = 'src/lib/services/supabaseService.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const searchBlock = `  async processSafeOperations(
    newTransactions: any[],
    newBalance: number
  ): Promise<boolean> {
    // Получаем текущие транзакции для обновления списка
    const currentTransactions = await this.getSafeTransactions();

    // Переворачиваем массив новых транзакций (чтобы последняя добавленная оставалась в начале),
    // и объединяем с существующими
    const updatedTransactions = [...newTransactions].reverse().concat(currentTransactions);

    // Выполняем batch upsert для обеих записей одновременно
    const { error } = await supabase
      .from("settings")
      .upsert([
        { key: "safeTransactions", data: { transactions: updatedTransactions } },
        { key: "safeBalance", data: { balance: newBalance } }
      ], { onConflict: "key" });

    if (error) {
      logSupabaseError("settings.processSafeOperations", error);
      return false;
    }
    return true;
  },`;

const replaceBlock = `  async processSafeOperations(
    newTransactions: any[],
    _clientNewBalance?: number // устаревший параметр, оставляем для совместимости или игнорируем
  ): Promise<{ success: boolean; newBalance?: number }> {
    // Получаем актуальный баланс и транзакции из БД, чтобы избежать гонки (race condition)
    // когда клиент отправляет устаревший state.safeBalance
    const currentTransactions = await this.getSafeTransactions();
    const currentBalance = await this.getSafeBalance();

    // Вычисляем дельту на основе новых транзакций
    let delta = 0;
    for (const tx of newTransactions) {
      if (tx.type === "in") delta += tx.amount;
      if (tx.type === "out") delta -= tx.amount;
    }

    const actualNewBalance = currentBalance + delta;

    // Переворачиваем массив новых транзакций (чтобы последняя добавленная оставалась в начале),
    // и объединяем с существующими
    const updatedTransactions = [...newTransactions].reverse().concat(currentTransactions);

    // Выполняем batch upsert для обеих записей одновременно
    const { error } = await supabase
      .from("settings")
      .upsert([
        { key: "safeTransactions", data: { transactions: updatedTransactions } },
        { key: "safeBalance", data: { balance: actualNewBalance } }
      ], { onConflict: "key" });

    if (error) {
      logSupabaseError("settings.processSafeOperations", error);
      return { success: false };
    }
    return { success: true, newBalance: actualNewBalance };
  },`;

if (content.includes(searchBlock)) {
  content = content.replace(searchBlock, replaceBlock);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully updated src/lib/services/supabaseService.ts');
} else {
  console.error('Could not find search block in src/lib/services/supabaseService.ts');
}
