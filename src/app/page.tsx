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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';


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
            placeholder="30"
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
    platformCommissionRate,
    bankCommissionRate,
    kdvRate,
    stopajRate,
    updateProduct, 
    deleteProduct,
    isExpanded,
    onToggleExpand,
    updateIngredientPrice
  }: {
  product: Product,
  ingredients: Ingredient[],
  margins: Margin[],
  categories: Category[],
  platformCommissionRate: number,
  bankCommissionRate: number,
  kdvRate: number,
  stopajRate: number,
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
  
    // New Calculations
  const storePriceExVat = product.storePrice > 0 ? product.storePrice / (1 + kdvRate / 100) : 0;
  const vatAmountStore = product.storePrice > 0 ? product.storePrice - storePriceExVat : 0;
  const commissionAmountStore = product.storePrice > 0 ? product.storePrice * (bankCommissionRate / 100) : 0;
  const netStoreProfit = product.storePrice > 0 ? storePriceExVat - commissionAmountStore - cost : -cost;
  const showNetStoreProfit = product.storePrice > 0;

  const onlinePriceExVat = product.onlinePrice > 0 ? product.onlinePrice / (1 + kdvRate / 100) : 0;
  const vatAmountOnline = product.onlinePrice > 0 ? product.onlinePrice - onlinePriceExVat : 0;
  const commissionAmountOnline = product.onlinePrice > 0 ? product.onlinePrice * (platformCommissionRate / 100) : 0;
  const stopajAmountOnline = product.onlinePrice > 0 ? onlinePriceExVat * (stopajRate / 100) : 0;
  const netOnlineProfit = product.onlinePrice > 0 ? onlinePriceExVat - commissionAmountOnline - stopajAmountOnline - cost : -cost;
  const showNetOnlineProfit = product.onlinePrice > 0;


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
      <TableCell className="w-[140px] px-4 py-1 text-left">
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div onClick={() => setEditingField('storePrice')} className="text-left cursor-pointer px-2 h-8 flex items-center rounded-md hover:bg-muted/50">
                  <div className="flex flex-col justify-center text-left">
                    <div>{formatCurrency(product.storePrice)}</div>
                    {showNetStoreProfit && (
                      <div className="text-xs text-muted-foreground -mt-1 leading-tight">
                        {formatCurrency(netStoreProfit)}
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              {showNetStoreProfit && (
                <TooltipContent>
                  <div className="p-1 space-y-1 text-xs w-48">
                    <div className="flex justify-between">
                      <span>Ana Fiyat</span>
                      <span className="font-medium">{formatCurrency(product.storePrice)}</span>
                    </div>
                    <Separator className="my-1 bg-border/50" />
                    <div className="flex justify-between text-muted-foreground">
                      <span>KDV (%{kdvRate})</span>
                      <span>- {formatCurrency(vatAmountStore)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Komisyon (%{bankCommissionRate.toFixed(2)})</span>
                      <span>- {formatCurrency(commissionAmountStore)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ürün Maliyeti</span>
                      <span>- {formatCurrency(cost)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold">
                      <span>Net Kâr</span>
                      <span>{formatCurrency(netStoreProfit)}</span>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      {storeMargins.map((margin) => {
         const commission = margin.commissionRate !== undefined ? margin.commissionRate : bankCommissionRate;
         const divisor = (1 / (1 + kdvRate / 100)) - (commission / 100) - (margin.value / 100);
         const sellingPrice = divisor > 0 ? cost / divisor : Infinity;

         const isCalculable = isFinite(sellingPrice) && sellingPrice > 0;
         
         const revenueExVat = isCalculable ? sellingPrice / (1 + kdvRate / 100) : 0;
         const vatAmount = isCalculable ? sellingPrice - revenueExVat : 0;
         const commissionAmount = isCalculable ? sellingPrice * (commission / 100) : 0;
         const netProfit = isCalculable ? revenueExVat - commissionAmount - cost : 0;
         
        return (
          <TableCell key={margin.id} className="text-left w-[140px] px-2 py-1 text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-full flex items-center">
                    {isCalculable ? formatCurrency(sellingPrice) : 'Hesaplanamaz'}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isCalculable ? (
                    <div className="p-1 space-y-1 text-xs w-48">
                      <div className="flex justify-between">
                        <span>Ana Fiyat</span>
                        <span className="font-medium">{formatCurrency(sellingPrice)}</span>
                      </div>
                      <Separator className="my-1 bg-border/50" />
                      <div className="flex justify-between text-muted-foreground">
                          <span>KDV (%{kdvRate})</span>
                          <span>- {formatCurrency(vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                          <span>Komisyon (%{commission.toFixed(2)})</span>
                          <span>- {formatCurrency(commissionAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                          <span>Ürün Maliyeti</span>
                          <span>- {formatCurrency(cost)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                          <span>Net Kâr</span>
                          <span>{formatCurrency(netProfit)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs">Marj, maliyet için çok yüksek.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
        );
      })}
      <TableCell className="text-left px-0 w-[30px] py-1">
      </TableCell>
      
      <TableCell className="w-8 px-1 py-1" />

      <TableCell className="w-[140px] px-2 py-1 text-left">
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div onClick={() => setEditingField('onlinePrice')} className="h-8 cursor-pointer rounded-md hover:bg-muted/50 flex items-center justify-start px-2">
                    <div className="flex flex-col justify-center text-left">
                      <div>{formatCurrency(product.onlinePrice)}</div>
                      {showNetOnlineProfit && (
                        <div className="text-xs text-muted-foreground -mt-1 leading-tight">
                          {formatCurrency(netOnlineProfit)}
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                {showNetOnlineProfit && (
                  <TooltipContent>
                    <div className="p-1 space-y-1 text-xs w-48">
                      <div className="flex justify-between">
                        <span>Ana Fiyat</span>
                        <span className="font-medium">{formatCurrency(product.onlinePrice)}</span>
                      </div>
                      <Separator className="my-1 bg-border/50" />
                      <div className="flex justify-between text-muted-foreground">
                        <span>KDV (%{kdvRate})</span>
                        <span>- {formatCurrency(vatAmountOnline)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Komisyon (%{platformCommissionRate.toFixed(2)})</span>
                        <span>- {formatCurrency(commissionAmountOnline)}</span>
                      </div>
                       <div className="flex justify-between text-muted-foreground">
                        <span>Stopaj (%{stopajRate})</span>
                        <span>- {formatCurrency(stopajAmountOnline)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ürün Maliyeti</span>
                        <span>- {formatCurrency(cost)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>Net Kâr</span>
                        <span>{formatCurrency(netOnlineProfit)}</span>
                      </div>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
        )}
      </TableCell>

      {onlineMargins.map((margin) => {
        const commission = margin.commissionRate !== undefined ? margin.commissionRate : platformCommissionRate;
        const divisor = (1 / (1 + kdvRate / 100)) * (1 - stopajRate / 100) - (commission / 100) - (margin.value / 100);
        const sellingPrice = divisor > 0 ? cost / divisor : Infinity;

        const isCalculable = isFinite(sellingPrice) && sellingPrice > 0;
        
        const revenueExVat = isCalculable ? sellingPrice / (1 + kdvRate / 100) : 0;
        const vatAmount = isCalculable ? sellingPrice - revenueExVat : 0;
        const commissionAmount = isCalculable ? sellingPrice * (commission / 100) : 0;
        const stopajAmount = isCalculable ? revenueExVat * (stopajRate / 100) : 0;
        const netProfit = isCalculable ? revenueExVat - commissionAmount - stopajAmount - cost : 0;
        
        return (
          <TableCell key={margin.id} className="text-left w-[140px] px-2 py-1 text-muted-foreground">
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-full flex items-center">
                    {isCalculable ? formatCurrency(sellingPrice) : 'Hesaplanamaz'}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isCalculable ? (
                    <div className="p-1 space-y-1 text-xs w-48">
                      <div className="flex justify-between">
                        <span>Ana Fiyat</span>
                        <span className="font-medium">{formatCurrency(sellingPrice)}</span>
                      </div>
                      <Separator className="my-1 bg-border/50" />
                      <div className="flex justify-between text-muted-foreground">
                          <span>KDV (%{kdvRate})</span>
                          <span>- {formatCurrency(vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                          <span>Komisyon (%{commission.toFixed(2)})</span>
                          <span>- {formatCurrency(commissionAmount)}</span>
                      </div>
                       <div className="flex justify-between text-muted-foreground">
                          <span>Stopaj (%{stopajRate})</span>
                          <span>- {formatCurrency(stopajAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                          <span>Ürün Maliyeti</span>
                          <span>- {formatCurrency(cost)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                          <span>Net Kâr</span>
                          <span>{formatCurrency(netProfit)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs">Marj, maliyet için çok yüksek.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
        );
      })}
      <TableCell className="text-left px-0 w-[30px] py-1">
      </TableCell>

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

function SortableCategoryItem({ category, onDelete }: { category: Category; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 rounded-md border bg-background">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
        <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
        <span>{category.name}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(category.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [margins, setMargins] = useState<Margin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isAddProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<{ id: string; value: string } | null>(null);
  const [editingCommission, setEditingCommission] = useState<{ id: string; value: string } | null>(null);
  
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0]);

  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = React.useRef(true);
  
  // Rate states
  const [platformCommissionRate, setPlatformCommissionRate] = useState(15);
  const [platformCommissionInput, setPlatformCommissionInput] = useState('15');
  const [isPlatformCommissionPopoverOpen, setPlatformCommissionPopoverOpen] = useState(false);

  const [bankCommissionRate, setBankCommissionRate] = useState(2.5);
  const [bankCommissionInput, setBankCommissionInput] = useState('2.5');
  const [isBankCommissionPopoverOpen, setBankCommissionPopoverOpen] = useState(false);

  const [kdvRate, setKdvRate] = useState(10);
  const [kdvInput, setKdvInput] = useState('10');
  const [isKdvPopoverOpen, setKdvPopoverOpen] = useState(false);

  const [stopajRate, setStopajRate] = useState(1);
  const [stopajInput, setStopajInput] = useState('1');
  const [isStopajPopoverOpen, setStopajPopoverOpen] = useState(false);
  
  const storeMargins = useMemo(() => margins.filter(m => m.type === 'store').sort((a,b) => a.value - b.value), [margins]);
  const onlineMargins = useMemo(() => margins.filter(m => m.type === 'online').sort((a,b) => a.value - b.value), [margins]);

  // Data Fetching and Saving
  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((data) => {
        const sortedProducts = (data.products || []).sort((a: Product, b: Product) => (a.order ?? 0) - (b.order ?? 0));
        const sortedIngredients = (data.ingredients || []).sort((a: Ingredient, b: Ingredient) => (a.order ?? 0) - (b.order ?? 0));
        
        const categoriesWithOrder = (data.categories || []).map((cat: Category, index: number) => ({ ...cat, order: cat.order ?? index }));
        const sortedCategories = categoriesWithOrder.sort((a: Category, b: Category) => a.order - b.order);

        setProducts(sortedProducts);
        setIngredients(sortedIngredients);
        setMargins(data.margins || []);
        setCategories(sortedCategories);
        
        setPlatformCommissionRate(data.platformCommissionRate ?? 15);
        setPlatformCommissionInput(String(data.platformCommissionRate ?? 15));
        
        setBankCommissionRate(data.bankCommissionRate ?? 2.5);
        setBankCommissionInput(String(data.bankCommissionRate ?? 2.5));
        
        setKdvRate(data.kdvRate ?? 10);
        setKdvInput(String(data.kdvRate ?? 10));

        setStopajRate(data.stopajRate ?? 1);
        setStopajInput(String(data.stopajRate ?? 1));

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
        body: JSON.stringify({ products, ingredients, margins, categories, platformCommissionRate, kdvRate, bankCommissionRate, stopajRate }),
      }).catch(error => console.error('Failed to save data:', error));
    }
  }, [products, ingredients, margins, categories, platformCommissionRate, kdvRate, bankCommissionRate, stopajRate, isLoading]);

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

  const handleUpdateMarginCommission = (id: string) => {
    if (!editingCommission) return;
    const { value } = editingCommission;
    setEditingCommission(null);

    if (value.trim() === '') {
        // Revert to global by removing the specific commissionRate property
        setMargins(prev => prev.map(m => {
            if (m.id === id) {
                const { commissionRate, ...rest } = m;
                return rest;
            }
            return m;
        }));
    } else {
        const newValue = parseFloat(value);
        if (!isNaN(newValue) && newValue >= 0 && newValue < 100) {
            setMargins(prev => prev.map(m => 
                m.id === id ? { ...m, commissionRate: newValue } : m
            ));
        }
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories(prev => {
        const newOrder = prev.length > 0 ? Math.max(...prev.map(c => c.order ?? -1)) + 1 : 0;
        return [...prev, { id: nanoid(), name: newCategoryName, color: newCategoryColor, order: newOrder }];
    });
    setNewCategoryName('');
    setNewCategoryColor(categoryColors[0]);
  }

  const handleDeleteCategory = (id: string) => {
    setProducts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p));
    setCategories(prev => prev.filter(c => c.id !== id));
  }
  
  const handleSetPlatformCommission = () => {
    const rate = parseFloat(platformCommissionInput);
    if (!isNaN(rate) && rate >= 0 && rate < 100) {
      setPlatformCommissionRate(rate);
      setPlatformCommissionPopoverOpen(false);
    }
  };
  
  const handleSetBankCommission = () => {
    const rate = parseFloat(bankCommissionInput);
    if (!isNaN(rate) && rate >= 0 && rate < 100) {
      setBankCommissionRate(rate);
      setBankCommissionPopoverOpen(false);
    }
  };

  const handleSetKdv = () => {
    const rate = parseFloat(kdvInput);
    if (!isNaN(rate) && rate >= 0) {
      setKdvRate(rate);
      setKdvPopoverOpen(false);
    }
  };

    const handleSetStopaj = () => {
    const rate = parseFloat(stopajInput);
    if (!isNaN(rate) && rate >= 0 && rate < 100) {
        setStopajRate(rate);
        setStopajPopoverOpen(false);
    }
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
    
    const sortedCategories = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    sortedCategories.forEach(cat => {
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
  const categoryIds = useMemo(() => categories.map(c => c.id), [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const totalColumns = 8 + storeMargins.length + onlineMargins.length;
  
  const pricedIngredients = useMemo(() => 
    ingredients.filter(ing => ing.price !== undefined && ing.unit)
               .sort((a,b) => (a.order ?? 0) - (b.order ?? 0)), 
  [ingredients]);

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

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((items) => {
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
                 <div className="flex items-start gap-2">
                    <div className="text-right">
                        <Popover open={isKdvPopoverOpen} onOpenChange={(open) => {if(open) setKdvInput(String(kdvRate)); setKdvPopoverOpen(open)}}>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <Percent className="mr-2 h-4 w-4" /> KDV Ayarla
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4">
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">KDV Oranı</h4>
                                        <p className="text-sm text-muted-foreground">Satış KDV oranını (%) girin.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Örn: 10" value={kdvInput} onChange={(e) => setKdvInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSetKdv(); }}/>
                                        <span className="font-semibold">%</span>
                                    </div>
                                    <Button onClick={handleSetKdv}>Ayarla</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground mt-1">Mevcut: %{kdvRate}</p>
                    </div>
                    <div className="text-right">
                        <Popover open={isBankCommissionPopoverOpen} onOpenChange={(open) => {if(open) setBankCommissionInput(String(bankCommissionRate)); setBankCommissionPopoverOpen(open)}}>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <Percent className="mr-2 h-4 w-4" /> Banka Kom.
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4">
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">Banka Komisyonu</h4>
                                        <p className="text-sm text-muted-foreground">Banka komisyon oranını (%) girin.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Örn: 2.5" value={bankCommissionInput} onChange={(e) => setBankCommissionInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSetBankCommission(); }}/>
                                        <span className="font-semibold">%</span>
                                    </div>
                                    <Button onClick={handleSetBankCommission}>Ayarla</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground mt-1">Mevcut: %{bankCommissionRate}</p>
                    </div>
                    <div className="text-right">
                        <Popover open={isPlatformCommissionPopoverOpen} onOpenChange={(open) => {if(open) setPlatformCommissionInput(String(platformCommissionRate)); setPlatformCommissionPopoverOpen(open)}}>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <Percent className="mr-2 h-4 w-4" /> Platform Kom.
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4">
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">Platform Komisyonu</h4>
                                        <p className="text-sm text-muted-foreground">Online satış platformu komisyonunu (%) girin.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Örn: 15" value={platformCommissionInput} onChange={(e) => setPlatformCommissionInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSetPlatformCommission(); }} />
                                        <span className="font-semibold">%</span>
                                    </div>
                                    <Button onClick={handleSetPlatformCommission}>Ayarla</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground mt-1">Mevcut: %{platformCommissionRate}</p>
                    </div>
                    <div className="text-right">
                        <Popover open={isStopajPopoverOpen} onOpenChange={(open) => {if(open) setStopajInput(String(stopajRate)); setStopajPopoverOpen(open)}}>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <Percent className="mr-2 h-4 w-4" /> Stopaj Ayarla
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4">
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <h4 className="font-medium leading-none">Stopaj Oranı</h4>
                                        <p className="text-sm text-muted-foreground">Online satış stopaj oranını (%) girin.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="Örn: 1" value={stopajInput} onChange={(e) => setStopajInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSetStopaj(); }}/>
                                        <span className="font-semibold">%</span>
                                    </div>
                                    <Button onClick={handleSetStopaj}>Ayarla</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground mt-1">Mevcut: %{stopajRate}</p>
                    </div>
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                              {categories.length > 0 ? categories.map(cat => (
                                <SortableCategoryItem key={cat.id} category={cat} onDelete={handleDeleteCategory} />
                              )) : <p className="text-sm text-muted-foreground text-center py-4">Henüz kategori yok.</p>}
                            </div>
                        </SortableContext>
                      </DndContext>
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
                      <TableHead className="text-left font-semibold w-[140px] px-4 py-2 align-top">
                        <div>Mağaza Fiyatı</div>
                        <div className="text-xs font-normal text-muted-foreground">
                            <div>%{kdvRate} KDV</div>
                            <div>%{bankCommissionRate} Banka Kom.</div>
                            <div>Ürün Maliyeti</div>
                        </div>
                      </TableHead>
                      {storeMargins.map((margin) => {
                        const commission = margin.commissionRate !== undefined ? margin.commissionRate : bankCommissionRate;
                        const isEditingCommission = editingCommission?.id === margin.id;
                        const isEditingMargin = editingMargin?.id === margin.id;

                        return (
                            <TableHead key={margin.id} className="text-left font-semibold w-[140px] px-2 py-2 align-top relative group">
                                <Button variant="ghost" size="icon" className="absolute top-1 right-0 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteMargin(margin.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                                {isEditingMargin ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            value={editingMargin.value}
                                            onChange={(e) => setEditingMargin({ id: margin.id, value: e.target.value })}
                                            onBlur={() => handleUpdateMargin(margin.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                if (e.key === 'Escape') setEditingMargin(null);
                                            }}
                                            autoFocus
                                            className="h-6 font-semibold p-1 w-14 text-center"
                                        />
                                        <span>Kar (Ciro)</span>
                                    </div>
                                ) : (
                                    <div onClick={() => setEditingMargin({ id: margin.id, value: String(margin.value) })} className="cursor-pointer rounded-sm px-1 -mx-1 hover:bg-muted/50">
                                        %{margin.value} Kar (Ciro)
                                    </div>
                                )}
                                <div className="text-xs font-normal text-muted-foreground space-y-0.5">
                                    <div>%{kdvRate} KDV</div>
                                     {isEditingCommission ? (
                                        <div className="flex items-center gap-1 -ml-1">
                                            <span className="font-semibold">%</span>
                                            <Input
                                                type="number"
                                                value={editingCommission.value}
                                                placeholder={String(bankCommissionRate)}
                                                onChange={(e) => setEditingCommission({ ...editingCommission, value: e.target.value })}
                                                onBlur={() => handleUpdateMarginCommission(margin.id)}
                                                onKeyDown={(e) => { 
                                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                    if (e.key === 'Escape') setEditingCommission(null);
                                                }}
                                                autoFocus
                                                className="h-5 text-xs p-1 w-14"
                                            />
                                        </div>
                                    ) : (
                                        <div onClick={() => setEditingCommission({ id: margin.id, value: margin.commissionRate?.toString() ?? '' })} className="cursor-pointer rounded-sm px-1 -mx-1 hover:bg-muted/50">
                                            %{commission} Banka Kom.
                                        </div>
                                    )}
                                    <div>Ürün Maliyeti</div>
                                </div>
                            </TableHead>
                        );
                      })}
                      <TableHead className="text-left px-0 w-[30px] py-1">
                          <MarginColumnPopover type="store" onAdd={handleAddMargin} />
                      </TableHead>
                      
                      <TableHead className="w-8 px-1 py-1" />

                      <TableHead className="text-left font-semibold w-[140px] px-2 py-2 align-top">
                        <div>Online Fiyat</div>
                        <div className="text-xs font-normal text-muted-foreground">
                           <div>%{kdvRate} KDV</div>
                           <div>%{platformCommissionRate} Platform Kom.</div>
                           <div>%{stopajRate} Stopaj</div>
                           <div>Ürün Maliyeti</div>
                        </div>
                      </TableHead>
                      {onlineMargins.map((margin) => {
                        const commission = margin.commissionRate !== undefined ? margin.commissionRate : platformCommissionRate;
                        const isEditingCommission = editingCommission?.id === margin.id;
                        const isEditingMargin = editingMargin?.id === margin.id;
                        
                        return (
                          <TableHead key={margin.id} className="text-left font-semibold w-[140px] px-2 py-2 align-top relative group">
                              <Button variant="ghost" size="icon" className="absolute top-1 right-0 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteMargin(margin.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                                {isEditingMargin ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            value={editingMargin.value}
                                            onChange={(e) => setEditingMargin({ id: margin.id, value: e.target.value })}
                                            onBlur={() => handleUpdateMargin(margin.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                if (e.key === 'Escape') setEditingMargin(null);
                                            }}
                                            autoFocus
                                            className="h-6 font-semibold p-1 w-14 text-center"
                                        />
                                        <span>Kar (Ciro)</span>
                                    </div>
                                ) : (
                                    <div onClick={() => setEditingMargin({ id: margin.id, value: String(margin.value) })} className="cursor-pointer rounded-sm px-1 -mx-1 hover:bg-muted/50">
                                        %{margin.value} Kar (Ciro)
                                    </div>
                                )}
                              <div className="text-xs font-normal text-muted-foreground space-y-0.5">
                                 <div>%{kdvRate} KDV</div>
                                 {isEditingCommission ? (
                                      <div className="flex items-center gap-1 -ml-1">
                                          <span className="font-semibold">%</span>
                                          <Input
                                              type="number"
                                              value={editingCommission.value}
                                              placeholder={String(platformCommissionRate)}
                                              onChange={(e) => setEditingCommission({ ...editingCommission, value: e.target.value })}
                                              onBlur={() => handleUpdateMarginCommission(margin.id)}
                                              onKeyDown={(e) => { 
                                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                  if (e.key === 'Escape') setEditingCommission(null);
                                              }}
                                              autoFocus
                                              className="h-5 text-xs p-1 w-14"
                                          />
                                      </div>
                                  ) : (
                                      <div onClick={() => setEditingCommission({ id: margin.id, value: margin.commissionRate?.toString() ?? '' })} className="cursor-pointer rounded-sm px-1 -mx-1 hover:bg-muted/50">
                                          %{commission} Platform Kom.
                                      </div>
                                  )}
                                  <div>%{stopajRate} Stopaj</div>
                                 <div>Ürün Maliyeti</div>
                             </div>
                          </TableHead>
                        );
                      })}
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
                                  platformCommissionRate={platformCommissionRate}
                                  bankCommissionRate={bankCommissionRate}
                                  kdvRate={kdvRate}
                                  stopajRate={stopajRate}
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

      {pricedIngredients.length > 0 && (
        <div className="container mx-auto px-4 md:px-8 pb-8">
            <Card>
                <CardHeader>
                    <CardTitle>Hızlı Malzeme Fiyat Güncelleme</CardTitle>
                    <CardDescription>Birim fiyatı tanımlı malzemelerin fiyatlarını buradan hızlıca güncelleyebilirsiniz.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        {pricedIngredients.map(ing => (
                           <div key={ing.id} className="space-y-1">
                            <Label htmlFor={`price-${ing.id}`}>{ing.name}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id={`price-${ing.id}`}
                                    type="number" 
                                    className="w-24 text-right"
                                    key={ing.id + ing.price} 
                                    defaultValue={ing.price}
                                    onBlur={(e) => {
                                        const newPrice = parseFloat(e.target.value.replace(',', '.'));
                                        if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== ing.price) {
                                            updateIngredientPrice(ing.id, newPrice);
                                        } else {
                                            e.target.value = String(ing.price || '');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                />
                                <span className="text-sm text-muted-foreground">{`₺ / ${ing.unit}`}</span>
                            </div>
                        </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

    </div>
  );
}
