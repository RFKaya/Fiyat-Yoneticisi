'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Upload, AlertCircle, FileJson, Info,
  LayoutList, ChevronDown, ChevronUp, FileSpreadsheet,
  TrendingUp, TrendingDown, DollarSign, Package, BarChart3,
  CheckCircle2, XCircle, Ghost, Receipt, Percent, ShieldCheck,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ParsedOrder } from '@/lib/orders/types';
import { parseOrderFile } from '@/lib/orders';
import { cn, formatCurrency } from '@/lib/utils';
import { PLATFORMS, getPlatform, type PlatformId } from '@/lib/platforms';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Product, Ingredient } from '@/lib/types';
import {
  analyzeAllOrders, aggregateProductStats,
  type OrderAnalysis, type PlatformRates, getPlatformCommission
} from '@/lib/orders/orderAnalytics';

export default function OrdersPage() {
  const [platform, setPlatform] = useState<PlatformId>('yemeksepeti');
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menu data for matching
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

  const filteredOrders = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return orders;
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const start = dateRange.start ? new Date(dateRange.start) : null;
      const end = dateRange.end ? new Date(dateRange.end) : null;
      
      if (start) {
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    });
  }, [orders, dateRange]);

  const analyses = useMemo<OrderAnalysis[]>(() => {
    if (!filteredOrders.length || !products.length) return [];
    return analyzeAllOrders(filteredOrders, products, ingredients, rates);
  }, [filteredOrders, products, ingredients, rates]);

  const productStats = useMemo(() => aggregateProductStats(analyses), [analyses]);

  const totals = useMemo(() => {
    const revenue = analyses.reduce((s, a) => s + a.revenue, 0);
    const cost = analyses.reduce((s, a) => s + a.totalCost, 0);
    const netProfit = analyses.reduce((s, a) => s + a.economics.netProfit, 0);
    const vat = analyses.reduce((s, a) => s + a.economics.vatAmount, 0);
    const commission = analyses.reduce((s, a) => s + a.economics.commissionAmount, 0);
    const stopaj = analyses.reduce((s, a) => s + a.economics.stopajAmount, 0);
    const yemekKarti = analyses.reduce((s, a) => s + a.yemekKartiDeduction, 0);
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { revenue, cost, netProfit, vat, commission, stopaj, yemekKarti, margin };
  }, [analyses]);

  const toggleExpand = (id: string) =>
    setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setError(null);
    try {
      const parsed = await parseOrderFile(file, platform);
      setOrders(prevOrders => {
        const existingOrderNumbers = new Set(prevOrders.map(o => o.orderNumber));
        const newOrders = parsed.filter(o => !existingOrderNumbers.has(o.orderNumber));
        return [...prevOrders, ...newOrders].sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
      });
      setIsUploadModalOpen(false);
    } catch {
      setError('Dosya ayrıştırılırken hata oluştu. Doğru platformu seçtiğinizden ve geçerli bir Excel dosyası olduğundan emin olun.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fmt = (d: Date) => new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(d);

  const fmtDateOnly = (d: Date) => new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d);

  const overallDateRange = useMemo(() => {
    if (orders.length === 0) return null;
    const times = orders.map(o => o.orderDate.getTime());
    return {
      min: new Date(Math.min(...times)),
      max: new Date(Math.max(...times))
    };
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
          <DialogContent className="sm:max-w-[500px] glass-panel border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                Sipariş Dosyası Yükle
              </DialogTitle>
              <DialogDescription>
                {getPlatform(platform).displayName} platformundan aldığınız Excel dosyasını yükleyin.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground ml-1">Platform Seçin</label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId)}>
                  <SelectTrigger className="w-full h-12 glass-panel border-muted">
                    <SelectValue placeholder="Platform Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className="border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 text-center border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 cursor-pointer group transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-bold">Excel Dosyası Seçin</p>
                  <p className="text-xs text-muted-foreground mt-1">Tıklayın veya sürükleyin (.xlsx, .xls)</p>
                </div>
                <Input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {getPlatform(platform).displayName} satıcı panelinden sipariş listesini Excel olarak dışa aktarın.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Date Filter & Info */}
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
            <div className="text-[11px] text-muted-foreground italic mt-2 pt-3 border-t border-border/50">
              Toplam {orders.length} siparişten <span className="text-primary font-bold">{filteredOrders.length}</span> tanesi gösteriliyor.
            </div>
          )}
        </div>

        {/* Analytics Dashboard */}
        <div className="lg:col-span-8">
          {hasAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {[
                {
                  label: 'Toplam Ciro', value: formatCurrency(totals.revenue),
                  icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
                  sub: `${filteredOrders.length} sipariş`
                },
                {
                  label: 'Toplam Gider', value: formatCurrency(totals.vat + totals.commission + totals.stopaj + totals.cost + totals.yemekKarti),
                  icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
                  details: [
                    { label: 'Ürün Maliyeti', val: totals.cost },
                    { label: 'Komisyon', val: totals.commission },
                    { label: 'KDV', val: totals.vat },
                    { label: 'Stopaj', val: totals.stopaj },
                    ...(totals.yemekKarti > 0 ? [{ label: 'Yemek Kartı', val: totals.yemekKarti }] : []),
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
              ].map(({ label, value, icon: Icon, color, bg, border, sub, details }) => (
                <div key={label} className={cn('glass-panel p-4 border flex flex-col h-full', border)}>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{label}</p>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>
                    </div>
                    <p className={cn('text-xl font-black tracking-tight', color)}>{value}</p>
                    
                    {details && (
                      <div className="mt-3 space-y-1 pt-3 border-t border-border/50">
                        {details.map((d, i) => (
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

      {error && (
        <div className="glass-panel border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm font-medium text-destructive">{error}</div>
        </div>
      )}

      {/* Orders Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-border bg-card/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Sipariş Listesi</h3>
          </div>
          {orders.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Toplam <span className="font-bold text-foreground">{orders.length}</span> sipariş
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-[950px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px] px-4 font-bold">Tarih</TableHead>
                <TableHead className="w-[140px] px-4 font-bold">Sipariş No</TableHead>
                <TableHead className="w-[120px] px-4 font-bold">Platform</TableHead>
                <TableHead className="w-[120px] px-4 font-bold">Ödeme</TableHead>
                <TableHead className="w-[120px] px-4 font-bold text-right">Ciro</TableHead>
                <TableHead className="w-[120px] px-4 font-bold text-right">Tahmini Kâr</TableHead>
                <TableHead className="w-[80px] px-4 font-bold">Durum</TableHead>
                <TableHead className="w-[60px] px-4 font-bold text-center">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <FileJson className="h-12 w-12 opacity-20" />
                      <p>{orders.length > 0 ? 'Bu tarih aralığında sipariş bulunamadı.' : 'Henüz veri yüklenmedi.'}</p>
                      <p className="text-xs">{orders.length > 0 ? 'Filtreleri temizlemeyi deneyin.' : 'Sipariş Yükle butonuna tıklayın.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, idx) => {
                  const analysis = analyses[idx];
                  const isExpanded = expandedOrderIds.includes(order.orderNumber + idx);
                  const profit = analysis?.economics.netProfit ?? 0;
                  return (
                    <React.Fragment key={order.orderNumber + idx}>
                      <TableRow className={cn('hover:bg-muted/20 transition-colors', isExpanded && 'bg-primary/5 border-b-0')}>
                        <TableCell className="text-sm text-muted-foreground px-4">{fmt(order.orderDate)}</TableCell>
                        <TableCell className="font-mono text-xs px-4">{order.orderNumber}</TableCell>
                        <TableCell className="px-4">
                          {(() => {
                            const pConfig = getPlatform(order.platform);
                            return (
                              <span 
                                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm inline-flex items-center whitespace-nowrap"
                                style={{ 
                                  backgroundColor: `${pConfig?.color ?? '#888'}15`,
                                  color: pConfig?.color ?? '#888',
                                  borderColor: `${pConfig?.color ?? '#888'}30` 
                                }}
                              >
                                {pConfig?.displayName ?? order.platform}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-4 text-xs font-medium text-muted-foreground">
                          {order.paymentMethod || '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold px-4">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell className={cn('text-right px-4 font-bold', profit >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {analysis ? formatCurrency(profit) : '-'}
                        </TableCell>
                        <TableCell className="px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {order.status || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-4">
                          <Button
                            variant="ghost" size="icon"
                            className={cn('h-8 w-8 transition-all', isExpanded ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/20 hover:text-primary')}
                            onClick={() => toggleExpand(order.orderNumber + idx)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-primary/5 hover:bg-primary/5">
                          <TableCell colSpan={8} className="p-0 border-b border-primary/10">
                            <div className="p-6 animate-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Sol Kolon: Sipariş İçeriği & Ham Veri */}
                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                      <LayoutList className="h-4 w-4" />
                                      Sipariş İçeriği
                                    </div>

                                    {analysis && analysis.matchedItems.length > 0 ? (
                                      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
                                        <table className="w-full text-sm">
                                          <thead className="bg-muted/40">
                                            <tr>
                                              <th className="text-center px-4 py-2 font-semibold text-xs w-16">Adet</th>
                                              <th className="text-left px-4 py-2 font-semibold text-xs">Ürün</th>
                                              <th className="text-right px-4 py-2 font-semibold text-xs">Birim Maliyet</th>
                                              <th className="text-right px-4 py-2 font-semibold text-xs">Toplam</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {analysis.matchedItems.map((item, i) => (
                                              <tr key={i} className="border-t border-border/30 hover:bg-muted/20">
                                                <td className="px-4 py-2 text-center font-bold text-primary">{item.quantity}</td>
                                                <td className="px-4 py-2 font-medium">{item.matchedProductName}</td>
                                                <td className="px-4 py-2 text-right text-muted-foreground text-xs">{formatCurrency(item.unitCost)}</td>
                                                <td className="px-4 py-2 text-right font-semibold text-amber-500">{formatCurrency(item.totalCost)}</td>
                                              </tr>
                                            ))}
                                            {analysis.unmatchedItems.map((item, i) => (
                                              <tr key={`u${i}`} className="border-t border-border/30 hover:bg-muted/20 opacity-60">
                                                <td className="px-4 py-2 text-center font-bold">{item.quantity}</td>
                                                <td className="px-4 py-2 font-medium text-muted-foreground italic">{item.name}</td>
                                                <td className="px-4 py-2 text-right">-</td>
                                                <td className="px-4 py-2 text-right text-red-400">
                                                  <XCircle className="h-3 w-3 inline mr-1" />
                                                  Eşleşmedi
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : order.raw?.content ? (
                                      <div className="p-4 rounded-xl bg-card border border-border/50 font-mono text-xs leading-relaxed">
                                        {order.raw.content}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center p-12 text-muted-foreground opacity-60">
                                        <Ghost className="h-10 w-10 mb-2" />
                                        <p>Bu platform için ürün detayı bulunamadı.</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Ham Veri - Artık Sipariş İçeriğinin altında */}
                                  {order.raw?.content && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                                        <FileJson className="h-3 w-3" />
                                        Ham Sipariş Verisi
                                      </div>
                                      <div className="p-3 rounded-lg bg-muted/10 border border-border/20 font-mono text-[10px] leading-relaxed break-words text-muted-foreground/60 italic">
                                        {order.raw.content}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Sağ Kolon: Finansal Veriler */}
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                    <TrendingUp className="h-4 w-4" />
                                    Finansal Analiz
                                  </div>

                                  {analysis && (
                                    <div className="space-y-3">
                                      {/* Brüt Ciro */}
                                      <div className="flex items-center justify-between p-3 rounded-xl border bg-card/50 border-border/50">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50">
                                            <DollarSign className="h-4 w-4 text-blue-500" />
                                          </div>
                                          <span className="text-sm font-medium">Brüt Ciro</span>
                                        </div>
                                        <span className="font-bold text-sm text-blue-500">{formatCurrency(analysis.revenue)}</span>
                                      </div>

                                      {/* Giderler Grubu */}
                                      <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Giderler & Kesintiler</p>
                                        </div>
                                        <div className="p-1 space-y-1">
                                          {[
                                            { label: `KDV Tutarı (%${rates.kdvRate})`, val: analysis.economics.vatAmount, icon: Receipt },
                                            { label: `${getPlatform(order.platform)?.displayName ?? order.platform} Komisyonu (%${getPlatformCommission(order.platform, rates)})`, val: analysis.economics.commissionAmount, icon: Percent },
                                            { label: `Stopaj Vergisi (%${rates.stopajRate})`, val: analysis.economics.stopajAmount, icon: ShieldCheck },
                                            { label: 'Ürün Maliyetleri', val: analysis.totalCost, icon: Package, color: 'text-amber-500' },
                                            ...(analysis.isYemekKarti ? [{ label: 'Yemek Kartı Kesintisi (%10)', val: analysis.yemekKartiDeduction, icon: Receipt, color: 'text-orange-500' }] : []),
                                          ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                              <div className="flex items-center gap-2.5">
                                                <item.icon className={cn("h-3.5 w-3.5", item.color || "text-muted-foreground")} />
                                                <span className="text-xs text-muted-foreground">{item.label}</span>
                                              </div>
                                              <span className="text-xs font-semibold text-muted-foreground">- {formatCurrency(item.val)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Tahmini Kâr */}
                                      <div className="flex items-center justify-between p-4 rounded-xl border bg-primary/10 border-primary/20 shadow-sm">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/20">
                                            {analysis.economics.netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-primary" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                                          </div>
                                          <span className="font-bold text-primary">Tahmini Kâr</span>
                                        </div>
                                        <span className={cn("text-lg font-black", analysis.economics.netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                                          {formatCurrency(analysis.economics.netProfit)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Product Sales Stats */}
      {hasAnalytics && productStats.length > 0 && (
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
      )}
    </main>
  );
}
