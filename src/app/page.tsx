'use client';

import React, { useState, useMemo } from 'react';
import type { Product, RecipeItem, Ingredient, Category } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { nanoid } from 'nanoid';
import { calculateCost } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Header from '@/components/layout/Header';
import ProductForm from '@/components/products/ProductForm';
import InlineRecipeEditor from '@/components/products/InlineRecipeEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Trash2, X, Tags, Check, GripVertical, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

const categoryColors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];


function SortableProductRow({ 
    product, 
    ingredients, 
    margins, 
    categories,
    updateProduct, 
    deleteProduct,
    isExpanded,
    onToggleExpand
  }: {
  product: Product,
  ingredients: Ingredient[],
  margins: number[],
  categories: Category[],
  updateProduct: (id: string, field: keyof Product, value: any) => void,
  deleteProduct: (id: string) => void,
  isExpanded: boolean,
  onToggleExpand: () => void,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const cost = calculateCost(product.recipe, ingredients);
  const category = categories.find(c => c.id === product.categoryId);

  return (
    <TableRow ref={setNodeRef} style={style} key={product.id} className={isExpanded ? 'border-b-0' : ''}>
      <TableCell className="w-[250px]">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
          <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Reçeteyi Göster/Gizle</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
          <Input value={product.name} onChange={(e) => updateProduct(product.id, 'name', e.target.value)} className="font-medium border-0 bg-transparent focus-visible:ring-1 focus-visible:bg-card flex-grow" placeholder="Yeni Ürün Adı" />
        </div>
      </TableCell>
      <TableCell className="text-left font-medium w-[90px]">{formatCurrency(cost)}</TableCell>
      <TableCell className="w-[100px]">
        <Input type="number" value={product.storePrice || ''} onChange={(e) => updateProduct(product.id, 'storePrice', e.target.value)} className="text-left" placeholder="0.00" />
      </TableCell>
      <TableCell className="w-[100px]">
        <Input type="number" value={product.onlinePrice || ''} onChange={(e) => updateProduct(product.id, 'onlinePrice', e.target.value)} className="text-left" placeholder="0.00" />
      </TableCell>
      {margins.map((margin) => {
        const sellingPrice = cost * (1 + margin / 100);
        return (
          <TableCell key={margin} className="text-right w-[90px]">{formatCurrency(sellingPrice)}</TableCell>
        );
      })}
      <TableCell className="w-[40px]" />
      <TableCell className="text-right w-[60px]">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Taşı</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                             <DropdownMenuItem onClick={() => updateProduct(product.id, 'categoryId', undefined)}>
                                Kategorisiz
                            </DropdownMenuItem>
                            {categories.map(cat => (
                                <DropdownMenuItem key={cat.id} onClick={() => updateProduct(product.id, 'categoryId', cat.id)}>
                                    {cat.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator/>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteProduct(product.id)}>
                    <Trash2 className="mr-2 h-4 w-4"/> Ürünü Sil
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function Home() {
  const [products, setProducts] = useLocalStorage<Product[]>('fiyatvizyon-products', []);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('fiyatvizyon-ingredients', []);
  const [margins, setMargins] = useLocalStorage<number[]>('fiyatvizyon-margins', [25, 50, 75, 100]);
  const [categories, setCategories] = useLocalStorage<Category[]>('fiyatvizyon-categories', []);

  const [newMargin, setNewMargin] = useState('');
  const [isAddProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<{ index: number; value: string } | null>(null);
  
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);

  const toggleProductExpansion = (productId: string) => {
    setExpandedProductIds(prev => 
        prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId]
    );
  };

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
            return { ...p, [field]: value };
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
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, recipe: newRecipe } : p));
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

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories(prev => [...prev, { id: nanoid(), name: newCategoryName, color: newCategoryColor }]);
    setNewCategoryName('');
    setNewCategoryColor(categoryColors[0]);
  }

  const handleDeleteCategory = (id: string) => {
    setProducts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p));
    setCategories(prev => prev.filter(c => c.id !== id));
  }
  
  const productsByCategory = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.order - b.order);
    const grouped: { category?: Category, products: Product[] }[] = [];
    const uncategorized: Product[] = [];
    const productsByCatId: Record<string, Product[]> = {};

    for (const product of sorted) {
      if (product.categoryId) {
        if (!productsByCatId[product.categoryId]) {
          productsByCatId[product.categoryId] = [];
        }
        productsByCatId[product.categoryId].push(product);
      } else {
        uncategorized.push(product);
      }
    }
    
    categories.forEach(cat => {
        if(productsByCatId[cat.id] && productsByCatId[cat.id].length > 0) {
            grouped.push({ category: cat, products: productsByCatId[cat.id] });
        }
    });

    if (uncategorized.length > 0) {
      grouped.push({ products: uncategorized });
    }

    return grouped;
  }, [products, categories]);

  const productIds = useMemo(() => products.map(p => p.id), [products]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        return reordered.map((item, index) => ({...item, order: index}));
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Ürün ve Kâr Analizi</CardTitle>
            <CardDescription>
              Ürünlerinizi sürükleyip bırakarak sıralayın, maliyetleri ve kâr marjlarını anında analiz edin.
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
                          <button key={color} onClick={() => setNewCategoryColor(color)} className="h-6 w-6 rounded-full" style={{ backgroundColor: color }}>
                            {newCategoryColor === color && <Check className="h-4 w-4 text-white m-auto" />}
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
                              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span>{cat.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                              <Trash2 className="h-4 w-4" />
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold w-[250px]">Ürün</TableHead>
                      <TableHead className="text-left font-semibold w-[90px]">Maliyet</TableHead>
                      <TableHead className="text-left font-semibold w-[100px]">Mağaza Fiyatı</TableHead>
                      <TableHead className="text-left font-semibold w-[100px]">Online Fiyat</TableHead>
                      {margins.map((margin, index) => (
                        <TableHead key={index} className="text-right font-semibold w-[90px]">
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
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteMargin(margin) }}>
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
                      <TableHead className="text-left px-1 w-[40px]">
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
                              <Input type="number" placeholder="Örn: 150" value={newMargin} onChange={(e) => setNewMargin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddMargin(); }} />
                              <Button onClick={handleAddMargin}>Marj Ekle</Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableHead>
                      <TableHead className="text-right font-semibold w-[60px]">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
                     <TableBody>
                      {products.length > 0 ? (
                        productsByCategory.map(({ category, products: productGroup }) => (
                          <React.Fragment key={category?.id || 'uncategorized'}>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableCell colSpan={margins.length + 6} className="py-2">
                                <div className="flex items-center gap-2">
                                  {category && <div className="h-3 w-3 rounded-full shrink-0" style={{backgroundColor: category.color}} />}
                                  <span className="font-semibold text-sm">{category?.name || 'Kategorisiz'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {productGroup.map(product => (
                              <React.Fragment key={product.id}>
                                <SortableProductRow
                                  product={product}
                                  ingredients={ingredients}
                                  margins={margins}
                                  categories={categories}
                                  updateProduct={updateProduct}
                                  deleteProduct={deleteProduct}
                                  isExpanded={expandedProductIds.includes(product.id)}
                                  onToggleExpand={() => toggleProductExpansion(product.id)}
                                />
                                {expandedProductIds.includes(product.id) && (
                                  <TableRow>
                                      <TableCell colSpan={margins.length + 6} className="p-0 bg-muted/20">
                                          <InlineRecipeEditor
                                              product={product}
                                              ingredients={ingredients}
                                              onSave={(newRecipe) => updateProductRecipe(product.id, newRecipe)}
                                          />
                                      </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={margins.length + 6} className="h-24 text-center text-muted-foreground">
                            Başlamak için bir ürün ekleyin.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
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
      </main>
    </div>
  );
}
