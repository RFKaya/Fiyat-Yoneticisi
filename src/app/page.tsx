'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Product, RecipeItem, Ingredient, Category, Margin } from '@/lib/types';
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
import { PlusCircle, Trash2, X, Tags, Check, GripVertical, MoreVertical, ChevronDown, ChevronUp, Percent } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (amount: number) => {
  if (isNaN(amount) || !isFinite(amount)) return '';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

const categoryColors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];

function MarginColumnPopover({
  type,
  onAdd,
}: {
  type: 'store' | 'online';
  onAdd: (type: 'store' | 'online', value: number) => void;
}) {
  const [newMargin, setNewMargin] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    const marginValue = parseFloat(newMargin);
    if (!isNaN(marginValue) && marginValue > 0) {
      onAdd(type, marginValue);
      setNewMargin('');
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <PlusCircle className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-4" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="grid gap-3">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">
              Yeni Kâr Marjı ({type === 'store' ? 'Mağaza' : 'Online'})
            </h4>
            <p className="text-sm text-muted-foreground">
              Analiz için yeni bir yüzde ekle.
            </p>
          </div>
          <Input
            type="number"
            placeholder="150"
            value={newMargin}
            onChange={(e) => setNewMargin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <Button onClick={handleAdd}>Marj Ekle</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SortableProductRow({ 
    product, 
    ingredients, 
    margins, 
    categories,
    commissionRate,
    updateProduct, 
    deleteProduct,
    isExpanded,
    onToggleExpand,
    updateIngredientPrice,
  }: {
  product: Product,
  ingredients: Ingredient[],
  margins: Margin[],
  categories: Category[],
  commissionRate: number,
  updateProduct: (id: string, field: keyof Product, value: any) => void,
  deleteProduct: (id: string) => void,
  isExpanded: boolean,
  onToggleExpand: () => void,
  updateIngredientPrice: (ingredientId: string, newPrice: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });
  
  const [editingField, setEditingField] = useState<'name' | 'storePrice' | 'onlinePrice' | null>(null);

  const hasRecipe = product.recipe && product.recipe.length > 0;
  const cost = hasRecipe ? calculateCost(product.recipe, ingredients) : product.manualCost;
  const category = categories.find(c => c.id === product.categoryId);
  const priceAfterCommission = product.onlinePrice * (1 - (commissionRate / 100));

  const storeMargins = useMemo(() => margins.filter(m => m.type === 'store').sort((a,b) => a.value - b.value), [margins]);
  const onlineMargins = useMemo(() => margins.filter(m => m.type === 'online').sort((a,b) => a.value - b.value), [margins]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
    backgroundColor: category ? `${category.color}33` : undefined,
  };
  
  const handleUpdate = (field: 'name' | 'storePrice' | 'onlinePrice', value: string) => {
    updateProduct(product.id, field, value);
    setEditingField(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };


  return (
    <TableRow ref={setNodeRef} style={style} key={product.id} className={isExpanded ? 'border-b-0' : ''}>
      <TableCell className="w-[340px] px-4 py-1">
        <div className="flex items-center gap-1 h-8">
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
          {editingField === 'name' ? (
             <Input 
                defaultValue={product.name} 
                onBlur={(e) => handleUpdate('name', e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="font-medium border-dashed focus-visible:ring-1 focus-visible:bg-card flex-grow h-8"
             />
          ) : (
             <div onClick={() => setEditingField('name')} className="font-medium flex-grow cursor-pointer truncate px-2 h-8 flex items-center rounded-md hover:bg-muted/50">
                {product.name || <span className="text-muted-foreground">Yeni Ürün Adı</span>}
             </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-left w-[120px] px-4 py-1">
        <div className="flex items-center justify-start gap-0 h-8">
            <span className="font-medium text-foreground">{formatCurrency(cost)}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onToggleExpand}>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Reçeteyi Göster/Gizle</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell className="w-[100px] px-4 py-1 text-left">
        {editingField === 'storePrice' ? (
            <Input 
                type="number" 
                defaultValue={product.storePrice || ''}
                onBlur={(e) => handleUpdate('storePrice', e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-left h-8 border-dashed" 
                placeholder="0.00" 
            />
        ) : (
            <div onClick={() => setEditingField('storePrice')} className="text-left cursor-pointer px-2 h-8 flex items-center rounded-md hover:bg-muted/50">
                {formatCurrency(product.storePrice)}
            </div>
        )}
      </TableCell>
      {storeMargins.map((margin) => {
         const sellingPrice = cost * (1 + margin.value / 100);
        return (
          <TableCell key={margin.id} className="text-left w-[90px] px-1 py-1 text-muted-foreground">{formatCurrency(sellingPrice)}</TableCell>
        );
      })}
      <TableCell className="text-left px-0 w-[30px] py-1"></TableCell>
      
      <TableCell className="w-8 px-1 py-1" />

      <TableCell className="w-[120px] px-2 py-1 text-left">
         {editingField === 'onlinePrice' ? (
            <Input 
                type="number" 
                defaultValue={product.onlinePrice || ''}
                onBlur={(e) => handleUpdate('onlinePrice', e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-left h-8 border-dashed" 
                placeholder="0.00" 
            />
        ) : (
            <div onClick={() => setEditingField('onlinePrice')} className="h-8 cursor-pointer rounded-md hover:bg-muted/50 flex items-center px-2">
                <div className="flex flex-col justify-center">
                    <div>{formatCurrency(product.onlinePrice)}</div>
                    {product.onlinePrice > 0 && commissionRate > 0 && (
                        <div className="text-xs text-muted-foreground text-left whitespace-nowrap -mt-1 leading-tight">
                            hesaba geçer {formatCurrency(priceAfterCommission)}
                        </div>
                    )}
                </div>
            </div>
        )}
      </TableCell>

      {onlineMargins.map((margin) => {
        const sellingPrice = (cost * (1 + margin.value / 100)) / (1 - commissionRate / 100);
        return (
          <TableCell key={margin.id} className="text-left w-[90px] px-1 py-1 text-muted-foreground">{formatCurrency(sellingPrice)}</TableCell>
        );
      })}
      <TableCell className="text-left px-0 w-[30px] py-1"></TableCell>

      <TableCell className="text-right w-[60px] px-4 py-1">
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
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [margins, setMargins] = useState<Margin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isAddProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<{ id: string; value: string } | null>(null);
  
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);

  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = React.useRef(true);
  
  const [commissionRate, setCommissionRate] = useState(15);
  const [commissionInput, setCommissionInput] = useState('15');
  const [isCommissionPopoverOpen, setCommissionPopoverOpen] = useState(false);
  
  const storeMargins = useMemo(() => margins.filter(m => m.type === 'store').sort((a,b) => a.value - b.value), [margins]);
  const onlineMargins = useMemo(() => margins.filter(m => m.type === 'online').sort((a,b) => a.value - b.value), [margins]);

  // Data Fetching and Saving
  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((data) => {
        const sortedProducts = (data.products || []).sort((a: Product, b: Product) => (a.order ?? 0) - (b.order ?? 0));
        const sortedIngredients = (data.ingredients || []).sort((a: Ingredient, b: Ingredient) => (a.order ?? 0) - (b.order ?? 0));

        setProducts(sortedProducts);
        setIngredients(sortedIngredients);
        setMargins(data.margins || []);
        setCategories(data.categories || []);
        setCommissionRate(data.commissionRate ?? 15);
        setCommissionInput(String(data.commissionRate ?? 15));
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load data:', error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
        if(!isLoading) {
            isInitialMount.current = false;
        }
        return;
    }

    if (!isLoading) {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, ingredients, margins, categories, commissionRate }),
      }).catch(error => console.error('Failed to save data:', error));
    }
  }, [products, ingredients, margins, categories, commissionRate, isLoading]);

  const toggleProductExpansion = (productId: string) => {
    setExpandedProductIds(prev => 
        prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId]
    );
  };

  const addProduct = (productData: Omit<Product, 'id' | 'recipe' | 'order' | 'manualCost'>) => {
    setProducts((prev) => {
      const newOrder = prev.length > 0 ? Math.max(...prev.map(p => p.order)) + 1 : 0;
      return [...prev, { ...productData, id: nanoid(), recipe: [], order: newOrder, manualCost: 0 }];
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
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        // If a recipe is added, clear manualCost. If recipe is cleared, user can set manualCost.
        const manualCost = newRecipe.length > 0 ? 0 : p.manualCost;
        return { ...p, recipe: newRecipe, manualCost };
      }
      return p;
    }));
  }

  const updateIngredientPrice = (ingredientId: string, newPrice: number) => {
    setIngredients(prevIngredients =>
        prevIngredients.map(ing =>
            ing.id === ingredientId ? { ...ing, price: newPrice } : ing
        )
    );
  };

  const handleAddMargin = (type: 'store' | 'online', value: number) => {
    const newMarginObject: Margin = { id: nanoid(), value, type };
    
    const exists = margins.some(m => m.value === value && m.type === type);
    if(!exists) {
      setMargins((prev) => [...prev, newMarginObject]);
    }
  };
  

  const handleDeleteMargin = (id: string) => {
    setMargins(margins.filter((m) => m.id !== id));
  };

  const handleUpdateMargin = (id: string) => {
    if (!editingMargin) return;
    const newValue = parseFloat(editingMargin.value);
    setEditingMargin(null);
    if (!isNaN(newValue) && newValue > 0) {
      setMargins(prev => {
        const exists = prev.some(m => m.id !== id && m.value === newValue && m.type === prev.find(i => i.id === id)?.type);
        if (exists) return prev;
        
        return prev.map(m => m.id === id ? {...m, value: newValue} : m);
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
  
  const handleSetCommission = () => {
    const rate = parseFloat(commissionInput);
    if (!isNaN(rate) && rate >= 0 && rate < 100) {
      setCommissionRate(rate);
      setCommissionPopoverOpen(false);
    }
  };

  const handleCommissionPopoverOpenChange = (open: boolean) => {
    if (open) {
      setCommissionInput(String(commissionRate));
    }
    setCommissionPopoverOpen(open);
  };
    
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
  
  const totalColumns = 8 + storeMargins.length + onlineMargins.length;

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Veriler yükleniyor...</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Ürün ve Kâr Analizi</CardTitle>
                    <CardDescription>
                    Ürünlerinizi sürükleyip bırakarak sıralayın, maliyetleri ve kâr marjlarını anında analiz edin.
                    </CardDescription>
                </div>
                 <div className="text-right">
                    <Popover open={isCommissionPopoverOpen} onOpenChange={handleCommissionPopoverOpenChange}>
                        <PopoverTrigger asChild>
                            <Button variant="outline">
                                <Percent className="mr-2 h-4 w-4" /> Komisyon Ayarla
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4">
                            <div className="grid gap-3">
                                <div className="space-y-1">
                                    <h4 className="font-medium leading-none">Komisyon Oranı</h4>
                                    <p className="text-sm text-muted-foreground">Online satış komisyonunu (%) girin.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        placeholder="Örn: 15" 
                                        value={commissionInput} 
                                        onChange={(e) => setCommissionInput(e.target.value)} 
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSetCommission(); }}
                                    />
                                    <span className="font-semibold">%</span>
                                </div>
                                <Button onClick={handleSetCommission}>Ayarla</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground mt-1">Mevcut Oran: %{commissionRate}</p>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end items-center mb-4">
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
                <Table className="table-fixed min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold w-[340px] px-4 py-1">Ürün</TableHead>
                      <TableHead className="text-left font-semibold w-[120px] px-4 py-1">Maliyet</TableHead>
                      <TableHead className="text-left font-semibold w-[100px] px-4 py-1">Mağaza Fiyatı</TableHead>
                      {storeMargins.map((margin) => (
                        <TableHead key={margin.id} className="text-left font-semibold w-[90px] px-1 py-1">
                          {editingMargin?.id === margin.id ? (
                            <Input
                              type="number"
                              value={editingMargin.value}
                              onChange={(e) => setEditingMargin({ id: margin.id, value: e.target.value })}
                              onBlur={() => handleUpdateMargin(margin.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateMargin(margin.id)
                                if (e.key === 'Escape') setEditingMargin(null)
                              }}
                              className="text-left h-8"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center justify-start gap-1 cursor-pointer group" onClick={() => setEditingMargin({ id: margin.id, value: String(margin.value) })}>
                              <span>%{margin.value} Kar</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteMargin(margin.id) }}>
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
                      <TableHead className="text-left px-0 w-[30px] py-1">
                         <MarginColumnPopover type="store" onAdd={handleAddMargin} />
                      </TableHead>
                      
                      <TableHead className="w-8 px-1 py-1" />

                      <TableHead className="text-left font-semibold w-[120px] px-2 py-1">Online Fiyat</TableHead>
                      {onlineMargins.map((margin) => (
                        <TableHead key={margin.id} className="text-left font-semibold w-[90px] px-1 py-1">
                          {editingMargin?.id === margin.id ? (
                             <Input
                              type="number"
                              value={editingMargin.value}
                              onChange={(e) => setEditingMargin({ id: margin.id, value: e.target.value })}
                              onBlur={() => handleUpdateMargin(margin.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateMargin(margin.id)
                                if (e.key === 'Escape') setEditingMargin(null)
                              }}
                              className="text-left h-8"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-start justify-start gap-1 cursor-pointer group" onClick={() => setEditingMargin({ id: margin.id, value: String(margin.value) })}>
                               <div className="flex flex-col">
                                  <span className="leading-tight">%{margin.value} Kar</span>
                                  <span className="text-xs font-normal text-muted-foreground leading-tight">ve %{commissionRate} Komisyon</span>
                               </div>
                               <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteMargin(margin.id) }}>
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
                      <TableHead className="text-left px-0 w-[30px] py-1">
                         <MarginColumnPopover type="online" onAdd={handleAddMargin} />
                      </TableHead>
                      
                      <TableHead className="text-right font-semibold w-[60px] px-4 py-1">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
                     <TableBody>
                      {products.length > 0 ? (
                        productsByCategory.map(({ category, products: productGroup }) => (
                          <React.Fragment key={category?.id || 'uncategorized'}>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableCell colSpan={totalColumns} className="py-1 px-4">
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
                                  commissionRate={commissionRate}
                                  updateProduct={updateProduct}
                                  deleteProduct={deleteProduct}
                                  isExpanded={expandedProductIds.includes(product.id)}
                                  onToggleExpand={() => toggleProductExpansion(product.id)}
                                  updateIngredientPrice={updateIngredientPrice}
                                />
                                {expandedProductIds.includes(product.id) && (
                                  <TableRow className="bg-card hover:bg-card">
                                      <TableCell colSpan={totalColumns} className="p-0">
                                          <InlineRecipeEditor
                                              product={product}
                                              ingredients={ingredients}
                                              allProducts={products}
                                              onSave={(newRecipe) => updateProductRecipe(product.id, newRecipe)}
                                              updateProduct={updateProduct}
                                              updateIngredientPrice={updateIngredientPrice}
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
                          <TableCell colSpan={totalColumns} className="h-20 text-center text-muted-foreground">
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
