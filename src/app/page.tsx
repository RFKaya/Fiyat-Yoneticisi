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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
  const [margins, setMargins] = useLocalStorage<number[]>('fiyatvizyon-margins', [25, 50, 75, 100]);
  const [newMargin, setNewMargin] = useState('');
  const [isAddProductOpen, setAddProductOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<{ index: number; value: string } | null>(null);

  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((prev) => [...prev, { ...product, id: nanoid() }]);
    setAddProductOpen(false); // Close dialog on submit
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };
  
  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
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
  
  const handleUpdateMargin = (indexToUpdate: number) => {
    if (!editingMargin) return;
    const newValue = parseFloat(editingMargin.value);
    
    setEditingMargin(null); // Close input regardless of success

    if (!isNaN(newValue) && newValue > 0) {
      setMargins(prev => {
        // Prevent adding a duplicate margin
        if (prev.some((m, i) => m === newValue && i !== indexToUpdate)) {
            return prev;
        }
        const newMargins = [...prev];
        newMargins[indexToUpdate] = newValue;
        return newMargins.sort((a, b) => a - b);
      });
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Ürün ve Kâr Analizi</CardTitle>
            <CardDescription>
              Ürünlerinizi yönetin, fiyatları ve kâr marjlarını anında analiz edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold min-w-[200px]">Ürün</TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Maliyet</TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Mağaza Fiyatı</TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Online Fiyat</TableHead>
                    {margins.map((margin, index) => (
                      <TableHead key={index} className="text-right font-semibold min-w-[120px]">
                        {editingMargin?.index === index ? (
                           <Input
                              type="number"
                              value={editingMargin.value}
                              onChange={(e) => setEditingMargin({ index, value: e.target.value })}
                              onBlur={() => handleUpdateMargin(index)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateMargin(index)
                                  if (e.key === 'Escape') setEditingMargin(null)
                              }}
                              className="text-right h-8"
                              autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1 cursor-pointer group" onClick={() => setEditingMargin({ index, value: String(margin) })}>
                            %{margin}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMargin(margin)
                                    }}
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
                        )}
                      </TableHead>
                    ))}
                    <TableHead className="text-left px-1">
                        <Popover onOpenChange={(open) => !open && setNewMargin('')}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <PlusCircle className="h-5 w-5" />
                                    <span className="sr-only">Kâr Marjı Ekle</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-4">
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">Yeni Kâr Marjı</h4>
                                        <p className="text-sm text-muted-foreground">
                                           Analiz için yeni bir yüzde ekle.
                                        </p>
                                    </div>
                                     <Input
                                        type="number"
                                        placeholder="Örn: 150"
                                        value={newMargin}
                                        onChange={(e) => setNewMargin(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddMargin();
                                        }}
                                    />
                                    <Button onClick={handleAddMargin}>Marj Ekle</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </TableHead>
                     <TableHead className="text-right font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length > 0 ? (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                            <Input
                              value={product.name}
                              onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                              className="font-medium border-0 bg-transparent -ml-3 focus-visible:ring-1 focus-visible:bg-card"
                              placeholder="Yeni Ürün Adı"
                           />
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
                        <TableCell/>
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
                      <TableCell colSpan={margins.length + 6} className="h-24 text-center text-muted-foreground">
                        Başlamak için bir ürün ekleyin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
             <div className="mt-6 flex justify-center">
                <Dialog open={isAddProductOpen} onOpenChange={setAddProductOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Yeni Ürün Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Ürün Ekle</DialogTitle>
                    </DialogHeader>
                    <ProductForm addProduct={addProduct} />
                  </DialogContent>
                </Dialog>
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
