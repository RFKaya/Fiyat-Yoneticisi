'use client';

import { useState, useTransition } from 'react';
import type { Product } from '@/lib/types';
import { getSmartSuggestion } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Trash2, WandSparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfitTableProps = {
  product: Product;
  onDelete: () => void;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

export default function ProfitTable({ product, onDelete }: ProfitTableProps) {
  const [margins, setMargins] = useState<number[]>([25, 50, 75, 100]);
  const [newMargin, setNewMargin] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAddMargin = () => {
    const marginValue = parseFloat(newMargin);
    if (!isNaN(marginValue) && marginValue > 0 && !margins.includes(marginValue)) {
      setMargins((prev) => [...prev, marginValue].sort((a, b) => a - b));
      setNewMargin('');
    }
  };

  const handleGetSuggestion = () => {
    startTransition(async () => {
      const result = await getSmartSuggestion(product.cost);
      if (result.success && result.suggestion) {
        if (!margins.includes(result.suggestion)) {
          setMargins((prev) => [...prev, result.suggestion].sort((a,b) => a - b));
        }
        toast({
          title: '✨ AI Önerisi Eklendi',
          description: `Önerilen %${result.suggestion} kâr marjı tabloya eklendi.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: result.error,
        });
      }
    });
  };
  
  const handleDeleteMargin = (marginToDelete: number) => {
    setMargins(margins.filter((m) => m !== marginToDelete));
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>Maliyet: {formatCurrency(product.cost)}</CardDescription>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" onClick={onDelete}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tabloyu Kapat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Yeni Kâr Marjı (%)"
              value={newMargin}
              onChange={(e) => setNewMargin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMargin()}
            />
            <Button onClick={handleAddMargin}>Ekle</Button>
          </div>
          <div className="max-h-60 overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Kâr (%)</TableHead>
                  <TableHead>Satış Fiyatı</TableHead>
                  <TableHead>Mağaza Farkı</TableHead>
                  <TableHead>Online Farkı</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {margins.map((margin) => {
                  const sellingPrice = product.cost * (1 + margin / 100);
                  const storeDiff = sellingPrice - product.storePrice;
                  const onlineDiff = sellingPrice - product.onlinePrice;
                  return (
                    <TableRow key={margin}>
                      <TableCell className="font-medium">{margin}%</TableCell>
                      <TableCell>{formatCurrency(sellingPrice)}</TableCell>
                      <TableCell className={cn(storeDiff >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(storeDiff)}
                      </TableCell>
                      <TableCell className={cn(onlineDiff >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(onlineDiff)}
                      </TableCell>
                       <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteMargin(margin)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={handleGetSuggestion} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="mr-2 h-4 w-4 text-accent" />
          )}
          Akıllı Marj Önerisi Al
        </Button>
      </CardFooter>
    </Card>
  );
}
