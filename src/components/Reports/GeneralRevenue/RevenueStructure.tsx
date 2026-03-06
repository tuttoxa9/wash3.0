import type React from 'react';
import type { GeneralReportData } from './types';
import { Banknote, CreditCard, Building2, Receipt, Wallet, Banknote as BanknoteIcon, FileText } from 'lucide-react';

export const RevenueStructure: React.FC<{ data: GeneralReportData }> = ({ data }) => {
  const { totalRevenue, totalCash, totalCard, totalOrganizations, totalDebt, totalSalaries } = data;

  const getPercentage = (value: number) => totalRevenue > 0 ? (value / totalRevenue) * 100 : 0;

  const items = [
    { name: 'Наличные', value: totalCash, color: 'bg-emerald-500', textLight: 'text-emerald-600', textDark: 'dark:text-emerald-400', icon: Banknote },
    { name: 'Карта', value: totalCard, color: 'bg-blue-500', textLight: 'text-blue-600', textDark: 'dark:text-blue-400', icon: CreditCard },
    { name: 'Безнал (Организации)', value: totalOrganizations, color: 'bg-purple-500', textLight: 'text-purple-600', textDark: 'dark:text-purple-400', icon: Building2 },
    { name: 'В долг', value: totalDebt, color: 'bg-rose-500', textLight: 'text-rose-600', textDark: 'dark:text-rose-400', icon: Receipt },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold tracking-tight">Структура выручки</h3>
      </div>

      {/* Visual Progress Bar */}
      <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden flex shadow-inner mb-8">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`h-full ${item.color} transition-all duration-500 hover:brightness-110`}
            style={{ width: `${getPercentage(item.value)}%` }}
            title={`${item.name}: ${getPercentage(item.value).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, idx) => {
          const percentage = getPercentage(item.value).toFixed(1);
          const Icon = item.icon;
          return (
            <div key={idx} className="flex flex-col p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${item.color} bg-opacity-10 dark:bg-opacity-20`}>
                  <Icon className={`w-4 h-4 ${item.textLight} ${item.textDark}`} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight mb-1">
                {item.value.toLocaleString('ru-RU')} <span className="text-sm font-normal text-muted-foreground">BYN</span>
              </div>
              <div className={`text-sm font-medium ${item.textLight} ${item.textDark}`}>
                {percentage}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Salary Block separated from structure */}
      <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-orange-600 dark:text-orange-400">
                <BanknoteIcon className="w-5 h-5" />
             </div>
             <div>
               <div className="text-sm font-medium text-orange-800 dark:text-orange-300">Фонд оплаты труда</div>
               <div className="text-xs text-orange-600/70 dark:text-orange-400/70">Выплаты сотрудникам</div>
             </div>
          </div>
          <div className="text-right">
             <div className="text-lg font-bold text-orange-700 dark:text-orange-400">
               {totalSalaries.toLocaleString('ru-RU')} BYN
             </div>
             <div className="text-sm font-medium text-orange-600 dark:text-orange-500">
               {getPercentage(totalSalaries).toFixed(1)}% от выручки
             </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <FileText className="w-5 h-5" />
             </div>
             <div>
               <div className="text-sm font-medium text-slate-800 dark:text-slate-300">Средний чек</div>
               <div className="text-xs text-slate-500">На один автомобиль</div>
             </div>
          </div>
          <div className="text-right">
             <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
               {data.dailyData.reduce((sum, d) => sum + d.recordsCount, 0) > 0
                  ? (totalRevenue / data.dailyData.reduce((sum, d) => sum + d.recordsCount, 0)).toFixed(0)
                  : '0'} BYN
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
