import type React from 'react';
import type { GeneralReportData } from './types';
import { Calendar, TrendingUp, TrendingDown, Car, AlertCircle, Activity } from 'lucide-react';

export const InsightsPanel: React.FC<{ data: GeneralReportData }> = ({ data }) => {
  const workingDays = data.dailyData.filter(day => day.recordsCount > 0);
  const totalCars = data.dailyData.reduce((sum, day) => sum + day.recordsCount, 0);
  const avgCarsPerDay = workingDays.length > 0 ? Math.round(totalCars / workingDays.length) : 0;
  const maxCarsPerDay = Math.max(0, ...data.dailyData.map(day => day.recordsCount));
  const zeroDays = data.dailyData.filter(day => day.recordsCount === 0).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {/* Productivity Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center gap-2 mb-4 text-primary">
            <Car className="w-5 h-5" />
            <h3 className="font-semibold">Продуктивность</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-border/50 pb-2">
              <span className="text-sm text-muted-foreground">Всего авто</span>
              <span className="font-bold text-lg">{totalCars}</span>
            </div>
            <div className="flex justify-between items-end border-b border-border/50 pb-2">
              <span className="text-sm text-muted-foreground">В среднем за день</span>
              <span className="font-bold">{avgCarsPerDay} <span className="text-xs font-normal text-muted-foreground">авто</span></span>
            </div>
            <div className="flex justify-between items-end pb-2">
              <span className="text-sm text-muted-foreground">Рекорд (максимум)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{maxCarsPerDay} <span className="text-xs font-normal">авто</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Dynamics */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center gap-2 mb-4 text-blue-500">
            <Activity className="w-5 h-5" />
            <h3 className="font-semibold">Динамика выручки</h3>
          </div>
          <div className="space-y-4">
             <div className="flex justify-between items-end border-b border-border/50 pb-2">
              <span className="text-sm text-muted-foreground">В среднем за день</span>
              <span className="font-bold">{data.averageDaily.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">BYN</span></span>
            </div>
            <div className="flex justify-between items-end border-b border-border/50 pb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-500"/> Лучший день</span>
              <div className="text-right">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.maxDay.amount.toFixed(0)} BYN</span>
                <div className="text-xs text-muted-foreground">{data.maxDay.date}</div>
              </div>
            </div>
             <div className="flex justify-between items-end pb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="w-4 h-4 text-rose-500"/> Худший день</span>
              <div className="text-right">
                <span className="font-bold text-rose-600 dark:text-rose-400">{data.minDay.amount.toFixed(0)} BYN</span>
                <div className="text-xs text-muted-foreground">{data.minDay.date}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency & Highlights */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow bg-gradient-to-br from-card to-muted/20">
        <div>
          <div className="flex items-center gap-2 mb-4 text-purple-500">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Инсайты</h3>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-xl border border-border/50 text-sm">
              <span className="block font-medium mb-1">Рабочих дней: {workingDays.length}</span>
              {zeroDays > 0 ? (
                <span className="text-rose-500 dark:text-rose-400">Дней без записей: {zeroDays}</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Простоев не было 🎉</span>
              )}
            </div>

            <div className="p-3 bg-muted/50 rounded-xl border border-border/50 text-sm">
              <span className="block font-medium mb-1 text-muted-foreground">Доходность на зарплату:</span>
              <span className="font-bold text-lg">
                {data.totalSalaries > 0 ? (data.totalRevenue / data.totalSalaries).toFixed(1) + 'x' : '0x'}
              </span>
              <span className="text-xs text-muted-foreground block mt-1">Каждый 1 BYN зарплаты приносит {(data.totalRevenue / data.totalSalaries).toFixed(1)} BYN выручки</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
