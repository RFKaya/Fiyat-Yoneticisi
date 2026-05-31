'use client';

import React from 'react';
import {
  FileSpreadsheet, AlertCircle, CheckCircle2, Calendar, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedOrder } from '@/lib/orders/types';
import { cn, formatCurrency } from '@/lib/utils';
import { getPlatform, type PlatformId } from '@/lib/platforms';
import type { OrderAnalysis } from '@/lib/orders/orderAnalytics';

const isCancelled = (status?: string) => {
  if (!status) return false;
  return status.includes('İptal') || status.includes('cancel') || status.includes('reddedildi');
};

interface LedgerComparisonProps {
  filteredOrders: ParsedOrder[];
  analyses: OrderAnalysis[];
  ledgerData: any;
  isLedgerLoading: boolean;
  comparisonRange: { start: string | null; end: string | null };
  shops: { id: string; name: string }[];
  selectedShopId: string;
  onShopChange: (id: string) => void;
}

export function LedgerComparison({
  filteredOrders,
  analyses,
  ledgerData,
  isLedgerLoading,
  comparisonRange,
  shops,
  selectedShopId,
  onShopChange,
}: LedgerComparisonProps) {

  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Record<PlatformId, boolean>>({
    yemeksepeti: true,
    trendyol: true,
    migros: true,
    getir: true,
  });

  const [onlyShowMismatches, setOnlyShowMismatches] = React.useState<boolean>(false);

  const uploadedPlatformIds = React.useMemo(() => {
    const ids = new Set<PlatformId>();
    filteredOrders.forEach(o => ids.add(o.platform));
    return ids;
  }, [filteredOrders]);

  React.useEffect(() => {
    if (uploadedPlatformIds.size > 0) {
      setSelectedPlatforms({
        yemeksepeti: uploadedPlatformIds.has('yemeksepeti'),
        trendyol: uploadedPlatformIds.has('trendyol'),
        migros: uploadedPlatformIds.has('migros'),
        getir: uploadedPlatformIds.has('getir'),
      });
    } else {
      setSelectedPlatforms({
        yemeksepeti: true,
        trendyol: true,
        migros: true,
        getir: true,
      });
    }
  }, [uploadedPlatformIds]);

  const comparisonData = React.useMemo(() => {
    const fileGroups: Record<string, Record<PlatformId, { count: number; grossRev: number; netRev: number }>> = {};

    filteredOrders.forEach((order, idx) => {
      const dateStr = new Date(order.orderDate).toLocaleDateString('sv-SE');
      const p = order.platform;
      const isOrderCancelled = isCancelled(order.status);

      if (!fileGroups[dateStr]) {
        fileGroups[dateStr] = {
          yemeksepeti: { count: 0, grossRev: 0, netRev: 0 },
          trendyol: { count: 0, grossRev: 0, netRev: 0 },
          migros: { count: 0, grossRev: 0, netRev: 0 },
          getir: { count: 0, grossRev: 0, netRev: 0 },
        };
      }

      if (!isOrderCancelled) {
        fileGroups[dateStr][p].count += 1;
        fileGroups[dateStr][p].grossRev += order.totalAmount;
        const analysis = analyses[idx];
        fileGroups[dateStr][p].netRev += analysis ? analysis.netRevenue : order.totalAmount;
      }
    });

    const ledgerGroups: Record<string, Record<string, { count: number; rev: number }>> = {};
    if (ledgerData && ledgerData.months) {
      Object.entries(ledgerData.months).forEach(([monthKey, monthData]: [string, any]) => {
        if (monthData.days && Array.isArray(monthData.days)) {
          monthData.days.forEach((day: any) => {
            const dateStr = day.date;
            ledgerGroups[dateStr] = {
              yemeksepeti: {
                count: parseInt(day.platforms?.yemeksepeti?.count) || 0,
                rev: parseFloat(day.platforms?.yemeksepeti?.rev) || 0,
              },
              trendyol: {
                count: parseInt(day.platforms?.trendyol?.count) || 0,
                rev: parseFloat(day.platforms?.trendyol?.rev) || 0,
              },
              migros: {
                count: parseInt(day.platforms?.migros?.count) || 0,
                rev: parseFloat(day.platforms?.migros?.rev) || 0,
              },
              getir: {
                count: parseInt(day.platforms?.getir?.count) || 0,
                rev: parseFloat(day.platforms?.getir?.rev) || 0,
              },
            };
          });
        }
      });
    }

    const allDates = new Set([...Object.keys(fileGroups), ...Object.keys(ledgerGroups)]);
    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

    const rows: {
      date: string;
      platform: PlatformId;
      fileCount: number;
      ledgerCount: number;
      fileGrossRev: number;
      fileNetRev: number;
      ledgerRev: number;
      countMatches: boolean;
      revMatches: boolean;
    }[] = [];

    const rangeStart = comparisonRange.start;
    const rangeEnd = comparisonRange.end;

    sortedDates.forEach(dateStr => {
      if (rangeStart && dateStr < rangeStart) return;
      if (rangeEnd && dateStr > rangeEnd) return;

      const fileDay = fileGroups[dateStr];
      const ledgerDay = ledgerGroups[dateStr];

      (['yemeksepeti', 'trendyol', 'migros', 'getir'] as PlatformId[]).forEach(p => {
        if (!selectedPlatforms[p]) return;

        const fileCount = fileDay ? fileDay[p].count : 0;
        const fileGrossRev = fileDay ? fileDay[p].grossRev : 0;
        const fileNetRev = fileDay ? fileDay[p].netRev : 0;
        const ledgerCount = ledgerDay ? ledgerDay[p].count : 0;
        const ledgerRev = ledgerDay ? ledgerDay[p].rev : 0;

        const countMatches = fileCount === ledgerCount;
        const revMatches = Math.abs(fileGrossRev - ledgerRev) < 1.5 || Math.abs(fileNetRev - ledgerRev) < 1.5;

        rows.push({ date: dateStr, platform: p, fileCount, ledgerCount, fileGrossRev, fileNetRev, ledgerRev, countMatches, revMatches });
      });
    });

    return rows;
  }, [filteredOrders, analyses, ledgerData, comparisonRange, selectedPlatforms]);

  const groupedComparisonData = React.useMemo(() => {
    const groups: Record<string, typeof comparisonData> = {};
    comparisonData.forEach(row => {
      if (!groups[row.date]) groups[row.date] = [];
      groups[row.date].push(row);
    });
    
    let mapped = Object.entries(groups).map(([date, rows]) => ({
      date,
      rows,
      hasMismatch: rows.some(r => !r.countMatches || !r.revMatches)
    }));

    if (onlyShowMismatches) {
      mapped = mapped.filter(g => g.hasMismatch);
    }

    return mapped.sort((a, b) => b.date.localeCompare(a.date));
  }, [comparisonData, onlyShowMismatches]);

  const mismatchCount = React.useMemo(() => {
    const groups: Record<string, typeof comparisonData> = {};
    comparisonData.forEach(row => {
      if (!groups[row.date]) groups[row.date] = [];
      groups[row.date].push(row);
    });
    return Object.values(groups).filter(rows => rows.some(r => !r.countMatches || !r.revMatches)).length;
  }, [comparisonData]);

  const fmtDateStr = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr + 'T00:00:00');
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit', month: 'long', year: 'numeric', weekday: 'long'
      }).format(dateObj);
    } catch { }
    return dateStr;
  };

  return (
    <div className="glass-panel overflow-hidden space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Hesap Defteri Karşılaştırması
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Yüklenen sipariş dosyaları (Excel) ile Hesap Defteri'ne kaydedilen günlük verileri kıyaslayarak denetleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Karşılaştırılacak İşyeri:</span>
            {shops.length > 0 ? (
              <Select value={selectedShopId} onValueChange={(val) => {
                onShopChange(val);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('lastSelectedShopId', val);
                }
              }}>
                <SelectTrigger className="w-[180px] bg-background/50 h-9">
                  <SelectValue placeholder="İşyeri Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground">Yükleniyor...</span>
            )}
          </div>
        </div>
      </div>

      {/* Platform Filtreleme Alanı */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-card/10 border border-border/40">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Platform Filtresi:</span>
          {(['yemeksepeti', 'trendyol', 'migros', 'getir'] as PlatformId[]).map(p => {
            const pConfig = getPlatform(p);
            const isUploaded = uploadedPlatformIds.has(p);
            const isSelected = selectedPlatforms[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPlatforms(prev => ({ ...prev, [p]: !prev[p] }))}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border shadow-sm transition-all flex items-center gap-2 font-semibold",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 text-muted-foreground border-border hover:bg-background/80"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isSelected
                      ? '#fff'
                      : (pConfig?.color ?? '#888')
                  }}
                />
                {pConfig?.displayName ?? p}
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-normal leading-none border",
                  isUploaded
                    ? isSelected ? "bg-white/20 text-white border-white/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : isSelected ? "bg-white/10 text-white/80 border-white/10" : "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20"
                )}>
                  {isUploaded ? 'Dosya Yüklü' : 'Dosya Yok'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={onlyShowMismatches ? "destructive" : "outline"}
            size="sm"
            className={cn("text-xs h-8 gap-1.5 font-bold transition-all", onlyShowMismatches && "shadow-md shadow-destructive/10")}
            onClick={() => setOnlyShowMismatches(prev => !prev)}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Sadece Uyuşmayanlar ({mismatchCount} Gün)
          </Button>
        </div>
      </div>

      {isLedgerLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Hesap defteri verileri yükleniyor...</p>
        </div>
      ) : comparisonData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3 text-center p-6">
          <FileSpreadsheet className="h-12 w-12 opacity-20 text-primary" />
          <p className="font-semibold text-foreground">Karşılaştırılacak Veri Bulunamadı</p>
          <p className="text-xs max-w-md">
            Seçilen tarih aralığında yüklenmiş aktif sipariş dosyası veya seçilen işyerine ait hesap defteri kaydı bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedComparisonData.map((dayGroup) => (
            <div
              key={dayGroup.date}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden bg-card/25 shadow-sm",
                dayGroup.hasMismatch
                  ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                  : "border-border/50 hover:border-primary/20 hover:bg-card/40"
              )}
            >
              {/* Gün Başlığı */}
              <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Calendar className={cn("h-5 w-5", dayGroup.hasMismatch ? "text-destructive" : "text-primary")} />
                  <h4 className="font-bold text-foreground text-sm sm:text-base">{fmtDateStr(dayGroup.date)}</h4>
                </div>
                <div>
                  {dayGroup.hasMismatch ? (
                    <span className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-1.5 w-fit">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Veri Uyuşmazlığı Var
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5 w-fit">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tüm Platformlar Uyumlu
                    </span>
                  )}
                </div>
              </div>

              {/* Platform Karşılaştırma Tablosu */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/10 border-b border-border/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 w-[150px]">Platform</th>
                      <th className="px-4 sm:px-6 py-3 text-center w-[220px]">Sipariş Adeti (Dosya / Defter)</th>
                      <th className="px-4 sm:px-6 py-3 text-right w-[320px]">Ciro (Dosya Net-Brüt / Defter)</th>
                      <th className="px-4 sm:px-6 py-3 text-center w-[160px]">Adet Durumu</th>
                      <th className="px-4 sm:px-6 py-3 text-center w-[160px]">Ciro Durumu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {dayGroup.rows.map((row, rowIdx) => {
                      const pConfig = getPlatform(row.platform);
                      const countDiff = row.fileCount - row.ledgerCount;
                      const chosenFileRev = Math.abs(row.fileGrossRev - row.ledgerRev) < Math.abs(row.fileNetRev - row.ledgerRev)
                        ? row.fileGrossRev
                        : row.fileNetRev;
                      const revDiff = chosenFileRev - row.ledgerRev;

                      return (
                        <tr key={rowIdx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5 font-medium whitespace-nowrap">
                            <span
                              className="text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm inline-flex items-center"
                              style={{
                                backgroundColor: `${pConfig?.color ?? '#888'}15`,
                                color: pConfig?.color ?? '#888',
                                borderColor: `${pConfig?.color ?? '#888'}30`
                              }}
                            >
                              {pConfig?.displayName ?? row.platform}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center font-mono text-xs">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-bold text-foreground">{row.fileCount}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-muted-foreground">{row.ledgerCount}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right font-mono text-xs">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-bold text-foreground" title="Dosya Net Ciro">{formatCurrency(row.fileNetRev)}</span>
                              {row.fileGrossRev !== row.fileNetRev && (
                                <span className="text-[10px] text-muted-foreground font-normal" title="Dosya Brüt Ciro">
                                  (Brüt: {formatCurrency(row.fileGrossRev)})
                                </span>
                              )}
                              <span className="text-muted-foreground">/</span>
                              <span className="text-muted-foreground" title="Hesap Defteri">{formatCurrency(row.ledgerRev)}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center text-xs">
                            {row.countMatches ? (
                              <span className="text-emerald-500 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Uyumlu
                              </span>
                            ) : (
                              <span className="text-red-500 font-bold inline-flex items-center gap-1" title={`Fark: ${countDiff}`}>
                                <AlertCircle className="h-3.5 w-3.5" /> Fark ({countDiff > 0 ? `+${countDiff}` : countDiff})
                              </span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center text-xs">
                            {row.revMatches ? (
                              <span className="text-emerald-500 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Uyumlu
                              </span>
                            ) : (
                              <span className="text-red-500 font-bold inline-flex items-center gap-1" title={`Fark: ${formatCurrency(revDiff)}`}>
                                <AlertCircle className="h-3.5 w-3.5" /> Fark ({revDiff > 0 ? `+${revDiff.toFixed(0)} TL` : `${revDiff.toFixed(0)} TL`})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="text-[11px] text-muted-foreground italic bg-muted/20 p-3 rounded-xl border border-border/50">
            💡 <strong>Not:</strong> Karşılaştırmada yüklenen Excel dosyalarındaki iptal edilmemiş (aktif) siparişlerin sayıları ve ciroları kullanılır.
            Sistem; dosyadaki Net ciro (kuponlar düşülmüş) veya Brüt cirodan herhangi biri hesap defterine yazılan tutar ile uyuşuyorsa (1.5 TL yuvarlama toleransı ile) ciro durumunu
            <span className="text-emerald-500 font-semibold ml-1">Uyumlu</span> kabul eder.
          </div>
        </div>
      )}
    </div>
  );
}
