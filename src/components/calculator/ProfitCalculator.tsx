'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ProfitCalculatorProps = {
  products: Product[];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

export default function ProfitCalculator({ products }: ProfitCalculatorProps) {
  const [margins, setMargins] = useState<number[]>([25, 50, 75, 100]);
  const [newMargin, setNewMargin] = useState('');

  const handleAddMargin = () => {
    const marginValue = parseFloat(newMargin);
    if (!isNaN(marginValue) && marginValue > 0 && !margins.includes(marginValue)) {
      setMargins((prev) => [...prev, marginValue].sort((a, b) => a - b));
      setNewMargin('');
    }
  };

  const handleDeleteMargin = (marginToDelete: number) => {
    setMargins(margins.filter((m) => m !== marginToDelete));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kâr Analizi</CardTitle>
        <CardDescription>
          Farklı kâr marjlarına göre tüm ürünler için fiyatlandırma senaryolarını karşılaştırın.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            type="number"
            placeholder="Kâr Marjı Ekle (%)"
            value={newMargin}
            onChange={(e) => setNewMargin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMargin()}
            className="max-w-xs"
          />
          <Button onClick={handleAddMargin}>Ekle</Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold min-w-[200px]">Ürün</TableHead>
                <TableHead className="text-right font-semibold">Maliyet</TableHead>
                {margins.map((margin) => (
                  <TableHead key={margin} className="text-right font-semibold">
                    <div className="flex items-center justify-end gap-1">
                      %{margin}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteMargin(margin)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sütunu Sil</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                    {margins.map((margin) => {
                      const sellingPrice = product.cost * (1 + margin / 100);
                      return (
                        <TableCell key={margin} className="text-right">
                          {formatCurrency(sellingPrice)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={margins.length + 2} className="h-24 text-center text-muted-foreground">
                    Analiz edilecek ürün bulunmuyor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
