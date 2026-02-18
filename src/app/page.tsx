'use client';

import { useState, useMemo } from 'react';
import type { Product, RecipeItem, Ingredient } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { nanoid } from 'nanoid';
import { calculateCost } from '@/lib/utils';

import Header from '@/components/layout/Header';
import ProductForm from '@/components/products/ProductForm';
import RecipeForm from '@/components/products/RecipeForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { PlusCircle, Trash2, X, ArrowUpDown, BookMarked } from 'lucide-react';
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
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('fiyatvizyon-ingredients', []);
  const [margins, setMargins] = useLocalStorage<number[]>('fiyatvizyon-margins', [25, 50, 75, 100]);
  const [newMargin, setNewMargin] = useState('');
  const [isAddProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<{ index: number; value: string } | null>(null);
  const [editingRecipeProduct, setEditingRecipeProduct] = useState<Product | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const addProduct = (productData: Omit<Product, 'id' | 'recipe'>) => {
    setProducts((prev) => [...prev, { ...productData, id: nanoid(), recipe: [] }]);
    setAddProductDialogOpen(false);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    const finalValue = field === 'name' ? value : (isNaN(numericValue) ? '' : numericValue);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: finalValue } : p));
  };
  
  const updateProductRecipe = (productId: string, newRecipe: RecipeItem[]) => {
      setProducts(prev => prev.map(p => p.id === productId ? {...p, recipe: newRecipe} : p));
      setEditingRecipeProduct(null);
  }

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
    setEditingMargin(null);
    if (!isNaN(newValue) && newValue > 0) {
      setMargins(prev => {
        if (prev.some((m, i) => m === newValue && i !== indexToUpdate)) return prev;
        const newMargins = [...prev];
        newMargins[indexToUpdate] = newValue;
        return newMargins.sort((a, b) => a - b);
      });
    }
  };
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name, 'tr');
      } else {
        return b.name.localeCompare(a.name, 'tr');
      }
    });
  }, [products, sortOrder]);


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Ürün ve Kâr Analizi</CardTitle>
            <CardDescription>
              Ürünlerinizi yönetin, maliyetleri ve kâr marjlarını anında analiz edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold min-w-[200px]">
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleSortOrder}>
                             <ArrowUpDown className="h-4 w-4" />
                           </Button>
                           Ürün
                        </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Maliyet</TableHead>
                    <TableHead className="text-right font-semibold min-w-[150px]">Reçete</TableHead>
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
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteMargin(margin)}}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Sütunu Sil</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </TableHead>
                    ))}
                    <TableHead className="text-left px-1">
                        <Popover onOpenChange={(open) => !open && setNewMargin('')}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon"><PlusCircle className="h-5 w-5" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-4">
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">Yeni Kâr Marjı</h4>
                                        <p className="text-sm text-muted-foreground">Analiz için yeni bir yüzde ekle.</p>
                                    </div>
                                     <Input type="number" placeholder="Örn: 150" value={newMargin} onChange={(e) => setNewMargin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddMargin(); }}/>
                                    <Button onClick={handleAddMargin}>Marj Ekle</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </TableHead>
                     <TableHead className="text-right font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.length > 0 ? (
                    sortedProducts.map((product) => {
                      const cost = calculateCost(product.recipe, ingredients);
                      return (
                      <TableRow key={product.id}>
                        <TableCell>
                            <Input value={product.name} onChange={(e) => updateProduct(product.id, 'name', e.target.value)} className="font-medium border-0 bg-transparent -ml-3 focus-visible:ring-1 focus-visible:bg-card" placeholder="Yeni Ürün Adı"/>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(cost)}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm" onClick={() => setEditingRecipeProduct(product)}>
                               <BookMarked className="mr-2 h-4 w-4"/>
                               Düzenle
                           </Button>
                        </TableCell>
                         <TableCell>
                           <Input type="number" value={product.storePrice} onChange={(e) => updateProduct(product.id, 'storePrice', e.target.value)} className="text-right" placeholder="0.00"/>
                        </TableCell>
                         <TableCell>
                           <Input type="number" value={product.onlinePrice} onChange={(e) => updateProduct(product.id, 'onlinePrice', e.target.value)} className="text-right" placeholder="0.00"/>
                        </TableCell>
                        {margins.map((margin) => {
                          const sellingPrice = cost * (1 + margin / 100);
                          return (
                            <TableCell key={margin} className="text-right">{formatCurrency(sellingPrice)}</TableCell>
                          );
                        })}
                        <TableCell/>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Ürünü Sil</span>
                            </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={margins.length + 7} className="h-24 text-center text-muted-foreground">
                        Başlamak için bir ürün ekleyin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
             <div className="mt-6 flex justify-center">
                <Dialog open={isAddProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Yeni Ürün Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Yeni Ürün Ekle</DialogTitle></DialogHeader>
                    <ProductForm addProduct={addProduct} />
                  </DialogContent>
                </Dialog>
            </div>
          </CardContent>
        </Card>
        
        {editingRecipeProduct && (
            <Dialog open={!!editingRecipeProduct} onOpenChange={(open) => !open && setEditingRecipeProduct(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Reçete Düzenle: {editingRecipeProduct.name}</DialogTitle>
                    </DialogHeader>
                    <RecipeForm
                        product={editingRecipeProduct}
                        ingredients={ingredients}
                        onSave={(newRecipe) => updateProductRecipe(editingRecipeProduct.id, newRecipe)}
                    />
                </DialogContent>
            </Dialog>
        )}

      </main>
    </div>
  );
}
