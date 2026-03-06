import type React from 'react';
import type { GeneralReportData } from './types';
import { TrendingUp, Banknotes, CreditCard, BuildingOffice2, ReceiptRefund, Scale } from '@heroicons/react/24/outline'; // Need to check if heroicons or lucide is used, project uses lucide-react

export const SummaryCards: React.FC<{ data: GeneralReportData }> = ({ data }) => {
  const netProfit = data.totalRevenue - data.totalSalaries;
  const netProfitMargin = data.totalRevenue > 0 ? (netProfit / data.totalRevenue) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Hero Card: Revenue & Profit */}
      <div className="col-span-1 md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-48 h-48 rounded-full bg-blue-500 opacity-10 blur-3xl"></div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div className="text-indigo-200 text-sm font-medium mb-1 tracking-wider uppercase">Общая выручка</div>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              {data.totalRevenue.toLocaleString('ru-RU')} <span className="text-2xl font-normal text-indigo-300">BYN</span>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="bg-indigo-800/50 text-indigo-100 px-2 py-1 rounded-md border border-indigo-700/50">
                {data.dailyData.reduce((sum, day) => sum + day.recordsCount, 0)} обслуженных авто
              </span>
            </div>
          </div>

          <div className="sm:border-l sm:border-indigo-700/50 sm:pl-8">
            <div className="text-emerald-300 text-sm font-medium mb-1 tracking-wider uppercase">Чистая прибыль (Эстимейт)</div>
            <div className="text-3xl sm:text-4xl font-bold text-emerald-100">
              {netProfit.toLocaleString('ru-RU')} <span className="text-xl font-normal text-emerald-300">BYN</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm bg-emerald-900/40 text-emerald-200 px-2 py-1 rounded-md border border-emerald-800/50">
                Рентабельность: {netProfitMargin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
