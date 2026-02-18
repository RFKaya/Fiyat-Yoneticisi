'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { nanoid } from 'nanoid';

import Header from '@/components/layout/Header';
import ProductForm from '@/components/products/ProductForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};


export default function Home() {
  const [products, setProducts] = useLocalStorage<Product[]>('fiyatvizyon-products', []);
  const [margins, setMargins] = useState<number[]>([25, 50, 75, 100]);
  const [newMargin, setNewMargin] = useState('');
  const [isAddProductOpen, setAddProductOpen] = useState(false);

  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((prev) => [...prev, { ...product, id: nanoid() }]);
    setAddProductOpen(false); // Close dialog on submit
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };
  
  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      // Allow empty input without setting to NaN
      const finalValue = field === 'name' ? value : (isNaN(numericValue) ? '' : numericValue);

      setProducts((prev) => 
        prev.map((p) => 
          p.id === id ? { ...p, [field]: finalValue } : p
        )
      );
  };

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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ürün ve Kâr Analizi</CardTitle>
              <CardDescription>
                Ürünlerinizi yönetin ve kâr marjlarını analiz edin.
              </CardDescription>
            </div>
            <Dialog open={isAddProductOpen} onOpenChange={setAddProductOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Yeni Ürün
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Ürün Ekle</DialogTitle>
                </DialogHeader>
                <ProductForm addProduct={addProduct} />
              </DialogContent>
            </Dialog>
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
                    <TableHead className="text-right font-semibold min-w-[150px]">Maliyet</TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Mağaza Fiyatı</TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Online Fiyat</TableHead>
                    {margins.map((margin) => (
                      <TableHead key={margin} className="text-right font-semibold min-w-[120px]">
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
                     <TableHead className="text-right font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length > 0 ? (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                            {product.name}
                        </TableCell>
                        <TableCell>
                           <Input
                              type="number"
                              value={product.cost}
                              onChange={(e) => updateProduct(product.id, 'cost', e.target.value)}
                              className="text-right"
                              placeholder="0.00"
                           />
                        </TableCell>
                         <TableCell>
                           <Input
                              type="number"
                              value={product.storePrice}
                              onChange={(e) => updateProduct(product.id, 'storePrice', e.target.value)}
                              className="text-right"
                              placeholder="0.00"
                           />
                        </TableCell>
                         <TableCell>
                           <Input
                              type="number"
                              value={product.onlinePrice}
                              onChange={(e) => updateProduct(product.id, 'onlinePrice', e.target.value)}
                              className="text-right"
                              placeholder="0.00"
                           />
                        </TableCell>
                        {margins.map((margin) => {
                          const sellingPrice = (typeof product.cost === 'number' ? product.cost : 0) * (1 + margin / 100);
                          return (
                            <TableCell key={margin} className="text-right">
                              {formatCurrency(sellingPrice)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Ürünü Sil</span>
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={margins.length + 5} className="h-24 text-center text-muted-foreground">
                        Başlamak için bir ürün ekleyin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
             {products.length === 0 && (
              <div className="text-center py-10 px-6">
                <p className="text-muted-foreground">
                  Fiyatlandırma stratejilerinizi analiz etmeye başlamak için lütfen ilk ürününüzü ekleyin.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
