import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import type { ProductCostHistory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface CostHistoryChartProps {
  history: ProductCostHistory[];
}

export default function CostHistoryChart({ history }: CostHistoryChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-background/50 glass-panel border-dashed p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <svg className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Henüz geçmiş maliyet verisi bulunmuyor.</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider font-bold">Veriler güncellendikçe burada görünecektir</p>
      </div>
    );
  }

  // Format data for chart and ensure it's sorted by date
  const sortedHistory = [...history].sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const data = sortedHistory.map(item => {
    const [y, m, d] = item.dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const timestamp = date.getTime();
    const label = `${d.toString().padStart(2, '0')}.${(m).toString().padStart(2, '0')}.${y}`;

    return {
      timestamp,
      date: label,
      cost: item.cost
    };
  });

  // Add a point for today to make the chart extend to current date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  if (data.length > 0) {
    const lastPoint = data[data.length - 1];
    if (lastPoint.timestamp < todayTimestamp) {
      data.push({
        timestamp: todayTimestamp,
        date: `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`,
        cost: lastPoint.cost
      });
    }
  }

  return (
    <div className="glass-panel bg-background/50 p-6 rounded-xl border-border/50 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Maliyet Geçmişi</h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 25, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
              tickFormatter={(unixTime) => {
                const diffMs = todayTimestamp - unixTime;
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays === 0) return 'Bugün';
                if (diffDays === 1) return 'Dün';
                if (diffDays >= 30) {
                  const months = Math.round(diffDays / 30);
                  return `${months} ay önce`;
                }
                return `${diffDays} gün önce`;
              }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₺${value}`}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }}
              labelFormatter={(label) => {
                const unixTime = Number(label);
                const diffMs = todayTimestamp - unixTime;
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

                const date = new Date(unixTime);
                const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;

                if (diffDays === 0) return `Bugün (${dateStr})`;
                if (diffDays === 1) return `Dün (${dateStr})`;
                if (diffDays >= 30) {
                  const months = Math.round(diffDays / 30);
                  return `${months} ay önce (${dateStr})`;
                }
                return `${diffDays} gün önce (${dateStr})`;
              }}
              formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), 'Maliyet']}
              labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
            />
            <Line
              type="stepAfter"
              dataKey="cost"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="cost"
                position="top"
                offset={12}
                formatter={(value: any) => formatCurrency(typeof value === 'number' ? value : 0)}
                style={{ fontSize: '10px', fill: 'hsl(var(--primary))', fontWeight: 'bold' }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
