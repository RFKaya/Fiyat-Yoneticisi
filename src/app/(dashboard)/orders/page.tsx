'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Upload, AlertCircle, FileSpreadsheet,
  TrendingUp, TrendingDown, DollarSign, Package, BarChart3,
  CheckCircle2, XCircle, Calendar, Loader2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ParsedOrder } from '@/lib/orders/types';
import { parseOrderFile } from '@/lib/orders';
import { cn, formatCurrency } from '@/lib/utils';
import { PLATFORMS, getPlatform, type PlatformId } from '@/lib/platforms';
import type { Product, Ingredient } from '@/lib/types';
import {
  analyzeAllOrders,
  type OrderAnalysis, type PlatformRates
} from '@/lib/orders/orderAnalytics';

import { OrderList } from '@/components/orders/OrderList';
import { ProductAnalysis } from '@/components/orders/ProductAnalysis';
import { LedgerComparison } from '@/components/orders/LedgerComparison';
import { PeakHoursAnalysis } from '@/components/orders/PeakHoursAnalysis';

const isCancelled = (status?: string) => {
  if (!status) return false;
  return status.includes('İptal') || status.includes('cancel') || status.includes('reddedildi');
};

interface UploadingFile {
  id: string;
  name: string;
  status: 'parsing' | 'success' | 'error';
  platform?: PlatformId;
  orderCount?: number;
  errorMsg?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'comparison' | 'peak-hours'>('list');
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('1');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [rates, setRates] = useState<PlatformRates>({
    yemeksepetiCommission: 15,
    trendyolCommission: 15,
    migrosCommission: 15,
    getirCommission: 15,
    kdvRate: 10,
    stopajRate: 1,
  });

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(data => {
        setProducts(data.products ?? []);
        setIngredients(data.ingredients ?? []);
        setRates({
          yemeksepetiCommission: data.yemeksepetiCommission ?? 15,
          trendyolCommission: data.trendyolCommission ?? 15,
          migrosCommission: data.migrosCommission ?? 15,
          getirCommission: data.getirCommission ?? 15,
          kdvRate: data.kdvRate ?? 10,
          stopajRate: data.stopajRate ?? 1,
        });
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch('/api/shops')
      .then(res => res.json())
      .then(data => {
        setShops(data || []);
        const lastShopId = typeof window !== 'undefined' ? localStorage.getItem('lastSelectedShopId') || '1' : '1';
        setSelectedShopId(lastShopId);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!selectedShopId) return;
    setIsLedgerLoading(true);
    fetch(`/api/ledger?shop=${selectedShopId}`)
      .then(res => res.json())
      .then(data => {
        setLedgerData(data || null);
        setIsLedgerLoading(false);
      })
      .catch(() => { setIsLedgerLoading(false); });
  }, [selectedShopId]);

  const filteredOrders = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return orders;
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const parseLocalDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
      };
      const start = dateRange.start ? parseLocalDate(dateRange.start) : null;
      const end = dateRange.end ? parseLocalDate(dateRange.end) : null;
      if (start) { start.setHours(0, 0, 0, 0); if (orderDate < start) return false; }
      if (end) { end.setHours(23, 59, 59, 999); if (orderDate > end) return false; }
      return true;
    });
  }, [orders, dateRange]);

  const analyses = useMemo<OrderAnalysis[]>(() => {
    if (!filteredOrders.length || !products.length) return [];
    return analyzeAllOrders(filteredOrders, products, ingredients, rates);
  }, [filteredOrders, products, ingredients, rates]);

  const totals = useMemo(() => {
    const activeAnalyses = analyses.filter((a, idx) => !isCancelled(filteredOrders[idx]?.status) && a.unmatchedItems.length === 0);
    const cancelledAnalyses = analyses.filter((_, idx) => isCancelled(filteredOrders[idx]?.status));

    const revenue = activeAnalyses.reduce((s, a) => s + a.revenue, 0);
    const netRevenueTotal = activeAnalyses.reduce((s, a) => s + a.netRevenue, 0);
    const cancelledRevenue = cancelledAnalyses.reduce((s, a) => s + a.revenue, 0);
    const cost = activeAnalyses.reduce((s, a) => s + a.totalCost, 0);
    const netProfit = activeAnalyses.reduce((s, a) => s + a.economics.netProfit, 0);
    const vat = activeAnalyses.reduce((s, a) => s + a.economics.vatAmount, 0);
    const commission = activeAnalyses.reduce((s, a) => s + a.economics.commissionAmount, 0);
    const stopaj = activeAnalyses.reduce((s, a) => s + a.economics.stopajAmount, 0);
    const yemekKarti = activeAnalyses.reduce((s, a) => s + a.yemekKartiDeduction, 0);
    const yemekKartiRevenue = activeAnalyses.filter(a => a.isYemekKarti).reduce((s, a) => s + a.revenue, 0);
    const couponDiscount = activeAnalyses.reduce((s, a) => s + a.couponDiscount, 0);
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const activeOrderCount = activeAnalyses.length;
    const cancelledOrderCount = cancelledAnalyses.length;

    return {
      revenue, netRevenueTotal, cancelledRevenue, cost, netProfit,
      vat, commission, stopaj, yemekKarti, yemekKartiRevenue, couponDiscount,
      margin, activeOrderCount, cancelledOrderCount
    };
  }, [analyses, filteredOrders]);

  const comparisonRange = useMemo(() => {
    let startStr = dateRange.start || null;
    let endStr = dateRange.end || null;
    if (!startStr && !endStr && filteredOrders.length > 0) {
      const times = filteredOrders.map(o => new Date(o.orderDate).getTime());
      const minDate = new Date(Math.min(...times));
      const maxDate = new Date(Math.max(...times));
      startStr = minDate.toLocaleDateString('sv-SE');
      endStr = maxDate.toLocaleDateString('sv-SE');
    }
    return { start: startStr, end: endStr };
  }, [filteredOrders, dateRange]);

  const handleFiles = async (files: File[]) => {
    setIsParsing(true);
    setError(null);
    const newUploadingFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'parsing' as const,
    }));
    setUploadingFiles(prev => [...newUploadingFiles, ...prev]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = newUploadingFiles[i].id;
      try {
        const { orders: parsedOrders, platform: detectedPlatform } = await parseOrderFile(file, 'auto');
        setOrders(prevOrders => {
          const existingOrderNumbers = new Set(prevOrders.map(o => o.orderNumber));
          const newOrders = parsedOrders.filter(o => !existingOrderNumbers.has(o.orderNumber));
          return [...prevOrders, ...newOrders].sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
        });
        setUploadingFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, status: 'success', platform: detectedPlatform, orderCount: parsedOrders.length } : f)
        );
      } catch (err: any) {
        const errMsg = err.message || 'Dosya ayrıştırılamadı.';
        setUploadingFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMsg: errMsg } : f)
        );
      }
    }
    setIsParsing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const fmtDateOnly = (d: Date) => new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d);

  const overallDateRange = useMemo(() => {
    if (orders.length === 0) return null;
    const times = orders.map(o => o.orderDate.getTime());
    return { min: new Date(Math.min(...times)), max: new Date(Math.max(...times)) };
  }, [orders]);

  const hasAnalytics = analyses.length > 0;

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Sipariş Yönetimi</h2>
          <p className="text-muted-foreground mt-1">Platformlardan dışa aktarılan siparişleri analiz edin.</p>
        </div>
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogTrigger asChild>
            <Button className="relative overflow-hidden group shadow-lg shadow-primary/20" disabled={isParsing}>
              <Upload className="mr-2 h-4 w-4" />
              {isParsing ? 'Ayrıştırılıyor...' : 'Sipariş Yükle'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] glass-panel border-none shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
            <DialogHeader className="p-6 pb-2 shrink-0">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                Sipariş Dosyası Yükle
              </DialogTitle>
              <DialogDescription>
                Excel dosyalarınızı sürükleyip bırakın. Sistem platformu otomatik tespit edecektir.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 pt-2 space-y-6 overflow-y-auto flex-1">
              {/* Desteklenen Platformlar */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground font-semibold mr-1">Desteklenen Platformlar:</span>
                {PLATFORMS.map(p => (
                  <span
                    key={p.id}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm"
                    style={{
                      backgroundColor: `${p.color}15`,
                      color: p.color,
                      borderColor: `${p.color}30`
                    }}
                  >
                    {p.displayName}
                  </span>
                ))}
              </div>

              {/* Sürükle Bırak Alanı */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-4 text-center cursor-pointer transition-all duration-300 relative group",
                  isDragActive
                    ? "border-primary bg-primary/10 scale-[0.98] ring-2 ring-primary/20"
                    : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                )}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-all duration-300",
                  isDragActive ? "scale-110 rotate-12 bg-primary/20" : "group-hover:scale-110"
                )}>
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-sm">Excel Dosyalarını Buraya Bırakın</p>
                  <p className="text-xs text-muted-foreground mt-1">Birden fazla dosya seçebilir veya sürükleyebilirsiniz (.xlsx, .xls)</p>
                </div>
                <Input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) handleFiles(Array.from(e.target.files));
                  }}
                />
              </div>

              {/* Yüklenen Dosyaların Durumu */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Yükleme Geçmişi / Durum</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadingFiles([])}
                      className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Listeyi Temizle
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {uploadingFiles.map((file) => {
                      const pConfig = file.platform ? getPlatform(file.platform) : null;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/30 text-xs animate-in slide-in-from-top-1 duration-200"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                            {file.status === 'parsing' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                            {file.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                            {file.status === 'error' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate text-foreground/90">{file.name}</p>
                              {file.status === 'success' && file.platform && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                  Algılanan:
                                  <span
                                    className="font-bold px-1.5 py-0.2 rounded border text-[9px]"
                                    style={{
                                      backgroundColor: `${pConfig?.color ?? '#888'}10`,
                                      color: pConfig?.color ?? '#888',
                                      borderColor: `${pConfig?.color ?? '#888'}20`
                                    }}
                                  >
                                    {pConfig?.displayName ?? file.platform}
                                  </span>
                                </p>
                              )}
                              {file.status === 'error' && (
                                <p className="text-[10px] text-red-400 mt-0.5 truncate">{file.errorMsg}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {file.status === 'parsing' && <span className="text-muted-foreground animate-pulse">Analiz ediliyor...</span>}
                            {file.status === 'success' && <span className="font-bold text-emerald-500">+{file.orderCount} Sipariş</span>}
                            {file.status === 'error' && <span className="font-semibold text-red-400">Hata</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarih Filtresi ve Toplam Satış Tutarı (Tab dışında sabit) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Date Filter */}
        <div className="lg:col-span-4 flex flex-col gap-4 glass-panel p-5 rounded-2xl border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary w-fit">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-bold">Tarih Filtresi</span>
            </div>
            {overallDateRange && (
              <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/50">
                {fmtDateOnly(overallDateRange.min)} - {fmtDateOnly(overallDateRange.max)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 ml-1">Başlangıç</p>
                <div className="relative cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                  <Input
                    type="date"
                    className="w-full h-10 bg-background/50 border-muted focus:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden select-none caret-transparent pointer-events-none"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    onKeyDown={(e) => e.preventDefault()}
                  />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 ml-1">Bitiş</p>
                <div className="relative cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                  <Input
                    type="date"
                    className="w-full h-10 bg-background/50 border-muted focus:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden select-none caret-transparent pointer-events-none"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    onKeyDown={(e) => e.preventDefault()}
                  />
                </div>
              </div>
            </div>
            {(dateRange.start || dateRange.end) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange({ start: '', end: '' })}
                className="h-9 w-full text-xs hover:bg-destructive/10 hover:text-destructive transition-colors border border-dashed border-destructive/20"
              >
                Filtreyi Sıfırla
              </Button>
            )}
          </div>
          {orders.length > 0 && (
            <div className="text-[11px] text-muted-foreground italic mt-2 pt-3 border-t border-border/50 space-y-1">
              <div>
                Toplam {orders.length} siparişten <span className="text-primary font-bold">{filteredOrders.length}</span> tanesi gösteriliyor.
              </div>
              {hasAnalytics && (
                <div>
                  Hesaplamaya <span className="text-emerald-500 font-bold">{totals.activeOrderCount}</span> tanesi dahil ediliyor.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analytics Dashboard */}
        <div className="lg:col-span-8">
          {hasAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {[
                {
                  label: 'Toplam Satış Tutarı', value: formatCurrency(totals.netRevenueTotal),
                  subValue: totals.yemekKartiRevenue > 0 ? `(Y. Kartı: ${formatCurrency(totals.yemekKartiRevenue)})` : undefined,
                  icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
                  sub: `${totals.activeOrderCount} aktif, ${totals.cancelledOrderCount} iptal`,
                  details: [
                    { label: 'Brüt (İndirimsiz)', val: totals.revenue },
                    { label: 'İptal Edilen', val: totals.cancelledRevenue, color: 'text-red-400' },
                  ]
                },
                {
                  label: 'Toplam Gider', value: formatCurrency(totals.vat + totals.commission + totals.stopaj + totals.cost + totals.yemekKarti),
                  icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
                  details: [
                    { label: 'Ürün Maliyeti', val: totals.cost },
                    { label: 'Komisyon', val: totals.commission },
                    { label: 'KDV', val: totals.vat },
                    { label: 'Stopaj', val: totals.stopaj },
                    ...(totals.yemekKarti > 0 ? [{ label: 'Yemek Kartı Kesintisi', val: totals.yemekKarti }] : []),
                  ]
                },
                {
                  label: 'Tahmini Kâr', value: formatCurrency(totals.netProfit),
                  icon: totals.netProfit >= 0 ? TrendingUp : TrendingDown,
                  color: totals.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
                  bg: totals.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
                  border: totals.netProfit >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
                  sub: `Kâr Marjı: %${totals.margin.toFixed(1)}`
                }
              ].map(({ label, value, subValue, icon: Icon, color, bg, border, sub, details }: any) => (
                <div key={label} className={cn('glass-panel p-4 border flex flex-col h-full', border)}>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{label}</p>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className={cn('text-xl font-black tracking-tight', color)}>{value}</p>
                      {subValue && <span className="text-[10px] text-muted-foreground italic font-medium">{subValue}</span>}
                    </div>
                    {details && (
                      <div className="mt-3 space-y-1 pt-3 border-t border-border/50">
                        {details.map((d: { label: string; val: number; color?: string }, i: number) => (
                          <div key={i} className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">{d.label}</span>
                            <span className="font-medium">{formatCurrency(d.val)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {sub && <p className="text-[10px] text-muted-foreground mt-2 truncate opacity-70 italic">{sub}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center glass-panel border-dashed border-2 opacity-50 bg-muted/5">
              <BarChart3 className="h-10 w-10 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Veri Bekleniyor...</p>
            </div>
          )}
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex flex-wrap items-center gap-2 bg-card/30 p-1 rounded-xl w-fit max-w-full border border-border/50">
        <Button
          variant={activeTab === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('list')}
          className={cn("font-bold text-xs gap-2 rounded-lg transition-all", activeTab === 'list' ? "shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <ShoppingBag className="h-4 w-4" />
          Sipariş Listesi
        </Button>
        <Button
          variant={activeTab === 'stats' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('stats')}
          className={cn("font-bold text-xs gap-2 rounded-lg transition-all", activeTab === 'stats' ? "shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <BarChart3 className="h-4 w-4" />
          Ürün Analizi
        </Button>
        <Button
          variant={activeTab === 'comparison' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('comparison')}
          className={cn("font-bold text-xs gap-2 rounded-lg transition-all", activeTab === 'comparison' ? "shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Defter Kıyaslama
        </Button>
        <Button
          variant={activeTab === 'peak-hours' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('peak-hours')}
          className={cn("font-bold text-xs gap-2 rounded-lg transition-all", activeTab === 'peak-hours' ? "shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <Clock className="h-4 w-4" />
          Yoğun Saatler
        </Button>
      </div>

      {error && (
        <div className="glass-panel border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm font-medium text-destructive">{error}</div>
        </div>
      )}

      {/* Tab İçerikleri */}
      {activeTab === 'list' && (
        <OrderList
          orders={orders}
          filteredOrders={filteredOrders}
          analyses={analyses}
          rates={rates}
        />
      )}

      {activeTab === 'stats' && (
        <ProductAnalysis
          filteredOrders={filteredOrders}
          analyses={analyses}
        />
      )}

      {activeTab === 'comparison' && (
        <LedgerComparison
          filteredOrders={filteredOrders}
          analyses={analyses}
          ledgerData={ledgerData}
          isLedgerLoading={isLedgerLoading}
          comparisonRange={comparisonRange}
          shops={shops}
          selectedShopId={selectedShopId}
          onShopChange={(id) => setSelectedShopId(id)}
        />
      )}

      {activeTab === 'peak-hours' && (
        <PeakHoursAnalysis
          filteredOrders={filteredOrders}
          analyses={analyses}
        />
      )}
    </main>
  );
}
