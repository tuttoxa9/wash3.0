import type React from 'react';
import type { GeneralReportData } from './types';
import { SummaryCards } from './SummaryCards';
import { RevenueStructure } from './RevenueStructure';
import { InsightsPanel } from './InsightsPanel';
import { ChartsSection } from './ChartsSection';
import { TopOrganizations } from './TopOrganizations';
import { FileDown, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface GeneralRevenueReportProps {
  data: GeneralReportData | null;
  startDate: Date;
  endDate: Date;
  onExport: () => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const GeneralRevenueReport: React.FC<GeneralRevenueReportProps> = ({
  data,
  startDate,
  endDate,
  onExport,
  isLoading,
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className="card-with-shadow p-12 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-lg">Формирование отчёта...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-card border border-border rounded-2xl shadow-sm gap-4">
        <div>
           <h3 className="font-semibold text-lg">Общий финансовый отчёт</h3>
           <p className="text-sm text-muted-foreground">
             Период: {format(startDate, 'dd.MM.yyyy')} — {format(endDate, 'dd.MM.yyyy')}
           </p>
        </div>
        <div className="flex items-center gap-3">
           <button
             onClick={onRefresh}
             className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
             title="Обновить"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
           <button
             onClick={onExport}
             className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/90 transition-colors shadow-sm font-medium"
           >
             <FileDown className="w-4 h-4" />
             Экспорт в Word
           </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto">
        <SummaryCards data={data} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
             <RevenueStructure data={data} />
             <InsightsPanel data={data} />
          </div>
          <div className="lg:col-span-1">
             <TopOrganizations data={data} />
          </div>
        </div>

        <ChartsSection data={data} />
      </div>
    </div>
  );
};
