'use client';

import React, { useState } from 'react';
import {
  ShoppingBag, FileJson, LayoutList, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, DollarSign, Package,
  CheckCircle2, XCircle, Ghost, Receipt, Percent, ShieldCheck, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ParsedOrder } from '@/lib/orders/types';
import { cn, formatCurrency } from '@/lib/utils';
import { getPlatform } from '@/lib/platforms';
import type { OrderAnalysis, PlatformRates } from '@/lib/orders/orderAnalytics';
import { getPlatformCommission } from '@/lib/orders/orderAnalytics';

const isCancelled = (status?: string) => {
  if (!status) return false;
  return status.includes('İptal') || status.includes('cancel') || status.includes('reddedildi');
};

interface OrderListProps {
  orders: ParsedOrder[];
  filteredOrders: ParsedOrder[];
  analyses: OrderAnalysis[];
  rates: PlatformRates;
}

export function OrderList({ orders, filteredOrders, analyses, rates }: OrderListProps) {
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);

  const toggleExpand = (id: string) =>
    setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const fmt = (d: Date) => new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(d);

  return (
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
              <TableHead className="w-[120px] px-4 font-bold text-right">Tutar</TableHead>
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
                const hasUnmatched = analysis && analysis.unmatchedItems.length > 0;
                return (
                  <React.Fragment key={order.orderNumber + idx}>
                    <TableRow className={cn(
                      'hover:bg-muted/20 transition-colors',
                      isExpanded && 'bg-primary/5 border-b-0',
                      isCancelled(order.status) && 'opacity-40 grayscale-[0.3]'
                    )}>
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
                      <TableCell className="text-right font-bold px-4">{formatCurrency(analysis?.netRevenue ?? order.totalAmount)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right px-4 font-bold',
                          hasUnmatched
                            ? 'text-amber-500'
                            : profit >= 0 ? 'text-emerald-500' : 'text-red-500'
                        )}
                        title={hasUnmatched ? "Eşleşmeyen ürün bulunduğundan kâr hesaplanamadı" : undefined}
                      >
                        {analysis ? (hasUnmatched ? '?' : formatCurrency(profit)) : '-'}
                      </TableCell>
                      <TableCell className="px-4">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          isCancelled(order.status)
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        )}>
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

                                  {analysis && (analysis.matchedItems.length > 0 || analysis.unmatchedItems.length > 0) ? (
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

                                {/* Ham Veri */}
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
                                        <div>
                                          <span className="text-sm font-medium block">Satış Tutarı</span>
                                          {analysis.revenue !== analysis.netRevenue && (
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                              <span className="text-[10px] text-muted-foreground italic leading-none">
                                                Brüt: {formatCurrency(analysis.revenue)}
                                              </span>
                                              {analysis.couponDiscount > 0 && (
                                                <span className="text-[10px] text-muted-foreground italic leading-none">
                                                  Kupon: -{formatCurrency(analysis.couponDiscount)}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-bold text-sm text-blue-500">{formatCurrency(analysis.netRevenue)}</span>
                                    </div>

                                    {/* Giderler Grubu */}
                                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                                      <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Giderler & Kesintiler</p>
                                      </div>
                                      <div className="p-1 space-y-1">
                                        {[
                                          { label: 'KDV Tutarı', subLabel: `(%${rates.kdvRate})`, val: analysis.economics.vatAmount, icon: Receipt },
                                          {
                                            label: `${getPlatform(order.platform)?.displayName ?? order.platform} Komisyonu`,
                                            subLabel: `(%${analysis.actualCommissionRate.toFixed(1)})`,
                                            isItalic: analysis.isCommissionOverridden,
                                            val: analysis.economics.commissionAmount,
                                            icon: Percent
                                          },
                                          { label: 'Stopaj Vergisi', subLabel: `(%${rates.stopajRate})`, val: analysis.economics.stopajAmount, icon: ShieldCheck },
                                          { label: 'Ürün Maliyetleri', val: analysis.totalCost, icon: Package, color: 'text-amber-500', isUnknown: hasUnmatched },
                                          ...(analysis.isYemekKarti ? [{ label: 'Yemek Kartı Kesintisi', subLabel: '(%10)', val: analysis.yemekKartiDeduction, icon: Receipt, color: 'text-orange-500' }] : []),
                                        ].map((item, i) => (
                                          <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                              <item.icon className={cn("h-3.5 w-3.5", (item as any).color || "text-muted-foreground")} />
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">{item.label}</span>
                                                {(item as any).subLabel && (
                                                  <span className={cn("text-[10px] text-muted-foreground/60", (item as any).isItalic && "italic font-bold")}>
                                                    {(item as any).subLabel}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground">
                                              - {(item as any).isUnknown ? '?' : formatCurrency(item.val)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Tahmini Kâr */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border bg-primary/10 border-primary/20 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/20">
                                          {hasUnmatched ? (
                                            <Info className="h-5 w-5 text-amber-500" />
                                          ) : analysis.economics.netProfit >= 0 ? (
                                            <TrendingUp className="h-5 w-5 text-primary" />
                                          ) : (
                                            <TrendingDown className="h-5 w-5 text-red-500" />
                                          )}
                                        </div>
                                        <span className="font-bold text-primary">Tahmini Kâr</span>
                                      </div>
                                      <span
                                        className={cn(
                                          "text-lg font-black",
                                          hasUnmatched
                                            ? "text-amber-500"
                                            : analysis.economics.netProfit >= 0 ? "text-emerald-500" : "text-red-500"
                                        )}
                                        title={hasUnmatched ? "Eşleşmeyen ürün bulunduğundan kâr hesaplanamadı" : undefined}
                                      >
                                        {hasUnmatched ? '?' : formatCurrency(analysis.economics.netProfit)}
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
  );
}
