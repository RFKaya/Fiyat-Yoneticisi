'use client';

import { useState, useEffect } from 'react';
import {
  Calculator,
  Wallet,
  CreditCard,
  Utensils,
  Percent,
  Banknote,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function CalculatorPage() {
  const [platformCommission, setPlatformCommission] = useState<number>(40);
  const [mealCardCommission, setMealCardCommission] = useState<number>(10);
  const [normalPayment, setNormalPayment] = useState<number>(0);
  const [mealCardPayment, setMealCardPayment] = useState<number>(0);

  const [results, setResults] = useState({
    totalPayment: 0,
    totalCommission: 0,
    weightedRate: 0,
    netAmount: 0
  });

  useEffect(() => {
    const p1 = Number(normalPayment) || 0;
    const p2 = Number(mealCardPayment) || 0;
    const c1 = Number(platformCommission) || 0;
    const c2 = Number(mealCardCommission) || 0;

    const totalNormalCommission = p1 * (c1 / 100);
    const totalMealCardCommission = p2 * ((c1 + c2) / 100);
    const totalCommission = totalNormalCommission + totalMealCardCommission;
    const totalPayment = p1 + p2;
    const weightedRate = totalPayment > 0 ? (totalCommission / totalPayment) * 100 : 0;
    const netAmount = totalPayment - totalCommission;

    setResults({
      totalPayment,
      totalCommission,
      weightedRate,
      netAmount
    });
  }, [platformCommission, mealCardCommission, normalPayment, mealCardPayment]);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Background Blobs */}
      <div className="blob blob-indigo w-[300px] h-[300px] -top-20 -left-20 opacity-20" />
      <div className="blob blob-pink w-[300px] h-[300px] -bottom-20 -right-20 opacity-20" />

      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            Komisyon Hesaplayıcı
          </h1>
          <p className="text-muted-foreground">
            Platform ve yemek kartı ödemelerine göre ağırlıklı ortalama komisyonu hesaplayın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="glass-panel border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Parametreler
              </CardTitle>
              <CardDescription>
                Komisyon oranlarını ve ödeme tutarlarını girin.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platformComm">Platform Komisyonu (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="platformComm"
                      type="number"
                      value={platformCommission}
                      onChange={(e) => setPlatformCommission(Number(e.target.value))}
                      className="pl-9 bg-background/50"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mealCardComm">Yemek Kartı Farkı (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mealCardComm"
                      type="number"
                      value={mealCardCommission}
                      onChange={(e) => setMealCardCommission(Number(e.target.value))}
                      className="pl-9 bg-background/50"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="normalPay" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    Normal Ödeme (Nakit/Kredi)
                  </Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="normalPay"
                      type="number"
                      value={normalPayment || ''}
                      onChange={(e) => setNormalPayment(Number(e.target.value))}
                      className="pl-9 bg-background/50 text-lg py-6"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mealPay" className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-orange-500" />
                    Yemek Kartı Ödemesi
                  </Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mealPay"
                      type="number"
                      value={mealCardPayment || ''}
                      onChange={(e) => setMealCardPayment(Number(e.target.value))}
                      className="pl-9 bg-background/50 text-lg py-6"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setNormalPayment(0);
                  setMealCardPayment(0);
                }}
              >
                Sıfırla
              </Button>
            </CardContent>
          </Card>

          {/* Result Section */}
          <Card className="glass-panel border-none bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Özet Sonuç
              </CardTitle>
              <CardDescription>
                Hesaplanan ağırlıklı komisyon ve net tutar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 rounded-2xl bg-background/40 border border-border/50 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ağırlıklı Ortalama Komisyon</span>
                  <span className="text-5xl font-black text-primary tracking-tight">
                    %{results.weightedRate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-background/40 border border-border/40 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Toplam Ödeme</span>
                    <span className="text-xl font-bold">
                      {results.totalPayment.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-background/40 border border-border/40 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Toplam Komisyon</span>
                    <span className="text-xl font-bold text-destructive">
                      {results.totalCommission.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="p-6 rounded-2xl bg-primary text-primary-foreground shadow-lg flex flex-col items-center justify-center gap-1 text-center">
                  <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Net Ele Geçen Tutar</span>
                  <span className="text-3xl font-bold">
                    {results.netAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </span>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 leading-relaxed flex gap-3">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>
                    <strong>Hesaplama Mantığı:</strong> Normal ödemeler için %{platformCommission} platform komisyonu,
                    yemek kartı ödemeleri için ise %{platformCommission + mealCardCommission} (%{platformCommission} + %{mealCardCommission})
                    komisyon uygulanmıştır.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
