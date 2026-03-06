import type React from 'react';
import { useState } from 'react';
import type { GeneralReportData } from './types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartNoAxesCombined, CarFront } from 'lucide-react';

export const ChartsSection: React.FC<{ data: GeneralReportData }> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'cars'>('revenue');

  const formattedData = data.dailyData.map(day => ({
    ...day,
    formattedDate: day.date.split('-').slice(1).join('.') // "MM.DD"
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          {activeTab === 'revenue' ? <ChartNoAxesCombined className="w-5 h-5 text-indigo-500"/> : <CarFront className="w-5 h-5 text-emerald-500"/>}
          {activeTab === 'revenue' ? 'Динамика выручки по дням' : 'Количество обслуженных авто'}
        </h3>

        {/* Toggle Buttons */}
        <div className="flex bg-muted p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'revenue' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Выручка
          </button>
          <button
            onClick={() => setActiveTab('cars')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'cars' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Автомобили
          </button>
        </div>
      </div>

      <div className="h-80 w-full bg-background/50 rounded-xl p-4 border border-border/50">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'revenue' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="formattedDate" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                itemStyle={{ color: 'var(--foreground)' }}
                labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '8px' }}
                formatter={(value: number) => [`${value.toFixed(0)} BYN`, 'Выручка']}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#6366f1" // indigo-500
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)', stroke: '#6366f1' }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
              />
            </LineChart>
          ) : (
             <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="formattedDate" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                formatter={(value: number) => [`${value} авто`, 'Количество']}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Bar
                dataKey="recordsCount"
                fill="#10b981" // emerald-500
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
