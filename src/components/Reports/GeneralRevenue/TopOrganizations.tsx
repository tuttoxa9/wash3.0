import type React from 'react';
import type { GeneralReportData } from './types';
import { Building2, Trophy, Medal } from 'lucide-react';

export const TopOrganizations: React.FC<{ data: GeneralReportData }> = ({ data }) => {
  if (data.organizationBreakdown.length === 0) return null;

  const sortedOrgs = [...data.organizationBreakdown].sort((a, b) => b.amount - a.amount);
  const top3 = sortedOrgs.slice(0, 3);
  const others = sortedOrgs.slice(3);

  const getShare = (amount: number) => ((amount / data.totalRevenue) * 100).toFixed(1);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <Building2 className="w-6 h-6 text-purple-500" />
        <div>
           <h3 className="text-xl font-semibold tracking-tight">Корпоративные клиенты</h3>
           <p className="text-sm text-muted-foreground">{data.organizationBreakdown.length} организаций обслуживалось в этот период</p>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {top3.map((org, index) => (
          <div key={index} className="relative bg-background border border-border/50 rounded-xl p-5 hover:border-purple-500/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group">
            <div className="flex items-start justify-between">
               <div className="flex items-center gap-3">
                 <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white shadow-inner
                   ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-400/20' :
                     index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 ring-2 ring-slate-400/20' :
                     'bg-gradient-to-br from-amber-600 to-amber-800 ring-2 ring-amber-600/20'}`}>
                    {index === 0 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                 </div>
                 <div>
                   <h4 className="font-semibold text-base line-clamp-1" title={org.name}>{org.name}</h4>
                   <p className="text-xs text-muted-foreground">{getShare(org.amount)}% от общей выручки</p>
                 </div>
               </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-end">
              <div>
                 <p className="text-xs text-muted-foreground mb-1">Оплачено</p>
                 <p className="font-bold text-lg">{org.amount.toLocaleString('ru-RU')} <span className="text-xs font-normal">BYN</span></p>
              </div>
              <div className="text-right">
                <div className={`text-xs px-2 py-1 rounded-md font-medium
                   ${index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                     index === 1 ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
                     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                   #{index + 1}
                </div>
              </div>
            </div>

             {/* Progress Bar under Top Card */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-muted rounded-b-xl overflow-hidden">
               <div className={`h-full transition-all duration-500
                  ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'}`}
                  style={{ width: `${(org.amount / top3[0].amount) * 100}%` }}
               />
            </div>
          </div>
        ))}
      </div>

      {/* Others List */}
      {others.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 px-2">Остальные организации</h4>
          <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              {others.map((org, index) => (
                <div key={index + 3} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {index + 4}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{org.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-bold">{org.amount.toLocaleString('ru-RU')} BYN</div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md text-muted-foreground">
                        {getShare(org.amount)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
