'use client';

import React, { useState, useRef } from 'react';
import { 
  ShoppingBag, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  FileJson, 
  ArrowRight,
  Ghost,
  Info,
  LayoutList,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Platform, ParsedOrder } from '@/lib/orders/types';
import { parseOrderFile } from '@/lib/orders';

export default function OrdersPage() {
  const [platform, setPlatform] = useState<Platform>('TRENDYOL');
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleOrderExpansion = (orderNo: string) => {
    setExpandedOrderIds(prev => 
      prev.includes(orderNo) 
        ? prev.filter(id => id !== orderNo) 
        : [...prev, orderNo]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    try {
      const parsedOrders = await parseOrderFile(file, platform);
      setOrders(parsedOrders);
    } catch (err) {
      console.error(err);
      setError('Dosya ayrıştırılırken bir hata oluştu. Lütfen doğru platformu seçtiğinizden ve dosyanın geçerli bir Excel olduğundan emin olun.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Sipariş Yönetimi</h2>
          <p className="text-muted-foreground mt-1">Platformlardan dışa aktarılan siparişleri test edin ve yönetin.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="w-[180px] glass-panel">
              <SelectValue placeholder="Platform Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRENDYOL">Trendyol</SelectItem>
              <SelectItem value="YEMEKSEPETI">Yemeksepeti</SelectItem>
              <SelectItem value="MIGROS">Migros Yemek</SelectItem>
              <SelectItem value="GETIR">Getir Yemek</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            className="relative overflow-hidden group" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isParsing ? 'Ayrıştırılıyor...' : 'Excel Yükle'}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleFileUpload}
            />
          </Button>
        </div>
      </div>

      {error && (
        <div className="glass-panel border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3 rounded-2xl animate-in slide-in-from-top duration-300">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm font-medium text-destructive">{error}</div>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-border bg-card/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Sipariş Önizleme</h3>
          </div>
          {orders.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Toplam <span className="font-bold text-foreground">{orders.length}</span> sipariş bulundu
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-[900px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px] px-4 font-bold">Tarih</TableHead>
                <TableHead className="w-[140px] px-4 font-bold">Sipariş No</TableHead>
                <TableHead className="w-[120px] px-4 font-bold">Platform</TableHead>
                <TableHead className="w-[180px] px-4 font-bold">Ödeme Yöntemi</TableHead>
                <TableHead className="w-[120px] px-4 font-bold">Durum</TableHead>
                <TableHead className="w-[120px] px-4 font-bold text-right">Tutar</TableHead>
                <TableHead className="w-[80px] px-4 font-bold text-center">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <FileJson className="h-12 w-12 opacity-20" />
                      <p>Henüz bir veri yüklenmedi.</p>
                      <p className="text-xs">Üst kısımdan platform seçip Excel dosyasını yükleyin.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order, idx) => (
                  <React.Fragment key={order.orderNumber + idx}>
                    <TableRow className={`hover:bg-muted/20 transition-colors ${expandedOrderIds.includes(order.orderNumber) ? 'bg-primary/5 border-b-0' : ''}`}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(order.orderDate)}</TableCell>
                      <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground">
                            {order.platform}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{order.paymentMethod || '-'}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {order.status || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 transition-all ${expandedOrderIds.includes(order.orderNumber) ? 'bg-primary text-white hover:bg-primary/90 rotate-180' : 'hover:bg-primary/20 hover:text-primary'}`}
                          onClick={() => toggleOrderExpansion(order.orderNumber)}
                        >
                          {expandedOrderIds.includes(order.orderNumber) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedOrderIds.includes(order.orderNumber) && (
                      <TableRow className="bg-primary/5 hover:bg-primary/5">
                        <TableCell colSpan={7} className="p-0 border-b border-primary/10">
                          <div className="p-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                <LayoutList className="h-4 w-4" />
                                Detaylı Sipariş İçeriği (Ham Veri)
                              </div>
                              <div className="p-5 rounded-xl bg-card border border-border/50 text-sm whitespace-pre-wrap min-h-[100px] max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed shadow-sm">
                                {order.raw?.content ? (
                                  order.raw.content
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground opacity-60">
                                    <Ghost className="h-10 w-10 mb-2" />
                                    <p className="font-medium">Bu platform için ek ürün detayı bulunamadı.</p>
                                    <p className="text-[10px] mt-1 border border-border px-2 py-0.5 rounded uppercase">Platform Sınırlaması</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {orders.some(o => !o.hasDetails) && (
        <div className="glass-panel border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 rounded-2xl">
          <Info className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Bilgi:</strong> Migros ve Getir platformları Excel çıktılarında ürün detaylarını vermediği için bu siparişler "hayalet sipariş" olarak işaretlenmiştir. Tarih ve tutar bilgileri doğru yansıtılmaktadır.
          </div>
        </div>
      )}
    </main>
  );
}
