'use client';

import { useState, useMemo } from 'react';
import type { Product, RecipeItem, Ingredient, Category } from '@/lib/types';
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
import { PlusCircle, Trash2, X, BookMarked, ChevronUp, ChevronDown, Tags, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

const categoryColors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];

export default function Home() {
  const [products, setProducts] = useLocalStorage<Product[]>('fiyatvizyon-products', []);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('fiyatvizyon-ingredients', []);
  const [margins, setMargins] = useLocalStorage<number[]>('fiyatvizyon-margins', [25, 50, 75, 100]);
  const [categories, setCategories] = useLocalStorage<Category[]>('fiyatvizyon-categories', []);

  const [newMargin, setNewMargin] = useState('');
  const [isAddProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<{ index: number; value: string } | null>(null);
  const [editingRecipeProduct, setEditingRecipeProduct] = useState<Product | null>(null);
  
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);

  const addProduct = (productData: Omit<Product, 'id' | 'recipe' | 'order'>) => {
    setProducts((prev) => {
        const newOrder = prev.length > 0 ? Math.max(...prev.map(p => p.order)) + 1 : 0;
        return [...prev, { ...productData, id: nanoid(), recipe: [], order: newOrder }];
    });
    setAddProductDialogOpen(false);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number | undefined) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (field === 'name' || field === 'categoryId') {
            const finalValue = value === 'null' ? undefined : value;
            return { ...p, [field]: finalValue };
          }
          const numericValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
          const finalValue = isNaN(numericValue) ? '' : numericValue;
          return { ...p, [field]: finalValue };
        }
        return p;
      })
    );
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
  
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => a.order - b.order);
  }, [products]);
  
  const moveProduct = (productId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedProducts.findIndex(p => p.id === productId);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedProducts.length - 1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    const product1 = sortedProducts[currentIndex];
    const product2 = sortedProducts[swapIndex];
    
    setProducts(prev => {
        const newProducts = [...prev];
        const p1Index = newProducts.findIndex(p => p.id === product1.id);
        const p2Index = newProducts.findIndex(p => p.id === product2.id);
        
        if (p1Index === -1 || p2Index === -1) return prev;

        const tempOrder = newProducts[p1Index].order;
        newProducts[p1Index].order = newProducts[p2Index].order;
        newProducts[p2Index].order = tempOrder;

        return newProducts;
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories(prev => [...prev, {id: nanoid(), name: newCategoryName, color: newCategoryColor}]);
    setNewCategoryName('');
    setNewCategoryColor(categoryColors[0]);
  }

  const handleDeleteCategory = (id: string) => {
    setProducts(prev => prev.map(p => p.categoryId === id ? {...p, categoryId: undefined} : p));
    setCategories(prev => prev.filter(c => c.id !== id));
  }


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
            <div className="mb-4">
                <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><Tags className="mr-2 h-4 w-4" /> Kategorileri Yönet</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Kategorileri Yönet</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">Yeni Kategori Ekle</h4>
                                <div className="flex items-center gap-2">
                                    <Input placeholder="Kategori Adı" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                    <Button onClick={handleAddCategory}>Ekle</Button>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <span className="text-sm font-medium">Renk:</span>
                                    {categoryColors.map(color => (
                                        <button key={color} onClick={() => setNewCategoryColor(color)} className="h-6 w-6 rounded-full" style={{backgroundColor: color}}>
                                            {newCategoryColor === color && <Check className="h-4 w-4 text-white m-auto"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium">Mevcut Kategoriler</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                {categories.length > 0 ? categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-md border">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded-full" style={{backgroundColor: cat.color}}/>
                                            <span>{cat.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground text-center py-4">Henüz kategori yok.</p>}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold min-w-[300px]">Ürün</TableHead>
                    <TableHead className="font-semibold min-w-[150px]">Kategori</TableHead>
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
                      const category = categories.find(c => c.id === product.categoryId);
                      return (
                      <TableRow key={product.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveProduct(product.id, 'up')}><ChevronUp className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveProduct(product.id, 'down')}><ChevronDown className="h-4 w-4" /></Button>
                                </div>
                                {category && <div className="h-3 w-3 rounded-full shrink-0" style={{backgroundColor: category.color}} />}
                                <Input value={product.name} onChange={(e) => updateProduct(product.id, 'name', e.target.value)} className="font-medium border-0 bg-transparent -ml-3 focus-visible:ring-1 focus-visible:bg-card flex-grow" placeholder="Yeni Ürün Adı"/>
                                <Button variant="outline" size="sm" onClick={() => setEditingRecipeProduct(product)}>
                                   <BookMarked className="mr-2 h-4 w-4"/>
                                   Reçete
                                </Button>
                            </div>
                        </TableCell>
                        <TableCell>
                           <Select value={product.categoryId || 'null'} onValueChange={(value) => updateProduct(product.id, 'categoryId', value)}>
                             <SelectTrigger className="w-[150px]">
                               <SelectValue placeholder="Kategori Seç" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="null">Kategorisiz</SelectItem>
                               {categories.map(cat => (
                                 <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(cost)}</TableCell>
                         <TableCell>
                           <Input type="number" value={product.storePrice || ''} onChange={(e) => updateProduct(product.id, 'storePrice', e.target.value)} className="text-right" placeholder="0.00"/>
                        </TableCell>
                         <TableCell>
                           <Input type="number" value={product.onlinePrice || ''} onChange={(e) => updateProduct(product.id, 'onlinePrice', e.target.value)} className="text-right" placeholder="0.00"/>
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
                      <TableCell colSpan={margins.length + 8} className="h-24 text-center text-muted-foreground">
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
                    <ProductForm addProduct={addProduct} categories={categories} />
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
