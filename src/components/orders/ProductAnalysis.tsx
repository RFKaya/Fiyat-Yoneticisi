'use client';

import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { OrderAnalysis } from '@/lib/orders/orderAnalytics';
import { aggregateProductStats } from '@/lib/orders/orderAnalytics';
import { ParsedOrder } from '@/lib/orders/types';

const isCancelled = (status?: string) => {
  if (!status) return false;
  return status.includes('İptal') || status.includes('cancel') || status.includes('reddedildi');
};

interface ProductAnalysisProps {
  filteredOrders: ParsedOrder[];
  analyses: OrderAnalysis[];
}

export function ProductAnalysis({ filteredOrders, analyses }: ProductAnalysisProps) {
  const productStats = React.useMemo(() => {
    const activeAnalyses = analyses.filter((a, idx) => !isCancelled(filteredOrders[idx]?.status) && a.unmatchedItems.length === 0);
    return aggregateProductStats(activeAnalyses);
  }, [analyses, filteredOrders]);

  const hasAnalytics = analyses.length > 0;

  if (!hasAnalytics || productStats.length === 0) {
    return (
      <div className="glass-panel p-12 text-center flex flex-col items-center justify-center text-muted-foreground gap-3">
        <BarChart3 className="h-12 w-12 opacity-20 text-primary animate-pulse" />
        <h3 className="font-semibold text-lg text-foreground">Henüz Analiz Verisi Yok</h3>
        <p className="text-sm max-w-md">
          Ürün bazlı satış analizlerini ve maliyet istatistiklerini görebilmek için öncelikle üst kısımdan sipariş dosyası yüklemeniz gerekmektedir.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-6 border-b border-border bg-card/30 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Ürün Satış İstatistikleri</h3>
      </div>
      <div className="p-6">
        <div className="space-y-2">
          {productStats.map((stat, i) => {
            const maxQty = productStats[0]?.totalQuantity ?? 1;
            const pct = (stat.totalQuantity / maxQty) * 100;
            return (
              <div key={i} className={cn('rounded-xl p-4 border transition-all', stat.matched ? 'border-border/50 bg-card/30' : 'border-red-500/20 bg-red-500/5')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{stat.productName}</p>
                      {!stat.matched && (
                        <p className="text-xs text-red-400">Menüde eşleşme bulunamadı</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-bold text-lg">{stat.totalQuantity} <span className="text-xs font-normal text-muted-foreground">adet</span></p>
                    {stat.matched && stat.totalCost > 0 && (
                      <p className="text-xs text-amber-500">{formatCurrency(stat.totalCost)} maliyet</p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', stat.matched ? 'bg-primary' : 'bg-red-400')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {productStats.some(s => !s.matched) && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Kırmızı ile işaretli ürünler menünüzde bulunamadı. Ürün adlarının prices sayfasındaki isimlerle eşleştiğinden emin olun. Gramaj yazımındaki farklılıklar (örn. "gr." yerine "g") otomatik olarak normalleştirilmiştir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
