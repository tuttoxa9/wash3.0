import type React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { settingsService } from "@/lib/services/supabaseService";
import { SharedSafeSettings } from "@/components/SharedSafeSettings";

export const OkleykaSafeSettings: React.FC = () => {
  const [safeBalance, setSafeBalance] = useState<number>(0);
  const [safeTransactions, setSafeTransactions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchData = async () => {
    setFetching(true);
    try {
      const balance = await settingsService.getSafeBalance();
      const transactions = await settingsService.getSafeTransactions();
      setSafeBalance(balance);
      setSafeTransactions(transactions);
    } catch (e) {
      toast.error("Ошибка при загрузке сейфа");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SharedSafeSettings
      safeBalance={safeBalance}
      safeTransactions={safeTransactions}
      onTransactionComplete={(tx, newBalance) => {
        setSafeBalance(newBalance);
        setSafeTransactions((prev) => [tx, ...prev]);
      }}
    />
  );
};
