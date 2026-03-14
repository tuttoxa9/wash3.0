import React, { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { ArrowUpRight, ArrowDownLeft, Wallet, Search } from "lucide-react";
import { ModificationWithContext } from "../utils";

interface TransactionListProps {
  transactions: ModificationWithContext[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  modTypeFilter: "all" | "in" | "out";
  setModTypeFilter: (val: "all" | "in" | "out") => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
    transactions,
    searchQuery,
    setSearchQuery,
    modTypeFilter,
    setModTypeFilter
}) => {

  const filteredMods = useMemo(() => {
    return transactions.filter((mod) => {
      const matchSearch = mod.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType =
        modTypeFilter === "all" ? true :
        modTypeFilter === "in" ? mod.amount > 0 :
        mod.amount < 0;
      return matchSearch && matchType;
    });
  }, [transactions, searchQuery, modTypeFilter]);

  // Group by date for banking-style layout
  const groupedMods = useMemo(() => {
    const groups: { dateStr: string; date: Date; items: ModificationWithContext[] }[] = [];

    filteredMods.forEach((mod) => {
      const modDate = new Date(mod.createdAt);
      const existingGroup = groups.find(g => isSameDay(g.date, modDate));

      if (existingGroup) {
        existingGroup.items.push(mod);
      } else {
        groups.push({
          dateStr: format(modDate, "dd.MM.yyyy"),
          date: modDate,
          items: [mod]
        });
      }
    });

    // Sort groups latest first
    return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredMods]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                  type="text"
                  placeholder="Поиск по комментарию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
              />
          </div>
          <div className="flex bg-muted/40 p-1 rounded-xl self-start sm:self-auto border border-border/50">
               <button
                  onClick={() => setModTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      modTypeFilter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                  }`}
              >
                  Все
              </button>
              <button
                  onClick={() => setModTypeFilter("in")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      modTypeFilter === "in" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                  }`}
              >
                  Пополнения
              </button>
               <button
                  onClick={() => setModTypeFilter("out")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      modTypeFilter === "out" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                  }`}
              >
                  Изъятия
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">
        {groupedMods.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground text-sm">
            <Wallet className="w-12 h-12 text-muted/30 mb-3" />
            <p>Операции не найдены</p>
          </div>
        ) : (
          groupedMods.map((group) => {
              // Calculate daily total for this group
              const dayTotalIn = group.items.filter(i => i.amount > 0).reduce((sum, val) => sum + val.amount, 0);
              const dayTotalOut = group.items.filter(i => i.amount < 0).reduce((sum, val) => sum + Math.abs(val.amount), 0);

              return (
                <div key={group.dateStr} className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur-sm z-10 py-2 border-b border-border/30">
                      <span className="font-bold text-sm text-foreground">{group.dateStr}</span>
                      <div className="flex gap-3 text-xs font-medium">
                          {dayTotalIn > 0 && <span className="text-green-600">+{dayTotalIn.toFixed(2)}</span>}
                          {dayTotalOut > 0 && <span className="text-red-500">-{dayTotalOut.toFixed(2)}</span>}
                      </div>
                  </div>

                  <div className="space-y-1">
                      {group.items.map((mod) => (
                        <div key={mod.id} className="p-3 border-b border-border/50 last:border-none hover:bg-muted/5 flex items-center justify-between gap-4 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center shrink-0 text-muted-foreground opacity-60">
                              {mod.amount > 0 ? <ArrowDownLeft className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                            </div>
                            <div className="flex flex-col">
                              <p className="font-medium text-sm text-foreground line-clamp-1">{mod.reason}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <span>{format(new Date(mod.createdAt), "HH:mm")}</span>
                                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                                <span>Смена: {format(parseISO(mod.reportDate), "dd.MM.yyyy")}</span>
                              </p>
                            </div>
                          </div>
                          <div className={`font-bold text-sm whitespace-nowrap shrink-0 ${mod.amount > 0 ? "text-green-500" : "text-foreground"}`}>
                            {mod.amount > 0 ? "+" : ""}{mod.amount.toFixed(2)} <span className="text-[10px] font-medium opacity-70">BYN</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
          })
        )}
      </div>
    </div>
  );
};
